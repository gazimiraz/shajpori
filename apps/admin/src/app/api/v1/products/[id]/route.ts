import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { include: { attributes: { include: { value: { include: { attribute: true } } } } } },
      brand: true,
    },
  });

  if (!product) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const product = await prisma.product.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data: product });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, message: 'Deleted' });
}
