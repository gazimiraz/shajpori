import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@shaj/database';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT', 'WAREHOUSE_MANAGER']);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findFirst({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (!ADMIN_ROLES.has(user.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Account is inactive' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId ?? undefined };
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatarUrl: user.avatarUrl,
          tenantId: user.tenantId,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
