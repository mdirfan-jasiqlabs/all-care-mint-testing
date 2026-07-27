const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.bookingSlotLock.updateMany({
    data: {
      expiresAt: new Date(Date.now() - 100000)
    }
  });
  console.log(`Expired locks count: ${result.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
