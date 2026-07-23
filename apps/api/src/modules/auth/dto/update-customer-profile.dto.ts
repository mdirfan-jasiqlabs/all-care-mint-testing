import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;
}
