import { IsString, IsOptional, IsNumber, Min, IsObject } from 'class-validator';

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
