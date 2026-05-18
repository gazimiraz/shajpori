import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ success: false, message: 'Refresh token required' }, { status: 400 });
    }

    const payload = await verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId ?? undefined };
    const [newAccess, newRefresh] = await Promise.all([
      signAccessToken(tokenPayload),
      signRefreshToken(tokenPayload),
    ]);

    return NextResponse.json({
      success: true,
      data: { accessToken: newAccess, refreshToken: newRefresh },
    });
  } catch (err) {
    console.error('[auth/refresh]', err);
    return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
  }
}
