// ─── MOD-002 State Engine Service ───
// Source: DLD Section 4.1 — manages state machine transitions and guards
// State Machine: PENDING -> ASSIGNED -> ACCEPTED -> ON_THE_WAY -> STARTED -> COMPLETED
//                PENDING/ASSIGNED -> CANCELLED (by customer/admin)
//                ASSIGNED -> REJECTED (provider rejects, resets to PENDING)

import { Injectable } from '@nestjs/common';
import { BookingStatusEnum, ActorRoleEnum } from '../types/booking.types';
import { InvalidTransitionException } from '../errors/booking.exceptions';

interface TransitionRule {
  from: BookingStatusEnum;
  to: BookingStatusEnum;
  allowedRoles: ActorRoleEnum[];
}

@Injectable()
export class StateEngineService {
  // Defines valid transitions per the DLD state machine
  private readonly transitions: TransitionRule[] = [
    // Admin assigns provider
    {
      from: BookingStatusEnum.PENDING,
      to: BookingStatusEnum.ASSIGNED,
      allowedRoles: [ActorRoleEnum.ADMIN],
    },
    // Provider accepts
    {
      from: BookingStatusEnum.ASSIGNED,
      to: BookingStatusEnum.ACCEPTED,
      allowedRoles: [ActorRoleEnum.PROVIDER],
    },
    // Provider on the way
    {
      from: BookingStatusEnum.ACCEPTED,
      to: BookingStatusEnum.ON_THE_WAY,
      allowedRoles: [ActorRoleEnum.PROVIDER],
    },
    // Provider starts
    {
      from: BookingStatusEnum.ON_THE_WAY,
      to: BookingStatusEnum.STARTED,
      allowedRoles: [ActorRoleEnum.PROVIDER],
    },
    // Provider completes
    {
      from: BookingStatusEnum.STARTED,
      to: BookingStatusEnum.COMPLETED,
      allowedRoles: [ActorRoleEnum.PROVIDER],
    },
    // Customer/Admin cancels (from PENDING or ASSIGNED)
    {
      from: BookingStatusEnum.PENDING,
      to: BookingStatusEnum.CANCELLED,
      allowedRoles: [ActorRoleEnum.CUSTOMER, ActorRoleEnum.ADMIN],
    },
    {
      from: BookingStatusEnum.ASSIGNED,
      to: BookingStatusEnum.CANCELLED,
      allowedRoles: [ActorRoleEnum.CUSTOMER, ActorRoleEnum.ADMIN],
    },
    // Provider rejects (from ASSIGNED, resets to PENDING — note: recorded as REJECTED in history)
    {
      from: BookingStatusEnum.ASSIGNED,
      to: BookingStatusEnum.REJECTED,
      allowedRoles: [ActorRoleEnum.PROVIDER],
    },
  ];

  /**
   * Validates whether a transition from `currentStatus` to `targetStatus` is allowed for the given `actorRole`.
   * @throws InvalidTransitionException if the transition is not allowed.
   */
  validateTransition(
    currentStatus: BookingStatusEnum,
    targetStatus: BookingStatusEnum,
    actorRole: ActorRoleEnum,
  ): void {
    const allowed = this.transitions.find(
      (t) =>
        t.from === currentStatus &&
        t.to === targetStatus &&
        t.allowedRoles.includes(actorRole),
    );

    if (!allowed) {
      throw new InvalidTransitionException(currentStatus, targetStatus);
    }
  }

  /**
   * Checks if a customer or admin can cancel a booking.
   */
  canCancel(currentStatus: BookingStatusEnum): boolean {
    return [BookingStatusEnum.PENDING, BookingStatusEnum.ASSIGNED].includes(
      currentStatus,
    );
  }

  /**
   * Gets the allowed next statuses for sequential provider updates.
   */
  getNextProviderStatus(
    currentStatus: BookingStatusEnum,
  ): BookingStatusEnum | null {
    const sequentialMap: Partial<Record<BookingStatusEnum, BookingStatusEnum>> =
      {
        [BookingStatusEnum.ACCEPTED]: BookingStatusEnum.ON_THE_WAY,
        [BookingStatusEnum.ON_THE_WAY]: BookingStatusEnum.STARTED,
        [BookingStatusEnum.STARTED]: BookingStatusEnum.COMPLETED,
      };
    return sequentialMap[currentStatus] ?? null;
  }
}
