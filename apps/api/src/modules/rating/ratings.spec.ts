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
import { RatingService } from './services/rating.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto/rating.dto';

describe('US-006-001 & MOD-006 Provider Ratings QA Audit Verification', () => {
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

  describe('TC-006-001 / AC-006-001: Successful Rating Submission', () => {
    it('should submit rating with HTTP 201 response contract (rating_id, rating, comment, created_at)', async () => {
      const mockBooking = {
        id: '89b4a4fe-c096-40bc-9068-55368d6382e6',
        customerId: 'customer-001',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.rating.findUnique.mockResolvedValue(null);
      prismaMock.rating.create.mockResolvedValue({
        id: 'rating-999',
        bookingId: '89b4a4fe-c096-40bc-9068-55368d6382e6',
        customerId: 'customer-001',
        providerId: 'provider-505',
        ratingScore: 4,
        reviewText: 'Great service!',
        createdAt: new Date('2026-08-03T10:00:00Z'),
      });

      const dto = new CreateRatingDto();
      dto.booking_id = '89b4a4fe-c096-40bc-9068-55368d6382e6';
      dto.rating = 4;
      dto.comment = 'Great service!';

      const result = await ratingService.createRating('customer-001', dto);

      expect(result).toBeDefined();
      expect(result.rating_id).toBe('rating-999');
      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Great service!');
      expect(result.created_at).toBeDefined();
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('TC-006-003 / AC-006-001: BOLA Protection (HTTP 403)', () => {
    it('should throw ForbiddenException (HTTP 403) when Customer A attempts to rate Customer B booking', async () => {
      const mockBooking = {
        id: 'booking-101',
        customerId: 'customer-B',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

      const dto = new CreateRatingDto();
      dto.booking_id = 'booking-101';
      dto.rating = 5;

      await expect(
        ratingService.createRating('customer-A', dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException (HTTP 404) when booking UUID does not exist', async () => {
      prismaMock.booking.findUnique.mockResolvedValue(null);

      const dto = new CreateRatingDto();
      dto.booking_id = 'non-existent-uuid';
      dto.rating = 5;

      await expect(
        ratingService.createRating('customer-A', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('TC-006-004 / AC-006-002: Non-Completed Booking Status Guard (HTTP 409)', () => {
    const nonCompletedStatuses = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'STARTED', 'CANCELLED'];

    nonCompletedStatuses.forEach((status) => {
      it(`should throw ConflictException (HTTP 409) when booking status is ${status}`, async () => {
        const mockBooking = {
          id: 'booking-102',
          customerId: 'customer-001',
          providerId: 'provider-505',
          status,
        };
        prismaMock.booking.findUnique.mockResolvedValue(mockBooking);

        const dto = new CreateRatingDto();
        dto.booking_id = 'booking-102';
        dto.rating = 5;

        try {
          await ratingService.createRating('customer-001', dto);
          fail('Should have thrown ConflictException');
        } catch (err: any) {
          expect(err).toBeInstanceOf(ConflictException);
          expect(err.getResponse()).toMatchObject({
            error: 'Rating can only be submitted for completed bookings',
          });
        }
      });
    });
  });

  describe('TC-006-002 / AC-006-001: Duplicate Rating Guard (HTTP 409)', () => {
    it('should throw ConflictException (HTTP 409) if rating already exists', async () => {
      const mockBooking = {
        id: 'booking-101',
        customerId: 'customer-001',
        providerId: 'provider-505',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.rating.findUnique.mockResolvedValue({ id: 'existing-rating' });

      const dto = new CreateRatingDto();
      dto.booking_id = 'booking-101';
      dto.rating = 5;

      await expect(
        ratingService.createRating('customer-001', dto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('should reject rating = 0 with BadRequestException (400)', async () => {
      const dto = new CreateRatingDto();
      dto.booking_id = 'b-1';
      dto.rating = 0;
      await expect(ratingService.createRating('c-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject rating = 6 with BadRequestException (400)', async () => {
      const dto = new CreateRatingDto();
      dto.booking_id = 'b-1';
      dto.rating = 6;
      await expect(ratingService.createRating('c-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject decimal rating = 4.5 with BadRequestException (400)', async () => {
      const dto = new CreateRatingDto();
      dto.booking_id = 'b-1';
      dto.rating = 4.5;
      await expect(ratingService.createRating('c-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject comment > 500 characters with BadRequestException (400)', async () => {
      const dto = new CreateRatingDto();
      dto.booking_id = 'b-1';
      dto.rating = 5;
      dto.comment = 'a'.repeat(501);
      await expect(ratingService.createRating('c-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should accept comment = 500 characters', async () => {
      const mockBooking = {
        id: 'b-1',
        customerId: 'c-1',
        providerId: 'p-1',
        status: 'COMPLETED',
      };
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.rating.findUnique.mockResolvedValue(null);
      prismaMock.rating.create.mockResolvedValue({
        id: 'r-1',
        bookingId: 'b-1',
        ratingScore: 5,
        reviewText: 'a'.repeat(500),
        createdAt: new Date(),
      });

      const dto = new CreateRatingDto();
      dto.booking_id = 'b-1';
      dto.rating = 5;
      dto.comment = 'a'.repeat(500);

      const result = await ratingService.createRating('c-1', dto);
      expect(result).toBeDefined();
    });
  });
});
