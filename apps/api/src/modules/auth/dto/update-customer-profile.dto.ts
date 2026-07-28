import { IsString, MaxLength } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsString()
  @MaxLength(60)
  name: string;
}
