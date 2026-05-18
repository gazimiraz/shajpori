import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  const category = await prisma.category.findUnique({
    where: { id: params.id },
    include: { children: true, parent: true },
  });
  if (!category) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: category });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const category = await prisma.category.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data: category });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true, message: 'Deleted' });
}
