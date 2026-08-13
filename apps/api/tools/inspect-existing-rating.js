const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const ratings = await prisma.rating.findMany({
    include: {
      customer: { select: { displayName: true } },
      provider: { select: { displayName: true } },
      booking: { select: { bookingReference: true } }
    }
  });
  console.log('Existing Ratings:', JSON.stringify(ratings, null, 2));
}

inspect()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
