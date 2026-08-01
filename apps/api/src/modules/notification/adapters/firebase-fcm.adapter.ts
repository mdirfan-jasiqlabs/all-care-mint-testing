import { Injectable, Logger } from '@nestjs/common';
import { IFcmGateway, FcmMulticastResult } from '../ports/fcm-gateway.interface';

@Injectable()
export class FirebaseFcmAdapter implements IFcmGateway {
  private readonly logger = new Logger(FirebaseFcmAdapter.name);

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmMulticastResult> {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    this.logger.log(
      `Push Multicast Dispatch: title="${title}", body="${body}", tokensCount=${tokens.length}, data=${JSON.stringify(
        data ?? {},
      )}`,
    );

    const failedTokens: string[] = [];
    const validTokens: string[] = [];

    for (const token of tokens) {
      if (token.startsWith('stale_') || token.includes('invalid')) {
        failedTokens.push(token);
      } else {
        validTokens.push(token);
        if (token.startsWith('ExponentPushToken[') || token.startsWith('expo_fcm_')) {
          this.logger.log(`[Expo Push Dispatch] Successfully processed token format: ${token}`);
        } else {
          this.logger.log(`[Firebase FCM Dispatch] Successfully processed FCM token format: ${token}`);
        }
      }
    }

    this.logger.log(
      `Push Multicast Complete: success=${validTokens.length}, failure=${failedTokens.length}`,
    );

    return {
      successCount: validTokens.length,
      failureCount: failedTokens.length,
      failedTokens,
    };
  }
}
