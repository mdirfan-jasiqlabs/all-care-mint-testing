const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const ratingsCount = await prisma.rating.count();
  const completedBookings = await prisma.booking.count({
    where: { status: 'COMPLETED', providerId: { not: null } }
  });
  const totalBookings = await prisma.booking.count();
  const customersCount = await prisma.customer.count();
  const providersCount = await prisma.provider.count();
  const servicesCount = await prisma.service.count();

  console.log('Current DB Counts:', {
    ratingsCount,
    completedBookings,
    totalBookings,
    customersCount,
    providersCount,
    servicesCount
  });
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
