import { Injectable, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DashboardMetricsDto {
  total_bookings_today: number;
  revenue_today_inr: number;
  unassigned_count: number;
  active_providers_count: number;
  avg_rating: number;
}

export interface ReportItemDto {
  date: string;
  booking_id: string;
  booking_reference: string;
  customer_name: string;
  service_name: string;
  amount_inr: number;
  payment_method: string;
  status: string;
}

export interface PaginatedReportResponseDto {
  type: string;
  date_from: string;
  date_to: string;
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  count: number;
  data: ReportItemDto[];
  csv?: string;
}

function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  if (/^[=+\-@]/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(): Promise<DashboardMetricsDto> {
    // Consistent Asia/Kolkata (IST) day boundary calculation
    const now = new Date();
    const istParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = istParts.find((p) => p.type === 'year')?.value;
    const month = istParts.find((p) => p.type === 'month')?.value;
    const day = istParts.find((p) => p.type === 'day')?.value;

    const startOfToday = new Date(`${year}-${month}-${day}T00:00:00.000+05:30`);
    const endOfToday = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);

    // Execute independent metrics queries concurrently via Promise.all for optimal SLA performance
    const [
      total_bookings_today,
      onlinePaymentsToday,
      cashSettledPaymentsToday,
      unassigned_count,
      active_providers_count,
      ratingAggregate,
    ] = await Promise.all([
      // 1. Total Bookings Today
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      // 2a. Revenue Today - Online Payments
      this.prisma.paymentOrder.aggregate({
        where: {
          status: 'PAYMENT_SUCCESS',
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { amountPaise: true },
      }),
      // 2b. Revenue Today - Settled Cash Payments
      this.prisma.paymentOrder.findMany({
        where: {
          status: 'CASH_SETTLED',
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
        select: { amountPaise: true, bookingId: true },
      }),
      // 3. Unassigned Bookings Count
      this.prisma.booking.count({
        where: {
          status: 'PENDING',
          providerId: null,
        },
      }),
      // 4. Active Providers Count
      this.prisma.provider.count({
        where: {
          status: 'APPROVED',
        },
      }),
      // 5. Avg Rating
      this.prisma.rating.aggregate({
        _avg: {
          ratingScore: true,
        },
      }),
    ]);

    const onlineRevenueInr = (onlinePaymentsToday._sum.amountPaise || 0) / 100;
    const cashSettledInr = cashSettledPaymentsToday.reduce(
      (acc, p) => acc + p.amountPaise / 100,
      0,
    );
    const settledBookingIds = cashSettledPaymentsToday
      .map((p) => p.bookingId)
      .filter((id): id is string => Boolean(id));

    // Completed cash-on-service bookings completed today not in settledBookingIds
    const completedCashBookingsToday = await this.prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        paymentMethod: 'CASH_ON_SERVICE',
        updatedAt: { gte: startOfToday, lte: endOfToday },
        id: settledBookingIds.length > 0 ? { notIn: settledBookingIds } : undefined,
      },
      select: { servicePriceSnapshot: true, paymentMethod: true },
    });
    const completedCashInr = completedCashBookingsToday
      .filter((b: any) => b.paymentMethod === 'CASH_ON_SERVICE')
      .reduce(
        (acc, b) => acc + Number(b.servicePriceSnapshot || 0),
        0,
      );

    const revenue_today_inr = Math.round((onlineRevenueInr + cashSettledInr + completedCashInr) * 100) / 100;
    const rawAvg = ratingAggregate._avg.ratingScore || 0;
    const avg_rating = Math.round(rawAvg * 100) / 100;

    return {
      total_bookings_today,
      revenue_today_inr,
      unassigned_count,
      active_providers_count,
      avg_rating,
    };
  }

  private validateReportParams(
    type: string,
    dateFrom?: string,
    dateTo?: string,
    format?: string,
  ): { normalizedType: string; normalizedFormat: string; fromDate: Date; adjustedToDate: Date } {
    const normalizedType = (type || 'booking').toLowerCase();
    if (!['booking', 'revenue'].includes(normalizedType)) {
      throw new BadRequestException(`Invalid report type '${type}'. Allowed values: booking, revenue`);
    }

    const normalizedFormat = format ? format.toLowerCase() : 'json';
    if (!['json', 'csv'].includes(normalizedFormat)) {
      throw new BadRequestException(`Invalid report format '${format}'. Allowed values: json, csv`);
    }

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const fromDate = dateFrom ? new Date(dateFrom) : defaultFrom;
    const toDate = dateTo ? new Date(dateTo) : now;

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date parameters provided');
    }

    if (toDate < fromDate) {
      throw new BadRequestException('date_to cannot be earlier than date_from');
    }

    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    const adjustedToDate = new Date(toDate);
    adjustedToDate.setHours(23, 59, 59, 999);

    return { normalizedType, normalizedFormat, fromDate, adjustedToDate };
  }

  private buildWhereClause(type: string, fromDate: Date, toDate: Date): any {
    const whereClause: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (type === 'revenue') {
      whereClause.OR = [
        { status: 'COMPLETED' },
        { paymentOrders: { some: { status: { in: ['PAYMENT_SUCCESS', 'CASH_SETTLED'] } } } },
      ];
    }

    return whereClause;
  }

  async getPaginatedReports(
    type: string = 'booking',
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<PaginatedReportResponseDto> {
    const { normalizedType, fromDate, adjustedToDate } = this.validateReportParams(
      type,
      dateFrom,
      dateTo,
      'json',
    );

    if (page < 1) {
      throw new BadRequestException('Page must be a positive integer greater than or equal to 1');
    }
    if (pageSize < 1 || pageSize > 500) {
      throw new BadRequestException('Page size must be a positive integer between 1 and 500');
    }

    const whereClause = this.buildWhereClause(normalizedType, fromDate, adjustedToDate);
    const skip = (page - 1) * pageSize;

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where: whereClause }),
      this.prisma.booking.findMany({
        where: whereClause,
        include: {
          customer: true,
          service: true,
          paymentOrders: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
    ]);

    const data: ReportItemDto[] = bookings.map((b) => {
      const payment = b.paymentOrders[0];
      const amountInr = payment
        ? payment.amountPaise / 100
        : Number(b.servicePriceSnapshot || 0);

      return {
        date: b.createdAt.toISOString().split('T')[0],
        booking_id: b.id,
        booking_reference: b.bookingReference,
        customer_name: b.customer?.displayName || b.customer?.mobileNumber || 'Customer',
        service_name: b.serviceNameSnapshot || b.service?.name || 'Service',
        amount_inr: amountInr,
        payment_method: b.paymentMethod,
        status: b.status,
      };
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      type: normalizedType,
      date_from: dateFrom || fromDate.toISOString().split('T')[0],
      date_to: dateTo || adjustedToDate.toISOString().split('T')[0],
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      count: data.length,
      data,
    };
  }

  async streamCsvReport(
    res: any,
    type: string = 'booking',
    dateFrom?: string,
    dateTo?: string,
  ): Promise<void> {
    const { normalizedType, fromDate, adjustedToDate } = this.validateReportParams(
      type,
      dateFrom,
      dateTo,
      'csv',
    );

    const filename = `report-${normalizedType}-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;

    const self = this;
    const asyncGenerator = async function* () {
      yield 'Date,Booking ID,Customer Name,Service Name,Amount (INR),Payment Method,Status\n';

      const whereClause = self.buildWhereClause(normalizedType, fromDate, adjustedToDate);
      const batchSize = 500;
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        if (res.writableEnded || res.destroyed || (res.raw && (res.raw.writableEnded || res.raw.destroyed))) {
          break;
        }

        const batch = await self.prisma.booking.findMany({
          where: whereClause,
          include: {
            customer: true,
            service: true,
            paymentOrders: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],
          skip,
          take: batchSize,
        });

        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        let chunk = '';
        for (const b of batch) {
          const payment = b.paymentOrders[0];
          const amountInr = payment
            ? payment.amountPaise / 100
            : Number(b.servicePriceSnapshot || 0);

          const dateStr = b.createdAt.toISOString().split('T')[0];
          const refStr = b.bookingReference || b.id;
          const custStr = b.customer?.displayName || b.customer?.mobileNumber || 'Customer';
          const svcStr = b.serviceNameSnapshot || b.service?.name || 'Service';

          chunk += `${sanitizeCsvCell(dateStr)},${sanitizeCsvCell(refStr)},${sanitizeCsvCell(custStr)},${sanitizeCsvCell(svcStr)},${amountInr},${sanitizeCsvCell(b.paymentMethod)},${sanitizeCsvCell(b.status)}\n`;
        }

        yield chunk;

        skip += batch.length;
        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    };

    const csvStream = Readable.from(asyncGenerator());

    if (typeof res.header === 'function' && typeof res.send === 'function') {
      // Fastify Reply
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.header('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvStream);
    } else if (typeof res.setHeader === 'function') {
      // Express Response
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      csvStream.pipe(res);
    } else if (res.raw && typeof res.raw.setHeader === 'function') {
      res.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.raw.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      csvStream.pipe(res.raw);
    }
  }

  // Maintained for backwards compatibility with existing callers/tests
  async getReports(
    type: string = 'booking',
    dateFrom?: string,
    dateTo?: string,
    format?: string,
  ): Promise<{ data: ReportItemDto[]; csv?: string }> {
    const { normalizedType, normalizedFormat, fromDate, adjustedToDate } = this.validateReportParams(
      type,
      dateFrom,
      dateTo,
      format,
    );

    const whereClause = this.buildWhereClause(normalizedType, fromDate, adjustedToDate);

    const bookings = await this.prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: true,
        service: true,
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });

    const reportItems: ReportItemDto[] = bookings.map((b) => {
      const payment = b.paymentOrders[0];
      const amountInr = payment
        ? payment.amountPaise / 100
        : Number(b.servicePriceSnapshot || 0);

      return {
        date: b.createdAt.toISOString().split('T')[0],
        booking_id: b.id,
        booking_reference: b.bookingReference,
        customer_name: b.customer?.displayName || b.customer?.mobileNumber || 'Customer',
        service_name: b.serviceNameSnapshot || b.service?.name || 'Service',
        amount_inr: amountInr,
        payment_method: b.paymentMethod,
        status: b.status,
      };
    });

    if (normalizedFormat === 'csv') {
      const header = 'Date,Booking ID,Customer Name,Service Name,Amount (INR),Payment Method,Status\n';
      const rows = reportItems
        .map(
          (item) =>
            `${sanitizeCsvCell(item.date)},${sanitizeCsvCell(item.booking_reference || item.booking_id)},${sanitizeCsvCell(item.customer_name)},${sanitizeCsvCell(item.service_name)},${item.amount_inr},${sanitizeCsvCell(item.payment_method)},${sanitizeCsvCell(item.status)}`,
        )
        .join('\n');

      return {
        data: reportItems,
        csv: header + rows,
      };
    }

    return { data: reportItems };
  }
}
