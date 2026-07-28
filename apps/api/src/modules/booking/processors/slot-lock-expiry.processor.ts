import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { SlotLockExpiryService } from '../services/slot-lock-expiry.service';

@Processor('SlotLockExpiryQueue', { concurrency: 1 })
export class SlotLockExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(SlotLockExpiryProcessor.name);

  constructor(private readonly slotLockExpiryService: SlotLockExpiryService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'SlotLockExpiryJob') {
      this.logger.log('🔄 Executing repeatable SlotLockExpiryJob...');
      await this.slotLockExpiryService.runCleanup();
    }
  }
}
