const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying all bookings in database...');
  const bookings = await prisma.booking.findMany({
    select: {
      id: true,
      bookingReference: true,
      status: true,
      customerId: true,
      cancelledAt: true,
      slotDate: true,
    }
  });

  console.log(`Total bookings found: ${bookings.length}`);
  const statusCounts = {};
  bookings.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    console.log(`- Ref: ${b.bookingReference}, Status: ${b.status}, ID: ${b.id}, Customer: ${b.customerId}, CancelledAt: ${b.cancelledAt}`);
  });
  console.log('\nStatus counts:', statusCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
