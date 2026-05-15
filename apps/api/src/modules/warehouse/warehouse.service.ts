import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InventoryTransactionType, Prisma } from '@shaj/database';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WebSocketGatewayService } from '../../gateways/websocket.gateway';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { InitiateTransferDto } from './dto/stock-transfer.dto';

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly wsGateway: WebSocketGatewayService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────

  async findAll(filters: { isActive?: boolean; storeId?: string; search?: string }) {
    const where: Prisma.WarehouseWhereInput = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.storeId) where.storeId = filters.storeId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.warehouse.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        store: { select: { id: true, name: true } },
        _count: { select: { inventoryItems: true } },
      },
    });
  }

  async findOne(id: string): Promise<any> {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        store: true,
        inventoryItems: {
          take: 20,
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, sku: true, name: true } },
          },
        },
        _count: {
          select: {
            inventoryItems: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    });

    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    const existing = await this.prisma.warehouse.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Warehouse code "${dto.code}" is already in use`);

    return this.prisma.$transaction(async (tx) => {
      // If this is set as default, unset all others
      if (dto.isDefault) {
        await tx.warehouse.updateMany({ data: { isDefault: false } });
      }

      return tx.warehouse.create({ data: dto });
    });
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);

    if (dto.code) {
      const conflict = await this.prisma.warehouse.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Warehouse code "${dto.code}" is already in use`);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({ where: { id: { not: id } }, data: { isDefault: false } });
      }
      return tx.warehouse.update({ where: { id }, data: dto });
    });
  }

  async remove(id: string) {
    const warehouse = await this.findOne(id);

    const itemCount = await this.prisma.inventoryItem.count({ where: { warehouseId: id } });
    if (itemCount > 0) {
      throw new BadRequestException(
        `Cannot delete warehouse with ${itemCount} inventory items. Transfer or remove stock first.`,
      );
    }

    await this.prisma.warehouse.delete({ where: { id } });
    return { message: `Warehouse ${warehouse.name} deleted` };
  }

  // ─────────────────────────────────────────────────────────────
  // Stock Transfers
  // ─────────────────────────────────────────────────────────────

  async initiateTransfer(dto: InitiateTransferDto, requestedBy?: string) {
    const { fromWarehouseId, toWarehouseId, items, notes } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses cannot be the same');
    }

    const [fromWh, toWh] = await Promise.all([
      this.prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      this.prisma.warehouse.findUnique({ where: { id: toWarehouseId } }),
    ]);

    if (!fromWh) throw new NotFoundException(`Source warehouse ${fromWarehouseId} not found`);
    if (!toWh) throw new NotFoundException(`Destination warehouse ${toWarehouseId} not found`);
    if (!fromWh.isActive) throw new BadRequestException('Source warehouse is inactive');
    if (!toWh.isActive) throw new BadRequestException('Destination warehouse is inactive');

    // Validate available stock for each item
    for (const item of items) {
      const inv = await this.prisma.inventoryItem.findFirst({
        where: {
          productId: item.productId,
          variantId: item.variantId ?? null,
          warehouseId: fromWarehouseId,
        },
      });

      if (!inv || inv.availableQty < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${item.productId}${item.variantId ? ` / variant ${item.variantId}` : ''} in source warehouse. ` +
            `Available: ${inv?.availableQty ?? 0}, Requested: ${item.quantity}`,
        );
      }
    }

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        fromWarehouseId,
        toWarehouseId,
        status: 'PENDING',
        notes,
        requestedBy,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            requestedQty: item.quantity,
          })),
        },
      },
      include: { items: true, fromWarehouse: true, toWarehouse: true },
    });

    this.wsGateway.emitStockTransferUpdate({ ...transfer, action: 'initiated' });
    this.logger.log(`Transfer ${transfer.id} initiated: ${fromWh.code} → ${toWh.code}`);
    return transfer;
  }

  async approveTransfer(transferId: string, approvedBy?: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true, fromWarehouse: true, toWarehouse: true },
    });

    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
    if (transfer.status !== 'PENDING') {
      throw new BadRequestException(
        `Transfer cannot be approved. Current status: ${transfer.status}`,
      );
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: 'APPROVED', approvedBy },
      include: { items: true, fromWarehouse: true, toWarehouse: true },
    });

    this.wsGateway.emitStockTransferUpdate({ ...updated, action: 'approved' });
    this.logger.log(`Transfer ${transferId} approved by ${approvedBy}`);
    return updated;
  }

  async completeTransfer(transferId: string, completedBy?: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
    if (transfer.status !== 'APPROVED') {
      throw new BadRequestException(
        `Transfer must be approved before completing. Current status: ${transfer.status}`,
      );
    }

    // Execute the stock movement in a single transaction
    await this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        // Deduct from source warehouse
        const fromInv = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId,
            warehouseId: transfer.fromWarehouseId,
          },
        });

        if (!fromInv || fromInv.availableQty < item.requestedQty) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId} in source warehouse at time of completion`,
          );
        }

        await tx.inventoryItem.update({
          where: { id: fromInv.id },
          data: {
            quantity: { decrement: item.requestedQty },
            availableQty: { decrement: item.requestedQty },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: fromInv.id,
            type: InventoryTransactionType.TRANSFER_OUT,
            quantity: item.requestedQty,
            previousQty: fromInv.quantity,
            newQty: fromInv.quantity - item.requestedQty,
            referenceType: 'STOCK_TRANSFER',
            referenceId: transferId,
            notes: `Transfer to ${transfer.toWarehouseId}`,
            createdBy: completedBy,
          },
        });

        // Add to destination warehouse (upsert)
        const toInv = await tx.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId,
            warehouseId: transfer.toWarehouseId,
          },
        });

        if (toInv) {
          await tx.inventoryItem.update({
            where: { id: toInv.id },
            data: {
              quantity: { increment: item.requestedQty },
              availableQty: { increment: item.requestedQty },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: toInv.id,
              type: InventoryTransactionType.TRANSFER_IN,
              quantity: item.requestedQty,
              previousQty: toInv.quantity,
              newQty: toInv.quantity + item.requestedQty,
              referenceType: 'STOCK_TRANSFER',
              referenceId: transferId,
              notes: `Transfer from ${transfer.fromWarehouseId}`,
              createdBy: completedBy,
            },
          });
        } else {
          const newInv = await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              warehouseId: transfer.toWarehouseId,
              quantity: item.requestedQty,
              reservedQty: 0,
              availableQty: item.requestedQty,
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              inventoryItemId: newInv.id,
              type: InventoryTransactionType.TRANSFER_IN,
              quantity: item.requestedQty,
              previousQty: 0,
              newQty: item.requestedQty,
              referenceType: 'STOCK_TRANSFER',
              referenceId: transferId,
              notes: `Transfer from ${transfer.fromWarehouseId}`,
              createdBy: completedBy,
            },
          });
        }

        // Update transferred quantity
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { transferredQty: item.requestedQty },
        });
      }

      await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'COMPLETED', transferredAt: new Date() },
      });
    });

    const completed = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true, fromWarehouse: true, toWarehouse: true },
    });

    this.wsGateway.emitStockTransferUpdate({ ...completed, action: 'completed' });
    this.logger.log(`Transfer ${transferId} completed`);
    return completed;
  }

  async getTransferById(transferId: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: {
        items: {
          include: {
            transfer: false,
          },
        },
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    if (!transfer) throw new NotFoundException(`Transfer ${transferId} not found`);
    return transfer;
  }

  async listTransfers(filters: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { warehouseId, status, page = 1, limit = 20 } = filters;
    const where: Prisma.StockTransferWhereInput = {};

    if (warehouseId) {
      where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    }
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [transfers, total] = await this.prisma.$transaction([
      this.prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromWarehouse: { select: { id: true, name: true, code: true } },
          toWarehouse: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      data: transfers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
