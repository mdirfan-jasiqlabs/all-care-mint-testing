import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

describe('PaymentService (Unit Tests - DEF-007)', () => {
  let service: PaymentService;
  let prisma: PrismaService;

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

  function computeSignature(payloadObj: any): string {
    const rawBody = JSON.stringify(payloadObj);
    return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  }

  const mockCustomerId = '11111111-1111-1111-1111-111111111111';
  const mockServiceId = '22222222-2222-2222-2222-222222222222';
  const mockSlotId = '33333333-3333-3333-3333-333333333333';
  const mockAddressId = '44444444-4444-4444-4444-444444444444';
  const mockOrderId = 'order_unit_test_1001';
  const mockPaymentId = 'pay_unit_test_2001';

  let mockPaymentOrder: any;

  beforeEach(async () => {
    mockPaymentOrder = {
      id: '55555555-5555-5555-5555-555555555555',
      customerId: mockCustomerId,
      bookingDraftId: 'draft_100',
      serviceId: mockServiceId,
      slotId: mockSlotId,
      slotDate: new Date('2026-08-15'),
      addressId: mockAddressId,
      razorpayOrderId: mockOrderId,
      razorpayPaymentId: null,
      amountPaise: 149900,
      status: 'PAYMENT_PENDING',
      bookingId: null,
      idempotencyKey: '66666666-6666-6666-6666-666666666666',
    };

    const mockPrismaService = {
      paymentOrder: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.razorpayOrderId === mockOrderId) return Promise.resolve(mockPaymentOrder);
          return Promise.resolve(null);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockPaymentOrder.id) return Promise.resolve(mockPaymentOrder);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'po_new_1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => {
          Object.assign(mockPaymentOrder, data);
          return Promise.resolve(mockPaymentOrder);
        }),
      },
      service: {
        findUnique: jest.fn().mockResolvedValue({ id: mockServiceId, name: 'Home Cleaning', fixedPrice: 1499 }),
        findFirst: jest.fn().mockResolvedValue({ id: mockServiceId, name: 'Home Cleaning', fixedPrice: 1499 }),
      },
      customerAddress: {
        findUnique: jest.fn().mockResolvedValue({ id: mockAddressId, label: 'Home', addressLine1: '123 Main St', city: 'Bengaluru', pincode: '560001' }),
        findFirst: jest.fn().mockResolvedValue({ id: mockAddressId, label: 'Home', addressLine1: '123 Main St', city: 'Bengaluru', pincode: '560001' }),
      },
      bookingTimeSlot: {
        findUnique: jest.fn().mockResolvedValue({ id: mockSlotId, label: '09:00 AM - 10:00 AM' }),
        findFirst: jest.fn().mockResolvedValue({ id: mockSlotId, label: '09:00 AM - 10:00 AM' }),
      },
      booking: {
        create: jest.fn().mockResolvedValue({ id: 'booking_new_1', bookingReference: 'ACM-20260815-REF1', status: 'PENDING' }),
      },
      bookingStatusHistory: {
        create: jest.fn().mockResolvedValue({ id: 'bsh_new_1', status: 'PENDING' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('1. Webhook Signature: throws BadRequestException on missing signature', async () => {
    const payload = { event: 'payment.captured', razorpay_order_id: mockOrderId };
    await expect(service.handleWebhook(JSON.stringify(payload), '', payload)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('2. Webhook Signature: throws BadRequestException on invalid HMAC signature', async () => {
    const payload = { event: 'payment.captured', razorpay_order_id: mockOrderId };
    await expect(
      service.handleWebhook(JSON.stringify(payload), 'invalid_signature_123', payload),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. Payload Validation: throws BadRequestException on amount mismatch', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: mockOrderId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            amount: 100, // ₹1 instead of ₹1499
            currency: 'INR',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    await expect(service.handleWebhook(JSON.stringify(payload), signature, payload)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('4. Payload Validation: throws BadRequestException on currency mismatch', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: mockOrderId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            amount: 149900,
            currency: 'USD',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    await expect(service.handleWebhook(JSON.stringify(payload), signature, payload)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('5. Payload Validation: throws NotFoundException on unknown order ID', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: 'order_unknown_9999',
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: 'order_unknown_9999',
            amount: 149900,
            currency: 'INR',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    await expect(service.handleWebhook(JSON.stringify(payload), signature, payload)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('6. Successful Capture: marks payment PAYMENT_SUCCESS and creates 1 booking using persisted DB metadata', async () => {
    const payload = {
      event: 'payment.captured',
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            amount: 149900,
            currency: 'INR',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    const result = await service.handleWebhook(JSON.stringify(payload), signature, payload);

    expect(result.status).toBe('ok');
    expect(mockPaymentOrder.status).toBe('PAYMENT_SUCCESS');
    expect(mockPaymentOrder.razorpayPaymentId).toBe(mockPaymentId);
    expect(prisma.booking.create).toHaveBeenCalledTimes(1);
    expect(prisma.bookingStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it('7. Sequential Duplicate: returns HTTP 200 idempotent message and does not duplicate booking', async () => {
    mockPaymentOrder.status = 'PAYMENT_SUCCESS';
    mockPaymentOrder.razorpayPaymentId = mockPaymentId;
    mockPaymentOrder.bookingId = 'booking_existing_1';

    const payload = {
      event: 'payment.captured',
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            amount: 149900,
            currency: 'INR',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    const result = await service.handleWebhook(JSON.stringify(payload), signature, payload);

    expect(result.message).toContain('idempotent');
    expect(prisma.booking.create).toHaveBeenCalledTimes(0);
  });

  it('8. Status Downgrade Guard: payment.failed received after PAYMENT_SUCCESS returns HTTP 200 without status downgrade', async () => {
    mockPaymentOrder.status = 'PAYMENT_SUCCESS';
    mockPaymentOrder.razorpayPaymentId = mockPaymentId;

    const payload = {
      event: 'payment.failed',
      razorpay_order_id: mockOrderId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            error_description: 'Belated failure event',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    const result = await service.handleWebhook(JSON.stringify(payload), signature, payload);

    expect(result.status).toBe('ok');
    expect(mockPaymentOrder.status).toBe('PAYMENT_SUCCESS'); // Status MUST REMAIN PAYMENT_SUCCESS
  });

  it('9. Concurrency P2002 Absorption: absorbs Prisma P2002 constraint error gracefully into HTTP 200 idempotent response', async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed' });

    const payload = {
      event: 'payment.captured',
      razorpay_order_id: mockOrderId,
      razorpay_payment_id: mockPaymentId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            amount: 149900,
            currency: 'INR',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    const result = await service.handleWebhook(JSON.stringify(payload), signature, payload);

    expect(result.status).toBe('ok');
    expect(result.message).toContain('idempotent');
  });

  it('10. Payment Failed: updates status to PAYMENT_FAILED when pending', async () => {
    const payload = {
      event: 'payment.failed',
      razorpay_order_id: mockOrderId,
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: mockOrderId,
            error_description: 'Insufficient funds',
          },
        },
      },
    };
    const signature = computeSignature(payload);
    const result = await service.handleWebhook(JSON.stringify(payload), signature, payload);

    expect(result.status).toBe('ok');
    expect(mockPaymentOrder.status).toBe('PAYMENT_FAILED');
  });
});
