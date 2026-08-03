jest.mock('jose', () => ({}));

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
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        getRepeatableJobs: jest.fn().mockResolvedValue([]),
        removeRepeatableByKey: jest.fn().mockResolvedValue(true),
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
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

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RatingService } from '../src/modules/rating/services/rating.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MOD-006 Provider Ratings Module Verification', () => {
  let ratingService: RatingService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        findUnique: jest.fn(),
      },
      rating: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    ratingService = module.get<RatingService>(RatingService);
  });

  describe('TC-006-001 / TC-006-003: createRating Success Flow', () => {
    it('should successfully submit rating for completed booking owned by customer', async () => {
      const mockBooking = {
        id: 'booking-101',
        customerId: 'customer-001',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.rating.findUnique.mockResolvedValue(null);
      prismaMock.rating.create.mockResolvedValue({
        id: 'rating-999',
        bookingId: 'booking-101',
        ratingScore: 5,
        reviewText: 'Excellent service!',
        createdAt: new Date('2026-08-03T10:00:00Z'),
      });

      const result = await ratingService.createRating('customer-001', {
        bookingId: 'booking-101',
        ratingScore: 5,
        reviewText: 'Excellent service!',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('rating-999');
      expect(result.rating_score).toBe(5);
      expect(prismaMock.rating.create).toHaveBeenCalled();
    });
  });

  describe('TC-006-007 / TC-006-009: BOLA Protection', () => {
    it('should throw ForbiddenException if customer does not own target booking', async () => {
      const mockBooking = {
        id: 'booking-101',
        customerId: 'customer-OTHER',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        ratingService.createRating('customer-001', {
          bookingId: 'booking-101',
          ratingScore: 4,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('TC-006-004: Status Guard Check', () => {
    it('should throw ConflictException if booking status is not COMPLETED', async () => {
      const mockBooking = {
        id: 'booking-102',
        customerId: 'customer-001',
        providerId: 'provider-505',
        status: 'PENDING',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        ratingService.createRating('customer-001', {
          bookingId: 'booking-102',
          ratingScore: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('TC-006-002 / TC-006-005: Duplicate Submission Protection', () => {
    it('should throw ConflictException if rating already exists for booking', async () => {
      const mockBooking = {
        id: 'booking-101',
        customerId: 'customer-001',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.rating.findUnique.mockResolvedValue({ id: 'existing-rating' });

      await expect(
        ratingService.createRating('customer-001', {
          bookingId: 'booking-101',
          ratingScore: 5,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('TC-006-013 / TC-006-015: Admin Ratings Ledger Audit', () => {
    it('should return paginated ratings list with metadata for admin', async () => {
      prismaMock.rating.count.mockResolvedValue(1);
      prismaMock.rating.findMany.mockResolvedValue([
        {
          id: 'rating-1',
          createdAt: new Date('2026-08-01T12:00:00Z'),
          bookingId: 'booking-1',
          ratingScore: 5,
          reviewText: 'Great!',
          customer: { displayName: 'John Customer' },
          provider: { displayName: 'Jane Provider' },
          booking: { bookingReference: 'ACM-BKG-1001' },
        },
      ]);

      const result = await ratingService.getAdminRatings({ page: 1, page_size: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].customer_name).toBe('John Customer');
      expect(result.data[0].provider_name).toBe('Jane Provider');
    });
  });
});
