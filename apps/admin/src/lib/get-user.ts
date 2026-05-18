import { NextRequest } from 'next/server';
import { verifyAccessToken, type JwtPayload } from './jwt';

export async function getUserFromRequest(req: NextRequest): Promise<JwtPayload | null> {
  const auth = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return await verifyAccessToken(auth.slice(7));
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
}
