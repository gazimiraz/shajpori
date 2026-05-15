import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  InventoryTransactionType,
  JournalEntryStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentDto } from './dto/payment.dto';
import { OrderFiltersDto } from './dto/order-filters.dto';
import { CreateReturnDto } from './dto/create-return.dto';

// Valid status transitions
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.FAILED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.PACKED, OrderStatus.CANCELLED],
  [OrderStatus.PACKED]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.RETURN_IN_TRANSIT],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED, OrderStatus.REFUNDED],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURN_IN_TRANSIT, OrderStatus.CANCELLED],
  [OrderStatus.RETURN_IN_TRANSIT]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED],
  [OrderStatus.FAILED]: [OrderStatus.PENDING],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────
  async findAll(filters: OrderFiltersDto) {
    const {
      status,
      paymentStatus,
      userId,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (userId) where.userId = userId;
    if (search) {
      where.orderNumber = { contains: search, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          shippingAddress: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // findOne
  // ─────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
        coupon: { select: { id: true, code: true, discountType: true, discountValue: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: {
              select: { id: true, sku: true, name: true, imageUrl: true },
            },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
        shipments: {
          include: { trackingEvents: { orderBy: { timestamp: 'desc' } } },
          orderBy: { createdAt: 'desc' },
        },
        returns: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return order;
  }

  // ─────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto) {
    // 1. Validate address ownership
    const shippingAddress = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    if (!shippingAddress) {
      throw new NotFoundException('Shipping address not found');
    }

    if (dto.billingAddressId) {
      const billing = await this.prisma.address.findFirst({
        where: { id: dto.billingAddressId, userId },
      });
      if (!billing) {
        throw new NotFoundException('Billing address not found');
      }
    }

    // 2. Fetch and validate products + calculate totals
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      include: {
        variants: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are unavailable');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const resolvedItems: Array<{
      productId: string;
      variantId?: string;
      sku: string;
      name: string;
      imageUrl?: string;
      quantity: number;
      price: number;
      costPrice?: number;
      totalAmount: number;
    }> = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);

      let price = Number(product.price);
      let sku = product.sku ?? '';
      let costPrice = product.costPrice ? Number(product.costPrice) : undefined;
      let imageUrl = product.images[0]?.url;
      let variantId: string | undefined;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variant ${item.variantId} not found for product ${item.productId}`);
        }
        price = Number(variant.price);
        sku = variant.sku;
        costPrice = variant.costPrice ? Number(variant.costPrice) : undefined;
        imageUrl = variant.imageUrl ?? imageUrl;
        variantId = variant.id;
      }

      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      resolvedItems.push({
        productId: item.productId,
        variantId,
        sku,
        name: product.name,
        imageUrl,
        quantity: item.quantity,
        price,
        costPrice,
        totalAmount: lineTotal,
      });
    }

    // 3. Apply coupon if provided
    let discountAmount = 0;
    let couponId: string | undefined;

    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: dto.couponCode,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        },
      });

      if (!coupon) {
        throw new BadRequestException('Invalid or expired coupon code');
      }
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        throw new BadRequestException(
          `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
        );
      }

      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
        }
      } else {
        discountAmount = Math.min(Number(coupon.discountValue), subtotal);
      }

      couponId = coupon.id;
    }

    const shippingAmount = 0; // TODO: calculate based on shipping class
    const taxAmount = 0; // TODO: calculate based on tax class
    const totalAmount = subtotal - discountAmount + shippingAmount + taxAmount;

    // 4. Generate order number
    const orderNumber = await this.generateOrderNumber();

    // 5. Create order in transaction: reserve inventory + create journal entry
    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve inventory for each item
      for (const item of resolvedItems) {
        await this.reserveInventoryInTx(tx, item.productId, item.variantId, item.quantity);
      }

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId ?? dto.shippingAddressId,
          couponId,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          totalAmount,
          sourceChannel: dto.sourceChannel ?? 'web',
          notes: dto.notes,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              sku: item.sku,
              name: item.name,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              price: item.price,
              costPrice: item.costPrice,
              totalAmount: item.totalAmount,
            })),
          },
          statusHistory: {
            create: {
              status: OrderStatus.PENDING,
              comment: 'Order placed',
            },
          },
        },
        include: {
          items: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // Increment coupon usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: {
            usageCount: { increment: 1 },
            usages: {
              create: { couponId, userId, orderId: newOrder.id },
            },
          },
        });
      }

      // Create accounting journal entry (Sales Revenue + AR)
      await this.createOrderJournalEntry(tx, newOrder.id, totalAmount, orderNumber);

      return newOrder;
    });

    // 6. Post-transaction side-effects
    await this.redis.del(`inventory:low-stock`);
    this.wsGateway.emitNewOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount,
      userId,
      status: OrderStatus.PENDING,
      createdAt: order.createdAt,
    });

    this.logger.log(`Order created: ${order.orderNumber} for user ${userId}`);
    return order;
  }

  // ─────────────────────────────────────────────────────────────
  // updateStatus
  // ─────────────────────────────────────────────────────────────
  async updateStatus(id: string, status: OrderStatus, note?: string, changedBy?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition order from ${order.status} to ${status}. Allowed: [${allowed.join(', ')}]`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: { status },
        include: { user: { select: { id: true } } },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: id, status, comment: note, changedBy },
      });

      return o;
    });

    this.wsGateway.emitOrderStatusChanged(id, status, updated.user?.id ?? undefined);
    this.logger.log(`Order ${id} status changed to ${status}`);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────
  // cancelOrder
  // ─────────────────────────────────────────────────────────────
  async cancelOrder(id: string, reason: string, cancelledBy?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(OrderStatus.CANCELLED)) {
      throw new BadRequestException(`Order in status ${order.status} cannot be cancelled`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Release reserved inventory
      for (const item of order.items) {
        await this.releaseInventoryInTx(
          tx,
          item.productId,
          item.variantId ?? undefined,
          item.quantity,
        );
      }

      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          adminNote: reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
          comment: reason,
          changedBy: cancelledBy,
        },
      });
    });

    this.wsGateway.emitOrderStatusChanged(id, OrderStatus.CANCELLED, order.userId ?? undefined);
    this.logger.log(`Order ${id} cancelled: ${reason}`);
    return { message: 'Order cancelled successfully' };
  }

  // ─────────────────────────────────────────────────────────────
  // processPayment
  // ─────────────────────────────────────────────────────────────
  async processPayment(id: string, dto: PaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot process payment for a cancelled order');
    }

    const totalPaid =
      order.payments
        .filter((p) => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;

    const newPaymentStatus =
      totalPaid >= Number(order.totalAmount)
        ? PaymentStatus.COMPLETED
        : PaymentStatus.PROCESSING;

    const orderStatusUpdate =
      newPaymentStatus === PaymentStatus.COMPLETED
        ? { status: OrderStatus.CONFIRMED, paymentStatus: PaymentStatus.COMPLETED }
        : { paymentStatus: PaymentStatus.PROCESSING };

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          orderId: id,
          method: dto.method,
          status: PaymentStatus.COMPLETED,
          amount: dto.amount,
          transactionId: dto.transactionId,
          gatewayResponse: dto.gatewayResponse,
          paidAt: new Date(),
        },
      }),
      this.prisma.order.update({ where: { id }, data: orderStatusUpdate }),
    ]);

    if (orderStatusUpdate.status === OrderStatus.CONFIRMED) {
      await this.prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.CONFIRMED,
          comment: 'Payment received, order confirmed',
        },
      });
    }

    this.wsGateway.emitPaymentReceived({
      orderId: id,
      paymentId: payment.id,
      amount: dto.amount,
      method: dto.method,
    });

    return payment;
  }

  // ─────────────────────────────────────────────────────────────
  // createRefund
  // ─────────────────────────────────────────────────────────────
  async createRefund(id: string, amount: number, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: { where: { status: PaymentStatus.COMPLETED } } },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);

    const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalRefunded = order.payments.reduce((sum, p) => sum + Number(p.refundedAmount), 0);
    const maxRefundable = totalPaid - totalRefunded;

    if (amount > maxRefundable) {
      throw new BadRequestException(
        `Refund amount exceeds maximum refundable amount of ${maxRefundable}`,
      );
    }

    // Find the payment to refund against
    const sourcePayment = order.payments[0];
    if (!sourcePayment) {
      throw new BadRequestException('No completed payment found to refund against');
    }

    const isFullRefund = amount >= maxRefundable;
    const newOrderStatus = isFullRefund ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED;
    const newPaymentStatus = isFullRefund
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: sourcePayment.id },
        data: { refundedAmount: { increment: amount }, status: newPaymentStatus },
      }),
      this.prisma.order.update({
        where: { id },
        data: { status: newOrderStatus, paymentStatus: newPaymentStatus },
      }),
      this.prisma.orderStatusHistory.create({
        data: { orderId: id, status: newOrderStatus, comment: `Refund of ${amount}: ${reason}` },
      }),
    ]);

    this.logger.log(`Refund of ${amount} processed for order ${id}`);
    return { message: 'Refund processed successfully', amount, orderId: id };
  }

  // ─────────────────────────────────────────────────────────────
  // getMyOrders
  // ─────────────────────────────────────────────────────────────
  async getMyOrders(userId: string, filters: OrderFiltersDto) {
    return this.findAll({ ...filters, userId });
  }

  // ─────────────────────────────────────────────────────────────
  // createReturnRequest
  // ─────────────────────────────────────────────────────────────
  async createReturnRequest(orderId: string, dto: CreateReturnDto, requestedBy?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, returns: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Return can only be requested for delivered orders');
    }

    const existingPending = order.returns.find((r) => r.status === 'PENDING');
    if (existingPending) {
      throw new ConflictException('A return request is already pending for this order');
    }

    // Validate return items against order items
    for (const ri of dto.items) {
      const orderItem = order.items.find(
        (oi) =>
          oi.productId === ri.productId &&
          (ri.variantId ? oi.variantId === ri.variantId : true),
      );
      if (!orderItem) {
        throw new BadRequestException(`Product ${ri.productId} not found in this order`);
      }
      const alreadyReturned = orderItem.returnedQty;
      const maxReturnable = orderItem.quantity - alreadyReturned;
      if (ri.quantity > maxReturnable) {
        throw new BadRequestException(
          `Cannot return ${ri.quantity} units of ${ri.productId}. Max returnable: ${maxReturnable}`,
        );
      }
    }

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          orderId,
          reason: dto.reason,
          description: dto.description,
          imageUrls: dto.imageUrls ?? [],
          items: {
            create: dto.items.map((ri) => ({
              productId: ri.productId,
              variantId: ri.variantId,
              quantity: ri.quantity,
              reason: ri.reason,
            })),
          },
        },
        include: { items: true },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.RETURN_REQUESTED,
          comment: `Return requested: ${dto.reason}`,
          changedBy: requestedBy,
        },
      });

      return rr;
    });

    return returnRequest;
  }

  // ─────────────────────────────────────────────────────────────
  // generateInvoice  (returns a minimal PDF buffer via pdfkit-style structure)
  // ─────────────────────────────────────────────────────────────
  async generateInvoice(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        shippingAddress: true,
        items: true,
        payments: { where: { status: 'COMPLETED' } },
        invoices: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Upsert invoice record
    let invoice = order.invoices[0];
    if (!invoice) {
      const invoiceNumber = `INV-${order.orderNumber}`;
      invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          customerId: order.userId,
          customerName: order.user
            ? `${order.user.firstName} ${order.user.lastName}`
            : 'Guest',
          customerEmail: order.user?.email,
          customerPhone: order.user?.phone,
          customerAddress: order.shippingAddress
            ? `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}`
            : undefined,
          status: InvoiceStatus.SENT,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          paidAmount: order.payments.reduce((s, p) => s + Number(p.amount), 0),
          items: {
            create: order.items.map((i) => ({
              description: `${i.name} (SKU: ${i.sku})`,
              quantity: i.quantity,
              unitPrice: i.price,
              totalAmount: i.totalAmount,
            })),
          },
        },
      });
    }

    // Build a simple text-based PDF representation
    // In production, integrate with a real PDF library (e.g., pdfkit, puppeteer)
    const lines: string[] = [
      '='.repeat(60),
      '           SHAJ ECOM — TAX INVOICE',
      '='.repeat(60),
      `Invoice No : ${invoice.invoiceNumber}`,
      `Order No   : ${order.orderNumber}`,
      `Date       : ${new Date(invoice.issuedAt).toLocaleDateString('en-BD')}`,
      '',
      'BILL TO:',
      invoice.customerName,
      invoice.customerEmail ?? '',
      invoice.customerPhone ?? '',
      invoice.customerAddress ?? '',
      '',
      '-'.repeat(60),
      `${'ITEM'.padEnd(30)} ${'QTY'.padStart(5)} ${'PRICE'.padStart(12)} ${'TOTAL'.padStart(12)}`,
      '-'.repeat(60),
      ...order.items.map(
        (i) =>
          `${i.name.substring(0, 28).padEnd(30)} ${String(i.quantity).padStart(5)} ${Number(i.price).toFixed(2).padStart(12)} ${Number(i.totalAmount).toFixed(2).padStart(12)}`,
      ),
      '-'.repeat(60),
      `${'SUBTOTAL'.padEnd(48)} ${Number(order.subtotal).toFixed(2).padStart(12)}`,
      `${'DISCOUNT'.padEnd(48)} -${Number(order.discountAmount).toFixed(2).padStart(11)}`,
      `${'SHIPPING'.padEnd(48)} ${Number(order.shippingAmount).toFixed(2).padStart(12)}`,
      `${'TAX'.padEnd(48)} ${Number(order.taxAmount).toFixed(2).padStart(12)}`,
      '='.repeat(60),
      `${'TOTAL'.padEnd(48)} ${Number(order.totalAmount).toFixed(2).padStart(12)}`,
      '='.repeat(60),
      '',
      'Thank you for your business!',
      'Shaj Ecom | support@shajecom.com',
    ];

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  // ─────────────────────────────────────────────────────────────
  // getOrderStats
  // ─────────────────────────────────────────────────────────────
  async getOrderStats(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const [
      totalOrders,
      revenueAgg,
      statusBreakdown,
      topProducts,
      recentOrders,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({
        where: { createdAt: { gte: startDate }, status: { not: OrderStatus.CANCELLED } },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: startDate }, status: { not: OrderStatus.CANCELLED } } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10,
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return {
      period,
      startDate,
      totalOrders,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
      avgOrderValue: revenueAgg._avg.totalAmount ?? 0,
      statusBreakdown,
      topProducts,
      recentOrders,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async generateOrderNumber(): Promise<string> {
    const key = 'order:counter';
    const seq = await this.redis.incr(key);
    const date = new Date();
    const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `ORD-${ymd}-${String(seq).padStart(6, '0')}`;
  }

  private async reserveInventoryInTx(
    tx: Prisma.TransactionClient,
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ): Promise<void> {
    // Find the default warehouse inventory
    const item = await tx.inventoryItem.findFirst({
      where: {
        productId,
        variantId: variantId ?? null,
        availableQty: { gte: quantity },
      },
      include: { warehouse: { where: { isDefault: true } } },
    });

    if (!item) {
      // Fallback: find any warehouse with sufficient stock
      const anyItem = await tx.inventoryItem.findFirst({
        where: { productId, variantId: variantId ?? null, availableQty: { gte: quantity } },
      });
      if (!anyItem) {
        throw new BadRequestException(
          `Insufficient stock for product ${productId}${variantId ? ` / variant ${variantId}` : ''}`,
        );
      }

      await tx.inventoryItem.update({
        where: { id: anyItem.id },
        data: {
          reservedQty: { increment: quantity },
          availableQty: { decrement: quantity },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: anyItem.id,
          type: InventoryTransactionType.SALE,
          quantity,
          previousQty: anyItem.availableQty,
          newQty: anyItem.availableQty - quantity,
          referenceType: 'ORDER',
          notes: 'Reserved for order',
        },
      });
      return;
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedQty: { increment: quantity },
        availableQty: { decrement: quantity },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: InventoryTransactionType.SALE,
        quantity,
        previousQty: item.availableQty,
        newQty: item.availableQty - quantity,
        referenceType: 'ORDER',
        notes: 'Reserved for order',
      },
    });
  }

  private async releaseInventoryInTx(
    tx: Prisma.TransactionClient,
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ): Promise<void> {
    const item = await tx.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null },
    });

    if (!item) return;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedQty: { decrement: Math.min(quantity, item.reservedQty) },
        availableQty: { increment: quantity },
      },
    });

    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: item.id,
        type: InventoryTransactionType.RETURN_IN,
        quantity,
        previousQty: item.availableQty,
        newQty: item.availableQty + quantity,
        referenceType: 'ORDER_CANCEL',
        notes: 'Released on order cancellation',
      },
    });
  }

  private async createOrderJournalEntry(
    tx: Prisma.TransactionClient,
    orderId: string,
    totalAmount: number,
    orderNumber: string,
  ): Promise<void> {
    try {
      // Look up system accounts (graceful — accounting module may set these up)
      const [arAccount, revenueAccount] = await Promise.all([
        tx.accountChart.findFirst({ where: { code: '1200' } }), // Accounts Receivable
        tx.accountChart.findFirst({ where: { code: '4000' } }), // Sales Revenue
      ]);

      if (!arAccount || !revenueAccount) return; // Accounting module not configured yet

      const seq = await this.redis.incr('journal:counter');
      const entryNumber = `JE-${String(seq).padStart(8, '0')}`;

      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          description: `Sales revenue — Order ${orderNumber}`,
          status: JournalEntryStatus.POSTED,
          referenceType: 'ORDER',
          referenceId: orderId,
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: arAccount.id,
                description: `AR for order ${orderNumber}`,
                debit: totalAmount,
                credit: 0,
              },
              {
                accountId: revenueAccount.id,
                description: `Revenue for order ${orderNumber}`,
                debit: 0,
                credit: totalAmount,
              },
            ],
          },
        },
      });
    } catch (err) {
      // Non-fatal: accounting entry failure should not block order creation
      this.logger.warn(`Failed to create journal entry for order ${orderId}: ${err.message}`);
    }
  }
}
