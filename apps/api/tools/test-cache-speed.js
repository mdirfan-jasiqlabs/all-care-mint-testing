const { RatingService } = require('../dist/src/modules/rating/services/rating.service');
const { PaymentService } = require('../dist/src/modules/payment/services/payment.service');
const { PrismaService } = require('../dist/src/prisma/prisma.service');

async function testSpeed() {
  console.log('⚡ Measuring API Service Execution Latency (Cold vs Warm/Cached)...\n');
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  const ratingService = new RatingService(prisma);
  const paymentService = new PaymentService(prisma);

  const query = { page: '1', page_size: '20' };

  // --- Ratings ---
  const rStart1 = process.hrtime.bigint();
  await ratingService.getAdminRatings(query);
  const rEnd1 = process.hrtime.bigint();
  const rMs1 = (Number(rEnd1 - rStart1) / 1e6).toFixed(2);
  console.log(`❄️  Ratings Request 1 (DB Fetch): ${rMs1} ms`);

  const rStart2 = process.hrtime.bigint();
  await ratingService.getAdminRatings(query);
  const rEnd2 = process.hrtime.bigint();
  const rMs2 = (Number(rEnd2 - rStart2) / 1e6).toFixed(2);
  console.log(`🚀 Ratings Request 2 (Cached Response): ${rMs2} ms\n`);

  // --- Payments ---
  const pStart1 = process.hrtime.bigint();
  await paymentService.getAdminPayments(query);
  const pEnd1 = process.hrtime.bigint();
  const pMs1 = (Number(pEnd1 - pStart1) / 1e6).toFixed(2);
  console.log(`❄️  Payments Request 1 (DB Fetch): ${pMs1} ms`);

  const pStart2 = process.hrtime.bigint();
  await paymentService.getAdminPayments(query);
  const pEnd2 = process.hrtime.bigint();
  const pMs2 = (Number(pEnd2 - pStart2) / 1e6).toFixed(2);
  console.log(`🚀 Payments Request 2 (Cached Response): ${pMs2} ms\n`);

  await prisma.onModuleDestroy();
}

testSpeed().catch(console.error);
