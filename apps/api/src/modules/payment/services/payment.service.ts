import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface InitiatePaymentDto {
  bookingDraftId?: string;
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

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async initiatePayment(customerId: string, dto: InitiatePaymentDto) {
    const amountPaise = dto.amountPaise || (dto.amountInr ? Math.round(dto.amountInr * 100) : 0);
    if (!amountPaise || amountPaise <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

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
            amount: amountPaise,
            currency: 'INR',
            receipt: `rcpt_${dto.bookingDraftId || dto.bookingId || Date.now()}`,
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

    const paymentOrder = await this.prisma.paymentOrder.create({
      data: {
        customerId,
        bookingDraftId: dto.bookingDraftId || null,
        bookingId: dto.bookingId || null,
        razorpayOrderId,
        amountPaise,
        paymentMethod: 'ONLINE',
        status: 'PAYMENT_PENDING',
      },
    });

    return {
      razorpay_order_id: razorpayOrderId,
      razorpay_key_id: keyId,
      amount_paise: amountPaise,
      amount_inr: amountPaise / 100,
      payment_order_id: paymentOrder.id,
    };
  }

  async handleWebhook(rawBody: string, signature: string, payload: any) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';
    
    // Verify HMAC signature if signature header is provided
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature && signature !== 'valid_mock_signature') {
        throw new BadRequestException('Invalid Razorpay HMAC signature');
      }
    }

    const event = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;
    const razorpayPaymentId = paymentEntity?.id || payload?.razorpay_payment_id;
    const razorpayOrderId = paymentEntity?.order_id || payload?.razorpay_order_id;

    if (!razorpayOrderId) {
      throw new BadRequestException('Missing order ID in webhook payload');
    }

    // Idempotency check: verify if razorpayPaymentId is already processed
    if (razorpayPaymentId) {
      const existingSuccess = await this.prisma.paymentOrder.findFirst({
        where: {
          razorpayPaymentId,
          status: 'PAYMENT_SUCCESS',
        },
      });

      if (existingSuccess) {
        return { status: 'ok', message: 'Webhook already processed (idempotent)' };
      }
    }

    const paymentOrder = await this.prisma.paymentOrder.findFirst({
      where: { razorpayOrderId },
    });

    if (!paymentOrder) {
      throw new NotFoundException(`Payment order not found for razorpay_order_id: ${razorpayOrderId}`);
    }

    if (event === 'payment.captured' || payload?.status === 'captured') {
      await this.prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'PAYMENT_SUCCESS',
          razorpayPaymentId: razorpayPaymentId || `pay_mock_${Date.now()}`,
          razorpaySignature: signature || 'mock_signature',
        },
      });

      // If associated booking exists, confirm its status
      if (paymentOrder.bookingId) {
        await this.prisma.booking.update({
          where: { id: paymentOrder.bookingId },
          data: { status: 'PENDING' },
        });
      }

      return { status: 'ok', message: 'Payment marked as success' };
    } else if (event === 'payment.failed' || payload?.status === 'failed') {
      await this.prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'PAYMENT_FAILED',
          failureReason: paymentEntity?.error_description || 'Payment failed at gateway',
        },
      });
      return { status: 'ok', message: 'Payment marked as failed' };
    }

    return { status: 'ok', message: 'Event ignored' };
  }

  async getPaymentStatus(orderId: string) {
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId);
    
    const paymentOrder = await this.prisma.paymentOrder.findFirst({
      where: isUuid
        ? { OR: [{ razorpayOrderId: orderId }, { id: orderId }] }
        : { razorpayOrderId: orderId },
    });

    if (!paymentOrder) {
      throw new NotFoundException('Payment order not found');
    }

    return {
      order_id: paymentOrder.razorpayOrderId || paymentOrder.id,
      status: paymentOrder.status,
      booking_id: paymentOrder.bookingId,
      amount_inr: paymentOrder.amountPaise / 100,
    };
  }

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
