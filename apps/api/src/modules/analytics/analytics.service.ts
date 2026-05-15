import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  RevenueChartPeriod,
  ChartGranularity,
  ExportReportDto,
  ExportFormat,
} from './dto/analytics-query.dto';
import * as ExcelJS from 'exceljs';

interface DateRange {
  from?: string;
  to?: string;
}

interface DashboardStatsOptions extends DateRange {
  storeId?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(storeId?: string, dateRange?: DateRange) {
    const cacheKey = `analytics:dashboard:${storeId ?? 'all'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const baseWhere = (from: Date, to: Date) => ({
      createdAt: { gte: from, lte: to },
      status: {
        notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] as OrderStatus[],
      },
      ...(storeId ? { storeId } : {}),
    });

    const [
      todayOrders,
      yesterdayOrders,
      monthOrders,
      lastMonthOrders,
      newCustomersToday,
      newCustomersMonth,
      totalCustomers,
      pendingOrders,
      lowStockCount,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: baseWhere(todayStart, now),
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: baseWhere(yesterdayStart, todayStart),
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: baseWhere(monthStart, now),
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: baseWhere(lastMonthStart, lastMonthEnd),
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: todayStart } },
      }),
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: monthStart } },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } },
      }),
      this.prisma.product.count({
        where: {
          stockQuantity: { gt: 0 },
          trackInventory: true,
        },
      }),
    ]);

    const todayRevenue = Number(todayOrders._sum.totalAmount ?? 0);
    const yesterdayRevenue = Number(yesterdayOrders._sum.totalAmount ?? 0);
    const monthRevenue = Number(monthOrders._sum.totalAmount ?? 0);
    const lastMonthRevenue = Number(lastMonthOrders._sum.totalAmount ?? 0);

    const revenueGrowth =
      yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;
    const monthGrowth =
      lastMonthRevenue > 0
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    const result = {
      today: {
        revenue: todayRevenue,
        orders: todayOrders._count,
        newCustomers: newCustomersToday,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      },
      yesterday: {
        revenue: yesterdayRevenue,
        orders: yesterdayOrders._count,
      },
      thisMonth: {
        revenue: monthRevenue,
        orders: monthOrders._count,
        newCustomers: newCustomersMonth,
        revenueGrowth: Math.round(monthGrowth * 100) / 100,
      },
      lastMonth: {
        revenue: lastMonthRevenue,
        orders: lastMonthOrders._count,
      },
      totals: {
        customers: totalCustomers,
        pendingOrders,
        lowStockProducts: lowStockCount,
      },
      generatedAt: now,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ─── Revenue Chart ────────────────────────────────────────────────────────

  async getRevenueChart(
    period: RevenueChartPeriod = RevenueChartPeriod.THIRTY_DAYS,
    granularity: ChartGranularity = ChartGranularity.DAY,
  ) {
    const cacheKey = `analytics:revenue:${period}:${granularity}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    let from: Date;
    switch (period) {
      case RevenueChartPeriod.SEVEN_DAYS:
        from = new Date(now.getTime() - 7 * 86400000);
        break;
      case RevenueChartPeriod.NINETY_DAYS:
        from = new Date(now.getTime() - 90 * 86400000);
        break;
      case RevenueChartPeriod.YEAR:
        from = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        from = new Date(now.getTime() - 30 * 86400000);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: now },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = this.buildTimeBuckets(from, now, granularity);
    const dataMap = new Map<string, { revenue: number; orders: number }>(
      buckets.map((b) => [b, { revenue: 0, orders: 0 }]),
    );

    for (const order of orders) {
      const key = this.getBucketKey(order.createdAt, granularity);
      const entry = dataMap.get(key);
      if (entry) {
        entry.revenue += Number(order.totalAmount);
        entry.orders += 1;
      }
    }

    const series = Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
    }));

    const result = { period, granularity, from, to: now, series };
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ─── Top Products ─────────────────────────────────────────────────────────

  async getTopProducts(limit = 10, dateRange?: DateRange) {
    const where: any = {};
    if (dateRange?.from || dateRange?.to) {
      where.order = { createdAt: {} };
      if (dateRange.from) where.order.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.order.createdAt.lte = new Date(dateRange.to);
    }

    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where,
      _sum: { totalAmount: true, quantity: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, price: true, images: { take: 1 } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return items.map((item) => ({
      product: productMap.get(item.productId),
      totalRevenue: Number(item._sum.totalAmount ?? 0),
      totalUnits: item._sum.quantity ?? 0,
      orderCount: item._count.id,
    }));
  }

  // ─── Top Categories ───────────────────────────────────────────────────────

  async getTopCategories(dateRange?: DateRange) {
    const orderWhere: any = {
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
    };
    if (dateRange?.from) orderWhere.createdAt = { gte: new Date(dateRange.from) };
    if (dateRange?.to) {
      orderWhere.createdAt = { ...orderWhere.createdAt, lte: new Date(dateRange.to) };
    }

    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: orderWhere },
      select: { productId: true, totalAmount: true, quantity: true },
    });

    const productIds = [...new Set(orderItems.map((i) => i.productId))];
    const productCategories = await this.prisma.productCategory.findMany({
      where: { productId: { in: productIds } },
      include: { category: { select: { id: true, name: true } } },
    });

    const catMap = new Map<string, { id: string; name: string; revenue: number; units: number }>();
    for (const oi of orderItems) {
      const cats = productCategories.filter((pc) => pc.productId === oi.productId);
      for (const pc of cats) {
        const key = pc.categoryId;
        if (!catMap.has(key)) {
          catMap.set(key, { id: pc.category.id, name: pc.category.name, revenue: 0, units: 0 });
        }
        const entry = catMap.get(key)!;
        entry.revenue += Number(oi.totalAmount);
        entry.units += oi.quantity;
      }
    }

    return Array.from(catMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }));
  }

  // ─── Top Customers ────────────────────────────────────────────────────────

  async getTopCustomers(limit = 10, dateRange?: DateRange) {
    const where: any = {
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      userId: { not: null },
    };
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const groups = await this.prisma.order.groupBy({
      by: ['userId'],
      where,
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const userIds = groups.map((g) => g.userId!).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, createdAt: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return groups.map((g) => ({
      user: userMap.get(g.userId!),
      totalRevenue: Number(g._sum.totalAmount ?? 0),
      orderCount: g._count.id,
    }));
  }

  // ─── Orders by Status ─────────────────────────────────────────────────────

  async getOrdersByStatus(dateRange?: DateRange) {
    const where: any = {};
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.id,
      total: Number(g._sum.totalAmount ?? 0),
    }));
  }

  // ─── Sales by Channel ─────────────────────────────────────────────────────

  async getSalesByChannel(dateRange?: DateRange) {
    const where: any = {
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
    };
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const groups = await this.prisma.order.groupBy({
      by: ['sourceChannel'],
      where,
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const total = groups.reduce((s, g) => s + Number(g._sum.totalAmount ?? 0), 0);

    return groups.map((g) => ({
      channel: g.sourceChannel,
      orders: g._count.id,
      revenue: Number(g._sum.totalAmount ?? 0),
      share: total > 0 ? Math.round((Number(g._sum.totalAmount ?? 0) / total) * 10000) / 100 : 0,
    }));
  }

  // ─── Conversion Funnel ────────────────────────────────────────────────────

  async getConversionFunnel(dateRange?: DateRange) {
    const where: any = {};
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const [productViews, cartCreations, checkoutStarts, completedOrders] = await Promise.all([
      this.prisma.productAnalytics.aggregate({
        where: dateRange?.from
          ? { date: { gte: new Date(dateRange.from), lte: dateRange.to ? new Date(dateRange.to) : undefined } }
          : {},
        _sum: { views: true, addToCart: true, purchases: true },
      }),
      this.prisma.order.count({ where: { ...where } }),
      this.prisma.order.count({
        where: {
          ...where,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
      }),
      this.prisma.order.count({
        where: {
          ...where,
          status: { in: [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING] },
        },
      }),
    ]);

    const views = Number(productViews._sum.views ?? 0);
    const addToCart = Number(productViews._sum.addToCart ?? 0);
    const checkouts = checkoutStarts;
    const purchases = completedOrders;

    return {
      funnel: [
        { stage: 'Product Views', count: views, rate: 100 },
        { stage: 'Add to Cart', count: addToCart, rate: views > 0 ? Math.round((addToCart / views) * 10000) / 100 : 0 },
        { stage: 'Checkout', count: checkouts, rate: addToCart > 0 ? Math.round((checkouts / addToCart) * 10000) / 100 : 0 },
        { stage: 'Purchase', count: purchases, rate: checkouts > 0 ? Math.round((purchases / checkouts) * 10000) / 100 : 0 },
      ],
      overallConversion: views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0,
    };
  }

  // ─── Customer Stats ───────────────────────────────────────────────────────

  async getCustomerStats(dateRange?: DateRange) {
    const where: any = {};
    if (dateRange?.from || dateRange?.to) {
      where.createdAt = {};
      if (dateRange.from) where.createdAt.gte = new Date(dateRange.from);
      if (dateRange.to) where.createdAt.lte = new Date(dateRange.to);
    }

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    const [newCustomers, returningOrders, churnedCount, totalCustomers] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER', ...where } }),
      this.prisma.order.groupBy({
        by: ['userId'],
        where: { userId: { not: null }, ...where },
        having: { userId: { _count: { gt: 1 } } },
        _count: { userId: true },
      }),
      this.prisma.user.count({
        where: {
          role: 'CUSTOMER',
          orders: { none: { createdAt: { gte: sixtyDaysAgo } } },
          createdAt: { lt: sixtyDaysAgo },
        },
      }),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    const returningCustomers = returningOrders.length;
    const churnRate = totalCustomers > 0 ? Math.round((churnedCount / totalCustomers) * 10000) / 100 : 0;

    return {
      newCustomers,
      returningCustomers,
      churnedCustomers: churnedCount,
      churnRate,
      totalCustomers,
    };
  }

  // ─── Inventory Stats ──────────────────────────────────────────────────────

  async getInventoryStats() {
    const cacheKey = 'analytics:inventory';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [totalItems, lowStockItems, outOfStockItems, inventoryValue] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.product.count({
        where: {
          trackInventory: true,
          stockQuantity: { gt: 0 },
          AND: [
            { stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold as any } },
          ],
        },
      }).catch(() =>
        this.prisma.inventoryItem.count({
          where: { quantity: { gt: 0, lte: 5 } },
        }),
      ),
      this.prisma.product.count({ where: { stockQuantity: 0 } }),
      this.prisma.inventoryItem.aggregate({
        _sum: {},
      }),
    ]);

    // Inventory value via raw aggregation
    const invValueResult = await this.prisma.$queryRaw<[{ total: number }]>`
      SELECT COALESCE(SUM(ii.quantity * COALESCE(ii."costPrice", p."costPrice", 0)), 0) AS total
      FROM inventory_items ii
      JOIN products p ON p.id = ii."productId"
    `;
    const inventoryTotalValue = Number(invValueResult[0]?.total ?? 0);

    const result = {
      totalItems,
      lowStockCount: lowStockItems,
      outOfStockCount: outOfStockItems,
      inventoryValue: inventoryTotalValue,
      generatedAt: new Date(),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ─── Product Performance ──────────────────────────────────────────────────

  async getProductPerformance(dateRange?: DateRange) {
    const where: any = {};
    if (dateRange?.from || dateRange?.to) {
      where.date = {};
      if (dateRange.from) where.date.gte = new Date(dateRange.from);
      if (dateRange.to) where.date.lte = new Date(dateRange.to);
    }

    const analytics = await this.prisma.productAnalytics.groupBy({
      by: ['productId'],
      where,
      _sum: { views: true, addToCart: true, purchases: true, revenue: true },
      orderBy: { _sum: { revenue: 'desc' } },
      take: 50,
    });

    const productIds = analytics.map((a) => a.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return analytics.map((a) => {
      const views = a._sum.views ?? 0;
      const addToCart = a._sum.addToCart ?? 0;
      const purchases = a._sum.purchases ?? 0;
      return {
        product: productMap.get(a.productId),
        views,
        addToCart,
        purchases,
        revenue: Number(a._sum.revenue ?? 0),
        cartRate: views > 0 ? Math.round((addToCart / views) * 10000) / 100 : 0,
        conversionRate: views > 0 ? Math.round((purchases / views) * 10000) / 100 : 0,
      };
    });
  }

  // ─── Hourly Heatmap ───────────────────────────────────────────────────────

  async getHourlyHeatmap(dateRange?: DateRange) {
    const from = dateRange?.from ? new Date(dateRange.from) : new Date(Date.now() - 30 * 86400000);
    const to = dateRange?.to ? new Date(dateRange.to) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      },
      select: { createdAt: true, totalAmount: true },
    });

    // Build 7 x 24 matrix (day-of-week x hour)
    const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

    for (const order of orders) {
      const dow = order.createdAt.getDay(); // 0=Sunday
      const hour = order.createdAt.getHours();
      matrix[dow][hour] += Number(order.totalAmount);
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      period: { from, to },
      heatmap: matrix.map((hours, dayIndex) => ({
        day: days[dayIndex],
        dayIndex,
        hours: hours.map((revenue, hour) => ({ hour, revenue: Math.round(revenue * 100) / 100 })),
      })),
    };
  }

  // ─── Export Report ────────────────────────────────────────────────────────

  async exportReport(dto: ExportReportDto): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 86400000);
    const to = dto.to ? new Date(dto.to) : new Date();
    const type = dto.type ?? 'sales';
    const format = dto.format ?? ExportFormat.CSV;

    let data: any[] = [];

    if (type === 'sales') {
      const orders = await this.prisma.order.findMany({
        where: {
          createdAt: { gte: from, lte: to },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      });
      data = orders.map((o) => ({
        OrderNumber: o.orderNumber,
        Date: o.createdAt.toISOString().split('T')[0],
        Status: o.status,
        Total: Number(o.totalAmount),
        Items: o.items.length,
      }));
    } else if (type === 'products') {
      data = await this.getTopProducts(100, { from: dto.from, to: dto.to });
    } else if (type === 'customers') {
      data = await this.getTopCustomers(100, { from: dto.from, to: dto.to });
    }

    if (format === ExportFormat.CSV) {
      const csv = this.buildCSV(data);
      return {
        buffer: Buffer.from(csv, 'utf-8'),
        mimeType: 'text/csv',
        filename: `${type}-report-${from.toISOString().split('T')[0]}.csv`,
      };
    }

    if (format === ExportFormat.EXCEL) {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(type);
      if (data.length > 0) {
        sheet.addRow(Object.keys(data[0]));
        data.forEach((row) => sheet.addRow(Object.values(row)));
      }
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `${type}-report-${from.toISOString().split('T')[0]}.xlsx`,
      };
    }

    // PDF fallback: return CSV with PDF mime (PDFKit integration expected externally)
    const csv = this.buildCSV(data);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      mimeType: 'application/pdf',
      filename: `${type}-report-${from.toISOString().split('T')[0]}.pdf`,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildTimeBuckets(from: Date, to: Date, granularity: ChartGranularity): string[] {
    const buckets: string[] = [];
    const current = new Date(from);

    while (current <= to) {
      buckets.push(this.getBucketKey(current, granularity));
      if (granularity === ChartGranularity.DAY) {
        current.setDate(current.getDate() + 1);
      } else if (granularity === ChartGranularity.WEEK) {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }
    return [...new Set(buckets)];
  }

  private getBucketKey(date: Date, granularity: ChartGranularity): string {
    if (granularity === ChartGranularity.DAY) {
      return date.toISOString().split('T')[0];
    }
    if (granularity === ChartGranularity.WEEK) {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().split('T')[0];
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private buildCSV(rows: any[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') ? `"${str}"` : str;
          })
          .join(','),
      ),
    ];
    return lines.join('\n');
  }
}
