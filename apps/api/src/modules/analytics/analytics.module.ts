import { Module, forwardRef } from '@nestjs/common';
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsProjectionService } from './services/analytics-projection.service';
import { AnalyticsBackfillService } from './services/analytics-backfill.service';
import { AnalyticsReconciliationService } from './services/analytics-reconciliation.service';
import { AnalyticsProjectionProcessor } from './processors/analytics-projection.processor';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BullModule } from '@nestjs/bullmq';
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
      console.warn(`[Redis Analytics Client] Warning: ${err.message}`);
    });

    return client;
  },
};

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      },
    }),
    BullModule.registerQueue({
      name: 'AnalyticsProjectionQueue',
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsProjectionService,
    AnalyticsBackfillService,
    AnalyticsReconciliationService,
    AnalyticsProjectionProcessor,
    RedisClientProvider,
  ],
  exports: [
    AnalyticsService,
    AnalyticsProjectionService,
    AnalyticsBackfillService,
    AnalyticsReconciliationService,
    'REDIS_CLIENT',
  ],
})
export class AnalyticsModule {}
