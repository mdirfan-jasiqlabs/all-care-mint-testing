const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function benchmarkQuery(name, fn, iterations = 5) {
  const timings = [];
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    timings.push(durationMs);
  }

  timings.sort((a, b) => a - b);
  const p50 = timings[Math.floor(timings.length * 0.5)].toFixed(2);
  const p95 = timings[Math.floor(timings.length * 0.95)].toFixed(2);
  const p99 = timings[Math.floor(timings.length * 0.99)].toFixed(2);

  return { name, p50: `${p50} ms`, p95: `${p95} ms`, p99: `${p99} ms` };
}

async function runFastBenchmarks() {
  console.log('⚡ Running Fast Post-Optimization Benchmarks...\n');

  const b1 = await benchmarkQuery('1. Default Ledger (Date DESC)', async () => {
    const where = {};
    await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          providerId: true,
          ratingScore: true,
          reviewText: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);
  });

  const b2 = await benchmarkQuery('2. Search Query ("MD Irfan")', async () => {
    const where = {
      OR: [
        { provider: { displayName: { contains: 'MD Irfan', mode: 'insensitive' } } },
        { customer: { displayName: { contains: 'MD Irfan', mode: 'insensitive' } } },
      ],
    };
    await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          providerId: true,
          ratingScore: true,
          reviewText: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);
  });

  const b3 = await benchmarkQuery('3. Rating Filter (LOW <= 2)', async () => {
    const where = { ratingScore: { lte: 2 } };
    await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          providerId: true,
          ratingScore: true,
          reviewText: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);
  });

  const b4 = await benchmarkQuery('4. Date Filter (Last 14 Days)', async () => {
    const dateFrom = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const where = { createdAt: { gte: dateFrom } };
    await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          providerId: true,
          ratingScore: true,
          reviewText: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);
  });

  const b5 = await benchmarkQuery('5. Rating Sort (Rating DESC)', async () => {
    const where = {};
    await Promise.all([
      prisma.rating.count({ where }),
      prisma.rating.findMany({
        where,
        skip: 0,
        take: 20,
        orderBy: { ratingScore: 'desc' },
        select: {
          id: true,
          bookingId: true,
          customerId: true,
          providerId: true,
          ratingScore: true,
          reviewText: true,
          createdAt: true,
          customer: { select: { displayName: true } },
          provider: { select: { displayName: true } },
          booking: { select: { bookingReference: true } },
        },
      }),
    ]);
  });

  console.log('⚡ POST-OPTIMIZATION BENCHMARK RESULTS:');
  console.table([
    { Query: b1.name, P50: b1.p50, P95: b1.p95, P99: b1.p99 },
    { Query: b2.name, P50: b2.p50, P95: b2.p95, P99: b2.p99 },
    { Query: b3.name, P50: b3.p50, P95: b3.p95, P99: b3.p99 },
    { Query: b4.name, P50: b4.p50, P95: b4.p95, P99: b4.p99 },
    { Query: b5.name, P50: b5.p50, P95: b5.p95, P99: b5.p99 },
  ]);
}

runFastBenchmarks()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
