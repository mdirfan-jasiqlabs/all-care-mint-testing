import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProviderBookingController } from '../src/modules/booking/controllers/provider-booking.controller';
import { BookingService } from '../src/modules/booking/services/booking.service';
import { StateEngineService } from '../src/modules/booking/services/state-engine.service';
import { EligibilityService } from '../src/modules/booking/services/eligibility.service';
import { NotificationService } from '../src/modules/booking/services/notification.service';
import { PrismaBookingRepository } from '../src/modules/booking/adapters/prisma-booking.repository';
import { PrismaAddressRepository } from '../src/modules/booking/adapters/prisma-address.repository';
import { BookingStatusEnum } from '../src/modules/booking/types/booking.types';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { ApprovedProviderGuard } from '../src/modules/auth/guards/approved-provider.guard';

describe('Provider Booking Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const provider1Id = '4f1ea001-c812-42ea-a417-000000000001';
  const provider2Id = '4f1ea001-c812-42ea-a417-000000000002';
  const customerId = '7b6f380c-7b1f-4fbf-93f5-000000000001';
  const addressId = '2a3c7e3f-6789-411a-88cb-000000000001';
  const timeSlotId = '9b6f380c-7b1f-4fbf-93f5-000000000001';
  const serviceId = '0c7b380c-7b1f-4fbf-93f5-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [ProviderBookingController],
      providers: [
        BookingService,
        StateEngineService,
        EligibilityService,
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
          provide: 'REDIS_CLIENT',
          useValue: {
            set: jest.fn().mockResolvedValue('OK'),
            del: jest.fn().mockResolvedValue(1),
            quit: jest.fn().mockResolvedValue('OK'),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApprovedProviderGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    // Inject mock user middleware
    app.use((req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer provider-1-token') {
        req.user = { id: provider1Id, role: 'PROVIDER' };
      } else if (authHeader === 'Bearer provider-2-token') {
        req.user = { id: provider2Id, role: 'PROVIDER' };
      }
      next();
    });

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Seed test entities if not existing
    await prisma.$executeRawUnsafe(`
      INSERT INTO customers (id, mobile_number, display_name)
      VALUES ('${customerId}', '+91 life customer', 'Lifecycle Customer')
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO customer_addresses (id, customer_id, label, address_line_1, city, pincode)
      VALUES ('${addressId}', '${customerId}', 'Lifecycle Address', '123 Test St', 'Bangalore', '560103')
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO booking_time_slots (id, label, start_time, end_time, is_active, display_order)
      VALUES ('${timeSlotId}', '09:00 AM - 10:00 AM', '09:00:00', '10:00:00', true, 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    const categories = await prisma.serviceCategory.findMany();
    let catId = categories[0]?.id;
    if (!catId) {
      const newCat = await prisma.serviceCategory.create({
        data: { name: 'Lifecycle Cat', displayOrder: 1 },
      });
      catId = newCat.id;
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO services (id, category_id, name, fixed_price, is_active)
      VALUES ('${serviceId}', '${catId}', 'Lifecycle Service', 500.00, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO providers (id, mobile_number, display_name, status, service_area)
      VALUES ('${provider1Id}', '+91 provider one', 'Provider One', 'APPROVED', 'Bangalore'),
             ('${provider2Id}', '+91 provider two', 'Provider Two', 'APPROVED', 'Bangalore')
      ON CONFLICT (id) DO NOTHING;
    `);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /api/v1/providers/me/bookings/:id/status & accept/reject', () => {
    const bookingId = '8f3ca001-c812-42ea-a417-000000000001';

    beforeEach(async () => {
      // Clean up previous booking
      await prisma.$executeRawUnsafe(
        `DELETE FROM booking_status_history WHERE booking_id = '${bookingId}'`,
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM bookings WHERE id = '${bookingId}'`,
      );

      // Create booking in ASSIGNED state for provider 1
      await prisma.booking.create({
        data: {
          id: bookingId,
          bookingReference: 'TEST-LC-001',
          customerId,
          providerId: provider1Id,
          serviceId,
          serviceNameSnapshot: 'Lifecycle Service',
          servicePriceSnapshot: 500.0,
          addressSnapshot: { label: 'Test' },
          slotDate: new Date(),
          slotLabelSnapshot: '09:00 AM - 10:00 AM',
          paymentMethod: 'CASH_ON_SERVICE',
          status: BookingStatusEnum.ASSIGNED,
          idempotencyKey: '00000000-0000-0000-0000-000000000001',
        },
      });
    });

    it('TC-002-010: assigned provider accepts booking -> HTTP 200 and ACCEPTED in DB', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/providers/me/bookings/${bookingId}/accept`)
        .set('Authorization', 'Bearer provider-1-token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(BookingStatusEnum.ACCEPTED);

      // Verify DB status
      const dbBooking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      expect(dbBooking?.status).toBe(BookingStatusEnum.ACCEPTED);

      // Verify Status History count is 1
      const history = await prisma.bookingStatusHistory.findMany({
        where: { bookingId },
      });
      expect(history.length).toBe(1);
      expect(history[0].status).toBe(BookingStatusEnum.ACCEPTED);
    });

    it('TC-002-011: another provider updates booking -> HTTP 403 (BOLA)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/providers/me/bookings/${bookingId}/status`)
        .set('Authorization', 'Bearer provider-2-token')
        .send({ status: BookingStatusEnum.ON_THE_WAY })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BOOKING_FORBIDDEN');
    });

    it('TC-002-012: provider attempts invalid transition -> HTTP 409 Conflict', async () => {
      // Transition directly ASSIGNED -> STARTED is invalid
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/providers/me/bookings/${bookingId}/status`)
        .set('Authorization', 'Bearer provider-1-token')
        .send({ status: BookingStatusEnum.STARTED })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_INVALID_TRANSITION');
    });

    it('should return HTTP 404 for nonexistent booking', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/providers/me/bookings/${fakeId}/status`)
        .set('Authorization', 'Bearer provider-1-token')
        .send({ status: BookingStatusEnum.ACCEPTED })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ERR_BOOKING_NOT_FOUND');
    });
  });
});
