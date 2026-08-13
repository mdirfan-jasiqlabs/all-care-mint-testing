const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRE_EXISTING_RATING_ID = '94b60735-c92e-4722-9579-bdd4f55209e0';
const QA_SEED_TAG = '[QA-SEED]';

const SEED_SPEC = [
  // 5 Stars (6 records)
  { score: 5, comment: `${QA_SEED_TAG} Excellent service and very professional.` },
  { score: 5, comment: `${QA_SEED_TAG} Technician arrived on time and completed the work properly.` },
  { score: 5, comment: `${QA_SEED_TAG} Outstanding quality, highly recommended!` },
  { score: 5, comment: `${QA_SEED_TAG} Very satisfied with the service.` },
  { score: 5, comment: `${QA_SEED_TAG} Great experience from start to finish.` },
  { score: 5, comment: null },

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
  { score: 3, comment: null },

  // 2 Stars (3 records)
  { score: 2, comment: `${QA_SEED_TAG} Technician arrived late.` },
  { score: 2, comment: `${QA_SEED_TAG} Service quality was below expectations.` },
  { score: 2, comment: `${QA_SEED_TAG} Took too long and communication was poor.` },

  // 1 Star (2 records)
  { score: 1, comment: `${QA_SEED_TAG} Issue was not resolved properly.` },
  { score: 1, comment: `${QA_SEED_TAG} Unprofessional behavior and incomplete work.` },
];

async function resetAndSeed() {
  console.log('🧹 Cleaning QA seeded ratings (preserving pre-existing ratings)...');

  // Delete only QA seeded ratings (not pre-existing rating)
  await prisma.rating.deleteMany({
    where: {
      id: { not: PRE_EXISTING_RATING_ID }
    }
  });

  console.log('🌱 Seeding exactly 20 QA Provider Ratings...');

  const eligibleBookings = await prisma.booking.findMany({
    where: {
      status: 'COMPLETED',
      providerId: { not: null },
      id: { not: '00b63391-37aa-47c6-b229-59b4672cd577' } // exclude pre-existing rated booking
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, displayName: true } },
      provider: { select: { id: true, displayName: true } },
    }
  });

  if (eligibleBookings.length < 20) {
    throw new Error(`Insufficient eligible bookings (found ${eligibleBookings.length})`);
  }

  const now = new Date();
  for (let i = 0; i < SEED_SPEC.length; i++) {
    const spec = SEED_SPEC[i];
    const booking = eligibleBookings[i];
    const daysAgo = Math.floor(1 + (i * 28) / 19);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - i * 3600 * 1000);

    await prisma.rating.create({
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
  }

  console.log('✅ Successfully seeded exactly 20 QA Provider Ratings!');
}

resetAndSeed()
  .catch((err) => {
    console.error('❌ Reset & Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
