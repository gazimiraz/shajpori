import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { POSModule } from './modules/pos/pos.module';
import { BarcodeModule } from './modules/barcode/barcode.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AIModule } from './modules/ai/ai.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { HealthModule } from './modules/health/health.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SupportModule } from './modules/support/support.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { GatewayModule } from './gateways/gateway.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('RATE_LIMIT_WINDOW_MS', 60000),
          limit: config.get('RATE_LIMIT_MAX_REQUESTS', 100),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: { url: config.get('QUEUE_REDIS_URL', 'redis://localhost:6379') },
      }),
    }),
    PrismaModule,
    RedisModule,
    GatewayModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    InventoryModule,
    WarehouseModule,
    PurchasingModule,
    POSModule,
    BarcodeModule,
    AccountingModule,
    AnalyticsModule,
    AIModule,
    MarketingModule,
    VendorsModule,
    ShippingModule,
    PaymentsModule,
    NotificationsModule,
    MediaModule,
    PluginsModule,
    ReportsModule,
    SettingsModule,
    WebhooksModule,
    ManufacturingModule,
    HealthModule,
    ReviewsModule,
    SupportModule,
  ],
  providers: [],
})
export class AppModule {}
