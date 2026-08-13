import { Injectable, BadRequestException, Inject, Optional, Logger } from '@nestjs/common';
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
import Redis from 'ioredis';

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
  private readonly logger = new Logger(AnalyticsService.name);
  private monthlyTrendCache: { timestamp: number; cacheKey: string; data: MonthlyTrendDto[] } | null = null;
  private inFlightPromises = new Map<string, Promise<DashboardMetricsDto>>();
  private inFlightReportPromises = new Map<string, Promise<PaginatedReportResponseDto>>();

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redisClient?: Redis,
  ) {}

  private async getPeriodRevenue(startDate: Date, endDate: Date): Promise<number> {
    if (typeof (this.prisma.booking as any).aggregate === 'function') {
      const [onlinePayments, cashSettledPayments, completedCashBookings] = await Promise.all([
        this.prisma.paymentOrder.aggregate({
          where: {
            status: 'PAYMENT_SUCCESS',
            updatedAt: { gte: startDate, lte: endDate },
          },
          _sum: { amountPaise: true },
        }),
        this.prisma.paymentOrder.aggregate({
          where: {
            status: 'CASH_SETTLED',
            updatedAt: { gte: startDate, lte: endDate },
          },
          _sum: { amountPaise: true },
        }),
        (this.prisma.booking as any).aggregate({
          where: {
            status: 'COMPLETED',
            paymentMethod: 'CASH_ON_SERVICE',
            updatedAt: { gte: startDate, lte: endDate },
            paymentOrders: {
              none: {
                status: 'CASH_SETTLED',
              },
            },
          },
          _sum: { servicePriceSnapshot: true },
        }),
      ]);

      const onlineRevenueInr = (onlinePayments._sum?.amountPaise || 0) / 100;
      const cashSettledInr = (cashSettledPayments._sum?.amountPaise || 0) / 100;
      const completedCashInr = Number(completedCashBookings._sum?.servicePriceSnapshot || 0);

      return Math.round((onlineRevenueInr + cashSettledInr + completedCashInr) * 100) / 100;
    }

    // Fallback for mocks without booking.aggregate
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

    const onlineRevenueInr = (onlinePayments._sum?.amountPaise || 0) / 100;
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
    const cacheKey = days
      ? `admin:dashboard:metrics:v1:d:${days}`
      : dateFrom && dateTo
      ? `admin:dashboard:metrics:v1:c:${dateFrom}:${dateTo}`
      : 'admin:dashboard:metrics:v1:d:today';

    // 1. Distributed Redis Cache Lookup (Cache HIT)
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err: any) {
        this.logger.warn(`[Redis Cache Read Warning] ${err.message}`);
      }
    }

    // 2. Single-Flight Stampede Protection for Concurrent Requests
    if (this.inFlightPromises.has(cacheKey)) {
      return this.inFlightPromises.get(cacheKey)!;
    }

    const computePromise = this.computeDashboardMetrics(days, dateFrom, dateTo, cacheKey);
    this.inFlightPromises.set(cacheKey, computePromise);

    try {
      const result = await computePromise;
      return result;
    } finally {
      this.inFlightPromises.delete(cacheKey);
    }
  }

  private async computeDashboardMetrics(
    days?: number,
    dateFrom?: string,
    dateTo?: string,
    cacheKey?: string,
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

    // Check if DailyAnalytics model exists and has populated rows
    let hasDailyAnalytics = false;
    if (this.prisma.dailyAnalytics) {
      try {
        const count = await this.prisma.dailyAnalytics.count();
        if (count > 0) {
          hasDailyAnalytics = true;
        }
      } catch (e) {
        hasDailyAnalytics = false;
      }
    }

    let total_bookings_today = 0;
    let revenue_today_inr = 0;
    let unassigned_count = 0;

    let total_bookings_prev = 0;
    let revenue_prev_inr = 0;
    let unassigned_count_prev = 0;

    let monthly_trend: MonthlyTrendDto[] = [];
    let active_providers_count = 0;
    let avg_rating = 0;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const { year: currentYear, month: currentMonthNum } = getISTDateParts(now);
    const currentMonthIdx = currentMonthNum - 1;

    if (hasDailyAnalytics) {
      // 🚀 READ-MODEL HIGH-PERFORMANCE QUERY PATH (O(1) / O(30) daily rows scan)
      const startP = getISTDateParts(startDate);
      const endP = getISTDateParts(endDate);
      const prevStartP = getISTDateParts(prevStartDate);
      const prevEndP = getISTDateParts(prevEndDate);

      const startDateDb = new Date(`${startP.year}-${String(startP.month).padStart(2, '0')}-${String(startP.day).padStart(2, '0')}T00:00:00.000Z`);
      const endDateDb = new Date(`${endP.year}-${String(endP.month).padStart(2, '0')}-${String(endP.day).padStart(2, '0')}T00:00:00.000Z`);
      const prevStartDateDb = new Date(`${prevStartP.year}-${String(prevStartP.month).padStart(2, '0')}-${String(prevStartP.day).padStart(2, '0')}T00:00:00.000Z`);
      const prevEndDateDb = new Date(`${prevEndP.year}-${String(prevEndP.month).padStart(2, '0')}-${String(prevEndP.day).padStart(2, '0')}T00:00:00.000Z`);

      const [
        periodAggr,
        prevPeriodAggr,
        unassignedToday,
        unassignedPrev,
        activeProviders,
        ratingAggr,
        sixMonthDailyRows,
      ] = await Promise.all([
        this.prisma.dailyAnalytics.aggregate({
          where: { date: { gte: startDateDb, lte: endDateDb } },
          _sum: { bookingCount: true, revenuePaise: true },
        }),
        this.prisma.dailyAnalytics.aggregate({
          where: { date: { gte: prevStartDateDb, lte: prevEndDateDb } },
          _sum: { bookingCount: true, revenuePaise: true },
        }),
        this.prisma.booking.count({
          where: {
            status: 'PENDING',
            providerId: null,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.booking.count({
          where: {
            status: 'PENDING',
            providerId: null,
            createdAt: { gte: prevStartDate, lte: prevEndDate },
          },
        }),
        this.prisma.provider.count({
          where: { status: 'APPROVED' },
        }),
        this.prisma.rating.aggregate({
          _avg: { ratingScore: true },
        }),
        // Fetch daily analytics rows for last 6 months for monthly trend
        (() => {
          let startMonthIdx = currentMonthIdx - 5;
          let startYear = currentYear;
          if (startMonthIdx < 0) {
            startMonthIdx += 12;
            startYear -= 1;
          }
          const mStr = String(startMonthIdx + 1).padStart(2, '0');
          const sixMonthsAgoDb = new Date(`${startYear}-${mStr}-01T00:00:00.000Z`);
          return this.prisma.dailyAnalytics.findMany({
            where: { date: { gte: sixMonthsAgoDb, lte: endDateDb } },
          });
        })(),
      ]);

      total_bookings_today = periodAggr._sum.bookingCount || 0;
      revenue_today_inr = Number(periodAggr._sum.revenuePaise || 0n) / 100;
      unassigned_count = unassignedToday;

      total_bookings_prev = prevPeriodAggr._sum.bookingCount || 0;
      revenue_prev_inr = Number(prevPeriodAggr._sum.revenuePaise || 0n) / 100;
      unassigned_count_prev = unassignedPrev;

      active_providers_count = activeProviders;
      const rawAvg = ratingAggr._avg.ratingScore || 0;
      avg_rating = Math.round(rawAvg * 100) / 100;

      // Group 6-month daily rows into 6 monthly trend buckets
      const monthBucketsMap = new Map<string, { count: number; revenuePaise: bigint }>();
      for (let i = 5; i >= 0; i--) {
        let mIdx = currentMonthIdx - i;
        let y = currentYear;
        if (mIdx < 0) {
          mIdx += 12;
          y -= 1;
        }
        const key = `${y}-${String(mIdx + 1).padStart(2, '0')}`;
        monthBucketsMap.set(key, { count: 0, revenuePaise: 0n });
      }

      for (const row of sixMonthDailyRows) {
        const d = new Date(row.date);
        const y = d.getUTCFullYear();
        const m = d.getUTCMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;

        if (monthBucketsMap.has(key)) {
          const entry = monthBucketsMap.get(key)!;
          entry.count += row.bookingCount;
          entry.revenuePaise += row.revenuePaise;
        }
      }

      monthly_trend = Array.from(monthBucketsMap.entries()).map(([key, data]) => {
        const mIdx = parseInt(key.split('-')[1], 10) - 1;
        return {
          month: monthNames[mIdx],
          count: data.count,
          revenue: Number(data.revenuePaise) / 100,
        };
      });
    } else {
      // 🐢 FALLBACK RAW QUERY PATH (for initial setup or unit test mocks)
      const fetchMonthlyTrend = async (): Promise<MonthlyTrendDto[]> => {
        const cacheTTL = 60000;
        if (
          this.monthlyTrendCache &&
          this.monthlyTrendCache.cacheKey === `${currentYear}-${currentMonthIdx}` &&
          now.getTime() - this.monthlyTrendCache.timestamp < cacheTTL
        ) {
          return this.monthlyTrendCache.data;
        }

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

        const trendResults = await Promise.all(
          monthsToQuery.map(async (m) => {
            const [count, revenue] = await Promise.all([
              this.prisma.booking.count({
                where: { createdAt: { gte: m.startOfMonth, lte: m.endOfMonth } },
              }),
              this.getPeriodRevenue(m.startOfMonth, m.endOfMonth),
            ]);
            return { month: m.month, count, revenue };
          }),
        );

        this.monthlyTrendCache = {
          timestamp: now.getTime(),
          cacheKey: `${currentYear}-${currentMonthIdx}`,
          data: trendResults,
        };

        return trendResults;
      };

      const [
        tbToday,
        revToday,
        unassToday,
        actProv,
        ratAggr,
        tbPrev,
        revPrev,
        unassPrev,
        trendData,
      ] = await Promise.all([
        this.prisma.booking.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        this.getPeriodRevenue(startDate, endDate),
        this.prisma.booking.count({
          where: {
            status: 'PENDING',
            providerId: null,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
        this.prisma.provider.count({
          where: { status: 'APPROVED' },
        }),
        this.prisma.rating.aggregate({
          _avg: { ratingScore: true },
        }),
        this.prisma.booking.count({
          where: { createdAt: { gte: prevStartDate, lte: prevEndDate } },
        }),
        this.getPeriodRevenue(prevStartDate, prevEndDate),
        this.prisma.booking.count({
          where: {
            status: 'PENDING',
            providerId: null,
            createdAt: { gte: prevStartDate, lte: prevEndDate },
          },
        }),
        fetchMonthlyTrend(),
      ]);

      total_bookings_today = tbToday;
      revenue_today_inr = revToday;
      unassigned_count = unassToday;
      active_providers_count = actProv;

      const rawAvg = ratAggr._avg.ratingScore || 0;
      avg_rating = Math.round(rawAvg * 100) / 100;

      total_bookings_prev = tbPrev;
      revenue_prev_inr = revPrev;
      unassigned_count_prev = unassPrev;
      monthly_trend = trendData;
    }

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

    const dto: DashboardMetricsDto = {
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

    // Store in Redis with TTL 60 seconds
    if (this.redisClient && cacheKey) {
      try {
        await this.redisClient.set(cacheKey, JSON.stringify(dto), 'EX', 60);
      } catch (err: any) {
        this.logger.warn(`[Redis Cache Write Warning] ${err.message}`);
      }
    }

    return dto;
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

    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = adjustedToDate.toISOString().split('T')[0];
    const cacheKey = `admin:reports:v1:${normalizedType}:${fromDateStr}:${toDateStr}:${page}:${pageSize}`;

    // 1. Try Redis cache lookup
    if (this.redisClient) {
      try {
        const cached = await this.redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        this.logger.warn(`Redis get failed for key ${cacheKey}: ${(err as Error).message}`);
      }
    }

    // 2. Single-flight stampede protection
    if (this.inFlightReportPromises.has(cacheKey)) {
      return await this.inFlightReportPromises.get(cacheKey)!;
    }

    const fetchPromise = (async (): Promise<PaginatedReportResponseDto> => {
      try {
        const whereClause = this.buildWhereClause(normalizedType, fromDate, adjustedToDate);
        const skip = (page - 1) * pageSize;

        const [total, bookings] = await Promise.all([
          this.prisma.booking.count({ where: whereClause }),
          this.prisma.booking.findMany({
            where: whereClause,
            select: {
              id: true,
              bookingReference: true,
              createdAt: true,
              paymentMethod: true,
              status: true,
              servicePriceSnapshot: true,
              serviceNameSnapshot: true,
              customer: {
                select: {
                  displayName: true,
                  mobileNumber: true,
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
              paymentOrders: {
                select: {
                  amountPaise: true,
                  status: true,
                },
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

        const result: PaginatedReportResponseDto = {
          type: normalizedType,
          date_from: dateFrom || fromDateStr,
          date_to: dateTo || toDateStr,
          page,
          page_size: pageSize,
          total,
          total_pages: totalPages,
          count: data.length,
          data,
        };

        // Cache in Redis for 60 seconds
        if (this.redisClient) {
          try {
            await this.redisClient.set(cacheKey, JSON.stringify(result), 'EX', 60);
          } catch (err) {
            this.logger.warn(`Redis set failed for key ${cacheKey}: ${(err as Error).message}`);
          }
        }

        return result;
      } finally {
        this.inFlightReportPromises.delete(cacheKey);
      }
    })();

    this.inFlightReportPromises.set(cacheKey, fetchPromise);
    return await fetchPromise;
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
      const batchSize = 2000;
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        if (res.writableEnded || res.destroyed || (res.raw && (res.raw.writableEnded || res.raw.destroyed))) {
          break;
        }

        const batch = await self.prisma.booking.findMany({
          where: whereClause,
          select: {
            id: true,
            bookingReference: true,
            createdAt: true,
            paymentMethod: true,
            status: true,
            servicePriceSnapshot: true,
            serviceNameSnapshot: true,
            customer: {
              select: {
                displayName: true,
                mobileNumber: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
            paymentOrders: {
              select: {
                amountPaise: true,
                status: true,
              },
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
      res.header('Content-Type', 'text/csv; charset=utf-8');
      res.header('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvStream);
    } else if (res.raw && typeof res.raw.setHeader === 'function') {
      res.raw.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.raw.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return csvStream.pipe(res.raw);
    } else if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return csvStream.pipe(res);
    }
  }

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
      select: {
        id: true,
        bookingReference: true,
        createdAt: true,
        paymentMethod: true,
        status: true,
        servicePriceSnapshot: true,
        serviceNameSnapshot: true,
        customer: {
          select: {
            displayName: true,
            mobileNumber: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        paymentOrders: {
          select: {
            amountPaise: true,
            status: true,
          },
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
