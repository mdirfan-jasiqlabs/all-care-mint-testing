import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getStartOfBusinessDay,
  getEndOfBusinessDay,
  getISTDateParts,
} from '../../../common/utils/date.util';

@Injectable()
export class AnalyticsProjectionService {
  private readonly logger = new Logger(AnalyticsProjectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically recompute and upsert daily analytics for a given IST date string (YYYY-MM-DD) or Date object.
   * This operation is 100% idempotent: running it multiple times produces identical accurate results.
   */
  async recomputeDailyBucket(dateInput: string | Date): Promise<any> {
    const targetDate = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const { year, month, day } = getISTDateParts(targetDate);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const startDate = getStartOfBusinessDay(dateStr);
    const endDate = getEndOfBusinessDay(dateStr);
    const bucketDbDate = new Date(`${dateStr}T00:00:00.000Z`);

    const [
      bookingCount,
      completedBookings,
      cancelledBookings,
      unassignedCount,
      onlineAggr,
      cashSettledAggr,
      completedCashAggr,
    ] = await Promise.all([
      // 1. Total bookings created on this date
      this.prisma.booking.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // 2. Completed bookings updated on this date
      this.prisma.booking.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      // 3. Cancelled bookings updated on this date
      this.prisma.booking.count({
        where: {
          status: 'CANCELLED',
          updatedAt: { gte: startDate, lte: endDate },
        },
      }),
      // 4. Unassigned bookings created on this date
      this.prisma.booking.count({
        where: {
          status: 'PENDING',
          providerId: null,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // 5. Online Revenue
      this.prisma.paymentOrder.aggregate({
        where: {
          status: 'PAYMENT_SUCCESS',
          updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPaise: true },
      }),
      // 6. Cash Settled Revenue
      this.prisma.paymentOrder.aggregate({
        where: {
          status: 'CASH_SETTLED',
          updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPaise: true },
      }),
      // 7. Completed Cash Revenue (when not already cash settled at any time)
      (this.prisma.booking as any).aggregate({
        where: {
          status: 'COMPLETED',
          paymentMethod: 'CASH_ON_SERVICE',
          updatedAt: { gte: startDate, lte: endDate },
          paymentOrders: {
            none: {
              status: 'CASH_SETTLED',
            },
          },
        },
        _sum: { servicePriceSnapshot: true },
      }),
    ]);

    const onlineRevenuePaise = BigInt(onlineAggr._sum?.amountPaise || 0);
    const cashSettledRevenuePaise = BigInt(cashSettledAggr._sum?.amountPaise || 0);
    const completedCashInr = Number(completedCashAggr._sum?.servicePriceSnapshot || 0);
    const completedCashRevenuePaise = BigInt(Math.round(completedCashInr * 100));

    const totalRevenuePaise = onlineRevenuePaise + cashSettledRevenuePaise + completedCashRevenuePaise;

    const upserted = await this.prisma.dailyAnalytics.upsert({
      where: { date: bucketDbDate },
      create: {
        date: bucketDbDate,
        bookingCount,
        completedBookings,
        cancelledBookings,
        revenuePaise: totalRevenuePaise,
        onlineRevenuePaise,
        cashSettledRevenuePaise,
        completedCashRevenuePaise,
        unassignedCount,
      },
      update: {
        bookingCount,
        completedBookings,
        cancelledBookings,
        revenuePaise: totalRevenuePaise,
        onlineRevenuePaise,
        cashSettledRevenuePaise,
        completedCashRevenuePaise,
        unassignedCount,
      },
    });

    this.logger.log(
      `[AnalyticsProjection] Recomputed bucket for ${dateStr}: bookings=${bookingCount}, revenuePaise=${totalRevenuePaise}`,
    );

    return upserted;
  }
}
