import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, ShippingStatus } from '@prisma/client';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
} from './dto/create-shipment.dto';

interface ShippingRate {
  method: string;
  carrier: string;
  price: number;
  estimatedDays: number;
}

interface ShipmentFilters {
  page?: number;
  limit?: number;
  status?: string;
  orderId?: string;
}

const RATE_INSIDE_DHAKA = 60;
const RATE_OUTSIDE_DHAKA = 120;
const RATE_EXPRESS = 200;
const FREE_SHIPPING_THRESHOLD = 1000;

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Rates ───────────────────────────────────────────────────────────────

  getRates(weight: number, destination: string): ShippingRate[] {
    const isDhaka =
      destination.toLowerCase().includes('dhaka') ||
      destination.toLowerCase() === 'dhaka';

    const rates: ShippingRate[] = [
      {
        method: 'STANDARD',
        carrier: 'Sundarban Courier',
        price: isDhaka ? RATE_INSIDE_DHAKA : RATE_OUTSIDE_DHAKA,
        estimatedDays: isDhaka ? 1 : 3,
      },
      {
        method: 'EXPRESS',
        carrier: 'Pathao',
        price: RATE_EXPRESS,
        estimatedDays: isDhaka ? 1 : 2,
      },
      {
        method: 'SAME_DAY',
        carrier: 'Shohoz',
        price: isDhaka ? 80 : 150,
        estimatedDays: 1,
      },
    ];

    // Weight surcharge: +20 BDT per kg above 1kg
    const extraWeight = Math.max(0, weight - 1);
    return rates.map((r) => ({
      ...r,
      price: r.price + Math.round(extraWeight * 20),
    }));
  }

  calculateShipping(
    items: Array<{ weight?: number; quantity: number }>,
    destination: string,
    method: string,
  ): { cost: number; estimatedDays: number } {
    const totalWeight = items.reduce(
      (sum, i) => sum + (i.weight ?? 0.5) * i.quantity,
      0,
    );

    const rates = this.getRates(totalWeight, destination);
    const selectedRate = rates.find(
      (r) => r.method === method.toUpperCase(),
    );

    if (!selectedRate) {
      const fallback = rates[0];
      return { cost: fallback.price, estimatedDays: fallback.estimatedDays };
    }

    return {
      cost: selectedRate.price,
      estimatedDays: selectedRate.estimatedDays,
    };
  }

  calculateFreeShipping(orderTotal: number): boolean {
    return orderTotal >= FREE_SHIPPING_THRESHOLD;
  }

  // ─── Shipments ───────────────────────────────────────────────────────────

  async createShipment(dto: CreateShipmentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        trackingNumber: dto.trackingNumber,
        carrier: dto.carrier,
        status: ShippingStatus.PENDING,
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : undefined,
        notes: dto.notes,
        shippedAt: new Date(),
      },
      include: { trackingEvents: true },
    });

    // Update order status to SHIPPED
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: OrderStatus.SHIPPED },
    });

    this.logger.log(`Shipment created for order ${dto.orderId}: ${shipment.id}`);
    return shipment;
  }

  async updateShipment(id: string, dto: UpdateShipmentDto) {
    const existing = await this.prisma.shipment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Shipment ${id} not found`);

    return this.prisma.shipment.update({
      where: { id },
      data: {
        ...(dto.trackingNumber !== undefined && {
          trackingNumber: dto.trackingNumber,
        }),
        ...(dto.carrier !== undefined && { carrier: dto.carrier }),
        ...(dto.estimatedDelivery !== undefined && {
          estimatedDelivery: new Date(dto.estimatedDelivery),
        }),
        ...(dto.status !== undefined && {
          status: dto.status as ShippingStatus,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { trackingEvents: true },
    });
  }

  async getShipments(filters: ShipmentFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status as ShippingStatus;
    if (filters.orderId) where.orderId = filters.orderId;

    const [total, items] = await Promise.all([
      this.prisma.shipment.count({ where }),
      this.prisma.shipment.findMany({
        where,
        include: {
          order: { select: { orderNumber: true, totalAmount: true } },
          trackingEvents: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getShipment(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { select: { orderNumber: true, totalAmount: true, status: true } },
        trackingEvents: { orderBy: { timestamp: 'desc' } },
      },
    });
    if (!shipment) throw new NotFoundException(`Shipment ${id} not found`);
    return shipment;
  }

  async addTrackingEvent(
    shipmentId: string,
    status: string,
    location?: string,
    message?: string,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundException(`Shipment ${shipmentId} not found`);

    const event = await this.prisma.shipmentTracking.create({
      data: {
        shipmentId,
        status,
        location,
        message,
        timestamp: new Date(),
      },
    });

    // Keep shipment status in sync with the latest tracking event
    const mappedStatus = this.mapTrackingStatusToShippingStatus(status);
    if (mappedStatus) {
      await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: mappedStatus },
      });

      // Sync order status when delivered
      if (mappedStatus === ShippingStatus.DELIVERED) {
        await this.prisma.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED },
        });
      }
    }

    return event;
  }

  async getTrackingByNumber(trackingNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber },
      include: {
        trackingEvents: { orderBy: { timestamp: 'asc' } },
        order: { select: { orderNumber: true } },
      },
    });
    if (!shipment) {
      throw new NotFoundException(
        `No shipment found with tracking number ${trackingNumber}`,
      );
    }
    return shipment;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private mapTrackingStatusToShippingStatus(
    status: string,
  ): ShippingStatus | null {
    const map: Record<string, ShippingStatus> = {
      PICKED_UP: ShippingStatus.PICKED_UP,
      IN_TRANSIT: ShippingStatus.IN_TRANSIT,
      OUT_FOR_DELIVERY: ShippingStatus.OUT_FOR_DELIVERY,
      DELIVERED: ShippingStatus.DELIVERED,
      FAILED_DELIVERY: ShippingStatus.FAILED_DELIVERY,
      RETURNED: ShippingStatus.RETURNED,
      CANCELLED: ShippingStatus.CANCELLED,
    };
    return map[status.toUpperCase()] ?? null;
  }
}
