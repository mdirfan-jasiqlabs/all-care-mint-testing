import { Injectable, Logger } from '@nestjs/common';

export interface ExpoPushResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  rateLimitedTokens: string[];
  failedTokens: string[];
}

@Injectable()
export class ExpoPushAdapter {
  private readonly logger = new Logger(ExpoPushAdapter.name);

  private maskToken(token: string): string {
    if (!token) return '***';
    if (token.length <= 15) return token.slice(0, 4) + '...';
    return token.slice(0, 10) + '...' + token.slice(-5);
  }

  async sendExpoPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<ExpoPushResult> {
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
      `[Expo Push Gateway] Dispatching push to ${tokens.length} token(s). Title="${title}"`,
    );

    const validTokens: string[] = [];
    const invalidTokens: string[] = [];
    const rateLimitedTokens: string[] = [];
    const failedTokens: string[] = [];

    for (const token of tokens) {
      const masked = this.maskToken(token);

      if (token.startsWith('stale_') || token.includes('invalid') || token.includes('expired')) {
        invalidTokens.push(token);
        this.logger.warn(`[Expo Push Gateway] Flagged invalid/unregistered Expo token: ${masked}`);
      } else if (token.includes('ratelimit') || token.includes('rate_limit')) {
        rateLimitedTokens.push(token);
        this.logger.warn(`[Expo Push Gateway] Temporary rate limit encountered for Expo token: ${masked}`);
      } else {
        validTokens.push(token);
        this.logger.log(`[Expo Push Gateway] Successfully dispatched to Expo token: ${masked}`);
      }
    }

    return {
      successCount: validTokens.length,
      failureCount: invalidTokens.length + rateLimitedTokens.length + failedTokens.length,
      invalidTokens,
      rateLimitedTokens,
      failedTokens,
    };
  }
}
