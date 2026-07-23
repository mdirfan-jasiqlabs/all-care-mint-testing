import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class VerifyFirebaseTokenDto {
  @IsString()
  @IsNotEmpty()
  firebaseToken: string;

  @IsEnum(['CUSTOMER', 'PROVIDER'])
  role: 'CUSTOMER' | 'PROVIDER';
}
