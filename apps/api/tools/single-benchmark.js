const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runWarmColdBenchmark() {
  console.log('⚡ Measuring Cold vs Warm query latency...\n');
  
  // Query 1
  const start1 = process.hrtime.bigint();
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
  const end1 = process.hrtime.bigint();
  const duration1 = (Number(end1 - start1) / 1e6).toFixed(2);
  console.log(`❄️  Query 1 (Cold / First Connection): ${duration1} ms`);

  // Query 2 (Warm connection)
  const start2 = process.hrtime.bigint();
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
  const end2 = process.hrtime.bigint();
  const duration2 = (Number(end2 - start2) / 1e6).toFixed(2);
  console.log(`🔥 Query 2 (Warm Connection): ${duration2} ms`);
}

runWarmColdBenchmark()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
