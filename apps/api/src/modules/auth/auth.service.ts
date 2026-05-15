import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL = 86400; // 24 hours
const PASSWORD_RESET_TTL = 3600; // 1 hour
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly usersService: UsersService,
  ) {}

  // ----------------------------------------------------------------
  // Validate user credentials (used by LocalStrategy)
  // ----------------------------------------------------------------
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...result } = user;
    return result;
  }

  // ----------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Please contact support.');
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requiresTwoFactor: true };
      }
      const isValidCode = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: dto.twoFactorCode,
        window: 2,
      });
      if (!isValidCode) {
        throw new UnauthorizedException('Invalid two-factor authentication code');
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis
    await this.redis.setEx(
      `refresh:${user.id}:${tokens.refreshToken}`,
      REFRESH_TOKEN_TTL,
      '1',
    );

    const { password: _p, twoFactorSecret: _s, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  // ----------------------------------------------------------------
  // Register
  // ----------------------------------------------------------------
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'CUSTOMER',
        isActive: true,
        isEmailVerified: false,
      },
    });

    // Send verification email token
    try {
      await this.sendVerificationEmail(user.id, user.email);
    } catch (err) {
      this.logger.error('Failed to send verification email', err);
    }

    const tokens = await this.generateTokens(user);
    const { password: _p, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  // ----------------------------------------------------------------
  // Refresh token
  // ----------------------------------------------------------------
  async refreshToken(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const key = `refresh:${payload.sub}:${token}`;
    const exists = await this.redis.exists(key);
    if (!exists) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate: delete old, issue new
    await this.redis.del(key);
    const tokens = await this.generateTokens(user);
    await this.redis.setEx(
      `refresh:${user.id}:${tokens.refreshToken}`,
      REFRESH_TOKEN_TTL,
      '1',
    );

    return tokens;
  }

  // ----------------------------------------------------------------
  // Logout
  // ----------------------------------------------------------------
  async logout(userId: string, refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.redis.del(`refresh:${userId}:${refreshToken}`);
    }
    // Invalidate all refresh tokens for this user (optional nuclear option)
    // await this.redis.flushPattern(`refresh:${userId}:*`);
  }

  // ----------------------------------------------------------------
  // Email verification
  // ----------------------------------------------------------------
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.redis.get(`email-verify:${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true, emailVerifiedAt: new Date() },
    });

    await this.redis.del(`email-verify:${token}`);
  }

  // ----------------------------------------------------------------
  // Forgot password
  // ----------------------------------------------------------------
  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) return;

    const token = uuidv4();
    await this.redis.setEx(`pwd-reset:${token}`, PASSWORD_RESET_TTL, user.id);

    // TODO: inject MailService and send email
    this.logger.log(`Password reset token for ${email}: ${token}`);
  }

  // ----------------------------------------------------------------
  // Reset password
  // ----------------------------------------------------------------
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const userId = await this.redis.get(`pwd-reset:${dto.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.redis.del(`pwd-reset:${dto.token}`);
    // Invalidate all refresh tokens after password reset
    await this.redis.flushPattern(`refresh:${userId}:*`);
  }

  // ----------------------------------------------------------------
  // 2FA - enable
  // ----------------------------------------------------------------
  async enable2FA(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const secret = speakeasy.generateSecret({
      name: `Shaj Ecom (${user.email})`,
      length: 32,
    });

    // Store secret temporarily in Redis until verified
    await this.redis.setEx(`2fa-setup:${userId}`, 600, secret.base32);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCodeUrl };
  }

  // ----------------------------------------------------------------
  // 2FA - verify & activate
  // ----------------------------------------------------------------
  async verify2FA(userId: string, code: string): Promise<void> {
    const secret = await this.redis.get(`2fa-setup:${userId}`);
    if (!secret) {
      throw new BadRequestException('2FA setup expired. Please start over.');
    }

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });

    await this.redis.del(`2fa-setup:${userId}`);
  }

  // ----------------------------------------------------------------
  // Get current user profile
  // ----------------------------------------------------------------
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        twoFactorEnabled: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------
  private async generateTokens(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = uuidv4();
    await this.redis.setEx(`email-verify:${token}`, EMAIL_VERIFY_TTL, userId);
    // TODO: inject MailService and send the actual email
    this.logger.log(`Email verification token for ${email}: ${token}`);
  }
}
