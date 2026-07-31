import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentModule } from '../src/modules/payment/payment.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';

describe('US-004-003 Admin Cash Payment Reconciliation Ledger QA Audit (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const mockAdminId = '90000000-0000-0000-0000-000000000001';
  const mockCustomerId = '90000000-0000-0000-0000-000000000002';
  const mockProviderId = '90000000-0000-0000-0000-000000000003';

  let cashPaymentOrderId1: string;
  let cashPaymentOrderId2: string;
  let cashSettledOrderId: string;
  let onlineSuccessOrderId: string;
  let onlinePendingOrderId: string;
  let paymentFailedOrderId: string;
  let bookingId1: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PaymentModule],
      providers: [Reflector],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization || '';
          if (authHeader.includes('Bearer admin_token')) {
            req.user = { id: mockAdminId, role: 'ADMIN' };
          } else if (authHeader.includes('Bearer customer_token')) {
            req.user = { id: mockCustomerId, role: 'CUSTOMER' };
          } else if (authHeader.includes('Bearer provider_token')) {
            req.user = { id: mockProviderId, role: 'PROVIDER' };
          } else if (authHeader.includes('Bearer invalid_token')) {
            throw new UnauthorizedException();
          } else {
            throw new UnauthorizedException();
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Clean up previous test run data if any
    await prisma.paymentOrder.deleteMany({
      where: { customerId: mockCustomerId },
    });
    await prisma.booking.deleteMany({
      where: { customerId: mockCustomerId },
    });

    // 1. Create Customer record
    const cust = await prisma.customer.upsert({
      where: { id: mockCustomerId },
      update: {},
      create: {
        id: mockCustomerId,
        mobileNumber: '+919999004003',
        displayName: 'QA Audit Customer US-004-003',
      },
    });

    // 2. Create Provider record
    const prov = await prisma.provider.upsert({
      where: { id: mockProviderId },
      update: {},
      create: {
        id: mockProviderId,
        mobileNumber: '+919999004004',
        displayName: 'QA Audit Provider US-004-003',
        serviceArea: 'Koramangala',
        status: 'APPROVED',
      },
    });

    // 3. Create Service Category & Service
    let category = await prisma.serviceCategory.findFirst({ where: { name: 'QA Audit Ledger Category' } });
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { name: 'QA Audit Ledger Category' },
      });
    }

    let service = await prisma.service.findFirst({ where: { name: 'QA Audit Premium Cleaning' } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          categoryId: category.id,
          name: 'QA Audit Premium Cleaning',
          fixedPrice: 2499,
        },
      });
    }

    let slot = await prisma.bookingTimeSlot.findFirst();
    if (!slot) {
      slot = await prisma.bookingTimeSlot.create({
        data: {
          label: '10:00 AM - 11:00 AM',
          startTime: new Date('2026-08-15T10:00:00Z'),
          endTime: new Date('2026-08-15T11:00:00Z'),
        },
      });
    }

    let address = await prisma.customerAddress.findFirst({ where: { customerId: cust.id } });
    if (!address) {
      address = await prisma.customerAddress.create({
        data: {
          customerId: cust.id,
          label: 'Home',
          addressLine1: '789 Audit St',
          city: 'Bengaluru',
          pincode: '560034',
        },
      });
    }

    // Helper to create test booking and payment
    async function createTestFixture(refSuffix: string, method: string, status: string, dayOffset: number) {
      const booking = await prisma.booking.create({
        data: {
          bookingReference: `ACM-AUDIT-${refSuffix}`,
          customerId: cust.id,
          providerId: prov.id,
          serviceId: service.id,
          slotId: slot.id,
          addressId: address.id,
          slotDate: new Date(`2026-08-${15 + dayOffset}`),
          status: 'COMPLETED',
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: 2499,
          slotLabelSnapshot: '10:00 AM - 11:00 AM',
          addressSnapshot: { line1: '789 Audit St', city: 'Bengaluru' },
          paymentMethod: method === 'CASH_ON_SERVICE' ? 'CASH_ON_SERVICE' : 'ONLINE',
          idempotencyKey: crypto.randomUUID(),
        },
      });

      const paymentOrder = await prisma.paymentOrder.create({
        data: {
          customerId: cust.id,
          bookingId: booking.id,
          amountPaise: 249900,
          paymentMethod: method,
          status,
          razorpayOrderId: method === 'ONLINE' ? `order_audit_${refSuffix}` : null,
          razorpayPaymentId: status === 'PAYMENT_SUCCESS' ? `pay_audit_${refSuffix}` : null,
        },
      });

      return { booking, paymentOrder };
    }

    const c1 = await createTestFixture('CASH1', 'CASH_ON_SERVICE', 'CASH_PENDING', 0);
    const c2 = await createTestFixture('CONCUR2', 'CASH_ON_SERVICE', 'CASH_PENDING', 1);
    const cs = await createTestFixture('SETTLED', 'CASH_ON_SERVICE', 'CASH_SETTLED', 2);
    const os = await createTestFixture('ONSUCC', 'ONLINE', 'PAYMENT_SUCCESS', 3);
    const op = await createTestFixture('ONPEND', 'ONLINE', 'PAYMENT_PENDING', 4);
    const pf = await createTestFixture('ONFAIL', 'ONLINE', 'PAYMENT_FAILED', 5);

    cashPaymentOrderId1 = c1.paymentOrder.id;
    bookingId1 = c1.booking.id;
    cashPaymentOrderId2 = c2.paymentOrder.id;
    cashSettledOrderId = cs.paymentOrder.id;
    onlineSuccessOrderId = os.paymentOrder.id;
    onlinePendingOrderId = op.paymentOrder.id;
    paymentFailedOrderId = pf.paymentOrder.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.paymentOrder.deleteMany({
        where: { customerId: mockCustomerId },
      });
      await prisma.booking.deleteMany({
        where: { customerId: mockCustomerId },
      });
      await prisma.$disconnect();
    }
  });

  // -------------------------------------------------------------
  // AC-004-003 & AUTHORIZATION TESTS
  // -------------------------------------------------------------
  describe('1. Endpoint Authorization & Guard Protection', () => {
    it('GET /api/v1/admin/payments without JWT returns HTTP 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .expect(401);
    });

    it('GET /api/v1/admin/payments with Customer JWT returns HTTP 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set('Authorization', 'Bearer customer_token')
        .expect(403);
    });

    it('GET /api/v1/admin/payments with Provider JWT returns HTTP 403', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set('Authorization', 'Bearer provider_token')
        .expect(403);
    });

    it('GET /api/v1/admin/payments with Invalid JWT returns HTTP 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('GET /api/v1/admin/payments with Admin JWT returns HTTP 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    });

    it('PATCH /api/v1/admin/payments/:id/settle without JWT returns HTTP 401', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${cashPaymentOrderId1}/settle`)
        .expect(401);
    });

    it('PATCH /api/v1/admin/payments/:id/settle with Customer JWT returns HTTP 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${cashPaymentOrderId1}/settle`)
        .set('Authorization', 'Bearer customer_token')
        .expect(403);
    });

    it('PATCH /api/v1/admin/payments/:id/settle with Provider JWT returns HTTP 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${cashPaymentOrderId1}/settle`)
        .set('Authorization', 'Bearer provider_token')
        .expect(403);
    });
  });

  // -------------------------------------------------------------
  // LEDGER RESPONSE & FIELD MAPPING
  // -------------------------------------------------------------
  describe('2. Ledger Record Mapping & Data Security', () => {
    it('verifies ledger fields match schema and contain no sensitive PII/secrets', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      const target = items.find((i: any) => i.id === cashPaymentOrderId1);
      expect(target).toBeDefined();
      expect(target.booking_id).toBe('ACM-AUDIT-CASH1');
      expect(target.customer_name).toBe('QA Audit Customer US-004-003');
      expect(target.service_name).toBe('QA Audit Premium Cleaning');
      expect(target.provider_name).toBe('QA Audit Provider US-004-003');
      expect(target.amount_inr).toBe(2499);
      expect(target.payment_method).toBe('CASH');
      expect(target.status).toBe('CASH_PENDING');
      expect(target.date).toBeDefined();
      expect(target.passwordHash).toBeUndefined();
      expect(target.secret).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // TC-004-006: QUERY FILTERING VERIFICATION
  // -------------------------------------------------------------
  describe('3. Query Filtering Verification (TC-004-006)', () => {
    it('TC-004-006: method=CASH returns ONLY cash records and no online records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?method=CASH')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      expect(items.every((i: any) => i.payment_method === 'CASH')).toBe(true);
      expect(items.some((i: any) => i.id === cashPaymentOrderId1)).toBe(true);
      expect(items.some((i: any) => i.id === onlineSuccessOrderId)).toBe(false);
    });

    it('TC-004-006: method=ONLINE returns ONLY online records and no cash records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?method=ONLINE')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      expect(items.every((i: any) => i.payment_method === 'ONLINE')).toBe(true);
      expect(items.some((i: any) => i.id === onlineSuccessOrderId)).toBe(true);
      expect(items.some((i: any) => i.id === cashPaymentOrderId1)).toBe(false);
    });

    it('status=CASH_PENDING returns ONLY CASH_PENDING records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?status=CASH_PENDING')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      expect(items.every((i: any) => i.status === 'CASH_PENDING')).toBe(true);
      expect(items.some((i: any) => i.id === cashPaymentOrderId1)).toBe(true);
    });

    it('status=PAYMENT_SUCCESS returns ONLY PAYMENT_SUCCESS records', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?status=PAYMENT_SUCCESS')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      expect(items.every((i: any) => i.status === 'PAYMENT_SUCCESS')).toBe(true);
      expect(items.some((i: any) => i.id === onlineSuccessOrderId)).toBe(true);
    });

    it('combined method=CASH&status=CASH_PENDING filters correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?method=CASH&status=CASH_PENDING')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const items = res.body.data.data;
      expect(items.every((i: any) => i.payment_method === 'CASH' && i.status === 'CASH_PENDING')).toBe(true);
    });

    it('invalid method filter returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?method=CRYPTO')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('invalid status filter returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?status=INVALID_STATUS')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('invalid date_from format returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?date_from=invalid-date')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('inverted date range (date_from > date_to) returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?date_from=2026-12-31&date_to=2026-01-01')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });
  });

  // -------------------------------------------------------------
  // PAGINATION VERIFICATION
  // -------------------------------------------------------------
  describe('4. Pagination & Ordering Verification', () => {
    it('returns pagination metadata correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page=1&page_size=2')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.page_size).toBe(2);
      expect(res.body.data.data.length).toBeLessThanOrEqual(2);
    });

    it('ensures no duplicate items between page 1 and page 2', async () => {
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page=1&page_size=2')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page=2&page_size=2')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      const page1Ids = new Set(res1.body.data.data.map((i: any) => i.id));
      const page2Ids = res2.body.data.data.map((i: any) => i.id);

      expect(page2Ids.some((id: string) => page1Ids.has(id))).toBe(false);
    });

    it('invalid page=0 returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page=0')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('invalid limit=0 returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page_size=0')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('excessive limit=150 returns HTTP 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page_size=150')
        .set('Authorization', 'Bearer admin_token')
        .expect(400);
    });

    it('page beyond available data returns HTTP 200 with empty data array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?page=99999')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      expect(res.body.data.data).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // TC-004-007: SETTLEMENT ELIGIBILITY & SAFETY VERIFICATION
  // -------------------------------------------------------------
  describe('5. Settlement Eligibility & Database Integrity (TC-004-007)', () => {
    it('TC-004-007: settles eligible CASH_PENDING cash payment successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${cashPaymentOrderId1}/settle`)
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CASH_SETTLED');

      // Check DB
      const dbOrder = await prisma.paymentOrder.findUnique({
        where: { id: cashPaymentOrderId1 },
      });
      expect(dbOrder?.status).toBe('CASH_SETTLED');
      expect(dbOrder?.amountPaise).toBe(249900);
      expect(dbOrder?.paymentMethod).toBe('CASH_ON_SERVICE');

      // Check Booking state is preserved
      const dbBooking = await prisma.booking.findUnique({
        where: { id: bookingId1 },
      });
      expect(dbBooking?.status).toBe('COMPLETED');
    });

    it('settling already CASH_SETTLED payment returns HTTP 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${cashPaymentOrderId1}/settle`)
        .set('Authorization', 'Bearer admin_token')
        .expect(409);
    });

    it('settling an ONLINE PAYMENT_SUCCESS payment returns HTTP 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${onlineSuccessOrderId}/settle`)
        .set('Authorization', 'Bearer admin_token')
        .expect(409);
    });

    it('settling an ONLINE PAYMENT_PENDING payment returns HTTP 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${onlinePendingOrderId}/settle`)
        .set('Authorization', 'Bearer admin_token')
        .expect(409);
    });

    it('settling a PAYMENT_FAILED payment returns HTTP 409 Conflict', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/payments/${paymentFailedOrderId}/settle`)
        .set('Authorization', 'Bearer admin_token')
        .expect(409);
    });

    it('settling non-existent payment ID returns HTTP 404 Not Found', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/payments/00000000-0000-0000-0000-000000000000/settle')
        .set('Authorization', 'Bearer admin_token')
        .expect(404);
    });

    it('settling malformed payment ID returns HTTP 404 Not Found', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/admin/payments/malformed-id-string/settle')
        .set('Authorization', 'Bearer admin_token')
        .expect(404);
    });
  });

  // -------------------------------------------------------------
  // CONCURRENCY & IDEMPOTENCY VERIFICATION
  // -------------------------------------------------------------
  describe('6. Idempotency & Concurrency Under High Load', () => {
    it('executes 10 concurrent settle requests atomically: exactly 1 succeeds (200), 9 return 409 Conflict', async () => {
      const promises = Array.from({ length: 10 }).map(() =>
        request(app.getHttpServer())
          .patch(`/api/v1/admin/payments/${cashPaymentOrderId2}/settle`)
          .set('Authorization', 'Bearer admin_token'),
      );

      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status);
      const count200 = statuses.filter((s) => s === 200).length;
      const count409 = statuses.filter((s) => s === 409).length;

      expect(count200).toBe(1);
      expect(count409).toBe(9);
      expect(statuses.includes(500)).toBe(false);

      const finalDb = await prisma.paymentOrder.findUnique({
        where: { id: cashPaymentOrderId2 },
      });
      expect(finalDb?.status).toBe('CASH_SETTLED');
    });
  });

  // -------------------------------------------------------------
  // CSV EXPORT VERIFICATION
  // -------------------------------------------------------------
  describe('7. CSV Export Functionality', () => {
    it('GET /api/v1/admin/payments?format=csv returns CSV file with headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/payments?format=csv')
        .set('Authorization', 'Bearer admin_token')
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('ID,Date,Booking ID,Customer,Service,Provider,Amount (INR),Method,Status');
    });
  });
});
