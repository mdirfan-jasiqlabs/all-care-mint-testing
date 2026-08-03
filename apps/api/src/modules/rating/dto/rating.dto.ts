import { IsOptional, IsString, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminRatingsQueryDto {
  @IsOptional()
  @IsString()
  provider_id?: string;

  @IsOptional()
  @IsString()
  provider_search?: string;

  @IsOptional()
  @IsString()
  min_rating?: string;

  @IsOptional()
  @IsString()
  max_rating?: string;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number = 20;
}

export class CreateRatingDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'rating must be an integer' })
  @Min(1, { message: 'rating must not be less than 1' })
  @Max(5, { message: 'rating must not be greater than 5' })
  ratingScore?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'rating must be an integer' })
  @Min(1, { message: 'rating must not be less than 1' })
  @Max(5, { message: 'rating must not be greater than 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'comment must not exceed 500 characters' })
  reviewText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'comment must not exceed 500 characters' })
  comment?: string;
}

export function resolveBookingId(dto: Partial<CreateRatingDto>): string {
  return dto.bookingId || dto.booking_id || '';
}

export function resolveRatingScore(dto: Partial<CreateRatingDto>): number {
  return dto.ratingScore ?? dto.rating ?? 0;
}

export function resolveReviewText(dto: Partial<CreateRatingDto>): string | undefined {
  return dto.reviewText ?? dto.comment;
}
