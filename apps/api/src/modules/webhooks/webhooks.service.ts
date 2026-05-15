import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: string;
  isActive: boolean;
}

const WEBHOOKS_SETTING_KEY = 'webhooks.registrations';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(url: string, events: string[], secret: string) {
    const webhooks = await this.loadWebhooks();

    const newWebhook: WebhookRegistration = {
      id: crypto.randomUUID(),
      url,
      events,
      secret,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    webhooks.push(newWebhook);
    await this.saveWebhooks(webhooks);

    this.logger.log(`Webhook registered: ${url} for events [${events.join(', ')}]`);

    // Return without exposing the secret
    const { secret: _s, ...safe } = newWebhook;
    return safe;
  }

  // ─── Get All ──────────────────────────────────────────────────────────────

  async getAll() {
    const webhooks = await this.loadWebhooks();
    // Never expose secrets
    return webhooks.map(({ secret: _s, ...w }) => w);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(id: string) {
    const webhooks = await this.loadWebhooks();
    const index = webhooks.findIndex((w) => w.id === id);
    if (index === -1) throw new NotFoundException(`Webhook ${id} not found`);

    webhooks.splice(index, 1);
    await this.saveWebhooks(webhooks);

    return { deleted: true, id };
  }

  // ─── Send ─────────────────────────────────────────────────────────────────

  async send(event: string, payload: any) {
    const webhooks = await this.loadWebhooks();
    const subscribed = webhooks.filter(
      (w) => w.isActive && w.events.includes(event),
    );

    if (subscribed.length === 0) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

    const results = await Promise.allSettled(
      subscribed.map(async (w) => {
        const signature = this.computeHmac(body, w.secret);
        try {
          const response = await fetch(w.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shaj-Signature': `sha256=${signature}`,
              'X-Shaj-Event': event,
            },
            body,
            signal: AbortSignal.timeout(10000),
          });
          this.logger.log(
            `Webhook ${event} delivered to ${w.url}: HTTP ${response.status}`,
          );
          return { webhookId: w.id, status: response.status };
        } catch (err) {
          this.logger.error(
            `Webhook ${event} delivery failed to ${w.url}: ${err.message}`,
          );
          throw err;
        }
      }),
    );

    return {
      event,
      total: subscribed.length,
      delivered: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }

  // ─── Verify ───────────────────────────────────────────────────────────────

  verify(payload: string, signature: string, secret: string): boolean {
    const expected = `sha256=${this.computeHmac(payload, secret)}`;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  // ─── Test ─────────────────────────────────────────────────────────────────

  async test(id: string) {
    const webhooks = await this.loadWebhooks();
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) throw new NotFoundException(`Webhook ${id} not found`);

    return this.send('test.ping', { message: 'Webhook test from Shaj Ecom' });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async loadWebhooks(): Promise<WebhookRegistration[]> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: WEBHOOKS_SETTING_KEY },
    });
    if (!setting) return [];
    return (setting.value as any) ?? [];
  }

  private async saveWebhooks(webhooks: WebhookRegistration[]) {
    await this.prisma.systemSetting.upsert({
      where: { key: WEBHOOKS_SETTING_KEY },
      create: {
        key: WEBHOOKS_SETTING_KEY,
        value: webhooks as any,
        group: 'webhooks',
        isPublic: false,
      },
      update: { value: webhooks as any },
    });
  }

  private computeHmac(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
