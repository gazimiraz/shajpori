import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const days = 30;
  const start = new Date();
  start.setDate(start.getDate() - days);

  const orders = await prisma.order.groupBy({
    by: ['createdAt'],
    where: { createdAt: { gte: start } },
    _sum: { totalAmount: true },
    _count: true,
  });

  return NextResponse.json({ success: true, data: orders });
}
