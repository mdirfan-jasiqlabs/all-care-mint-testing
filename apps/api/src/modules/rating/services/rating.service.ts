import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminRatingsQueryDto,
  CreateRatingDto,
  resolveBookingId,
  resolveRatingScore,
  resolveReviewText,
} from '../dto/rating.dto';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/admin/ratings
   * Paginated ratings ledger for Admin
   */
  async getAdminRatings(query: AdminRatingsQueryDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.page_size) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.provider_id) {
      where.providerId = query.provider_id;
    }

    if (query.min_rating) {
      if (query.min_rating === 'LOW') {
        where.ratingScore = { lte: 2 };
      } else if (query.min_rating === '5') {
        where.ratingScore = 5;
      } else if (query.min_rating === '4') {
        where.ratingScore = { gte: 4 };
      } else if (query.min_rating === '3') {
        where.ratingScore = { lte: 3 };
      } else {
        const num = Number(query.min_rating);
        if (!isNaN(num)) {
          where.ratingScore = { gte: num };
        }
      }
    }

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) {
        where.createdAt.gte = new Date(query.date_from);
      }
      if (query.date_to) {
        const toDate = new Date(query.date_to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    if (query.provider_search) {
      where.OR = [
        { provider: { displayName: { contains: query.provider_search, mode: 'insensitive' } } },
        { customer: { displayName: { contains: query.provider_search, mode: 'insensitive' } } },
      ];
    }

    const [total, records] = await Promise.all([
      this.prisma.rating.count({ where }),
      this.prisma.rating.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { displayName: true, mobileNumber: true } },
          provider: { select: { displayName: true, mobileNumber: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);

    const formattedData = records.map((r) => ({
      id: r.id,
      rating_id: r.id,
      date: r.createdAt.toISOString(),
      booking_id: r.booking?.bookingReference || r.bookingId,
      customer_name: r.customer?.displayName || 'Customer',
      provider_name: r.provider?.displayName || 'Provider',
      rating: r.ratingScore,
      rating_score: r.ratingScore,
      comment: r.reviewText,
      review_text: r.reviewText,
    }));

    return {
      data: formattedData,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * POST /api/v1/ratings
   * Submit rating for completed booking
   */
  async createRating(customerId: string, dto: CreateRatingDto) {
    const bookingId = resolveBookingId(dto);
    const ratingScore = resolveRatingScore(dto);
    const reviewText = resolveReviewText(dto);

    if (!bookingId) {
      throw new BadRequestException('booking_id or bookingId is required');
    }

    if (!ratingScore || ratingScore < 1 || ratingScore > 5 || !Number.isInteger(ratingScore)) {
      throw new BadRequestException('rating must be an integer between 1 and 5');
    }

    if (reviewText && reviewText.length > 500) {
      throw new BadRequestException('comment must not exceed 500 characters');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${bookingId}`);
    }

    // BOLA Ownership Check (AC-006-001 & AC-006-002: MUST return HTTP 403 Forbidden)
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('Access denied: You do not own this booking');
    }

    // Submission Window Check (AC-006-002: MUST return HTTP 409 Conflict)
    if (booking.status !== 'COMPLETED') {
      throw new ConflictException({
        statusCode: 409,
        error: 'Rating can only be submitted for completed bookings',
        message: 'Rating can only be submitted for completed bookings',
      });
    }

    // Check duplicate rating (AC-006-001: MUST return HTTP 409 Conflict)
    const existing = await this.prisma.rating.findUnique({
      where: { bookingId },
    });
    if (existing) {
      throw new ConflictException(`Rating already submitted for booking: ${bookingId}`);
    }

    if (!booking.providerId) {
      throw new BadRequestException('Booking does not have an assigned provider to rate');
    }

    // Atomic DB Transaction
    const rating = await this.prisma.$transaction(async (tx) => {
      return await tx.rating.create({
        data: {
          bookingId,
          customerId,
          providerId: booking.providerId!,
          ratingScore,
          reviewText: reviewText || null,
        },
      });
    });

    return {
      id: rating.id,
      rating_id: rating.id,
      booking_id: rating.bookingId,
      bookingId: rating.bookingId,
      rating: rating.ratingScore,
      rating_score: rating.ratingScore,
      ratingScore: rating.ratingScore,
      comment: rating.reviewText,
      review_text: rating.reviewText,
      reviewText: rating.reviewText,
      created_at: rating.createdAt,
      createdAt: rating.createdAt,
    };
  }

  /**
   * GET /api/v1/ratings/booking/:bookingId
   * Retrieve customer's rating for a specific booking
   */
  async getRatingForBooking(customerId: string, bookingId: string) {
    const rating = await this.prisma.rating.findFirst({
      where: { customerId, bookingId },
    });

    if (!rating) {
      return null;
    }

    return {
      id: rating.id,
      rating_id: rating.id,
      booking_id: rating.bookingId,
      bookingId: rating.bookingId,
      rating: rating.ratingScore,
      rating_score: rating.ratingScore,
      ratingScore: rating.ratingScore,
      comment: rating.reviewText,
      review_text: rating.reviewText,
      reviewText: rating.reviewText,
      created_at: rating.createdAt,
      createdAt: rating.createdAt,
    };
  }
}
