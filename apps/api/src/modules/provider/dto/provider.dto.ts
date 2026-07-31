import { IsString, IsNotEmpty, IsEnum, Matches, MaxLength } from 'class-validator';

export enum ProviderStatusEnum {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED'
}

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9][0-9]{9}$/, { message: "Invalid Indian mobile number" })
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serviceArea: string;
}

export class UpdateProviderStatusDto {
  @IsEnum(ProviderStatusEnum)
  @IsNotEmpty()
  status: ProviderStatusEnum;
}

export class AssignCategoryDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
