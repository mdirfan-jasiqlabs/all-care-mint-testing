jest.mock('jose', () => ({}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

// Mock bullmq
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        getRepeatableJobs: jest.fn().mockResolvedValue([]),
        removeRepeatableByKey: jest.fn().mockResolvedValue(true),
        add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
    Worker: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

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
        findMany: jest.fn().mockResolvedValue([]),
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

    it('returns paginated report response', async () => {
      const paginated = await analyticsService.getPaginatedReports(
        'revenue',
        '2026-07-01',
        '2026-07-30',
        1,
        50,
      );

      expect(paginated.total).toBe(12);
      expect(paginated.page).toBe(1);
      expect(paginated.page_size).toBe(50);
      expect(paginated.data).toBeDefined();
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

    it('rejects invalid report type with HTTP 400', async () => {
      await expect(
        analyticsService.getReports('invalid_type', '2026-07-01', '2026-07-30', 'json'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid report format with HTTP 400', async () => {
      await expect(
        analyticsService.getReports('booking', '2026-07-01', '2026-07-30', 'xml'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sanitizes CSV values starting with =, +, -, or @ against formula injection', async () => {
      prismaMock.booking.findMany.mockResolvedValueOnce([
        {
          id: 'b2222222-2222-2222-2222-222222222222',
          bookingReference: '=HYPERLINK("http://malicious.com")',
          serviceNameSnapshot: '+SUM(1,1)',
          servicePriceSnapshot: 500,
          paymentMethod: 'CASH_ON_SERVICE',
          status: 'COMPLETED',
          createdAt: new Date('2026-08-01T10:00:00Z'),
          customer: { displayName: '@attacker', mobileNumber: '+919876543210' },
          service: { name: '+SUM(1,1)' },
          paymentOrders: [],
        },
      ]);

      const report = await analyticsService.getReports('booking', '2026-07-01', '2026-07-30', 'csv');
      expect(report.csv).toBeDefined();
      expect(report.csv).toContain('"\'=HYPERLINK(""http://malicious.com"")"');
      expect(report.csv).toContain('"\'@attacker"');
      expect(report.csv).toContain('"\' +SUM(1,1)"'.replace(' ', ''));
    });
  });
});
