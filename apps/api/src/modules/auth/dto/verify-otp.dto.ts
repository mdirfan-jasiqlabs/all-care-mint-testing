import { IsString, IsNotEmpty, IsOptional, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  mobile_number?: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number.' })
  otp!: string;

  @IsOptional()
  @IsString()
  role?: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER';

  getNormalizedMobileNumber(): string {
    const num = this.mobileNumber || this.mobile_number || '';
    const digits = num.replace(/\D/g, '');
    const cleanNum = digits.length > 10 ? digits.slice(-10) : digits;
    return `+91${cleanNum}`;
  }

  getNormalizedRole(): 'CUSTOMER' | 'PROVIDER' {
    return (this.role || 'CUSTOMER').toUpperCase() as 'CUSTOMER' | 'PROVIDER';
  }
}
