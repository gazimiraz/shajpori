import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreatePODto, UpdatePODto } from './dto/create-po.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { CreateGRNDto } from './dto/create-grn.dto';

interface POFilters {
  status?: string;
  supplierId?: string;
  warehouseId?: string;
  page?: number;
  limit?: number;
}

interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

interface GRNFilters {
  supplierId?: string;
  warehouseId?: string;
  purchaseOrderId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PurchasingService {
  private readonly logger = new Logger(PurchasingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── PURCHASE ORDERS ─────────────────────────────────────────────────────

  async getPurchaseOrders(filters: POFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, email: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: { select: { id: true, name: true, code: true, city: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    return po;
  }

  async createPurchaseOrder(dto: CreatePODto) {
    // Validate supplier and warehouse exist
    const [supplier, warehouse] = await Promise.all([
      this.prisma.supplier.findUnique({ where: { id: dto.supplierId } }),
      this.prisma.warehouse.findUnique({ where: { id: dto.warehouseId } }),
    ]);

    if (!supplier) throw new NotFoundException(`Supplier ${dto.supplierId} not found`);
    if (!warehouse) throw new NotFoundException(`Warehouse ${dto.warehouseId} not found`);

    // Calculate totals
    const itemsWithTotals = dto.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = lineTotal * ((item.taxRate ?? 0) / 100);
      return { ...item, lineTotal, taxAmount };
    });

    const subtotal = itemsWithTotals.reduce((s, i) => s + i.lineTotal, 0);
    const itemTaxTotal = itemsWithTotals.reduce((s, i) => s + i.taxAmount, 0);
    const taxAmount = dto.taxAmount !== undefined ? dto.taxAmount : itemTaxTotal;
    const shippingCost = dto.shippingCost ?? 0;
    const totalAmount = subtotal + taxAmount + shippingCost;

    const poNumber = await this.generatePONumber();

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        status: 'DRAFT',
        currency: dto.currency ?? 'BDT',
        subtotal,
        taxAmount,
        shippingCost,
        totalAmount,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        items: {
          create: itemsWithTotals.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            sku: item.sku ?? null,
            quantity: item.quantity,
            receivedQty: 0,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate ?? 0,
            totalPrice: item.lineTotal + item.taxAmount,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async updatePurchaseOrder(id: string, dto: UpdatePODto) {
    const po = await this.getPurchaseOrder(id);

    if (!['DRAFT', 'PENDING'].includes(po.status)) {
      throw new BadRequestException(
        `Cannot update a purchase order with status ${po.status}`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
        ...(dto.expectedDate !== undefined && { expectedDate: new Date(dto.expectedDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.shippingCost !== undefined && { shippingCost: dto.shippingCost }),
      },
      include: { items: true, supplier: true, warehouse: true },
    });
  }

  async sendPurchaseOrder(id: string) {
    const po = await this.getPurchaseOrder(id);

    if (po.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only DRAFT purchase orders can be sent. Current status: ${po.status}`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  async cancelPurchaseOrder(id: string) {
    const po = await this.getPurchaseOrder(id);

    if (['FULLY_RECEIVED', 'CANCELLED'].includes(po.status)) {
      throw new BadRequestException(
        `Cannot cancel a purchase order with status ${po.status}`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  async getPOStats() {
    const [total, byStatus, valueAgg] = await Promise.all([
      this.prisma.purchaseOrder.count(),
      this.prisma.purchaseOrder.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.purchaseOrder.aggregate({
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      total,
      totalValue: Number(valueAgg._sum.totalAmount ?? 0),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        value: Number(s._sum.totalAmount ?? 0),
      })),
    };
  }

  // ─── SUPPLIERS ────────────────────────────────────────────────────────────

  async getSuppliers(filters: SupplierFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        include: { _count: { select: { purchaseOrders: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { purchaseOrders: true } },
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, poNumber: true, status: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async createSupplier(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        country: dto.country,
        contactPerson: dto.contactPerson,
        paymentTerms: dto.paymentTerms,
        creditLimit: dto.creditLimit ?? 0,
        taxId: dto.taxId,
        bankAccount: dto.bankAccount,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    await this.getSupplier(id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.bankAccount !== undefined && { bankAccount: dto.bankAccount }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteSupplier(id: string) {
    await this.getSupplier(id);

    const activeOrders = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, status: { notIn: ['FULLY_RECEIVED', 'CANCELLED'] } },
    });
    if (activeOrders > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with active purchase orders',
      );
    }

    return this.prisma.supplier.delete({ where: { id } });
  }

  // ─── GRN (GOODS RECEIVED NOTES) ──────────────────────────────────────────

  async getGRNs(filters: GRNFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.purchaseOrderId) where.purchaseOrderId = filters.purchaseOrderId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    const [items, total] = await Promise.all([
      this.prisma.goodsReceivedNote.findMany({
        where,
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.goodsReceivedNote.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getGRN(id: string) {
    const grn = await this.prisma.goodsReceivedNote.findUnique({
      where: { id },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        purchaseOrder: {
          select: { id: true, poNumber: true, supplier: { select: { id: true, name: true } } },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });
    if (!grn) throw new NotFoundException(`GRN ${id} not found`);
    return grn;
  }

  async createGRN(dto: CreateGRNDto, receivedBy?: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${dto.warehouseId} not found`);

    let purchaseOrder: any = null;
    if (dto.purchaseOrderId) {
      purchaseOrder = await this.prisma.purchaseOrder.findUnique({
        where: { id: dto.purchaseOrderId },
        include: { items: true },
      });
      if (!purchaseOrder) {
        throw new NotFoundException(`Purchase order ${dto.purchaseOrderId} not found`);
      }
    }

    // Calculate total value
    const totalValue = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const grnNumber = await this.generateGRNNumber();

    // Create GRN
    const grn = await this.prisma.goodsReceivedNote.create({
      data: {
        grnNumber,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        warehouseId: dto.warehouseId,
        receivedBy: receivedBy ?? null,
        notes: dto.notes,
        invoiceNumber: dto.invoiceNumber,
        totalValue,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId ?? null,
            sku: item.sku ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchNumber: item.batchNumber ?? null,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          })),
        },
      },
      include: { items: true },
    });

    // Update inventory items and create transactions
    for (const item of dto.items) {
      // Upsert inventory item
      let inventoryItem = await this.prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          warehouseId: dto.warehouseId,
        },
      });

      if (!inventoryItem) {
        inventoryItem = await this.prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            warehouseId: dto.warehouseId,
            quantity: 0,
            reservedQty: 0,
            availableQty: 0,
          },
        });
      }

      const previousQty = inventoryItem.quantity;
      const newQty = previousQty + item.quantity;

      await this.prisma.$transaction([
        this.prisma.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            quantity: newQty,
            availableQty: inventoryItem.availableQty + item.quantity,
            updatedAt: new Date(),
          },
        }),
        this.prisma.inventoryTransaction.create({
          data: {
            inventoryItemId: inventoryItem.id,
            type: InventoryTransactionType.PURCHASE,
            quantity: item.quantity,
            previousQty,
            newQty,
            notes: `GRN ${grnNumber}`,
            createdBy: receivedBy ?? null,
          },
        }),
      ]);
    }

    // If PO provided, update received quantities and check if fully received
    if (purchaseOrder) {
      for (const item of dto.items) {
        const poItem = purchaseOrder.items.find(
          (pi: any) =>
            pi.productId === item.productId &&
            (pi.variantId ?? null) === (item.variantId ?? null),
        );

        if (poItem) {
          await this.prisma.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: { receivedQty: { increment: item.quantity } },
          });
        }
      }

      // Check if all items are fully received
      const updatedPOItems = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: purchaseOrder.id },
      });

      const allReceived = updatedPOItems.every(
        (pi) => pi.receivedQty >= pi.quantity,
      );

      if (allReceived) {
        await this.prisma.purchaseOrder.update({
          where: { id: purchaseOrder.id },
          data: { status: 'FULLY_RECEIVED', receivedAt: new Date() },
        });
        this.logger.log(`Purchase order ${purchaseOrder.poNumber} fully received`);
      } else {
        // Check if partially received
        const anyReceived = updatedPOItems.some((pi) => pi.receivedQty > 0);
        if (anyReceived && purchaseOrder.status !== 'PARTIALLY_RECEIVED') {
          await this.prisma.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: { status: 'PARTIALLY_RECEIVED' },
          });
        }
      }
    }

    return grn;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generatePONumber(): Promise<string> {
    const key = 'purchasing:po_seq';
    const seq = await this.redis.incr(key);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `PO-${year}${month}-${String(seq).padStart(5, '0')}`;
  }

  private async generateGRNNumber(): Promise<string> {
    const key = 'purchasing:grn_seq';
    const seq = await this.redis.incr(key);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `GRN-${year}${month}-${String(seq).padStart(5, '0')}`;
  }
}
