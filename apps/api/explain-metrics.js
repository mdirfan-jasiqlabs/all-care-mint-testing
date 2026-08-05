const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');

async function runExplain() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);

  try {
    console.log('=== EXPLAIN ANALYZE FOR METRICS QUERIES ===\n');

    const now = new Date();
    const istParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = istParts.find((p) => p.type === 'year')?.value;
    const month = istParts.find((p) => p.type === 'month')?.value;
    const day = istParts.find((p) => p.type === 'day')?.value;

    const startOfToday = new Date(`${year}-${month}-${day}T00:00:00.000+05:30`);
    const endOfToday = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);

    console.log('1. Query: payment_orders SUM(amount_paise) WHERE status = PAYMENT_SUCCESS AND updated_at BETWEEN today');
    const explain1 = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT SUM(amount_paise)
      FROM payment_orders
      WHERE status = 'PAYMENT_SUCCESS'
        AND updated_at >= '${startOfToday.toISOString()}'
        AND updated_at <= '${endOfToday.toISOString()}';
    `);
    console.log(explain1.map(row => row['QUERY PLAN']).join('\n'));

    console.log('\n2. Query: bookings COUNT WHERE status = PENDING AND provider_id IS NULL');
    const explain2 = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT COUNT(*)
      FROM bookings
      WHERE status = 'PENDING'
        AND provider_id IS NULL;
    `);
    console.log(explain2.map(row => row['QUERY PLAN']).join('\n'));

    console.log('\n3. Query: bookings WHERE status = COMPLETED AND payment_method = CASH_ON_SERVICE AND updated_at BETWEEN today');
    const explain3 = await prisma.$queryRawUnsafe(`
      EXPLAIN ANALYZE
      SELECT service_price_snapshot, payment_method
      FROM bookings
      WHERE status = 'COMPLETED'
        AND payment_method = 'CASH_ON_SERVICE'
        AND updated_at >= '${startOfToday.toISOString()}'
        AND updated_at <= '${endOfToday.toISOString()}';
    `);
    console.log(explain3.map(row => row['QUERY PLAN']).join('\n'));

  } catch (err) {
    console.error('Explain query error:', err);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runExplain();
