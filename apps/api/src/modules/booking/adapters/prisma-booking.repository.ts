// ─── MOD-002 Prisma Booking Repository Adapter ───

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IBookingRepository } from '../ports/booking.repository.port';
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

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Booking CRUD ──

  async findBookingById(id: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    return booking ? this.mapBooking(booking) : null;
  }

  async findBookingByReference(ref: string): Promise<BookingEntity | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference: ref },
    });
    return booking ? this.mapBooking(booking) : null;
  }

  async findBookingsByCustomer(
    customerId: string,
    filter: 'current' | 'history',
    page: number,
    limit: number,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    const currentStatuses = [
      BookingStatusEnum.PENDING,
      BookingStatusEnum.ASSIGNED,
      BookingStatusEnum.ACCEPTED,
      BookingStatusEnum.ON_THE_WAY,
      BookingStatusEnum.STARTED,
    ];
    const historyStatuses = [
      BookingStatusEnum.COMPLETED,
      BookingStatusEnum.CANCELLED,
    ];

    const statusFilter =
      filter === 'current' ? currentStatuses : historyStatuses;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { customerId, status: { in: statusFilter } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: { customerId, status: { in: statusFilter } },
      }),
    ]);

    return { data: data.map(this.mapBooking), total };
  }

  async findBookingsByProvider(
    providerId: string,
    filter: 'active' | 'history',
    page: number,
    limit: number,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    const activeStatuses = [
      BookingStatusEnum.ASSIGNED,
      BookingStatusEnum.ACCEPTED,
      BookingStatusEnum.ON_THE_WAY,
      BookingStatusEnum.STARTED,
    ];

    const where =
      filter === 'active'
        ? { providerId, status: { in: activeStatuses } }
        : {
            providerId,
            status: {
              in: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED],
            },
          };

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data: data.map(this.mapBooking), total };
  }

  async findProviderHistoryBookings(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<{ data: BookingEntity[]; total: number }> {
    // DLD 6.4.3: Include bookings where provider_id matches OR where provider
    // rejected the booking (in status history) even though provider_id was cleared
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          OR: [
            {
              providerId,
              status: {
                in: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED],
              },
            },
            {
              statusHistory: {
                some: {
                  status: BookingStatusEnum.REJECTED,
                  actorId: providerId,
                },
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: {
          OR: [
            {
              providerId,
              status: {
                in: [BookingStatusEnum.COMPLETED, BookingStatusEnum.CANCELLED],
              },
            },
            {
              statusHistory: {
                some: {
                  status: BookingStatusEnum.REJECTED,
                  actorId: providerId,
                },
              },
            },
          ],
        },
      }),
    ]);

    return { data: data.map(this.mapBooking), total };
  }

  async findBookingsAdmin(query: {
    status?: BookingStatusEnum;
    date?: string;
    customerId?: string;
    providerId?: string;
    page: number;
    limit: number;
  }): Promise<{ data: BookingEntity[]; total: number }> {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.date) where.slotDate = new Date(query.date);
    if (query.customerId) where.customerId = query.customerId;
    if (query.providerId) where.providerId = query.providerId;

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data: data.map(this.mapBooking), total };
  }

  async createBooking(booking: {
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
  }): Promise<BookingEntity> {
    const created = await this.prisma.booking.create({
      data: {
        bookingReference: booking.bookingReference,
        customerId: booking.customerId,
        serviceId: booking.serviceId,
        serviceNameSnapshot: booking.serviceNameSnapshot,
        servicePriceSnapshot: parseFloat(booking.servicePriceSnapshot),
        addressId: booking.addressId,
        addressSnapshot: booking.addressSnapshot as any,
        slotDate: booking.slotDate,
        slotId: booking.slotId,
        slotLabelSnapshot: booking.slotLabelSnapshot,
        paymentMethod: booking.paymentMethod,
        idempotencyKey: booking.idempotencyKey,
      },
    });
    return this.mapBooking(created);
  }

  async updateBookingStatus(
    id: string,
    status: BookingStatusEnum,
    additionalFields?: Partial<BookingEntity>,
  ): Promise<BookingEntity> {
    const data: any = { status, updatedAt: new Date() };
    if (additionalFields?.cancelledAt)
      data.cancelledAt = additionalFields.cancelledAt;
    if (additionalFields?.completedAt)
      data.completedAt = additionalFields.completedAt;
    if ((additionalFields as any)?.providerId !== undefined) {
      data.providerId = (additionalFields as any).providerId;
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data,
    });
    return this.mapBooking(updated);
  }

  async assignProvider(
    bookingId: string,
    providerId: string,
  ): Promise<BookingEntity> {
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        providerId,
        status: BookingStatusEnum.ASSIGNED,
        updatedAt: new Date(),
      },
    });
    return this.mapBooking(updated);
  }

  // ── Status History ──

  async createStatusHistory(history: {
    bookingId: string;
    status: BookingStatusEnum;
    actorId: string;
    actorRole: ActorRoleEnum;
    note?: string;
  }): Promise<void> {
    await this.prisma.bookingStatusHistory.create({
      data: {
        bookingId: history.bookingId,
        status: history.status,
        actorId: history.actorId,
        actorRole: history.actorRole,
        note: history.note ?? null,
      },
    });
  }

  async findStatusHistory(
    bookingId: string,
  ): Promise<BookingStatusHistoryEntity[]> {
    const records = await this.prisma.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      status: r.status as BookingStatusEnum,
      actorId: r.actorId,
      actorRole: r.actorRole,
      note: r.note,
      createdAt: r.createdAt,
    }));
  }

  // ── Slot Locks ──

  async findSlotLock(slotId: string, slotDate: Date): Promise<SlotLock | null> {
    const lock = await this.prisma.bookingSlotLock.findUnique({
      where: { slotDate_slotId: { slotDate, slotId } },
    });
    return lock ? this.mapSlotLock(lock) : null;
  }

  async findSlotLockForCustomer(
    slotId: string,
    slotDate: Date,
    customerId: string,
  ): Promise<SlotLock | null> {
    const lock = await this.prisma.bookingSlotLock.findFirst({
      where: { slotId, slotDate, customerId },
    });
    return lock ? this.mapSlotLock(lock) : null;
  }

  async saveSlotLock(lock: {
    slotId: string;
    slotDate: Date;
    customerId: string;
    expiresAt: Date;
  }): Promise<SlotLock> {
    const created = await this.prisma.bookingSlotLock.create({
      data: {
        slotId: lock.slotId,
        slotDate: lock.slotDate,
        customerId: lock.customerId,
        expiresAt: lock.expiresAt,
      },
    });
    return this.mapSlotLock(created);
  }

  async updateSlotLockBookingId(
    lockId: string,
    bookingId: string,
  ): Promise<void> {
    await this.prisma.bookingSlotLock.update({
      where: { id: lockId },
      data: { bookingId },
    });
  }

  async deleteSlotLock(id: string): Promise<void> {
    await this.prisma.bookingSlotLock.delete({ where: { id } });
  }

  async findExpiredLocks(now: Date): Promise<SlotLock[]> {
    const locks = await this.prisma.bookingSlotLock.findMany({
      where: {
        expiresAt: { lt: now },
        bookingId: null, // Only orphan locks (not linked to a booking)
      },
    });
    return locks.map(this.mapSlotLock);
  }

  // ── Time Slots ──

  async findActiveTimeSlots(): Promise<TimeSlotEntity[]> {
    const slots = await this.prisma.bookingTimeSlot.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return slots.map((s) => ({
      id: s.id,
      label: s.label,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
      displayOrder: s.displayOrder,
    }));
  }

  async findTimeSlotById(id: string): Promise<TimeSlotEntity | null> {
    const slot = await this.prisma.bookingTimeSlot.findUnique({
      where: { id },
    });
    if (!slot) return null;
    return {
      id: slot.id,
      label: slot.label,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
      displayOrder: slot.displayOrder,
    };
  }

  // ── Idempotency ──

  async findIdempotencyRecord(
    customerId: string,
    key: string,
  ): Promise<IdempotencyRecord | null> {
    const record = await this.prisma.idempotencyKey.findUnique({
      where: { customerId_idempotencyKey: { customerId, idempotencyKey: key } },
    });
    if (!record) return null;
    return {
      id: record.id,
      customerId: record.customerId,
      idempotencyKey: record.idempotencyKey,
      requestHash: record.requestHash,
      responseCode: record.responseCode,
      responseBody: record.responseBody,
      createdAt: record.createdAt,
    };
  }

  async saveIdempotencyRecord(record: {
    customerId: string;
    idempotencyKey: string;
    requestHash: string;
    responseCode: number;
    responseBody: any;
  }): Promise<void> {
    await this.prisma.idempotencyKey.create({
      data: {
        customerId: record.customerId,
        idempotencyKey: record.idempotencyKey,
        requestHash: record.requestHash,
        responseCode: record.responseCode,
        responseBody: record.responseBody,
      },
    });
  }

  // ── Active Booking Check ──

  async hasActiveBooking(customerId: string): Promise<boolean> {
    const count = await this.prisma.booking.count({
      where: {
        customerId,
        status: {
          in: [
            BookingStatusEnum.PENDING,
            BookingStatusEnum.ASSIGNED,
            BookingStatusEnum.ACCEPTED,
            BookingStatusEnum.ON_THE_WAY,
            BookingStatusEnum.STARTED,
          ],
        },
      },
    });
    return count > 0;
  }

  // ── Mapping Helpers ──

  private mapBooking(record: any): BookingEntity {
    return {
      id: record.id,
      bookingReference: record.bookingReference,
      customerId: record.customerId,
      providerId: record.providerId,
      serviceId: record.serviceId,
      serviceNameSnapshot: record.serviceNameSnapshot,
      servicePriceSnapshot: record.servicePriceSnapshot?.toString() ?? '0',
      addressId: record.addressId,
      addressSnapshot: record.addressSnapshot as AddressSnapshot,
      slotDate: record.slotDate,
      slotId: record.slotId,
      slotLabelSnapshot: record.slotLabelSnapshot,
      paymentMethod: record.paymentMethod as PaymentMethodEnum,
      status: record.status as BookingStatusEnum,
      idempotencyKey: record.idempotencyKey,
      rejectionReason: record.rejectionReason,
      cancelledAt: record.cancelledAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private mapSlotLock(record: any): SlotLock {
    return {
      id: record.id,
      slotId: record.slotId,
      slotDate: record.slotDate,
      customerId: record.customerId,
      expiresAt: record.expiresAt,
      bookingId: record.bookingId,
      createdAt: record.createdAt,
    };
  }
}
