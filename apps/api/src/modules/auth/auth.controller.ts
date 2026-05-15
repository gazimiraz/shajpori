import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Auth } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ----------------------------------------------------------------
  // POST /auth/login
  // ----------------------------------------------------------------
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Returns access and refresh tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ----------------------------------------------------------------
  // POST /auth/register
  // ----------------------------------------------------------------
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiCreatedResponse({ description: 'Account created; returns tokens' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ----------------------------------------------------------------
  // POST /auth/refresh
  // ----------------------------------------------------------------
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiOkResponse({ description: 'Returns new access and refresh tokens' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // ----------------------------------------------------------------
  // POST /auth/logout
  // ----------------------------------------------------------------
  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    await this.authService.logout(userId, refreshToken);
    return { message: 'Logged out successfully' };
  }

  // ----------------------------------------------------------------
  // GET /auth/me
  // ----------------------------------------------------------------
  @Auth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // ----------------------------------------------------------------
  // POST /auth/verify-email
  // ----------------------------------------------------------------
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token from email' })
  async verifyEmail(@Body('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email verified successfully' };
  }

  // ----------------------------------------------------------------
  // POST /auth/forgot-password
  // ----------------------------------------------------------------
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  // ----------------------------------------------------------------
  // POST /auth/reset-password
  // ----------------------------------------------------------------
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token received via email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  // ----------------------------------------------------------------
  // POST /auth/2fa/enable
  // ----------------------------------------------------------------
  @Auth()
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable two-factor authentication – returns QR code' })
  async enable2FA(@CurrentUser('id') userId: string) {
    return this.authService.enable2FA(userId);
  }

  // ----------------------------------------------------------------
  // POST /auth/2fa/verify
  // ----------------------------------------------------------------
  @Auth()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code and activate 2FA for the account' })
  async verify2FA(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    await this.authService.verify2FA(userId, code);
    return { message: 'Two-factor authentication enabled successfully' };
  }

  // ----------------------------------------------------------------
  // GET /auth/google
  // ----------------------------------------------------------------
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 login flow' })
  googleAuth() {
    // Passport redirects automatically
  }

  // ----------------------------------------------------------------
  // GET /auth/google/callback
  // ----------------------------------------------------------------
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback handler' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    if (!user) {
      return res.redirect('/login?error=google_auth_failed');
    }
    const tokens = await this.authService.login({
      email: user.email,
      password: '', // Google users have no password; auth service handles this
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`,
    );
  }
}
