import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryTransactionType } from '@prisma/client';

interface CreateBOMDto {
  name: string;
  quantity?: number;
  estimatedCost?: number;
  notes?: string;
  components: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

interface UpdateBOMDto {
  name?: string;
  quantity?: number;
  estimatedCost?: number;
  notes?: string;
  isActive?: boolean;
  components?: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

interface CreateMODto {
  bomId: string;
  productId: string;
  quantity: number;
  plannedDate?: string;
  notes?: string;
}

interface MOFilters {
  status?: string;
  page?: number;
  limit?: number;
}

let moSeq = 1;

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Bill of Materials ────────────────────────────────────────────────────

  async getBOMs(productId?: string) {
    return this.prisma.billOfMaterials.findMany({
      where: productId ? { productId } : undefined,
      include: {
        components: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBOM(id: string) {
    const bom = await this.prisma.billOfMaterials.findUnique({
      where: { id },
      include: { components: true },
    });
    if (!bom) throw new NotFoundException(`BOM ${id} not found`);
    return bom;
  }

  async createBOM(productId: string, dto: CreateBOMDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    return this.prisma.billOfMaterials.create({
      data: {
        productId,
        name: dto.name,
        quantity: dto.quantity ?? 1,
        estimatedCost: dto.estimatedCost,
        notes: dto.notes,
        components: {
          create: dto.components.map((c) => ({
            productId: c.productId,
            variantId: c.variantId,
            quantity: c.quantity,
            unit: c.unit ?? 'pcs',
            notes: c.notes,
          })),
        },
      },
      include: { components: true },
    });
  }

  async updateBOM(id: string, dto: UpdateBOMDto) {
    await this.getBOM(id);

    if (dto.components) {
      // Replace components
      await this.prisma.bOMComponent.deleteMany({ where: { bomId: id } });
    }

    return this.prisma.billOfMaterials.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.components && {
          components: {
            create: dto.components.map((c) => ({
              productId: c.productId,
              variantId: c.variantId,
              quantity: c.quantity,
              unit: c.unit ?? 'pcs',
              notes: c.notes,
            })),
          },
        }),
      },
      include: { components: true },
    });
  }

  async deleteBOM(id: string) {
    await this.getBOM(id);
    return this.prisma.billOfMaterials.delete({ where: { id } });
  }

  async getBOMCost(id: string) {
    const bom = await this.getBOM(id);

    let totalCost = 0;
    const costBreakdown: Array<{
      productId: string;
      quantity: number;
      unit: string;
      costPrice: number;
      lineCost: number;
    }> = [];

    for (const component of bom.components) {
      const product = await this.prisma.product.findUnique({
        where: { id: component.productId },
        select: { costPrice: true, price: true },
      });
      const costPrice = Number(product?.costPrice ?? product?.price ?? 0);
      const qty = Number(component.quantity);
      const lineCost = costPrice * qty;
      totalCost += lineCost;
      costBreakdown.push({
        productId: component.productId,
        quantity: qty,
        unit: component.unit,
        costPrice,
        lineCost,
      });
    }

    return {
      bomId: id,
      name: bom.name,
      totalCost: +totalCost.toFixed(2),
      components: costBreakdown,
    };
  }

  // ─── Manufacturing Orders ─────────────────────────────────────────────────

  async getMOs(filters: MOFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;

    const [total, items] = await Promise.all([
      this.prisma.manufacturingOrder.count({ where }),
      this.prisma.manufacturingOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getMO(id: string) {
    const mo = await this.prisma.manufacturingOrder.findUnique({
      where: { id },
    });
    if (!mo) throw new NotFoundException(`Manufacturing Order ${id} not found`);
    return mo;
  }

  async createMO(dto: CreateMODto, createdBy?: string) {
    // Verify BOM exists
    const bom = await this.getBOM(dto.bomId);

    // Verify product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const moNumber = await this.generateMONumber();

    return this.prisma.manufacturingOrder.create({
      data: {
        moNumber,
        bomId: dto.bomId,
        productId: dto.productId,
        quantity: dto.quantity,
        status: 'PLANNED',
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        notes: dto.notes,
        createdBy,
      },
    });
  }

  async startMO(id: string) {
    const mo = await this.getMO(id);
    if (mo.status !== 'PLANNED') {
      throw new BadRequestException(
        `Manufacturing Order ${id} is ${mo.status}, not PLANNED`,
      );
    }

    return this.prisma.manufacturingOrder.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  async completeMO(id: string) {
    const mo = await this.getMO(id);
    if (mo.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        `Manufacturing Order ${id} is ${mo.status}, not IN_PROGRESS`,
      );
    }

    // Get default warehouse
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { isDefault: true },
    });

    if (warehouse) {
      // Add finished goods to inventory
      await this.adjustInventory(
        mo.productId,
        undefined,
        warehouse.id,
        mo.quantity,
        InventoryTransactionType.MANUFACTURING_IN,
        `MO completion: ${mo.moNumber}`,
      );

      // Deduct raw materials based on BOM
      const bom = await this.getBOM(mo.bomId);
      for (const component of bom.components) {
        const requiredQty = Math.ceil(
          Number(component.quantity) * mo.quantity,
        );
        await this.adjustInventory(
          component.productId,
          component.variantId ?? undefined,
          warehouse.id,
          -requiredQty,
          InventoryTransactionType.MANUFACTURING_OUT,
          `Raw material consumption: ${mo.moNumber}`,
        );
      }
    }

    const completed = await this.prisma.manufacturingOrder.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    this.logger.log(
      `Manufacturing Order ${mo.moNumber} completed: ${mo.quantity} units of product ${mo.productId}`,
    );

    return completed;
  }

  async cancelMO(id: string) {
    const mo = await this.getMO(id);
    if (mo.status === 'COMPLETED' || mo.status === 'CANCELLED') {
      throw new BadRequestException(
        `Manufacturing Order ${id} cannot be cancelled (status: ${mo.status})`,
      );
    }

    return this.prisma.manufacturingOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateMONumber(): Promise<string> {
    const count = await this.prisma.manufacturingOrder.count();
    const seq = String(count + moSeq++).padStart(6, '0');
    const year = new Date().getFullYear();
    return `MO-${year}-${seq}`;
  }

  private async adjustInventory(
    productId: string,
    variantId: string | undefined,
    warehouseId: string,
    delta: number,
    type: InventoryTransactionType,
    notes: string,
  ) {
    try {
      const existing = await this.prisma.inventoryItem.findFirst({
        where: { productId, variantId: variantId ?? null, warehouseId },
      });

      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        const newAvailable = Math.max(0, existing.availableQty + delta);

        await this.prisma.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: newQty, availableQty: newAvailable },
        });

        await this.prisma.inventoryTransaction.create({
          data: {
            inventoryItemId: existing.id,
            type,
            quantity: Math.abs(delta),
            previousQty: existing.quantity,
            newQty,
            notes,
          },
        });
      } else if (delta > 0) {
        // Create new inventory item for additions
        const item = await this.prisma.inventoryItem.create({
          data: {
            productId,
            variantId,
            warehouseId,
            quantity: delta,
            availableQty: delta,
            reservedQty: 0,
          },
        });

        await this.prisma.inventoryTransaction.create({
          data: {
            inventoryItemId: item.id,
            type,
            quantity: delta,
            previousQty: 0,
            newQty: delta,
            notes,
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Inventory adjustment failed for product ${productId}: ${err.message}`,
      );
    }
  }
}
