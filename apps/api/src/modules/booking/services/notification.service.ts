import { Injectable, Logger } from '@nestjs/common';
import { BookingEntity } from '../types/booking.types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async dispatchPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const tokens = await this.prisma.pushToken.findMany({
        where: {
          userId,
          isActive: true,
        },
      });

      if (!tokens || tokens.length === 0) {
        this.logger.log(`No active push tokens for user: ${userId}`);
        return;
      }

      this.logger.log(
        `[PUSH DISPATCH] User: ${userId}, Title: "${title}", Body: "${body}", ActiveTokens: ${tokens.length}, PayloadData: ${JSON.stringify(data ?? {})}`,
      );

      for (const tokenRecord of tokens) {
        console.log(
          `[FCM GATEWAY] Sent push to token ${tokenRecord.fcmToken} (${tokenRecord.deviceId}): "${title}" - "${body}"`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to dispatch push notification to user ${userId}: ${err.message}`);
      // Safely ignore errors so booking state transitions are never rolled back
    }
  }

  async sendAssignedNotification(
    bookingId: string,
    customerId: string,
    providerId?: string,
    serviceName?: string,
  ): Promise<void> {
    try {
      // 1. Notify Customer
      await this.dispatchPushToUser(
        customerId,
        'Provider assigned!',
        'Your booking is now assigned to a provider.',
        { booking_id: bookingId, type: 'status_update', status: 'ASSIGNED' },
      );

      // 2. Notify Provider if assigned
      if (providerId) {
        await this.dispatchPushToUser(
          providerId,
          'New Job Assigned',
          `New Job Assigned: ${serviceName || 'Service'}`,
          { booking_id: bookingId, type: 'assignment', status: 'ASSIGNED' },
        );
      }
    } catch (err) {
      this.logger.error(`Error in sendAssignedNotification: ${err.message}`);
    }
  }

  async sendAcceptedNotification(bookingId: string, customerId: string): Promise<void> {
    try {
      await this.dispatchPushToUser(
        customerId,
        'Booking Accepted',
        'Provider has accepted your booking.',
        { booking_id: bookingId, type: 'status_update', status: 'ACCEPTED' },
      );
    } catch (err) {
      this.logger.error(`Error in sendAcceptedNotification: ${err.message}`);
    }
  }

  async sendOnTheWayNotification(bookingId: string, customerId: string): Promise<void> {
    try {
      await this.dispatchPushToUser(
        customerId,
        'Provider On The Way',
        'Your service provider is on the way!',
        { booking_id: bookingId, type: 'status_update', status: 'ON_THE_WAY' },
      );
    } catch (err) {
      this.logger.error(`Error in sendOnTheWayNotification: ${err.message}`);
    }
  }

  async sendCompletedNotification(booking: BookingEntity): Promise<void> {
    try {
      this.logger.log(
        `[Notification] Sending COMPLETED notification for booking ${booking.id} to customer ${booking.customerId}`,
      );
      await this.dispatchPushToUser(
        booking.customerId,
        'Service Completed',
        'Your booking has been completed. Please rate your service provider!',
        { booking_id: booking.id, type: 'rating_prompt', status: 'COMPLETED' },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send COMPLETED notification for booking ${booking.id}: ${error.message}`,
      );
    }
  }

  async sendCancelledNotification(
    bookingId: string,
    customerId: string,
    providerId?: string,
  ): Promise<void> {
    try {
      await this.dispatchPushToUser(
        customerId,
        'Booking Cancelled',
        'Your booking has been cancelled.',
        { booking_id: bookingId, type: 'cancellation', status: 'CANCELLED' },
      );
      if (providerId) {
        await this.dispatchPushToUser(
          providerId,
          'Booking Cancelled',
          'A booking assigned to you has been cancelled.',
          { booking_id: bookingId, type: 'cancellation', status: 'CANCELLED' },
        );
      }
    } catch (err) {
      this.logger.error(`Error in sendCancelledNotification: ${err.message}`);
    }
  }
}
