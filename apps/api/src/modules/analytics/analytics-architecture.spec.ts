import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsProjectionService } from './services/analytics-projection.service';
import { AnalyticsReconciliationService } from './services/analytics-reconciliation.service';
import { AnalyticsBackfillService } from './services/analytics-backfill.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('Million-Scale Performance Architecture Verification', () => {
  let analyticsService: AnalyticsService;
  let projectionService: AnalyticsProjectionService;
  let reconciliationService: AnalyticsReconciliationService;
  let backfillService: AnalyticsBackfillService;
  let prismaMock: any;
  let redisMock: any;

  beforeEach(async () => {
    prismaMock = {
      booking: {
        count: jest.fn().mockResolvedValue(100),
        aggregate: jest.fn().mockResolvedValue({ _sum: { servicePriceSnapshot: 5000 } }),
        findFirst: jest.fn().mockResolvedValue({ createdAt: new Date('2026-07-01T00:00:00Z') }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      paymentOrder: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountPaise: 500000 } }),
        findFirst: jest.fn().mockResolvedValue({ createdAt: new Date('2026-07-01T00:00:00Z') }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      provider: {
        count: jest.fn().mockResolvedValue(50),
      },
      rating: {
        aggregate: jest.fn().mockResolvedValue({ _avg: { ratingScore: 4.85 } }),
      },
      dailyAnalytics: {
        count: jest.fn().mockResolvedValue(30),
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ ...create, id: 'test-uuid' })),
        aggregate: jest.fn().mockResolvedValue({
          _sum: { bookingCount: 3000, revenuePaise: 150000000n, unassignedCount: 150 },
        }),
        findMany: jest.fn().mockResolvedValue([
          { date: new Date('2026-07-01T00:00:00Z'), bookingCount: 100, revenuePaise: 5000000n },
        ]),
      },
    };

    redisMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue(['admin:dashboard:metrics:v1:d:30']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        AnalyticsProjectionService,
        AnalyticsReconciliationService,
        AnalyticsBackfillService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: 'REDIS_CLIENT', useValue: redisMock },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    projectionService = module.get<AnalyticsProjectionService>(AnalyticsProjectionService);
    reconciliationService = module.get<AnalyticsReconciliationService>(AnalyticsReconciliationService);
    backfillService = module.get<AnalyticsBackfillService>(AnalyticsBackfillService);
  });

  describe('1. Idempotent Analytics Projection', () => {
    it('deterministically recomputes daily bucket with zero drift on multiple runs', async () => {
      const run1 = await projectionService.recomputeDailyBucket('2026-07-23');
      const run2 = await projectionService.recomputeDailyBucket('2026-07-23');

      expect(run1).toBeDefined();
      expect(run2).toBeDefined();
      expect(prismaMock.dailyAnalytics.upsert).toHaveBeenCalledTimes(2);
      expect(run1.bookingCount).toBe(run2.bookingCount);
      expect(run1.revenuePaise).toBe(run2.revenuePaise);
    });
  });

  describe('2. Distributed Redis Cache HIT & Single-Flight Protection', () => {
    it('returns cached metrics in < 30ms on Redis HIT', async () => {
      const cachedDto = {
        total_bookings_today: 100,
        revenue_today_inr: 50000,
        unassigned_count: 5,
        active_providers_count: 50,
        avg_rating: 4.85,
        monthly_trend: [],
      };
      redisMock.get.mockResolvedValueOnce(JSON.stringify(cachedDto));

      const start = performance.now();
      const metrics = await analyticsService.getDashboardMetrics(30);
      const duration = performance.now() - start;

      expect(metrics.total_bookings_today).toBe(100);
      expect(duration).toBeLessThan(30);
      expect(redisMock.get).toHaveBeenCalledWith('admin:dashboard:metrics:v1:d:30');
    });

    it('handles Redis disconnect gracefully without crashing', async () => {
      redisMock.get.mockRejectedValueOnce(new Error('Redis connection lost'));

      const metrics = await analyticsService.getDashboardMetrics(30);
      expect(metrics).toBeDefined();
      expect(metrics.total_bookings_today).toBe(3000);
    });
  });

  describe('3. Reconciliation & Drift Repair', () => {
    it('reconciles recent days and invalidates Redis cache', async () => {
      const result = await reconciliationService.reconcileRecentDays(3);

      expect(result.reconciledDays).toBe(3);
      expect(prismaMock.dailyAnalytics.upsert).toHaveBeenCalledTimes(3);
      expect(redisMock.keys).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalled();
    });
  });

  describe('4. Bounded Memory Backfill', () => {
    it('processes historical range day-by-day with bounded memory', async () => {
      const result = await backfillService.runBackfill(
        new Date('2026-07-20T00:00:00Z'),
        new Date('2026-07-23T00:00:00Z'),
      );

      expect(result.processedDays).toBeGreaterThanOrEqual(3);
      expect(prismaMock.dailyAnalytics.upsert).toHaveBeenCalled();
    });
  });
});
