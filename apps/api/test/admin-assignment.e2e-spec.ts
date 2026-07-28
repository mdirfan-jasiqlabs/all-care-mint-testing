import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AdminBookingController } from '../src/modules/booking/controllers/admin-booking.controller';
import { BookingService } from '../src/modules/booking/services/booking.service';
import { StateEngineService } from '../src/modules/booking/services/state-engine.service';
import { EligibilityService } from '../src/modules/booking/services/eligibility.service';
import { NotificationService } from '../src/modules/booking/services/notification.service';
import { PrismaBookingRepository } from '../src/modules/booking/adapters/prisma-booking.repository';
import { PrismaAddressRepository } from '../src/modules/booking/adapters/prisma-address.repository';
import { BookingStatusEnum } from '../src/modules/booking/types/booking.types';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('Admin Booking Provider Assignment (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const adminId = '1a1ea001-c812-42ea-a417-000000000001';
  const customerId = '2a1ea001-c812-42ea-a417-000000000001';
  const providerApprovedId = '3a1ea001-c812-42ea-a417-000000000001';
  const providerPendingId = '4a1ea001-c812-42ea-a417-000000000001';
  const addressId = '5a1ea001-c812-42ea-a417-000000000001';
  const timeSlotId = '6a1ea001-c812-42ea-a417-000000000001';
  const serviceId = '7a1ea001-c812-42ea-a417-000000000001';
  const bookingId = '8a1ea001-c812-42ea-a417-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      controllers: [AdminBookingController],
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
      .compile();

    app = moduleFixture.createNestApplication();

    app.use((req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (authHeader === 'Bearer admin-token') {
        req.user = { id: adminId, role: 'ADMIN' };
      } else if (authHeader === 'Bearer customer-token') {
        req.user = { id: customerId, role: 'CUSTOMER' };
      }
      next();
    });

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    await prisma.$executeRawUnsafe(`
      INSERT INTO customers (id, mobile_number, display_name)
      VALUES ('${customerId}', '+919000000001', 'Admin Test Customer')
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO customer_addresses (id, customer_id, label, address_line_1, city, pincode)
      VALUES ('${addressId}', '${customerId}', 'Home', '123 Admin Lane', 'Bengaluru', '560103')
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO booking_time_slots (id, label, start_time, end_time, is_active, display_order)
      VALUES ('${timeSlotId}', '10:00 AM - 11:00 AM', '10:00:00', '11:00:00', true, 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    const categories = await prisma.serviceCategory.findMany();
    let catId = categories[0]?.id;
    if (!catId) {
      const newCat = await prisma.serviceCategory.create({
        data: { name: 'Admin Cat', displayOrder: 1 }
      });
      catId = newCat.id;
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO services (id, category_id, name, fixed_price, is_active)
      VALUES ('${serviceId}', '${catId}', 'Admin Test Service', 600.00, true)
      ON CONFLICT (id) DO NOTHING;
    `);

    await prisma.$executeRawUnsafe(`
      INSERT INTO providers (id, mobile_number, display_name, status, service_area)
      VALUES ('${providerApprovedId}', '+919000000002', 'Approved Provider', 'APPROVED', 'Bengaluru'),
             ('${providerPendingId}', '+919000000003', 'Pending Provider', 'PENDING_REVIEW', 'Bengaluru')
      ON CONFLICT (id) DO NOTHING;
    `);

    // Connect approved provider to category
    await prisma.provider.update({
      where: { id: providerApprovedId },
      data: {
        categories: {
          connect: { id: catId },
        },
      },
    });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM booking_status_history WHERE booking_id = '${bookingId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM bookings WHERE id = '${bookingId}'`);

    await prisma.booking.create({
      data: {
        id: bookingId,
        bookingReference: 'ACM-TEST-ADMIN-001',
        customerId,
        providerId: null,
        serviceId,
        serviceNameSnapshot: 'Admin Test Service',
        servicePriceSnapshot: 600.00,
        addressSnapshot: { label: 'Home' },
        slotDate: new Date('2026-08-10'),
        slotLabelSnapshot: '10:00 AM - 11:00 AM',
        paymentMethod: 'CASH_ON_SERVICE',
        status: BookingStatusEnum.PENDING,
        idempotencyKey: '00000000-0000-0000-0000-000000000099',
      },
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM booking_status_history WHERE booking_id = '${bookingId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM bookings WHERE id = '${bookingId}'`);
    await app.close();
  });

  it('TC-002-007: Admin assigns APPROVED provider -> HTTP 200 and status ASSIGNED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bookings/${bookingId}/assign`)
      .set('Authorization', 'Bearer admin-token')
      .send({ providerId: providerApprovedId })
      .expect(200);

    // Check exact AC contract format
    expect(res.body.status).toBe('ASSIGNED');
    expect(res.body.provider_id).toBe(providerApprovedId);
    expect(res.body.provider_name).toBe('Approved Provider');

    // Verify DB update
    const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(dbBooking?.status).toBe(BookingStatusEnum.ASSIGNED);
    expect(dbBooking?.providerId).toBe(providerApprovedId);

    // Verify Status History appended
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId } });
    expect(history.length).toBe(1);
    expect(history[0].status).toBe(BookingStatusEnum.ASSIGNED);
  });

  it('TC-002-008: Admin attempts to assign non-APPROVED provider -> HTTP 400 ERR_PROVIDER_INELIGIBLE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bookings/${bookingId}/assign`)
      .set('Authorization', 'Bearer admin-token')
      .send({ providerId: providerPendingId })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ERR_PROVIDER_INELIGIBLE');

    // Verify DB state remains PENDING
    const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(dbBooking?.status).toBe(BookingStatusEnum.PENDING);
    expect(dbBooking?.providerId).toBeNull();
  });

  it('TC-002-009: Non-existent booking assignment -> HTTP 404 ERR_BOOKING_NOT_FOUND', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/bookings/${fakeId}/assign`)
      .set('Authorization', 'Bearer admin-token')
      .send({ providerId: providerApprovedId })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ERR_BOOKING_NOT_FOUND');
  });
});
