import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91)?[6-9]\d{9}$|^[0-9]{10}$/, {
    message: 'Please enter a valid 10-digit mobile number.',
  })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  mobile_number?: string;

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
