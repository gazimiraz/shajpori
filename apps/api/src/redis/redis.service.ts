import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('redis.url', 'redis://localhost:6379');
    const password = this.config.get<string | undefined>('redis.password');

    const isTLS = url.startsWith('rediss://');
    this.client = new Redis(url, {
      password: password || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      tls: isTLS ? {} : undefined,
    });

    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('reconnecting', () => this.logger.warn('Redis reconnecting'));

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.warn(`Redis unavailable — app will run without cache: ${err.message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  private get connected(): boolean {
    return this.client?.status === 'ready';
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.set(key, value);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.setex(key, ttlSeconds, value);
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.connected) return false;
    const count = await this.client.exists(key);
    return count > 0;
  }

  async hGet(key: string, field: string): Promise<string | null> {
    if (!this.connected) return null;
    return this.client.hget(key, field);
  }

  async hSet(key: string, field: string, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.hset(key, field, value);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    if (!this.connected) return {};
    return this.client.hgetall(key);
  }

  async hDel(key: string, field: string): Promise<void> {
    if (!this.connected) return;
    await this.client.hdel(key, field);
  }

  async incr(key: string): Promise<number> {
    if (!this.connected) return 0;
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.connected) return;
    await this.client.expire(key, seconds);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) return [];
    return this.client.keys(pattern);
  }

  async ttl(key: string): Promise<number> {
    if (!this.connected) return -1;
    return this.client.ttl(key);
  }

  async flushPattern(pattern: string): Promise<void> {
    if (!this.connected) return;
    const matchingKeys = await this.client.keys(pattern);
    if (matchingKeys.length > 0) {
      const pipeline = this.client.pipeline();
      for (const key of matchingKeys) {
        pipeline.del(key);
      }
      await pipeline.exec();
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    if (!this.connected) return factory();
    const cached = await this.client.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        return cached as unknown as T;
      }
    }
    const value = await factory();
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  }

  async ping(): Promise<string> {
    if (!this.connected) throw new Error('Redis not connected');
    return this.client.ping();
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }
}
