import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod, PaymentStatus, AccountType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── Stripe ───────────────────────────────────────────────────────────────

  async createStripeIntent(orderId: string, amount: number) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');

    if (secretKey) {
      try {
        // Dynamic import to avoid hard dependency
        const Stripe = require('stripe');
        const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // stripe uses cents
          currency: 'bdt',
          metadata: { orderId },
        });
        return { clientSecret: intent.client_secret, id: intent.id };
      } catch (err) {
        this.logger.warn(`Stripe intent creation failed: ${err.message} — using mock`);
      }
    }

    // Mock fallback
    const mockId = `pi_mock_${Date.now()}`;
    this.logger.log('Using mock Stripe intent (STRIPE_SECRET_KEY not configured)');
    return { clientSecret: `${mockId}_secret`, id: mockId };
  }

  async confirmStripePayment(paymentIntentId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        amount: order.totalAmount,
        transactionId: paymentIntentId,
        paidAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.COMPLETED },
    });

    this.logger.log(`Stripe payment confirmed for order ${orderId}`);
    return { success: true, orderId, paymentIntentId };
  }

  // ─── bKash ────────────────────────────────────────────────────────────────

  async createBkashPayment(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Mock bKash payment URL
    const paymentId = `bkash_${Date.now()}`;
    this.logger.log(`bKash mock payment created for order ${orderId}: ${paymentId}`);

    return {
      paymentID: paymentId,
      bkashURL: `https://sandbox.payment.bkash.com/?paymentId=${paymentId}&amount=${amount}`,
      callbackURL: `/payments/bkash/verify`,
      successCallbackURL: `/payments/bkash/verify?status=success&paymentId=${paymentId}`,
      failureCallbackURL: `/payments/bkash/verify?status=failure&paymentId=${paymentId}`,
      cancelledCallbackURL: `/payments/bkash/verify?status=cancel&paymentId=${paymentId}`,
      amount: amount.toString(),
      intent: 'sale',
      currency: 'BDT',
    };
  }

  async verifyBkashPayment(paymentId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Mock verification — in production query bKash execute API
    await this.prisma.payment.create({
      data: {
        orderId,
        method: PaymentMethod.BKASH,
        status: PaymentStatus.COMPLETED,
        amount: order.totalAmount,
        transactionId: paymentId,
        paidAt: new Date(),
        gatewayResponse: { provider: 'bkash', paymentId, verified: true },
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatus.COMPLETED },
    });

    this.logger.log(`bKash payment verified for order ${orderId}`);
    return { success: true, orderId, paymentId, provider: 'bkash' };
  }

  // ─── Nagad ────────────────────────────────────────────────────────────────

  async createNagadPayment(orderId: string, amount: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const paymentRef = `nagad_${Date.now()}`;
    this.logger.log(`Nagad mock payment created for order ${orderId}: ${paymentRef}`);

    return {
      paymentReferenceId: paymentRef,
      redirectURL: `https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs/check-out/initialize/${paymentRef}`,
      amount,
      currency: 'BDT',
      orderId,
    };
  }

  async verifyNagadPayment(data: any) {
    const { orderId, paymentRef } = data;

    if (orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (order) {
        await this.prisma.payment.create({
          data: {
            orderId,
            method: PaymentMethod.NAGAD,
            status: PaymentStatus.COMPLETED,
            amount: order.totalAmount,
            transactionId: paymentRef ?? `nagad_verify_${Date.now()}`,
            paidAt: new Date(),
            gatewayResponse: data,
          },
        });

        await this.prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
      }
    }

    this.logger.log(`Nagad payment verified: ${JSON.stringify(data)}`);
    return { success: true, data };
  }

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  async handleWebhook(provider: string, payload: any, headers: any) {
    this.logger.log(
      `Webhook received from ${provider}: ${JSON.stringify(payload).slice(0, 200)}`,
    );

    try {
      switch (provider.toLowerCase()) {
        case 'stripe': {
          const eventType = payload?.type;
          if (eventType === 'payment_intent.succeeded') {
            const pi = payload.data?.object;
            if (pi?.metadata?.orderId) {
              await this.confirmStripePayment(pi.id, pi.metadata.orderId);
            }
          }
          break;
        }
        case 'bkash': {
          if (payload?.statusCode === '0000' && payload?.orderId) {
            await this.verifyBkashPayment(payload.paymentID, payload.orderId);
          }
          break;
        }
        default:
          this.logger.warn(`Unknown webhook provider: ${provider}`);
      }
    } catch (err) {
      this.logger.error(`Webhook processing error for ${provider}: ${err.message}`);
    }

    return { received: true };
  }

  // ─── Refunds ──────────────────────────────────────────────────────────────

  async refundPayment(paymentId: string, amount: number, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Payment ${paymentId} is not in COMPLETED status`);
    }

    const refundableAmount = Number(payment.amount) - Number(payment.refundedAmount);
    if (amount > refundableAmount) {
      throw new BadRequestException(
        `Refund amount ${amount} exceeds refundable balance ${refundableAmount}`,
      );
    }

    const newRefundedAmount = Number(payment.refundedAmount) + amount;
    const isFullRefund = newRefundedAmount >= Number(payment.amount) - 0.005;

    const [updatedPayment] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: newRefundedAmount,
          status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        },
      }),
      this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: isFullRefund
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED,
        },
      }),
    ]);

    // Create journal entry for refund
    await this.createRefundJournalEntry(payment.orderId, amount, reason);

    this.logger.log(`Refund of ${amount} processed for payment ${paymentId}`);
    return { payment: updatedPayment, refundedAmount: amount, reason };
  }

  // ─── History & Stats ──────────────────────────────────────────────────────

  async getPaymentHistory(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPaymentStats(from: Date, to: Date) {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        paidAt: { gte: from, lte: to },
      },
      select: { method: true, amount: true },
    });

    const byMethod = payments.reduce(
      (acc, p) => {
        const key = p.method as string;
        if (!acc[key]) acc[key] = { method: key, count: 0, total: 0 };
        acc[key].count++;
        acc[key].total += Number(p.amount);
        return acc;
      },
      {} as Record<string, { method: string; count: number; total: number }>,
    );

    const totalRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      period: { from, to },
      totalRevenue,
      totalTransactions: payments.length,
      byMethod: Object.values(byMethod),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async createRefundJournalEntry(
    orderId: string,
    amount: number,
    reason: string,
  ) {
    try {
      // Find or create key accounts
      const [cashAcc, revenueAcc] = await Promise.all([
        this.findOrCreateAccount('1001', 'Cash', AccountType.ASSET),
        this.findOrCreateAccount('4001', 'Sales Revenue', AccountType.REVENUE),
      ]);

      const seq = Date.now();
      await this.prisma.journalEntry.create({
        data: {
          entryNumber: `JE-REFUND-${seq}`,
          date: new Date(),
          description: `Refund for order ${orderId}: ${reason}`,
          referenceType: 'REFUND',
          referenceId: orderId,
          status: 'POSTED' as any,
          postedAt: new Date(),
          lines: {
            create: [
              { accountId: revenueAcc.id, debit: amount, credit: 0 },
              { accountId: cashAcc.id, debit: 0, credit: amount },
            ],
          },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to create refund journal entry: ${err.message}`);
    }
  }

  private async findOrCreateAccount(
    code: string,
    name: string,
    type: AccountType,
  ) {
    let account = await this.prisma.accountChart.findUnique({ where: { code } });
    if (!account) {
      account = await this.prisma.accountChart.create({
        data: { code, name, type, isSystem: true, isActive: true },
      });
    }
    return account;
  }
}
