// ─── MOD-002 Custom Exception Classes ───

import { HttpException, HttpStatus, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';

export class BookingNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super({
      success: false,
      error: {
        code: 'ERR_BOOKING_NOT_FOUND',
        message: id ? `Booking ${id} not found.` : 'Booking not found.',
      },
    });
  }
}

export class AddressNotFoundException extends NotFoundException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_ADDRESS_NOT_FOUND',
        message: 'Address not found.',
      },
    });
  }
}

export class InvalidTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super({
      success: false,
      error: {
        code: 'ERR_INVALID_TRANSITION',
        message: `Cannot transition from ${from} to ${to}.`,
      },
    });
  }
}

export class ProviderIneligibleException extends BadRequestException {
  constructor(reason: string) {
    super({
      success: false,
      error: {
        code: 'ERR_PROVIDER_INELIGIBLE',
        message: reason,
      },
    });
  }
}

export class SlotUnavailableException extends ConflictException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_SLOT_UNAVAILABLE',
        message: 'Slot is already locked or booked for the target date.',
      },
    });
  }
}

export class SlotLockExpiredException extends ConflictException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_SLOT_LOCK_EXPIRED',
        message: 'Slot lock has expired or does not exist. Please re-lock the slot.',
      },
    });
  }
}

export class IdempotencyConflictException extends ConflictException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_IDEMPOTENCY_CONFLICT',
        message: 'Request payload does not match the original request for this idempotency key.',
      },
    });
  }
}

export class AddressLimitExceededException extends BadRequestException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_ADDRESS_LIMIT',
        message: 'Maximum of 5 addresses allowed per customer.',
      },
    });
  }
}

export class SlotDateInPastException extends BadRequestException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_SLOT_DATE_PAST',
        message: 'Booking date cannot be in the past.',
      },
    });
  }
}

export class SameDaySlotTooSoonException extends BadRequestException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'ERR_SLOT_TOO_SOON',
        message: 'Same-day bookings require at least 2 hours before the slot start time.',
      },
    });
  }
}
