// ─── MOD-002 Data Transfer Objects ───
// Source: DLD Section 4.6 — 9 DTO classes

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  Matches,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingStatusEnum, PaymentMethodEnum } from '../types/booking.types';

// ── Address DTOs ──

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  label: string;

  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid Indian PIN code' })
  pincode: string;
}

export class UpdateAddressDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  label?: string;

  @IsString()
  @IsOptional()
  addressLine1?: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Invalid Indian PIN code' })
  pincode?: string;
}

// ── Slot Lock DTO ──

export class LockSlotDto {
  @IsUUID()
  @IsNotEmpty()
  slotId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD
}

// ── Booking DTOs ──

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsUUID()
  @IsNotEmpty()
  slotId: string;

  @IsDateString()
  @IsNotEmpty()
  slotDate: string;

  @IsUUID()
  @IsNotEmpty()
  addressId: string;

  @IsEnum(PaymentMethodEnum)
  @IsNotEmpty()
  paymentMethod: PaymentMethodEnum;
}

export class CancelBookingDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatusEnum)
  @IsNotEmpty()
  status: BookingStatusEnum;
}

export class RejectBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}

export class ReassignProviderDto {
  @IsUUID()
  @IsNotEmpty()
  providerId: string;
}

export class BookingListQueryDto {
  @IsOptional()
  @IsEnum(BookingStatusEnum)
  status?: BookingStatusEnum;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  providerId?: string;

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
  limit?: number = 20;
}
