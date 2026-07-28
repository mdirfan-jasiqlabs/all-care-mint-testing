import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AddressController } from './controllers/address.controller';
import { CustomerBookingController } from './controllers/customer-booking.controller';
import { AdminBookingController } from './controllers/admin-booking.controller';
import { ProviderBookingController } from './controllers/provider-booking.controller';
import { BookingService } from './services/booking.service';
import { AddressService } from './services/address.service';
import { StateEngineService } from './services/state-engine.service';
import { EligibilityService } from './services/eligibility.service';
import { SlotLockExpiryService } from './services/slot-lock-expiry.service';
import { NotificationService } from './services/notification.service';
import { PrismaBookingRepository } from './adapters/prisma-booking.repository';
import { PrismaAddressRepository } from './adapters/prisma-address.repository';
import Redis from 'ioredis';
import { BullModule } from '@nestjs/bullmq';
import { SlotLockExpiryProcessor } from './processors/slot-lock-expiry.processor';
import { SlotLockExpirySchedulerService } from './services/slot-lock-expiry-scheduler.service';

const RedisClientProvider = {
  provide: 'REDIS_CLIENT',
  useFactory: () => {
    const client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      connectTimeout: 2000, // 2 seconds connect timeout
      enableOfflineQueue: false, // fail immediately instead of hanging requests when Redis is down
      retryStrategy: (times) => {
        // Retries indefinitely but with a maximum delay of 2 seconds between retries to keep attempting recovery
        return Math.min(times * 100, 2000);
      },
    });

    client.on('error', (err) => {
      console.warn(`[Redis Client] Error occurred: ${err.message}`);
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
        connectTimeout: 2000, // 2 seconds connect timeout
        enableOfflineQueue: false, // fail immediately instead of hanging requests when Redis is down
        retryStrategy: (times) => {
          return Math.min(times * 100, 2000);
        },
      },
    }),
    BullModule.registerQueue({
      name: 'SlotLockExpiryQueue',
    }),
  ],
  controllers: [
    AddressController,
    CustomerBookingController,
    AdminBookingController,
    ProviderBookingController,
  ],
  providers: [
    BookingService,
    AddressService,
    StateEngineService,
    EligibilityService,
    SlotLockExpiryService,
    SlotLockExpiryProcessor,
    SlotLockExpirySchedulerService,
    NotificationService,
    RedisClientProvider,
    {
      provide: 'IBookingRepository',
      useClass: PrismaBookingRepository,
    },
    {
      provide: 'IAddressRepository',
      useClass: PrismaAddressRepository,
    },
    {
      provide: 'IBookingPublicFacade',
      useExisting: BookingService,
    },
  ],
  exports: [
    BookingService,
    AddressService,
    NotificationService,
    'IBookingRepository',
    'IAddressRepository',
    'IBookingPublicFacade',
    'REDIS_CLIENT',
  ],
})
export class BookingModule {}
