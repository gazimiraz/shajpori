import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, UserStatus } from '@prisma/client';

interface NotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(
    userId: string,
    type: string,
    title: string,
    message: string,
    data?: any,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        metadata: data ?? {},
      },
    });
  }

  async getByUser(userId: string, filters: NotificationFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (filters.isRead !== undefined) where.isRead = filters.isRead;

    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    if (notification.userId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    if (notification.userId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return this.prisma.notification.delete({ where: { id } });
  }

  // ─── Email ────────────────────────────────────────────────────────────────

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');
    const smtpPort = this.config.get<number>('SMTP_PORT', 587);
    const fromEmail = this.config.get<string>('SMTP_FROM', 'noreply@shaj.com');

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: fromEmail,
          to,
          subject,
          html,
        });
        this.logger.log(`Email sent to ${to}: ${subject}`);
      } catch (err) {
        this.logger.error(`Email send failed to ${to}: ${err.message}`);
      }
    } else {
      // Graceful fallback — log to console
      this.logger.log(
        `[EMAIL FALLBACK] To: ${to} | Subject: ${subject} | HTML: ${html.slice(0, 100)}...`,
      );
    }
  }

  // ─── SMS ──────────────────────────────────────────────────────────────────

  async sendSMS(phone: string, message: string): Promise<void> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromPhone = this.config.get<string>('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && fromPhone) {
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        await client.messages.create({ body: message, from: fromPhone, to: phone });
        this.logger.log(`SMS sent to ${phone}`);
      } catch (err) {
        this.logger.error(`SMS send failed to ${phone}: ${err.message}`);
      }
    } else {
      // Graceful fallback — log to console
      this.logger.log(`[SMS FALLBACK] To: ${phone} | Message: ${message}`);
    }
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────

  async broadcastToAll(title: string, message: string, type: string) {
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true },
    });

    const BATCH_SIZE = 500;
    let created = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const result = await this.prisma.notification.createMany({
        data: batch.map((u) => ({
          userId: u.id,
          type: type as NotificationType,
          title,
          message,
          metadata: {},
        })),
        skipDuplicates: true,
      });
      created += result.count;
    }

    this.logger.log(`Broadcast notification sent to ${created} users: ${title}`);
    return { sent: created };
  }

  // ─── Cron: Cleanup ────────────────────────────────────────────────────────

  @Cron('0 2 * * *')
  async cleanupOldNotifications() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoff },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} read notifications older than 30 days`,
    );
  }
}
