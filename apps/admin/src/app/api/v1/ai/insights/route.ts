import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, unauthorized } from '@/lib/get-user';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return unauthorized();

  return NextResponse.json({ success: true, data: [] });
}
