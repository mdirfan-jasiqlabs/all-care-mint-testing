import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsProjectionService } from './analytics-projection.service';
import { getISTDateParts } from '../../../common/utils/date.util';

@Injectable()
export class AnalyticsBackfillService {
  private readonly logger = new Logger(AnalyticsBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: AnalyticsProjectionService,
  ) {}

  /**
   * Production-safe historical backfill: iterates through all historical dates in batch ranges with bounded memory.
   */
  async runBackfill(fromDate?: Date, toDate?: Date): Promise<{ processedDays: number; startDate: string; endDate: string }> {
    this.logger.log('[AnalyticsBackfill] Starting historical analytics backfill...');

    let start: Date;
    let end: Date = toDate || new Date();

    if (fromDate) {
      start = fromDate;
    } else {
      // Find oldest record in Booking or PaymentOrder
      const [oldestBooking, oldestPayment] = await Promise.all([
        this.prisma.booking.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        this.prisma.paymentOrder.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      ]);

      const bookingDate = oldestBooking?.createdAt;
      const paymentDate = oldestPayment?.createdAt;

      if (bookingDate && paymentDate) {
        start = bookingDate < paymentDate ? bookingDate : paymentDate;
      } else {
        start = bookingDate || paymentDate || new Date();
      }
    }

    // Iterate day by day in IST timezone
    let curr = new Date(start.getTime());
    let processedDays = 0;

    const endDateParts = getISTDateParts(end);
    const endStr = `${endDateParts.year}-${String(endDateParts.month).padStart(2, '0')}-${String(endDateParts.day).padStart(2, '0')}`;

    const startDateParts = getISTDateParts(start);
    const startStr = `${startDateParts.year}-${String(startDateParts.month).padStart(2, '0')}-${String(startDateParts.day).padStart(2, '0')}`;

    while (true) {
      const parts = getISTDateParts(curr);
      const currStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

      await this.projectionService.recomputeDailyBucket(currStr);
      processedDays++;

      if (currStr === endStr) {
        break;
      }

      // Increment date by 1 day
      curr.setDate(curr.getDate() + 1);

      // Safety bound to avoid infinite loop
      if (processedDays > 3650) {
        this.logger.warn('[AnalyticsBackfill] Reached max safety bound of 3650 days');
        break;
      }
    }

    this.logger.log(`[AnalyticsBackfill] Historical backfill complete! Processed ${processedDays} days (${startStr} to ${endStr})`);
    return { processedDays, startDate: startStr, endDate: endStr };
  }
}
