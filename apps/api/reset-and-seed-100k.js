const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- TRUNCATING TABLES TO RECLAIM POSTGRES DISK SPACE ---');

  // Truncate tables to reclaim 500MB WAL bloat
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE payment_orders, bookings, daily_analytics CASCADE;`);
  console.log('✅ Tables truncated and disk space reclaimed!');

  const [b, p, da] = await Promise.all([
    prisma.booking.count(),
    prisma.paymentOrder.count(),
    prisma.dailyAnalytics.count(),
  ]);

  console.log(`Current counts after truncation: Bookings = ${b}, Payments = ${p}, DailyAnalytics = ${da}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
