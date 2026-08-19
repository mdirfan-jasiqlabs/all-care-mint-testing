// ─── MOD-002 Booking Service ───
// Source: DLD Section 4.1 — coordinates locking, creation, status history, cancellations

import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { IBookingRepository } from '../ports/booking.repository.port';
import { IAddressRepository } from '../ports/address.repository.port';
import { StateEngineService } from './state-engine.service';
import { EligibilityService } from './eligibility.service';
import { NotificationService } from './notification.service';
import {
  BookingEntity,
  BookingStatusEnum,
  ActorRoleEnum,
  PaymentMethodEnum,
  BookingStatusHistoryEntity,
  SlotLock,
  TimeSlotEntity,
  AddressSnapshot,
} from '../types/booking.types';
import {
  CreateBookingDto,
  LockSlotDto,
  BookingListQueryDto,
} from '../dto/booking.dto';
import {
  BookingNotFoundException,
  SlotUnavailableException,
  SlotLockExpiredException,
  IdempotencyConflictException,
  SlotDateInPastException,
  SameDaySlotTooSoonException,
} from '../errors/booking.exceptions';
import { PrismaService } from '../../../prisma/prisma.service';
import Redis from 'ioredis';
import { BookingDomainEventEmitter } from './booking-domain-event.emitter';

@Injectable()
export class BookingService implements OnApplicationShutdown {
  constructor(
    @Inject('IBookingRepository')
    private readonly bookingRepo: IBookingRepository,
    @Inject('IAddressRepository')
    private readonly addressRepo: IAddressRepository,
    private readonly stateEngine: StateEngineService,
    private readonly eligibilityService: EligibilityService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly domainEventEmitter: BookingDomainEventEmitter,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async onApplicationShutdown() {
    await this.redisClient.quit();
  }

  // ─── Slot Availability ───

  async getAvailableSlots(
    serviceId: string,
    date: string,
  ): Promise<{ id: string; label: string; isAvailable: boolean }[]> {
    this.validateSlotDate(date);

    const allSlots = await this.bookingRepo.findActiveTimeSlots();
    const slotDate = new Date(date);

    const results = await Promise.all(
      allSlots.map(async (slot) => {
        const lock = await this.bookingRepo.findSlotLock(slot.id, slotDate);
        const isLocked =
          lock !== null &&
          (lock.expiresAt > new Date() || lock.bookingId !== null);

        const existingBooking = await this.prisma.booking.findFirst({
          where: {
            slotId: slot.id,
            slotDate,
            status: {
              notIn: [BookingStatusEnum.CANCELLED, BookingStatusEnum.REJECTED],
            },
          },
        });
        const isBooked = existingBooking !== null;

        let isPastSameDay = false;
        try {
          this.validateSameDaySlot(date, slot);
        } catch (e) {
          isPastSameDay = true;
        }

        return {
          id: slot.id,
          label: slot.label,
          isAvailable: !isLocked && !isBooked && !isPastSameDay,
        };
      }),
    );

    return results;
  }

  // ─── Slot Locking ───

  async lockSlot(
    customerId: string,
    dto: LockSlotDto,
  ): Promise<{ lockId: string; expiresAt: Date }> {
    const slotDate = new Date(dto.date);
    this.validateSlotDate(dto.date);

    // Check slot exists and is active
    const slot = await this.bookingRepo.findTimeSlotById(dto.slotId);
    if (!slot || !slot.isActive) {
      throw new SlotUnavailableException();
    }

    // Validate same-day slot timing (2-hour buffer)
    this.validateSameDaySlot(dto.date, slot);

    // Check if slot is already booked in booking table
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        slotId: dto.slotId,
        slotDate,
        status: {
          notIn: [BookingStatusEnum.CANCELLED, BookingStatusEnum.REJECTED],
        },
      },
    });
    if (existingBooking) {
      throw new SlotUnavailableException();
    }

    // Check if slot is locked by another user
    const existingLock = await this.bookingRepo.findSlotLock(
      dto.slotId,
      slotDate,
    );
    if (existingLock && existingLock.expiresAt > new Date() && existingLock.customerId !== customerId) {
      throw new SlotUnavailableException();
    }

    // If there's an expired lock, delete it first
    if (existingLock) {
      await this.bookingRepo.deleteSlotLock(existingLock.id);
    }

    // Create 10-minute lock
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const lock = await this.bookingRepo.saveSlotLock({
      slotId: dto.slotId,
      slotDate,
      customerId,
      expiresAt,
    });

    // Try to acquire Redis lock
    const dateStr = dto.date; // YYYY-MM-DD format
    const redisKey = `lock:slot:${dto.slotId}:date:${dateStr}`;
    try {
      await this.redisClient.set(redisKey, customerId, 'EX', 600, 'NX');
    } catch (err) {
      // Redis Unavailable Fallback: Log a warning, ignore the failure, and continue
      console.warn(
        `[Redis Lock Fallback] Failed to set Redis lock for key ${redisKey}: ${err.message}`,
      );
    }

    return { lockId: lock.id, expiresAt: lock.expiresAt };
  }

  // ─── Booking Creation ───

  async createBooking(
    customerId: string,
    dto: CreateBookingDto,
    idempotencyKey: string,
  ): Promise<BookingEntity> {
    // 1. Check idempotency
    const requestHash = this.computeRequestHash(dto);
    const existingRecord = await this.bookingRepo.findIdempotencyRecord(
      customerId,
      idempotencyKey,
    );

    if (existingRecord) {
      if (existingRecord.requestHash !== requestHash) {
        throw new IdempotencyConflictException();
      }
      // Return cached response
      const cachedBooking = await this.bookingRepo.findBookingById(
        existingRecord.responseBody.bookingId,
      );
      if (cachedBooking) return cachedBooking;
    }

    // 2. Validate slot date
    this.validateSlotDate(dto.slotDate);
    const slotDate = new Date(dto.slotDate);

    // 3. Verify slot lock
    const lock = await this.bookingRepo.findSlotLockForCustomer(
      dto.slotId,
      slotDate,
      customerId,
    );
    if (!lock || lock.expiresAt <= new Date() || lock.bookingId !== null) {
      throw new SlotLockExpiredException();
    }

    // 4. Fetch service snapshots from catalog
    const rawTargetIds = dto.serviceIds && dto.serviceIds.length > 0 ? dto.serviceIds : [dto.serviceId];
    const targetServiceIds = Array.from(new Set(rawTargetIds));
    const services = await Promise.all(
      targetServiceIds.map((id) => this.prisma.service.findUnique({ where: { id } }))
    );

    if (services.some((s) => !s || !s.isActive)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_SERVICE_NOT_FOUND',
          message: 'One or more requested services were not found or are inactive.',
        },
      });
    }

    const primaryService = services[0]!;

    // 5. Fetch address snapshot
    const address = await this.addressRepo.findAddressById(dto.addressId);
    if (!address || address.customerId !== customerId) {
      throw new BadRequestException({
        success: false,
        error: { code: 'ERR_ADDRESS_NOT_FOUND', message: 'Address not found.' },
      });
    }

    // 6. Fetch slot info for label snapshot
    const slot = await this.bookingRepo.findTimeSlotById(dto.slotId);
    if (!slot) {
      throw new SlotUnavailableException();
    }

    // 7. Reject direct ONLINE booking creation (DLD Section 6.2.3 rule)
    if (dto.paymentMethod === PaymentMethodEnum.ONLINE) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_ONLINE_BOOKING_DIRECT_CREATION_DISALLOWED',
          message:
            'Online bookings must be created through the payment webhook.',
        },
      });
    }

    // 7.5 Check if booking intent is already fulfilled for this slot and slotDate (DEF-006-003)
    const existingActiveBooking = await this.prisma.booking.findFirst({
      where: {
        slotId: dto.slotId,
        slotDate,
        status: {
          notIn: [BookingStatusEnum.CANCELLED, BookingStatusEnum.REJECTED],
        },
      },
    });
    if (existingActiveBooking) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'ERR_BOOKING_INTENT_ALREADY_FULFILLED',
          message: 'This time slot is full or already booked.',
        },
      });
    }

    const addressSnapshot: AddressSnapshot = {
      label: address.label,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      pincode: address.pincode,
    };

    // 8. Execute atomic multi-service creation inside DB transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let firstBooking: BookingEntity | null = null;
      const createdBookings: BookingEntity[] = [];

      for (let i = 0; i < services.length; i++) {
        const currentSvc = services[i]!;
        const dateStr = dto.slotDate.replace(/-/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const bookingReference = i === 0 ? `ACM-${dateStr}-${randomSuffix}` : `ACM-${dateStr}-${randomSuffix}-${i + 1}`;
        const isUuid = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
        const currentIdempotencyKey = (i === 0 && idempotencyKey && isUuid(idempotencyKey)) ? idempotencyKey : crypto.randomUUID();

        const created = await tx.booking.create({
          data: {
            bookingReference,
            customerId,
            serviceId: currentSvc.id,
            serviceNameSnapshot: currentSvc.name,
            servicePriceSnapshot: currentSvc.fixedPrice,
            addressId: dto.addressId,
            addressSnapshot: addressSnapshot as any,
            slotDate,
            slotId: dto.slotId,
            slotLabelSnapshot: slot.label,
            paymentMethod: dto.paymentMethod,
            status: BookingStatusEnum.PENDING,
            idempotencyKey: currentIdempotencyKey,
          },
        });

        const entity: BookingEntity = {
          id: created.id,
          bookingReference: created.bookingReference,
          customerId: created.customerId,
          providerId: created.providerId,
          serviceId: created.serviceId,
          serviceNameSnapshot: created.serviceNameSnapshot,
          servicePriceSnapshot: created.servicePriceSnapshot.toString(),
          addressId: created.addressId,
          addressSnapshot: created.addressSnapshot as any,
          slotDate: created.slotDate,
          slotId: created.slotId,
          slotLabelSnapshot: created.slotLabelSnapshot,
          paymentMethod: created.paymentMethod as any,
          status: created.status as any,
          idempotencyKey: created.idempotencyKey,
          rejectionReason: created.rejectionReason,
          cancelledAt: created.cancelledAt,
          completedAt: created.completedAt,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };

        createdBookings.push(entity);
        if (i === 0) {
          firstBooking = entity;
        }

        // If CASH_ON_SERVICE, create CASH_PENDING payment order
        if (dto.paymentMethod === PaymentMethodEnum.CASH_ON_SERVICE) {
          const amountPaise = Math.round(parseFloat(currentSvc.fixedPrice.toString()) * 100);
          await tx.paymentOrder.create({
            data: {
              customerId,
              bookingId: created.id,
              serviceId: currentSvc.id,
              slotId: dto.slotId,
              slotDate,
              addressId: dto.addressId,
              amountPaise,
              paymentMethod: 'CASH_ON_SERVICE',
              status: 'CASH_PENDING',
            },
          });
        }

        // Create initial status history
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: created.id,
            status: BookingStatusEnum.PENDING,
            actorId: customerId,
            actorRole: ActorRoleEnum.CUSTOMER,
            note: 'Booking created',
          },
        });
      }

      // Link slot lock to primary booking
      await tx.bookingSlotLock.update({
        where: { id: lock.id },
        data: { bookingId: firstBooking!.id },
      });

      // Save idempotency record
      await tx.idempotencyKey.create({
        data: {
          customerId,
          idempotencyKey,
          requestHash,
          responseCode: 201,
          responseBody: { bookingId: firstBooking!.id, bookingIds: createdBookings.map((b) => b.id) } as any,
        },
      });

      return { primaryBooking: firstBooking!, createdBookings };
    });

    return Object.assign(result.primaryBooking, {
      primaryBooking: result.primaryBooking,
      createdBookings: result.createdBookings,
    });
  }

  // ─── Customer Booking Queries ───

  async getCustomerBookings(
    customerId: string,
    filter: 'current' | 'history' = 'current',
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    return this.bookingRepo.findBookingsByCustomer(
      customerId,
      filter,
      page,
      limit,
    );
  }

  async getBookingDetail(
    bookingId: string,
    customerId: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking || booking.customerId !== customerId) {
      throw new BookingNotFoundException(bookingId);
    }
    return booking;
  }

  async getBookingHistory(
    bookingId: string,
    customerId: string,
  ): Promise<BookingStatusHistoryEntity[]> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking || booking.customerId !== customerId) {
      throw new BookingNotFoundException(bookingId);
    }
    return this.bookingRepo.findStatusHistory(bookingId);
  }

  // ─── Cancellation ───

  async cancelBooking(
    bookingId: string,
    actorId: string,
    actorRole: ActorRoleEnum,
    reason?: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }

    // 1) Customer ownership validation
    if (
      actorRole === ActorRoleEnum.CUSTOMER &&
      booking.customerId !== actorId
    ) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_BOOKING_FORBIDDEN',
          message: 'You do not have permission to cancel this booking.',
        },
      });
    }

    // 5) Return HTTP 409 for cancellation attempts from non-cancellable states
    if (
      booking.status !== BookingStatusEnum.PENDING &&
      booking.status !== BookingStatusEnum.ASSIGNED
    ) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'ERR_BOOKING_NOT_CANCELLABLE',
          message: `Cannot cancel booking from ${booking.status} status.`,
        },
      });
    }

    this.stateEngine.validateTransition(
      booking.status,
      BookingStatusEnum.CANCELLED,
      actorRole,
    );

    const updatedBooking = await this.bookingRepo.updateBookingStatus(
      bookingId,
      BookingStatusEnum.CANCELLED,
      { cancelledAt: new Date() },
    );

    // 3) Release or remove the associated booking slot lock
    try {
      const locks = await this.prisma.bookingSlotLock.findMany({
        where: { bookingId },
      });
      for (const lock of locks) {
        const dateStr = lock.slotDate.toISOString().split('T')[0];
        const redisKey = `lock:slot:${lock.slotId}:date:${dateStr}`;
        try {
          await this.redisClient.del(redisKey);
        } catch (err) {
          console.warn(
            `[Redis Lock Fallback] Failed to delete Redis lock for key ${redisKey}: ${err.message}`,
          );
        }
      }
    } catch (err) {
      console.warn(
        `[Redis Lock Fallback] Failed to find locks for redis deletion: ${err.message}`,
      );
    }

    await this.prisma.bookingSlotLock.deleteMany({
      where: { bookingId },
    });

    const historyRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: BookingStatusEnum.CANCELLED,
      actorId,
      actorRole,
      note: reason || 'Booking cancelled',
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: 'CANCELLED',
      customerId: booking.customerId,
      providerId: booking.providerId ?? undefined,
      serviceName: booking.serviceNameSnapshot,
      statusHistoryId: historyRecord.id,
      timestamp: Date.now(),
    });

    return updatedBooking;
  }

  async cancelGroupBookings(
    bookingIds: string[],
    actorId: string,
    actorRole: ActorRoleEnum,
    reason?: string,
  ): Promise<BookingEntity[]> {
    if (!bookingIds || bookingIds.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(bookingIds));
    const bookings = await Promise.all(
      uniqueIds.map((id) => this.bookingRepo.findBookingById(id))
    );

    // 1. Ownership check (BOLA/IDOR protection for EVERY requested booking ID)
    for (const b of bookings) {
      if (!b) continue;
      if (actorRole === ActorRoleEnum.CUSTOMER && b.customerId !== actorId) {
        throw new ForbiddenException({
          success: false,
          error: {
            code: 'ERR_BOOKING_FORBIDDEN',
            message: 'You do not have permission to cancel one or more requested bookings.',
          },
        });
      }
    }

    // 2. Identify eligible bookings using canonical state machine rules
    const eligibleBookings = bookings.filter(
      (b): b is BookingEntity =>
        b !== null &&
        (b.status === BookingStatusEnum.PENDING || b.status === BookingStatusEnum.ASSIGNED)
    );

    if (eligibleBookings.length === 0) {
      return bookings.filter((b): b is BookingEntity => b !== null);
    }

    const now = new Date();

    // 3. Atomic DB mutations inside transaction
    await this.prisma.$transaction(async (tx) => {
      for (const booking of eligibleBookings) {
        this.stateEngine.validateTransition(
          booking.status,
          BookingStatusEnum.CANCELLED,
          actorRole,
        );

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatusEnum.CANCELLED,
            cancelledAt: now,
          },
        });

        await tx.bookingSlotLock.deleteMany({
          where: { bookingId: booking.id },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            status: BookingStatusEnum.CANCELLED,
            actorId,
            actorRole,
            note: reason || 'Booking cancelled (group cancellation)',
          },
        });

        await tx.paymentOrder.updateMany({
          where: {
            bookingId: booking.id,
            status: 'CASH_PENDING',
          },
          data: {
            status: 'CANCELLED',
            failureReason: reason || 'Booking cancelled by customer',
          },
        });
      }
    });

    // 4. Safe external side-effects OUTSIDE transaction
    for (const booking of eligibleBookings) {
      try {
        const locks = await this.prisma.bookingSlotLock.findMany({
          where: { bookingId: booking.id },
        });
        for (const lock of locks) {
          const dateStr = lock.slotDate.toISOString().split('T')[0];
          const redisKey = `lock:slot:${lock.slotId}:date:${dateStr}`;
          await this.redisClient.del(redisKey).catch(() => null);
        }
      } catch (err) {
        // Redis lock deletion fallback warning ignored
      }

      this.notificationService
        .sendCancelledNotification(
          booking.id,
          booking.customerId,
          booking.providerId || undefined,
        )
        .catch((err) =>
          Logger.error(
            `Failed sending cancelled notification for ${booking.id}: ${err.message}`,
            'BookingService',
          ),
        );

      this.domainEventEmitter.emitBookingStatusChanged({
        bookingId: booking.id,
        status: 'CANCELLED',
        customerId: booking.customerId,
        providerId: booking.providerId ?? undefined,
        serviceName: booking.serviceNameSnapshot,
        timestamp: Date.now(),
      });
    }

    // 5. Fetch fresh updated states
    const updatedBookings = await Promise.all(
      uniqueIds.map((id) => this.bookingRepo.findBookingById(id))
    );
    return updatedBookings.filter((b): b is BookingEntity => b !== null);
  }

  // ─── Admin Operations ───
  private inFlightAdminBookingsPromises = new Map<string, Promise<{ data: BookingEntity[]; total: number }>>();

  async getAdminBookings(
    query: BookingListQueryDto,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    const status = query.status || 'ALL';
    const date = query.date || 'ALL';
    const customerId = query.customerId || 'ALL';
    const providerId = query.providerId || 'ALL';
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const cacheKey = `admin:bookings:v1:${status}:${date}:${customerId}:${providerId}:${page}:${limit}`;

    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`[Redis Bookings Cache Warning] get failed: ${err.message}`);
      }
    }

    if (this.inFlightAdminBookingsPromises.has(cacheKey)) {
      return this.inFlightAdminBookingsPromises.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const result = await this.bookingRepo.findBookingsAdmin({
          status: query.status,
          date: query.date,
          customerId: query.customerId,
          providerId: query.providerId,
          page,
          limit,
        });

        if (this.redisClient) {
          try {
            await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60);
          } catch (err: any) {
            console.warn(`[Redis Bookings Cache Warning] set failed: ${err.message}`);
          }
        }
        return result;
      } finally {
        this.inFlightAdminBookingsPromises.delete(cacheKey);
      }
    })();

    this.inFlightAdminBookingsPromises.set(cacheKey, promise);
    return promise;
  }

  async getAdminBookingDetail(bookingId: string): Promise<any> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    const service = await this.prisma.service.findUnique({
      where: { id: booking.serviceId },
      select: { categoryId: true },
    });
    return {
      ...booking,
      service: {
        categoryId: service?.categoryId || '',
      },
    };
  }

  async getAdminBookingHistory(
    bookingId: string,
  ): Promise<BookingStatusHistoryEntity[]> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    return this.bookingRepo.findStatusHistory(bookingId);
  }

  async assignProvider(
    bookingId: string,
    providerId: string,
    adminId: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }

    this.stateEngine.validateTransition(
      booking.status,
      BookingStatusEnum.ASSIGNED,
      ActorRoleEnum.ADMIN,
    );

    await this.eligibilityService.verifyProviderEligibility(
      providerId,
      booking.serviceId,
    );

    const updatedBooking = await this.bookingRepo.assignProvider(
      bookingId,
      providerId,
    );
    await this.bookingRepo.updateBookingStatus(
      bookingId,
      BookingStatusEnum.ASSIGNED,
    );

    const historyRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: BookingStatusEnum.ASSIGNED,
      actorId: adminId,
      actorRole: ActorRoleEnum.ADMIN,
      note: `Provider ${providerId} assigned`,
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: 'ASSIGNED',
      customerId: booking.customerId,
      providerId,
      serviceName: booking.serviceNameSnapshot,
      slotDate: booking.slotDate,
      slotLabel: booking.slotLabelSnapshot,
      statusHistoryId: historyRecord.id,
      timestamp: Date.now(),
    });

    return updatedBooking;
  }

  async reassignProvider(
    bookingId: string,
    newProviderId: string,
    adminId: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }

    // Reassignment resets to PENDING then assigns
    if (booking.status !== BookingStatusEnum.ASSIGNED) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_INVALID_REASSIGN',
          message: 'Can only reassign from ASSIGNED status.',
        },
      });
    }

    await this.eligibilityService.verifyProviderEligibility(
      newProviderId,
      booking.serviceId,
    );

    const updatedBooking = await this.bookingRepo.assignProvider(
      bookingId,
      newProviderId,
    );

    const reassignHistoryRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: BookingStatusEnum.ASSIGNED,
      actorId: adminId,
      actorRole: ActorRoleEnum.ADMIN,
      note: `Provider reassigned from ${booking.providerId} to ${newProviderId}`,
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: 'ASSIGNED',
      customerId: booking.customerId,
      providerId: newProviderId,
      serviceName: booking.serviceNameSnapshot,
      slotDate: booking.slotDate,
      slotLabel: booking.slotLabelSnapshot,
      statusHistoryId: reassignHistoryRecord.id,
      timestamp: Date.now(),
    });

    return updatedBooking;
  }

  // ─── Provider Operations ───

  async getProviderBookings(
    providerId: string,
    filter: 'active' | 'history' = 'active',
    page: number = 1,
    limit: number = 10,
    status?: BookingStatusEnum,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    if (status) {
      return this.bookingRepo.findBookingsByProvider(
        providerId,
        filter,
        page,
        limit,
        status,
      );
    }
    if (filter === 'history') {
      return this.bookingRepo.findProviderHistoryBookings(
        providerId,
        page,
        limit,
      );
    }
    return this.bookingRepo.findBookingsByProvider(
      providerId,
      filter,
      page,
      limit,
    );
  }

  async getProviderBookingDetail(
    bookingId: string,
    providerId: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    if (booking.providerId !== providerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_BOOKING_FORBIDDEN',
          message: 'Access denied.',
        },
      });
    }
    return booking;
  }

  async providerAcceptBooking(
    bookingId: string,
    providerId: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    if (booking.providerId !== providerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_BOOKING_FORBIDDEN',
          message: 'You do not have permission to access this booking.',
        },
      });
    }

    if (booking.status === BookingStatusEnum.ACCEPTED) {
      return booking;
    }

    this.stateEngine.validateTransition(
      booking.status,
      BookingStatusEnum.ACCEPTED,
      ActorRoleEnum.PROVIDER,
    );

    const updatedBooking = await this.bookingRepo.updateBookingStatus(
      bookingId,
      BookingStatusEnum.ACCEPTED,
    );

    const acceptHistoryRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: BookingStatusEnum.ACCEPTED,
      actorId: providerId,
      actorRole: ActorRoleEnum.PROVIDER,
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: 'ACCEPTED',
      customerId: booking.customerId,
      providerId,
      serviceName: booking.serviceNameSnapshot,
      statusHistoryId: acceptHistoryRecord.id,
      timestamp: Date.now(),
    });

    return updatedBooking;
  }

  async providerRejectBooking(
    bookingId: string,
    providerId: string,
    reason: string,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    if (booking.providerId !== providerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_BOOKING_FORBIDDEN',
          message: 'You do not have permission to access this booking.',
        },
      });
    }

    this.stateEngine.validateTransition(
      booking.status,
      BookingStatusEnum.REJECTED,
      ActorRoleEnum.PROVIDER,
    );

    // Record REJECTED in history, but reset booking status to PENDING
    const rejectHistoryRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: BookingStatusEnum.REJECTED,
      actorId: providerId,
      actorRole: ActorRoleEnum.PROVIDER,
      note: reason,
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: 'REJECTED',
      customerId: booking.customerId,
      providerId,
      serviceName: booking.serviceNameSnapshot,
      statusHistoryId: rejectHistoryRecord.id,
      timestamp: Date.now(),
    });

    // Clear provider and reset to PENDING per DLD Section 6.4.5
    const updatedBooking = await this.bookingRepo.updateBookingStatus(
      bookingId,
      BookingStatusEnum.PENDING,
      { providerId: null },
    );

    return updatedBooking;
  }

  async providerUpdateStatus(
    bookingId: string,
    providerId: string,
    targetStatus: BookingStatusEnum,
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepo.findBookingById(bookingId);
    if (!booking) {
      throw new BookingNotFoundException(bookingId);
    }
    if (booking.providerId !== providerId) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'ERR_BOOKING_FORBIDDEN',
          message: 'You do not have permission to access this booking.',
        },
      });
    }

    if (booking.status === targetStatus) {
      return booking;
    }

    if (targetStatus === BookingStatusEnum.REJECTED) {
      return this.providerRejectBooking(
        bookingId,
        providerId,
        'Provider rejected via status update',
      );
    }

    this.stateEngine.validateTransition(
      booking.status,
      targetStatus,
      ActorRoleEnum.PROVIDER,
    );

    const additionalFields: Partial<BookingEntity> = {};
    if (targetStatus === BookingStatusEnum.COMPLETED) {
      additionalFields.completedAt = new Date();
    }

    const updatedBooking = await this.bookingRepo.updateBookingStatus(
      bookingId,
      targetStatus,
      additionalFields,
    );

    const statusHistoryRecord = await this.bookingRepo.createStatusHistory({
      bookingId,
      status: targetStatus,
      actorId: providerId,
      actorRole: ActorRoleEnum.PROVIDER,
    });

    this.domainEventEmitter.emitBookingStatusChanged({
      bookingId,
      status: targetStatus as any,
      customerId: booking.customerId,
      providerId,
      serviceName: booking.serviceNameSnapshot,
      statusHistoryId: statusHistoryRecord.id,
      timestamp: Date.now(),
    });

    return updatedBooking;
  }

  async getApprovedProviders(serviceCategoryId?: string): Promise<any[]> {
    const where: any = { status: 'APPROVED' };
    if (serviceCategoryId) {
      where.categories = {
        some: {
          id: serviceCategoryId,
        },
      };
    }
    return this.prisma.provider.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        mobileNumber: true,
        serviceArea: true,
        lastActiveAt: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getProviderDetails(providerId: string) {
    return this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { displayName: true },
    });
  }

  // ─── Private Helpers ───
  // ... rest of private helpers

  // ─── Private Helpers ───

  private computeRequestHash(dto: CreateBookingDto): string {
    const payload = JSON.stringify({
      serviceId: dto.serviceId,
      slotId: dto.slotId,
      slotDate: dto.slotDate,
      addressId: dto.addressId,
      paymentMethod: dto.paymentMethod,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  private validateSlotDate(dateStr: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(dateStr);
    slotDate.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new SlotDateInPastException();
    }
  }

  private validateSameDaySlot(dateStr: string, slot: TimeSlotEntity): void {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(dateStr);
    slotDate.setHours(0, 0, 0, 0);

    if (slotDate.getTime() === today.getTime()) {
      // Same-day booking — check 2-hour buffer
      const slotStartTime = new Date(slot.startTime);
      const bufferTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      // Compare only hours and minutes
      const slotMinutes =
        slotStartTime.getHours() * 60 + slotStartTime.getMinutes();
      const bufferMinutes =
        bufferTime.getHours() * 60 + bufferTime.getMinutes();

      if (slotMinutes < bufferMinutes) {
        throw new SameDaySlotTooSoonException();
      }
    }
  }
}
