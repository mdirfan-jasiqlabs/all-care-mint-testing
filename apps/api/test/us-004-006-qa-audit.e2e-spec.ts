import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentModule } from '../src/modules/payment/payment.module';
import { BookingModule } from '../src/modules/booking/booking.module';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import * as crypto from 'crypto';

describe('US-004-006 QA Audit E2E: Payment Failure Handling & Retry UI', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let customerId = '9a1ea001-c812-42ea-a417-000000000061';
  let customerBId = '9a1ea001-c812-42ea-a417-000000000062';
  let providerId = '9a1ea001-c812-42ea-a417-000000000063';
  let serviceId: string;
  let addressId: string;
  let slotId: string;
  const targetDateStr = '2026-08-25';

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

  function computeSignature(payloadObj: any): string {
    const rawBody = JSON.stringify(payloadObj);
    return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PaymentModule, BookingModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers.authorization || '';
          if (authHeader.includes('Bearer customer_b_token')) {
            req.user = { id: customerBId, role: 'CUSTOMER' };
          } else if (authHeader.includes('Bearer provider_token')) {
            req.user = { id: providerId, role: 'PROVIDER' };
          } else if (authHeader.includes('Bearer admin_token')) {
            req.user = { id: 'admin_123', role: 'ADMIN' };
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

    // 1. Setup Customer A
    const cust = await prisma.customer.upsert({
      where: { mobileNumber: '+919999004006' },
      update: {},
      create: {
        id: customerId,
        mobileNumber: '+919999004006',
        displayName: 'US-004-006 Customer A',
      },
    });
    customerId = cust.id;

    // 2. Setup Customer B
    const custB = await prisma.customer.upsert({
      where: { mobileNumber: '+919999004007' },
      update: {},
      create: {
        id: customerBId,
        mobileNumber: '+919999004007',
        displayName: 'US-004-006 Customer B',
      },
    });
    customerBId = custB.id;

    // 3. Setup Customer Address
    const addr = await prisma.customerAddress.create({
      data: {
        customerId,
        label: 'Home',
        addressLine1: '123 QA Audit Street',
        city: 'Bengaluru',
        pincode: '560001',
      },
    });
    addressId = addr.id;

    // 4. Setup Service
    const svc = await prisma.service.create({
      data: {
        name: 'US-004-006 Deep Cleaning',
        categoryId: (await prisma.serviceCategory.findFirst({ where: { isActive: true } }))?.id || '',
        fixedPrice: 499.0,
        estimatedDuration: '60 mins',
        isActive: true,
      },
    });
    serviceId = svc.id;

    // 5. Setup Time Slot
    const slot = await prisma.bookingTimeSlot.findFirst({ where: { isActive: true } });
    if (slot) {
      slotId = slot.id;
    } else {
      const newSlot = await prisma.bookingTimeSlot.create({
        data: {
          startTime: '10:00',
          endTime: '11:00',
          label: '10:00 AM - 11:00 AM',
          isActive: true,
        },
      });
      slotId = newSlot.id;
    }
  });

  afterAll(async () => {
    await prisma.paymentOrder.deleteMany({
      where: { customerId: { in: [customerId, customerBId] } },
    });
    await prisma.bookingSlotLock.deleteMany({
      where: { customerId: { in: [customerId, customerBId] } },
    });
    await prisma.bookingStatusHistory.deleteMany({
      where: { actorId: { in: [customerId, customerBId] } },
    });
    await prisma.booking.deleteMany({
      where: { customerId: { in: [customerId, customerBId] } },
    });
    await prisma.customerAddress.deleteMany({
      where: { id: addressId },
    });
    await prisma.service.deleteMany({
      where: { id: serviceId },
    });
    await app.close();
  });

  it('1. Mandatory AC-004-005 Flow: Online Payment Failure -> Status Polling -> Cash Fallback Booking Creation', async () => {
    // Step A: Lock Slot
    const lockRes = await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: targetDateStr })
      .expect(201);
    expect(lockRes.body.success).toBe(true);

    // Step B: Initiate Online Payment
    const draftId = `draft_qa_${Date.now()}`;
    const initRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: draftId,
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        amountInr: 499,
      })
      .expect(201);

    expect(initRes.body.success).toBe(true);
    const razorpayOrderId = initRes.body.data.razorpay_order_id;
    const paymentOrderId = initRes.body.data.payment_order_id;
    expect(razorpayOrderId).toBeDefined();

    // Verify DB initial state: PAYMENT_PENDING, 0 bookings
    const initialPaymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });
    expect(initialPaymentOrder.status).toBe('PAYMENT_PENDING');
    expect(initialPaymentOrder.bookingId).toBeNull();

    // Step C: Trigger payment.failed webhook
    const failPayload = {
      event: 'payment.failed',
      razorpay_order_id: razorpayOrderId,
      payload: {
        payment: {
          entity: {
            id: `pay_fail_${Date.now()}`,
            order_id: razorpayOrderId,
            error_description: 'Card declined by issuing bank',
          },
        },
      },
    };
    const failSig = computeSignature(failPayload);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', failSig)
      .send(failPayload)
      .expect(201);

    // Verify DB: paymentOrder status becomes PAYMENT_FAILED, no booking created
    const failedPaymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });
    expect(failedPaymentOrder.status).toBe('PAYMENT_FAILED');
    expect(failedPaymentOrder.bookingId).toBeNull();
    expect(failedPaymentOrder.failureReason).toBe('Card declined by issuing bank');

    // Step D: Status Polling GET /api/v1/payments/status/:order_id
    const statusRes = await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${razorpayOrderId}`)
      .set('Authorization', 'Bearer customer_token')
      .expect(200);

    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.status).toBe('PAYMENT_FAILED');
    expect(statusRes.body.data.booking_id).toBeNull();

    // Step E: Customer switches to Pay with Cash (CASH_ON_SERVICE)
    const cashIdempotencyKey = `idem_cash_${Date.now()}`;
    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', cashIdempotencyKey)
      .send({
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    expect(cashRes.body.success).toBe(true);
    const newCashBookingId = cashRes.body.data.bookingId;
    expect(newCashBookingId).toBeDefined();
    expect(cashRes.body.data.paymentMethod).toBe('CASH_ON_SERVICE');

    // Mandatory AC-004-005 Verification:
    // 1. Original failed payment order remains intact in DB as PAYMENT_FAILED
    const originalOrderAfterCash = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
    });
    expect(originalOrderAfterCash.status).toBe('PAYMENT_FAILED');
    expect(originalOrderAfterCash.paymentMethod).toBe('ONLINE');
    expect(originalOrderAfterCash.razorpayOrderId).toBe(razorpayOrderId);
    expect(originalOrderAfterCash.bookingId).toBeNull();

    // 2. Exactly one CASH booking exists for this customer
    const customerBookings = await prisma.booking.findMany({
      where: { customerId },
    });
    expect(customerBookings.length).toBe(1);
    expect(customerBookings[0].id).toBe(newCashBookingId);
    expect(customerBookings[0].paymentMethod).toBe('CASH_ON_SERVICE');

    // 3. A new CASH_PENDING payment_order record exists for the new cash booking
    const cashPaymentOrders = await prisma.paymentOrder.findMany({
      where: { customerId, paymentMethod: 'CASH_ON_SERVICE' },
    });
    expect(cashPaymentOrders.length).toBe(1);
    expect(cashPaymentOrders[0].bookingId).toBe(newCashBookingId);
    expect(cashPaymentOrders[0].status).toBe('CASH_PENDING');
  });

  it('2. Status API BOLA & Auth Verification', async () => {
    const dummyOrderId = 'order_bola_test_123';

    // Unauthenticated -> HTTP 401
    await request(app.getHttpServer())
      .get(`/api/v1/payments/status/${dummyOrderId}`)
      .expect(401);

    // Customer B accessing Customer A payment order -> HTTP 403
    const orderA = await prisma.paymentOrder.findFirst({ where: { customerId } });
    if (orderA) {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/status/${orderA.razorpayOrderId}`)
        .set('Authorization', 'Bearer customer_b_token')
        .expect(403);
    }
  });

  it('3. Try Again Verification: Failed Online Order retried and succeeded', async () => {
    // Initiate new online payment order
    const draftId = `draft_retry_${Date.now()}`;
    const initRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: draftId,
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        amountInr: 499,
      })
      .expect(201);

    const razorpayOrderId = initRes.body.data.razorpay_order_id;
    const paymentOrderId = initRes.body.data.payment_order_id;

    // Fail payment
    const failPayload = {
      event: 'payment.failed',
      razorpay_order_id: razorpayOrderId,
    };
    const failSig = computeSignature(failPayload);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', failSig)
      .send(failPayload)
      .expect(201);

    const failRecord = await prisma.paymentOrder.findUnique({ where: { id: paymentOrderId } });
    expect(failRecord.status).toBe('PAYMENT_FAILED');

    // Customer clicks "Try Again" and payment succeeds via payment.captured webhook
    const mockPayId = `pay_retry_succ_${Date.now()}`;
    const succPayload = {
      event: 'payment.captured',
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: mockPayId,
      payload: {
        payment: {
          entity: { id: mockPayId, order_id: razorpayOrderId, amount: 49900, currency: 'INR' },
        },
      },
    };
    const succSig = computeSignature(succPayload);

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', succSig)
      .send(succPayload)
      .expect(201);

    // Verify DB: paymentOrder status upgraded to PAYMENT_SUCCESS and booking linked
    const succRecord = await prisma.paymentOrder.findUnique({ where: { id: paymentOrderId } });
    expect(succRecord.status).toBe('PAYMENT_SUCCESS');
    expect(succRecord.bookingId).toBeDefined();
  });

  it('4. Repeated Payment Failure Webhook Idempotency', async () => {
    const draftId = `draft_idem_${Date.now()}`;
    const initRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: draftId,
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        amountInr: 499,
      })
      .expect(201);

    const razorpayOrderId = initRes.body.data.razorpay_order_id;
    const failPayload = {
      event: 'payment.failed',
      razorpay_order_id: razorpayOrderId,
    };
    const failSig = computeSignature(failPayload);

    // First call -> 201
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', failSig)
      .send(failPayload)
      .expect(201);

    // Duplicate call -> 201 with idempotent message
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', failSig)
      .send(failPayload)
      .expect(201);

    expect(res2.body.message).toContain('idempotent');
  });

  it('5. Late Webhook Audit: Late payment.captured arriving after Cash Fallback', async () => {
    // Initiate online payment
    const draftId = `draft_late_${Date.now()}`;
    const initRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', 'Bearer customer_token')
      .send({
        bookingDraftId: draftId,
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        amountInr: 499,
      })
      .expect(201);

    const onlineRazorpayOrderId = initRes.body.data.razorpay_order_id;
    const onlinePaymentOrderId = initRes.body.data.payment_order_id;

    // Fail online payment
    const failPayload = {
      event: 'payment.failed',
      razorpay_order_id: onlineRazorpayOrderId,
    };
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', computeSignature(failPayload))
      .send(failPayload)
      .expect(201);

    // Customer places Cash fallback booking
    const lockRes = await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .set('Authorization', 'Bearer customer_token')
      .send({ slotId, date: targetDateStr });

    const cashRes = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', `idem_late_cash_${Date.now()}`)
      .send({
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    const cashBookingId = cashRes.body.data.bookingId;

    // Late payment.captured webhook arrives for online payment
    const mockLatePayId = `pay_late_cap_${Date.now()}`;
    const lateCapPayload = {
      event: 'payment.captured',
      razorpay_order_id: onlineRazorpayOrderId,
      razorpay_payment_id: mockLatePayId,
      payload: {
        payment: {
          entity: { id: mockLatePayId, order_id: onlineRazorpayOrderId, amount: 49900, currency: 'INR' },
        },
      },
    };
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhook')
      .set('x-razorpay-signature', computeSignature(lateCapPayload))
      .send(lateCapPayload)
      .expect(201);

    // DEF-006-003 Verification Assertions:
    const onlineOrderFinal = await prisma.paymentOrder.findUnique({
      where: { id: onlinePaymentOrderId },
    });
    const cashBookingFinal = await prisma.booking.findUnique({
      where: { id: cashBookingId },
    });
    const cashOrderFinal = await prisma.paymentOrder.findFirst({
      where: { bookingId: cashBookingId, paymentMethod: 'CASH_ON_SERVICE' },
    });

    // 1. Online payment status is updated to PAYMENT_SUCCESS
    expect(onlineOrderFinal.status).toBe('PAYMENT_SUCCESS');
    // 2. Online payment order links to the EXISTING cash booking (no second booking created)
    expect(onlineOrderFinal.bookingId).toBe(cashBookingId);

    // 3. Financial Reconciliation: Cash payment order status transitioned from CASH_PENDING to CANCELLED (superseded)
    expect(cashOrderFinal).toBeDefined();
    expect(cashOrderFinal.status).toBe('CANCELLED');
    expect(cashOrderFinal.failureReason).toContain('Superseded by delayed online payment');

    // 4. Booking paymentMethod updated to ONLINE so Provider & APIs see online payment
    expect(cashBookingFinal.paymentMethod).toBe('ONLINE');

    // 5. Verify total non-cancelled bookings for Customer A on targetDateStr is EXACTLY 1
    const totalBookings = await prisma.booking.count({
      where: {
        customerId,
        slotId,
        slotDate: new Date(targetDateStr),
        status: { not: 'CANCELLED' },
      },
    });
    expect(totalBookings).toBe(1);

    // 6. Attempting to settle the CANCELLED cash order returns HTTP 409 Conflict
    const adminToken = 'admin_token';
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/payments/${cashOrderFinal.id}/settle`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    // 7. Verify attempting to create another booking for the same slot date returns HTTP 409 Conflict
    await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', 'Bearer customer_token')
      .set('x-idempotency-key', `idem_dup_attempt_${Date.now()}`)
      .send({
        serviceId,
        slotId,
        slotDate: targetDateStr,
        addressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(409);
  });
});
