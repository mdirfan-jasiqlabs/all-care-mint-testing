import { Injectable, Inject, Logger } from '@nestjs/common';
import { TokenRegistryService } from './token-registry.service';
import { IFcmGateway } from '../ports/fcm-gateway.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly tokenRegistry: TokenRegistryService,
    @Inject(IFcmGateway)
    private readonly fcmGateway: IFcmGateway,
  ) {}

  async sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const tokensInfo = await this.tokenRegistry.getActiveTokensForUser(userId);
    if (!tokensInfo || tokensInfo.length === 0) {
      this.logger.log(`No active push tokens registered for user: ${userId}`);
      return;
    }

    const tokens = tokensInfo.map((t) => t.fcmToken);
    const result = await this.fcmGateway.sendMulticast(tokens, title, body, data);

    // Deactivate failed tokens (HTTP 400/410 unregistered tokens)
    if (result.failedTokens && result.failedTokens.length > 0) {
      for (const failedToken of result.failedTokens) {
        this.logger.warn(`Deactivating invalid FCM token: ${failedToken}`);
        await this.tokenRegistry.deactivateInvalidToken(failedToken);
      }
    }
  }
}
