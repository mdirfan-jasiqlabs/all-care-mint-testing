import { IsString, IsOptional, IsNumber, Min, Max, IsEnum, IsInt, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class InitiatePaymentDto {
  @IsOptional()
  @IsString()
  bookingDraftId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  slotId?: string;

  @IsOptional()
  @IsString()
  slotDate?: string;

  @IsOptional()
  @IsString()
  addressId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amountInr?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  amountPaise?: number;
}

export class RazorpayWebhookDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  razorpay_order_id?: string;

  @IsOptional()
  @IsString()
  razorpay_payment_id?: string;

  @IsOptional()
  @IsObject()
  payload?: any;

  @IsOptional()
  @IsString()
  status?: string;

  [key: string]: any;
}

export enum PaymentMethodFilter {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
}

export enum PaymentStatusFilter {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CASH_PENDING = 'CASH_PENDING',
  CASH_SETTLED = 'CASH_SETTLED',
}

export class AdminPaymentsQueryDto {
  @IsOptional()
  @IsEnum(PaymentMethodFilter, { message: 'Invalid payment method filter' })
  method?: PaymentMethodFilter;

  @IsOptional()
  @IsEnum(PaymentStatusFilter, { message: 'Invalid payment status filter' })
  status?: PaymentStatusFilter;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page_size must be an integer' })
  @Min(1, { message: 'page_size must be at least 1' })
  @Max(100, { message: 'page_size cannot exceed 100' })
  page_size?: number = 20;

  @IsOptional()
  @IsString()
  format?: string;
}

