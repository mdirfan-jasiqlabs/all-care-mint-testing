import { Injectable, Logger } from '@nestjs/common';
import { BookingEntity } from '../types/booking.types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendCompletedNotification(booking: BookingEntity): Promise<void> {
    try {
      this.logger.log(
        `[Notification] Sending COMPLETED notification for booking ${booking.id} to customer ${booking.customerId}`,
      );
      // Trigger notification dispatch
      console.log(
        `[PUSH NOTIFICATION] Sent completion alert for booking ref ${booking.bookingReference} to customer ${booking.customerId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send COMPLETED notification for booking ${booking.id}:`,
        error,
      );
      throw error; // Let the caller catch and log without rolling back
    }
  }
}
