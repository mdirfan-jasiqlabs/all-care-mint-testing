const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

// Masking helpers
function maskJwt(token) {
  if (!token) return 'null';
  if (token.length <= 16) return token.slice(0, 4) + '...' + token.slice(-4);
  return token.slice(0, 8) + '...' + token.slice(-8);
}

function maskToken(token) {
  if (!token) return 'null';
  if (token.length <= 10) return token.slice(0, 3) + '***';
  return token.slice(0, 6) + '...' + token.slice(-4);
}

async function fetchApi(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
  }
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const res = await fetch(url, { ...options, headers, body });
  const json = await res.json().catch(() => null);

  return {
    status: res.status,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries()),
    body: json,
  };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log('================================================================');
  console.log('  JASIQ INDEPENDENT QA AUDIT: US-005-002 FCM TOKEN REGISTRATION ');
  console.log('================================================================\n');

  const results = {
    apiContract: [],
    identityBinding: [],
    dbSchema: [],
    repositoryUpsert: [],
    tc005004: null,
    tc005005: null,
    crossUser: [],
    revocation: [],
    dispatchLookup: [],
    concurrency: null,
    cleanup: null,
  };

  try {
    // -------------------------------------------------------------
    // Setup QA Test Users & Tokens
    // -------------------------------------------------------------
    console.log('--- 0. Setting up QA Test Users & JWTs ---');

    // Create Customer 1
    const cust1Mobile = '+919999005001';
    let cust1 = await prisma.customer.findUnique({ where: { mobileNumber: cust1Mobile } });
    if (!cust1) {
      cust1 = await prisma.customer.create({
        data: {
          mobileNumber: cust1Mobile,
          displayName: 'QA Audit Customer 1',
          firebaseUid: 'qa-uid-cust-1',
        },
      });
    }

    // Create Customer 2
    const cust2Mobile = '+919999005002';
    let cust2 = await prisma.customer.findUnique({ where: { mobileNumber: cust2Mobile } });
    if (!cust2) {
      cust2 = await prisma.customer.create({
        data: {
          mobileNumber: cust2Mobile,
          displayName: 'QA Audit Customer 2',
          firebaseUid: 'qa-uid-cust-2',
        },
      });
    }

    // Create Provider 1
    const prov1Mobile = '+919999005003';
    let prov1 = await prisma.provider.findUnique({ where: { mobileNumber: prov1Mobile } });
    if (!prov1) {
      prov1 = await prisma.provider.create({
        data: {
          mobileNumber: prov1Mobile,
          displayName: 'QA Audit Provider 1',
          firebaseUid: 'qa-uid-prov-1',
          status: 'APPROVED',
          serviceArea: 'Kochi',
        },
      });
    }

    // Generate real JWT tokens using JWT_PRIVATE_KEY
    const privateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    const cust1Jwt = jwt.sign({ sub: cust1.id, role: 'CUSTOMER' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    const cust2Jwt = jwt.sign({ sub: cust2.id, role: 'CUSTOMER' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    const prov1Jwt = jwt.sign({ sub: prov1.id, role: 'PROVIDER' }, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });

    console.log(`Cust 1 ID: ${cust1.id} | JWT: ${maskJwt(cust1Jwt)}`);
    console.log(`Cust 2 ID: ${cust2.id} | JWT: ${maskJwt(cust2Jwt)}`);
    console.log(`Prov 1 ID: ${prov1.id} | JWT: ${maskJwt(prov1Jwt)}`);

    // Clean up any stale QA tokens before starting test suites
    await prisma.pushToken.deleteMany({
      where: {
        userId: { in: [cust1.id, cust2.id, prov1.id] },
      },
    });

    // -------------------------------------------------------------
    // Section 1: API Contract Verification
    // -------------------------------------------------------------
    console.log('\n--- 1. API Contract Verification ---');

    // 1.1 Customer JWT + valid snake_case payload
    const res1_1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_cust1_dev1',
        device_id: 'qa_device_cust1_1',
        platform: 'ANDROID',
      },
    });
    console.log(`1.1 Customer snake_case payload: Status ${res1_1.status}`);
    results.apiContract.push({ test: '1.1 Customer snake_case payload', status: res1_1.status, body: res1_1.body });

    // 1.2 Provider JWT + valid payload
    const res1_2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(prov1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_prov1_dev1',
        device_id: 'qa_device_prov1_1',
        platform: 'ANDROID',
      },
    });
    console.log(`1.2 Provider valid payload: Status ${res1_2.status}`);
    results.apiContract.push({ test: '1.2 Provider valid payload', status: res1_2.status, body: res1_2.body });

    // 1.3 Missing JWT
    const res1_3 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      body: {
        fcm_token: 'qa_fcm_no_auth',
        device_id: 'qa_device_no_auth',
        platform: 'ANDROID',
      },
    });
    console.log(`1.3 Missing JWT: Status ${res1_3.status}`);
    results.apiContract.push({ test: '1.3 Missing JWT', status: res1_3.status, body: res1_3.body });

    // 1.4 Malformed JWT
    const res1_4 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader('invalid-malformed-jwt-string'),
      body: {
        fcm_token: 'qa_fcm_bad_jwt',
        device_id: 'qa_device_bad_jwt',
        platform: 'ANDROID',
      },
    });
    console.log(`1.4 Malformed JWT: Status ${res1_4.status}`);
    results.apiContract.push({ test: '1.4 Malformed JWT', status: res1_4.status, body: res1_4.body });

    // 1.5 Missing fcm_token
    const res1_5 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        device_id: 'qa_device_missing_token',
        platform: 'ANDROID',
      },
    });
    console.log(`1.5 Missing fcm_token: Status ${res1_5.status}`);
    results.apiContract.push({ test: '1.5 Missing fcm_token', status: res1_5.status, body: res1_5.body });

    // 1.6 Empty fcm_token
    const res1_6 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: '',
        device_id: 'qa_device_empty_token',
        platform: 'ANDROID',
      },
    });
    console.log(`1.6 Empty fcm_token: Status ${res1_6.status}`);
    results.apiContract.push({ test: '1.6 Empty fcm_token', status: res1_6.status, body: res1_6.body });

    // 1.7 Missing device_id
    const res1_7 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_missing_device',
        platform: 'ANDROID',
      },
    });
    console.log(`1.7 Missing device_id: Status ${res1_7.status}`);
    results.apiContract.push({ test: '1.7 Missing device_id', status: res1_7.status, body: res1_7.body });

    // 1.8 Empty device_id
    const res1_8 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_empty_device',
        device_id: '',
        platform: 'ANDROID',
      },
    });
    console.log(`1.8 Empty device_id: Status ${res1_8.status}`);
    results.apiContract.push({ test: '1.8 Empty device_id', status: res1_8.status, body: res1_8.body });

    // 1.9 Missing platform
    const res1_9 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_no_platform',
        device_id: 'qa_device_no_platform',
      },
    });
    console.log(`1.9 Missing platform: Status ${res1_9.status}`);
    results.apiContract.push({ test: '1.9 Missing platform', status: res1_9.status, body: res1_9.body });

    // 1.10 Unsupported platform ("IOS")
    const res1_10 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_ios',
        device_id: 'qa_device_ios',
        platform: 'IOS',
      },
    });
    console.log(`1.10 Unsupported platform (IOS): Status ${res1_10.status}`);
    results.apiContract.push({ test: '1.10 Unsupported platform (IOS)', status: res1_10.status, body: res1_10.body });

    // 1.11 Extra unknown fields
    const res1_11 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_extra',
        device_id: 'qa_device_extra',
        platform: 'ANDROID',
        unknown_field: 'unauthorized_payload',
      },
    });
    console.log(`1.11 Unknown extra fields: Status ${res1_11.status}`);
    results.apiContract.push({ test: '1.11 Unknown extra fields', status: res1_11.status, body: res1_11.body });

    // 1.12 camelCase compatibility test
    const res1_12 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcmToken: 'qa_fcm_token_camel_case',
        deviceId: 'qa_device_camel_case',
        userRole: 'CUSTOMER',
      },
    });
    console.log(`1.12 camelCase payload: Status ${res1_12.status}`);
    results.apiContract.push({ test: '1.12 camelCase payload', status: res1_12.status, body: res1_12.body });

    // -------------------------------------------------------------
    // Section 2: Authentication and Identity Binding
    // -------------------------------------------------------------
    console.log('\n--- 2. Authentication and Identity Binding ---');

    // 2.1 Customer supplying userRole="PROVIDER" in request body
    const devIdCustOverride = 'qa_device_cust_override_role';
    const res2_1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_cust_override_role',
        device_id: devIdCustOverride,
        platform: 'ANDROID',
        userRole: 'PROVIDER',
      },
    });
    console.log(`2.1 Customer sending userRole="PROVIDER": Status ${res2_1.status}`);
    const row2_1 = await prisma.pushToken.findFirst({ where: { deviceId: devIdCustOverride } });
    console.log(`2.1 DB Record user_id: ${row2_1?.userId} | user_role: ${row2_1?.userRole}`);
    results.identityBinding.push({
      test: 'Customer sending userRole="PROVIDER"',
      status: res2_1.status,
      persistedUserId: row2_1?.userId,
      persistedUserRole: row2_1?.userRole,
      jwtUserId: cust1.id,
      jwtRole: 'CUSTOMER',
    });

    // 2.2 Provider supplying userRole="CUSTOMER" in request body
    const devIdProvOverride = 'qa_device_prov_override_role';
    const res2_2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(prov1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_prov_override_role',
        device_id: devIdProvOverride,
        platform: 'ANDROID',
        userRole: 'CUSTOMER',
      },
    });
    console.log(`2.2 Provider sending userRole="CUSTOMER": Status ${res2_2.status}`);
    const row2_2 = await prisma.pushToken.findFirst({ where: { deviceId: devIdProvOverride } });
    console.log(`2.2 DB Record user_id: ${row2_2?.userId} | user_role: ${row2_2?.userRole}`);
    results.identityBinding.push({
      test: 'Provider sending userRole="CUSTOMER"',
      status: res2_2.status,
      persistedUserId: row2_2?.userId,
      persistedUserRole: row2_2?.userRole,
      jwtUserId: prov1.id,
      jwtRole: 'PROVIDER',
    });

    // 2.3 Client-supplied user_id in body
    const devIdCustFakeUser = 'qa_device_cust_fake_user';
    const res2_3 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_fcm_token_cust_fake_user',
        device_id: devIdCustFakeUser,
        platform: 'ANDROID',
        user_id: cust2.id, // Trying to force Customer 2's ID
      },
    });
    console.log(`2.3 Customer sending client user_id in body: Status ${res2_3.status}`);
    const row2_3 = await prisma.pushToken.findFirst({ where: { deviceId: devIdCustFakeUser } });
    console.log(`2.3 DB Record user_id: ${row2_3?.userId} (expected: ${cust1.id})`);
    results.identityBinding.push({
      test: 'Customer sending user_id in body',
      status: res2_3.status,
      persistedUserId: row2_3?.userId,
      jwtUserId: cust1.id,
    });

    // -------------------------------------------------------------
    // Section 3: Database Schema & Migration Verification
    // -------------------------------------------------------------
    console.log('\n--- 3. Database Schema Verification ---');
    const tableColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'push_tokens'
      ORDER BY ordinal_position;
    `;
    console.log('Columns in push_tokens table:');
    console.table(tableColumns);

    const tableIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'push_tokens';
    `;
    console.log('Indexes on push_tokens table:');
    console.table(tableIndexes);

    results.dbSchema = {
      columns: tableColumns,
      indexes: tableIndexes,
      hasPlatformColumn: tableColumns.some((c) => c.column_name === 'platform'),
    };

    // -------------------------------------------------------------
    // Section 5: TC-005-004 — Same Device Token Update
    // -------------------------------------------------------------
    console.log('\n--- 5. TC-005-004: Same Device Token Update ---');
    const tc4DeviceId = 'qa_device_tc005_004';
    const tc4TokenOld = 'qa_token_device_1_old';
    const tc4TokenNew = 'qa_token_device_1_new';

    // Register initial token
    const tc4Res1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: tc4TokenOld,
        device_id: tc4DeviceId,
        platform: 'ANDROID',
      },
    });
    console.log(`TC-005-004 Initial registration: Status ${tc4Res1.status}`);

    const dbTc4Before = await prisma.pushToken.findFirst({
      where: { userId: cust1.id, deviceId: tc4DeviceId },
    });
    console.log('DB Record before update:');
    console.log({
      id: dbTc4Before?.id,
      userId: dbTc4Before?.userId,
      deviceId: dbTc4Before?.deviceId,
      fcmToken: maskToken(dbTc4Before?.fcmToken),
      createdAt: dbTc4Before?.createdAt,
      updatedAt: dbTc4Before?.updatedAt,
    });

    // Wait 1 second to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 1000));

    // Register updated token with same device_id
    const tc4Res2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: tc4TokenNew,
        device_id: tc4DeviceId,
        platform: 'ANDROID',
      },
    });
    console.log(`TC-005-004 Update registration: Status ${tc4Res2.status}`);

    const dbTc4After = await prisma.pushToken.findFirst({
      where: { userId: cust1.id, deviceId: tc4DeviceId },
    });
    const tc4Count = await prisma.pushToken.count({
      where: { userId: cust1.id, deviceId: tc4DeviceId },
    });

    console.log('DB Record after update:');
    console.log({
      id: dbTc4After?.id,
      userId: dbTc4After?.userId,
      deviceId: dbTc4After?.deviceId,
      fcmToken: maskToken(dbTc4After?.fcmToken),
      createdAt: dbTc4After?.createdAt,
      updatedAt: dbTc4After?.updatedAt,
    });
    console.log(`Total rows for user+device: ${tc4Count}`);

    results.tc005004 = {
      initialStatus: tc4Res1.status,
      updateStatus: tc4Res2.status,
      rowCount: tc4Count,
      sameRowId: dbTc4Before?.id === dbTc4After?.id,
      tokenUpdated: dbTc4After?.fcmToken === tc4TokenNew,
      createdAtUnchanged: dbTc4Before?.createdAt.getTime() === dbTc4After?.createdAt.getTime(),
      updatedAtChanged: dbTc4Before?.updatedAt.getTime() !== dbTc4After?.updatedAt.getTime(),
    };

    // -------------------------------------------------------------
    // Section 6: TC-005-005 — Multi-Device Registration
    // -------------------------------------------------------------
    console.log('\n--- 6. TC-005-005: Multi-Device Registration ---');
    const tc5Dev1 = 'qa_device_tc5_001';
    const tc5Token1 = 'qa_token_tc5_001';
    const tc5Dev2 = 'qa_device_tc5_002';
    const tc5Token2 = 'qa_token_tc5_002';

    // Register Device 1
    const tc5Res1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tc5Token1, device_id: tc5Dev1, platform: 'ANDROID' },
    });

    // Register Device 2
    const tc5Res2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tc5Token2, device_id: tc5Dev2, platform: 'ANDROID' },
    });

    console.log(`TC-005-005 Dev1 Reg: ${tc5Res1.status} | Dev2 Reg: ${tc5Res2.status}`);

    const tc5DbRows = await prisma.pushToken.findMany({
      where: { userId: cust1.id, isActive: true },
    });
    console.log(`Active DB rows for Customer 1: ${tc5DbRows.length}`);
    tc5DbRows.forEach((r) => {
      console.log(`  - Row ID: ${r.id} | Device: ${r.deviceId} | Token: ${maskToken(r.fcmToken)}`);
    });

    results.tc005005 = {
      reg1Status: tc5Res1.status,
      reg2Status: tc5Res2.status,
      activeRowCount: tc5DbRows.length,
      distinctRowIds: tc5DbRows.length === 2 && tc5DbRows[0].id !== tc5DbRows[1].id,
      tokensReturned: tc5DbRows.map((r) => maskToken(r.fcmToken)),
    };

    // -------------------------------------------------------------
    // Section 7: Cross-User and Constraint Collision Tests
    // -------------------------------------------------------------
    console.log('\n--- 7. Cross-User and Constraint Collision Tests ---');
    const sharedDevId = 'qa_shared_device_id_xuser';
    const tokenUserA = 'qa_token_user_a_cross_user';
    const tokenUserB = 'qa_token_user_b_cross_user';

    // Step 1: User A (Customer 1) registers shared-device-id
    const xuRes1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tokenUserA, device_id: sharedDevId, platform: 'ANDROID' },
    });
    console.log(`7.1 User A registers shared-device-id: Status ${xuRes1.status}`);

    const dbXuBefore = await prisma.pushToken.findFirst({ where: { deviceId: sharedDevId } });
    console.log(`7.1 DB Row User ID before User B reg: ${dbXuBefore?.userId} (User A: ${cust1.id})`);

    // Step 2: User B (Customer 2) registers the exact same shared-device-id
    const xuRes2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust2Jwt),
      body: { fcm_token: tokenUserB, device_id: sharedDevId, platform: 'ANDROID' },
    });
    console.log(`7.2 User B registers shared-device-id: Status ${xuRes2.status}`);

    const dbXuAfter = await prisma.pushToken.findFirst({ where: { deviceId: sharedDevId } });
    const countXuAll = await prisma.pushToken.count({ where: { deviceId: sharedDevId } });
    console.log(`7.2 DB Row User ID after User B reg: ${dbXuAfter?.userId} (User B: ${cust2.id})`);
    console.log(`7.2 Total DB rows for shared-device-id: ${countXuAll}`);

    const isOwnershipOverwritten = dbXuBefore?.id === dbXuAfter?.id && dbXuAfter?.userId === cust2.id;
    console.log(`7.2 CRITICAL DEFECT CHECK: User B overwrote User A ownership? ${isOwnershipOverwritten}`);

    results.crossUser.push({
      test: 'Duplicate device_id across users (same role)',
      userARegStatus: xuRes1.status,
      userBRegStatus: xuRes2.status,
      userAId: cust1.id,
      userBId: cust2.id,
      rowUserIdBefore: dbXuBefore?.userId,
      rowUserIdAfter: dbXuAfter?.userId,
      rowIdSame: dbXuBefore?.id === dbXuAfter?.id,
      isOwnershipOverwritten,
    });

    // Step 3: User B attempts to register User A's exact fcm_token with a different device_id
    const tokenAExisting = 'qa_token_user_a_unique_check';
    const devAUnique = 'qa_device_user_a_unique';
    const devBUnique = 'qa_device_user_b_unique';

    // User A registers tokenAExisting
    await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tokenAExisting, device_id: devAUnique, platform: 'ANDROID' },
    });

    // User B registers the exact same fcm_token on a different device ID
    const xuRes3 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust2Jwt),
      body: { fcm_token: tokenAExisting, device_id: devBUnique, platform: 'ANDROID' },
    });
    console.log(`7.3 User B registering User A fcm_token on new device: Status ${xuRes3.status}`);
    console.log(`7.3 Body:`, xuRes3.body);

    results.crossUser.push({
      test: 'Duplicate fcm_token across users/devices',
      status: xuRes3.status,
      body: xuRes3.body,
    });

    // -------------------------------------------------------------
    // Section 8: Token Revocation Regression
    // -------------------------------------------------------------
    console.log('\n--- 8. Token Revocation Regression ---');
    const revDevId = 'qa_device_revocation_test';
    const revToken = 'qa_token_revocation_test';

    // 8.1 Register token
    await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: revToken, device_id: revDevId, platform: 'ANDROID' },
    });

    // 8.2 Revoke token as owner
    const revRes1 = await fetchApi(`/api/v1/notifications/device-tokens/${revDevId}`, {
      method: 'DELETE',
      headers: authHeader(cust1Jwt),
    });
    console.log(`8.2 Owner revocation: Status ${revRes1.status}`);

    const dbRevRow = await prisma.pushToken.findFirst({ where: { deviceId: revDevId } });
    console.log(`8.2 DB record is_active after revocation: ${dbRevRow?.isActive}`);

    // 8.3 Re-register same device
    const revRes2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: revToken, device_id: revDevId, platform: 'ANDROID' },
    });
    console.log(`8.3 Re-registration of revoked device: Status ${revRes2.status}`);

    const dbRevRow2 = await prisma.pushToken.findFirst({ where: { deviceId: revDevId } });
    console.log(`8.3 DB record is_active after re-registration: ${dbRevRow2?.isActive}`);

    // 8.4 Cross-user revocation (Customer 2 trying to revoke Customer 1's device)
    const revRes3 = await fetchApi(`/api/v1/notifications/device-tokens/${revDevId}`, {
      method: 'DELETE',
      headers: authHeader(cust2Jwt),
    });
    console.log(`8.4 Cross-user revocation: Status ${revRes3.status}`);

    // 8.5 Unknown device revocation
    const revRes4 = await fetchApi('/api/v1/notifications/device-tokens/non_existent_device_999', {
      method: 'DELETE',
      headers: authHeader(cust1Jwt),
    });
    console.log(`8.5 Unknown device revocation: Status ${revRes4.status}`);

    results.revocation = {
      ownerRevocationStatus: revRes1.status,
      isActiveAfterRevoke: dbRevRow?.isActive,
      reRegistrationStatus: revRes2.status,
      isActiveAfterReReg: dbRevRow2?.isActive,
      crossUserRevocationStatus: revRes3.status,
      unknownDeviceRevocationStatus: revRes4.status,
    };

    // -------------------------------------------------------------
    // Section 10: Concurrency and Idempotency Tests
    // -------------------------------------------------------------
    console.log('\n--- 10. Concurrency and Idempotency Tests ---');
    const concDevId = 'qa_device_concurrency_test';
    const concTokenPrefix = 'qa_token_conc_';

    const reqs = Array.from({ length: 5 }).map((_, i) =>
      fetchApi('/api/v1/notifications/device-tokens', {
        method: 'POST',
        headers: authHeader(cust1Jwt),
        body: {
          fcm_token: `${concTokenPrefix}${i}`,
          device_id: concDevId,
          platform: 'ANDROID',
        },
      })
    );

    const concResponses = await Promise.all(reqs);
    const concStatuses = concResponses.map((r) => r.status);
    console.log(`10. Parallel registration statuses:`, concStatuses);

    const dbConcRows = await prisma.pushToken.findMany({ where: { deviceId: concDevId } });
    console.log(`10. Total DB rows after 5 concurrent requests: ${dbConcRows.length}`);
    if (dbConcRows.length > 0) {
      console.log(`10. Winning token in DB: ${maskToken(dbConcRows[0].fcmToken)}`);
    }

    results.concurrency = {
      statuses: concStatuses,
      rowCount: dbConcRows.length,
      hasUnhandledError: concStatuses.some((s) => s >= 500),
    };

    // -------------------------------------------------------------
    // Section 12: Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 12. Cleanup Verification ---');

    // Pass 1: Delete all test device tokens
    const deleteTokensPass1 = await prisma.pushToken.deleteMany({
      where: {
        userId: { in: [cust1.id, cust2.id, prov1.id] },
      },
    });
    console.log(`Cleanup Pass 1: Deleted ${deleteTokensPass1.count} QA push_tokens.`);

    // Delete QA Users
    await prisma.customer.deleteMany({
      where: { id: { in: [cust1.id, cust2.id] } },
    });
    await prisma.provider.deleteMany({
      where: { id: prov1.id },
    });
    console.log(`Cleanup Pass 1: Deleted QA Customers and Providers.`);

    // Pass 2: Idempotent double cleanup check
    const deleteTokensPass2 = await prisma.pushToken.deleteMany({
      where: {
        userId: { in: [cust1.id, cust2.id, prov1.id] },
      },
    });
    console.log(`Cleanup Pass 2 (Idempotency check): Deleted ${deleteTokensPass2.count} push_tokens.`);

    results.cleanup = {
      pass1TokenCount: deleteTokensPass1.count,
      pass2TokenCount: deleteTokensPass2.count,
      isClean: deleteTokensPass2.count === 0,
    };

    console.log('\n================================================================');
    console.log('  QA AUDIT RUNTIME TEST EXECUTION COMPLETED SUCCESSFULLY ');
    console.log('================================================================\n');

    console.log('SUMMARY RESULTS JSON:');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('❌ QA Audit Execution Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
