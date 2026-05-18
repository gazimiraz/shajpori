import { SignJWT, jwtVerify } from 'jose';

const accessSecret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'shaj-access-secret-change-me');
const refreshSecret = () => new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'shaj-refresh-secret-change-me');

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId?: string;
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(accessSecret());
}

export async function signRefreshToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(refreshSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, accessSecret());
  return payload as unknown as JwtPayload;
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, refreshSecret());
  return payload as unknown as JwtPayload;
}
