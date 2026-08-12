import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsProjectionService } from './analytics-projection.service';
import { getISTDateParts } from '../../../common/utils/date.util';
import Redis from 'ioredis';

@Injectable()
export class AnalyticsReconciliationService {
  private readonly logger = new Logger(AnalyticsReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: AnalyticsProjectionService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: Redis,
  ) {}

  /**
   * Periodically reconciles raw PostgreSQL source-of-truth tables against DailyAnalytics read model for the past N days.
   * If a mismatch is detected, it automatically repairs the bucket and invalidates Redis cache.
   */
  async reconcileRecentDays(daysCount: number = 7): Promise<{ reconciledDays: number; repairedDays: string[] }> {
    this.logger.log(`[AnalyticsReconciliation] Running reconciliation for past ${daysCount} days...`);
    const repairedDays: string[] = [];
    const now = new Date();

    for (let i = 0; i < daysCount; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const parts = getISTDateParts(checkDate);
      const dateStr = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

      // Recompute bucket deterministically
      const updatedBucket = await this.projectionService.recomputeDailyBucket(dateStr);
      repairedDays.push(dateStr);
    }

    // Invalidate Redis dashboard cache keys
    if (this.redisClient) {
      try {
        const keys = await this.redisClient.keys('admin:dashboard:metrics:*');
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          this.logger.log(`[AnalyticsReconciliation] Invalidated ${keys.length} Redis dashboard cache keys.`);
        }
      } catch (err: any) {
        this.logger.warn(`[AnalyticsReconciliation] Redis cache invalidation error: ${err.message}`);
      }
    }

    this.logger.log(`[AnalyticsReconciliation] Reconciliation finished! Reconciled ${repairedDays.length} days.`);
    return { reconciledDays: repairedDays.length, repairedDays };
  }
}
