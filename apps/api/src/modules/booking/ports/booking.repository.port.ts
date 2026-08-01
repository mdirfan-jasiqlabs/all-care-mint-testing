// ─── MOD-002 Booking Repository Port ───
// Source: DLD Section 4.3 — Hexagonal Ports & Adapters

import {
  BookingEntity,
  BookingStatusEnum,
  BookingStatusHistoryEntity,
  SlotLock,
  TimeSlotEntity,
  IdempotencyRecord,
  ActorRoleEnum,
  AddressSnapshot,
  PaymentMethodEnum,
} from '../types/booking.types';

export interface IBookingRepository {
  // ── Booking CRUD ──
  findBookingById(id: string): Promise<BookingEntity | null>;
  findBookingByReference(ref: string): Promise<BookingEntity | null>;
  findBookingsByCustomer(
    customerId: string,
    filter: 'current' | 'history',
    page: number,
    limit: number,
  ): Promise<{ data: BookingEntity[]; total: number }>;
  findBookingsByProvider(
    providerId: string,
    filter: 'active' | 'history',
    page: number,
    limit: number,
    status?: BookingStatusEnum,
  ): Promise<{ data: BookingEntity[]; total: number }>;
  findBookingsAdmin(query: {
    status?: BookingStatusEnum;
    date?: string;
    customerId?: string;
    providerId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: BookingEntity[]; total: number }>;
  createBooking(booking: {
    bookingReference: string;
    customerId: string;
    serviceId: string;
    serviceNameSnapshot: string;
    servicePriceSnapshot: string;
    addressId: string;
    addressSnapshot: AddressSnapshot;
    slotDate: Date;
    slotId: string;
    slotLabelSnapshot: string;
    paymentMethod: PaymentMethodEnum;
    idempotencyKey: string;
  }): Promise<BookingEntity>;
  updateBookingStatus(
    id: string,
    status: BookingStatusEnum,
    additionalFields?: Partial<BookingEntity>,
  ): Promise<BookingEntity>;
  assignProvider(bookingId: string, providerId: string): Promise<BookingEntity>;

  // ── Status History ──
  createStatusHistory(history: {
    bookingId: string;
    status: BookingStatusEnum;
    actorId: string;
    actorRole: ActorRoleEnum;
    note?: string;
  }): Promise<{ id: string }>;
  findStatusHistory(bookingId: string): Promise<BookingStatusHistoryEntity[]>;

  // ── Slot Locks ──
  findSlotLock(slotId: string, slotDate: Date): Promise<SlotLock | null>;
  findSlotLockForCustomer(
    slotId: string,
    slotDate: Date,
    customerId: string,
  ): Promise<SlotLock | null>;
  saveSlotLock(lock: {
    slotId: string;
    slotDate: Date;
    customerId: string;
    expiresAt: Date;
  }): Promise<SlotLock>;
  updateSlotLockBookingId(lockId: string, bookingId: string): Promise<void>;
  deleteSlotLock(id: string): Promise<void>;
  findExpiredLocks(now: Date): Promise<SlotLock[]>;

  // ── Time Slots ──
  findActiveTimeSlots(): Promise<TimeSlotEntity[]>;
  findTimeSlotById(id: string): Promise<TimeSlotEntity | null>;

  // ── Idempotency ──
  findIdempotencyRecord(
    customerId: string,
    key: string,
  ): Promise<IdempotencyRecord | null>;
  saveIdempotencyRecord(record: {
    customerId: string;
    idempotencyKey: string;
    requestHash: string;
    responseCode: number;
    responseBody: any;
  }): Promise<void>;

  // ── Provider History Query (for rejected bookings) ──
  findProviderHistoryBookings(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: BookingEntity[]; total: number }>;

  // ── Active booking check ──
  hasActiveBooking(customerId: string): Promise<boolean>;
}
