const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyRatings() {
  console.log('🔍 Auditing Provider Ratings database records...\n');

  const allRatings = await prisma.rating.findMany({
    include: {
      customer: { select: { id: true, displayName: true } },
      provider: { select: { id: true, displayName: true } },
      booking: { select: { id: true, bookingReference: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCount = allRatings.length;
  const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let withComments = 0;
  let withoutComments = 0;

  const providerSet = new Set();
  const customerSet = new Set();
  const bookingSet = new Set();
  let invalidBookingsCount = 0;

  for (const r of allRatings) {
    scoreCounts[r.ratingScore] = (scoreCounts[r.ratingScore] || 0) + 1;

    if (r.reviewText && r.reviewText.trim() !== '') {
      withComments++;
    } else {
      withoutComments++;
    }

    if (r.providerId) providerSet.add(r.providerId);
    if (r.customerId) customerSet.add(r.customerId);

    // Check unique booking constraint and completed status
    if (bookingSet.has(r.bookingId)) {
      console.error(`❌ Duplicate booking rating detected for bookingId: ${r.bookingId}`);
    }
    bookingSet.add(r.bookingId);

    if (!r.booking || r.booking.status !== 'COMPLETED') {
      invalidBookingsCount++;
    }
  }

  const report = {
    totalRatings: totalCount,
    fiveStarCount: scoreCounts[5],
    fourStarCount: scoreCounts[4],
    threeStarCount: scoreCounts[3],
    twoStarCount: scoreCounts[2],
    oneStarCount: scoreCounts[1],
    withCommentsCount: withComments,
    withoutCommentsCount: withoutComments,
    uniqueProvidersCount: providerSet.size,
    uniqueCustomersCount: customerSet.size,
    invalidBookingsCount,
    allLinkedBookingsValid: invalidBookingsCount === 0,
    duplicateBookingConstraintsPassed: bookingSet.size === totalCount,
  };

  console.log('📊 DATABASE VERIFICATION REPORT:');
  console.log(JSON.stringify(report, null, 2));

  if (
    report.fiveStarCount >= 6 &&
    report.fourStarCount >= 5 &&
    report.threeStarCount >= 4 &&
    report.twoStarCount >= 3 &&
    report.oneStarCount >= 2 &&
    report.allLinkedBookingsValid &&
    report.duplicateBookingConstraintsPassed
  ) {
    console.log('\n✅ ALL DB INVARIANTS AND QA CONSTRAINTS PASSED SUCCESSFULLY!');
  } else {
    console.error('\n❌ DB VERIFICATION FAILED TO MEET EXPECTED THRESHOLDS.');
  }
}

verifyRatings()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
