import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';

export interface BookingStatusChangedEvent {
  bookingId: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  customerId: string;
  providerId?: string;
  serviceName?: string;
}

@Injectable()
export class BookingStatusListener {
  private readonly logger = new Logger(BookingStatusListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  async handleBookingStatusChanged(event: BookingStatusChangedEvent) {
    this.logger.log(`Received booking.status.changed event for booking: ${event.bookingId}`);

    const { bookingId, status, customerId, providerId, serviceName } = event;

    if (status === 'ASSIGNED' && providerId) {
      // Notify Provider
      await this.notificationService.sendPushToUser(
        providerId,
        'New Job Assigned',
        `New Job Assigned: ${serviceName || 'Service'}`,
        { booking_id: bookingId, type: 'assignment' },
      );
      // Notify Customer
      await this.notificationService.sendPushToUser(
        customerId,
        'Provider assigned!',
        'Your booking is now assigned to a provider.',
        { booking_id: bookingId, type: 'status_update' },
      );
    } else if (status === 'ACCEPTED') {
      // Notify Customer
      await this.notificationService.sendPushToUser(
        customerId,
        'Booking Accepted',
        'Provider has accepted your booking.',
        { booking_id: bookingId, type: 'status_update' },
      );
    } else if (status === 'ON_THE_WAY') {
      // Notify Customer
      await this.notificationService.sendPushToUser(
        customerId,
        'Provider On The Way',
        'Your service provider is on the way!',
        { booking_id: bookingId, type: 'status_update' },
      );
    } else if (status === 'COMPLETED') {
      // Notify Customer
      await this.notificationService.sendPushToUser(
        customerId,
        'Service Completed',
        'Your booking has been completed. Please rate your provider!',
        { booking_id: bookingId, type: 'rating_prompt' },
      );
    } else if (status === 'CANCELLED' && providerId) {
      // Notify Provider
      await this.notificationService.sendPushToUser(
        providerId,
        'Booking Cancelled',
        'A booking assigned to you has been cancelled.',
        { booking_id: bookingId, type: 'cancellation' },
      );
    }
  }
}
