const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load root .env file without external dotenv dependency
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const privateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

async function main() {
  console.log('================================================================');
  console.log('  US-004-005 Provider Earnings Summary Mobile Screen QA Audit');
  console.log('================================================================\n');

  let passedTests = 0;
  let failedTests = 0;
  const defects = [];

  function assert(condition, testName, failureDetail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (failureDetail) console.error(`     Details: ${failureDetail}`);
      failedTests++;
      defects.push({ testName, failureDetail });
    }
  }

  // 1. SETUP TEST ACCOUNTS & GET REAL TOKENS
  console.log('--- 1. Setup Test Accounts & Tokens ---');
  let customer = await prisma.customer.findFirst({ where: { mobileNumber: '+919999900003' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        mobileNumber: '+919999900003',
        displayName: 'QA Earnings Customer',
      },
    });
  }

  let providerA = await prisma.provider.findFirst({ where: { mobileNumber: '+919999900001' } });
  if (!providerA) {
    providerA = await prisma.provider.create({
      data: {
        mobileNumber: '+919999900001',
        displayName: 'QA Provider Alpha',
        serviceArea: 'Koramangala, Bengaluru',
        status: 'APPROVED',
      },
    });
  }

  let providerB = await prisma.provider.findFirst({ where: { mobileNumber: '+919999900002' } });
  if (!providerB) {
    providerB = await prisma.provider.create({
      data: {
        mobileNumber: '+919999900002',
        displayName: 'QA Provider Beta',
        serviceArea: 'Indiranagar, Bengaluru',
        status: 'APPROVED',
      },
    });
  }

  let providerZero = await prisma.provider.findFirst({ where: { mobileNumber: '+919999900004' } });
  if (!providerZero) {
    providerZero = await prisma.provider.create({
      data: {
        mobileNumber: '+919999900004',
        displayName: 'QA Provider Zero Earnings',
        serviceArea: 'HSR Layout, Bengaluru',
        status: 'APPROVED',
      },
    });
  }

  const hashedPassword = await bcrypt.hash('Password@123', 10);
  let admin = await prisma.adminUser.findFirst({ where: { email: 'admin_us004_005@allcare.com' } });
  if (!admin) {
    admin = await prisma.adminUser.create({
      data: {
        email: 'admin_us004_005@allcare.com',
        passwordHash: hashedPassword,
      },
    });
  } else {
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: hashedPassword, isSuspended: false, failedAttempts: 0 },
    });
  }

  // Generate Tokens using RS256
  const providerAToken = jwt.sign({ sub: providerA.id, role: 'PROVIDER' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  const providerBToken = jwt.sign({ sub: providerB.id, role: 'PROVIDER' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  const providerZeroToken = jwt.sign({ sub: providerZero.id, role: 'PROVIDER' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  const customerToken = jwt.sign({ sub: customer.id, role: 'CUSTOMER' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  const adminToken = jwt.sign({ sub: admin.id, role: 'ADMIN' }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

  const expiredToken = jwt.sign(
    { sub: providerA.id, role: 'PROVIDER', exp: Math.floor(Date.now() / 1000) - 3600 },
    privateKey,
    { algorithm: 'RS256' },
  );
  const invalidToken = 'invalid.token.structure';

  assert(!!providerAToken, 'Provider A JWT generated successfully');
  assert(!!providerBToken, 'Provider B JWT generated successfully');
  assert(!!customerToken, 'Customer JWT generated successfully');
  assert(!!adminToken, 'Admin JWT generated successfully');

  // 2. SETUP SERVICE AND TEST BOOKINGS
  console.log('\n--- 2. Setup Test Bookings in DB ---');

  // Clean up any existing test bookings for these providers
  await prisma.booking.deleteMany({
    where: {
      providerId: { in: [providerA.id, providerB.id, providerZero.id] },
    },
  });

  let service = await prisma.service.findFirst();
  if (!service) {
    let cat = await prisma.serviceCategory.findFirst();
    if (!cat) {
      cat = await prisma.serviceCategory.create({
        data: { name: 'QA Category', description: 'Testing Category' },
      });
    }
    service = await prisma.service.create({
      data: {
        categoryId: cat.id,
        name: 'Deep AC Service',
        fixedPrice: 1000,
        estimatedDuration: '60 mins',
      },
    });
  }

  // Create 3 COMPLETED bookings for Provider A: ₹1000, ₹2500, ₹1500
  const now = new Date();
  const date1 = new Date(now.getTime() - 3 * 3600 * 1000); // 3 hours ago
  const date2 = new Date(now.getTime() - 2 * 3600 * 1000); // 2 hours ago
  const date3 = new Date(now.getTime() - 1 * 3600 * 1000); // 1 hour ago (latest)

  const bA1 = await prisma.booking.create({
    data: {
      bookingReference: `QA-A1-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      providerId: providerA.id,
      serviceId: service.id,
      serviceNameSnapshot: 'Deep AC Service',
      servicePriceSnapshot: 1000.0,
      addressSnapshot: { label: 'Home', city: 'Bengaluru' },
      slotDate: new Date(),
      slotLabelSnapshot: '10:00 AM - 11:00 AM',
      paymentMethod: 'ONLINE',
      status: 'COMPLETED',
      completedAt: date1,
      idempotencyKey: '00000000-0000-4000-a000-0000000000a1',
    },
  });

  const bA2 = await prisma.booking.create({
    data: {
      bookingReference: `QA-A2-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      providerId: providerA.id,
      serviceId: service.id,
      serviceNameSnapshot: 'Water Purifier Repair',
      servicePriceSnapshot: 2500.0,
      addressSnapshot: { label: 'Home', city: 'Bengaluru' },
      slotDate: new Date(),
      slotLabelSnapshot: '12:00 PM - 01:00 PM',
      paymentMethod: 'CASH_ON_SERVICE',
      status: 'COMPLETED',
      completedAt: date2,
      idempotencyKey: '00000000-0000-4000-a000-0000000000a2',
    },
  });

  const bA3 = await prisma.booking.create({
    data: {
      bookingReference: `QA-A3-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      providerId: providerA.id,
      serviceId: service.id,
      serviceNameSnapshot: 'Full House Cleaning',
      servicePriceSnapshot: 1500.0,
      addressSnapshot: { label: 'Home', city: 'Bengaluru' },
      slotDate: new Date(),
      slotLabelSnapshot: '03:00 PM - 04:00 PM',
      paymentMethod: 'ONLINE',
      status: 'COMPLETED',
      completedAt: date3,
      idempotencyKey: '00000000-0000-4000-a000-0000000000a3',
    },
  });

  // Create Non-COMPLETED bookings for Provider A (to verify state filtering)
  const nonCompletedStatuses = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'STARTED', 'CANCELLED'];
  for (let i = 0; i < nonCompletedStatuses.length; i++) {
    const st = nonCompletedStatuses[i];
    await prisma.booking.create({
      data: {
        bookingReference: `QA-EX-${st}-${Date.now().toString().slice(-4)}`,
        customerId: customer.id,
        providerId: providerA.id,
        serviceId: service.id,
        serviceNameSnapshot: `Excluded Service ${st}`,
        servicePriceSnapshot: 9999.0,
        addressSnapshot: { label: 'Office', city: 'Bengaluru' },
        slotDate: new Date(),
        slotLabelSnapshot: '05:00 PM - 06:00 PM',
        paymentMethod: 'ONLINE',
        status: st,
        idempotencyKey: `00000000-0000-4000-b000-00000000000${i}`,
      },
    });
  }

  // Create 2 COMPLETED bookings for Provider B: ₹2000, ₹3000
  const bB1 = await prisma.booking.create({
    data: {
      bookingReference: `QA-B1-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      providerId: providerB.id,
      serviceId: service.id,
      serviceNameSnapshot: 'Electrical Inspection',
      servicePriceSnapshot: 2000.0,
      addressSnapshot: { label: 'Office', city: 'Bengaluru' },
      slotDate: new Date(),
      slotLabelSnapshot: '11:00 AM - 12:00 PM',
      paymentMethod: 'ONLINE',
      status: 'COMPLETED',
      completedAt: new Date(),
      idempotencyKey: '00000000-0000-4000-c000-0000000000b1',
    },
  });

  const bB2 = await prisma.booking.create({
    data: {
      bookingReference: `QA-B2-${Date.now().toString().slice(-6)}`,
      customerId: customer.id,
      providerId: providerB.id,
      serviceId: service.id,
      serviceNameSnapshot: 'Plumbing Service',
      servicePriceSnapshot: 3000.0,
      addressSnapshot: { label: 'Office', city: 'Bengaluru' },
      slotDate: new Date(),
      slotLabelSnapshot: '02:00 PM - 03:00 PM',
      paymentMethod: 'ONLINE',
      status: 'COMPLETED',
      completedAt: new Date(),
      idempotencyKey: '00000000-0000-4000-c000-0000000000b2',
    },
  });

  // 3. MANDATORY TEST SCENARIO TC-004-010: PROVIDER EARNINGS VERIFICATION
  console.log('\n--- 3. Testing TC-004-010: Provider Earnings Summary ---');
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerAToken}` },
    });
    const json = await res.json();
    assert(res.status === 200, 'TC-004-010: GET /providers/me/earnings returns HTTP 200 for Provider');

    const data = json.data || json;
    assert(data.total_earnings_inr === 5000, `TC-004-010: total_earnings_inr equals ₹5000 (1000 + 2500 + 1500). Got: ${data.total_earnings_inr}`);
    assert(Array.isArray(data.jobs), 'TC-004-010: Response contains jobs array');
    assert(data.jobs.length === 3, `TC-004-010: Exactly 3 COMPLETED bookings returned (non-completed excluded). Got count: ${data.jobs.length}`);

    // Verify ordering: completed_at DESC
    const dates = data.jobs.map((j) => new Date(j.completed_at).getTime());
    const isSortedDesc = dates[0] >= dates[1] && dates[1] >= dates[2];
    assert(isSortedDesc, 'TC-004-010: Jobs array is sorted by completed_at DESC');

    // Verify job details match
    const latestJob = data.jobs[0]; // should be bA3 (Full House Cleaning, 1500, completed date3)
    assert(latestJob.booking_id === bA3.id, `TC-004-010: Latest job booking_id is correct (${bA3.id})`);
    assert(latestJob.service_name === 'Full House Cleaning', `TC-004-010: Service name snapshot correct (${latestJob.service_name})`);
    assert(latestJob.amount === 1500, `TC-004-010: Job amount is ₹1500 in INR (not paise). Got: ${latestJob.amount}`);
    assert(latestJob.completed_at && !isNaN(new Date(latestJob.completed_at).getTime()), 'TC-004-010: completed_at is valid ISO date');
  } catch (e) {
    assert(false, 'TC-004-010: Exception during provider earnings test', e.message);
  }

  // 4. AUTHENTICATION & AUTHORIZATION VERIFICATION (TC-004-011)
  console.log('\n--- 4. Testing TC-004-011 & Authentication Matrix ---');

  // Customer JWT -> 403
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res.status === 403, `TC-004-011: Customer JWT returns HTTP 403 Forbidden. Got: ${res.status}`);
  } catch (e) {
    assert(false, 'TC-004-011: Exception during Customer JWT check', e.message);
  }

  // Admin JWT -> 403
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 403, `Auth Matrix: Admin JWT returns HTTP 403 Forbidden. Got: ${res.status}`);
  } catch (e) {
    assert(false, 'Auth Matrix: Exception during Admin JWT check', e.message);
  }

  // Missing JWT -> 401
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`);
    assert(res.status === 401, `Auth Matrix: Missing Authorization header returns HTTP 401. Got: ${res.status}`);
  } catch (e) {
    assert(false, 'Auth Matrix: Exception during Missing JWT check', e.message);
  }

  // Expired JWT -> 401
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(res.status === 401, `Auth Matrix: Expired JWT returns HTTP 401. Got: ${res.status}`);
  } catch (e) {
    assert(false, 'Auth Matrix: Exception during Expired JWT check', e.message);
  }

  // Invalid JWT -> 401
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${invalidToken}` },
    });
    assert(res.status === 401, `Auth Matrix: Invalid JWT returns HTTP 401. Got: ${res.status}`);
  } catch (e) {
    assert(false, 'Auth Matrix: Exception during Invalid JWT check', e.message);
  }

  // 5. DATA OWNERSHIP & BOLA ISOLATION VERIFICATION
  console.log('\n--- 5. Testing Data Ownership Isolation & BOLA ---');
  try {
    const resA = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerAToken}` },
    });
    const jsonA = await resA.json();
    const dataA = jsonA.data || jsonA;

    const resB = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerBToken}` },
    });
    const jsonB = await resB.json();
    const dataB = jsonB.data || jsonB;

    assert(dataA.jobs.length === 3, 'Data Ownership: Provider A receives only Provider A jobs (3 jobs)');
    assert(dataA.total_earnings_inr === 5000, 'Data Ownership: Provider A total is ₹5000');

    assert(dataB.jobs.length === 2, 'Data Ownership: Provider B receives only Provider B jobs (2 jobs)');
    assert(dataB.total_earnings_inr === 5000, 'Data Ownership: Provider B total is ₹5000');

    // Verify Provider A cannot see Provider B job IDs and vice versa
    const providerAJobIds = new Set(dataA.jobs.map((j) => j.booking_id));
    const providerBJobIds = new Set(dataB.jobs.map((j) => j.booking_id));

    const intersects = [...providerAJobIds].some((id) => providerBJobIds.has(id));
    assert(!intersects, 'Data Ownership: Zero cross-provider job leakage between Provider A and B');
  } catch (e) {
    assert(false, 'Data Ownership: Exception during BOLA check', e.message);
  }

  // 6. ZERO EARNINGS & BOUNDARY CALCULATIONS
  console.log('\n--- 6. Testing Calculation Edge Cases & Zero Earnings ---');
  try {
    const resZero = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerZeroToken}` },
    });
    const jsonZero = await resZero.json();
    const dataZero = jsonZero.data || jsonZero;

    assert(dataZero.total_earnings_inr === 0, `Calculation: Zero completed jobs returns total_earnings_inr = 0. Got: ${dataZero.total_earnings_inr}`);
    assert(Array.isArray(dataZero.jobs) && dataZero.jobs.length === 0, 'Calculation: Zero completed jobs returns empty jobs array');
  } catch (e) {
    assert(false, 'Calculation: Exception during zero earnings check', e.message);
  }

  // 7. SENSITIVE DATA LEAKAGE AUDIT
  console.log('\n--- 7. Response Schema & Sensitive Field Privacy Audit ---');
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerAToken}` },
    });
    const json = await res.json();
    const strPayload = JSON.stringify(json);

    assert(!strPayload.includes('password'), 'Privacy Audit: No "password" field in response');
    assert(!strPayload.includes('mobileNumber') && !strPayload.includes('mobile_number'), 'Privacy Audit: No provider/customer mobile number in response');
    assert(!strPayload.includes('otp'), 'Privacy Audit: No OTP secret in response');
    assert(!strPayload.includes('accessToken') && !strPayload.includes('refreshToken'), 'Privacy Audit: No JWT tokens leaked in earnings response');
  } catch (e) {
    assert(false, 'Privacy Audit: Exception during schema privacy check', e.message);
  }

  // 8. CLEANUP AUDIT TEST DATA
  console.log('\n--- 8. Cleaning Up Audit DB Records ---');
  await prisma.booking.deleteMany({
    where: {
      providerId: { in: [providerA.id, providerB.id, providerZero.id] },
    },
  });
  await prisma.provider.deleteMany({
    where: {
      id: { in: [providerA.id, providerB.id, providerZero.id] },
    },
  });
  await prisma.customer.deleteMany({
    where: { id: customer.id },
  });
  await prisma.adminUser.deleteMany({
    where: { id: admin.id },
  });

  console.log('\n================================================================');
  console.log(`  QA Audit Summary: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error('Defects Summary:', JSON.stringify(defects, null, 2));
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal audit error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
