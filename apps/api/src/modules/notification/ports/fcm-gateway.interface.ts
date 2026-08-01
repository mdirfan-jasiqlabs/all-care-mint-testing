export interface FcmMulticastResult {
  successCount: number;
  failureCount: number;
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
