import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface StoreInfoDto {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  logoUrl?: string;
  description?: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get all (optional group filter) ─────────────────────────────────────

  async getAll(group?: string) {
    return this.prisma.systemSetting.findMany({
      where: group ? { group } : undefined,
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }

  // ─── Get only public settings ─────────────────────────────────────────────

  async getPublic() {
    return this.prisma.systemSetting.findMany({
      where: { isPublic: true },
      orderBy: { key: 'asc' },
    });
  }

  // ─── Get single setting value ─────────────────────────────────────────────

  async get(key: string): Promise<any> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  // ─── Upsert single setting ────────────────────────────────────────────────

  async set(
    key: string,
    value: any,
    group = 'general',
    isPublic = false,
  ) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, group, isPublic },
      update: { value, group, isPublic },
    });
  }

  // ─── Bulk set ─────────────────────────────────────────────────────────────

  async setBulk(settings: Record<string, any>) {
    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) => this.set(key, value)),
    );
    return { updated: results.length, settings: results };
  }

  // ─── Store Info ───────────────────────────────────────────────────────────

  async getStoreInfo() {
    const keys = [
      'store.name',
      'store.email',
      'store.phone',
      'store.address',
      'store.city',
      'store.country',
      'store.currency',
      'store.timezone',
      'store.logoUrl',
      'store.description',
    ];

    const settings = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map = settings.reduce(
      (acc, s) => {
        const shortKey = s.key.replace('store.', '');
        acc[shortKey] = s.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      name: map.name ?? 'Shaj Ecom',
      email: map.email ?? null,
      phone: map.phone ?? null,
      address: map.address ?? null,
      city: map.city ?? 'Dhaka',
      country: map.country ?? 'BD',
      currency: map.currency ?? 'BDT',
      timezone: map.timezone ?? 'Asia/Dhaka',
      logoUrl: map.logoUrl ?? null,
      description: map.description ?? null,
    };
  }

  async updateStoreInfo(dto: StoreInfoDto) {
    const entries = Object.entries(dto).filter(
      ([, v]) => v !== undefined,
    );

    const results = await Promise.all(
      entries.map(([key, value]) =>
        this.set(`store.${key}`, value, 'store', true),
      ),
    );

    return { updated: results.length };
  }
}
