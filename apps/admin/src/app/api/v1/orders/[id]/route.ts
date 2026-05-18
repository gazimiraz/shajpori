import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      items: { include: { product: { select: { name: true, images: { take: 1 } } }, variant: true } },
      shippingAddress: true,
      payments: true,
      shipments: true,
    },
  });

  if (!order) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const order = await prisma.order.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data: order });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
