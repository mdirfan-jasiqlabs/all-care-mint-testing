import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { BookingStatusChangedEvent } from '../events/booking-status-changed.event';

@Injectable()
export class BookingDomainEventEmitter {
  private readonly logger = new Logger(BookingDomainEventEmitter.name);
  private readonly emitter = new EventEmitter();

  emitBookingStatusChanged(event: BookingStatusChangedEvent): void {
    this.logger.log(
      `[Domain Event] Emitting BookingStatusChangedEvent for booking=${event.bookingId}, status=${event.status}, historyId=${event.statusHistoryId ?? 'N/A'}`,
    );
    this.emitter.emit('booking.status.changed', event);
  }

  onBookingStatusChanged(handler: (event: BookingStatusChangedEvent) => Promise<void> | void): void {
    this.emitter.on('booking.status.changed', async (event: BookingStatusChangedEvent) => {
      try {
        await handler(event);
      } catch (err) {
        this.logger.error(
          `[Domain Event Handler Error] Failed to handle booking.status.changed: ${err.message}`,
        );
      }
    });
  }
}
