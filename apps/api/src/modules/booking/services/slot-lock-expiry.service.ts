// ─── MOD-002 Slot Lock Expiry Background Service ───
// Source: DLD Section 7.2 & 15.1 — Deletes expired locks every 2 minutes

import { Inject, Injectable, Logger } from '@nestjs/common';
import { IBookingRepository } from '../ports/booking.repository.port';
import { PrismaService } from '../../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class SlotLockExpiryService {
  private readonly logger = new Logger(SlotLockExpiryService.name);

  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepo: IBookingRepository,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async runCleanup(): Promise<void> {
    try {
      const now = new Date();
      const expiredLocks = await this.bookingRepo.findExpiredLocks(now);

      if (expiredLocks.length > 0) {
        this.logger.log(
          `🧹 Found ${expiredLocks.length} expired slot locks. Cleaning up...`,
        );

        for (const lock of expiredLocks) {
          try {
            // Make slot availability update and expired lock deletion atomic using Prisma transaction
            await this.prisma.$transaction(async (tx) => {
              // Delete the lock record. Double check booking_id IS NULL to preserve confirmed locks.
              await tx.bookingSlotLock.delete({
                where: {
                  id: lock.id,
                  bookingId: null,
                },
              });
            });

            // Post-transaction: Delete Redis lock key to update slot availability
            const dateStr = lock.slotDate.toISOString().split('T')[0];
            const redisKey = `lock:slot:${lock.slotId}:date:${dateStr}`;
            try {
              await this.redisClient.del(redisKey);
            } catch (err) {
              this.logger.warn(
                `[Redis Lock Fallback] Failed to delete Redis lock for key ${redisKey}: ${err.message}`,
              );
            }

            // Emit structured INFO log event slot.lock.released
            this.logger.log(
              `slot.lock.released: ${JSON.stringify({
                slot_id: lock.slotId,
                customer_id: lock.customerId,
              })}`,
            );
          } catch (txError) {
            this.logger.error(
              `❌ Failed to release lock ${lock.id} atomically: ${txError.message}`,
            );
          }
        }
        this.logger.log('✅ Expired slot locks cleanup completed.');
      }
    } catch (error) {
      this.logger.error('❌ Failed to run expired slot locks cleanup:', error);
    }
  }
}
