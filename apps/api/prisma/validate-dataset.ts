import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validate() {
  console.log('🔍 Running Database Integrity & Relational Verification...');

  // 1. Total Counts
  const totalBookings = await prisma.booking.count();
  const totalCustomers = await prisma.customer.count();
  const totalProviders = await prisma.provider.count();
  const totalServices = await prisma.service.count();
  const totalPayments = await prisma.paymentOrder.count();
  const totalRatings = await prisma.rating.count();
  const totalStatusHistories = await prisma.bookingStatusHistory.count();

  console.log('\n--- DATASET COUNTS ---');
  console.log(`Bookings:          ${totalBookings.toLocaleString()}`);
  console.log(`Customers:         ${totalCustomers.toLocaleString()}`);
  console.log(`Providers:         ${totalProviders.toLocaleString()}`);
  console.log(`Services:          ${totalServices.toLocaleString()}`);
  console.log(`Payment Orders:    ${totalPayments.toLocaleString()}`);
  console.log(`Ratings:           ${totalRatings.toLocaleString()}`);
  console.log(`Status Histories:  ${totalStatusHistories.toLocaleString()}`);

  // 2. Status Distribution
  const statusGroups = await prisma.booking.groupBy({
    by: ['status'],
    _count: { status: true }
  });
  console.log('\n--- STATUS DISTRIBUTION ---');
  for (const sg of statusGroups) {
    const pct = ((sg._count.status / totalBookings) * 100).toFixed(2);
    console.log(` ${sg.status.padEnd(12)}: ${sg._count.status.toLocaleString().padStart(7)} (${pct}%)`);
  }

  // 3. Service Distribution
  const serviceGroups = await prisma.booking.groupBy({
    by: ['serviceNameSnapshot'],
    _count: { serviceNameSnapshot: true }
  });
  console.log('\n--- SERVICE DISTRIBUTION ---');
  for (const sg of serviceGroups) {
    const pct = ((sg._count.serviceNameSnapshot / totalBookings) * 100).toFixed(2);
    console.log(` ${sg.serviceNameSnapshot.padEnd(20)}: ${sg._count.serviceNameSnapshot.toLocaleString().padStart(7)} (${pct}%)`);
  }

  // 4. Payment Distribution
  const paymentMethodGroups = await prisma.booking.groupBy({
    by: ['paymentMethod'],
    _count: { paymentMethod: true }
  });
  console.log('\n--- PAYMENT METHOD DISTRIBUTION ---');
  for (const pg of paymentMethodGroups) {
    const pct = ((pg._count.paymentMethod / totalBookings) * 100).toFixed(2);
    console.log(` ${pg.paymentMethod.padEnd(16)}: ${pg._count.paymentMethod.toLocaleString().padStart(7)} (${pct}%)`);
  }

  // 5. Date Range Verification
  const minMaxDate = await prisma.booking.aggregate({
    _min: { createdAt: true },
    _max: { createdAt: true }
  });
  console.log('\n--- DATE RANGE ---');
  console.log(`Earliest Booking: ${minMaxDate._min.createdAt?.toISOString()}`);
  console.log(`Latest Booking:   ${minMaxDate._max.createdAt?.toISOString()}`);

  // 6. Integrity & Anomaly Checks (via SQL)
  console.log('\n--- INTEGRITY AUDITS ---');

  const orphanCustomers = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM bookings b LEFT JOIN customers c ON b.customer_id = c.id WHERE c.id IS NULL
  `;
  console.log(`Orphan Bookings (Invalid Customer FK): ${orphanCustomers[0].count.toString()}`);

  const orphanServices = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM bookings b LEFT JOIN services s ON b.service_id = s.id WHERE s.id IS NULL
  `;
  console.log(`Orphan Bookings (Invalid Service FK):  ${orphanServices[0].count.toString()}`);

  const invalidProviders = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM bookings b LEFT JOIN providers p ON b.provider_id = p.id WHERE b.provider_id IS NOT NULL AND p.id IS NULL
  `;
  console.log(`Invalid Provider FK References:       ${invalidProviders[0].count.toString()}`);

  const timestampAnomalies = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM bookings WHERE completed_at IS NOT NULL AND completed_at < created_at
  `;
  console.log(`Timestamp Order Anomalies (completedAt < createdAt): ${timestampAnomalies[0].count.toString()}`);

  const financialMismatches = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count 
    FROM payment_orders po
    JOIN bookings b ON po.booking_id = b.id
    WHERE po.amount_paise != ROUND(b.service_price_snapshot * 100)
  `;
  console.log(`Financial Calculation Mismatches: ${financialMismatches[0].count.toString()}`);

  const passed = 
    Number(orphanCustomers[0].count) === 0 && 
    Number(orphanServices[0].count) === 0 && 
    Number(invalidProviders[0].count) === 0 && 
    Number(timestampAnomalies[0].count) === 0 && 
    Number(financialMismatches[0].count) === 0;

  console.log('\n====================================');
  console.log(passed ? '✅ INTEGRITY CHECK PASSED (0 ERRORS)' : '❌ INTEGRITY CHECK FAILED');
  console.log('====================================\n');
}

validate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
