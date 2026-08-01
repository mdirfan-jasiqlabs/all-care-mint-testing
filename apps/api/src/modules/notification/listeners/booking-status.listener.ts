import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BookingStatusChangedEvent } from '../../booking/events/booking-status-changed.event';
import { BookingDomainEventEmitter } from '../../booking/services/booking-domain-event.emitter';

@Injectable()
export class BookingStatusListener implements OnModuleInit {
  private readonly logger = new Logger(BookingStatusListener.name);

  constructor(
    @InjectQueue('NotificationQueue')
    private readonly notificationQueue: Queue,
    private readonly domainEventEmitter: BookingDomainEventEmitter,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing BookingStatusListener domain event listener...');
    this.domainEventEmitter.onBookingStatusChanged(async (event: BookingStatusChangedEvent) => {
      await this.handleBookingStatusChanged(event);
    });
  }

  async handleBookingStatusChanged(event: BookingStatusChangedEvent): Promise<void> {
    const { bookingId, status, statusHistoryId, timestamp } = event;
    const jobId = `notif-${bookingId}-${status}-${statusHistoryId || timestamp}`;

    this.logger.log(
      `[BookingStatusListener] Received domain event for booking=${bookingId}, status=${status}. Enqueuing job=${jobId}`,
    );

    try {
      await this.notificationQueue.add('dispatch_push', event, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      this.logger.log(`[NotificationQueue Producer] Job ${jobId} successfully enqueued.`);
    } catch (err) {
      this.logger.warn(
        `[NotificationQueue Producer Warning] Queue unavailable for job ${jobId}: ${err.message}. Booking transaction preserved.`,
      );
    }
  }
}
