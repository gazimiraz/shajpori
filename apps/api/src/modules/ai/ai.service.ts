import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrderStatus } from '@prisma/client';
import OpenAI from 'openai';

interface RFMScore {
  userId: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: number;
  segment: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  // ─── Sales Forecast ───────────────────────────────────────────────────────

  async getSalesForecast(days = 30): Promise<{
    method: string;
    forecastDays: number;
    predictions: Array<{ date: string; predicted: number; confidence: number }>;
    summary: { totalPredicted: number; avgDaily: number };
  }> {
    const cacheKey = `ai:forecast:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Gather last 90 days of daily revenue
    const historicalFrom = new Date(Date.now() - 90 * 86400000);
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: historicalFrom },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      },
      select: { createdAt: true, totalAmount: true },
    });

    // Aggregate by day
    const dayMap = new Map<string, number>();
    for (const order of orders) {
      const key = order.createdAt.toISOString().split('T')[0];
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(order.totalAmount));
    }

    const dailyRevenue = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    if (dailyRevenue.length === 0) {
      return {
        method: 'insufficient_data',
        forecastDays: days,
        predictions: [],
        summary: { totalPredicted: 0, avgDaily: 0 },
      };
    }

    // If OpenAI is available, use it; otherwise fall back to linear regression
    let predictions: Array<{ date: string; predicted: number; confidence: number }>;
    let method: string;

    if (this.openai && dailyRevenue.length >= 14) {
      try {
        predictions = await this.forecastWithOpenAI(dailyRevenue, days);
        method = 'openai_gpt';
      } catch (err) {
        this.logger.warn(`OpenAI forecast failed, falling back to regression: ${err.message}`);
        predictions = this.linearRegressionForecast(dailyRevenue, days);
        method = 'linear_regression_fallback';
      }
    } else {
      predictions = this.linearRegressionForecast(dailyRevenue, days);
      method = 'linear_regression';
    }

    const totalPredicted = predictions.reduce((s, p) => s + p.predicted, 0);
    const result = {
      method,
      forecastDays: days,
      predictions,
      summary: {
        totalPredicted: Math.round(totalPredicted * 100) / 100,
        avgDaily: Math.round((totalPredicted / days) * 100) / 100,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ─── Churn Risk ───────────────────────────────────────────────────────────

  async getChurnRisk(): Promise<{
    customers: Array<{
      userId: string;
      email: string;
      name: string;
      lastOrderDate: Date | null;
      daysSinceLastOrder: number;
      orderCount: number;
      lifetimeValue: number;
      churnRisk: 'high' | 'medium' | 'low';
    }>;
    summary: { high: number; medium: number; low: number };
  }> {
    const cacheKey = 'ai:churn_risk';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const now = new Date();

    const customers = await this.prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        orders: {
          some: {},
          none: { createdAt: { gte: sixtyDaysAgo } },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        orders: {
          select: { createdAt: true, totalAmount: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 500,
    });

    const result = customers.map((user) => {
      const orders = user.orders;
      const lastOrder = orders[0];
      const lastOrderDate = lastOrder?.createdAt ?? null;
      const daysSince = lastOrderDate
        ? Math.floor((now.getTime() - lastOrderDate.getTime()) / 86400000)
        : 999;
      const ltv = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

      let churnRisk: 'high' | 'medium' | 'low';
      if (daysSince > 90 || (daysSince > 60 && ltv < 1000)) {
        churnRisk = 'high';
      } else if (daysSince > 60) {
        churnRisk = 'medium';
      } else {
        churnRisk = 'low';
      }

      return {
        userId: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        lastOrderDate,
        daysSinceLastOrder: daysSince,
        orderCount: orders.length,
        lifetimeValue: Math.round(ltv * 100) / 100,
        churnRisk,
      };
    });

    const summary = {
      high: result.filter((c) => c.churnRisk === 'high').length,
      medium: result.filter((c) => c.churnRisk === 'medium').length,
      low: result.filter((c) => c.churnRisk === 'low').length,
    };

    const output = { customers: result.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder), summary };
    await this.redis.set(cacheKey, JSON.stringify(output), this.CACHE_TTL);
    return output;
  }

  // ─── Product Recommendations ──────────────────────────────────────────────

  async getProductRecommendations(
    userId?: string,
    productId?: string,
    limit = 10,
  ): Promise<{ products: any[]; method: string }> {
    const cacheKey = `ai:recs:${userId ?? 'anon'}:${productId ?? 'none'}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    let productIds: string[] = [];
    let method = 'popularity';

    if (productId) {
      // Item-based: find products frequently bought together
      const coOrders = await this.prisma.orderItem.findMany({
        where: {
          order: {
            items: { some: { productId } },
          },
          productId: { not: productId },
        },
        select: { productId: true },
      });
      const freq = new Map<string, number>();
      for (const oi of coOrders) {
        freq.set(oi.productId, (freq.get(oi.productId) ?? 0) + 1);
      }
      productIds = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([id]) => id);
      method = 'item_based_collaborative_filtering';
    } else if (userId) {
      // User-based: get categories/products from user's order history, find related popular products
      const userOrderItems = await this.prisma.orderItem.findMany({
        where: { order: { userId } },
        select: { productId: true },
      });
      const purchasedIds = new Set(userOrderItems.map((oi) => oi.productId));

      // Find popular products in same categories not yet purchased
      const purchasedCategories = await this.prisma.productCategory.findMany({
        where: { productId: { in: Array.from(purchasedIds) } },
        select: { categoryId: true },
      });
      const catIds = [...new Set(purchasedCategories.map((pc) => pc.categoryId))];

      const candidates = await this.prisma.product.findMany({
        where: {
          categories: { some: { categoryId: { in: catIds } } },
          id: { notIn: Array.from(purchasedIds) },
          status: 'ACTIVE',
        },
        orderBy: { salesCount: 'desc' },
        take: limit,
        select: { id: true },
      });
      productIds = candidates.map((p) => p.id);
      method = 'user_based_collaborative_filtering';
    }

    // Fallback: top sellers
    if (productIds.length < limit) {
      const topSellers = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          id: { notIn: productIds },
        },
        orderBy: { salesCount: 'desc' },
        take: limit - productIds.length,
        select: { id: true },
      });
      productIds = [...productIds, ...topSellers.map((p) => p.id)];
      if (method === 'popularity') method = 'popularity';
      else method = `${method}+popularity`;
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: { take: 1 }, categories: { include: { category: true } } },
    });

    // Preserve order
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = productIds.map((id) => productMap.get(id)).filter(Boolean);

    const result = { products: orderedProducts, method };
    await this.redis.set(cacheKey, JSON.stringify(result), 1800);
    return result;
  }

  // ─── Dead Stock ───────────────────────────────────────────────────────────

  async getDeadStock(threshold = 90): Promise<{
    products: Array<{
      productId: string;
      name: string;
      sku: string | null;
      stockQuantity: number;
      lastSaleDate: Date | null;
      daysSinceLastSale: number;
      inventoryValue: number;
    }>;
    totalInventoryValue: number;
    count: number;
  }> {
    const cacheKey = `ai:dead_stock:${threshold}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const cutoffDate = new Date(Date.now() - threshold * 86400000);

    const products = await this.prisma.product.findMany({
      where: {
        stockQuantity: { gt: 0 },
        status: 'ACTIVE',
        orderItems: {
          none: { order: { createdAt: { gte: cutoffDate } } },
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        costPrice: true,
        orderItems: {
          select: { order: { select: { createdAt: true } } },
          orderBy: { order: { createdAt: 'desc' } },
          take: 1,
        },
      },
    });

    const now = new Date();
    const result = products.map((p) => {
      const lastSaleDate = p.orderItems[0]?.order?.createdAt ?? null;
      const daysSince = lastSaleDate
        ? Math.floor((now.getTime() - lastSaleDate.getTime()) / 86400000)
        : threshold + 1;
      const inventoryValue = p.stockQuantity * Number(p.costPrice ?? 0);

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        lastSaleDate,
        daysSinceLastSale: daysSince,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
      };
    });

    const totalInventoryValue = result.reduce((s, p) => s + p.inventoryValue, 0);
    const output = {
      products: result.sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale),
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      count: result.length,
    };

    await this.redis.set(cacheKey, JSON.stringify(output), this.CACHE_TTL);
    return output;
  }

  // ─── Dynamic Pricing Insights ─────────────────────────────────────────────

  async getDynamicPricingInsights(productId: string): Promise<{
    productId: string;
    currentPrice: number;
    suggestedPrice: number;
    priceElasticity: number;
    recentSalesVelocity: number;
    competitorBenchmark: number | null;
    recommendation: string;
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, costPrice: true, salesCount: true },
    });
    if (!product) throw new Error(`Product ${productId} not found`);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    const [recentSales, olderSales] = await Promise.all([
      this.prisma.orderItem.aggregate({
        where: {
          productId,
          order: { createdAt: { gte: thirtyDaysAgo }, status: { notIn: [OrderStatus.CANCELLED] } },
        },
        _sum: { quantity: true, totalAmount: true },
      }),
      this.prisma.orderItem.aggregate({
        where: {
          productId,
          order: {
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            status: { notIn: [OrderStatus.CANCELLED] },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const recentUnits = recentSales._sum.quantity ?? 0;
    const olderUnits = olderSales._sum.quantity ?? 0;
    const velocity = recentUnits / 30; // units per day

    // Simple price elasticity estimate: (% change in quantity) / (% change in price)
    // Use a synthetic +5% price test assumption
    const priceElasticity = olderUnits > 0 && recentUnits > 0
      ? -Math.abs((recentUnits - olderUnits) / olderUnits) / 0.05
      : -1.2; // default elastic

    const currentPrice = Number(product.price);
    const costPrice = Number(product.costPrice ?? currentPrice * 0.6);

    let suggestedPrice: number;
    let recommendation: string;

    if (velocity > 5 && priceElasticity > -1) {
      // High demand, inelastic — can raise price
      suggestedPrice = Math.round(currentPrice * 1.05 * 100) / 100;
      recommendation = 'High demand detected. Consider a 5% price increase.';
    } else if (velocity < 0.5) {
      // Low velocity — discount to clear
      suggestedPrice = Math.max(
        Math.round(currentPrice * 0.9 * 100) / 100,
        Math.round(costPrice * 1.1 * 100) / 100,
      );
      recommendation = 'Low sales velocity. Consider a 10% discount to stimulate demand.';
    } else {
      suggestedPrice = currentPrice;
      recommendation = 'Current pricing appears optimal. Monitor weekly.';
    }

    return {
      productId,
      currentPrice,
      suggestedPrice,
      priceElasticity: Math.round(priceElasticity * 100) / 100,
      recentSalesVelocity: Math.round(velocity * 100) / 100,
      competitorBenchmark: null, // Would integrate external pricing API
      recommendation,
    };
  }

  // ─── Customer Segments (RFM) ──────────────────────────────────────────────

  async getCustomerSegments(): Promise<{
    segments: Array<{ name: string; count: number; avgLTV: number; description: string }>;
    customers: RFMScore[];
    generatedAt: Date;
  }> {
    const cacheKey = 'ai:rfm_segments';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const customers = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        orders: {
          where: { status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] } },
          select: { createdAt: true, totalAmount: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      take: 5000,
    });

    // Only customers who have ordered
    const active = customers.filter((c) => c.orders.length > 0);
    if (active.length === 0) {
      return { segments: [], customers: [], generatedAt: now };
    }

    const scored: Array<{
      userId: string;
      recencyDays: number;
      frequency: number;
      monetary: number;
    }> = active.map((c) => ({
      userId: c.id,
      recencyDays: Math.floor(
        (now.getTime() - c.orders[0].createdAt.getTime()) / 86400000,
      ),
      frequency: c.orders.length,
      monetary: c.orders.reduce((s, o) => s + Number(o.totalAmount), 0),
    }));

    // Quintile scoring (1-5) for each dimension
    const recencyValues = scored.map((s) => s.recencyDays).sort((a, b) => a - b);
    const freqValues = scored.map((s) => s.frequency).sort((a, b) => a - b);
    const monValues = scored.map((s) => s.monetary).sort((a, b) => a - b);

    const quintile = (val: number, sorted: number[]): number => {
      const pct = sorted.filter((v) => v <= val).length / sorted.length;
      return Math.ceil(pct * 5);
    };

    const rfmScores: RFMScore[] = scored.map((s) => {
      const r = 6 - quintile(s.recencyDays, recencyValues); // invert: lower days = higher score
      const f = quintile(s.frequency, freqValues);
      const m = quintile(s.monetary, monValues);
      const rfmScore = r * 100 + f * 10 + m;

      let segment: string;
      if (r >= 4 && f >= 4 && m >= 4) segment = 'Champions';
      else if (r >= 3 && f >= 3 && m >= 3) segment = 'Loyal Customers';
      else if (r >= 4 && f <= 2) segment = 'New Customers';
      else if (r >= 3 && m >= 4) segment = 'Potential Loyalists';
      else if (r <= 2 && f >= 3 && m >= 3) segment = 'At-Risk Customers';
      else if (r <= 2 && f <= 2) segment = 'Lost Customers';
      else if (m >= 4) segment = 'Big Spenders';
      else segment = 'Regular Customers';

      return { userId: s.userId, recency: r, frequency: f, monetary: m, rfmScore, segment };
    });

    const segmentNames = [
      'Champions',
      'Loyal Customers',
      'Potential Loyalists',
      'New Customers',
      'Big Spenders',
      'Regular Customers',
      'At-Risk Customers',
      'Lost Customers',
    ];

    const segmentDescriptions: Record<string, string> = {
      Champions: 'Buy often, recently, and spend the most',
      'Loyal Customers': 'Regular buyers with good order value',
      'Potential Loyalists': 'Recent buyers with high spend — build loyalty',
      'New Customers': 'Bought recently but infrequently — nurture them',
      'Big Spenders': 'High monetary value, irregular frequency',
      'Regular Customers': 'Average across all three dimensions',
      'At-Risk Customers': "Haven't purchased recently — win them back",
      'Lost Customers': 'Low recency, frequency, and spend',
    };

    const monetaryByUser = new Map(scored.map((s) => [s.userId, s.monetary]));

    const segments = segmentNames.map((name) => {
      const group = rfmScores.filter((r) => r.segment === name);
      const avgLTV =
        group.length > 0
          ? group.reduce((s, r) => s + (monetaryByUser.get(r.userId) ?? 0), 0) / group.length
          : 0;
      return {
        name,
        count: group.length,
        avgLTV: Math.round(avgLTV * 100) / 100,
        description: segmentDescriptions[name] ?? '',
      };
    });

    const output = { segments, customers: rfmScores, generatedAt: now };
    await this.redis.set(cacheKey, JSON.stringify(output), this.CACHE_TTL);
    return output;
  }

  // ─── NLP Query ────────────────────────────────────────────────────────────

  async getNLPQuery(query: string): Promise<{ query: string; intent: string; result: any }> {
    const lower = query.toLowerCase();
    let intent = 'unknown';
    let result: any = null;

    // Pattern matching first (fast path)
    if (/low.*(stock|inventory)|out of stock/i.test(lower)) {
      intent = 'inventory_stats';
      result = await this.getDeadStock();
    } else if (/dead.?stock|slow.?moving/i.test(lower)) {
      intent = 'dead_stock';
      const match = lower.match(/(\d+)\s*days?/);
      result = await this.getDeadStock(match ? parseInt(match[1]) : 90);
    } else if (/churn|at.?risk|lapsed/i.test(lower)) {
      intent = 'churn_risk';
      result = await this.getChurnRisk();
    } else if (/forecast|predict|next.*days/i.test(lower)) {
      intent = 'sales_forecast';
      const match = lower.match(/(\d+)\s*days?/);
      result = await this.getSalesForecast(match ? parseInt(match[1]) : 30);
    } else if (/segment|rfm/i.test(lower)) {
      intent = 'customer_segments';
      result = await this.getCustomerSegments();
    } else if (/recommend/i.test(lower)) {
      intent = 'recommendations';
      result = await this.getProductRecommendations(undefined, undefined, 10);
    } else if (/insight|alert|anomal/i.test(lower)) {
      intent = 'ai_insights';
      result = await this.getAIInsights();
    } else if (this.openai) {
      // Fall back to OpenAI for complex queries
      try {
        intent = 'openai_interpreted';
        result = await this.interpretWithOpenAI(query);
      } catch (err) {
        this.logger.error(`OpenAI NLP failed: ${err.message}`);
        intent = 'unrecognised';
        result = { message: 'Query not recognised. Try: forecast, dead stock, churn, segments, insights.' };
      }
    } else {
      intent = 'unrecognised';
      result = { message: 'Query not recognised. Try: forecast, dead stock, churn, segments, insights.' };
    }

    return { query, intent, result };
  }

  // ─── AI Insights ──────────────────────────────────────────────────────────

  async getAIInsights(): Promise<{
    insights: Array<{
      type: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      description: string;
      data?: any;
    }>;
    generatedAt: Date;
  }> {
    const cacheKey = 'ai:insights';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const insights: Array<{
      type: string;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      description: string;
      data?: any;
    }> = [];

    // 1. Low stock alert
    const lowStockCount = await this.prisma.product.count({
      where: {
        status: 'ACTIVE',
        trackInventory: true,
        stockQuantity: { gt: 0, lte: 5 },
      },
    });
    if (lowStockCount > 0) {
      insights.push({
        type: 'low_stock',
        severity: lowStockCount > 20 ? 'critical' : 'warning',
        title: `${lowStockCount} products with low stock`,
        description: `${lowStockCount} active products have 5 or fewer units remaining.`,
        data: { count: lowStockCount },
      });
    }

    // 2. Dead stock
    const deadStock = await this.getDeadStock(90);
    if (deadStock.count > 0) {
      insights.push({
        type: 'dead_stock',
        severity: 'warning',
        title: `${deadStock.count} dead-stock products`,
        description: `${deadStock.count} products have not sold in 90+ days. Tied-up inventory value: ${deadStock.totalInventoryValue}.`,
        data: { count: deadStock.count, value: deadStock.totalInventoryValue },
      });
    }

    // 3. Revenue anomaly — compare last 7 days vs prior 7 days
    const now = new Date();
    const last7Start = new Date(now.getTime() - 7 * 86400000);
    const prior7Start = new Date(now.getTime() - 14 * 86400000);

    const [last7, prior7] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: last7Start },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: prior7Start, lt: last7Start },
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const last7Rev = Number(last7._sum.totalAmount ?? 0);
    const prior7Rev = Number(prior7._sum.totalAmount ?? 0);
    if (prior7Rev > 0) {
      const change = ((last7Rev - prior7Rev) / prior7Rev) * 100;
      if (change < -20) {
        insights.push({
          type: 'revenue_anomaly',
          severity: 'critical',
          title: `Revenue dropped ${Math.abs(Math.round(change))}% vs last week`,
          description: `Last 7 days revenue (${Math.round(last7Rev)}) is significantly lower than prior 7 days (${Math.round(prior7Rev)}).`,
          data: { last7Rev, prior7Rev, changePercent: Math.round(change * 100) / 100 },
        });
      } else if (change > 30) {
        insights.push({
          type: 'revenue_spike',
          severity: 'info',
          title: `Revenue up ${Math.round(change)}% vs last week`,
          description: `Strong sales momentum detected.`,
          data: { last7Rev, prior7Rev, changePercent: Math.round(change * 100) / 100 },
        });
      }
    }

    // 4. Churn risk
    const churnData = await this.getChurnRisk();
    if (churnData.summary.high > 0) {
      insights.push({
        type: 'churn_risk',
        severity: churnData.summary.high > 50 ? 'critical' : 'warning',
        title: `${churnData.summary.high} customers at high churn risk`,
        description: `These customers have not ordered in 90+ days.`,
        data: { ...churnData.summary },
      });
    }

    // 5. Pending orders
    const pendingCount = await this.prisma.order.count({
      where: { status: OrderStatus.PENDING },
    });
    if (pendingCount > 50) {
      insights.push({
        type: 'pending_orders',
        severity: 'warning',
        title: `${pendingCount} orders awaiting confirmation`,
        description: 'High number of unconfirmed orders may indicate a processing bottleneck.',
        data: { count: pendingCount },
      });
    }

    // Persist insights to DB for history
    await this.prisma.aIInsight.createMany({
      data: insights.map((i) => ({
        type: i.type,
        title: i.title,
        description: i.description,
        data: i.data ?? {},
        confidence: 0.8,
        expiresAt: new Date(Date.now() + 24 * 3600000),
      })),
      skipDuplicates: false,
    }).catch(() => {}); // non-blocking

    const output = { insights, generatedAt: now };
    await this.redis.set(cacheKey, JSON.stringify(output), 3600);
    return output;
  }

  // ─── Best Seller Predictions ──────────────────────────────────────────────

  async getBestSellerPredictions(
    categoryId?: string,
    limit = 20,
  ): Promise<{
    products: Array<{
      productId: string;
      name: string;
      score: number;
      factors: { salesVelocity: number; trendScore: number; stockAvailability: number; rating: number };
    }>;
  }> {
    const cacheKey = `ai:bestsellers:${categoryId ?? 'all'}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);

    const productFilter: any = { status: 'ACTIVE', stockQuantity: { gt: 0 } };
    if (categoryId) {
      productFilter.categories = { some: { categoryId } };
    }

    const products = await this.prisma.product.findMany({
      where: productFilter,
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
        rating: true,
        salesCount: true,
      },
      take: 200,
    });

    const productIds = products.map((p) => p.id);

    const [recentSales, olderSales] = await Promise.all([
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          order: { createdAt: { gte: thirtyDaysAgo } },
        },
        _sum: { quantity: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          order: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        },
        _sum: { quantity: true },
      }),
    ]);

    const recentMap = new Map(recentSales.map((r) => [r.productId, r._sum.quantity ?? 0]));
    const olderMap = new Map(olderSales.map((r) => [r.productId, r._sum.quantity ?? 0]));

    const scored = products.map((p) => {
      const recent = recentMap.get(p.id) ?? 0;
      const older = olderMap.get(p.id) ?? 1;
      const velocity = recent / 30; // units/day
      const trendScore = older > 0 ? Math.min((recent - older) / older, 2) : 0;
      const stockScore = Math.min(p.stockQuantity / Math.max(p.lowStockThreshold, 10), 1);
      const ratingScore = Number(p.rating) / 5;

      // Weighted composite score
      const score =
        velocity * 0.4 +
        Math.max(trendScore, 0) * 0.3 +
        stockScore * 0.1 +
        ratingScore * 0.2;

      return {
        productId: p.id,
        name: p.name,
        score: Math.round(score * 1000) / 1000,
        factors: {
          salesVelocity: Math.round(velocity * 100) / 100,
          trendScore: Math.round(trendScore * 100) / 100,
          stockAvailability: Math.round(stockScore * 100) / 100,
          rating: Number(p.rating),
        },
      };
    });

    const result = {
      products: scored.sort((a, b) => b.score - a.score).slice(0, limit),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ─── Customer Lifetime Value ──────────────────────────────────────────────

  async getCustomerLifetimeValue(userId: string): Promise<{
    userId: string;
    historicalLTV: number;
    predictedLTV: number;
    avgOrderValue: number;
    orderFrequencyPerMonth: number;
    predictedLifespanMonths: number;
    segment: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true },
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.FAILED] },
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    if (orders.length === 0) {
      return {
        userId,
        historicalLTV: 0,
        predictedLTV: 0,
        avgOrderValue: 0,
        orderFrequencyPerMonth: 0,
        predictedLifespanMonths: 0,
        segment: 'Inactive',
      };
    }

    const historicalLTV = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const avgOrderValue = historicalLTV / orders.length;
    const accountAgeMonths = Math.max(
      1,
      (Date.now() - user.createdAt.getTime()) / (30 * 86400000),
    );
    const orderFrequencyPerMonth = orders.length / accountAgeMonths;

    // Standard CLV formula: CLV = AOV × frequency × predicted_lifespan
    // Predicted lifespan based on recency
    const daysSinceLastOrder = Math.floor(
      (Date.now() - orders[orders.length - 1].createdAt.getTime()) / 86400000,
    );
    const predictedLifespanMonths = daysSinceLastOrder < 30 ? 24 : daysSinceLastOrder < 90 ? 12 : 6;
    const predictedLTV = avgOrderValue * orderFrequencyPerMonth * predictedLifespanMonths;

    let segment: string;
    if (predictedLTV > 50000) segment = 'VIP';
    else if (predictedLTV > 20000) segment = 'High Value';
    else if (predictedLTV > 5000) segment = 'Medium Value';
    else segment = 'Low Value';

    return {
      userId,
      historicalLTV: Math.round(historicalLTV * 100) / 100,
      predictedLTV: Math.round(predictedLTV * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      orderFrequencyPerMonth: Math.round(orderFrequencyPerMonth * 100) / 100,
      predictedLifespanMonths,
      segment,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private linearRegressionForecast(
    historicalData: number[],
    days: number,
  ): Array<{ date: string; predicted: number; confidence: number }> {
    const n = historicalData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = historicalData.reduce((s, v) => s + v, 0);
    const sumXY = historicalData.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = historicalData.reduce((s, _, i) => s + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const avgActual = sumY / n;
    const ssTot = historicalData.reduce((s, v) => s + Math.pow(v - avgActual, 2), 0);
    const ssRes = historicalData.reduce(
      (s, v, i) => s + Math.pow(v - (intercept + slope * i), 2),
      0,
    );
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const confidence = Math.max(0, Math.min(r2, 0.99));

    const predictions: Array<{ date: string; predicted: number; confidence: number }> = [];
    for (let d = 0; d < days; d++) {
      const predicted = Math.max(0, intercept + slope * (n + d));
      const date = new Date(Date.now() + d * 86400000).toISOString().split('T')[0];
      predictions.push({ date, predicted: Math.round(predicted * 100) / 100, confidence });
    }
    return predictions;
  }

  private async forecastWithOpenAI(
    historicalData: number[],
    days: number,
  ): Promise<Array<{ date: string; predicted: number; confidence: number }>> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const prompt = `You are a sales forecasting assistant. Given daily revenue data for the last ${historicalData.length} days:
${historicalData.slice(-30).join(', ')}
Forecast the next ${days} days of revenue. Return a JSON array of objects with keys: date (YYYY-MM-DD), predicted (number), confidence (0-1). Start from ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}. Only return valid JSON, no explanation.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? '[]';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  private async interpretWithOpenAI(query: string): Promise<any> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const prompt = `You are an eCommerce analytics assistant for Shaj Ecom. The user asked: "${query}".
Available data endpoints: sales_forecast(days), churn_risk, dead_stock(threshold), customer_segments, product_recommendations, ai_insights.
Determine which endpoint best answers this query and respond with a JSON object: { "endpoint": "<name>", "params": {}, "explanation": "..." }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content ?? '{}';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Execute the recommended endpoint
    switch (parsed.endpoint) {
      case 'sales_forecast':
        return this.getSalesForecast(parsed.params?.days ?? 30);
      case 'churn_risk':
        return this.getChurnRisk();
      case 'dead_stock':
        return this.getDeadStock(parsed.params?.threshold ?? 90);
      case 'customer_segments':
        return this.getCustomerSegments();
      case 'product_recommendations':
        return this.getProductRecommendations(
          parsed.params?.userId,
          parsed.params?.productId,
          parsed.params?.limit ?? 10,
        );
      case 'ai_insights':
        return this.getAIInsights();
      default:
        return parsed;
    }
  }
}
