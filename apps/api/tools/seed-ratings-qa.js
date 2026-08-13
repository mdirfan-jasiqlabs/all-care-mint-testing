const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const QA_SEED_TAG = '[QA-SEED]';

const SEED_SPEC = [
  // 5 Stars (6 records)
  { score: 5, comment: `${QA_SEED_TAG} Excellent service and very professional.` },
  { score: 5, comment: `${QA_SEED_TAG} Technician arrived on time and completed the work properly.` },
  { score: 5, comment: `${QA_SEED_TAG} Outstanding quality, highly recommended!` },
  { score: 5, comment: `${QA_SEED_TAG} Very satisfied with the service.` },
  { score: 5, comment: `${QA_SEED_TAG} Great experience from start to finish.` },
  { score: 5, comment: null }, // Null comment test case for 5-star

  // 4 Stars (5 records)
  { score: 4, comment: `${QA_SEED_TAG} Good service overall.` },
  { score: 4, comment: `${QA_SEED_TAG} Prompt response and clean work.` },
  { score: 4, comment: `${QA_SEED_TAG} Everything went smoothly, good job.` },
  { score: 4, comment: `${QA_SEED_TAG} Professional technician, satisfied with the work.` },
  { score: 4, comment: `${QA_SEED_TAG} Very good service.` },

  // 3 Stars (4 records)
  { score: 3, comment: `${QA_SEED_TAG} Work was completed but took longer than expected.` },
  { score: 3, comment: `${QA_SEED_TAG} Average experience, could be improved.` },
  { score: 3, comment: `${QA_SEED_TAG} Decent work, though slightly messy cleanup.` },
  { score: 3, comment: null }, // Null comment test case for 3-star

  // 2 Stars (3 records)
  { score: 2, comment: `${QA_SEED_TAG} Technician arrived late.` },
  { score: 2, comment: `${QA_SEED_TAG} Service quality was below expectations.` },
  { score: 2, comment: `${QA_SEED_TAG} Took too long and communication was poor.` },

  // 1 Star (2 records)
  { score: 1, comment: `${QA_SEED_TAG} Issue was not resolved properly.` },
  { score: 1, comment: `${QA_SEED_TAG} Unprofessional behavior and incomplete work.` },
];

async function seedQARatings() {
  console.log('🚀 Checking existing QA Seed Ratings...');

  // 1. Check idempotency - search for existing QA seed ratings
  const existingQARatingsCount = await prisma.rating.count({
    where: {
      reviewText: { contains: QA_SEED_TAG }
    }
  });

  if (existingQARatingsCount >= 18) {
    console.log(`✅ QA ratings dataset already seeded (${existingQARatingsCount} tagged QA records found). Idempotency preserved.`);
    return;
  }

  // 2. Fetch already rated booking IDs
  const existingRatings = await prisma.rating.findMany({ select: { bookingId: true } });
  const ratedBookingIds = new Set(existingRatings.map((r) => r.bookingId));

  // 3. Find 20 eligible COMPLETED bookings with provider assigned
  const eligibleBookings = await prisma.booking.findMany({
    where: {
      status: 'COMPLETED',
      providerId: { not: null },
      id: { notIn: Array.from(ratedBookingIds) }
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, displayName: true } },
      provider: { select: { id: true, displayName: true } },
    }
  });

  if (eligibleBookings.length < 20) {
    throw new Error(`Insufficient eligible COMPLETED bookings (found ${eligibleBookings.length}, required 20).`);
  }

  console.log(`Found ${eligibleBookings.length} eligible COMPLETED bookings. Seeding 20 QA ratings...`);

  const now = new Date();
  const createdRatings = [];

  for (let i = 0; i < SEED_SPEC.length; i++) {
    const spec = SEED_SPEC[i];
    const booking = eligibleBookings[i];

    // Spread timestamps across the last 30 days (from 1 to 29 days ago)
    const daysAgo = Math.floor(1 + (i * 28) / 19);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - i * 3600 * 1000);

    const rating = await prisma.rating.create({
      data: {
        bookingId: booking.id,
        customerId: booking.customerId,
        providerId: booking.providerId,
        ratingScore: spec.score,
        reviewText: spec.comment,
        createdAt,
        updatedAt: createdAt,
      }
    });

    createdRatings.push({
      ratingId: rating.id,
      score: rating.ratingScore,
      comment: rating.reviewText,
      customer: booking.customer.displayName,
      provider: booking.provider.displayName,
      bookingRef: booking.bookingReference,
      createdAt: createdAt.toISOString(),
    });
  }

  console.log(`✅ Successfully seeded ${createdRatings.length} QA Provider Rating records!`);
}

seedQARatings()
  .catch((err) => {
    console.error('❌ QA Seeding Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
