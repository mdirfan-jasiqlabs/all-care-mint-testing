import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumberString,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsNotEmpty()
  fixedPrice!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  estimatedDuration?: string;
}

export class UpdateServiceDto {
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsOptional()
  fixedPrice?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  estimatedDuration?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
