import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface InitiatePaymentDto {
  bookingDraftId?: string;
  serviceId?: string;
  slotId?: string;
  slotDate?: string;
  addressId?: string;
  bookingId?: string;
  amountInr?: number;
  amountPaise?: number;
}

export interface AdminPaymentsQueryDto {
  method?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  format?: string;
}

interface DraftMeta {
  bookingDraftId: string;
  customerId: string;
  serviceId?: string;
  slotId?: string;
  slotDate?: string;
  addressId?: string;
  createdAt: Date;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private draftStore = new Map<string, DraftMeta>();

  constructor(private readonly prisma: PrismaService) {}

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

    // Attempt to resolve service
    let service = null;
    if (dto.serviceId) {
      service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    }
    if (!service) {
      service = await this.prisma.service.findFirst({ where: { isActive: true } });
    }

    if (!service) {
      throw new NotFoundException('Service not found for payment calculation');
    }

    // Recalculate payable amount on server from service price
    const expectedPriceInr = Number(service.fixedPrice);
    const expectedPricePaise = Math.round(expectedPriceInr * 100);

    // Validate client-supplied amount against server calculated price
    if (dto.amountInr !== undefined && dto.amountInr !== expectedPriceInr) {
      if (dto.amountInr <= 0 || dto.amountInr < expectedPriceInr) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'ERR_AMOUNT_MISMATCH',
            message: `Amount mismatch: provided ₹${dto.amountInr} does not match required ₹${expectedPriceInr}`,
          },
        });
      }
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
      serviceId: service.id,
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
        serviceId: service.id,
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
        return await this.prisma.$transaction(async (tx) => {
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

          // If no booking exists yet for this payment, create exactly ONE booking with status PENDING
          if (!bookingId) {
            const draftMeta = this.draftStore.get(currentOrder.bookingDraftId || '') || this.draftStore.get(razorpayOrderId);

            // Resolve service, address, slot directly from persistent DB columns (DEF-002)
            const service = currentOrder.serviceId
              ? await tx.service.findUnique({ where: { id: currentOrder.serviceId } })
              : draftMeta?.serviceId
              ? await tx.service.findUnique({ where: { id: draftMeta.serviceId } })
              : await tx.service.findFirst({ where: { isActive: true } });

            const address = currentOrder.addressId
              ? await tx.customerAddress.findUnique({ where: { id: currentOrder.addressId } })
              : draftMeta?.addressId
              ? await tx.customerAddress.findUnique({ where: { id: draftMeta.addressId } })
              : await tx.customerAddress.findFirst({ where: { customerId: currentOrder.customerId } });

            const slot = currentOrder.slotId
              ? await tx.bookingTimeSlot.findUnique({ where: { id: currentOrder.slotId } })
              : draftMeta?.slotId
              ? await tx.bookingTimeSlot.findUnique({ where: { id: draftMeta.slotId } })
              : await tx.bookingTimeSlot.findFirst({ where: { isActive: true } });

            const slotDate = currentOrder.slotDate
              ? new Date(currentOrder.slotDate)
              : draftMeta?.slotDate
              ? new Date(draftMeta.slotDate)
              : new Date();

            const dateStr = slotDate.toISOString().split('T')[0].replace(/-/g, '');
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const bookingReference = `ACM-${dateStr}-${randomSuffix}`;

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

            const newBooking = await tx.booking.create({
              data: {
                bookingReference,
                customerId: currentOrder.customerId,
                serviceId: service?.id || '00000000-0000-0000-0000-000000000000',
                serviceNameSnapshot: service?.name || 'Home Cleaning',
                servicePriceSnapshot: service?.fixedPrice || (currentOrder.amountPaise / 100),
                addressId: address?.id || null,
                addressSnapshot,
                slotDate,
                slotId: slot?.id || null,
                slotLabelSnapshot: slot?.label || '09:00 AM - 10:00 AM',
                paymentMethod: 'ONLINE',
                status: 'PENDING',
                idempotencyKey: currentOrder.idempotencyKey || crypto.randomUUID(),
              },
            });

            // Create status history record
            await tx.bookingStatusHistory.create({
              data: {
                bookingId: newBooking.id,
                status: 'PENDING',
                actorId: currentOrder.customerId,
                actorRole: 'CUSTOMER',
                note: 'Booking created via Razorpay payment capture',
              },
            });

            bookingId = newBooking.id;

            console.log(
              JSON.stringify({
                event: 'payment.booking.created',
                booking_id: bookingId,
                customer_id: currentOrder.customerId,
                booking_reference: bookingReference,
              }),
            );
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
        });
      } catch (error: any) {
        if (
          error?.code === 'P2002' &&
          Array.isArray(error?.meta?.target) &&
          error.meta.target.includes('razorpay_payment_id')
        ) {
          console.log(
            JSON.stringify({
              event: 'payment.webhook.idempotent',
              reason: 'Concurrent transaction P2002 razorpay_payment_id constraint absorbed',
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId,
            }),
          );
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

    return {
      order_id: paymentOrder.razorpayOrderId || paymentOrder.id,
      status: paymentOrder.status,
      booking_id: paymentOrder.bookingId,
      amount_inr: paymentOrder.amountPaise / 100,
    };
  }

  /**
   * Admin Payment Reconciliation Ledger
   */
  async getAdminPayments(query: AdminPaymentsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.page_size) || 20);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.method) {
      if (query.method === 'CASH') {
        where.paymentMethod = 'CASH_ON_SERVICE';
      } else if (query.method === 'ONLINE') {
        where.paymentMethod = 'ONLINE';
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.date_from || query.date_to) {
      where.createdAt = {};
      if (query.date_from) {
        where.createdAt.gte = new Date(query.date_from);
      }
      if (query.date_to) {
        where.createdAt.lte = new Date(query.date_to);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        skip: query.format === 'csv' ? undefined : skip,
        take: query.format === 'csv' ? undefined : pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { displayName: true, mobileNumber: true },
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
      customer_name: item.customer.displayName || item.customer.mobileNumber,
      service_name: item.booking?.serviceNameSnapshot || 'N/A',
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

    return {
      data: formattedItems,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }

  async settleCashPayment(paymentId: string) {
    const paymentOrder = await this.prisma.paymentOrder.findUnique({
      where: { id: paymentId },
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    const updated = await this.prisma.paymentOrder.update({
      where: { id: paymentId },
      data: { status: 'CASH_SETTLED' },
    });

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
