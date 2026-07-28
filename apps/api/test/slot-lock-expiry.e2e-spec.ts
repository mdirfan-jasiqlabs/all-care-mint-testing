jest.mock('jose', () => ({}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { BookingModule } from '../src/modules/booking/booking.module';
import { SlotLockExpiryService } from '../src/modules/booking/services/slot-lock-expiry.service';
import { BookingService } from '../src/modules/booking/services/booking.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

// Mock bullmq
const mockRepeatableJobs = [
  { key: 'old-job-key-1', name: 'SlotLockExpiryJob' }
];
const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
const mockRemoveRepeatableByKey = jest.fn().mockResolvedValue(true);
const mockGetRepeatableJobs = jest.fn().mockResolvedValue(mockRepeatableJobs);

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        getRepeatableJobs: mockGetRepeatableJobs,
        removeRepeatableByKey: mockRemoveRepeatableByKey,
        add: mockAdd,
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Booking Slot Lock Expiry (e2e)', () => {
  jest.setTimeout(60000);
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let expiryService: SlotLockExpiryService;
  let bookingService: BookingService;

  const testCustomerId = '8c1ea001-c812-42ea-a417-000000000001';
  const testAddressId = '3c1ea001-c812-42ea-a417-000000000001';
  const testSlotId = '4c1ea001-c812-42ea-a417-000000000001';
  const testServiceId = '5c1ea001-c812-42ea-a417-000000000001';
  const testCategoryId = '6c1ea001-c812-42ea-a417-000000000001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, BookingModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    // Middleware to inject test customer user details
    app.use((req: any, res: any, next: any) => {
      req.user = { id: testCustomerId, role: 'CUSTOMER' };
      next();
    });

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    expiryService = moduleFixture.get<SlotLockExpiryService>(SlotLockExpiryService);
    bookingService = moduleFixture.get<BookingService>(BookingService);

    await app.init();

    // Clean up test data first
    await cleanDb();

    // Seed required database items
    await prisma.customer.create({
      data: {
        id: testCustomerId,
        mobileNumber: '+919999999999',
        displayName: 'Test Lock Customer',
      },
    });

    await prisma.customerAddress.create({
      data: {
        id: testAddressId,
        customerId: testCustomerId,
        label: 'Test E2E Address',
        addressLine1: '456 Test Road',
        city: 'Bengaluru',
        pincode: '560103',
      },
    });

    await prisma.bookingTimeSlot.create({
      data: {
        id: testSlotId,
        label: '11:00 AM - 12:00 PM',
        startTime: new Date('1970-01-01T11:00:00Z'),
        endTime: new Date('1970-01-01T12:00:00Z'),
        isActive: true,
        displayOrder: 2,
      },
    });

    await prisma.serviceCategory.create({
      data: {
        id: testCategoryId,
        name: 'Lock Category',
        displayOrder: 2,
      },
    });

    await prisma.service.create({
      data: {
        id: testServiceId,
        categoryId: testCategoryId,
        name: 'Lock Service',
        fixedPrice: 750.00,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
    await app.close();
  });

  async function cleanDb() {
    await prisma.bookingStatusHistory.deleteMany({
      where: { bookingId: { not: undefined } },
    });
    await prisma.bookingSlotLock.deleteMany({
      where: { id: { not: undefined } },
    });
    await prisma.booking.deleteMany({
      where: { customerId: testCustomerId },
    });
    await prisma.idempotencyKey.deleteMany({
      where: { customerId: testCustomerId },
    });
    await prisma.customerAddress.deleteMany({
      where: { customerId: testCustomerId },
    });
    await prisma.service.deleteMany({
      where: { id: testServiceId },
    });
    await prisma.serviceCategory.deleteMany({
      where: { id: testCategoryId },
    });
    await prisma.bookingTimeSlot.deleteMany({
      where: { id: testSlotId },
    });
    await prisma.customer.deleteMany({
      where: { id: testCustomerId },
    });
  }

  // TC-002-013: Run cleanup with expired unbooked lock -> lock deleted, slot AVAILABLE
  it('TC-002-013: should delete expired lock and make slot available when booking_id is null', async () => {
    const expiredDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
    const lock = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-01'),
        customerId: testCustomerId,
        expiresAt: expiredDate,
      },
    });

    // Run background worker cleanup logic
    await expiryService.runCleanup();

    // Verify database record is deleted
    const dbLock = await prisma.bookingSlotLock.findUnique({
      where: { id: lock.id },
    });
    expect(dbLock).toBeNull();
  });

  // TC-002-014: Run cleanup with expired lock having booking -> lock preserved
  it('TC-002-014: should NOT delete lock if booking_id is not null (confirmed booking lock)', async () => {
    const expiredDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
    
    // Create test booking
    const booking = await prisma.booking.create({
      data: {
        bookingReference: 'ACM-TEST-TC14',
        customerId: testCustomerId,
        serviceId: testServiceId,
        serviceNameSnapshot: 'Lock Service',
        servicePriceSnapshot: 750.00,
        addressSnapshot: { label: 'Home', addressLine1: '456 Test Road' },
        slotDate: new Date('2026-08-02'),
        slotId: testSlotId,
        slotLabelSnapshot: '11:00 AM - 12:00 PM',
        paymentMethod: 'CASH_ON_SERVICE',
        status: 'PENDING',
        idempotencyKey: '7c1ea001-c812-42ea-a417-000000000002',
      },
    });

    const lock = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-02'),
        customerId: testCustomerId,
        expiresAt: expiredDate,
        bookingId: booking.id,
      },
    });

    // Run background worker cleanup logic
    await expiryService.runCleanup();

    // Verify database record is preserved
    const dbLock = await prisma.bookingSlotLock.findUnique({
      where: { id: lock.id },
    });
    expect(dbLock).not.toBeNull();
    expect(dbLock?.bookingId).toBe(booking.id);
  });

  it('should preserve future locks (expiresAt > now)', async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes from now
    const lock = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-03'),
        customerId: testCustomerId,
        expiresAt: futureDate,
      },
    });

    await expiryService.runCleanup();

    const dbLock = await prisma.bookingSlotLock.findUnique({
      where: { id: lock.id },
    });
    expect(dbLock).not.toBeNull();
    expect(dbLock?.id).toBe(lock.id);
  });

  it('should clean up multiple expired locks in a single run', async () => {
    const expiredDate = new Date(Date.now() - 1000 * 60);
    const lock1 = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-04'),
        customerId: testCustomerId,
        expiresAt: expiredDate,
      },
    });
    const lock2 = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-05'),
        customerId: testCustomerId,
        expiresAt: expiredDate,
      },
    });

    await expiryService.runCleanup();

    const dbLock1 = await prisma.bookingSlotLock.findUnique({
      where: { id: lock1.id },
    });
    const dbLock2 = await prisma.bookingSlotLock.findUnique({
      where: { id: lock2.id },
    });

    expect(dbLock1).toBeNull();
    expect(dbLock2).toBeNull();
  });

  it('should be idempotent and not fail when no locks are expired', async () => {
    await expect(expiryService.runCleanup()).resolves.not.toThrow();
  });

  it('should verify concurrency 1 and repeatable job registration on boot', async () => {
    expect(Queue).toHaveBeenCalledWith(
      'SlotLockExpiryQueue',
      expect.objectContaining({ connection: expect.any(Object) }),
    );

    expect(Worker).toHaveBeenCalledWith(
      'SlotLockExpiryQueue',
      expect.any(Function),
      expect.objectContaining({
        concurrency: 1,
      }),
    );

    // Verify duplicate job prevention
    expect(mockGetRepeatableJobs).toHaveBeenCalled();
    expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith('old-job-key-1');
    expect(mockAdd).toHaveBeenCalledWith(
      'SlotLockExpiryJob',
      {},
      expect.objectContaining({
        repeat: { pattern: '*/2 * * * *' },
        jobId: 'SlotLockExpiryJob',
      }),
    );
  });

  it('should roll back lock deletions when a database transaction error occurs', async () => {
    const expiredDate = new Date(Date.now() - 1000 * 60);
    const lock = await prisma.bookingSlotLock.create({
      data: {
        slotId: testSlotId,
        slotDate: new Date('2026-08-06'),
        customerId: testCustomerId,
        expiresAt: expiredDate,
      },
    });

    // Mock prisma.$transaction to throw error
    const spyTransaction = jest.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Simulated DB Error'));

    await expiryService.runCleanup();

    // Verify lock is NOT deleted because of rollback
    const dbLock = await prisma.bookingSlotLock.findUnique({
      where: { id: lock.id },
    });
    expect(dbLock).not.toBeNull();
    expect(dbLock?.id).toBe(lock.id);

    spyTransaction.mockRestore();
  });

  it('should verify lock slot, cleanup, and re-lock slot success flow', async () => {
    const dateStr = '2026-08-07';

    // 1. Lock slot via API
    const response1 = await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .send({
        slotId: testSlotId,
        date: dateStr,
      })
      .expect(201);

    expect(response1.body.success).toBe(true);
    expect(response1.body.data.lockId).toBeDefined();

    const lockId = response1.body.data.lockId;

    // 2. Force expire the lock in the database
    await prisma.bookingSlotLock.update({
      where: { id: lockId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // 3. Run cleanup
    await expiryService.runCleanup();

    // Verify DB lock is deleted
    const dbLockAfterCleanup = await prisma.bookingSlotLock.findUnique({
      where: { id: lockId },
    });
    expect(dbLockAfterCleanup).toBeNull();

    // 4. Re-lock the same slot via API should succeed
    const response2 = await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .send({
        slotId: testSlotId,
        date: dateStr,
      })
      .expect(201);

    expect(response2.body.success).toBe(true);
    expect(response2.body.data.lockId).toBeDefined();
    expect(response2.body.data.lockId).not.toBe(lockId);
  });

  it('should run full MOD-002 regression (lock -> checkout -> cancel)', async () => {
    const dateStr = '2026-08-08';
    const idempotencyKey = '7c1ea001-c812-42ea-a417-000000000099';

    // 1. Lock slot
    const lockResponse = await request(app.getHttpServer())
      .post('/api/v1/bookings/slots/lock')
      .send({
        slotId: testSlotId,
        date: dateStr,
      })
      .expect(201);

    expect(lockResponse.body.success).toBe(true);

    // 2. Create Booking
    const bookingResponse = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .set('x-idempotency-key', idempotencyKey)
      .send({
        serviceId: testServiceId,
        slotId: testSlotId,
        slotDate: dateStr,
        addressId: testAddressId,
        paymentMethod: 'CASH_ON_SERVICE',
      })
      .expect(201);

    expect(bookingResponse.body.success).toBe(true);
    const bookingId = bookingResponse.body.data.bookingId;

    // Verify lock has bookingId linked in DB
    const dbLockLinked = await prisma.bookingSlotLock.findFirst({
      where: { slotId: testSlotId, slotDate: new Date(dateStr) },
    });
    expect(dbLockLinked).not.toBeNull();
    expect(dbLockLinked?.bookingId).toBe(bookingId);

    // Run cleanup - should preserve lock because bookingId is linked
    await expiryService.runCleanup();
    const dbLockPreserved = await prisma.bookingSlotLock.findFirst({
      where: { slotId: testSlotId, slotDate: new Date(dateStr) },
    });
    expect(dbLockPreserved).not.toBeNull();

    // 3. Cancel Booking
    const cancelResponse = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${bookingId}/cancel`)
      .send({ reason: 'E2E Regression Cancel' })
      .expect(200);

    expect(cancelResponse.body.success).toBe(true);
    expect(cancelResponse.body.data.status).toBe('CANCELLED');

    // Verify lock is deleted after cancellation
    const dbLockAfterCancel = await prisma.bookingSlotLock.findFirst({
      where: { slotId: testSlotId, slotDate: new Date(dateStr) },
    });
    expect(dbLockAfterCancel).toBeNull();
  });
});
