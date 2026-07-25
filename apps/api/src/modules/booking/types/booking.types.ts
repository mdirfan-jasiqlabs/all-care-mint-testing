// ─── MOD-002 Domain Enums & Shared Types ───
// Source: DLD Section 4.5 — Strict Enum Specifications

export enum BookingStatusEnum {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  ON_THE_WAY = 'ON_THE_WAY',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum ActorRoleEnum {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum PaymentMethodEnum {
  CASH_ON_SERVICE = 'CASH_ON_SERVICE',
  ONLINE = 'ONLINE',
}

export enum PaymentStatusEnum {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CASH_PENDING = 'CASH_PENDING',
  REFUND_PENDING = 'REFUND_PENDING',
}

// ─── Domain Entities ───

export interface AddressSnapshot {
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  pincode: string;
}

export interface BookingDetails {
  id: string;
  reference: string;
  customerId: string;
  providerId: string | null;
  serviceId: string;
  status: BookingStatusEnum;
  fixedPrice: string;
  addressSnapshot: AddressSnapshot;
}

export interface Address {
  id: string;
  customerId: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  pincode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotLock {
  id: string;
  slotId: string;
  slotDate: Date;
  customerId: string;
  expiresAt: Date;
  bookingId: string | null;
  createdAt: Date;
}

export interface BookingEntity {
  id: string;
  bookingReference: string;
  customerId: string;
  providerId: string | null;
  serviceId: string;
  serviceNameSnapshot: string;
  servicePriceSnapshot: string;
  addressId: string | null;
  addressSnapshot: AddressSnapshot;
  slotDate: Date;
  slotId: string | null;
  slotLabelSnapshot: string;
  paymentMethod: PaymentMethodEnum;
  status: BookingStatusEnum;
  idempotencyKey: string;
  rejectionReason: string | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingStatusHistoryEntity {
  id: string;
  bookingId: string;
  status: BookingStatusEnum;
  actorId: string;
  actorRole: string;
  note: string | null;
  createdAt: Date;
}

export interface TimeSlotEntity {
  id: string;
  label: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  displayOrder: number;
}

export interface IdempotencyRecord {
  id: string;
  customerId: string;
  idempotencyKey: string;
  requestHash: string;
  responseCode: number;
  responseBody: any;
  createdAt: Date;
}
