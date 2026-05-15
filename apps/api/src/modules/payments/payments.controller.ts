import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Auth } from '../../common/decorators/auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNumber, IsOptional, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateStripeIntentDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

class ConfirmStripeDto {
  @ApiProperty()
  @IsString()
  paymentIntentId: string;

  @ApiProperty()
  @IsString()
  orderId: string;
}

class CreateBkashDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

class VerifyBkashDto {
  @ApiProperty()
  @IsString()
  paymentId: string;

  @ApiProperty()
  @IsString()
  orderId: string;
}

class CreateNagadDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

class RefundDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsString()
  reason: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Stripe ───────────────────────────────────────────────────────────────

  @Post('stripe/intent')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe payment intent' })
  createStripeIntent(@Body() dto: CreateStripeIntentDto) {
    return this.paymentsService.createStripeIntent(dto.orderId, dto.amount);
  }

  @Post('stripe/confirm')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm Stripe payment after client-side completion' })
  confirmStripePayment(@Body() dto: ConfirmStripeDto) {
    return this.paymentsService.confirmStripePayment(
      dto.paymentIntentId,
      dto.orderId,
    );
  }

  // ─── bKash ────────────────────────────────────────────────────────────────

  @Post('bkash/create')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate bKash payment' })
  createBkashPayment(@Body() dto: CreateBkashDto) {
    return this.paymentsService.createBkashPayment(dto.orderId, dto.amount);
  }

  @Post('bkash/verify')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify bKash payment after callback' })
  verifyBkashPayment(@Body() dto: VerifyBkashDto) {
    return this.paymentsService.verifyBkashPayment(dto.paymentId, dto.orderId);
  }

  // ─── Nagad ────────────────────────────────────────────────────────────────

  @Post('nagad/create')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Nagad payment' })
  createNagadPayment(@Body() dto: CreateNagadDto) {
    return this.paymentsService.createNagadPayment(dto.orderId, dto.amount);
  }

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  @Post('webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint (public)' })
  handleStripeWebhook(@Body() payload: any, @Headers() headers: any) {
    return this.paymentsService.handleWebhook('stripe', payload, headers);
  }

  @Post('webhooks/bkash')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'bKash webhook/callback endpoint (public)' })
  handleBkashWebhook(@Body() payload: any, @Headers() headers: any) {
    return this.paymentsService.handleWebhook('bkash', payload, headers);
  }

  // ─── History & Stats ──────────────────────────────────────────────────────

  @Get('history/:orderId')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history for an order' })
  @ApiParam({ name: 'orderId' })
  getPaymentHistory(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentHistory(orderId);
  }

  @Post(':id/refund')
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment (Admin only)' })
  @ApiParam({ name: 'id' })
  refundPayment(@Param('id') id: string, @Body() dto: RefundDto) {
    return this.paymentsService.refundPayment(id, dto.amount, dto.reason);
  }

  @Get('stats')
  @Auth('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payment statistics grouped by method (Admin only)' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getPaymentStats(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.paymentsService.getPaymentStats(new Date(from), new Date(to));
  }
}
