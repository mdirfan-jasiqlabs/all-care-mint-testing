import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsProjectionService } from '../services/analytics-projection.service';

@Processor('AnalyticsProjectionQueue', { concurrency: 2 })
@Injectable()
export class AnalyticsProjectionProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsProjectionProcessor.name);

  constructor(private readonly projectionService: AnalyticsProjectionService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'recompute_daily_bucket' || job.name === 'AnalyticsProjectionJob') {
      const dateStr = job.data?.dateStr || job.data?.date;
      if (dateStr) {
        this.logger.log(`[BullMQ Worker] Processing recompute_daily_bucket for date=${dateStr}...`);
        await this.projectionService.recomputeDailyBucket(dateStr);
      }
    }
  }
}
