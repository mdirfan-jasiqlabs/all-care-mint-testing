import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { BookingStatusChangedEvent } from '../../booking/events/booking-status-changed.event';
import { TokenRegistryService } from '../services/token-registry.service';
import { IFcmGateway } from '../ports/fcm-gateway.interface';
import { ExpoPushAdapter } from '../adapters/expo-push.adapter';

@Processor('NotificationQueue', { concurrency: 5 })
@Injectable()
export class NotificationWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    private readonly tokenRegistry: TokenRegistryService,
    @Inject(IFcmGateway)
    private readonly fcmGateway: IFcmGateway,
    private readonly expoPushAdapter: ExpoPushAdapter,
  ) {
    super();
  }

  private maskToken(token: string): string {
    if (!token) return '***';
    if (token.length <= 12) return token.slice(0, 3) + '...';
    return token.slice(0, 6) + '...' + token.slice(-4);
  }

  async process(job: Job<BookingStatusChangedEvent>): Promise<any> {
    const event = job.data;
    this.logger.log(
      `[NotificationWorker] Processing job=${job.id} for booking=${event.bookingId}, status=${event.status}, attempt=${job.attemptsMade + 1}`,
    );

    const deliveredTokensSet = new Set<string>(event.deliveredTokens || []);
    let temporaryFailuresEncountered = false;

    const recipients: { userId: string; title: string; body: string; dataPayload: Record<string, string> }[] = [];

    const { bookingId, status, customerId, providerId, serviceName, slotDate, slotLabel } = event;

    if (status === 'ASSIGNED') {
      recipients.push({
        userId: customerId,
        title: 'Provider assigned!',
        body: 'Your booking is now assigned to a provider.',
        dataPayload: { booking_id: bookingId, type: 'status_update', status: 'ASSIGNED' },
      });
      if (providerId) {
        let bodyText = `New Job Assigned: ${serviceName || 'Service'}`;
        if (slotDate) {
          const dateObj = typeof slotDate === 'string' ? new Date(slotDate) : slotDate;
          const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : String(slotDate);
          bodyText += ` on ${dateStr}`;
          if (slotLabel) {
            bodyText += ` at ${slotLabel}`;
          }
        } else if (slotLabel) {
          bodyText += ` at ${slotLabel}`;
        }
        bodyText += '.';

        recipients.push({
          userId: providerId,
          title: 'New Job Assigned',
          body: bodyText,
          dataPayload: { booking_id: bookingId, type: 'new_assignment', status: 'ASSIGNED' },
        });
      }
    } else if (status === 'ACCEPTED') {
      recipients.push({
        userId: customerId,
        title: 'Booking Accepted',
        body: 'Provider has accepted your booking.',
        dataPayload: { booking_id: bookingId, type: 'status_update', status: 'ACCEPTED' },
      });
    } else if (status === 'ON_THE_WAY') {
      recipients.push({
        userId: customerId,
        title: 'Provider On The Way',
        body: 'Your service provider is on the way!',
        dataPayload: { booking_id: bookingId, type: 'status_update', status: 'ON_THE_WAY' },
      });
    } else if (status === 'COMPLETED') {
      recipients.push({
        userId: customerId,
        title: 'Service Completed',
        body: 'Your booking has been completed. Please rate your provider!',
        dataPayload: { booking_id: bookingId, type: 'rating_prompt', status: 'COMPLETED' },
      });
    } else if (status === 'CANCELLED') {
      recipients.push({
        userId: customerId,
        title: 'Booking Cancelled',
        body: 'Your booking has been cancelled.',
        dataPayload: { booking_id: bookingId, type: 'cancellation', status: 'CANCELLED' },
      });
      if (providerId) {
        recipients.push({
          userId: providerId,
          title: 'Booking Cancelled',
          body: 'A booking assigned to you has been cancelled.',
          dataPayload: { booking_id: bookingId, type: 'cancellation', status: 'CANCELLED' },
        });
      }
    }

    for (const recipient of recipients) {
      const activeTokens = await this.tokenRegistry.getActiveTokensForUser(recipient.userId);
      if (!activeTokens || activeTokens.length === 0) {
        this.logger.log(`[NotificationWorker] No active tokens for recipient user=${recipient.userId}`);
        continue;
      }

      const fcmTokens: string[] = [];
      const expoTokens: string[] = [];

      for (const t of activeTokens) {
        if (deliveredTokensSet.has(t.fcmToken)) {
          this.logger.log(
            `[NotificationWorker] Skipping already delivered token: ${this.maskToken(t.fcmToken)} for user=${recipient.userId}`,
          );
          continue;
        }

        if (t.fcmToken.startsWith('ExponentPushToken[') || t.fcmToken.startsWith('expo_fcm_')) {
          expoTokens.push(t.fcmToken);
        } else {
          fcmTokens.push(t.fcmToken);
        }
      }

      // Process FCM Tokens
      if (fcmTokens.length > 0) {
        const fcmResult = await this.fcmGateway.sendMulticast(
          fcmTokens,
          recipient.title,
          recipient.body,
          recipient.dataPayload,
        );

        // Deactivate permanently invalid tokens
        for (const invToken of fcmResult.invalidTokens || []) {
          this.logger.warn(`[NotificationWorker] Deactivating invalid FCM token: ${this.maskToken(invToken)}`);
          await this.tokenRegistry.deactivateInvalidToken(invToken);
        }

        // Handle temporary failure / rate-limit without deactivating token
        if ((fcmResult.rateLimitedTokens && fcmResult.rateLimitedTokens.length > 0) || (fcmResult.failedTokens && fcmResult.failedTokens.length > 0)) {
          temporaryFailuresEncountered = true;
          this.logger.warn(`[NotificationWorker] Temporary FCM failure or rate-limit encountered. Token(s) retained for retry.`);
        }

        // Record successful deliveries to prevent duplicate push on job retry
        for (const token of fcmTokens) {
          if (!fcmResult.invalidTokens?.includes(token) && !fcmResult.rateLimitedTokens?.includes(token) && !fcmResult.failedTokens?.includes(token)) {
            deliveredTokensSet.add(token);
          }
        }
      }

      // Process Expo Tokens
      if (expoTokens.length > 0) {
        const expoResult = await this.expoPushAdapter.sendExpoPushNotifications(
          expoTokens,
          recipient.title,
          recipient.body,
          recipient.dataPayload,
        );

        for (const invToken of expoResult.invalidTokens || []) {
          this.logger.warn(`[NotificationWorker] Deactivating invalid Expo token: ${this.maskToken(invToken)}`);
          await this.tokenRegistry.deactivateInvalidToken(invToken);
        }

        if ((expoResult.rateLimitedTokens && expoResult.rateLimitedTokens.length > 0) || (expoResult.failedTokens && expoResult.failedTokens.length > 0)) {
          temporaryFailuresEncountered = true;
          this.logger.warn(`[NotificationWorker] Temporary Expo failure or rate-limit encountered. Token(s) retained for retry.`);
        }

        for (const token of expoTokens) {
          if (!expoResult.invalidTokens?.includes(token) && !expoResult.rateLimitedTokens?.includes(token) && !expoResult.failedTokens?.includes(token)) {
            deliveredTokensSet.add(token);
          }
        }
      }
    }

    // Update job data with delivered tokens set
    event.deliveredTokens = Array.from(deliveredTokensSet);
    await job.updateData(event);

    if (temporaryFailuresEncountered) {
      throw new Error(`[NotificationWorker] Temporary push gateway failure or rate limit encountered. Queue retry scheduled.`);
    }

    this.logger.log(`[NotificationWorker] Job ${job.id} completed successfully for booking=${event.bookingId}`);
    return { success: true, deliveredTokensCount: deliveredTokensSet.size };
  }
}
