const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testOptimizedRawQueries() {
  console.log('⚡ Testing Single-Roundtrip SQL Queries for Ratings and Payments...\n');

  // 1. Optimized Single-Query Ratings Fetch
  const startRatings = process.hrtime.bigint();
  
  const [countResult, ratingRows] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM ratings`,
    prisma.$queryRaw`
      SELECT 
        r.id, 
        r.created_at AS date, 
        r.rating_score, 
        r.review_text,
        c.display_name AS customer_name,
        p.display_name AS provider_name,
        b.booking_reference AS booking_id
      FROM ratings r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN providers p ON r.provider_id = p.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      ORDER BY r.created_at DESC
      LIMIT 20 OFFSET 0
    `
  ]);

  const endRatings = process.hrtime.bigint();
  const ratingsMs = (Number(endRatings - startRatings) / 1e6).toFixed(2);
  console.log(`✅ Single-Roundtrip Ratings Query: ${ratingsMs} ms (Rows: ${ratingRows.length}, Total: ${countResult[0].total})`);

  // 2. Optimized Single-Query Payments Fetch
  const startPayments = process.hrtime.bigint();

  const [payCountResult, paymentRows] = await Promise.all([
    prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM payment_orders`,
    prisma.$queryRaw`
      SELECT 
        po.id, 
        po.created_at AS date, 
        po.amount_paise,
        po.payment_method,
        po.status,
        c.display_name AS customer_name,
        c.mobile_number AS customer_mobile,
        s.name AS service_name,
        b.booking_reference AS booking_id,
        b.service_name_snapshot,
        prov.display_name AS provider_name
      FROM payment_orders po
      LEFT JOIN customers c ON po.customer_id = c.id
      LEFT JOIN services s ON po.service_id = s.id
      LEFT JOIN bookings b ON po.booking_id = b.id
      LEFT JOIN providers prov ON b.provider_id = prov.id
      ORDER BY po.created_at DESC
      LIMIT 20 OFFSET 0
    `
  ]);

  const endPayments = process.hrtime.bigint();
  const paymentsMs = (Number(endPayments - startPayments) / 1e6).toFixed(2);
  console.log(`✅ Single-Roundtrip Payments Query: ${paymentsMs} ms (Rows: ${paymentRows.length}, Total: ${payCountResult[0].total})`);
}

testOptimizedRawQueries()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
