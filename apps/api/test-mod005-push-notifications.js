const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { ...options, headers, body });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on ${path}: ${JSON.stringify(json)}`);
  }
  return json;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function run() {
  console.log('🚀 Starting MOD-005 Push Notifications Integration Test Suite...');

  try {
    // 1. Authenticate Roles
    console.log('\n--- 1. Authenticating Roles ---');
    const customerAuth = await fetchJson('/api/v1/auth/customer/verify-otp', {
      method: 'POST',
      body: { firebaseToken: 'mock-token-customer', role: 'CUSTOMER' },
    });
    const customerToken = customerAuth.data.accessToken;
    console.log(`✅ Customer Authenticated.`);

    const providerAuth = await fetchJson('/api/v1/auth/provider/verify-otp', {
      method: 'POST',
      body: { firebaseToken: 'mock-token-provider', role: 'PROVIDER' },
    });
    const providerToken = providerAuth.data.accessToken;
    console.log(`✅ Provider Authenticated.`);

    const adminAuth = await fetchJson('/api/v1/auth/admin/login', {
      method: 'POST',
      body: { email: 'admin@allcaremint.com', password: 'Admin@123' },
    });
    const adminToken = adminAuth.data.accessToken;
    console.log(`✅ Admin Authenticated.`);

    // 2. US-005-002: Token Registration Backend Tests
    console.log('\n--- 2. FCM Token Registration (US-005-002) ---');

    // Register Customer Device Token
    const device1Res = await fetchJson('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: {
        fcmToken: 'fcm_token_cust_device_1',
        deviceId: 'device_cust_001',
        userRole: 'CUSTOMER',
      },
    });
    console.log('✅ Customer Device 1 Registered:', device1Res.data);

    // Upsert Same Device ID with Updated Token
    const device1UpdateRes = await fetchJson('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: {
        fcmToken: 'fcm_token_cust_device_1_updated',
        deviceId: 'device_cust_001',
        userRole: 'CUSTOMER',
      },
    });
    console.log('✅ Customer Device 1 Token Upserted:', device1UpdateRes.data);

    // Register Second Device ID (Multi-Device Support)
    const device2Res = await fetchJson('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(customerToken),
      body: {
        fcmToken: 'fcm_token_cust_device_2',
        deviceId: 'device_cust_002',
        userRole: 'CUSTOMER',
      },
    });
    console.log('✅ Customer Device 2 Registered (Multi-device):', device2Res.data);

    // Revoke Device 2 Token
    const revokeRes = await fetchJson('/api/v1/notifications/device-tokens/device_cust_002', {
      method: 'DELETE',
      headers: authHeader(customerToken),
    });
    console.log('✅ Customer Device 2 Revoked:', revokeRes.message);

    // 3. US-005-004: Public Provider Lead Submission & Admin Badge In-Panel Alert
    console.log('\n--- 3. Public Provider Lead Submission & Admin Badge Alert (US-005-004) ---');

    // Public Lead Submission
    const leadSubmitRes = await fetchJson('/api/v1/provider-leads', {
      method: 'POST',
      body: {
        name: 'Integration Test Lead',
        mobileNumber: '9876543210',
        serviceArea: 'Indiranagar, Bengaluru',
      },
    });
    console.log('✅ Public Provider Lead Submitted:', leadSubmitRes.data);

    // Check Badge Counts
    const badgeCountsBefore = await fetchJson('/api/v1/admin/notifications/badge-counts', {
      headers: authHeader(adminToken),
    });
    console.log('✅ Admin Badge Counts Initial:', badgeCountsBefore.data);

    // Fetch Admin Provider Leads Review Listing
    const leadsList = await fetchJson('/api/v1/admin/notifications/provider-leads?status=UNACKNOWLEDGED', {
      headers: authHeader(adminToken),
    });
    console.log(`✅ Admin Review Screen Leads Count: ${leadsList.total}`);

    // Mark Leads Read
    const markReadRes = await fetchJson('/api/v1/admin/notifications/provider-leads/read', {
      method: 'PATCH',
      headers: authHeader(adminToken),
    });
    console.log('✅ Admin Leads Marked Read:', markReadRes.message);

    // Check Badge Counts After Reset
    const badgeCountsAfter = await fetchJson('/api/v1/admin/notifications/badge-counts', {
      headers: authHeader(adminToken),
    });
    console.log('✅ Admin Badge Counts After Reset:', badgeCountsAfter.data);

    console.log('\n🎉 ALL MOD-005 TEST SCENARIOS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ MOD-005 Test Failed:', error);
    process.exit(1);
  }
}

run();
