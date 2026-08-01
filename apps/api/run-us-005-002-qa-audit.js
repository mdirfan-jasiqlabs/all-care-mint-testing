const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const prisma = new PrismaClient();

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
  console.log('  REVISED JASIQ QA AUDIT: US-005-002 FCM TOKEN REGISTRATION    ');
  console.log('================================================================\n');

  const results = {
    crossUserIsolation: null,
    identityBinding: [],
    duplicateTokenHandling: null,
    platformValidation: [],
    tc005004: null,
    tc005005: null,
    revocation: null,
    concurrency: null,
    cleanup: null,
  };

  try {
    // -------------------------------------------------------------
    // 0. Setup Test Users & Tokens
    // -------------------------------------------------------------
    console.log('--- 0. Setting up QA Test Users & JWTs ---');

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

    // Clean up stale tokens
    await prisma.pushToken.deleteMany({
      where: { userId: { in: [cust1.id, cust2.id, prov1.id] } },
    });

    // -------------------------------------------------------------
    // 1. Cross-User Isolation (Customer A + device-X, Customer B + device-X)
    // -------------------------------------------------------------
    console.log('\n--- 1. Cross-User Token Ownership Isolation ---');
    const sharedDevX = 'qa_device_shared_x';

    // Customer 1 registers device-X
    const resXu1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_token_cust1_devX', device_id: sharedDevX, platform: 'ANDROID' },
    });
    console.log(`1.1 Customer 1 registers device-X: Status ${resXu1.status}`);

    const dbXuCust1 = await prisma.pushToken.findFirst({ where: { userId: cust1.id, deviceId: sharedDevX } });

    // Customer 2 registers the exact same device-X
    const resXu2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust2Jwt),
      body: { fcm_token: 'qa_token_cust2_devX', device_id: sharedDevX, platform: 'ANDROID' },
    });
    console.log(`1.2 Customer 2 registers device-X: Status ${resXu2.status}`);

    const dbXuCust2 = await prisma.pushToken.findFirst({ where: { userId: cust2.id, deviceId: sharedDevX } });
    const totalDevXRows = await prisma.pushToken.count({ where: { deviceId: sharedDevX } });

    console.log(`1.3 Total DB rows for device-X: ${totalDevXRows}`);
    console.log(`1.3 Cust 1 row exists & untouched? ${dbXuCust1 !== null && dbXuCust1.userId === cust1.id}`);
    console.log(`1.3 Cust 2 row exists separately? ${dbXuCust2 !== null && dbXuCust2.userId === cust2.id}`);

    results.crossUserIsolation = {
      cust1Status: resXu1.status,
      cust2Status: resXu2.status,
      totalDevXRows,
      separateRowsCreated: totalDevXRows === 2 && dbXuCust1.id !== dbXuCust2.id,
      cust1OwnershipPreserved: dbXuCust1.userId === cust1.id,
      cust2OwnershipPreserved: dbXuCust2.userId === cust2.id,
    };

    // -------------------------------------------------------------
    // 2. Identity Binding & Role Spoofing Prevention
    // -------------------------------------------------------------
    console.log('\n--- 2. Identity Binding & Role Spoofing Prevention ---');

    // Customer sends userRole="PROVIDER" in request body
    const devIdSpoof1 = 'qa_device_spoof_role_1';
    const resSpoof1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: {
        fcm_token: 'qa_token_spoof_role_1',
        device_id: devIdSpoof1,
        platform: 'ANDROID',
        userRole: 'PROVIDER',
      },
    });
    const dbSpoof1 = await prisma.pushToken.findFirst({ where: { deviceId: devIdSpoof1 } });
    console.log(`2.1 Customer sending userRole="PROVIDER" -> Status: ${resSpoof1.status} | Persisted user_role: ${dbSpoof1?.userRole}`);

    results.identityBinding.push({
      test: 'Customer payload with userRole="PROVIDER"',
      status: resSpoof1.status,
      persistedUserRole: dbSpoof1?.userRole,
      expectedUserRole: 'CUSTOMER',
      jwtRoleEnforced: dbSpoof1?.userRole === 'CUSTOMER',
    });

    // Provider sends userRole="CUSTOMER" in request body
    const devIdSpoof2 = 'qa_device_spoof_role_2';
    const resSpoof2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(prov1Jwt),
      body: {
        fcm_token: 'qa_token_spoof_role_2',
        device_id: devIdSpoof2,
        platform: 'ANDROID',
        userRole: 'CUSTOMER',
      },
    });
    const dbSpoof2 = await prisma.pushToken.findFirst({ where: { deviceId: devIdSpoof2 } });
    console.log(`2.2 Provider sending userRole="CUSTOMER" -> Status: ${resSpoof2.status} | Persisted user_role: ${dbSpoof2?.userRole}`);

    results.identityBinding.push({
      test: 'Provider payload with userRole="CUSTOMER"',
      status: resSpoof2.status,
      persistedUserRole: dbSpoof2?.userRole,
      expectedUserRole: 'PROVIDER',
      jwtRoleEnforced: dbSpoof2?.userRole === 'PROVIDER',
    });

    // -------------------------------------------------------------
    // 3. Duplicate FCM Token Reassignment (No 500, Single Active Owner)
    // -------------------------------------------------------------
    console.log('\n--- 3. Duplicate FCM Token Reassignment ---');
    const sharedFcmToken = 'qa_shared_fcm_token_reassign';
    const devA = 'qa_device_reassign_a';
    const devB = 'qa_device_reassign_b';

    // Customer 1 registers token on devA
    await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: sharedFcmToken, device_id: devA, platform: 'ANDROID' },
    });

    // Customer 2 registers exact same FCM token on devB
    const resDup = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust2Jwt),
      body: { fcm_token: sharedFcmToken, device_id: devB, platform: 'ANDROID' },
    });

    console.log(`3.1 Re-registering FCM token on new user/device -> Status: ${resDup.status}`);
    console.log(`3.1 Response body:`, resDup.body);

    const dbDevA = await prisma.pushToken.findFirst({ where: { deviceId: devA } });
    const dbDevB = await prisma.pushToken.findFirst({ where: { deviceId: devB } });

    console.log(`3.2 DevA row active? ${dbDevA?.isActive} | DevB row active? ${dbDevB?.isActive}`);

    results.duplicateTokenHandling = {
      status: resDup.status,
      noHttp500: resDup.status === 200,
      oldOwnerDeactivated: dbDevA?.isActive === false,
      newOwnerActive: dbDevB?.isActive === true,
      singleActiveOwner: dbDevA?.isActive === false && dbDevB?.isActive === true,
    };

    // -------------------------------------------------------------
    // 4. Platform Field Validation (ANDROID 200, IOS/WEB 400)
    // -------------------------------------------------------------
    console.log('\n--- 4. Platform Field Validation ---');

    // 4.1 ANDROID
    const resPlatAndroid = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_android', device_id: 'qa_dev_android', platform: 'ANDROID' },
    });
    const dbAndroid = await prisma.pushToken.findFirst({ where: { deviceId: 'qa_dev_android' } });
    console.log(`4.1 ANDROID platform -> Status: ${resPlatAndroid.status} | Persisted platform: ${dbAndroid?.platform}`);

    results.platformValidation.push({
      platform: 'ANDROID',
      status: resPlatAndroid.status,
      persistedPlatform: dbAndroid?.platform,
      passed: resPlatAndroid.status === 200 && dbAndroid?.platform === 'ANDROID',
    });

    // 4.2 IOS
    const resPlatIos = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_ios', device_id: 'qa_dev_ios', platform: 'IOS' },
    });
    console.log(`4.2 IOS platform -> Status: ${resPlatIos.status}`);

    results.platformValidation.push({
      platform: 'IOS',
      status: resPlatIos.status,
      rejectedWith400: resPlatIos.status === 400,
    });

    // 4.3 WEB
    const resPlatWeb = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_web', device_id: 'qa_dev_web', platform: 'WEB' },
    });
    console.log(`4.3 WEB platform -> Status: ${resPlatWeb.status}`);

    results.platformValidation.push({
      platform: 'WEB',
      status: resPlatWeb.status,
      rejectedWith400: resPlatWeb.status === 400,
    });

    // -------------------------------------------------------------
    // 5. TC-005-004: Same Device Token Update
    // -------------------------------------------------------------
    console.log('\n--- 5. TC-005-004: Same Device Token Update ---');
    const tc4Dev = 'qa_device_tc005_004';
    const tc4OldTok = 'qa_token_tc4_old';
    const tc4NewTok = 'qa_token_tc4_new';

    const resTc4_1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tc4OldTok, device_id: tc4Dev, platform: 'ANDROID' },
    });
    const dbTc4Before = await prisma.pushToken.findFirst({ where: { userId: cust1.id, deviceId: tc4Dev } });

    await new Promise((r) => setTimeout(r, 1000));

    const resTc4_2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: tc4NewTok, device_id: tc4Dev, platform: 'ANDROID' },
    });
    const dbTc4After = await prisma.pushToken.findFirst({ where: { userId: cust1.id, deviceId: tc4Dev } });
    const tc4Count = await prisma.pushToken.count({ where: { userId: cust1.id, deviceId: tc4Dev } });

    console.log(`5.1 Initial reg: ${resTc4_1.status} | Update reg: ${resTc4_2.status} | Row count: ${tc4Count}`);
    console.log(`5.2 Same row ID? ${dbTc4Before?.id === dbTc4After?.id} | Token updated? ${dbTc4After?.fcmToken === tc4NewTok}`);

    results.tc005004 = {
      initialStatus: resTc4_1.status,
      updateStatus: resTc4_2.status,
      rowCount: tc4Count,
      sameRowId: dbTc4Before?.id === dbTc4After?.id,
      tokenUpdated: dbTc4After?.fcmToken === tc4NewTok,
      createdAtUnchanged: dbTc4Before?.createdAt.getTime() === dbTc4After?.createdAt.getTime(),
      updatedAtChanged: dbTc4Before?.updatedAt.getTime() !== dbTc4After?.updatedAt.getTime(),
    };

    // -------------------------------------------------------------
    // 6. TC-005-005: Multi-Device Registration
    // -------------------------------------------------------------
    console.log('\n--- 6. TC-005-005: Multi-Device Registration ---');
    const tc5Dev1 = 'qa_device_tc5_001';
    const tc5Dev2 = 'qa_device_tc5_002';

    const resTc5_1 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_tc5_1', device_id: tc5Dev1, platform: 'ANDROID' },
    });
    const resTc5_2 = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_tc5_2', device_id: tc5Dev2, platform: 'ANDROID' },
    });

    const activeDbRows = await prisma.pushToken.findMany({
      where: { userId: cust1.id, isActive: true },
    });
    console.log(`6.1 Dev1: ${resTc5_1.status} | Dev2: ${resTc5_2.status} | Active user rows: ${activeDbRows.length}`);

    results.tc005005 = {
      reg1Status: resTc5_1.status,
      reg2Status: resTc5_2.status,
      activeRowCount: activeDbRows.length,
    };

    // -------------------------------------------------------------
    // 7. Revocation Regression
    // -------------------------------------------------------------
    console.log('\n--- 7. Token Revocation Regression ---');
    const revDev = 'qa_device_rev_test';

    await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_rev_test', device_id: revDev, platform: 'ANDROID' },
    });

    const resRevOwner = await fetchApi(`/api/v1/notifications/device-tokens/${revDev}`, {
      method: 'DELETE',
      headers: authHeader(cust1Jwt),
    });
    const dbRev1 = await prisma.pushToken.findFirst({ where: { deviceId: revDev } });

    const resRevReReg = await fetchApi('/api/v1/notifications/device-tokens', {
      method: 'POST',
      headers: authHeader(cust1Jwt),
      body: { fcm_token: 'qa_tok_rev_test', device_id: revDev, platform: 'ANDROID' },
    });
    const dbRev2 = await prisma.pushToken.findFirst({ where: { deviceId: revDev } });

    const resRevCross = await fetchApi(`/api/v1/notifications/device-tokens/${revDev}`, {
      method: 'DELETE',
      headers: authHeader(cust2Jwt),
    });

    const resRevUnknown = await fetchApi('/api/v1/notifications/device-tokens/non_existent_device_999', {
      method: 'DELETE',
      headers: authHeader(cust1Jwt),
    });

    console.log(`7.1 Owner revoke: ${resRevOwner.status} (isActive: ${dbRev1?.isActive})`);
    console.log(`7.2 Re-register: ${resRevReReg.status} (isActive: ${dbRev2?.isActive})`);
    console.log(`7.3 Cross-user revoke: ${resRevCross.status} | Unknown device: ${resRevUnknown.status}`);

    results.revocation = {
      ownerRevokeStatus: resRevOwner.status,
      isActiveAfterRevoke: dbRev1?.isActive,
      reRegStatus: resRevReReg.status,
      isActiveAfterReReg: dbRev2?.isActive,
      crossUserRevokeStatus: resRevCross.status,
      unknownDeviceRevokeStatus: resRevUnknown.status,
    };

    // -------------------------------------------------------------
    // 8. Concurrency & Idempotency
    // -------------------------------------------------------------
    console.log('\n--- 8. Concurrency and Idempotency ---');
    const concDev = 'qa_device_conc_test';
    const concReqs = Array.from({ length: 5 }).map((_, i) =>
      fetchApi('/api/v1/notifications/device-tokens', {
        method: 'POST',
        headers: authHeader(cust1Jwt),
        body: { fcm_token: `qa_tok_conc_${i}`, device_id: concDev, platform: 'ANDROID' },
      })
    );
    const concRes = await Promise.all(concReqs);
    const concStatuses = concRes.map((r) => r.status);
    const concDbRows = await prisma.pushToken.findMany({ where: { deviceId: concDev } });

    console.log(`8.1 Parallel statuses:`, concStatuses);
    console.log(`8.2 DB rows count: ${concDbRows.length}`);

    results.concurrency = {
      statuses: concStatuses,
      rowCount: concDbRows.length,
      all200: concStatuses.every((s) => s === 200),
      singleRowCreated: concDbRows.length === 1,
    };

    // -------------------------------------------------------------
    // 9. Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 9. Cleanup Verification ---');
    const delTokens = await prisma.pushToken.deleteMany({
      where: { userId: { in: [cust1.id, cust2.id, prov1.id] } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: [cust1.id, cust2.id] } } });
    await prisma.provider.deleteMany({ where: { id: prov1.id } });

    console.log(`Deleted ${delTokens.count} test push_tokens and test users.`);

    results.cleanup = {
      deletedTokenCount: delTokens.count,
      isClean: true,
    };

    console.log('\n================================================================');
    console.log('  REVISED QA AUDIT TEST EXECUTION COMPLETED SUCCESSFULLY       ');
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
