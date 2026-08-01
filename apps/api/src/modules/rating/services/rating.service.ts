import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminRatingsQueryDto, CreateRatingDto } from '../dto/rating.dto';

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
      date: r.createdAt.toISOString(),
      booking_id: r.booking?.bookingReference || r.bookingId,
      customer_name: r.customer?.displayName || 'Customer',
      provider_name: r.provider?.displayName || 'Provider',
      rating_score: r.ratingScore,
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
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${dto.bookingId}`);
    }

    // BOLA Ownership Check (AC-006-002)
    if (booking.customerId !== customerId) {
      throw new NotFoundException(`Booking not found or access denied: ${dto.bookingId}`);
    }

    // Submission Window Check (AC-006-001)
    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException(`Rating only permitted for COMPLETED bookings (current status: ${booking.status})`);
    }

    // Check duplicate rating
    const existing = await this.prisma.rating.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      throw new ConflictException(`Rating already submitted for booking: ${dto.bookingId}`);
    }

    if (!booking.providerId) {
      throw new BadRequestException('Booking does not have an assigned provider to rate');
    }

    const rating = await this.prisma.rating.create({
      data: {
        bookingId: dto.bookingId,
        customerId,
        providerId: booking.providerId,
        ratingScore: dto.ratingScore,
        reviewText: dto.reviewText || null,
      },
    });

    return {
      id: rating.id,
      booking_id: rating.bookingId,
      rating_score: rating.ratingScore,
      review_text: rating.reviewText,
      created_at: rating.createdAt,
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
      booking_id: rating.bookingId,
      rating_score: rating.ratingScore,
      review_text: rating.reviewText,
      created_at: rating.createdAt,
    };
  }
}
