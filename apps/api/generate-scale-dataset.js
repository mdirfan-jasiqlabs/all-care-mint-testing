const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function generateDataset(targetRecordCount) {
  console.log(`\n================================================================`);
  console.log(`🔨 GENERATING REALISTIC ${targetRecordCount.toLocaleString()} TRANSACTIONAL RECORDS DATASET`);
  console.log(`================================================================`);

  // Fetch reference entities
  const customer = await prisma.customer.findFirst();
  const service = await prisma.service.findFirst({ where: { isActive: true } });
  const provider = await prisma.provider.findFirst({ where: { status: 'APPROVED' } });
  const slot = await prisma.bookingTimeSlot.findFirst({ where: { isActive: true } });

  if (!customer || !service || !slot || !provider) {
    throw new Error('Reference entities missing. Please run check-db.js first.');
  }

  const customerId = customer.id;
  const serviceId = service.id;
  const providerId = provider.id;
  const slotId = slot.id;
  const servicePriceInr = Number(service.fixedPrice) || 1499;
  const servicePricePaise = Math.round(servicePriceInr * 100);

  // Each pair of booking + paymentOrder is 2 transactional records
  const totalPairsNeeded = Math.floor(targetRecordCount / 2);
  const existingBookings = await prisma.booking.count();
  const pairsToInsert = Math.max(0, totalPairsNeeded - Math.floor(existingBookings));

  console.log(`Current Bookings: ${existingBookings}. Generating ${pairsToInsert} additional booking+payment pairs...`);

  if (pairsToInsert <= 0) {
    console.log('Target count already reached!');
    return;
  }

  const batchSize = 2500;
  const now = new Date();
  const daysSpan = targetRecordCount >= 500000 ? 180 : 90;

  let insertedCount = 0;
  const startTimer = performance.now();

  for (let b = 0; b < pairsToInsert; b += batchSize) {
    const currentBatchCount = Math.min(batchSize, pairsToInsert - b);
    const bookingBatch = [];
    const paymentBatch = [];

    for (let i = 0; i < currentBatchCount; i++) {
      const idx = existingBookings + insertedCount + i + 1;
      const bookingId = crypto.randomUUID();
      const paymentId = crypto.randomUUID();
      const idempotencyKey = crypto.randomUUID();
      const recordDate = new Date(now.getTime() - idx * 60 * 1000);
      const slotDate = recordDate;

      // Status distributions
      const r = Math.random();
      let status = 'COMPLETED';
      let paymentStatus = 'PAYMENT_SUCCESS';
      let paymentMethod = 'ONLINE';

      if (r < 0.60) {
        status = 'COMPLETED';
        paymentStatus = 'PAYMENT_SUCCESS';
        paymentMethod = 'ONLINE';
      } else if (r < 0.80) {
        status = 'COMPLETED';
        paymentStatus = 'CASH_SETTLED';
        paymentMethod = 'CASH_ON_SERVICE';
      } else if (r < 0.90) {
        status = 'COMPLETED';
        paymentStatus = 'CASH_PENDING';
        paymentMethod = 'CASH_ON_SERVICE';
      } else if (r < 0.95) {
        status = 'PENDING';
        paymentStatus = 'PAYMENT_PENDING';
        paymentMethod = 'ONLINE';
      } else {
        status = 'CANCELLED';
        paymentStatus = 'CANCELLED';
        paymentMethod = 'ONLINE';
      }

      bookingBatch.push({
        id: bookingId,
        bookingReference: `SCALE-${idx}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        customerId,
        providerId: status === 'PENDING' ? null : providerId,
        serviceId,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: servicePriceInr,
        addressSnapshot: { label: 'Home', addressLine1: '123 Scale St', city: 'Bengaluru', pincode: '560001' },
        slotDate: slotDate,
        slotId: null,
        slotLabelSnapshot: slot.label,
        paymentMethod,
        status,
        idempotencyKey,
        createdAt: recordDate,
        updatedAt: recordDate,
      });

      paymentBatch.push({
        id: paymentId,
        customerId,
        bookingId,
        serviceId,
        amountPaise: servicePricePaise,
        paymentMethod,
        status: paymentStatus,
        razorpayOrderId: `order_scale_${idx}`,
        idempotencyKey,
        createdAt: recordDate,
        updatedAt: recordDate,
      });
    }

    // Insert sequentially with exponential backoff and connection reconnect
    let retries = 10;
    let delayMs = 1000;
    while (retries > 0) {
      try {
        await prisma.booking.createMany({ data: bookingBatch, skipDuplicates: true });
        await prisma.paymentOrder.createMany({ data: paymentBatch, skipDuplicates: true });
        break;
      } catch (err) {
        retries--;
        console.warn(`Transient pooler error (retries left: ${retries}): ${err.message}. Retrying in ${delayMs}ms...`);
        if (retries === 0) throw err;
        await new Promise((res) => setTimeout(res, delayMs));
        delayMs = Math.min(10000, delayMs * 2);
        try {
          await prisma.$connect();
        } catch (_) {}
      }
    }

    insertedCount += currentBatchCount;
    const progressPct = ((insertedCount / pairsToInsert) * 100).toFixed(1);
    console.log(`Inserted batch: ${insertedCount} / ${pairsToInsert} pairs (${progressPct}%)`);
  }

  const elapsed = (performance.now() - startTimer) / 1000;
  console.log(`✅ Generation complete! Inserted ${insertedCount * 2} records in ${elapsed.toFixed(2)}s`);
}

async function main() {
  const target = process.argv[2] ? parseInt(process.argv[2], 10) : 100000;
  await generateDataset(target);
}

main().catch(console.error).finally(() => prisma.$disconnect());
