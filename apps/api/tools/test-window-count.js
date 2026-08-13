const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testWindowQuery() {
  console.log('🚀 Testing Window Function COUNT(*) OVER() Single Query...\n');

  // Ratings Window Query
  const startRatings = process.hrtime.bigint();
  const ratingRows = await prisma.$queryRaw`
    SELECT 
      r.id, 
      r.created_at AS date, 
      r.rating_score, 
      r.review_text,
      c.display_name AS customer_name,
      p.display_name AS provider_name,
      b.booking_reference AS booking_id,
      COUNT(*) OVER()::int AS total_count
    FROM ratings r
    LEFT JOIN customers c ON r.customer_id = c.id
    LEFT JOIN providers p ON r.provider_id = p.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    ORDER BY r.created_at DESC
    LIMIT 20 OFFSET 0
  `;
  const endRatings = process.hrtime.bigint();
  const ratingsMs = (Number(endRatings - startRatings) / 1e6).toFixed(2);
  const totalRatings = ratingRows.length > 0 ? ratingRows[0].total_count : 0;
  console.log(`⚡ Ratings Window Query: ${ratingsMs} ms (Records: ${ratingRows.length}, Total: ${totalRatings})`);

  // Payments Window Query
  const startPayments = process.hrtime.bigint();
  const paymentRows = await prisma.$queryRaw`
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
      prov.display_name AS provider_name,
      COUNT(*) OVER()::int AS total_count
    FROM payment_orders po
    LEFT JOIN customers c ON po.customer_id = c.id
    LEFT JOIN services s ON po.service_id = s.id
    LEFT JOIN bookings b ON po.booking_id = b.id
    LEFT JOIN providers prov ON b.provider_id = prov.id
    ORDER BY po.created_at DESC
    LIMIT 20 OFFSET 0
  `;
  const endPayments = process.hrtime.bigint();
  const paymentsMs = (Number(endPayments - startPayments) / 1e6).toFixed(2);
  const totalPayments = paymentRows.length > 0 ? paymentRows[0].total_count : 0;
  console.log(`⚡ Payments Window Query: ${paymentsMs} ms (Records: ${paymentRows.length}, Total: ${totalPayments})`);
}

testWindowQuery()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
