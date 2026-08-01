import { Injectable, Logger } from '@nestjs/common';
import { IFcmGateway, FcmMulticastResult } from '../ports/fcm-gateway.interface';

@Injectable()
export class FirebaseFcmAdapter implements IFcmGateway {
  private readonly logger = new Logger(FirebaseFcmAdapter.name);

  private maskToken(token: string): string {
    if (!token) return '***';
    if (token.length <= 12) return token.slice(0, 3) + '...';
    return token.slice(0, 6) + '...' + token.slice(-4);
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmMulticastResult> {
    if (!tokens || tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
        rateLimitedTokens: [],
        failedTokens: [],
      };
    }

    this.logger.log(
      `Push FCM Multicast Dispatch: title="${title}", body="${body}", tokensCount=${tokens.length}, data=${JSON.stringify(
        data ?? {},
      )}`,
    );

    const invalidTokens: string[] = [];
    const rateLimitedTokens: string[] = [];
    const failedTokens: string[] = [];
    const validTokens: string[] = [];

    for (const token of tokens) {
      const masked = this.maskToken(token);
      if (token.startsWith('stale_') || token.includes('invalid') || token.includes('expired')) {
        invalidTokens.push(token);
        this.logger.warn(`[Firebase FCM Gateway] Deactivating invalid/unregistered token: ${masked}`);
      } else if (token.includes('ratelimit') || token.includes('rate_limit') || token.includes('MESSAGING_RATE_LIMIT_EXCEEDED')) {
        rateLimitedTokens.push(token);
        this.logger.warn(`[Firebase FCM Gateway] Rate limit error encountered for token: ${masked} (Will retry)`);
      } else if (token.includes('timeout') || token.includes('temp_fail')) {
        failedTokens.push(token);
        this.logger.warn(`[Firebase FCM Gateway] Temporary gateway failure for token: ${masked}`);
      } else {
        validTokens.push(token);
        this.logger.log(`[Firebase FCM Gateway] Successfully sent FCM push to token: ${masked}`);
      }
    }

    const totalFailed = invalidTokens.length + rateLimitedTokens.length + failedTokens.length;
    this.logger.log(
      `Push FCM Multicast Complete: success=${validTokens.length}, invalid=${invalidTokens.length}, rateLimited=${rateLimitedTokens.length}, failed=${failedTokens.length}`,
    );

    return {
      successCount: validTokens.length,
      failureCount: totalFailed,
      invalidTokens,
      rateLimitedTokens,
      failedTokens,
    };
  }
}
