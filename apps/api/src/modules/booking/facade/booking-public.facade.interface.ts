// ─── MOD-002 Public Extraction Facade ───
// Source: DLD Section 4.2 — Modular Monolith Public Extraction Facade

import { BookingDetails } from '../types/booking.types';

export interface IBookingPublicFacade {
  getBookingDetails(bookingId: string): Promise<BookingDetails>;
  hasActiveBooking(customerId: string): Promise<boolean>;
  extendSlotLock(
    customerId: string,
    slotId: string,
    date: string,
    durationSeconds: number,
  ): Promise<void>;
  confirmOnlineBooking(
    customerId: string,
    slotId: string,
    date: string,
    paymentId: string,
  ): Promise<BookingDetails>;
}
