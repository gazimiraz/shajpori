import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    todayOrders,
    yesterdayOrders,
    monthOrders,
    lastMonthOrders,
    totalProducts,
    totalCustomers,
    pendingOrders,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: monthStart } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: lastMonthStart, lt: monthStart } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.findMany({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  const todayRevenue = Number(todayOrders._sum.totalAmount ?? 0);
  const yesterdayRevenue = Number(yesterdayOrders._sum.totalAmount ?? 0);
  const monthRevenue = Number(monthOrders._sum.totalAmount ?? 0);
  const lastMonthRevenue = Number(lastMonthOrders._sum.totalAmount ?? 0);

  const growth = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return NextResponse.json({
    success: true,
    data: {
      today: {
        revenue: todayRevenue,
        orders: todayOrders._count,
      },
      month: {
        revenue: monthRevenue,
        orders: monthOrders._count,
      },
      growth: {
        revenue: growth(todayRevenue, yesterdayRevenue),
        orders: growth(todayOrders._count, yesterdayOrders._count),
        monthRevenue: growth(monthRevenue, lastMonthRevenue),
        monthOrders: growth(monthOrders._count, lastMonthOrders._count),
      },
      totals: {
        products: totalProducts,
        customers: totalCustomers,
        pendingOrders,
      },
      recentOrders,
    },
  });
}
