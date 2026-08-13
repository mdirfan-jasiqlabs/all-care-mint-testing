import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BookingModule } from '../booking/booking.module';
import { PushTokenController } from './controllers/push-token.controller';
import { NotificationBadgeController } from './controllers/notification-badge.controller';
import { TokenRegistryService } from './services/token-registry.service';
import { NotificationService } from './services/notification.service';
import { NotificationPublicFacade } from './facade/notification.facade';
import { BookingStatusListener } from './listeners/booking-status.listener';
import { NotificationWorker } from './processors/notification.worker';
import { ExpoPushAdapter } from './adapters/expo-push.adapter';
import { IPushTokenRepository } from './ports/push-token-repository.interface';
import { IFcmGateway } from './ports/fcm-gateway.interface';
import { PrismaPushTokenRepository } from './adapters/prisma-push-token.repository';
import { FirebaseFcmAdapter } from './adapters/firebase-fcm.adapter';
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
      console.warn(`[Redis Notification Client] Warning: ${err.message}`);
    });

    return client;
  },
};

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => BookingModule),
    BullModule.registerQueue({
      name: 'NotificationQueue',
    }),
  ],
  controllers: [PushTokenController, NotificationBadgeController],
  providers: [
    TokenRegistryService,
    NotificationService,
    NotificationPublicFacade,
    BookingStatusListener,
    NotificationWorker,
    ExpoPushAdapter,
    RedisClientProvider,
    {
      provide: IPushTokenRepository,
      useClass: PrismaPushTokenRepository,
    },
    {
      provide: IFcmGateway,
      useClass: FirebaseFcmAdapter,
    },
  ],
  exports: [
    NotificationService,
    TokenRegistryService,
    NotificationPublicFacade,
    ExpoPushAdapter,
    NotificationWorker,
    BookingStatusListener,
  ],
})
export class NotificationModule {}
