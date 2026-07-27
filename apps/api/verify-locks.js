const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying all slot locks in database...');
  const locks = await prisma.bookingSlotLock.findMany({
    include: {
      booking: true,
      slot: true
    }
  });

  console.log(`Total locks found: ${locks.length}`);
  locks.forEach(l => {
    console.log(`- Lock ID: ${l.id}, Slot: ${l.slot.label}, Date: ${l.slotDate.toISOString().split('T')[0]}, Expires: ${l.expiresAt}, Booking ID: ${l.bookingId}, Booking Ref: ${l.booking?.bookingReference}, Booking Status: ${l.booking?.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
