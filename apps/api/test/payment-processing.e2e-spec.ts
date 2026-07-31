import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentModule } from '../src/modules/payment/payment.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import * as crypto from 'crypto';

describe('Payment Processing (MOD-004 e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let mockCustomerId = '9a1ea001-c812-42ea-a417-000000000001';
  let mockCustomerBId = '9a1ea001-c812-42ea-a417-000000000004';
  let mockProviderId = '9a1ea001-c812-42ea-a417-000000000002';
  const mockAdminId = '9a1ea001-c812-42ea-a417-000000000003';
  let createdPaymentOrderId: string;
  let createdRazorpayOrderId: string;
  let cashPaymentOrderId: string;

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

  function computeSignature(payloadObj: any): string {
    const rawBody = JSON.stringify(payloadObj);
    return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PaymentModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization || '';
          if (authHeader.includes('Bearer admin_token')) {
            req.user = { id: mockAdminId, role: 'ADMIN' };
          } else if (authHeader.includes('Bearer provider_token')) {
            req.user = { id: mockProviderId, role: 'PROVIDER' };
          } else if (authHeader.includes('Bearer customer_b_token')) {
            req.user = { id: mockCustomerBId, role: 'CUSTOMER' };
          } else if (authHeader.includes('Bearer customer_token')) {
            req.user = { id: mockCustomerId, role: 'CUSTOMER' };
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

    // Setup mock records in DB
    const custA = await prisma.customer.upsert({
      where: { mobileNumber: '+919876543210' },
      update: {},
      create: {
        id: mockCustomerId,
        mobileNumber: '+919876543210',
        displayName: 'Test Payment Customer',
      },
    });
    mockCustomerId = custA.id;

    const custB = await prisma.customer.upsert({
      where: { mobileNumber: '+919876543299' },
      update: {},
      create: {
        id: mockCustomerBId,
        mobileNumber: '+919876543299',
        displayName: 'Test Customer B',
      },
    });
    mockCustomerBId = custB.id;

    const prov = await prisma.provider.upsert({
      where: { mobileNumber: '+919876543211' },
      update: {},
      create: {
        id: mockProviderId,
        mobileNumber: '+919876543211',
        displayName: 'Test Payment Provider',
        serviceArea: 'Indiranagar',
        status: 'APPROVED',
      },
    });
    mockProviderId = prov.id;

    // Create a mock Cash payment record for testing admin settlement
    const cashOrder = await prisma.paymentOrder.create({
      data: {
        customerId: mockCustomerId,
        amountPaise: 50000,
        paymentMethod: 'CASH_ON_SERVICE',
        status: 'CASH_PENDING',
      },
    });
    cashPaymentOrderId = cashOrder.id;
  });

  afterAll(async () => {
    await prisma.paymentOrder.deleteMany({
      where: { customerId: { in: [mockCustomerId, mockCustomerBId] } },
    });
    await prisma.booking.deleteMany({
      where: { customerId: { in: [mockCustomerId, mockCustomerBId] } },
    });
    await app.close();
  });

  it('TC-004-001: POST /api/v1/payments/initiate creates a Razorpay order and PAYMENT_PENDING record', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: 'draft_12345',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.razorpay_order_id).toBeDefined();

    createdPaymentOrderId = response.body.data.payment_order_id;
    createdRazorpayOrderId = response.body.data.razorpay_order_id;

    const dbRecord = await prisma.paymentOrder.findUnique({
      where: { id: createdPaymentOrderId },
    });
    expect(dbRecord).toBeDefined();
    expect(dbRecord.status).toBe('PAYMENT_PENDING');
  });

  it('DEF-004: POST /api/v1/payments/initiate rejects non-existent draft pattern with HTTP 404', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: 'non_existent_draft_xyz',
      })
      .expect(404);
  });

  it('TC-004-004: POST /api/v1/payments/webhook with invalid signature returns 400 Bad Request', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: createdRazorpayOrderId,
    };
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', 'invalid_signature_xyz')
      .send(payload)
      .expect(400);

    const dbRecord = await prisma.paymentOrder.findUnique({
      where: { id: createdPaymentOrderId },
    });
    expect(dbRecord.status).toBe('PAYMENT_PENDING');
  });

  it('TC-004-004-B: POST /api/v1/payments/webhook missing signature header returns 400 Bad Request', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: createdRazorpayOrderId,
    };
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .send(payload)
      .expect(400);
  });

  it('TC-004-002: POST /api/v1/payments/webhook with valid HMAC updates payment to PAYMENT_SUCCESS and creates 1 PENDING booking', async () => {
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: createdRazorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: createdRazorpayOrderId,
          },
        },
      },
    };
    const validSignature = computeSignature(payload);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', validSignature)
      .send(payload)
      .expect(201);

    const dbRecord = await prisma.paymentOrder.findUnique({
      where: { id: createdPaymentOrderId },
    });
    expect(dbRecord.status).toBe('PAYMENT_SUCCESS');
    expect(dbRecord.bookingId).toBeDefined();

    const booking = await prisma.booking.findUnique({
      where: { id: dbRecord.bookingId },
    });
    expect(booking).toBeDefined();
    expect(booking.status).toBe('PENDING');
  });

  it('TC-004-003: Duplicate webhook for same payment is idempotent and returns HTTP 200/201 with 0 duplicate bookings', async () => {
    const mockPaymentId = `pay_mock_idempotent_test`;
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: createdRazorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: createdRazorpayOrderId,
          },
        },
      },
    };
    const validSignature = computeSignature(payload);

    const initialBookingsCount = await prisma.booking.count({ where: { customerId: mockCustomerId } });

    // Second duplicate call
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', validSignature)
      .send(payload);

    expect(res.body.message).toContain('idempotent');

    const afterBookingsCount = await prisma.booking.count({ where: { customerId: mockCustomerId } });
    expect(afterBookingsCount).toBe(initialBookingsCount);
  });

  it('DEF-003: GET /api/v1/payments/status/:order_id enforces customer authentication & BOLA ownership', async () => {
    // Unauthenticated request -> 401
    await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${createdRazorpayOrderId}`)
      .expect(401);

    // Customer B accessing Customer A order -> 403
    await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${createdRazorpayOrderId}`)
      .set('Authorization', 'Bearer customer_b_token')
      .expect(403);

    // Customer A (owner) accessing own order -> 200
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${createdRazorpayOrderId}`)
      .set('Authorization', 'Bearer customer_token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PAYMENT_SUCCESS');
  });

  it('TC-004-006: GET /api/v1/admin/payments returns payments list and supports format=csv', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/payments')
      .set('Authorization', 'Bearer admin_token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);

    const csvRes = await request(app.getHttpServer())
      .get('/api/v1/admin/payments?format=csv')
      .set('Authorization', 'Bearer admin_token')
      .expect(200);

    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Amount (INR)');
  });

  it('TC-004-007: PATCH /api/v1/admin/payments/:id/settle updates cash payment status to CASH_SETTLED', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/payments/${cashPaymentOrderId}/settle`)
      .set('Authorization', 'Bearer admin_token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CASH_SETTLED');
  });

  it('TC-004-010: GET /api/v1/providers/me/earnings returns provider total earnings and jobs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/providers/me/earnings')
      .set('Authorization', 'Bearer provider_token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.total_earnings_inr).toBe('number');
    expect(Array.isArray(res.body.data.jobs)).toBe(true);
  });
});
