export interface IAuthRepository {
  findCustomerByMobile(mobileNumber: string): Promise<any>;
  findCustomerById(id: string): Promise<any>;
  updateCustomerDisplayName(userId: string, name: string): Promise<any>;
  createCustomer(mobileNumber: string, firebaseUid: string): Promise<any>;
  findProviderByMobile(mobileNumber: string): Promise<any>;
  findProviderById(id: string): Promise<any>;
  findAdminByEmail(email: string): Promise<any>;
  findAdminById(id: string): Promise<any>;
  incrementAdminFailedAttempts(adminId: string): Promise<number>;
  lockAdminAccount(adminId: string, lockedUntil: Date): Promise<void>;
  resetAdminFailedAttempts(adminId: string): Promise<void>;
  saveRefreshToken(
    userId: string,
    role: string,
    tokenHash: string,
    expiresAt: Date,
    tokenFamilyId: string,
    parentId?: string,
  ): Promise<void>;
  findRefreshToken(tokenHash: string): Promise<any>;
  revokeToken(tokenId: string, reason: string): Promise<void>;
  revokeTokenFamily(tokenFamilyId: string, reason: string): Promise<void>;
  createProvider(mobileNumber: string, displayName?: string): Promise<any>;
  createOtpAttempt(
    mobileNumber: string,
    role: string,
    otpHash: string,
    expiresAt: Date,
  ): Promise<any>;
  findLatestOtpAttempt(mobileNumber: string, role: string): Promise<any>;
  markOtpAttemptUsed(id: string): Promise<void>;
  incrementOtpFailedAttempts(id: string): Promise<number>;
  countRecentOtpAttempts(mobileNumber: string, role: string, since: Date): Promise<number>;
}

