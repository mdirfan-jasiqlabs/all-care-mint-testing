import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SlotLockExpirySchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SlotLockExpirySchedulerService.name);

  constructor(
    @InjectQueue('SlotLockExpiryQueue')
    private readonly queue: Queue,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('🌱 Starting repeatable SlotLockExpiryJob scheduler...');
    // Run asynchronously to avoid blocking NestJS app bootstrap if Redis is offline
    this.initializeScheduler().catch((err) => {
      this.logger.error(`Error registering repeatable job: ${err.message}`);
    });
  }

  private async initializeScheduler() {
    try {
      // Clear existing repeatable jobs to avoid duplicates after restart
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === 'SlotLockExpiryJob') {
          await this.queue.removeRepeatableByKey(job.key);
        }
      }

      // Register the repeatable job SlotLockExpiryJob to run every 2 minutes
      await this.queue.add(
        'SlotLockExpiryJob',
        {},
        {
          repeat: {
            pattern: '*/2 * * * *', // every 2 minutes
          },
          jobId: 'SlotLockExpiryJob', // prevent duplicate jobs
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      this.logger.log('📅 Repeatable job SlotLockExpiryJob scheduled to run every 2 minutes.');
    } catch (err) {
      this.logger.warn(`Could not setup repeatable job: ${err.message}`);
    }
  }
}
