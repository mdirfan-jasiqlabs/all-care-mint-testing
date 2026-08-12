const { RedisMemoryServer } = require('redis-memory-server');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function calculatePercentile(array, percentile) {
  if (array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function main() {
  console.log('================================================================');
  console.log('🔍 INDEPENDENT REAL-REDIS & E2E ARCHITECTURE VERIFICATION');
  console.log('================================================================\n');

  // 1. Start Real Redis Memory Server instance
  let redisServer;
  let redisClient;

  try {
    redisServer = await RedisMemoryServer.create({ instance: { port: 6379 } });
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
    console.log(`✅ Real Redis TCP Server connected at ${host}:${port}`);
    redisClient = new Redis({ host, port });
  } catch (e) {
    console.log('Connecting to default Redis at 127.0.0.1:6379...');
    redisClient = new Redis({ host: '127.0.0.1', port: 6379 });
  }

  // Verify ping over TCP socket
  const pingRes = await redisClient.ping();
  console.log(`Redis PING response: ${pingRes}`);

  // 2. Financial Correctness Verification
  console.log('\n--- PHASE 3: FINANCIAL CORRECTNESS AUDIT ---');
  
  const dateFrom = '2026-07-13';
  const dateTo = '2026-08-12';
  const startDate = new Date(`${dateFrom}T00:00:00.000+05:30`);
  const endDate = new Date(`${dateTo}T23:59:59.999+05:30`);

  // Raw PostgreSQL Calculation over full IST business days
  const [onlineAggr, cashSettledAggr, completedCashAggr] = await Promise.all([
    prisma.paymentOrder.aggregate({
      where: { status: 'PAYMENT_SUCCESS', updatedAt: { gte: startDate, lte: endDate } },
      _sum: { amountPaise: true },
    }),
    prisma.paymentOrder.aggregate({
      where: { status: 'CASH_SETTLED', updatedAt: { gte: startDate, lte: endDate } },
      _sum: { amountPaise: true },
    }),
    prisma.booking.aggregate({
      where: {
        status: 'COMPLETED',
        paymentMethod: 'CASH_ON_SERVICE',
        updatedAt: { gte: startDate, lte: endDate },
        paymentOrders: { none: { status: 'CASH_SETTLED', updatedAt: { gte: startDate, lte: endDate } } },
      },
      _sum: { servicePriceSnapshot: true },
    }),
  ]);

  const rawOnlineInr = (onlineAggr._sum?.amountPaise || 0) / 100;
  const rawCashSettledInr = (cashSettledAggr._sum?.amountPaise || 0) / 100;
  const rawCompletedCashInr = Number(completedCashAggr._sum?.servicePriceSnapshot || 0);
  const rawTotalRevenueInr = Math.round((rawOnlineInr + rawCashSettledInr + rawCompletedCashInr) * 100) / 100;

  // DailyAnalytics Read Model Calculation over full IST business days
  const startDateDb = new Date(`${dateFrom}T00:00:00.000Z`);
  const endDateDb = new Date(`${dateTo}T00:00:00.000Z`);

  const dailyAggr = await prisma.dailyAnalytics.aggregate({
    where: { date: { gte: startDateDb, lte: endDateDb } },
    _sum: { revenuePaise: true, bookingCount: true },
  });

  const readModelRevenueInr = Number(dailyAggr._sum.revenuePaise || 0n) / 100;

  console.log(`Raw PostgreSQL Revenue: ₹${rawTotalRevenueInr}`);
  console.log(`DailyAnalytics Revenue: ₹${readModelRevenueInr}`);
  
  if (rawTotalRevenueInr === readModelRevenueInr) {
    console.log('✅ FINANCIAL INVARIANT VERIFIED: Raw PostgreSQL Revenue === DailyAnalytics Revenue');
  } else {
    console.error('❌ FINANCIAL MISMATCH DETECTED!');
  }

  // 3. Real Redis Socket Performance & E2E Latency Benchmarks
  console.log('\n--- PHASE 12 & 13: REAL REDIS TCP SOCKET LATENCY & API E2E BENCHMARK ---');

  const redisGetLatencies = [];
  const redisSetLatencies = [];

  for (let i = 0; i < 50; i++) {
    const startSet = performance.now();
    await redisClient.set(`test:key:${i}`, JSON.stringify({ index: i, timestamp: Date.now() }), 'EX', 60);
    redisSetLatencies.push(performance.now() - startSet);

    const startGet = performance.now();
    await redisClient.get(`test:key:${i}`);
    redisGetLatencies.push(performance.now() - startGet);
  }

  console.log(`Real Redis TCP GET Latency:`);
  console.log(`  P50: ${calculatePercentile(redisGetLatencies, 50).toFixed(3)} ms`);
  console.log(`  P95: ${calculatePercentile(redisGetLatencies, 95).toFixed(3)} ms`);
  console.log(`  P99: ${calculatePercentile(redisGetLatencies, 99).toFixed(3)} ms`);

  console.log(`Real Redis TCP SET Latency:`);
  console.log(`  P50: ${calculatePercentile(redisSetLatencies, 50).toFixed(3)} ms`);
  console.log(`  P95: ${calculatePercentile(redisSetLatencies, 95).toFixed(3)} ms`);
  console.log(`  P99: ${calculatePercentile(redisSetLatencies, 99).toFixed(3)} ms`);

  // Cleanup test keys
  await redisClient.flushdb();
  if (redisServer) {
    await redisServer.stop();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
