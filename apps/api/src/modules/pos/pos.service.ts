import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  ShiftStatus,
  POSTransactionStatus,
  OrderStatus,
  PaymentStatus,
  InventoryTransactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { POSTransactionDto } from './dto/pos-transaction.dto';
import { AddCashMovementDto } from './dto/cash-movement.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

@Injectable()
export class POSService {
  private readonly logger = new Logger(POSService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Shift Management
  // ─────────────────────────────────────────────────────────────

  async openShift(operatorId: string, dto: OpenShiftDto) {
    // Check for already open shift by this operator
    const existing = await this.prisma.pOSShift.findFirst({
      where: { operatorId, status: ShiftStatus.OPEN },
    });
    if (existing) {
      throw new ConflictException(`Operator already has an open shift (ID: ${existing.id})`);
    }

    // Validate store
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store || !store.isActive) {
      throw new BadRequestException('Store not found or inactive');
    }

    const shift = await this.prisma.pOSShift.create({
      data: {
        storeId: dto.storeId,
        operatorId,
        openingCash: dto.openingCash,
        status: ShiftStatus.OPEN,
      },
      include: {
        store: { select: { id: true, name: true } },
        operator: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.redis.set(`pos:shift:${operatorId}`, shift.id);
    this.logger.log(`Shift ${shift.id} opened by operator ${operatorId}`);
    return shift;
  }

  async closeShift(shiftId: string, dto: CloseShiftDto) {
    const shift = await this.prisma.pOSShift.findUnique({
      where: { id: shiftId },
      include: { cashMovements: true, transactions: true },
    });

    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException(`Shift is already ${shift.status}`);
    }

    // Calculate expected cash
    const cashSales = shift.transactions
      .filter((t) => t.status === POSTransactionStatus.COMPLETED)
      .reduce((sum, t) => {
        const payments = t.payments as Array<{ method: string; amount: number }>;
        const cashPayment = payments
          .filter((p) => p.method === 'CASH')
          .reduce((s, p) => s + p.amount, 0);
        return sum + cashPayment;
      }, 0);

    const cashIn = shift.cashMovements
      .filter((m) => m.type === 'CASH_IN' || m.type === 'PETTY_CASH')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const cashOut = shift.cashMovements
      .filter((m) => m.type === 'CASH_OUT' || m.type === 'EXPENSE')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const expectedCash = Number(shift.openingCash) + cashSales + cashIn - cashOut;
    const cashDifference = dto.closingCash - expectedCash;

    const closed = await this.prisma.pOSShift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash: dto.closingCash,
        expectedCash,
        cashDifference,
        notes: dto.notes,
        closedAt: new Date(),
      },
      include: {
        store: { select: { id: true, name: true } },
        operator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { transactions: true, cashMovements: true } },
      },
    });

    await this.redis.del(`pos:shift:${shift.operatorId}`);
    this.logger.log(
      `Shift ${shiftId} closed. Expected: ${expectedCash}, Actual: ${dto.closingCash}, Diff: ${cashDifference}`,
    );

    return closed;
  }

  async getActiveShift(operatorId: string) {
    const shift = await this.prisma.pOSShift.findFirst({
      where: { operatorId, status: ShiftStatus.OPEN },
      include: {
        store: { select: { id: true, name: true, currency: true } },
        operator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!shift) throw new NotFoundException('No active shift found for this operator');
    return shift;
  }

  // ─────────────────────────────────────────────────────────────
  // Transactions
  // ─────────────────────────────────────────────────────────────

  async createTransaction(shiftId: string, dto: POSTransactionDto, operatorId: string) {
    const shift = await this.prisma.pOSShift.findUnique({
      where: { id: shiftId },
      include: { store: true },
    });

    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException('Shift is not open');
    }

    // Resolve product details for each item
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      include: { variants: true, images: { where: { isPrimary: true }, take: 1 } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Resolve & validate each item
    const resolvedItems = await Promise.all(
      dto.items.map(async (item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found or inactive`);
        }

        let price = item.price;
        let sku = item.sku ?? product.sku ?? '';
        let name = item.name ?? product.name;

        if (item.variantId) {
          const variant = product.variants.find((v) => v.id === item.variantId);
          if (!variant) {
            throw new BadRequestException(`Variant ${item.variantId} not found`);
          }
          sku = variant.sku;
        }

        const lineDiscount = item.discount ?? 0;
        const lineTotal = price * item.quantity - lineDiscount;

        return { ...item, price, sku, name, lineTotal, lineDiscount };
      }),
    );

    // Payment validation
    const subtotal = resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const discountAmount = dto.discountAmount ?? 0;
    const taxAmount = 0; // Extend with tax engine if needed
    const totalAmount = subtotal - discountAmount + taxAmount;

    const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0);
    if (totalPaid < totalAmount) {
      throw new BadRequestException(
        `Insufficient payment. Total: ${totalAmount}, Paid: ${totalPaid}`,
      );
    }

    const paidAmount = Math.min(totalPaid, totalAmount + 50); // allow reasonable overpay
    const changeAmount = Math.max(0, totalPaid - totalAmount);

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber(shift.storeId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Deduct inventory for each item
      for (const item of resolvedItems) {
        await this.deductInventoryInTx(tx, item.productId, item.variantId, item.quantity, operatorId);
      }

      // Generate order number
      const seq = await this.redis.incr('order:counter');
      const date = new Date();
      const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const orderNumber = `POS-${ymd}-${String(seq).padStart(6, '0')}`;

      // Create linked Order record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: dto.customerId,
          storeId: shift.storeId,
          posShiftId: shiftId,
          status: OrderStatus.DELIVERED,
          paymentStatus: PaymentStatus.COMPLETED,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          isPOS: true,
          sourceChannel: 'pos',
          customerNote: dto.customerName,
          notes: dto.notes,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              discountAmount: item.lineDiscount,
              totalAmount: item.lineTotal,
            })),
          },
          payments: {
            create: dto.payments.map((p) => ({
              method: p.method,
              status: PaymentStatus.COMPLETED,
              amount: p.amount,
              transactionId: p.reference,
              paidAt: new Date(),
            })),
          },
          statusHistory: {
            create: { status: OrderStatus.DELIVERED, comment: 'POS sale completed' },
          },
        },
      });

      // Create POS transaction record
      const posTx = await tx.pOSTransaction.create({
        data: {
          shiftId,
          orderId: order.id,
          status: POSTransactionStatus.COMPLETED,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          paidAmount,
          changeAmount,
          receiptNumber,
          payments: dto.payments as any,
          items: resolvedItems as any,
          customerId: dto.customerId,
          customerName: dto.customerName,
          notes: dto.notes,
        },
      });

      // Update shift totals
      await tx.pOSShift.update({
        where: { id: shiftId },
        data: {
          totalSales: { increment: totalAmount },
          totalOrders: { increment: 1 },
        },
      });

      // Update product sales counts
      for (const item of resolvedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      return posTx;
    });

    // Emit WS event
    this.wsGateway.emitPOSTransaction(
      { ...transaction, storeId: shift.storeId },
      shift.storeId,
    );
    this.wsGateway.emitNewOrder({
      id: transaction.orderId,
      orderNumber: `POS-${receiptNumber}`,
      totalAmount,
      status: OrderStatus.DELIVERED,
      isPOS: true,
    });

    this.logger.log(`POS transaction ${transaction.id} created. Receipt: ${receiptNumber}`);
    return transaction;
  }

  async voidTransaction(transactionId: string, reason: string, operatorId: string) {
    const transaction = await this.prisma.pOSTransaction.findUnique({
      where: { id: transactionId },
      include: { shift: true },
    });

    if (!transaction) throw new NotFoundException(`Transaction ${transactionId} not found`);
    if (transaction.status !== POSTransactionStatus.COMPLETED) {
      throw new BadRequestException(`Transaction is already ${transaction.status}`);
    }
    if (transaction.shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException('Can only void transactions in an open shift');
    }

    const items = transaction.items as Array<{
      productId: string;
      variantId?: string;
      quantity: number;
    }>;

    await this.prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of items) {
        await this.restoreInventoryInTx(tx, item.productId, item.variantId, item.quantity, operatorId);
      }

      await tx.pOSTransaction.update({
        where: { id: transactionId },
        data: { status: POSTransactionStatus.VOIDED },
      });

      // Reverse shift totals
      await tx.pOSShift.update({
        where: { id: transaction.shiftId },
        data: {
          totalSales: { decrement: Number(transaction.totalAmount) },
          totalOrders: { decrement: 1 },
        },
      });

      // Void linked order
      if (transaction.orderId) {
        await tx.order.update({
          where: { id: transaction.orderId },
          data: { status: OrderStatus.CANCELLED, adminNote: `POS void: ${reason}` },
        });
      }
    });

    this.logger.log(`Transaction ${transactionId} voided: ${reason}`);
    return { message: 'Transaction voided successfully', transactionId };
  }

  async processReturn(
    transactionId: string,
    returnItems: Array<{ productId: string; variantId?: string; quantity: number }>,
    reason: string,
    operatorId: string,
  ) {
    const original = await this.prisma.pOSTransaction.findUnique({
      where: { id: transactionId },
      include: { shift: true },
    });

    if (!original) throw new NotFoundException(`Transaction ${transactionId} not found`);
    if (original.status !== POSTransactionStatus.COMPLETED) {
      throw new BadRequestException('Can only return completed transactions');
    }

    const originalItems = original.items as Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      price: number;
    }>;

    // Validate return items
    let refundTotal = 0;
    for (const ri of returnItems) {
      const oi = originalItems.find(
        (i) =>
          i.productId === ri.productId &&
          (ri.variantId ? i.variantId === ri.variantId : true),
      );
      if (!oi) {
        throw new BadRequestException(`Product ${ri.productId} not in original transaction`);
      }
      if (ri.quantity > oi.quantity) {
        throw new BadRequestException(
          `Return quantity (${ri.quantity}) exceeds original (${oi.quantity}) for product ${ri.productId}`,
        );
      }
      refundTotal += oi.price * ri.quantity;
    }

    const receiptNumber = await this.generateReceiptNumber(original.shift.storeId);

    const returnTx = await this.prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of returnItems) {
        await this.restoreInventoryInTx(tx, item.productId, item.variantId, item.quantity, operatorId);
      }

      // Create refund POS transaction
      const rTx = await tx.pOSTransaction.create({
        data: {
          shiftId: original.shiftId,
          status: POSTransactionStatus.REFUNDED,
          subtotal: -refundTotal,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: -refundTotal,
          paidAmount: -refundTotal,
          changeAmount: 0,
          receiptNumber,
          payments: [{ method: 'CASH', amount: -refundTotal, reference: `RETURN-${transactionId}` }] as any,
          items: returnItems as any,
          customerId: original.customerId,
          customerName: original.customerName,
          notes: `Return of transaction ${transactionId}. Reason: ${reason}`,
        },
      });

      // Update shift refund totals
      await tx.pOSShift.update({
        where: { id: original.shiftId },
        data: { totalRefunds: { increment: refundTotal } },
      });

      // Mark original as partially/fully returned
      await tx.pOSTransaction.update({
        where: { id: transactionId },
        data: { status: POSTransactionStatus.REFUNDED },
      });

      return rTx;
    });

    this.logger.log(`Return processed for transaction ${transactionId}. Refund: ${refundTotal}`);
    return returnTx;
  }

  async addCashMovement(
    shiftId: string,
    dto: AddCashMovementDto,
    operatorId: string,
  ) {
    const shift = await this.prisma.pOSShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== ShiftStatus.OPEN) {
      throw new BadRequestException('Shift is not open');
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        shiftId,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        createdBy: operatorId,
      },
    });

    this.logger.log(`Cash movement: ${dto.type} ${dto.amount} on shift ${shiftId}`);
    return movement;
  }

  async getShiftReport(shiftId: string) {
    const shift = await this.prisma.pOSShift.findUnique({
      where: { id: shiftId },
      include: {
        store: true,
        operator: { select: { id: true, firstName: true, lastName: true } },
        transactions: {
          where: { status: { not: POSTransactionStatus.VOIDED } },
          orderBy: { createdAt: 'desc' },
        },
        cashMovements: { orderBy: { createdAt: 'asc' } },
        _count: { select: { transactions: true } },
      },
    });

    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);

    const completedTx = shift.transactions.filter(
      (t) => t.status === POSTransactionStatus.COMPLETED,
    );
    const refundedTx = shift.transactions.filter(
      (t) => t.status === POSTransactionStatus.REFUNDED,
    );

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    for (const tx of completedTx) {
      const payments = tx.payments as Array<{ method: string; amount: number }>;
      for (const p of payments) {
        paymentBreakdown[p.method] = (paymentBreakdown[p.method] ?? 0) + p.amount;
      }
    }

    // Hourly breakdown
    const hourlyBreakdown = completedTx.reduce(
      (acc, tx) => {
        const hour = new Date(tx.createdAt).getHours();
        if (!acc[hour]) acc[hour] = { count: 0, revenue: 0 };
        acc[hour].count += 1;
        acc[hour].revenue += Number(tx.totalAmount);
        return acc;
      },
      {} as Record<number, { count: number; revenue: number }>,
    );

    const cashIn = shift.cashMovements
      .filter((m) => m.type === 'CASH_IN')
      .reduce((s, m) => s + Number(m.amount), 0);

    const cashOut = shift.cashMovements
      .filter((m) => m.type === 'CASH_OUT' || m.type === 'EXPENSE')
      .reduce((s, m) => s + Number(m.amount), 0);

    return {
      shift: {
        id: shift.id,
        store: shift.store,
        operator: shift.operator,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingCash: shift.openingCash,
        closingCash: shift.closingCash,
        expectedCash: shift.expectedCash,
        cashDifference: shift.cashDifference,
      },
      summary: {
        totalSales: Number(shift.totalSales),
        totalOrders: shift.totalOrders,
        totalRefunds: Number(shift.totalRefunds),
        netSales: Number(shift.totalSales) - Number(shift.totalRefunds),
        transactionCount: completedTx.length,
        refundCount: refundedTx.length,
        avgTransactionValue:
          completedTx.length > 0
            ? Number(shift.totalSales) / completedTx.length
            : 0,
        cashIn,
        cashOut,
      },
      paymentBreakdown,
      hourlyBreakdown,
      cashMovements: shift.cashMovements,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Product Search
  // ─────────────────────────────────────────────────────────────

  async searchProduct(query: string) {
    if (!query || query.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { barcode: { contains: query, mode: 'insensitive' } },
          { variants: { some: { sku: { contains: query, mode: 'insensitive' } } } },
          { variants: { some: { barcode: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      take: 20,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: {
          select: { id: true, sku: true, barcode: true, name: true, price: true, stockQuantity: true },
        },
      },
      orderBy: { salesCount: 'desc' },
    });

    return products;
  }

  async getProductByBarcode(barcode: string) {
    // Check cache first
    const cacheKey = `pos:barcode:${barcode}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Try product barcode
    let product = await this.prisma.product.findFirst({
      where: { barcode, status: 'ACTIVE' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: {
          select: {
            id: true,
            sku: true,
            barcode: true,
            name: true,
            price: true,
            stockQuantity: true,
            stockStatus: true,
          },
        },
      },
    });

    // Try variant barcode
    if (!product) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { barcode },
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      });

      if (variant) {
        product = await this.prisma.product.findUnique({
          where: { id: variant.productId, status: 'ACTIVE' },
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: {
              select: {
                id: true,
                sku: true,
                barcode: true,
                name: true,
                price: true,
                stockQuantity: true,
                stockStatus: true,
              },
            },
          },
        });
      }
    }

    if (!product) throw new NotFoundException(`Product with barcode "${barcode}" not found`);

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(product));
    await this.redis.expire(cacheKey, 300);

    return product;
  }

  async getDailyReport(storeId: string, date: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);

    const shifts = await this.prisma.pOSShift.findMany({
      where: {
        storeId,
        openedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        operator: { select: { id: true, firstName: true, lastName: true } },
        transactions: {
          where: { status: POSTransactionStatus.COMPLETED },
        },
        cashMovements: true,
        _count: { select: { transactions: true } },
      },
    });

    // Aggregate across all shifts
    const dailyTotals = shifts.reduce(
      (acc, shift) => ({
        totalSales: acc.totalSales + Number(shift.totalSales),
        totalOrders: acc.totalOrders + shift.totalOrders,
        totalRefunds: acc.totalRefunds + Number(shift.totalRefunds),
        shiftCount: acc.shiftCount + 1,
      }),
      { totalSales: 0, totalOrders: 0, totalRefunds: 0, shiftCount: 0 },
    );

    // Payment method breakdown across all shifts
    const paymentBreakdown: Record<string, number> = {};
    for (const shift of shifts) {
      for (const tx of shift.transactions) {
        const payments = tx.payments as Array<{ method: string; amount: number }>;
        for (const p of payments) {
          paymentBreakdown[p.method] = (paymentBreakdown[p.method] ?? 0) + p.amount;
        }
      }
    }

    // Top products for the day
    const allItems: Array<{ productId: string; name: string; quantity: number; revenue: number }> =
      [];
    for (const shift of shifts) {
      for (const tx of shift.transactions) {
        const items = tx.items as Array<{
          productId: string;
          name: string;
          quantity: number;
          price: number;
        }>;
        for (const item of items) {
          const existing = allItems.find((i) => i.productId === item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.price * item.quantity;
          } else {
            allItems.push({
              productId: item.productId,
              name: item.name,
              quantity: item.quantity,
              revenue: item.price * item.quantity,
            });
          }
        }
      }
    }
    const topProducts = allItems.sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return {
      store: { id: store.id, name: store.name },
      date: targetDate.toISOString().split('T')[0],
      shifts: shifts.map((s) => ({
        id: s.id,
        operator: s.operator,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        totalSales: s.totalSales,
        totalOrders: s.totalOrders,
        transactionCount: s._count.transactions,
      })),
      dailyTotals: {
        ...dailyTotals,
        netSales: dailyTotals.totalSales - dailyTotals.totalRefunds,
        avgTransactionValue:
          dailyTotals.totalOrders > 0
            ? dailyTotals.totalSales / dailyTotals.totalOrders
            : 0,
      },
      paymentBreakdown,
      topProducts,
    };
  }

  async getTransactions(shiftId: string, filters: TransactionFiltersDto) {
    const shift = await this.prisma.pOSShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);

    const { status, page = 1, limit = 20 } = filters;
    const where: Prisma.POSTransactionWhereInput = { shiftId };
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.pOSTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pOSTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async generateReceiptNumber(storeId: string): Promise<string> {
    const key = `pos:receipt:${storeId}`;
    const seq = await this.redis.incr(key);
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `RCP-${ymd}-${String(seq).padStart(6, '0')}`;
  }

  private async deductInventoryInTx(
    tx: Prisma.TransactionClient,
    productId: string,
    variantId: string | undefined,
    quantity: number,
    operatorId: string,
  ): Promise<void> {
    const item = await tx.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null, availableQty: { gte: quantity } },
    });

    if (!item) {
      this.logger.warn(
        `Low/no stock for product ${productId} during POS sale — proceeding anyway`,
      );
      return;
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: { decrement: quantity },
        availableQty: { decrement: quantity },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: InventoryTransactionType.SALE,
        quantity,
        previousQty: item.quantity,
        newQty: item.quantity - quantity,
        referenceType: 'POS_SALE',
        notes: 'POS sale',
        createdBy: operatorId,
      },
    });
  }

  private async restoreInventoryInTx(
    tx: Prisma.TransactionClient,
    productId: string,
    variantId: string | undefined,
    quantity: number,
    operatorId: string,
  ): Promise<void> {
    const item = await tx.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null },
    });

    if (!item) return;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: { increment: quantity },
        availableQty: { increment: quantity },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: InventoryTransactionType.RETURN_IN,
        quantity,
        previousQty: item.quantity,
        newQty: item.quantity + quantity,
        referenceType: 'POS_RETURN',
        notes: 'POS return',
        createdBy: operatorId,
      },
    });
  }
}
