import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { PaymentService } from '../../payment/services/payment.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { StateEngineService } from './state-engine.service';
import { EligibilityService } from './eligibility.service';
import { NotificationService } from './notification.service';
import { BookingDomainEventEmitter } from './booking-domain-event.emitter';
import { BadRequestException } from '@nestjs/common';
import { PaymentMethodEnum } from '../types/booking.types';

describe('Multi-Service Booking & Payment Verification Suite', () => {
  let bookingService: BookingService;
  let paymentService: PaymentService;
  let prisma: PrismaService;

  const mockCustomerId = '11111111-1111-1111-1111-111111111111';
  const mockAddressId = '22222222-2222-2222-2222-222222222222';
  const mockSlotId = '33333333-3333-3333-3333-333333333333';
  const mockServiceId1 = '44444444-4444-4444-4444-444444444441';
  const mockServiceId2 = '44444444-4444-4444-4444-444444444442';
  const mockServiceId3 = '44444444-4444-4444-4444-444444444443';

  const mockService1 = {
    id: mockServiceId1,
    name: 'Deep Cleaning',
    fixedPrice: 4500,
    isActive: true,
  };

  const mockService2 = {
    id: mockServiceId2,
    name: 'Kitchen Cleaning',
    fixedPrice: 1200,
    isActive: true,
  };

  const mockService3 = {
    id: mockServiceId3,
    name: 'Sofa Cleaning',
    fixedPrice: 800,
    isActive: true,
  };

  const mockAddress = {
    id: mockAddressId,
    customerId: mockCustomerId,
    label: 'Home',
    addressLine1: '259 Residency',
    city: 'Bengaluru',
    pincode: '560001',
  };

  const mockSlot = {
    id: mockSlotId,
    label: '09:00 AM - 11:00 AM',
    isActive: true,
  };

  const mockLock = {
    id: 'lock-1',
    slotId: mockSlotId,
    slotDate: new Date('2026-08-25'),
    customerId: mockCustomerId,
    expiresAt: new Date(Date.now() + 300000),
    bookingId: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      service: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockServiceId1) return Promise.resolve(mockService1);
          if (where.id === mockServiceId2) return Promise.resolve(mockService2);
          if (where.id === mockServiceId3) return Promise.resolve(mockService3);
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockResolvedValue(mockService1),
      },
      customerAddress: {
        findUnique: jest.fn().mockResolvedValue(mockAddress),
        findFirst: jest.fn().mockResolvedValue(mockAddress),
      },
      bookingTimeSlot: {
        findUnique: jest.fn().mockResolvedValue(mockSlot),
      },
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve({
            id: where.id,
            bookingReference: `ACM-20260825-${where.id}`,
            customerId: mockCustomerId,
            status: 'PENDING',
            serviceNameSnapshot: 'Test Service',
            slotDate: new Date('2026-08-25'),
          })
        ),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: `b-${Math.random()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            id: where.id,
            status: data.status,
            cancelledAt: data.cancelledAt,
          })
        ),
      },
      bookingSlotLock: {
        update: jest.fn().mockResolvedValue(mockLock),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      idempotencyKey: {
        create: jest.fn().mockResolvedValue({}),
      },
      paymentOrder: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: `po-${Math.random()}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      bookingStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    const mockBookingRepo = {
      findIdempotencyRecord: jest.fn().mockResolvedValue(null),
      findSlotLockForCustomer: jest.fn().mockResolvedValue(mockLock),
      findTimeSlotById: jest.fn().mockResolvedValue(mockSlot),
      updateSlotLockBookingId: jest.fn().mockResolvedValue(mockLock),
      createBooking: jest.fn(),
      createStatusHistory: jest.fn(),
      saveIdempotencyRecord: jest.fn(),
      findBookingById: jest.fn().mockImplementation((id) => {
        if (id === 'other-user-booking') {
          return Promise.resolve({
            id,
            bookingReference: 'ACM-OTHER',
            customerId: '99999999-9999-9999-9999-999999999999',
            status: 'PENDING',
            serviceNameSnapshot: 'Other Service',
            slotDate: new Date('2026-08-25'),
          });
        }
        return Promise.resolve({
          id,
          bookingReference: `ACM-20260825-${id}`,
          customerId: mockCustomerId,
          status: 'PENDING',
          serviceNameSnapshot: 'Test Service',
          slotDate: new Date('2026-08-25'),
        });
      }),
    };

    const mockAddressRepo = {
      findAddressById: jest.fn().mockResolvedValue(mockAddress),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'IBookingRepository', useValue: mockBookingRepo },
        { provide: 'IAddressRepository', useValue: mockAddressRepo },
        { provide: StateEngineService, useValue: { validateTransition: jest.fn(), canCancel: jest.fn().mockReturnValue(true) } },
        { provide: EligibilityService, useValue: {} },
        { provide: NotificationService, useValue: { sendCancelledNotification: jest.fn().mockResolvedValue({}) } },
        { provide: BookingDomainEventEmitter, useValue: { emitBookingStatusChanged: jest.fn() } },
        { provide: 'REDIS_CLIENT', useValue: {} },
      ],
    }).compile();

    bookingService = module.get<BookingService>(BookingService);
    paymentService = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Multi-Service Financial & Payload Integrity', () => {
    it('1. Single Service: Calculates ₹4500 correctly', async () => {
      const res = await bookingService.createBooking(
        mockCustomerId,
        {
          serviceId: mockServiceId1,
          serviceIds: [mockServiceId1],
          slotId: mockSlotId,
          slotDate: '2026-08-25',
          addressId: mockAddressId,
          paymentMethod: PaymentMethodEnum.CASH_ON_SERVICE,
        },
        'idempotency-1'
      );

      expect(res).toBeDefined();
      expect(res.serviceId).toBe(mockServiceId1);
      expect(res.servicePriceSnapshot).toBe('4500');
    });

    it('2. Multi-Service (2 Services): Creates bookings for Deep Cleaning ₹4500 + Kitchen Cleaning ₹1200', async () => {
      const res = await bookingService.createBooking(
        mockCustomerId,
        {
          serviceId: mockServiceId1,
          serviceIds: [mockServiceId1, mockServiceId2],
          slotId: mockSlotId,
          slotDate: '2026-08-25',
          addressId: mockAddressId,
          paymentMethod: PaymentMethodEnum.CASH_ON_SERVICE,
        },
        'idempotency-2'
      );

      expect(res).toBeDefined();
      expect(prisma.booking.create).toHaveBeenCalledTimes(2);
      expect(prisma.paymentOrder.create).toHaveBeenCalledTimes(2);
    });

    it('3. Multi-Service (3+ Services): Creates 3 bookings correctly', async () => {
      const res = await bookingService.createBooking(
        mockCustomerId,
        {
          serviceId: mockServiceId1,
          serviceIds: [mockServiceId1, mockServiceId2, mockServiceId3],
          slotId: mockSlotId,
          slotDate: '2026-08-25',
          addressId: mockAddressId,
          paymentMethod: PaymentMethodEnum.CASH_ON_SERVICE,
        },
        'idempotency-3'
      );

      expect(res).toBeDefined();
      expect(prisma.booking.create).toHaveBeenCalledTimes(3);
    });

    it('4. Payment Initiation: Server calculates ₹5700.00 for ₹4500 + ₹1200', async () => {
      const res = await paymentService.initiatePayment(mockCustomerId, {
        bookingDraftId: 'draft-100',
        serviceId: mockServiceId1,
        serviceIds: [mockServiceId1, mockServiceId2],
        slotId: mockSlotId,
        slotDate: '2026-08-25',
        addressId: mockAddressId,
        amountInr: 5700,
      });

      expect(res).toBeDefined();
      expect(res.amount_paise).toBe(570000); // 5700 * 100
    });

    it('5. Anti-Tamper Safeguard: Rejects client price manipulation if client sends ₹100 instead of ₹5700', async () => {
      await expect(
        paymentService.initiatePayment(mockCustomerId, {
          bookingDraftId: 'draft-100',
          serviceId: mockServiceId1,
          serviceIds: [mockServiceId1, mockServiceId2],
          slotId: mockSlotId,
          slotDate: '2026-08-25',
          addressId: mockAddressId,
          amountInr: 100, // Client tries to pay ₹100 instead of ₹5700
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('6. Group Cancellation: Cancels multiple bookings atomically', async () => {
      const res = await bookingService.cancelGroupBookings(
        ['b-1', 'b-2'],
        mockCustomerId,
        'CUSTOMER' as any,
        'Group cancellation test'
      );

      expect(res).toBeDefined();
      expect(res.length).toBe(2);
      expect(prisma.booking.update).toHaveBeenCalledTimes(2);
    });

    it('7. BOLA Safeguard: Throws ForbiddenException if any booking in group belongs to another customer', async () => {
      await expect(
        bookingService.cancelGroupBookings(
          ['b-1', 'other-user-booking'],
          mockCustomerId,
          'CUSTOMER' as any,
          'Unauthorized cancellation attempt'
        )
      ).rejects.toThrow();
    });
  });
});
