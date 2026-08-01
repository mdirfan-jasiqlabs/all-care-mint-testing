import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PushTokenController } from './controllers/push-token.controller';
import { NotificationBadgeController } from './controllers/notification-badge.controller';
import { TokenRegistryService } from './services/token-registry.service';
import { NotificationService } from './services/notification.service';
import { NotificationPublicFacade } from './facade/notification.facade';
import { BookingStatusListener } from './listeners/booking-status.listener';
import { IPushTokenRepository } from './ports/push-token-repository.interface';
import { IFcmGateway } from './ports/fcm-gateway.interface';
import { PrismaPushTokenRepository } from './adapters/prisma-push-token.repository';
import { FirebaseFcmAdapter } from './adapters/firebase-fcm.adapter';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PushTokenController, NotificationBadgeController],
  providers: [
    TokenRegistryService,
    NotificationService,
    NotificationPublicFacade,
    BookingStatusListener,
    {
      provide: IPushTokenRepository,
      useClass: PrismaPushTokenRepository,
    },
    {
      provide: IFcmGateway,
      useClass: FirebaseFcmAdapter,
    },
  ],
  exports: [NotificationService, TokenRegistryService, NotificationPublicFacade],
})
export class NotificationModule {}
