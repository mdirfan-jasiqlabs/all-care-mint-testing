import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAnalyticsSanityCheck() {
  console.log('📊 Running Analytics Queries Sanity Check on 100,000 Bookings...');
  const t0 = Date.now();

  // 1. Total Revenue in Paise (Completed ONLINE & CASH_SETTLED)
  const revenueAgg = await prisma.paymentOrder.aggregate({
    where: {
      status: { in: ['PAYMENT_SUCCESS', 'CASH_SETTLED'] }
    },
    _sum: { amountPaise: true },
    _count: { id: true }
  });
  const revenuePaise = revenueAgg._sum.amountPaise || 0;
  const revenueINR = (Number(revenuePaise) / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  console.log(`💰 Total Successful Revenue: ${revenueINR} (${revenueAgg._count.id.toLocaleString()} paid orders)`);

  // 2. Monthly Booking Volume & Revenue breakdown
  const monthlyStats = await prisma.$queryRaw<Array<{ month: string; total_bookings: bigint; completed_bookings: bigint; revenue_inr: number }>>`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*)::bigint as total_bookings,
      COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint as completed_bookings,
      COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN service_price_snapshot ELSE 0 END), 0)::float as revenue_inr
    FROM bookings
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month ASC
  `;

  console.log('\n--- MONTHLY ANALYTICS TREND (100K DATASET) ---');
  console.table(monthlyStats.map(m => ({
    Month: m.month,
    'Total Bookings': Number(m.total_bookings).toLocaleString(),
    'Completed': Number(m.completed_bookings).toLocaleString(),
    'Revenue (₹)': m.revenue_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  })));

  // 3. Provider Performance Top 5
  const topProviders = await prisma.rating.groupBy({
    by: ['providerId'],
    _avg: { ratingScore: true },
    _count: { id: true },
    having: {
      id: { _count: { gte: 10 } }
    },
    orderBy: {
      _avg: { ratingScore: 'desc' }
    },
    take: 5
  });

  console.log('\n--- TOP 5 PROVIDERS BY AVERAGE RATING ---');
  for (const tp of topProviders) {
    const prov = await prisma.provider.findUnique({ where: { id: tp.providerId }, select: { displayName: true } });
    console.log(` ⭐ ${prov?.displayName || tp.providerId}: Avg ${tp._avg.ratingScore?.toFixed(2)} (${tp._count.id} ratings)`);
  }

  const durationMs = Date.now() - t0;
  console.log(`\n⚡ Analytics Queries Executed in ${durationMs}ms`);
}

runAnalyticsSanityCheck()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
