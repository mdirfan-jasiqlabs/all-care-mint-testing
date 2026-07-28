import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RefreshTokenRequestDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  refresh_token?: string;

  getToken(): string {
    return this.refreshToken || this.refresh_token || '';
  }
}
