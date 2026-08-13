import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { ProviderEarningsController } from './controllers/provider-earnings.controller';
import Redis from 'ioredis';

const RedisClientProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 100, 2000),
    });

    client.on('error', (err) => {
      console.warn(`[Redis Payment Client] Warning: ${err.message}`);
    });

    return client;
  },
};

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => AnalyticsModule)],
  controllers: [
    PaymentController,
    AdminPaymentController,
    ProviderEarningsController,
  ],
  providers: [PaymentService, RedisClientProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
