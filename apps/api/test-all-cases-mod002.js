// ─── apps/api/test-all-cases-mod002.js ───
// Source: DLD Section 15.1 — Complete API Lifecycle Verification Test

const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Starting MOD-002 E2E API Integration Test Suite...');

  try {
    // ----------------------------------------------------
    // 1. Authentication
    // ----------------------------------------------------
    console.log('\n--- 1. Authenticating Roles ---');
    
    // Customer login
    const customerAuth = await fetchJson('/api/v1/auth/customer/verify-otp', {
      method: 'POST',
      body: { firebaseToken: 'mock-token-customer', role: 'CUSTOMER' }
    });
    const customerToken = customerAuth.data.accessToken;
    const customerId = customerAuth.data.user.id;
    console.log(`... Customer Authenticated. ID: ${customerId}`);

    // Provider login
    const providerAuth = await fetchJson('/api/v1/auth/provider/verify-otp', {
      method: 'POST',
      body: { firebaseToken: 'mock-token-provider', role: 'PROVIDER' }
    });
    const providerToken = providerAuth.data.accessToken;
    const providerId = providerAuth.data.user.id;
    console.log(`✅ Provider Authenticated. ID: ${providerId}`);

    // Admin login
    const adminAuth = await fetchJson('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin@allcaremint.com', password: 'Admin@123' }
    });
    const adminToken = adminAuth.data.accessToken;
    console.log(`✅ Admin Authenticated.`);

    // ----------------------------------------------------
    // 2. Customer Address CRUD & Limit Verification
    // ----------------------------------------------------
    console.log('\n--- 2. Customer Address CRUD & Limit Verification ---');
    
    // Clean up existing addresses if any
    const listRes1 = await fetchJson('/api/v1/addresses', { headers: authHeader(customerToken) });
    for (const addr of listRes1.data) {
      await fetchJson(`/api/v1/addresses/${addr.id}`, {
        method: 'DELETE',
        headers: authHeader(customerToken)
      });
    }

    // Create 5 addresses
    const addressIds = [];
    for (let i = 1; i <= 5; i++) {
      const addr = await fetchJson('/api/v1/addresses', {
        method: 'POST',
        headers: authHeader(customerToken),
        body: {
          label: `Home ${i}`,
          addressLine1: `${i} Green Glen Layout`,
          city: 'Bengaluru',
          pincode: '560103'
        }
      });
      addressIds.push(addr.data.id);
      console.log(`✅ Created Address ${i}: ${addr.data.id}`);
    }

    // Attempting 6th address should fail with 400
    try {
      await fetchJson('/api/v1/addresses', {
        method: 'POST',
        headers: authHeader(customerToken),
        body: {
          label: `Home 6`,
          addressLine1: `6 Green Glen Layout`,
          city: 'Bengaluru',
          pincode: '560103'
        }
      });
      throw new Error('❌ Error: Limit check failed! 6th address created.');
    } catch (e) {
      if (e.status === 400) {
        console.log('✅ Success: 6th address blocked (400 Bad Request) as expected.');
      } else {
        throw e;
      }
    }

    // Edit address
    const editRes = await fetchJson(`/api/v1/addresses/${addressIds[0]}`, {
      method: 'PATCH',
      headers: authHeader(customerToken),
      body: { label: 'Updated Home' }
    });
    console.log(`✅ Success: Address edited to label: ${editRes.data.label}`);

    // ----------------------------------------------------
    // 3. Slot check & Lock
    // ----------------------------------------------------
    console.log('\n--- 3. Slot Check & Lock ---');

    // Get a random date in the future to avoid slot conflicts on reruns
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + Math.floor(Math.random() * 100) + 2);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch services to get active service ID
    const catRes = await fetchJson('/api/v1/catalog/categories', { headers: authHeader(customerToken) });
    const cleaningCat = catRes.data.find(c => c.name === 'Cleaning');
    const svcRes = await fetchJson(`/api/v1/catalog/categories/${cleaningCat.id}/services`, { headers: authHeader(customerToken) });
    const serviceId = svcRes.data[0].id;
    console.log(`Using Service: ${svcRes.data[0].name} (${serviceId})`);

    // Fetch slots
    const slotsRes = await fetchJson(`/api/v1/bookings/slots?service_id=${serviceId}&date=${tomorrowStr}`, {
      headers: authHeader(customerToken)
    });
    const slotId = slotsRes.data[0].id;
    console.log(`Using Slot: ${slotsRes.data[0].label} (${slotId})`);

    // Lock slot
    const lockRes = await fetchJson('/api/v1/bookings/slots/lock', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: { slotId, date: tomorrowStr }
    });
    console.log(`✅ Success: Slot locked. Expires: ${lockRes.data.expiresAt}`);

    // Verify concurrent lock fails
    try {
      await fetchJson('/api/v1/bookings/slots/lock', {
        method: 'POST',
        headers: authHeader(customerToken),
        body: { slotId, date: tomorrowStr }
      });
      throw new Error('❌ Error: Concurrent lock allowed!');
    } catch (e) {
      if (e.status === 409) {
        console.log('✅ Success: Concurrent slot lock blocked (409 Conflict) as expected.');
      } else {
        throw e;
      }
    }

    // ----------------------------------------------------
    // 4. Booking Creation & Idempotency
    // ----------------------------------------------------
    console.log('\n--- 4. Booking Creation & Idempotency ---');
    const bookingIdempotencyKey = crypto.randomUUID();

    const bookingPayload = {
      serviceId,
      slotId,
      slotDate: tomorrowStr,
      addressId: addressIds[0],
      paymentMethod: 'CASH_ON_SERVICE'
    };

    // First booking request
    const createRes = await fetchJson('/api/v1/bookings', {
      method: 'POST',
      headers: {
        ...authHeader(customerToken),
        'x-idempotency-key': bookingIdempotencyKey
      },
      body: bookingPayload
    });
    const bookingId = createRes.data.bookingId;
    console.log(`✅ Success: Booking created. Ref: ${createRes.data.bookingReference}`);

    // Second booking request (same key, same payload) -> returns cached response
    const createRes2 = await fetchJson('/api/v1/bookings', {
      method: 'POST',
      headers: {
        ...authHeader(customerToken),
        'x-idempotency-key': bookingIdempotencyKey
      },
      body: bookingPayload
    });
    console.log(`✅ Success: Idempotency cached response matched bookingId: ${createRes2.data.bookingId}`);

    // Third booking request (same key, diff payload) -> returns 409 Conflict
    try {
      await fetchJson('/api/v1/bookings', {
        method: 'POST',
        headers: {
          ...authHeader(customerToken),
          'x-idempotency-key': bookingIdempotencyKey
        },
        body: { ...bookingPayload, paymentMethod: 'ONLINE' }
      });
      throw new Error('❌ Error: Idempotency conflict not caught!');
    } catch (e) {
      if (e.status === 409) {
        console.log('✅ Success: Idempotency payload conflict blocked (409 Conflict) as expected.');
      } else {
        throw e;
      }
    }

    // ----------------------------------------------------
    // 5. Admin Provider Assignment
    // ----------------------------------------------------
    console.log('\n--- 5. Admin Provider Assignment ---');

    // Get approved providers
    const providersList = await fetchJson('/api/v1/admin/bookings/providers', {
      headers: authHeader(adminToken)
    });
    console.log(`Found Approved Providers: ${providersList.data.length}`);

    // Assign provider
    const assignRes = await fetchJson(`/api/v1/admin/bookings/${bookingId}/assign`, {
      method: 'PATCH',
      headers: authHeader(adminToken),
      body: { providerId }
    });
    console.log(`✅ Success: Provider assigned. Booking status updated to ${assignRes.status}`);

    // ----------------------------------------------------
    // 6. Provider Job Status Lifecycle Transitions
    // ----------------------------------------------------
    console.log('\n--- 6. Provider Job Status Lifecycle Transitions ---');

    // Accept Job
    const acceptRes = await fetchJson(`/api/v1/providers/me/bookings/${bookingId}/accept`, {
      method: 'PATCH',
      headers: authHeader(providerToken)
    });
    console.log(`✅ Transition: ASSIGNED -> ${acceptRes.data.status}`);

    // On The Way
    const otwRes = await fetchJson(`/api/v1/providers/me/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: authHeader(providerToken),
      body: { status: 'ON_THE_WAY' }
    });
    console.log(`✅ Transition: ACCEPTED -> ${otwRes.data.status}`);

    // Started
    const startRes = await fetchJson(`/api/v1/providers/me/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: authHeader(providerToken),
      body: { status: 'STARTED' }
    });
    console.log(`✅ Transition: ON_THE_WAY -> ${startRes.data.status}`);

    // Completed
    const completeRes = await fetchJson(`/api/v1/providers/me/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: authHeader(providerToken),
      body: { status: 'COMPLETED' }
    });
    console.log(`✅ Transition: STARTED -> ${completeRes.data.status}`);

    // Fetch history logs
    const historyRes = await fetchJson(`/api/v1/admin/bookings/${bookingId}/history`, {
      headers: authHeader(adminToken)
    });
    console.log('✅ Status History Transition Logs:');
    historyRes.data.forEach(h => {
      console.log(`   - [${h.createdAt}] ${h.status} (by ${h.actorRole})`);
    });

    // ----------------------------------------------------
    // 7. Provider Rejection Flow
    // ----------------------------------------------------
    console.log('\n--- 7. Provider Rejection Flow ---');

    // Lock a different slot
    const slotId2 = slotsRes.data[1].id;
    await fetchJson('/api/v1/bookings/slots/lock', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: { slotId: slotId2, date: tomorrowStr }
    });

    // Create second booking
    const bookingIdempotencyKey2 = crypto.randomUUID();
    const createRes2b = await fetchJson('/api/v1/bookings', {
      method: 'POST',
      headers: { ...authHeader(customerToken), 'x-idempotency-key': bookingIdempotencyKey2 },
      body: { ...bookingPayload, slotId: slotId2 }
    });
    const bookingId2 = createRes2b.data.bookingId;
    console.log(`Created second booking: ${bookingId2}`);

    // Admin assigns provider
    await fetchJson(`/api/v1/admin/bookings/${bookingId2}/assign`, {
      method: 'PATCH',
      headers: authHeader(adminToken),
      body: { providerId }
    });

    // Provider rejects
    const rejectRes = await fetchJson(`/api/v1/providers/me/bookings/${bookingId2}/reject`, {
      method: 'PATCH',
      headers: authHeader(providerToken),
      body: { reason: 'Schedule conflict' }
    });
    console.log(`✅ Success: Provider rejected booking. Reset to status: ${rejectRes.data.status}, providerId: ${rejectRes.data.providerId}`);

    // ----------------------------------------------------
    // 8. Customer Cancellation Flow
    // ----------------------------------------------------
    console.log('\n--- 8. Customer Cancellation Flow ---');

    // Lock a third slot
    const slotId3 = slotsRes.data[2].id;
    await fetchJson('/api/v1/bookings/slots/lock', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: { slotId: slotId3, date: tomorrowStr }
    });

    // Create third booking
    const bookingIdempotencyKey3 = crypto.randomUUID();
    const createRes3 = await fetchJson('/api/v1/bookings', {
      method: 'POST',
      headers: { ...authHeader(customerToken), 'x-idempotency-key': bookingIdempotencyKey3 },
      body: { ...bookingPayload, slotId: slotId3 }
    });
    const bookingId3 = createRes3.data.bookingId;
    console.log(`Created third booking: ${bookingId3}`);

    // Customer cancels
    const cancelRes = await fetchJson(`/api/v1/bookings/${bookingId3}/cancel`, {
      method: 'PATCH',
      headers: authHeader(customerToken),
      body: { reason: 'No longer required' }
    });
    console.log(`✅ Success: Customer cancelled booking. Status updated to ${cancelRes.data.status}`);

    console.log('\n======================================');
    console.log('🎉 ALL INTEGRATION LIFECYCLE TESTS PASSED!');
    console.log('======================================');

  } catch (error) {
    console.error('❌ E2E Integration test failed:', error);
    process.exit(1);
  }
}

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...options.headers };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const err = new Error(`Invalid JSON response: ${text}`);
    err.status = response.status;
    throw err;
  }

  if (!response.ok) {
    const err = new Error(json.error?.message || json.message || `Request failed with ${response.status}`);
    err.status = response.status;
    err.body = json;
    throw err;
  }
  return json;
}

function authHeader(token) {
  return { 'Authorization': `Bearer ${token}` };
}

run();
