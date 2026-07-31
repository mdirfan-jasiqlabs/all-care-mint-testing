/**
 * INDEPENDENT QA AUDIT FOR US-003-002: Provider Address Visibility & BOLA Controls
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const API = 'http://localhost:3000';

async function runAudit() {
  console.log('=== RUNNING US-003-002 INDEPENDENT QA AUDIT ===\n');

  const testAuditResults = [];
  function logResult(id, title, status, details, payload) {
    console.log(`[${status}] ${id}: ${title}`);
    if (details) console.log(`   Details: ${details}`);
    if (payload) console.log(`   Payload/Evidence:`, JSON.stringify(payload).substring(0, 300));
    testAuditResults.push({ id, title, status, details, payload });
  }

  let providerAToken = '';
  let providerBToken = '';
  let customerToken = '';
  let adminToken = '';
  let providerA = null;
  let providerB = null;
  let customerUser = null;
  let testBooking = null;

  try {
    // 1. SETUP TEST DATA IN DB
    console.log('--- Step 1: Setting up DB test entities ---');

    // Create / fetch Provider A
    providerA = await prisma.provider.upsert({
      where: { mobileNumber: '+919900000001' },
      update: { status: 'APPROVED' },
      create: {
        mobileNumber: '+919900000001',
        displayName: 'Provider Alpha QA',
        status: 'APPROVED',
        serviceArea: 'Bengaluru'
      }
    });

    // Create / fetch Provider B
    providerB = await prisma.provider.upsert({
      where: { mobileNumber: '+919900000002' },
      update: { status: 'APPROVED' },
      create: {
        mobileNumber: '+919900000002',
        displayName: 'Provider Beta QA',
        status: 'APPROVED',
        serviceArea: 'Bengaluru'
      }
    });

    // Customer
    customerUser = await prisma.customer.upsert({
      where: { mobileNumber: '+919900000009' },
      update: {},
      create: {
        mobileNumber: '+919900000009',
        displayName: 'Customer QA User'
      }
    });

    // Category & Service
    let category = await prisma.serviceCategory.findFirst();
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: 'QA Category ' + Date.now(),
          description: 'Category for QA'
        }
      });
    }

    let service = await prisma.service.findFirst({ where: { categoryId: category.id } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          categoryId: category.id,
          name: 'QA Deep Cleaning',
          fixedPrice: 500
        }
      });
    }

    // Address Snapshot data
    const addressSnapshot = {
      label: 'Home',
      addressLine1: '123 QA Secret Boulevard',
      addressLine2: 'Apt 4B',
      city: 'Bengaluru',
      pincode: '560001',
      latitude: 12.9716,
      longitude: 77.5946
    };

    // Booking assigned ONLY to Provider B
    testBooking = await prisma.booking.create({
      data: {
        bookingReference: 'QA' + Date.now().toString().slice(-8),
        customerId: customerUser.id,
        providerId: providerB.id, // Assigned to Provider B
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: 500,
        status: 'ASSIGNED',
        slotDate: new Date('2026-08-01'),
        slotLabelSnapshot: '10:00 AM - 11:00 AM',
        addressSnapshot: addressSnapshot,
        paymentMethod: 'CASH_ON_SERVICE',
        idempotencyKey: crypto.randomUUID()
      }
    });

    console.log(`Created test booking ${testBooking.id} assigned to Provider B (${providerB.id})\n`);

    // 2. GET AUTH TOKENS
    // Provider A token via OTP
    await fetch(`${API}/api/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000001', role: 'PROVIDER' })
    });
    const resAuthA = await fetch(`${API}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000001', otp: '123456', role: 'PROVIDER' })
    });
    const bodyAuthA = await resAuthA.json();
    providerAToken = bodyAuthA.data.accessToken;

    // Provider B token via OTP
    await fetch(`${API}/api/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000002', role: 'PROVIDER' })
    });
    const resAuthB = await fetch(`${API}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000002', otp: '123456', role: 'PROVIDER' })
    });
    const bodyAuthB = await resAuthB.json();
    providerBToken = bodyAuthB.data.accessToken;

    // Customer token
    await fetch(`${API}/api/v1/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000009', role: 'CUSTOMER' })
    });
    const resAuthCust = await fetch(`${API}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9900000009', otp: '123456', role: 'CUSTOMER' })
    });
    const bodyAuthCust = await resAuthCust.json();
    customerToken = bodyAuthCust.data.accessToken;

    // Admin token
    const resAuthAdmin = await fetch(`${API}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allcaremint.com', password: 'AdminPassword123!' })
    });
    const bodyAuthAdmin = await resAuthAdmin.json();
    if (bodyAuthAdmin.success && bodyAuthAdmin.data) {
      adminToken = bodyAuthAdmin.data.accessToken;
    }

    // 3. EXECUTE TEST SCENARIOS

    // --- TC-003-004: Provider A requests booking assigned to Provider B ---
    const res403 = await fetch(`${API}/api/v1/providers/me/bookings/${testBooking.id}`, {
      headers: { Authorization: `Bearer ${providerAToken}` }
    });
    const body403 = await res403.json();
    const str403 = JSON.stringify(body403);
    const has403Status = res403.status === 403;
    const hasAccessDenied = body403.error?.message === 'Access denied.';
    const noAddressLeak = !str403.includes('address_snapshot') && !str403.includes('123 QA Secret') && !str403.includes('560001');

    if (has403Status && hasAccessDenied && noAddressLeak) {
      logResult('TC-003-004', 'Provider A requests Provider B booking → 403 forbidden without address leak', 'PASS', 'Got 403 Access denied and zero sensitive address data in response', body403);
    } else {
      logResult('TC-003-004', 'Provider A requests Provider B booking', 'FAIL', `status=${res403.status}, msg=${body403.error?.message}, noLeak=${noAddressLeak}`, body403);
    }

    // --- TC-003-005: Provider B requests their own assigned booking ---
    const res200 = await fetch(`${API}/api/v1/providers/me/bookings/${testBooking.id}`, {
      headers: { Authorization: `Bearer ${providerBToken}` }
    });
    const body200 = await res200.json();
    const has200Status = res200.status === 200;
    const addressSnap = body200.data?.addressSnapshot;
    const hasAddressSnapshot = addressSnap &&
                              addressSnap.addressLine1 === '123 QA Secret Boulevard' &&
                              addressSnap.city === 'Bengaluru' &&
                              addressSnap.pincode === '560001';

    if (has200Status && hasAddressSnapshot) {
      logResult('TC-003-005', 'Provider B requests own booking → 200 with full address_snapshot', 'PASS', 'Got 200 and complete address_snapshot matching DB snapshot', addressSnap);
    } else {
      logResult('TC-003-005', 'Provider B requests own booking', 'FAIL', `status=${res200.status}, addressMatch=${hasAddressSnapshot}`, body200);
    }

    // --- TC-003-006: Admin suspends provider → OTP login returns 403 ERR_PROVIDER_SUSPENDED ---
    if (adminToken) {
      // Suspend Provider A
      const resSuspend = await fetch(`${API}/api/v1/admin/providers/${providerA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'SUSPENDED' })
      });
      const bodySuspend = await resSuspend.json();

      // Now Provider A attempts OTP login
      await fetch(`${API}/api/v1/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: '9900000001', role: 'PROVIDER' })
      });
      const resSuspendedLogin = await fetch(`${API}/api/v1/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: '9900000001', otp: '123456', role: 'PROVIDER' })
      });
      const bodySuspendedLogin = await resSuspendedLogin.json();

      const is403Suspended = resSuspendedLogin.status === 403 &&
                             bodySuspendedLogin.error?.code === 'ERR_PROVIDER_SUSPENDED' &&
                             bodySuspendedLogin.error?.message === 'Account suspended.';

      if (is403Suspended) {
        logResult('TC-003-006', 'Suspended Provider OTP Login → 403 ERR_PROVIDER_SUSPENDED', 'PASS', 'Account suspended correctly blocks OTP login', bodySuspendedLogin);
      } else {
        logResult('TC-003-006', 'Suspended Provider OTP Login', 'FAIL', `status=${resSuspendedLogin.status}, code=${bodySuspendedLogin.error?.code}`, bodySuspendedLogin);
      }

      // Test old token of suspended provider against protected endpoint
      const resOldToken = await fetch(`${API}/api/v1/providers/me/bookings/${testBooking.id}`, {
        headers: { Authorization: `Bearer ${providerAToken}` }
      });
      logResult('ADDITIONAL-SUSPENDED-TOKEN', 'Old token of suspended provider on API', resOldToken.status === 403 ? 'PASS' : 'WARNING', `Got HTTP ${resOldToken.status}`);
    } else {
      logResult('TC-003-006', 'Admin suspends provider', 'FAIL', 'Could not obtain admin token for test');
    }

    // --- ADDITIONAL AUTHORIZATION TESTS ---

    // 1. Missing JWT → 401
    const resNoToken = await fetch(`${API}/api/v1/providers/me/bookings/${testBooking.id}`);
    logResult('AUTH-001', 'Missing JWT header → 401', resNoToken.status === 401 ? 'PASS' : 'FAIL', `Got HTTP ${resNoToken.status}`);

    // 2. Customer JWT on Provider Endpoint → 403
    const resCustToken = await fetch(`${API}/api/v1/providers/me/bookings/${testBooking.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    logResult('AUTH-002', 'Customer JWT on provider endpoint → 403', resCustToken.status === 403 ? 'PASS' : 'FAIL', `Got HTTP ${resCustToken.status}`);

    // 3. Invalid booking UUID format → 400 (or controlled error)
    const resBadUuid = await fetch(`${API}/api/v1/providers/me/bookings/not-a-valid-uuid`, {
      headers: { Authorization: `Bearer ${providerBToken}` }
    });
    logResult('AUTH-003', 'Invalid booking UUID format → 400/404', (resBadUuid.status === 400 || resBadUuid.status === 404) ? 'PASS' : 'FAIL', `Got HTTP ${resBadUuid.status}`);

    // 4. Non-existent booking UUID → 404
    const resMissingUuid = await fetch(`${API}/api/v1/providers/me/bookings/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${providerBToken}` }
    });
    logResult('AUTH-004', 'Non-existent booking UUID → 404', resMissingUuid.status === 404 ? 'PASS' : 'FAIL', `Got HTTP ${resMissingUuid.status}`);

  } catch (err) {
    console.error('ERROR during QA audit run:', err);
  } finally {
    // CLEANUP QA DATA
    console.log('\n--- Step 4: Cleaning up QA test entities ---');
    if (testBooking) {
      await prisma.booking.deleteMany({ where: { id: testBooking.id } });
    }
    if (providerA) {
      await prisma.provider.deleteMany({ where: { id: providerA.id } });
    }
    if (providerB) {
      await prisma.provider.deleteMany({ where: { id: providerB.id } });
    }
    if (customerUser) {
      await prisma.customer.deleteMany({ where: { id: customerUser.id } });
    }
    await prisma.$disconnect();
    console.log('Cleanup completed successfully.\n');
  }
}

runAudit();
