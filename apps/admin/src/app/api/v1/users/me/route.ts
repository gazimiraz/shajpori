import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest) {
  const current = await getUserFromRequest(req);
  if (!current) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: current.sub },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, status: true, avatarUrl: true, phone: true,
    },
  });
  if (!user) return unauthorized();
  return NextResponse.json({ success: true, data: user });
}

export async function PATCH(req: NextRequest) {
  const current = await getUserFromRequest(req);
  if (!current) return unauthorized();

  try {
    const body = await req.json();
    const { passwordHash, role, status, ...safeData } = body;
    const user = await prisma.user.update({ where: { id: current.sub }, data: safeData });
    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}
