import { IsString, IsOptional, IsEnum } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @IsOptional()
  fcmToken?: string;

  @IsString()
  @IsOptional()
  fcm_token?: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  device_id?: string;

  @IsEnum(['CUSTOMER', 'PROVIDER'])
  @IsOptional()
  userRole?: 'CUSTOMER' | 'PROVIDER';

  @IsEnum(['ANDROID'])
  @IsOptional()
  platform?: string;

  getResolvedToken(): string {
    return this.fcmToken || this.fcm_token || '';
  }

  getResolvedDeviceId(): string {
    return this.deviceId || this.device_id || '';
  }

  getResolvedUserRole(jwtRole: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER'): 'CUSTOMER' | 'PROVIDER' {
    // Identity & Role Isolation: Always enforce the authenticated JWT role.
    return jwtRole;
  }

  getResolvedPlatform(): string {
    return this.platform || 'ANDROID';
  }
}
