import { IsString, IsNotEmpty, IsEnum, Matches, MaxLength, IsOptional, IsArray } from 'class-validator';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];
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

export class SubmitProviderLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'Invalid 10-digit Indian mobile number format' })
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'Invalid 10-digit Indian mobile number format' })
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  service_area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  service_type?: string;
}

