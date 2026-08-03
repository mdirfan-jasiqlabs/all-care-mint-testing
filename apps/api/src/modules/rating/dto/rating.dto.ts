import { IsOptional, IsString, IsInt, Min, Max, MaxLength, IsUUID, IsISO8601, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminRatingsQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'provider_id must be a valid UUID' })
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
  @IsISO8601({}, { message: 'date_from must be a valid ISO 8601 date string' })
  date_from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'date_to must be a valid ISO 8601 date string' })
  date_to?: string;

  @IsOptional()
  @IsIn(['createdAt', 'ratingScore', 'date', 'rating'], { message: 'sort_by must be one of: createdAt, ratingScore, date, rating' })
  sort_by?: string;

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'], { message: 'order must be asc or desc' })
  order?: string;

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
  @IsUUID('4', { message: 'bookingId must be a valid UUID' })
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'booking_id must be a valid UUID' })
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
