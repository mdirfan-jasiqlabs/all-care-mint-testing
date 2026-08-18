import { PrismaClient, BookingStatus, PaymentMethod, PaymentStatus, ProviderStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Safety Check: Host MUST be localhost and DB MUST be all_care_mint
function verifyLocalDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  console.log('🔍 Checking DATABASE_URL target...');

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(dbUrl);
  } catch (err) {
    console.error('❌ Failed to parse DATABASE_URL.');
    process.exit(1);
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const dbName = parsedUrl.pathname.replace('/', '').toLowerCase();

  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!isLocalHost) {
    console.error(`🚨 FATAL: Database host is "${hostname}", which is NOT localhost! Aborting to protect remote data.`);
    process.exit(1);
  }

  if (dbName !== 'all_care_mint') {
    console.error(`🚨 FATAL: Database name is "${dbName}", expected "all_care_mint"! Aborting.`);
    process.exit(1);
  }

  console.log(`✅ Verified target database is LOCAL (${hostname}:${parsedUrl.port || '5432'}/${dbName}). Proceeding safety check.`);
}

// Synthetic names & places for realistic Indian home service data
const INDIAN_FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Priya', 'Rahul', 'Sneha', 'Vikram', 'Deepika', 'Karan', 'Pooja',
  'Aditya', 'Neha', 'Siddharth', 'Divya', 'Varun', 'Meera', 'Arjun', 'Kavya', 'Nikhil', 'Shreya',
  'Rajesh', 'Sunita', 'Amit', 'Priti', 'Suresh', 'Kiran', 'Manish', 'Anita', 'Ramesh', 'Rekha'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Reddy', 'Singh', 'Joshi', 'Iyer', 'Nair', 'Malhotra', 'Mehta',
  'Gupta', 'Rao', 'Deshmukh', 'Chatterjee', 'Kulkarni', 'Bhat', 'Saxena', 'Kapoor', 'Pillai', 'Chawla'
];

const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai'];
const PINCODES: Record<string, string[]> = {
  'Bengaluru': ['560001', '560038', '560066', '560100', '560034'],
  'Mumbai': ['400001', '400050', '400076', '400092', '400012'],
  'Delhi': ['110001', '110016', '110020', '110075', '110092'],
  'Hyderabad': ['500001', '500032', '500081', '500034', '500072'],
  'Pune': ['411001', '411007', '411014', '411038', '411045'],
  'Chennai': ['600001', '600018', '600034', '600096', '600113']
};

const STREETS = [
  'MG Road', 'Indiranagar 100ft Road', 'Koramangala 5th Block', 'HSR Layout Sector 1',
  'Jayanagar 4th Block', 'Whitefield Main Road', 'Bandra West', 'Andheri East',
  'Connaught Place', 'South Extension', 'Jubilee Hills', 'Gachibowli', 'Viman Nagar', 'Velachery'
];

const REVIEWS_5_STAR = [
  'Excellent service! Very professional and thorough.',
  'On time and did a fantastic job. Highly recommended!',
  'Super clean work. Will definitely book again.',
  'Great experience, courteous professional.',
  'Top quality service from All-Care-Mint!'
];

const REVIEWS_4_STAR = [
  'Good service, minor delay in arrival but satisfied with work.',
  'Clean and neat work done. Overall good experience.',
  'Professional was helpful and explained the process well.',
  'Satisfied with the result. Fair pricing.'
];

const REVIEWS_3_STAR = [
  'Average service. Took longer than estimated.',
  'Decent job, but could be slightly better.',
  'Work completed ok, but provider was running late.'
];

const REVIEWS_2_STAR = [
  'Below expectations. Arrived very late.',
  'Cleaning was superficial in some corners.'
];

const REVIEWS_1_STAR = [
  'Unsatisfactory service experience.',
  'Did not complete the work as expected.'
];

function getRandomElem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedSupportingData() {
  console.log('⚙️ Ensuring supporting customers, addresses, and providers exist...');

  // 1. Ensure ~500 Customers exist
  const existingCustomerCount = await prisma.customer.count();
  const targetCustomers = 500;
  if (existingCustomerCount < targetCustomers) {
    console.log(`Creating ${targetCustomers - existingCustomerCount} synthetic customers...`);
    const customersToCreate = [];
    for (let i = existingCustomerCount + 1; i <= targetCustomers; i++) {
      const fn = getRandomElem(INDIAN_FIRST_NAMES);
      const ln = getRandomElem(INDIAN_LAST_NAMES);
      customersToCreate.push({
        id: crypto.randomUUID(),
        firebaseUid: `perf-cust-uid-${i}`,
        mobileNumber: `+9198${String(i).padStart(8, '0')}`,
        displayName: `${fn} ${ln}`,
        isSuspended: false
      });
    }
    await prisma.customer.createMany({ data: customersToCreate, skipDuplicates: true });
  }

  const customers = await prisma.customer.findMany({ select: { id: true, displayName: true } });

  // 2. Ensure CustomerAddresses exist for all customers
  const existingAddressCount = await prisma.customerAddress.count();
  if (existingAddressCount < customers.length) {
    console.log('Creating synthetic customer addresses...');
    const addressesToCreate = [];
    for (const cust of customers) {
      const city = getRandomElem(CITIES);
      const pincode = getRandomElem(PINCODES[city]);
      const street = getRandomElem(STREETS);
      const doorNo = `${getRandomInt(1, 400)}, ${getRandomElem(['Apartments', 'Residency', 'Towers', 'Enclave', 'Heights'])}`;

      addressesToCreate.push({
        id: crypto.randomUUID(),
        customerId: cust.id,
        label: getRandomElem(['Home', 'Office', 'Apartment']),
        addressLine1: `${doorNo}, ${street}`,
        addressLine2: `${city} Sector ${getRandomInt(1, 12)}`,
        city,
        pincode
      });
    }
    await prisma.customerAddress.createMany({ data: addressesToCreate, skipDuplicates: true });
  }

  // 3. Ensure ~100 Providers exist
  const existingProviderCount = await prisma.provider.count();
  const targetProviders = 100;
  if (existingProviderCount < targetProviders) {
    console.log(`Creating ${targetProviders - existingProviderCount} synthetic providers...`);
    const providersToCreate = [];
    for (let i = existingProviderCount + 1; i <= targetProviders; i++) {
      const fn = getRandomElem(INDIAN_FIRST_NAMES);
      const ln = getRandomElem(INDIAN_LAST_NAMES);
      const city = getRandomElem(CITIES);

      providersToCreate.push({
        id: crypto.randomUUID(),
        firebaseUid: `perf-prov-uid-${i}`,
        mobileNumber: `+9197${String(i).padStart(8, '0')}`,
        displayName: `${fn} ${ln} Services`,
        status: ProviderStatus.APPROVED,
        serviceArea: city,
        lastActiveAt: new Date()
      });
    }
    await prisma.provider.createMany({ data: providersToCreate, skipDuplicates: true });
  }

  const providers = await prisma.provider.findMany({ select: { id: true, displayName: true } });
  const addresses = await prisma.customerAddress.findMany({ select: { id: true, customerId: true, addressLine1: true, city: true, pincode: true, label: true } });

  console.log(`✅ Supporting data ready: ${customers.length} customers, ${addresses.length} addresses, ${providers.length} providers.`);

  return { customers, addresses, providers };
}

async function seed100kBookings() {
  verifyLocalDatabase();

  const currentCount = await prisma.booking.count();
  console.log(`📊 Current booking count in database: ${currentCount}`);

  const TARGET_TOTAL = 100000;
  if (currentCount >= TARGET_TOTAL) {
    console.log(`✅ Database already has ${currentCount} bookings (>= ${TARGET_TOTAL}). Skipping bulk seed.`);
    return;
  }

  const totalToSeed = TARGET_TOTAL - currentCount;
  console.log(`🚀 Starting bulk generation of ${totalToSeed} bookings...`);

  // Fetch catalog & slots
  const services = await prisma.service.findMany({
    include: { category: true }
  });
  if (services.length === 0) {
    console.error('❌ No services found! Run standard system seed first.');
    process.exit(1);
  }

  const slots = await prisma.bookingTimeSlot.findMany();
  if (slots.length === 0) {
    console.error('❌ No booking time slots found! Run check-db.js first.');
    process.exit(1);
  }

  const { customers, addresses, providers } = await seedSupportingData();

  // Create address lookup by customer ID for O(1) performance
  const addressMap = new Map<string, typeof addresses[0][]>();
  for (const addr of addresses) {
    if (!addressMap.has(addr.customerId)) {
      addressMap.set(addr.customerId, []);
    }
    addressMap.get(addr.customerId)!.push(addr);
  }

  // Weightings for realistic service popularity
  // Regular Cleaning (30%), AC General Service (25%), Leak Repair (20%), Deep Cleaning (10%), Sofa Cleaning (5%), Kitchen Cleaning (5%), Wall Painting (5%)
  const serviceWeights: { service: typeof services[0]; weight: number }[] = [];
  for (const s of services) {
    let w = 10;
    if (s.name.includes('Regular Cleaning')) w = 30;
    else if (s.name.includes('AC General')) w = 25;
    else if (s.name.includes('Leak Repair')) w = 20;
    else if (s.name.includes('Deep Cleaning')) w = 10;
    else if (s.name.includes('Sofa Cleaning')) w = 5;
    else if (s.name.includes('Kitchen Cleaning')) w = 5;
    else if (s.name.includes('Wall Painting')) w = 5;
    serviceWeights.push({ service: s, weight: w });
  }

  const totalWeight = serviceWeights.reduce((acc, curr) => acc + curr.weight, 0);

  function getWeightedService() {
    let rnd = Math.random() * totalWeight;
    for (const item of serviceWeights) {
      if (rnd < item.weight) return item.service;
      rnd -= item.weight;
    }
    return serviceWeights[0].service;
  }

  // Status distribution strategy
  // 75% COMPLETED, 10% CANCELLED, 5% REJECTED, 3% ACCEPTED, 2% ON_THE_WAY, 2% STARTED, 1.5% ASSIGNED, 1.5% PENDING
  const STATUSES: { status: BookingStatus; weight: number }[] = [
    { status: BookingStatus.COMPLETED, weight: 75 },
    { status: BookingStatus.CANCELLED, weight: 10 },
    { status: BookingStatus.REJECTED, weight: 5 },
    { status: BookingStatus.ACCEPTED, weight: 3 },
    { status: BookingStatus.ON_THE_WAY, weight: 2 },
    { status: BookingStatus.STARTED, weight: 2 },
    { status: BookingStatus.ASSIGNED, weight: 1.5 },
    { status: BookingStatus.PENDING, weight: 1.5 },
  ];
  const totalStatusWeight = STATUSES.reduce((acc, curr) => acc + curr.weight, 0);

  function getWeightedStatus(isRecent: boolean): BookingStatus {
    if (!isRecent) {
      // Historical bookings (> 14 days ago) are strictly COMPLETED, CANCELLED, or REJECTED
      const r = Math.random();
      if (r < 0.85) return BookingStatus.COMPLETED;
      if (r < 0.95) return BookingStatus.CANCELLED;
      return BookingStatus.REJECTED;
    }

    let rnd = Math.random() * totalStatusWeight;
    for (const item of STATUSES) {
      if (rnd < item.weight) return item.status;
      rnd -= item.weight;
    }
    return BookingStatus.COMPLETED;
  }

  // Date range: past 450 days up to current date
  const now = new Date();
  const startTimeMs = now.getTime() - (450 * 24 * 60 * 60 * 1000);
  const recentThresholdMs = now.getTime() - (14 * 24 * 60 * 60 * 1000);

  const BATCH_SIZE = 5000;
  const numBatches = Math.ceil(totalToSeed / BATCH_SIZE);

  const startTimeOverall = Date.now();

  for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
    const currentBatchCount = Math.min(BATCH_SIZE, totalToSeed - (batchIdx * BATCH_SIZE));
    
    const bookingsData: any[] = [];
    const statusHistoriesData: any[] = [];
    const paymentOrdersData: any[] = [];
    const ratingsData: any[] = [];

    for (let i = 0; i < currentBatchCount; i++) {
      const bookingIndex = currentCount + (batchIdx * BATCH_SIZE) + i + 1;
      const bookingId = crypto.randomUUID();

      // Random Customer & Address
      const customer = getRandomElem(customers);
      const custAddresses = addressMap.get(customer.id) || addresses;
      const address = getRandomElem(custAddresses);

      // Service & Slot
      const service = getWeightedService();
      const slot = getRandomElem(slots);

      // Created timestamp
      const createdTimeMs = startTimeMs + Math.random() * (now.getTime() - startTimeMs);
      const createdAt = new Date(createdTimeMs);
      const isRecent = createdTimeMs >= recentThresholdMs;

      // Status
      const status = getWeightedStatus(isRecent);

      // Provider assignment
      let providerId: string | null = null;
      if (status !== BookingStatus.PENDING && status !== BookingStatus.REJECTED) {
        providerId = getRandomElem(providers).id;
      } else if (status === BookingStatus.REJECTED && Math.random() > 0.5) {
        providerId = getRandomElem(providers).id;
      }

      // Slot date (within 1 to 3 days of booking created)
      const slotDateObj = new Date(createdAt.getTime() + (getRandomInt(0, 2) * 24 * 60 * 60 * 1000));
      const slotDate = new Date(Date.UTC(slotDateObj.getFullYear(), slotDateObj.getMonth(), slotDateObj.getDate()));

      // Timestamps & lifecycle detail
      let completedAt: Date | null = null;
      let cancelledAt: Date | null = null;
      let rejectionReason: string | null = null;

      if (status === BookingStatus.COMPLETED) {
        completedAt = new Date(createdAt.getTime() + getRandomInt(2, 24) * 60 * 60 * 1000);
      } else if (status === BookingStatus.CANCELLED) {
        cancelledAt = new Date(createdAt.getTime() + getRandomInt(1, 6) * 60 * 60 * 1000);
      } else if (status === BookingStatus.REJECTED) {
        rejectionReason = getRandomElem([
          'No provider available in service area at requested slot.',
          'Provider schedule conflict.',
          'Service slot full for date.'
        ]);
      }

      const updatedAt = completedAt || cancelledAt || createdAt;
      const paymentMethod = Math.random() > 0.4 ? PaymentMethod.ONLINE : PaymentMethod.CASH_ON_SERVICE;

      // Booking Reference formatting: ACM-YYYYMMDD-XXXXXX
      const yyyymmdd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
      const refIndexStr = String(bookingIndex).padStart(6, '0');
      const bookingReference = `ACM-${yyyymmdd}-${refIndexStr}`;
      const idempotencyKey = crypto.randomUUID();

      const priceNum = parseFloat(service.fixedPrice.toString());

      bookingsData.push({
        id: bookingId,
        bookingReference,
        customerId: customer.id,
        providerId,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: priceNum,
        addressId: address.id,
        addressSnapshot: {
          label: address.label,
          addressLine1: address.addressLine1,
          city: address.city,
          pincode: address.pincode
        },
        slotDate,
        slotId: slot.id,
        slotLabelSnapshot: slot.label,
        paymentMethod,
        status,
        idempotencyKey,
        rejectionReason,
        cancelledAt,
        completedAt,
        createdAt,
        updatedAt
      });

      // Generate Status History entries chronologically
      const historyFlow: { status: BookingStatus; role: string; actor: string; delayMins: number }[] = [
        { status: BookingStatus.PENDING, role: 'CUSTOMER', actor: customer.id, delayMins: 0 }
      ];

      if (status === BookingStatus.REJECTED) {
        historyFlow.push({ status: BookingStatus.REJECTED, role: 'SYSTEM', actor: customer.id, delayMins: 15 });
      } else if (status !== BookingStatus.PENDING) {
        historyFlow.push({ status: BookingStatus.ASSIGNED, role: 'SYSTEM', actor: providerId || customer.id, delayMins: 10 });
        if (status !== BookingStatus.ASSIGNED) {
          historyFlow.push({ status: BookingStatus.ACCEPTED, role: 'PROVIDER', actor: providerId || customer.id, delayMins: 25 });
          if (status !== BookingStatus.ACCEPTED) {
            historyFlow.push({ status: BookingStatus.ON_THE_WAY, role: 'PROVIDER', actor: providerId || customer.id, delayMins: 60 });
            if (status !== BookingStatus.ON_THE_WAY) {
              historyFlow.push({ status: BookingStatus.STARTED, role: 'PROVIDER', actor: providerId || customer.id, delayMins: 90 });
              if (status === BookingStatus.COMPLETED) {
                historyFlow.push({ status: BookingStatus.COMPLETED, role: 'PROVIDER', actor: providerId || customer.id, delayMins: 180 });
              }
            }
          }
        }
      }

      if (status === BookingStatus.CANCELLED) {
        historyFlow.push({ status: BookingStatus.CANCELLED, role: 'CUSTOMER', actor: customer.id, delayMins: 45 });
      }

      for (const h of historyFlow) {
        statusHistoriesData.push({
          id: crypto.randomUUID(),
          bookingId,
          status: h.status,
          actorId: h.actor,
          actorRole: h.role,
          note: `Booking state transitioned to ${h.status}`,
          createdAt: new Date(createdAt.getTime() + h.delayMins * 60 * 1000)
        });
      }

      // Generate PaymentOrder records
      if (status === BookingStatus.COMPLETED) {
        const payStatus = paymentMethod === PaymentMethod.ONLINE ? PaymentStatus.PAYMENT_SUCCESS : PaymentStatus.CASH_SETTLED;
        paymentOrdersData.push({
          id: crypto.randomUUID(),
          customerId: customer.id,
          bookingId,
          serviceId: service.id,
          slotId: slot.id,
          slotDate,
          addressId: address.id,
          razorpayOrderId: paymentMethod === PaymentMethod.ONLINE ? `order_${crypto.randomBytes(8).toString('hex')}` : null,
          razorpayPaymentId: paymentMethod === PaymentMethod.ONLINE ? `pay_${crypto.randomBytes(8).toString('hex')}` : null,
          amountPaise: Math.round(priceNum * 100),
          paymentMethod,
          status: payStatus,
          idempotencyKey: crypto.randomUUID(),
          createdAt,
          updatedAt
        });
      } else if (status === BookingStatus.CANCELLED && paymentMethod === PaymentMethod.ONLINE) {
        paymentOrdersData.push({
          id: crypto.randomUUID(),
          customerId: customer.id,
          bookingId,
          serviceId: service.id,
          slotId: slot.id,
          slotDate,
          addressId: address.id,
          razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
          razorpayPaymentId: `pay_${crypto.randomBytes(8).toString('hex')}`,
          amountPaise: Math.round(priceNum * 100),
          paymentMethod: PaymentMethod.ONLINE,
          status: PaymentStatus.CANCELLED,
          idempotencyKey: crypto.randomUUID(),
          failureReason: 'Booking cancelled by user',
          createdAt,
          updatedAt
        });
      }

      // Generate Rating records for ~60% of COMPLETED bookings
      if (status === BookingStatus.COMPLETED && providerId && Math.random() < 0.6) {
        const scoreRand = Math.random();
        let ratingScore = 5;
        let reviewText: string | null = getRandomElem(REVIEWS_5_STAR);

        if (scoreRand < 0.60) {
          ratingScore = 5;
          reviewText = getRandomElem(REVIEWS_5_STAR);
        } else if (scoreRand < 0.85) {
          ratingScore = 4;
          reviewText = getRandomElem(REVIEWS_4_STAR);
        } else if (scoreRand < 0.95) {
          ratingScore = 3;
          reviewText = getRandomElem(REVIEWS_3_STAR);
        } else if (scoreRand < 0.98) {
          ratingScore = 2;
          reviewText = getRandomElem(REVIEWS_2_STAR);
        } else {
          ratingScore = 1;
          reviewText = getRandomElem(REVIEWS_1_STAR);
        }

        ratingsData.push({
          id: crypto.randomUUID(),
          bookingId,
          customerId: customer.id,
          providerId,
          ratingScore,
          reviewText,
          createdAt: completedAt || createdAt,
          updatedAt: completedAt || createdAt
        });
      }
    }

    // Insert batch into DB using createMany
    await prisma.$transaction([
      prisma.booking.createMany({ data: bookingsData, skipDuplicates: true }),
      prisma.bookingStatusHistory.createMany({ data: statusHistoriesData, skipDuplicates: true }),
      prisma.paymentOrder.createMany({ data: paymentOrdersData, skipDuplicates: true }),
      prisma.rating.createMany({ data: ratingsData, skipDuplicates: true })
    ]);

    const seededSoFar = currentCount + (batchIdx * BATCH_SIZE) + currentBatchCount;
    console.log(`Bookings: ${seededSoFar.toLocaleString()} / ${TARGET_TOTAL.toLocaleString()}`);
  }

  const durationSec = ((Date.now() - startTimeOverall) / 1000).toFixed(2);
  const finalCount = await prisma.booking.count();
  console.log(`\n🎉 Bulk Seeding Completed Successfully!`);
  console.log(`⏱️ Duration: ${durationSec}s`);
  console.log(`📊 Final Total Bookings in Local Database: ${finalCount.toLocaleString()}`);

  console.log('🔄 Rebuilding DailyAnalytics read-model projection for seeded dataset...');
  const { AnalyticsProjectionService } = require('../src/modules/analytics/services/analytics-projection.service');
  const { AnalyticsBackfillService } = require('../src/modules/analytics/services/analytics-backfill.service');
  const projectionService = new AnalyticsProjectionService(prisma);
  const backfillService = new AnalyticsBackfillService(prisma, projectionService);
  const backfillResult = await backfillService.runBackfill();
  console.log(`✅ DailyAnalytics backfilled for ${backfillResult.processedDays} days (${backfillResult.startDate} to ${backfillResult.endDate})`);

  try {
    const Redis = require('ioredis');
    const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
    await redis.connect();
    const keys = await redis.keys('admin:dashboard:metrics:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Invalidated ${keys.length} Redis dashboard cache keys.`);
    }
    redis.disconnect();
  } catch (e) {}
}

seed100kBookings()
  .catch((e) => {
    console.error('❌ Bulk seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
