const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminRatingsQuery() {
  const records = await prisma.rating.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { displayName: true } },
      provider: { select: { displayName: true } },
      booking: { select: { bookingReference: true } },
    }
  });

  console.log(`Fetched ${records.length} records from DB. Sample records:`);
  console.log(records.slice(0, 5).map(r => ({
    date: r.createdAt.toISOString(),
    customer: r.customer.displayName,
    provider: r.provider.displayName,
    bookingRef: r.booking.bookingReference,
    score: r.ratingScore,
    review: r.reviewText
  })));
}

testAdminRatingsQuery()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
