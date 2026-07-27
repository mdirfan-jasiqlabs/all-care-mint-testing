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

@Module({
  imports: [PrismaModule, AuthModule],
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
    NotificationService,
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
  ],
})
export class BookingModule {}
