export interface FcmMulticastResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  rateLimitedTokens?: string[];
  failedTokens: string[];
}

export interface IFcmGateway {
  sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmMulticastResult>;
}

export const IFcmGateway = Symbol('IFcmGateway');
