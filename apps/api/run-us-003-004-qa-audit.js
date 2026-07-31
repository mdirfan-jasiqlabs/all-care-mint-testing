const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const envPath = path.join(__dirname, '.env');
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}
const privateKeyMatch = envContent.match(/JWT_PRIVATE_KEY="([\s\S]*?)"/);
const privateKey = privateKeyMatch ? privateKeyMatch[1].replace(/\\n/g, '\n') : '';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api/v1';

function signToken(userId, role) {
  return jwt.sign({ sub: userId, role }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
}

async function main() {
  console.log('====================================================');
  console.log('  US-003-004 QA Audit: Provider Accept & Reject Job ');
  console.log('====================================================\n');

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

  // 1. SETUP TEST USERS & BOOKINGS IN DB
  console.log('--- 1. Setup Test Accounts & DB Data ---');
  
  // Seed/Get Provider A
  let provA = await prisma.provider.findFirst({ where: { mobileNumber: '+919876543901' } });
  if (!provA) {
    provA = await prisma.provider.create({
      data: {
        mobileNumber: '+919876543901',
        displayName: 'QA Provider A',
        status: 'APPROVED',
        serviceArea: 'Indiranagar, Bengaluru',
      },
    });
  } else {
    provA = await prisma.provider.update({
      where: { id: provA.id },
      data: { status: 'APPROVED' },
    });
  }

  // Seed/Get Provider B
  let provB = await prisma.provider.findFirst({ where: { mobileNumber: '+919876543902' } });
  if (!provB) {
    provB = await prisma.provider.create({
      data: {
        mobileNumber: '+919876543902',
        displayName: 'QA Provider B',
        status: 'APPROVED',
        serviceArea: 'Indiranagar, Bengaluru',
      },
    });
  } else {
    provB = await prisma.provider.update({
      where: { id: provB.id },
      data: { status: 'APPROVED' },
    });
  }

  // Seed/Get Suspended Provider
  let provSuspended = await prisma.provider.findFirst({ where: { mobileNumber: '+919876543903' } });
  if (!provSuspended) {
    provSuspended = await prisma.provider.create({
      data: {
        mobileNumber: '+919876543903',
        displayName: 'QA Provider Suspended',
        status: 'SUSPENDED',
        serviceArea: 'Indiranagar, Bengaluru',
      },
    });
  } else {
    provSuspended = await prisma.provider.update({
      where: { id: provSuspended.id },
      data: { status: 'SUSPENDED' },
    });
  }

  // Seed Customer
  let customer = await prisma.customer.findFirst({ where: { mobileNumber: '+919876543900' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        mobileNumber: '+919876543900',
        displayName: 'QA Customer',
      },
    });
  }

  // Get sample service & slot
  const service = await prisma.service.findFirst({ where: { isActive: true } });
  const slot = await prisma.bookingTimeSlot.findFirst({ where: { isActive: true } });

  // Generate valid RS256 JWTs
  const provAToken = signToken(provA.id, 'PROVIDER');
  const provBToken = signToken(provB.id, 'PROVIDER');
  const provSuspendedToken = signToken(provSuspended.id, 'PROVIDER');
  const customerToken = signToken(customer.id, 'CUSTOMER');
  const adminUser = await prisma.adminUser.findFirst();
  const adminToken = signToken(adminUser.id, 'ADMIN');

  console.log(`  Provider A ID: ${provA.id}`);
  console.log(`  Provider B ID: ${provB.id}`);
  console.log(`  Customer ID: ${customer.id}`);

  let baseMonth = Math.floor(Math.random() * 10) + 1;
  let dayOffset = 1;
  async function createTestBooking(status = 'ASSIGNED', assignedProviderId = provA.id) {
    const ref = `ACM-QA-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const monthStr = baseMonth.toString().padStart(2, '0');
    const dayStr = (dayOffset++).toString().padStart(2, '0');
    const slotDate = new Date(`2027-${monthStr}-${dayStr}T00:00:00.000Z`);
    const booking = await prisma.booking.create({
      data: {
        bookingReference: ref,
        customerId: customer.id,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.fixedPrice.toString(),
        addressId: null,
        addressSnapshot: {
          label: 'Home',
          addressLine1: '123 QA Secret Villa',
          addressLine2: 'Block B',
          city: 'Bengaluru',
          pincode: '560038',
        },
        slotDate: slotDate,
        slotId: slot.id,
        slotLabelSnapshot: slot.label,
        paymentMethod: 'CASH_ON_SERVICE',
        status: status,
        providerId: assignedProviderId,
        idempotencyKey: require('crypto').randomUUID(),
      },
    });

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        status: status,
        actorId: adminUser.id,
        actorRole: 'ADMIN',
        note: 'Seeded test booking',
      },
    });

    return booking;
  }

  // 2. AUTHORIZATION & BOLA TESTS
  console.log('\n--- 2. Authorization & BOLA Tests ---');

  // 2.1 Missing JWT
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings`);
    assert(res.status === 401, 'Missing JWT returns HTTP 401', `Got status ${res.status}`);
  }

  // 2.2 Customer JWT on Provider Endpoint
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res.status === 403, 'Customer JWT on provider endpoint returns HTTP 403', `Got status ${res.status}`);
  }

  // 2.3 Admin JWT on Provider Endpoint
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 403, 'Admin JWT on provider endpoint returns HTTP 403', `Got status ${res.status}`);
  }

  // 2.4 Suspended Provider Token
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings`, {
      headers: { Authorization: `Bearer ${provSuspendedToken}` },
    });
    assert(res.status === 403, 'Suspended provider token returns HTTP 403', `Got status ${res.status}`);
  }

  // 2.5 Provider B accessing Provider A's assigned booking (BOLA)
  const bolaBooking = await createTestBooking('ASSIGNED', provA.id);
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${bolaBooking.id}`, {
      headers: { Authorization: `Bearer ${provBToken}` },
    });
    const body = await res.json();
    assert(res.status === 403, 'Provider B accessing Provider A booking returns HTTP 403 (BOLA)', `Got status ${res.status}`);
    const hasAddressLeak = JSON.stringify(body).includes('Secret Villa') || JSON.stringify(body).includes('123 QA');
    assert(!hasAddressLeak, 'Forbidden BOLA response leaks zero address snapshot data', `Body: ${JSON.stringify(body)}`);
  }

  // 2.6 Malformed & Non-Existent Booking UUID
  {
    const resMalformed = await fetch(`${API_BASE}/providers/me/bookings/invalid-uuid-123`, {
      headers: { Authorization: `Bearer ${provAToken}` },
    });
    assert(resMalformed.status === 400, 'Malformed booking UUID returns HTTP 400', `Got status ${resMalformed.status}`);

    const res404 = await fetch(`${API_BASE}/providers/me/bookings/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${provAToken}` },
    });
    assert(res404.status === 404, 'Non-existent booking UUID returns HTTP 404', `Got status ${res404.status}`);
  }

  // 3. PRIMARY FLOW: ACCEPT JOB
  console.log('\n--- 3. Primary Flow: Provider Accepts Assigned Job ---');
  const acceptBooking = await createTestBooking('ASSIGNED', provA.id);

  // 3.1 Fetch assigned queue
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings?status=ASSIGNED`, {
      headers: { Authorization: `Bearer ${provAToken}` },
    });
    const body = await res.json();
    assert(res.status === 200 && body.success, 'GET /providers/me/bookings?status=ASSIGNED succeeds');
    const found = body.data?.some(b => b.id === acceptBooking.id);
    assert(found, 'Assigned booking appears in Provider A assigned queue');
  }

  // 3.2 Accept job via PATCH /status with { status: "ACCEPTED" }
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${acceptBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    const body = await res.json();
    assert(res.status === 200 && body.success, 'PATCH /status with { status: "ACCEPTED" } returns HTTP 200');
    assert(body.data?.status === 'ACCEPTED', 'Response payload status is ACCEPTED');

    // DB Verification
    const dbBooking = await prisma.booking.findUnique({ where: { id: acceptBooking.id } });
    assert(dbBooking.status === 'ACCEPTED', 'DB booking status updated to ACCEPTED');
    assert(dbBooking.providerId === provA.id, 'DB providerId remains Provider A');

    // Status history check
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: acceptBooking.id } });
    const hasAcceptedHist = history.some(h => h.status === 'ACCEPTED' && h.actorId === provA.id && h.actorRole === 'PROVIDER');
    assert(hasAcceptedHist, 'BookingStatusHistory records ACCEPTED transition by Provider A');
  }

  // 3.3 Re-accepting already ACCEPTED booking is idempotent
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${acceptBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    assert(res.status === 200, 'Duplicate Accept request returns HTTP 200 (idempotent)', `Got status ${res.status}`);
  }

  // 4. MANDATORY SCENARIO TC-003-010: REJECT ASSIGNED BOOKING
  console.log('\n--- 4. TC-003-010: Provider Rejects ASSIGNED Booking ---');
  const rejectBooking = await createTestBooking('ASSIGNED', provA.id);

  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${rejectBooking.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ reason: 'Schedule conflict - unable to reach location' }),
    });
    const body = await res.json();
    assert(res.status === 200 && body.success, 'TC-003-010: Reject ASSIGNED booking returns HTTP 200');

    // Verify DB state
    const dbBooking = await prisma.booking.findUnique({ where: { id: rejectBooking.id } });
    assert(dbBooking.status === 'PENDING', 'TC-003-010: DB booking status reset to PENDING');
    assert(dbBooking.providerId === null, 'TC-003-010: DB providerId reset to NULL');

    // Verify status history
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: rejectBooking.id } });
    const hasRejectedHist = history.some(h => h.status === 'REJECTED' && h.actorId === provA.id && h.actorRole === 'PROVIDER' && h.note.includes('Schedule conflict'));
    assert(hasRejectedHist, 'TC-003-010: BookingStatusHistory records REJECTED with note');

    // Verify former Provider A can no longer access booking or address
    const formerAccessRes = await fetch(`${API_BASE}/providers/me/bookings/${rejectBooking.id}`, {
      headers: { Authorization: `Bearer ${provAToken}` },
    });
    const formerBody = await formerAccessRes.json();
    assert(formerAccessRes.status === 403, 'TC-003-010: Former provider BOLA blocked (HTTP 403)', `Got status ${formerAccessRes.status}`);
    const addressLeaked = JSON.stringify(formerBody).includes('Secret Villa');
    assert(!addressLeaked, 'TC-003-010: No address snapshot data leaked after rejection');
  }

  // 4.1 TEST PATCH /status WITH { "status": "REJECTED" }
  console.log('\n--- 4.1. Verify PATCH /status with { "status": "REJECTED" } ---');
  const rejectStatusBooking = await createTestBooking('ASSIGNED', provA.id);
  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${rejectStatusBooking.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ status: 'REJECTED', reason: 'Reject via status route' }),
    });
    const body = await res.json();
    const dbBooking = await prisma.booking.findUnique({ where: { id: rejectStatusBooking.id } });
    assert(res.status === 200 && dbBooking.status === 'PENDING' && dbBooking.providerId === null, 
      'PATCH /status with { status: "REJECTED" } resets status to PENDING and provider_id to NULL', 
      `Status: ${res.status}, DB Status: ${dbBooking?.status}, providerId: ${dbBooking?.providerId}`);
  }

  // 5. MANDATORY SCENARIO TC-003-011: REJECT ON_THE_WAY BOOKING (CONFLICT 409)
  console.log('\n--- 5. TC-003-011: Provider Attempts to Reject ON_THE_WAY Booking ---');
  const onTheWayBooking = await createTestBooking('ASSIGNED', provA.id);
  
  // Advance to ACCEPTED then ON_THE_WAY
  await prisma.booking.update({ where: { id: onTheWayBooking.id }, data: { status: 'ON_THE_WAY' } });

  {
    const res = await fetch(`${API_BASE}/providers/me/bookings/${onTheWayBooking.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ reason: 'Cancel on the way' }),
    });
    const body = await res.json();
    assert(res.status === 409, 'TC-003-011: Reject ON_THE_WAY booking returns HTTP 409 Conflict', `Got status ${res.status}`);
    assert(body.error?.message?.includes('Invalid status transition') || body.error?.message?.includes('ON_THE_WAY'), 'TC-003-011: Error message indicates invalid transition', `Message: ${body.error?.message}`);

    // Verify DB untouched
    const dbBooking = await prisma.booking.findUnique({ where: { id: onTheWayBooking.id } });
    assert(dbBooking.status === 'ON_THE_WAY', 'TC-003-011: DB booking status remains ON_THE_WAY');
    assert(dbBooking.providerId === provA.id, 'TC-003-011: DB providerId remains Provider A');
  }

  // 6. ACCEPTANCE CRITERIA AC-003-003: INVALID REJECTION TRANSITIONS
  console.log('\n--- 6. AC-003-003: Invalid Rejection State Transitions ---');

  const invalidStates = ['ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED'];
  for (const st of invalidStates) {
    const testB = await createTestBooking('ASSIGNED', provA.id);
    await prisma.booking.update({ where: { id: testB.id }, data: { status: st } });

    const res = await fetch(`${API_BASE}/providers/me/bookings/${testB.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provAToken}`,
      },
      body: JSON.stringify({ reason: `Reject from ${st}` }),
    });
    assert(res.status === 409, `AC-003-003: Reject from status ${st} returns HTTP 409`, `Got status ${res.status}`);

    const dbB = await prisma.booking.findUnique({ where: { id: testB.id } });
    assert(dbB.status === st, `AC-003-003: Status ${st} remains unmodified in DB`);
  }

  // 7. CLEANUP QA TEST DATA
  console.log('\n--- 7. Cleaning up QA Test Data ---');
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking: { customerId: customer.id } },
  });
  await prisma.booking.deleteMany({
    where: { customerId: customer.id },
  });
  await prisma.customer.delete({ where: { id: customer.id } });
  await prisma.provider.deleteMany({
    where: { id: { in: [provA.id, provB.id, provSuspended.id] } },
  });
  console.log('  ✅ QA Test Data Cleaned Up Successfully.');

  // 8. FINAL SUMMARY
  console.log('\n====================================================');
  console.log(`  AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    console.error('\nDEFECTS DETECTED:');
    defects.forEach((d, i) => console.error(` ${i + 1}. ${d.testName}: ${d.failureDetail}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL US-003-004 API & DATABASE ASSERTIONS PASSED!');
    process.exit(0);
  }
}

main()
  .catch((e) => {
    console.error('❌ QA Audit Execution Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
