import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest) {
  const current = await getUserFromRequest(req);
  if (!current) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: current.sub } });
  if (!user) return unauthorized();

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
    },
  });
}
