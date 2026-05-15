import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InventoryTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';
import { InventoryFiltersDto } from './dto/inventory-filters.dto';
import { AdjustStockDto, BulkAdjustDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly LOW_STOCK_CACHE_KEY = 'inventory:low-stock';
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // getInventory
  // ─────────────────────────────────────────────────────────────
  async getInventory(filters: InventoryFiltersDto) {
    const { warehouseId, productId, search, lowStockOnly, page = 1, limit = 20 } = filters;

    const where: Prisma.InventoryItemWhereInput = {};

    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (lowStockOnly) {
      where.product = { trackInventory: true };
      // Will filter post-query based on threshold — or use a raw query
      where.availableQty = { lte: this.prisma.$queryRaw`"lowStockThreshold"` as any };
    }
    if (search) {
      where.product = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              price: true,
              costPrice: true,
              lowStockThreshold: true,
              status: true,
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          variant: {
            select: { id: true, sku: true, name: true, price: true },
          },
          warehouse: {
            select: { id: true, name: true, code: true, city: true },
          },
        },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // getItemById
  // ─────────────────────────────────────────────────────────────
  async getItemById(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            brand: true,
          },
        },
        variant: true,
        warehouse: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!item) throw new NotFoundException(`Inventory item ${id} not found`);
    return item;
  }

  // ─────────────────────────────────────────────────────────────
  // getByProduct
  // ─────────────────────────────────────────────────────────────
  async getByProduct(productId: string, warehouseId?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const where: Prisma.InventoryItemWhereInput = { productId };
    if (warehouseId) where.warehouseId = warehouseId;

    const items = await this.prisma.inventoryItem.findMany({
      where,
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        variant: { select: { id: true, sku: true, name: true } },
      },
    });

    const totals = items.reduce(
      (acc, i) => ({
        totalQty: acc.totalQty + i.quantity,
        totalReserved: acc.totalReserved + i.reservedQty,
        totalAvailable: acc.totalAvailable + i.availableQty,
      }),
      { totalQty: 0, totalReserved: 0, totalAvailable: 0 },
    );

    return { product, items, totals };
  }

  // ─────────────────────────────────────────────────────────────
  // adjustStock
  // ─────────────────────────────────────────────────────────────
  async adjustStock(dto: AdjustStockDto, adjustedBy?: string) {
    const { productId, variantId, warehouseId, quantity, type, note } = dto;

    // Ensure warehouse and product exist
    const [warehouse, product] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: warehouseId } }),
      this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, lowStockThreshold: true },
      }),
    ]);

    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    // Upsert inventory item
    let inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null, warehouseId },
    });

    const isAddition = [
      InventoryTransactionType.PURCHASE,
      InventoryTransactionType.ADJUSTMENT_ADD,
      InventoryTransactionType.RETURN_IN,
      InventoryTransactionType.TRANSFER_IN,
      InventoryTransactionType.MANUFACTURING_IN,
      InventoryTransactionType.INITIAL_STOCK,
    ].includes(type);

    const isRemoval = !isAddition;

    if (!inventoryItem) {
      if (isRemoval) {
        throw new BadRequestException(
          `No inventory record found for product ${productId} in warehouse ${warehouseId}`,
        );
      }
      inventoryItem = await this.prisma.inventoryItem.create({
        data: {
          productId,
          variantId: variantId ?? null,
          warehouseId,
          quantity: 0,
          reservedQty: 0,
          availableQty: 0,
        },
      });
    }

    if (isRemoval && inventoryItem.availableQty < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${inventoryItem.availableQty}, Requested: ${quantity}`,
      );
    }

    const previousQty = inventoryItem.quantity;
    const newQty = isAddition ? previousQty + quantity : previousQty - quantity;
    const newAvailableQty = isAddition
      ? inventoryItem.availableQty + quantity
      : inventoryItem.availableQty - quantity;

    const [updatedItem] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { quantity: newQty, availableQty: newAvailableQty, updatedAt: new Date() },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type,
          quantity,
          previousQty,
          newQty,
          notes: note,
          createdBy: adjustedBy,
        },
      }),
    ]);

    // Sync product-level stock quantity
    await this.syncProductStockStatus(productId);

    // Check low stock
    await this.checkAndEmitLowStockAlert(
      updatedItem.id,
      productId,
      product.name,
      warehouseId,
      newAvailableQty,
      product.lowStockThreshold,
    );

    // Invalidate cache
    await this.redis.del(this.LOW_STOCK_CACHE_KEY);

    this.logger.log(
      `Inventory adjusted: product=${productId}, warehouse=${warehouseId}, type=${type}, qty=${quantity}`,
    );

    return updatedItem;
  }

  // ─────────────────────────────────────────────────────────────
  // getLowStockAlerts
  // ─────────────────────────────────────────────────────────────
  async getLowStockAlerts(threshold?: number) {
    const cached = await this.redis.get(this.LOW_STOCK_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!threshold) return parsed;
    }

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        product: { trackInventory: true, status: 'ACTIVE' },
        availableQty: threshold !== undefined ? { lte: threshold } : undefined,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            lowStockThreshold: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        variant: { select: { id: true, sku: true, name: true } },
      },
    });

    // Filter against per-product threshold if no override given
    const lowStock = items.filter((item) => {
      const t = threshold ?? item.product.lowStockThreshold;
      return item.availableQty <= t;
    });

    if (!threshold) {
      await this.redis.set(
        this.LOW_STOCK_CACHE_KEY,
        JSON.stringify(lowStock),
      );
      await this.redis.expire(this.LOW_STOCK_CACHE_KEY, this.CACHE_TTL);
    }

    return lowStock;
  }

  // ─────────────────────────────────────────────────────────────
  // getInventoryValue
  // ─────────────────────────────────────────────────────────────
  async getInventoryValue() {
    const items = await this.prisma.inventoryItem.findMany({
      include: {
        product: { select: { id: true, name: true, costPrice: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        variant: { select: { id: true, sku: true, costPrice: true } },
      },
    });

    const warehouseMap = new Map<string, {
      warehouseId: string;
      warehouseName: string;
      warehouseCode: string;
      totalValue: number;
      totalItems: number;
      totalQuantity: number;
    }>();

    let grandTotal = 0;

    for (const item of items) {
      const costPrice = item.variant?.costPrice
        ? Number(item.variant.costPrice)
        : item.product.costPrice
          ? Number(item.product.costPrice)
          : 0;

      const lineValue = costPrice * item.quantity;
      grandTotal += lineValue;

      if (!warehouseMap.has(item.warehouseId)) {
        warehouseMap.set(item.warehouseId, {
          warehouseId: item.warehouseId,
          warehouseName: item.warehouse.name,
          warehouseCode: item.warehouse.code,
          totalValue: 0,
          totalItems: 0,
          totalQuantity: 0,
        });
      }

      const wh = warehouseMap.get(item.warehouseId)!;
      wh.totalValue += lineValue;
      wh.totalItems += 1;
      wh.totalQuantity += item.quantity;
    }

    return {
      grandTotal,
      byWarehouse: Array.from(warehouseMap.values()),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // getStockMovementReport
  // ─────────────────────────────────────────────────────────────
  async getStockMovementReport(
    productId: string,
    dateRange: { startDate?: string; endDate?: string },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const inventoryItems = await this.prisma.inventoryItem.findMany({
      where: { productId },
      select: { id: true },
    });

    const itemIds = inventoryItems.map((i) => i.id);

    const txWhere: Prisma.InventoryTransactionWhereInput = {
      inventoryItemId: { in: itemIds },
    };

    if (dateRange.startDate || dateRange.endDate) {
      txWhere.createdAt = {};
      if (dateRange.startDate) txWhere.createdAt.gte = new Date(dateRange.startDate);
      if (dateRange.endDate) txWhere.createdAt.lte = new Date(dateRange.endDate);
    }

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: txWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        inventoryItem: {
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
            variant: { select: { id: true, sku: true, name: true } },
          },
        },
      },
    });

    // Summarize by type
    const summary = transactions.reduce(
      (acc, tx) => {
        if (!acc[tx.type]) acc[tx.type] = { count: 0, totalQty: 0 };
        acc[tx.type].count += 1;
        acc[tx.type].totalQty += tx.quantity;
        return acc;
      },
      {} as Record<string, { count: number; totalQty: number }>,
    );

    return { product, transactions, summary };
  }

  // ─────────────────────────────────────────────────────────────
  // bulkAdjust
  // ─────────────────────────────────────────────────────────────
  async bulkAdjust(dto: BulkAdjustDto, adjustedBy?: string) {
    const results: Array<{ productId: string; success: boolean; error?: string }> = [];

    for (const item of dto.items) {
      try {
        await this.adjustStock(item, adjustedBy);
        results.push({ productId: item.productId, success: true });
      } catch (error) {
        results.push({ productId: item.productId, success: false, error: error.message });
      }
    }

    const failed = results.filter((r) => !r.success);
    this.logger.log(
      `Bulk adjust: ${results.length - failed.length}/${results.length} succeeded`,
    );

    return { results, successCount: results.length - failed.length, failureCount: failed.length };
  }

  // ─────────────────────────────────────────────────────────────
  // reserveStock
  // ─────────────────────────────────────────────────────────────
  async reserveStock(
    productId: string,
    variantId: string | undefined,
    warehouseId: string,
    quantity: number,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null, warehouseId },
    });

    if (!item) throw new NotFoundException('Inventory item not found');
    if (item.availableQty < quantity) {
      throw new BadRequestException(
        `Insufficient available stock. Available: ${item.availableQty}, Requested: ${quantity}`,
      );
    }

    return this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedQty: { increment: quantity },
        availableQty: { decrement: quantity },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // releaseReservation
  // ─────────────────────────────────────────────────────────────
  async releaseReservation(
    productId: string,
    variantId: string | undefined,
    warehouseId: string,
    quantity: number,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { productId, variantId: variantId ?? null, warehouseId },
    });

    if (!item) throw new NotFoundException('Inventory item not found');

    const releaseQty = Math.min(quantity, item.reservedQty);

    return this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedQty: { decrement: releaseQty },
        availableQty: { increment: releaseQty },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────

  private async syncProductStockStatus(productId: string): Promise<void> {
    const totals = await this.prisma.inventoryItem.aggregate({
      where: { productId },
      _sum: { quantity: true, availableQty: true },
    });

    const totalQty = totals._sum.quantity ?? 0;
    const availableQty = totals._sum.availableQty ?? 0;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        stockQuantity: totalQty,
        stockStatus: availableQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK',
      },
    });
  }

  private async checkAndEmitLowStockAlert(
    itemId: string,
    productId: string,
    productName: string,
    warehouseId: string,
    currentStock: number,
    threshold: number,
  ): Promise<void> {
    if (currentStock <= threshold) {
      this.wsGateway.emitInventoryAlert({
        productId,
        productName,
        warehouseId,
        currentStock,
        threshold,
      });
      this.logger.warn(
        `Low stock alert: ${productName} (${productId}) - ${currentStock} remaining (threshold: ${threshold})`,
      );
    }
  }
}
