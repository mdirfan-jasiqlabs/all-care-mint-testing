// ─── MOD-002 Slot Lock Expiry Background Service ───
// Source: DLD Section 7.2 & 15.1 — Deletes expired locks every 2 minutes

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { IBookingRepository } from '../ports/booking.repository.port';

@Injectable()
export class SlotLockExpiryService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SlotLockExpiryService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepo: IBookingRepository,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('🌱 Starting Slot Lock Expiry Background Worker...');
    // Run immediately on boot
    this.runCleanup();
    // Schedule to run every 2 minutes (120,000 ms)
    this.cleanupInterval = setInterval(
      () => {
        this.runCleanup();
      },
      2 * 60 * 1000,
    );
  }

  onApplicationShutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🛑 Stopped Slot Lock Expiry Background Worker.');
    }
  }

  async runCleanup(): Promise<void> {
    try {
      const now = new Date();
      const expiredLocks = await this.bookingRepo.findExpiredLocks(now);

      if (expiredLocks.length > 0) {
        this.logger.log(
          `🧹 Found ${expiredLocks.length} expired slot locks. Cleaning up...`,
        );
        for (const lock of expiredLocks) {
          await this.bookingRepo.deleteSlotLock(lock.id);
          this.logger.debug(
            `🗑️ Released expired lock: ${lock.id} for slot ${lock.slotId} on ${lock.slotDate.toISOString().split('T')[0]}`,
          );
        }
        this.logger.log('✅ Expired slot locks cleanup completed.');
      }
    } catch (error) {
      this.logger.error('❌ Failed to run expired slot locks cleanup:', error);
    }
  }
}
