import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './services/analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MOD-007 Operational Analytics Verification', () => {
  let analyticsService: AnalyticsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        count: jest.fn().mockResolvedValue(12),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'b1111111-1111-1111-1111-111111111111',
            bookingReference: 'BK-20260803-001',
            serviceNameSnapshot: 'AC Deep Cleaning',
            servicePriceSnapshot: 1499,
            paymentMethod: 'ONLINE',
            status: 'COMPLETED',
            createdAt: new Date('2026-08-01T10:00:00Z'),
            customer: { displayName: 'John Doe', mobileNumber: '+919876543210' },
            service: { name: 'AC Deep Cleaning' },
            paymentOrders: [{ amountPaise: 149900 }],
          },
        ]),
      },
      paymentOrder: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { amountPaise: 1499000 },
        }),
      },
      provider: {
        count: jest.fn().mockResolvedValue(45),
      },
      rating: {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { ratingScore: 4.766 },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('TC-007-001: Dashboard Metrics Endpoint', () => {
    it('returns all 5 KPI metrics with rounded avg rating within SLA', async () => {
      const metrics = await analyticsService.getDashboardMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.total_bookings_today).toBe(12);
      expect(metrics.revenue_today_inr).toBe(14990);
      expect(metrics.unassigned_count).toBe(12);
      expect(metrics.active_providers_count).toBe(45);
      expect(metrics.avg_rating).toBe(4.77);
    });
  });

  describe('TC-007-002 / TC-007-003 / TC-007-004: Reports & 90-Day Range Validation', () => {
    it('returns report data for valid date range', async () => {
      const report = await analyticsService.getReports(
        'revenue',
        '2026-07-01',
        '2026-07-30',
        'json',
      );

      expect(report.data).toBeDefined();
      expect(report.data.length).toBe(1);
      expect(report.data[0].booking_reference).toBe('BK-20260803-001');
      expect(report.data[0].amount_inr).toBe(1499);
    });

    it('formats CSV output with correct headers', async () => {
      const report = await analyticsService.getReports(
        'revenue',
        '2026-07-01',
        '2026-07-30',
        'csv',
      );

      expect(report.csv).toBeDefined();
      expect(report.csv).toContain(
        'Date,Booking ID,Customer Name,Service Name,Amount (INR),Payment Method,Status',
      );
      expect(report.csv).toContain('"BK-20260803-001"');
    });

    it('rejects date ranges greater than 90 days with HTTP 400', async () => {
      await expect(
        analyticsService.getReports('revenue', '2026-01-01', '2026-06-01', 'json'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid date order (date_to < date_from) with HTTP 400', async () => {
      await expect(
        analyticsService.getReports('revenue', '2026-08-01', '2026-07-01', 'json'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
