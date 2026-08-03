import { Injectable, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(): Promise<DashboardMetricsDto> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Total Bookings Today
    const total_bookings_today = await this.prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // 2. Revenue Today (INR)
    const successfulPaymentsToday = await this.prisma.paymentOrder.aggregate({
      where: {
        status: { in: ['PAYMENT_SUCCESS', 'CASH_SETTLED'] },
        updatedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      _sum: {
        amountPaise: true,
      },
    });

    let revenue_today_inr = (successfulPaymentsToday._sum.amountPaise || 0) / 100;

    // Fallback/addition: Completed bookings today if payment orders table not used for cash
    if (revenue_today_inr === 0) {
      const completedBookingsToday = await this.prisma.booking.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: {
          servicePriceSnapshot: true,
        },
      });
      revenue_today_inr = completedBookingsToday.reduce(
        (acc, b) => acc + Number(b.servicePriceSnapshot || 0),
        0,
      );
    }

    // 3. Unassigned Bookings Count
    const unassigned_count = await this.prisma.booking.count({
      where: {
        status: 'PENDING',
        providerId: null,
      },
    });

    // 4. Active Providers Count
    const active_providers_count = await this.prisma.provider.count({
      where: {
        status: 'APPROVED',
      },
    });

    // 5. Avg Rating
    const ratingAggregate = await this.prisma.rating.aggregate({
      _avg: {
        ratingScore: true,
      },
    });

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

  async getReports(
    type: string = 'booking',
    dateFrom?: string,
    dateTo?: string,
    format?: string,
  ): Promise<{ data: ReportItemDto[]; csv?: string }> {
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

    // Include full toDate day
    const adjustedToDate = new Date(toDate);
    adjustedToDate.setHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: adjustedToDate,
        },
      },
      include: {
        customer: true,
        service: true,
        paymentOrders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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

    if (format === 'csv') {
      const header = 'Date,Booking ID,Customer Name,Service Name,Amount (INR),Payment Method,Status\n';
      const rows = reportItems
        .map(
          (item) =>
            `"${item.date}","${item.booking_reference || item.booking_id}","${item.customer_name.replace(/"/g, '""')}","${item.service_name.replace(/"/g, '""')}",${item.amount_inr},"${item.payment_method}","${item.status}"`,
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
