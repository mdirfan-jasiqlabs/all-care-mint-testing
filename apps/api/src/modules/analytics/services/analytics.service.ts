import { Injectable, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getStartOfBusinessDay,
  getEndOfBusinessDay,
  getPreviousPeriod,
  getISTDateParts,
  BUSINESS_TZ_OFFSET,
} from '../../../common/utils/date.util';

export interface MonthlyTrendDto {
  month: string;
  count: number;
  revenue: number;
}

export interface DashboardMetricsDto {
  total_bookings_today: number;
  revenue_today_inr: number;
  unassigned_count: number;
  active_providers_count: number;
  avg_rating: number;
  monthly_trend: MonthlyTrendDto[];
  comparison_label?: string;
  revenue_trend_percent?: number | null;
  bookings_trend_percent?: number | null;
  unassigned_trend_percent?: number | null;
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

  private async getPeriodRevenue(startDate: Date, endDate: Date): Promise<number> {
    const [onlinePayments, cashSettledPayments] = await Promise.all([
      this.prisma.paymentOrder.aggregate({
        where: {
          status: 'PAYMENT_SUCCESS',
          updatedAt: { gte: startDate, lte: endDate },
        },
        _sum: { amountPaise: true },
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: 'CASH_SETTLED',
          updatedAt: { gte: startDate, lte: endDate },
        },
        select: { amountPaise: true, bookingId: true },
      }),
    ]);

    const onlineRevenueInr = (onlinePayments._sum.amountPaise || 0) / 100;
    const cashSettledInr = cashSettledPayments.reduce(
      (acc, p) => acc + p.amountPaise / 100,
      0,
    );
    const settledBookingIds = cashSettledPayments
      .map((p) => p.bookingId)
      .filter((id): id is string => Boolean(id));

    const completedCashBookings = await this.prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        paymentMethod: 'CASH_ON_SERVICE',
        updatedAt: { gte: startDate, lte: endDate },
        id: settledBookingIds.length > 0 ? { notIn: settledBookingIds } : undefined,
      },
      select: { servicePriceSnapshot: true, paymentMethod: true },
    });
    const completedCashInr = completedCashBookings
      .filter((b: any) => b.paymentMethod === 'CASH_ON_SERVICE')
      .reduce((acc, b) => acc + Number(b.servicePriceSnapshot || 0), 0);

    return Math.round((onlineRevenueInr + cashSettledInr + completedCashInr) * 100) / 100;
  }

  async getDashboardMetrics(
    days?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<DashboardMetricsDto> {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (days && !isNaN(days) && days > 0) {
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (dateFrom && dateTo) {
      startDate = getStartOfBusinessDay(dateFrom);
      endDate = getEndOfBusinessDay(dateTo);
    } else {
      startDate = getStartOfBusinessDay(undefined, now);
      endDate = getEndOfBusinessDay(undefined, now);
    }

    let comparison_label = 'vs previous 30 days';
    if (days === 7) {
      comparison_label = 'vs previous 7 days';
    } else if (days === 30) {
      comparison_label = 'vs previous 30 days';
    } else if (days === 365) {
      comparison_label = 'vs previous year';
    } else if (dateFrom && dateTo) {
      comparison_label = 'vs previous period';
    }

    const { prevStartDate, prevEndDate } = getPreviousPeriod(startDate, endDate);

    // Prepare last 6 months date ranges for dynamic monthly booking volume & revenue trend aggregation
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const { year: currentYear, month: currentMonthNum } = getISTDateParts(now);
    const currentMonthIdx = currentMonthNum - 1;
    const monthsToQuery: { month: string; startOfMonth: Date; endOfMonth: Date }[] = [];

    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i;
      let y = currentYear;
      if (mIdx < 0) {
        mIdx += 12;
        y -= 1;
      }
      const mStr = String(mIdx + 1).padStart(2, '0');
      const lastDay = new Date(y, mIdx + 1, 0).getDate();
      const lastDayStr = String(lastDay).padStart(2, '0');

      const startOfMonth = new Date(`${y}-${mStr}-01T00:00:00.000${BUSINESS_TZ_OFFSET}`);
      const endOfMonth = new Date(`${y}-${mStr}-${lastDayStr}T23:59:59.999${BUSINESS_TZ_OFFSET}`);

      monthsToQuery.push({
        month: monthNames[mIdx],
        startOfMonth,
        endOfMonth,
      });
    }

    const [
      total_bookings_today,
      revenue_today_inr,
      unassigned_count,
      active_providers_count,
      ratingAggregate,
      total_bookings_prev,
      revenue_prev_inr,
      unassigned_count_prev,
      monthlyTrendData,
    ] = await Promise.all([
      // 1. Total Bookings in Period
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      // 2. Revenue in Period
      this.getPeriodRevenue(startDate, endDate),
      // 3. Unassigned Bookings Count (period scoped)
      this.prisma.booking.count({
        where: {
          status: 'PENDING',
          providerId: null,
          createdAt: { gte: startDate, lte: endDate },
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
      // 6. Total Bookings in Previous Period
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: prevStartDate,
            lte: prevEndDate,
          },
        },
      }),
      // 7. Revenue in Previous Period
      this.getPeriodRevenue(prevStartDate, prevEndDate),
      // 8. Unassigned Bookings Count in Previous Period
      this.prisma.booking.count({
        where: {
          status: 'PENDING',
          providerId: null,
          createdAt: { gte: prevStartDate, lte: prevEndDate },
        },
      }),
      // 9. Monthly Booking Volume & Revenue Aggregations (Last 6 Months)
      Promise.all(
        monthsToQuery.map(async (m) => {
          const [count, revenue] = await Promise.all([
            this.prisma.booking.count({
              where: { createdAt: { gte: m.startOfMonth, lte: m.endOfMonth } },
            }),
            this.getPeriodRevenue(m.startOfMonth, m.endOfMonth),
          ]);
          return { month: m.month, count, revenue };
        }),
      ),
    ]);

    const rawAvg = ratingAggregate._avg.ratingScore || 0;
    const avg_rating = Math.round(rawAvg * 100) / 100;

    const monthly_trend: MonthlyTrendDto[] = monthlyTrendData;

    // Dynamic Trend Percentage Calculation
    const calcTrend = (curr: number, prev: number): number | null => {
      if (prev === 0) {
        if (curr === 0) return 0;
        return 100;
      }
      const change = ((curr - prev) / prev) * 100;
      return Math.round(change * 10) / 10;
    };

    const revenue_trend_percent = calcTrend(revenue_today_inr, revenue_prev_inr);
    const bookings_trend_percent = calcTrend(total_bookings_today, total_bookings_prev);
    const unassigned_trend_percent = calcTrend(unassigned_count, unassigned_count_prev);

    return {
      total_bookings_today,
      revenue_today_inr,
      unassigned_count,
      active_providers_count,
      avg_rating,
      monthly_trend,
      comparison_label,
      revenue_trend_percent,
      bookings_trend_percent,
      unassigned_trend_percent,
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
