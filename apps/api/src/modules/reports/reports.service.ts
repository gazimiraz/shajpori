import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

type GroupBy = 'day' | 'week' | 'month';

interface PeriodBucket {
  date: string;
  revenue: number;
  orders: number;
  units: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Sales Report ─────────────────────────────────────────────────────────

  async getSalesReport(from: Date, to: Date, groupBy: GroupBy = 'day') {
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: OrderStatus.CANCELLED },
      },
      include: { items: true },
    });

    const grouped = this.groupByPeriod(orders, groupBy);

    const totalRevenue = grouped.reduce((s, g) => s + g.revenue, 0);
    const totalOrders = grouped.reduce((s, g) => s + g.orders, 0);
    const totalUnits = grouped.reduce((s, g) => s + g.units, 0);

    return {
      period: { from, to, groupBy },
      summary: { totalRevenue, totalOrders, totalUnits },
      data: grouped,
    };
  }

  // ─── Inventory Report ─────────────────────────────────────────────────────

  async getInventoryReport(warehouseId?: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            costPrice: true,
          },
        },
        variant: {
          select: { id: true, sku: true, name: true, price: true, costPrice: true },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { availableQty: 'asc' },
    });

    const totalItems = items.length;
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
    const totalValue = items.reduce((s, i) => {
      const cost = Number(
        i.variant?.costPrice ?? i.product.costPrice ?? i.product.price,
      );
      return s + cost * i.quantity;
    }, 0);

    const lowStock = items.filter((i) => i.availableQty <= 5);

    return {
      summary: { totalItems, totalUnits, totalValue: +totalValue.toFixed(2) },
      lowStockCount: lowStock.length,
      items: items.map((i) => ({
        id: i.id,
        product: i.product,
        variant: i.variant,
        warehouse: i.warehouse,
        quantity: i.quantity,
        reservedQty: i.reservedQty,
        availableQty: i.availableQty,
        costPrice: Number(
          i.variant?.costPrice ?? i.product.costPrice ?? i.product.price,
        ),
        valuation: Number(
          i.variant?.costPrice ?? i.product.costPrice ?? i.product.price,
        ) * i.quantity,
        isLowStock: i.availableQty <= 5,
      })),
    };
  }

  // ─── Customer Report ──────────────────────────────────────────────────────

  async getCustomerReport(from: Date, to: Date) {
    const newCustomers = await this.prisma.user.count({
      where: { createdAt: { gte: from, lte: to }, role: 'CUSTOMER' },
    });

    const ordersInPeriod = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { not: OrderStatus.CANCELLED },
        userId: { not: null },
      },
      select: { userId: true, totalAmount: true },
    });

    // Customers who ordered before this period
    const usersWithPriorOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { lt: from },
        userId: { not: null },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const priorUserIds = new Set(usersWithPriorOrders.map((o) => o.userId));

    const customerSpend = ordersInPeriod.reduce(
      (acc, o) => {
        const uid = o.userId!;
        if (!acc[uid]) acc[uid] = 0;
        acc[uid] += Number(o.totalAmount);
        return acc;
      },
      {} as Record<string, number>,
    );

    const returningCount = Object.keys(customerSpend).filter((uid) =>
      priorUserIds.has(uid),
    ).length;

    const topCustomers = Object.entries(customerSpend)
      .map(([userId, spend]) => ({ userId, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);

    return {
      period: { from, to },
      newCustomers,
      returningCustomers: returningCount,
      totalActiveCustomers: Object.keys(customerSpend).length,
      topCustomers,
    };
  }

  // ─── Product Report ───────────────────────────────────────────────────────

  async getProductReport(from: Date, to: Date) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: from, lte: to },
          status: { not: OrderStatus.CANCELLED },
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    const productMap = orderItems.reduce(
      (acc, item) => {
        const key = item.productId;
        if (!acc[key]) {
          acc[key] = {
            productId: key,
            name: item.product.name,
            sku: item.product.sku ?? '',
            revenue: 0,
            unitsSold: 0,
            returnedQty: 0,
            orders: new Set<string>(),
          };
        }
        acc[key].revenue += Number(item.totalAmount);
        acc[key].unitsSold += item.quantity;
        acc[key].returnedQty += item.returnedQty;
        acc[key].orders.add(item.orderId);
        return acc;
      },
      {} as Record<string, any>,
    );

    const products = Object.values(productMap)
      .map((p: any) => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        revenue: +p.revenue.toFixed(2),
        unitsSold: p.unitsSold,
        returnedQty: p.returnedQty,
        returnRate: p.unitsSold > 0 ? +(p.returnedQty / p.unitsSold).toFixed(4) : 0,
        orderCount: p.orders.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      period: { from, to },
      topByRevenue: products.slice(0, 20),
      topByUnits: [...products].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 20),
      highestReturnRate: [...products]
        .filter((p) => p.returnRate > 0)
        .sort((a, b) => b.returnRate - a.returnRate)
        .slice(0, 10),
    };
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  async exportToCSV(type: string, filters: any): Promise<string> {
    const { from, to } = filters;
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    switch (type) {
      case 'sales': {
        const report = await this.getSalesReport(fromDate, toDate, filters.groupBy ?? 'day');
        const header = 'Date,Revenue,Orders,Units\n';
        const rows = report.data
          .map((r) => `${r.date},${r.revenue},${r.orders},${r.units}`)
          .join('\n');
        return header + rows;
      }
      case 'inventory': {
        const report = await this.getInventoryReport(filters.warehouseId);
        const header = 'Product,SKU,Warehouse,Quantity,Available,CostPrice,Valuation\n';
        const rows = report.items
          .map(
            (i) =>
              `"${i.product.name}","${i.product.sku ?? ''}","${i.warehouse.name}",${i.quantity},${i.availableQty},${i.costPrice},${i.valuation}`,
          )
          .join('\n');
        return header + rows;
      }
      case 'customers': {
        const report = await this.getCustomerReport(fromDate, toDate);
        const header = 'UserId,Spend\n';
        const rows = report.topCustomers.map((c) => `${c.userId},${c.spend}`).join('\n');
        return header + rows;
      }
      case 'products': {
        const report = await this.getProductReport(fromDate, toDate);
        const header = 'Product,SKU,Revenue,UnitsSold,ReturnRate\n';
        const rows = report.topByRevenue
          .map((p) => `"${p.name}","${p.sku}",${p.revenue},${p.unitsSold},${p.returnRate}`)
          .join('\n');
        return header + rows;
      }
      default:
        return 'type,error\nunknown,Unsupported report type';
    }
  }

  async exportToExcel(type: string, filters: any): Promise<Buffer> {
    const xlsx = require('xlsx');

    const { from, to } = filters;
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    let sheetData: any[] = [];
    let sheetName = type;

    switch (type) {
      case 'sales': {
        const report = await this.getSalesReport(fromDate, toDate, filters.groupBy ?? 'day');
        sheetData = report.data;
        break;
      }
      case 'inventory': {
        const report = await this.getInventoryReport(filters.warehouseId);
        sheetData = report.items.map((i) => ({
          Product: i.product.name,
          SKU: i.product.sku,
          Warehouse: i.warehouse.name,
          Quantity: i.quantity,
          Available: i.availableQty,
          CostPrice: i.costPrice,
          Valuation: i.valuation,
        }));
        break;
      }
      case 'customers': {
        const report = await this.getCustomerReport(fromDate, toDate);
        sheetData = report.topCustomers;
        break;
      }
      case 'products': {
        const report = await this.getProductReport(fromDate, toDate);
        sheetData = report.topByRevenue;
        break;
      }
      default:
        sheetData = [{ error: 'Unsupported report type' }];
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(sheetData);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private groupByPeriod(
    orders: Array<{ createdAt: Date; totalAmount: any; items: Array<{ quantity: number }> }>,
    groupBy: GroupBy,
  ): PeriodBucket[] {
    const bucketMap = new Map<string, PeriodBucket>();

    for (const order of orders) {
      const key = this.getPeriodKey(order.createdAt, groupBy);
      if (!bucketMap.has(key)) {
        bucketMap.set(key, { date: key, revenue: 0, orders: 0, units: 0 });
      }
      const bucket = bucketMap.get(key)!;
      bucket.revenue += Number(order.totalAmount);
      bucket.orders += 1;
      bucket.units += order.items.reduce((s, i) => s + i.quantity, 0);
    }

    return Array.from(bucketMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private getPeriodKey(date: Date, groupBy: GroupBy): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week': {
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return monday.toISOString().slice(0, 10);
      }
      case 'month':
        return d.toISOString().slice(0, 7);
    }
  }
}
