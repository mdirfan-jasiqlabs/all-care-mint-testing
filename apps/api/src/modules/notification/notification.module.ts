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
