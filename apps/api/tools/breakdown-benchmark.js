const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBreakdownBenchmark() {
  console.log('🔬 Measuring breakdown of count vs findMany latency...\n');
  const where = {};

  // 1. Measure count() alone
  const startCount = process.hrtime.bigint();
  const total = await prisma.rating.count({ where });
  const endCount = process.hrtime.bigint();
  const countMs = (Number(endCount - startCount) / 1e6).toFixed(2);
  console.log(`1️⃣  rating.count() alone: ${countMs} ms (total: ${total})`);

  // 2. Measure findMany() alone
  const startFind = process.hrtime.bigint();
  const records = await prisma.rating.findMany({
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
  });
  const endFind = process.hrtime.bigint();
  const findMs = (Number(endFind - startFind) / 1e6).toFixed(2);
  console.log(`2️⃣  rating.findMany() alone: ${findMs} ms (records: ${records.length})`);

  // 3. Measure raw query or join query
  const startRaw = process.hrtime.bigint();
  const rawRecords = await prisma.$queryRaw`
    SELECT 
      r.id, 
      r.created_at AS date, 
      r.rating_score, 
      r.review_text,
      c.display_name AS customer_name,
      p.display_name AS provider_name,
      b.booking_reference AS booking_id
    FROM ratings r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN providers p ON r.provider_id = p.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    ORDER BY r.created_at DESC
    LIMIT 20
  `;
  const endRaw = process.hrtime.bigint();
  const rawMs = (Number(endRaw - startRaw) / 1e6).toFixed(2);
  console.log(`3️⃣  Raw SQL JOIN query ($queryRaw): ${rawMs} ms (records: ${rawRecords.length})`);
}

runBreakdownBenchmark()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
