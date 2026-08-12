const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- PRUNING SYNTHETIC SCALE RECORDS TO FIT NEON STORAGE QUOTA ---');

  // Keep first 50,000 scale bookings and delete excess
  const scaleBookings = await prisma.booking.findMany({
    where: { bookingReference: { startsWith: 'SCALE-' } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    skip: 50000,
  });

  const idsToDelete = scaleBookings.map((b) => b.id);
  console.log(`Found ${idsToDelete.length} excess scale bookings to delete...`);

  if (idsToDelete.length > 0) {
    // Delete in chunks of 5000
    const chunkSize = 5000;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      await prisma.paymentOrder.deleteMany({
        where: { bookingId: { in: chunk } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: chunk } },
      });
      console.log(`Deleted chunk ${i / chunkSize + 1}`);
    }
  }

  // Vacuum / check counts
  const [bCount, pCount, daCount] = await Promise.all([
    prisma.booking.count(),
    prisma.paymentOrder.count(),
    prisma.dailyAnalytics.count(),
  ]);

  console.log(`\nClean Dataset Row Counts:`);
  console.log(`- Bookings: ${bCount.toLocaleString()}`);
  console.log(`- PaymentOrders: ${pCount.toLocaleString()}`);
  console.log(`- Total Transactional: ${(bCount + pCount).toLocaleString()}`);
  console.log(`- DailyAnalytics Buckets: ${daCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
