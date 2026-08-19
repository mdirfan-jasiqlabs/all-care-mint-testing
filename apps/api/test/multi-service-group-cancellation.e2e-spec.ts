import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingModule } from '../src/modules/booking/booking.module';
import { PaymentModule } from '../src/modules/payment/payment.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('Multi-Service Booking & Group Cancellation E2E Suite', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let customerId = '9a1ea001-c812-42ea-a417-000000000091';
  let customerBId = '9a1ea001-c812-42ea-a417-000000000092';
  let serviceId1: string;
  let serviceId2: string;
  let serviceId3: string;
  let addressId: string;
  let slotId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, BookingModule, PaymentModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization || '';
          if (authHeader.includes('Bearer customer_b_token')) {
            req.user = { id: customerBId, role: 'CUSTOMER' };
          } else if (authHeader.includes('Bearer customer_token')) {
            req.user = { id: customerId, role: 'CUSTOMER' };
          } else {
            throw new UnauthorizedException();
          }
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup Customers
    const custA = await prisma.customer.upsert({
      where: { mobileNumber: '+919999009001' },
      update: {},
      create: {
        id: customerId,
        mobileNumber: '+919999009001',
        displayName: 'Multi-Service Customer A',
      },
    });
    customerId = custA.id;

    const custB = await prisma.customer.upsert({
      where: { mobileNumber: '+919999009002' },
      update: {},
      create: {
        id: customerBId,
        mobileNumber: '+919999009002',
        displayName: 'Multi-Service Customer B',
      },
    });
    customerBId = custB.id;

    // Address
    const addr = await prisma.customerAddress.create({
      data: {
        customerId,
        label: 'Home',
        addressLine1: '456 Multi Service Way',
        city: 'Bengaluru',
        pincode: '560001',
      },
    });
    addressId = addr.id;

    // Services
    const category = await prisma.serviceCategory.upsert({
      where: { name: 'Multi-Svc Test Category' },
      update: {},
      create: {
        name: 'Multi-Svc Test Category',
        displayOrder: 99,
      },
    });

    const svc1 = await prisma.service.upsert({
      where: { categoryId_name: { categoryId: category.id, name: 'Deep Cleaning Test' } },
      update: {},
      create: {
        categoryId: category.id,
        name: 'Deep Cleaning Test',
        fixedPrice: 4500,
        isActive: true,
      },
    });
    serviceId1 = svc1.id;

    const svc2 = await prisma.service.upsert({
      where: { categoryId_name: { categoryId: category.id, name: 'Kitchen Cleaning Test' } },
      update: {},
      create: {
        categoryId: category.id,
        name: 'Kitchen Cleaning Test',
        fixedPrice: 1200,
        isActive: true,
      },
    });
    serviceId2 = svc2.id;

    const svc3 = await prisma.service.upsert({
      where: { categoryId_name: { categoryId: category.id, name: 'AC General Service Test' } },
      update: {},
      create: {
        categoryId: category.id,
        name: 'AC General Service Test',
        fixedPrice: 800,
        isActive: true,
      },
    });
    serviceId3 = svc3.id;

    // Slot
    let slot = await prisma.bookingTimeSlot.findFirst({ where: { isActive: true } });
    if (!slot) {
      slot = await prisma.bookingTimeSlot.create({
        data: {
          label: '11:00 AM - 01:00 PM',
          startTime: new Date(),
          endTime: new Date(),
          maxCapacity: 100,
          isActive: true,
        },
      });
    }
    slotId = slot.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Case 1 — Single Service Booking & Cancellation', async () => {
    const dateStr = '2026-09-01';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateStr })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-000000000001')
      .send({
        serviceId: serviceId1,
        slotId,
        slotDate: dateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.bookingIds).toHaveLength(1);
    const bookingId = createRes.body.data.bookingId;

    // Cancel Group
    const cancelRes = await request(app.getHttpServer())
      .post('/api/v1/bookings/me/cancel-group')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingIds: [bookingId],
        reason: 'Testing single service cancel',
      })
      .expect(201);

    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data[0].status).toBe('CANCELLED');

    // Verify DB
    const dbBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(dbBooking?.status).toBe('CANCELLED');
  });

  it('Case 2 — Two Services Multi-Booking & Group Cancellation', async () => {
    const dateStr = '2026-09-02';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateStr })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-000000000002')
      .send({
        serviceId: serviceId1,
        serviceIds: [serviceId1, serviceId2],
        slotId,
        slotDate: dateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const bookingIds = createRes.body.data.bookingIds;
    expect(bookingIds).toHaveLength(2);

    // Cancel Group
    const cancelRes = await request(app.getHttpServer())
      .post('/api/v1/bookings/me/cancel-group')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingIds,
        reason: 'Testing two service group cancel',
      })
      .expect(201);

    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data).toHaveLength(2);
    expect(cancelRes.body.data[0].status).toBe('CANCELLED');
    expect(cancelRes.body.data[1].status).toBe('CANCELLED');

    // Verify DB
    const dbBookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
    });
    expect(dbBookings.every((b) => b.status === 'CANCELLED')).toBe(true);
  });

  it('Case 3 — Three Services Multi-Booking', async () => {
    const dateStr = '2026-09-03';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateStr })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-000000000003')
      .send({
        serviceId: serviceId1,
        serviceIds: [serviceId1, serviceId2, serviceId3],
        slotId,
        slotDate: dateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const bookingIds = createRes.body.data.bookingIds;
    expect(bookingIds).toHaveLength(3);
  });

  it('Case 4 — Mandatory Isolation Test', async () => {
    // 1. Create Old Booking A separately
    const dateA = '2026-09-04';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateA })
      .expect(201);

    const bookingARes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-00000000000a')
      .send({
        serviceId: serviceId1,
        slotId,
        slotDate: dateA,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    const bookingAId = bookingARes.body.data.bookingId;

    // 2. Create Multi-Booking B + C separately
    const dateBC = '2026-09-05';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateBC })
      .expect(201);

    const bookingBCRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-0000000000bc')
      .send({
        serviceId: serviceId1,
        serviceIds: [serviceId1, serviceId2],
        slotId,
        slotDate: dateBC,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    const groupBCIds = bookingBCRes.body.data.bookingIds;
    expect(groupBCIds).toHaveLength(2);

    // 3. Cancel ONLY group B + C from confirmation page
    await request(app.getHttpServer())
      .post('/api/v1/bookings/me/cancel-group')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingIds: groupBCIds,
        reason: 'Cancel B+C group',
      })
      .expect(201);

    // 4. Isolation assertion: Booking A must remain PENDING; Bookings B & C must be CANCELLED
    const dbBookingA = await prisma.booking.findUnique({ where: { id: bookingAId } });
    expect(dbBookingA?.status).toBe('PENDING');

    const dbBookingsBC = await prisma.booking.findMany({ where: { id: { in: groupBCIds } } });
    expect(dbBookingsBC.every((b) => b.status === 'CANCELLED')).toBe(true);
  });

  it('Case 5 — BOLA / IDOR Security Test', async () => {
    // Create booking for Customer A
    const dateStr = '2026-09-06';
    await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: dateStr })
      .expect(201);

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', '00000000-0000-4000-8000-000000000006')
      .send({
        serviceId: serviceId1,
        slotId,
        slotDate: dateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    const customerABookingId = createRes.body.data.bookingId;

    // Customer B attempts to cancel Customer A's booking
    await request(app.getHttpServer())
      .post('/api/v1/bookings/me/cancel-group')
      .set('Authorization', 'Bearer customer_b_token')
      .send({
        bookingIds: [customerABookingId],
        reason: 'Malicious BOLA cancellation attempt',
      })
      .expect(403);

    // Verify Customer A booking was untouched
    const dbBooking = await prisma.booking.findUnique({ where: { id: customerABookingId } });
    expect(dbBooking?.status).toBe('PENDING');
  });
});
