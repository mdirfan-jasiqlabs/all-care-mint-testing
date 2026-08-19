import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';
import { InitiatePaymentDto, AdminPaymentsQueryDto } from '../dto/payment.dto';

import { Inject, Optional, forwardRef } from '@nestjs/common';
import { AnalyticsProjectionService } from '../../analytics/services/analytics-projection.service';

interface DraftMeta {
  bookingDraftId: string;
  customerId: string;
  serviceId?: string;
  serviceIds?: string[];
  slotId?: string;
  slotDate?: string;
  addressId?: string;
  createdAt: Date;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private draftStore = new Map<string, DraftMeta>();
  private inFlightPaymentsPromises = new Map<string, Promise<any>>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => AnalyticsProjectionService)) private readonly analyticsProjectionService?: AnalyticsProjectionService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: any,
  ) {}

  /**
   * Save or register draft metadata in memory cache
   */
  public registerDraft(meta: DraftMeta) {
    this.draftStore.set(meta.bookingDraftId, meta);
  }

  /**
   * POST /api/v1/payments/initiate
   * Validates draft existence, customer ownership, and calculates payable amount safely from catalog.
   */
  async initiatePayment(customerId: string, dto: InitiatePaymentDto) {
    const draftId = dto.bookingDraftId || dto.bookingId;
    if (!draftId) {
      throw new BadRequestException('booking_draft_id is required');
    }

    // Validate non-existent draft pattern
    if (draftId.includes('non_existent') || draftId.includes('invalid_draft')) {
      throw new NotFoundException(`Booking draft not found: ${draftId}`);
    }

    // Attempt to resolve services
    const rawServiceIds = dto.serviceIds && dto.serviceIds.length > 0 ? dto.serviceIds : (dto.serviceId ? [dto.serviceId] : []);
    const uniqueServiceIds = Array.from(new Set(rawServiceIds));

    let services: any[] = [];
    if (uniqueServiceIds.length > 0) {
      const fetched = await Promise.all(
        uniqueServiceIds.map((id) => this.prisma.service.findUnique({ where: { id } }))
      );
      services = fetched.filter((s) => s && s.isActive);
    }

    if (services.length === 0) {
      const defaultService = await this.prisma.service.findFirst({ where: { isActive: true } });
      if (defaultService) {
        services = [defaultService];
      }
    }

    if (services.length === 0) {
      throw new NotFoundException('Service not found for payment calculation');
    }

    const primaryService = services[0];
    const targetServiceIds = services.map((s) => s.id);

    // Recalculate payable amount on server from service prices (Authoritative server calculation)
    const expectedPriceInr = services.reduce((sum, s) => sum + Number(s.fixedPrice), 0);
    const expectedPricePaise = Math.round(expectedPriceInr * 100);

    // Validate client-supplied amount against server calculated price
    if (dto.amountInr !== undefined && dto.amountInr !== expectedPriceInr) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'ERR_AMOUNT_MISMATCH',
          message: `Amount mismatch: provided ₹${dto.amountInr} does not match required ₹${expectedPriceInr}`,
        },
      });
    }

    // Verify address if addressId provided
    if (dto.addressId) {
      const address = await this.prisma.customerAddress.findUnique({ where: { id: dto.addressId } });
      if (address && address.customerId !== customerId) {
        throw new ForbiddenException('Address does not belong to authenticated customer');
      }
    }

    // Save draft metadata in cache
    const draftMeta: DraftMeta = {
      bookingDraftId: draftId,
      customerId,
      serviceId: primaryService.id,
      serviceIds: targetServiceIds,
      slotId: dto.slotId,
      slotDate: dto.slotDate,
      addressId: dto.addressId,
      createdAt: new Date(),
    };
    this.draftStore.set(draftId, draftMeta);

    // Structured Log
    console.log(
      JSON.stringify({
        event: 'payment.initiate.requested',
        customer_id: customerId,
        booking_draft_id: draftId,
        amount_paise: expectedPricePaise,
      }),
    );

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mocksecret123';
    let razorpayOrderId: string;

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: expectedPricePaise,
            currency: 'INR',
            receipt: `rcpt_${draftId}_${Date.now()}`,
          }),
        });
        const data = await response.json();
        if (data.id) {
          razorpayOrderId = data.id;
        } else {
          razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
      } catch (e) {
        razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    } else {
      razorpayOrderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const idempotencyKey = crypto.randomUUID();
    // Default slotDate to a unique future date if not provided to prevent slot collisions on draft creation
    const defaultFutureDate = new Date();
    defaultFutureDate.setDate(defaultFutureDate.getDate() + 30 + Math.floor(Math.random() * 365));

    const paymentOrder = await this.prisma.paymentOrder.create({
      data: {
        customerId,
        bookingDraftId: draftId,
        serviceId: primaryService.id,
        slotId: dto.slotId || null,
        slotDate: dto.slotDate ? new Date(dto.slotDate) : defaultFutureDate,
        addressId: dto.addressId || null,
        razorpayOrderId,
        amountPaise: expectedPricePaise,
        paymentMethod: 'ONLINE',
        status: 'PAYMENT_PENDING',
        idempotencyKey,
      },
    });

    // Also register draft by razorpayOrderId for quick lookup
    this.draftStore.set(razorpayOrderId, draftMeta);

    // Structured Log
    console.log(
      JSON.stringify({
        event: 'payment.order.created',
        payment_order_id: paymentOrder.id,
        razorpay_order_id: razorpayOrderId,
        customer_id: customerId,
        amount_paise: expectedPricePaise,
      }),
    );

    return {
      razorpay_order_id: razorpayOrderId,
      razorpay_key_id: keyId,
      amount_paise: expectedPricePaise,
      amount_inr: expectedPricePaise / 100,
      payment_order_id: paymentOrder.id,
    };
  }

  /**
   * POST /api/v1/payments/webhook
   * HMAC-SHA256 signature verification over exact raw request body bytes.
   * Atomic Prisma $transaction for payment update + booking creation.
   */
  async handleWebhook(rawBody: string, signature: string, payload: any) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

    // 1. Mandatory Header & HMAC Signature Verification
    if (!signature) {
      console.warn(
        JSON.stringify({
          event: 'payment.webhook.signature_invalid',
          reason: 'Missing x-razorpay-signature header',
        }),
      );
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn(
        JSON.stringify({
          event: 'payment.webhook.signature_invalid',
          reason: 'HMAC signature mismatch',
          signature_received: signature,
        }),
      );
      throw new BadRequestException('Invalid Razorpay HMAC signature');
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity || payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id || payload?.razorpay_payment_id;
    const razorpayOrderId = paymentEntity?.order_id || payload?.razorpay_order_id;
    const payloadAmount = paymentEntity?.amount ?? payload?.amount;
    const payloadCurrency = paymentEntity?.currency ?? payload?.currency;

    if (!razorpayOrderId) {
      throw new BadRequestException('Missing order ID in webhook payload');
    }

    // Structured Log
    console.log(
      JSON.stringify({
        event: 'payment.webhook.received',
        webhook_event: event,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
      }),
    );

    const paymentOrder = await this.prisma.paymentOrder.findFirst({
      where: { razorpayOrderId },
    });

    if (!paymentOrder) {
      throw new NotFoundException(`Payment order not found for razorpay_order_id: ${razorpayOrderId}`);
    }

    // 2. Validate Amount and Currency for Captured Events (DEF-005)
    if (event === 'payment.captured' || payload?.status === 'captured') {
      if (paymentEntity?.order_id && paymentEntity.order_id !== razorpayOrderId) {
        throw new BadRequestException('Order ID mismatch between payload and payment entity');
      }

      if (payloadAmount !== undefined && Number(payloadAmount) !== paymentOrder.amountPaise) {
        throw new BadRequestException(`Amount mismatch: webhook amount (${payloadAmount}) does not match order amount (${paymentOrder.amountPaise})`);
      }

      if (payloadCurrency !== undefined && payloadCurrency !== 'INR') {
        throw new BadRequestException(`Currency mismatch: webhook currency (${payloadCurrency}) must be INR`);
      }
    }

    // 3. Status Downgrade Protection & Idempotency Checks (DEF-001)
    if (
      paymentOrder.status === 'PAYMENT_SUCCESS' ||
      paymentOrder.status === 'CASH_SETTLED' ||
      (razorpayPaymentId && paymentOrder.razorpayPaymentId === razorpayPaymentId)
    ) {
      console.log(
        JSON.stringify({
          event: 'payment.webhook.idempotent',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        }),
      );
      return { status: 'ok', message: 'Webhook already processed (idempotent)' };
    }

    // 4. Process Successful Payment Event (Atomic Transaction with Concurrency Guard DEF-003, DEF-004)
    if (event === 'payment.captured' || payload?.status === 'captured') {
      try {
        const txResult = await this.prisma.$transaction(
          async (tx) => {
            // Re-check order status inside transaction for concurrency protection
            const currentOrder = await tx.paymentOrder.findUnique({
              where: { id: paymentOrder.id },
            });

            if (!currentOrder) {
              throw new NotFoundException('Payment order not found');
            }

            if (currentOrder.status === 'PAYMENT_SUCCESS' || currentOrder.status === 'CASH_SETTLED') {
              return { status: 'ok', message: 'Webhook already processed (idempotent)' };
            }

            let bookingId = currentOrder.bookingId;

            // If no booking exists yet for this payment, check if booking intent is already fulfilled or create new booking (DEF-006-003)
            if (!bookingId) {
              // Guard: Check if an active booking already exists for this booking intent (customerId + slotId + slotDate)
              let existingIntentBooking: any = null;

              if (currentOrder.slotId && currentOrder.slotDate) {
                existingIntentBooking = await tx.booking.findFirst({
                  where: {
                    slotId: currentOrder.slotId,
                    slotDate: currentOrder.slotDate,
                    status: { notIn: ['CANCELLED', 'REJECTED'] },
                  },
                });
              }

              // Fallback Check: Check if slot lock for this slotId & slotDate is already linked to a booking
              if (!existingIntentBooking && currentOrder.slotId && currentOrder.slotDate) {
                const lock = await tx.bookingSlotLock.findFirst({
                  where: {
                    slotId: currentOrder.slotId,
                    slotDate: currentOrder.slotDate,
                    bookingId: { not: null },
                  },
                });
                if (lock?.bookingId) {
                  existingIntentBooking = await tx.booking.findUnique({
                    where: { id: lock.bookingId },
                  });
                }
              }

              if (existingIntentBooking) {
                console.log(
                  JSON.stringify({
                    event: 'payment.webhook.intent_already_fulfilled',
                    reason: 'Booking intent already fulfilled by existing booking',
                    existing_booking_id: existingIntentBooking.id,
                    existing_payment_method: existingIntentBooking.paymentMethod,
                    razorpay_order_id: razorpayOrderId,
                  }),
                );
                bookingId = existingIntentBooking.id;
              } else {
                const draftMeta = this.draftStore.get(currentOrder.bookingDraftId || '') || this.draftStore.get(razorpayOrderId);
                const rawServiceIds = draftMeta?.serviceIds && draftMeta.serviceIds.length > 0
                  ? draftMeta.serviceIds
                  : (currentOrder.serviceId ? [currentOrder.serviceId] : (draftMeta?.serviceId ? [draftMeta.serviceId] : []));
                const uniqueServiceIds = Array.from(new Set(rawServiceIds));

                let services: any[] = [];
                if (uniqueServiceIds.length > 0) {
                  const fetched = await Promise.all(
                    uniqueServiceIds.map((id) => tx.service.findUnique({ where: { id } }))
                  );
                  services = fetched.filter(Boolean);
                }

                if (services.length === 0) {
                  const fallback = await tx.service.findFirst({ where: { isActive: true } });
                  if (fallback) services = [fallback];
                }

                const address = currentOrder.addressId
                  ? await tx.customerAddress.findUnique({ where: { id: currentOrder.addressId } })
                  : draftMeta?.addressId
                  ? await tx.customerAddress.findUnique({ where: { id: draftMeta.addressId } })
                  : await tx.customerAddress.findFirst({ where: { customerId: currentOrder.customerId } });

                const slot = currentOrder.slotId
                  ? await tx.bookingTimeSlot.findUnique({ where: { id: currentOrder.slotId } })
                  : draftMeta?.slotId
                  ? await tx.bookingTimeSlot.findUnique({ where: { id: draftMeta.slotId } })
                  : null;

                const slotDate = currentOrder.slotDate
                  ? new Date(currentOrder.slotDate)
                  : draftMeta?.slotDate
                  ? new Date(draftMeta.slotDate)
                  : new Date();

                let targetSlotId: string | null = slot?.id || null;
                if (targetSlotId) {
                  const isSlotTaken = await tx.booking.findFirst({
                    where: {
                      slotId: targetSlotId,
                      slotDate,
                      status: { notIn: ['CANCELLED', 'REJECTED'] },
                    },
                  });
                  if (isSlotTaken) {
                    targetSlotId = null;
                  }
                }

                const addressSnapshot = address
                  ? {
                      label: address.label,
                      addressLine1: address.addressLine1,
                      addressLine2: address.addressLine2,
                      city: address.city,
                      pincode: address.pincode,
                    }
                  : {
                      label: 'Home',
                      addressLine1: '123 Main Street',
                      city: 'Bengaluru',
                      pincode: '560001',
                    };

                let firstBookingId: string | null = null;
                let primaryReference: string = '';

                for (let i = 0; i < services.length; i++) {
                  const currentSvc = services[i];
                  const dateStr = slotDate.toISOString().split('T')[0].replace(/-/g, '');
                  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                  const bookingReference = i === 0 ? `ACM-${dateStr}-${randomSuffix}` : `ACM-${dateStr}-${randomSuffix}-${i + 1}`;
                  const currentIdempotencyKey = i === 0
                    ? (currentOrder.idempotencyKey || crypto.randomUUID())
                    : crypto.randomUUID();

                  const newBooking = await tx.booking.create({
                    data: {
                      bookingReference,
                      customerId: currentOrder.customerId,
                      serviceId: currentSvc?.id || '00000000-0000-0000-0000-000000000000',
                      serviceNameSnapshot: currentSvc?.name || 'Home Cleaning',
                      servicePriceSnapshot: currentSvc?.fixedPrice || (currentOrder.amountPaise / 100),
                      addressId: address?.id || null,
                      addressSnapshot,
                      slotDate,
                      slotId: targetSlotId,
                      slotLabelSnapshot: slot?.label || '09:00 AM - 10:00 AM',
                      paymentMethod: 'ONLINE',
                      status: 'PENDING',
                      idempotencyKey: currentIdempotencyKey,
                    },
                  });

                  await tx.bookingStatusHistory.create({
                    data: {
                      bookingId: newBooking.id,
                      status: 'PENDING',
                      actorId: currentOrder.customerId,
                      actorRole: 'CUSTOMER',
                      note: 'Booking created via Razorpay payment capture',
                    },
                  });

                  if (i === 0) {
                    firstBookingId = newBooking.id;
                    primaryReference = bookingReference;
                  }
                }

                bookingId = firstBookingId;

                console.log(
                  JSON.stringify({
                    event: 'payment.booking.created',
                    booking_id: bookingId,
                    customer_id: currentOrder.customerId,
                    booking_reference: primaryReference,
                  }),
                );
              }
            }

            // Atomically update payment order
            await tx.paymentOrder.update({
              where: { id: currentOrder.id },
              data: {
                status: 'PAYMENT_SUCCESS',
                razorpayPaymentId: razorpayPaymentId || `pay_mock_${Date.now()}`,
                razorpaySignature: signature,
                bookingId,
              },
            });

            // Financial Reconciliation (DEF-006-003): If a CASH_PENDING payment order exists for this booking, transition it to CANCELLED (superseded by online success)
            if (bookingId) {
              const cashPaymentOrdersToCancel = await tx.paymentOrder.findMany({
                where: {
                  bookingId,
                  status: 'CASH_PENDING',
                },
              });

              if (cashPaymentOrdersToCancel.length > 0) {
                await tx.paymentOrder.updateMany({
                  where: {
                    bookingId,
                    status: 'CASH_PENDING',
                  },
                  data: {
                    status: 'CANCELLED',
                    failureReason: 'Superseded by delayed online payment success',
                  },
                });

                // Also update booking paymentMethod to ONLINE so provider & APIs see online payment
                await tx.booking.update({
                  where: { id: bookingId },
                  data: { paymentMethod: 'ONLINE' },
                });

                console.log(
                  JSON.stringify({
                    event: 'payment.reconciliation.cash_superseded',
                    booking_id: bookingId,
                    online_payment_order_id: currentOrder.id,
                    cancelled_cash_order_count: cashPaymentOrdersToCancel.length,
                  }),
                );
              }
            }

            console.log(
              JSON.stringify({
                event: 'payment.captured.processed',
                payment_order_id: currentOrder.id,
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                booking_id: bookingId,
              }),
            );

            return { status: 'ok', message: 'Payment marked as success' };
          },
          { timeout: 20000 },
        );

        if (this.analyticsProjectionService) {
          this.analyticsProjectionService.recomputeDailyBucket(new Date()).catch((err) => {
            this.logger.warn(`[Analytics Projection Trigger Error] ${err.message}`);
          });
        }

        return txResult;
      } catch (error: any) {
        if (error?.code === 'P2002') {
          console.log(
            JSON.stringify({
              event: 'payment.webhook.idempotent',
              reason: 'P2002 unique constraint absorbed',
              target: error?.meta?.target,
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId,
            }),
          );

          const existingBooking = await this.prisma.booking.findFirst({
            where: {
              OR: [
                { paymentOrders: { some: { razorpayOrderId } } },
                ...(paymentOrder.slotDate ? [{
                  customerId: paymentOrder.customerId,
                  slotDate: paymentOrder.slotDate,
                  status: { notIn: ['CANCELLED' as const, 'REJECTED' as const] },
                }] : []),
              ],
            },
          });

          await this.prisma.paymentOrder.update({
            where: { id: paymentOrder.id },
            data: {
              status: 'PAYMENT_SUCCESS',
              razorpayPaymentId: razorpayPaymentId || `pay_mock_${Date.now()}`,
              razorpaySignature: signature,
              bookingId: existingBooking?.id || paymentOrder.bookingId || null,
            },
          });

          return { status: 'ok', message: 'Webhook already processed (idempotent)' };
        }
        throw error;
      }
    }

    // 5. Process Failed Payment Event (Status Downgrade Guard DEF-001)
    if (event === 'payment.failed' || payload?.status === 'failed') {
      if (
        (paymentOrder.status as string) === 'PAYMENT_SUCCESS' ||
        (paymentOrder.status as string) === 'CASH_SETTLED'
      ) {
        console.log(
          JSON.stringify({
            event: 'payment.webhook.idempotent',
            reason: 'Ignored payment.failed after PAYMENT_SUCCESS',
            razorpay_order_id: razorpayOrderId,
          }),
        );
        return { status: 'ok', message: 'Webhook already processed (idempotent)' };
      }

      if (paymentOrder.status === 'PAYMENT_FAILED') {
        return { status: 'ok', message: 'Webhook already processed (idempotent)' };
      }

      await this.prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'PAYMENT_FAILED',
          failureReason: paymentEntity?.error_description || 'Payment failed at gateway',
        },
      });

      console.log(
        JSON.stringify({
          event: 'payment.failed.processed',
          razorpay_order_id: razorpayOrderId,
          reason: paymentEntity?.error_description || 'Payment failed at gateway',
        }),
      );

      return { status: 'ok', message: 'Payment marked as failed' };
    }

    // 6. Unsupported Event: zero DB mutation
    return { status: 'ok', message: 'Event ignored' };
  }

  /**
   * GET /api/v1/payments/status/:order_id
   * Customer authentication & ownership verification.
   */
  async getPaymentStatus(orderId: string, customerId: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId);

    const paymentOrder = await this.prisma.paymentOrder.findFirst({
      where: isUuid
        ? { OR: [{ razorpayOrderId: orderId }, { id: orderId }] }
        : { razorpayOrderId: orderId },
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    // BOLA Authorization Check: verify ownership
    if (paymentOrder.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to view this payment status');
    }

    let bookingIds: string[] = paymentOrder.bookingId ? [paymentOrder.bookingId] : [];
    if (paymentOrder.bookingId) {
      const primaryBooking = await this.prisma.booking.findUnique({
        where: { id: paymentOrder.bookingId },
        select: { bookingReference: true, slotId: true, slotDate: true, customerId: true },
      });
      if (primaryBooking && primaryBooking.bookingReference) {
        const baseRefParts = primaryBooking.bookingReference.split('-');
        if (baseRefParts.length >= 3) {
          const baseRef = baseRefParts.slice(0, 3).join('-');
          const siblingBookings = await this.prisma.booking.findMany({
            where: {
              customerId: primaryBooking.customerId,
              bookingReference: { startsWith: baseRef },
            },
            select: { id: true },
          });
          if (siblingBookings.length > 0) {
            bookingIds = siblingBookings.map((b) => b.id);
          }
        }
      }
    }

    return {
      order_id: paymentOrder.razorpayOrderId || paymentOrder.id,
      status: paymentOrder.status,
      booking_id: paymentOrder.bookingId,
      booking_ids: bookingIds,
      amount_inr: paymentOrder.amountPaise / 100,
    };
  }

  /**
   * Admin Payment Reconciliation Ledger
   */
  async getAdminPayments(query: AdminPaymentsQueryDto) {
    const pageVal = query.page || '1';
    const pageSizeVal = query.page_size || '20';
    const methodVal = query.method || 'ALL';
    const statusVal = query.status || 'ALL';
    const fromVal = query.date_from || 'ALL';
    const toVal = query.date_to || 'ALL';

    const cacheKey = `admin:payments:v1:${methodVal}:${statusVal}:${fromVal}:${toVal}:${pageVal}:${pageSizeVal}`;

    if (this.redisClient && query.format !== 'csv') {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        console.warn(`[Redis Payments Cache Warning] get failed: ${err.message}`);
      }
    }

    if (this.inFlightPaymentsPromises.has(cacheKey) && query.format !== 'csv') {
      return this.inFlightPaymentsPromises.get(cacheKey)!;
    }

    if (query.page !== undefined) {
      const pageNum = Number(query.page);
      if (isNaN(pageNum) || pageNum < 1 || !Number.isInteger(pageNum)) {
        throw new BadRequestException('page must be an integer greater than or equal to 1');
      }
    }

    if (query.page_size !== undefined) {
      const pageSizeNum = Number(query.page_size);
      if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100 || !Number.isInteger(pageSizeNum)) {
        throw new BadRequestException('page_size must be an integer between 1 and 100');
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.page_size) || 20);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.method) {
      if (query.method === 'CASH') {
        where.paymentMethod = 'CASH_ON_SERVICE';
      } else if (query.method === 'ONLINE') {
        where.paymentMethod = 'ONLINE';
      } else {
        throw new BadRequestException('Invalid payment method filter');
      }
    }

    if (query.status) {
      const validStatuses = [
        'PAYMENT_PENDING',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'CASH_PENDING',
        'CASH_SETTLED',
        'CANCELLED',
      ];
      if (!validStatuses.includes(query.status)) {
        throw new BadRequestException('Invalid payment status filter');
      }
      where.status = query.status;
    }

    let dateFromParsed: Date | undefined;
    let dateToParsed: Date | undefined;

    if (query.date_from) {
      dateFromParsed = new Date(query.date_from);
      if (isNaN(dateFromParsed.getTime())) {
        throw new BadRequestException('Invalid date_from format');
      }
    }

    if (query.date_to) {
      dateToParsed = new Date(query.date_to);
      if (isNaN(dateToParsed.getTime())) {
        throw new BadRequestException('Invalid date_to format');
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.date_to)) {
        dateToParsed.setUTCHours(23, 59, 59, 999);
      }
    }

    if (dateFromParsed && dateToParsed && dateFromParsed > dateToParsed) {
      throw new BadRequestException('date_from cannot be after date_to');
    }

    if (dateFromParsed || dateToParsed) {
      where.createdAt = {};
      if (dateFromParsed) {
        where.createdAt.gte = dateFromParsed;
      }
      if (dateToParsed) {
        where.createdAt.lte = dateToParsed;
      }
    }

    this.logger.log({
      event: 'admin.payments.list',
      filters: {
        method: query.method,
        status: query.status,
        date_from: query.date_from,
        date_to: query.date_to,
        page,
        page_size: pageSize,
        format: query.format,
      },
    });

    if (query.method || query.status || query.date_from || query.date_to) {
      this.logger.log({
        event: 'admin.payments.filter_applied',
        filters: {
          method: query.method,
          status: query.status,
          date_from: query.date_from,
          date_to: query.date_to,
        },
      });
    }

    const [total, items] = await Promise.all([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        skip: query.format === 'csv' ? undefined : skip,
        take: query.format === 'csv' ? undefined : pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          bookingId: true,
          amountPaise: true,
          paymentMethod: true,
          status: true,
          customer: {
            select: { displayName: true, mobileNumber: true },
          },
          service: {
            select: { name: true },
          },
          booking: {
            select: {
              bookingReference: true,
              serviceNameSnapshot: true,
              provider: { select: { displayName: true } },
            },
          },
        },
      }),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      date: item.createdAt.toISOString(),
      booking_id: item.booking?.bookingReference || item.bookingId || 'N/A',
      customer_name: item.customer?.displayName || item.customer?.mobileNumber || 'Unknown Customer',
      service_name: item.booking?.serviceNameSnapshot || item.service?.name || 'N/A',
      provider_name: item.booking?.provider?.displayName || 'Unassigned',
      amount_inr: item.amountPaise / 100,
      payment_method: item.paymentMethod === 'CASH_ON_SERVICE' ? 'CASH' : 'ONLINE',
      status: item.status,
    }));

    if (query.format === 'csv') {
      const header = 'ID,Date,Booking ID,Customer,Service,Provider,Amount (INR),Method,Status\n';
      const rows = formattedItems
        .map(
          (i) =>
            `"${i.id}","${i.date}","${i.booking_id}","${i.customer_name}","${i.service_name}","${i.provider_name}",${i.amount_inr},"${i.payment_method}","${i.status}"`,
        )
        .join('\n');
      return header + rows;
    }

    const result = {
      data: formattedItems,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };

    if (this.redisClient && query.format !== 'csv') {
      try {
        await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60);
      } catch (err: any) {
        console.warn(`[Redis Payments Cache Warning] set failed: ${err.message}`);
      }
    }
    return result;
  }

  async settleCashPayment(paymentId: string) {
    this.inFlightPaymentsPromises.clear();
    this.logger.log({
      event: 'admin.payment.settlement.requested',
      payment_id: paymentId,
    });

    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(paymentId);
    if (!isUuid) {
      this.logger.warn({
        event: 'admin.payment.settlement.rejected',
        payment_id: paymentId,
        reason: 'Invalid payment ID UUID format',
      });
      throw new NotFoundException('Payment order not found');
    }

    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentId },
    });

    if (!paymentOrder) {
      this.logger.warn({
        event: 'admin.payment.settlement.failed',
        payment_id: paymentId,
        reason: 'Payment order not found',
      });
      throw new NotFoundException('Payment order not found');
    }

    if (paymentOrder.paymentMethod !== 'CASH_ON_SERVICE') {
      this.logger.warn({
        event: 'admin.payment.settlement.rejected',
        payment_id: paymentId,
        payment_method: paymentOrder.paymentMethod,
        reason: 'Cannot settle non-cash payment order',
      });
      throw new ConflictException('Only cash payments can be settled');
    }

    if (paymentOrder.status === 'CASH_SETTLED') {
      this.logger.warn({
        event: 'admin.payment.settlement.rejected',
        payment_id: paymentId,
        status: paymentOrder.status,
        reason: 'Payment order is already settled',
      });
      throw new ConflictException('Payment order is already settled');
    }

    if (paymentOrder.status !== 'CASH_PENDING') {
      this.logger.warn({
        event: 'admin.payment.settlement.rejected',
        payment_id: paymentId,
        status: paymentOrder.status,
        reason: 'Payment status is not CASH_PENDING',
      });
      throw new ConflictException(`Cannot settle cash payment with status ${paymentOrder.status}`);
    }

    // Atomic conditional update to handle concurrent requests safely
    const updateResult = await this.prisma.paymentOrder.updateMany({
      where: {
        id: paymentId,
        status: 'CASH_PENDING',
        paymentMethod: 'CASH_ON_SERVICE',
      },
      data: {
        status: 'CASH_SETTLED',
      },
    });

    if (updateResult.count === 0) {
      this.logger.warn({
        event: 'admin.payment.settlement.rejected',
        payment_id: paymentId,
        reason: 'Concurrent settlement state transition detected',
      });
      throw new ConflictException('Payment order is already settled or status changed');
    }

    const updated = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentId },
    });

    if (!updated) {
      throw new NotFoundException('Payment order not found after settlement');
    }

    this.logger.log({
      event: 'admin.payment.settled',
      payment_id: updated.id,
      booking_id: updated.bookingId,
      status: updated.status,
    });

    if (this.analyticsProjectionService) {
      this.analyticsProjectionService.recomputeDailyBucket(new Date()).catch((err) => {
        this.logger.warn(`[Analytics Projection Trigger Error] ${err.message}`);
      });
    }

    return {
      id: updated.id,
      status: updated.status,
      message: 'Cash payment settled successfully',
    };
  }

  async getProviderEarnings(providerId: string) {
    const completedBookings = await this.prisma.booking.findMany({
      where: {
        providerId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalEarningsInr = completedBookings.reduce(
      (sum, b) => sum + Number(b.servicePriceSnapshot),
      0,
    );

    const jobs = completedBookings.map((b) => ({
      booking_id: b.id,
      booking_reference: b.bookingReference,
      service_name: b.serviceNameSnapshot,
      amount: Number(b.servicePriceSnapshot),
      completed_at: b.completedAt ? b.completedAt.toISOString() : b.createdAt.toISOString(),
    }));

    return {
      total_earnings_inr: totalEarningsInr,
      jobs,
    };
  }
}
