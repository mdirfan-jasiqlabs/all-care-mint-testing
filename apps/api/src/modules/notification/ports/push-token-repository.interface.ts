export interface PushTokenInfo {
  id: string;
  userId: string;
  userRole: string;
  deviceId: string;
  fcmToken: string;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPushTokenRepository {
  findTokensByUserId(userId: string): Promise<PushTokenInfo[]>;
  upsertToken(userId: string, role: string, deviceId: string, token: string): Promise<PushTokenInfo>;
  deactivateToken(fcmToken: string): Promise<void>;
  revokeByDeviceId(userId: string, deviceId: string): Promise<boolean>;
}

export const IPushTokenRepository = Symbol('IPushTokenRepository');
