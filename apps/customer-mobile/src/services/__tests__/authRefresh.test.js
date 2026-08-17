/**
 * Comprehensive Unit & Integration Test Suite for Customer Mobile Auth Refresh
 * Tests:
 * 1. Normal Authenticated Request (Valid Token)
 * 2. Expired Access Token -> Silent Refresh -> Retries Original Request
 * 3. Concurrent 401 Requests -> Single-Flight Concurrency Lock (1 refresh call)
 * 4. Second Token Refresh Cycle (Using Rotated Refresh Token)
 * 5. Invalid Refresh Token -> Auth Cleared & onUnauthorized Invoked
 * 6. Offline / Network Error -> Retains Stored Credentials
 * 7. Manual Logout Race Protection -> Discards In-flight Refresh Tokens
 * 8. App Startup Session Hydration & Expiry Check
 */

const assert = require('assert');
const { ApiClient } = require('../../../../../packages/common/dist/apiClient');

// Pure in-memory storage matching Customer Mobile storage.ts interface
function createTestStorage() {
  const store = {};
  return {
    getAccessToken: () => store['auth.accessToken'],
    setAccessToken: (token) => { store['auth.accessToken'] = token; },
    clearAccessToken: () => { delete store['auth.accessToken']; },
    getRefreshToken: async () => store['auth.refreshToken'] || null,
    setRefreshToken: async (token) => { store['auth.refreshToken'] = token; },
    clearRefreshToken: async () => { delete store['auth.refreshToken']; },
    getUserName: () => store['auth.user_name'],
    setUserName: (name) => { store['auth.user_name'] = name; },
    clearUserName: () => { delete store['auth.user_name']; },
    initStorageFallback: async () => {},
    store,
  };
}

// Simple helper to create JWT with expiration offset in seconds
function createMockJwt(expiresInSec = 900) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const payload = Buffer.from(JSON.stringify({ sub: 'user-123', role: 'CUSTOMER', exp })).toString('base64url');
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

function isAccessTokenExpired(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(decoded);
    if (typeof payload.exp !== 'number') return false;
    return Date.now() / 1000 >= payload.exp - 10;
  } catch (e) {
    return true;
  }
}

// Factory to create customer API service instance for testing
function createCustomerApiService(storage, baseUrl = 'http://localhost:3000') {
  let isLoggingOut = false;
  let refreshPromise = null;
  let onUnauthorizedCallback = null;

  const setOnUnauthorizedCallback = (cb) => {
    onUnauthorizedCallback = cb;
  };

  const setLoggingOutFlag = (val) => {
    isLoggingOut = val;
  };

  const refreshSession = async () => {
    if (isLoggingOut) return 'unauthenticated';
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const currentRefresh = await storage.getRefreshToken();
        if (!currentRefresh) return 'unauthenticated';

        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${cleanBase}/api/v1/auth/token/refresh`;

        let response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: currentRefresh }),
          });
        } catch (networkErr) {
          // Offline / Network error: return 'offline' without destroying stored credentials
          return 'offline';
        }

        if (!response.ok) return 'unauthenticated';

        const json = await response.json();
        if (!json.success || !json.data) return 'unauthenticated';

        const newAccessToken = json.data.accessToken || json.data.access_token;
        const newRefreshToken = json.data.refreshToken || json.data.refresh_token;

        if (!newAccessToken) return 'unauthenticated';

        const latestRefresh = await storage.getRefreshToken();
        if (!latestRefresh || latestRefresh !== currentRefresh || isLoggingOut) {
          return 'unauthenticated';
        }

        storage.setAccessToken(newAccessToken);
        if (newRefreshToken) {
          await storage.setRefreshToken(newRefreshToken);
        }

        return true;
      } catch (e) {
        return 'unauthenticated';
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  const handleCustomerLogout = async () => {
    setLoggingOutFlag(true);
    storage.clearAccessToken();
    await storage.clearRefreshToken();
    storage.clearUserName();
    setLoggingOutFlag(false);
    if (onUnauthorizedCallback) onUnauthorizedCallback();
  };

  const apiClient = new ApiClient({
    baseUrl,
    getToken: () => storage.getAccessToken(),
    refreshToken: () => refreshSession(),
    onUnauthorized: () => {
      storage.clearAccessToken();
      storage.clearRefreshToken();
      storage.clearUserName();
      if (onUnauthorizedCallback) onUnauthorizedCallback();
    },
  });

  return {
    apiClient,
    refreshSession,
    handleCustomerLogout,
    setOnUnauthorizedCallback,
    setLoggingOutFlag,
  };
}

async function runTests() {
  console.log('🧪 Running Customer Mobile Auth Refresh Unit & Integration Tests...\n');

  let mockFetchHandler = null;

  global.fetch = async (url, options = {}) => {
    if (mockFetchHandler) {
      return mockFetchHandler(url, options);
    }
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ success: true }) };
  };

  // TEST 1: Normal Authenticated Request (Valid Token)
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    const validToken = createMockJwt(900);
    storage.setAccessToken(validToken);
    await storage.setRefreshToken('refresh_valid');

    let refreshCalled = false;
    mockFetchHandler = async (url) => {
      if (url.includes('/auth/token/refresh')) refreshCalled = true;
      return {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true, data: { name: 'Alice' } }),
      };
    };

    const res = await service.apiClient.get('/api/v1/customers/me');
    assert.strictEqual(res.success, true);
    assert.strictEqual(refreshCalled, false, 'Refresh must not be called when token is valid');
    console.log('✅ Pass 1: Normal authenticated request succeeds without token refresh');
  }

  // TEST 2: Expired Access Token -> Silent Refresh -> Retries Original Request
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    const expiredToken = createMockJwt(-600);
    storage.setAccessToken(expiredToken);
    await storage.setRefreshToken('refresh_token_1');

    const newAccessToken = createMockJwt(900);
    const newRefreshToken = 'refresh_token_2_rotated';

    let protectedAttempts = 0;
    let refreshAttempts = 0;

    mockFetchHandler = async (url, options) => {
      if (url.includes('/auth/token/refresh')) {
        refreshAttempts++;
        const body = JSON.parse(options.body);
        assert.strictEqual(body.refreshToken, 'refresh_token_1');
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: true,
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
          }),
        };
      }

      if (url.includes('/api/v1/customers/me')) {
        protectedAttempts++;
        const authHeader = options.headers['Authorization'] || options.headers['authorization'];
        if (protectedAttempts === 1) {
          assert.strictEqual(authHeader, `Bearer ${expiredToken}`);
          return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
        } else {
          assert.strictEqual(authHeader, `Bearer ${newAccessToken}`, 'Retried request must send NEW access token');
          return {
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ success: true, data: { name: 'Alice' } }),
          };
        }
      }

      return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
    };

    const res = await service.apiClient.get('/api/v1/customers/me');
    assert.strictEqual(res.success, true);
    assert.strictEqual(refreshAttempts, 1);
    assert.strictEqual(protectedAttempts, 2);
    assert.strictEqual(storage.getAccessToken(), newAccessToken);
    assert.strictEqual(await storage.getRefreshToken(), newRefreshToken);
    console.log('✅ Pass 2: Silent refresh succeeded, rotated tokens saved, retried request returned 200');
  }

  // TEST 3: Concurrent 401 Requests (Single-Flight Lock)
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    const expiredToken = createMockJwt(-600);
    storage.setAccessToken(expiredToken);
    await storage.setRefreshToken('refresh_concurrent_1');

    const newAccessToken = createMockJwt(900);
    const newRefreshToken = 'refresh_concurrent_2';

    let refreshCallsCount = 0;
    const requestCallsCount = { a: 0, b: 0, c: 0 };

    mockFetchHandler = async (url, options) => {
      if (url.includes('/auth/token/refresh')) {
        refreshCallsCount++;
        await new Promise((r) => setTimeout(r, 40));
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: true,
            data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
          }),
        };
      }

      const path = url.split('/v1/')[1];
      if (path && requestCallsCount[path] !== undefined) {
        requestCallsCount[path]++;
        if (requestCallsCount[path] === 1) {
          return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
        }
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ success: true, path }),
        };
      }

      return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
    };

    const [resA, resB, resC] = await Promise.all([
      service.apiClient.get('/api/v1/a'),
      service.apiClient.get('/api/v1/b'),
      service.apiClient.get('/api/v1/c'),
    ]);

    assert.strictEqual(resA.path, 'a');
    assert.strictEqual(resB.path, 'b');
    assert.strictEqual(resC.path, 'c');
    assert.strictEqual(refreshCallsCount, 1, 'EXACTLY ONE refresh request must be executed for concurrent 401s');
    console.log('✅ Pass 3: 3 parallel 401s produced exactly 1 refresh call & all 3 retried successfully');
  }

  // TEST 4: Second Token Refresh Cycle (Using Rotated Refresh Token)
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);

    storage.setAccessToken(createMockJwt(-600));
    await storage.setRefreshToken('refresh_cycle_1');

    const token2 = createMockJwt(-300);
    const refresh2 = 'refresh_cycle_2';

    const token3 = createMockJwt(900);
    const refresh3 = 'refresh_cycle_3';

    let currentCycle = 1;

    let cycle1Attempts = 0;
    let cycle2Attempts = 0;

    mockFetchHandler = async (url, options) => {
      if (url.includes('/auth/token/refresh')) {
        const body = JSON.parse(options.body);
        if (currentCycle === 1) {
          assert.strictEqual(body.refreshToken, 'refresh_cycle_1');
          return {
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ success: true, data: { accessToken: token2, refreshToken: refresh2 } }),
          };
        } else {
          assert.strictEqual(body.refreshToken, 'refresh_cycle_2', 'Cycle 2 must use rotated token from Cycle 1');
          return {
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'application/json']]),
            json: async () => ({ success: true, data: { accessToken: token3, refreshToken: refresh3 } }),
          };
        }
      }

      if (url.includes('/api/v1/test-cycle')) {
        if (currentCycle === 1) {
          cycle1Attempts++;
          if (cycle1Attempts === 1) {
            return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
          }
          return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), json: async () => ({ success: true }) };
        } else {
          cycle2Attempts++;
          if (cycle2Attempts === 1) {
            return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
          }
          return { ok: true, status: 200, headers: new Map([['content-type', 'application/json']]), json: async () => ({ success: true }) };
        }
      }

      return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
    };

    // Cycle 1
    await service.apiClient.get('/api/v1/test-cycle');
    assert.strictEqual(await storage.getRefreshToken(), 'refresh_cycle_2');

    // Cycle 2
    currentCycle = 2;
    await service.apiClient.get('/api/v1/test-cycle');
    assert.strictEqual(await storage.getRefreshToken(), 'refresh_cycle_3');
    console.log('✅ Pass 4: Refresh Cycle 1 and Cycle 2 completed cleanly with rotated tokens');
  }

  // TEST 5: Invalid Refresh Token -> Auth Cleared & onUnauthorized Invoked
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    storage.setAccessToken(createMockJwt(-600));
    await storage.setRefreshToken('invalid_refresh_token');

    let unauthFired = false;
    service.setOnUnauthorizedCallback(() => {
      unauthFired = true;
    });

    mockFetchHandler = async (url) => {
      if (url.includes('/auth/token/refresh')) {
        return {
          ok: false,
          status: 401,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ success: false, error: { code: 'ERR_AUTH_INVALID' } }),
        };
      }
      return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
    };

    let thrownError = null;
    try {
      await service.apiClient.get('/api/v1/protected');
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError);
    assert.strictEqual(unauthFired, true);
    assert.strictEqual(storage.getAccessToken(), undefined);
    assert.strictEqual(await storage.getRefreshToken(), null);
    console.log('✅ Pass 5: Invalid refresh cleared storage and triggered onUnauthorized callback');
  }

  // TEST 6: Offline Network Error during Refresh (Preserves Stored Credentials)
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    storage.setAccessToken(createMockJwt(-600));
    await storage.setRefreshToken('valid_refresh_offline');

    mockFetchHandler = async (url) => {
      if (url.includes('/auth/token/refresh')) {
        throw new TypeError('Failed to fetch (offline)');
      }
      return { ok: false, status: 401, headers: new Map(), json: async () => ({}) };
    };

    let thrownError = null;
    try {
      await service.apiClient.get('/api/v1/protected');
    } catch (e) {
      thrownError = e;
    }

    assert.ok(thrownError);
    assert.strictEqual(await storage.getRefreshToken(), 'valid_refresh_offline', 'Credentials MUST NOT be cleared on offline network error');
    console.log('✅ Pass 6: Network error during refresh preserved stored credentials without logging out');
  }

  // TEST 7: Manual Logout Race Protection
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);
    storage.setAccessToken(createMockJwt(-600));
    await storage.setRefreshToken('refresh_race_1');

    mockFetchHandler = async (url) => {
      if (url.includes('/auth/token/refresh')) {
        await service.handleCustomerLogout();
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: true,
            data: { accessToken: 'stale_acc', refreshToken: 'stale_ref' },
          }),
        };
      }
      return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
    };

    const result = await service.refreshSession();
    assert.strictEqual(result, 'unauthenticated', 'refreshSession should return unauthenticated when logout occurs during in-flight refresh');
    assert.strictEqual(storage.getAccessToken(), undefined);
    assert.strictEqual(await storage.getRefreshToken(), null);
    console.log('✅ Pass 7: In-flight refresh response was discarded after manual logout');
  }

  // TEST 8: App Startup Expiry Check & Session Restoration
  {
    const storage = createTestStorage();
    const service = createCustomerApiService(storage);

    // Scenario A: Valid access token -> No refresh needed
    const validAcc = createMockJwt(900);
    assert.strictEqual(isAccessTokenExpired(validAcc), false);

    // Scenario B: Expired access token + Valid refresh token -> Refresh restores session
    const expiredAcc = createMockJwt(-600);
    assert.strictEqual(isAccessTokenExpired(expiredAcc), true);
    storage.setAccessToken(expiredAcc);
    await storage.setRefreshToken('startup_refresh_1');

    mockFetchHandler = async (url) => {
      if (url.includes('/auth/token/refresh')) {
        return {
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: true,
            data: { accessToken: createMockJwt(900), refreshToken: 'startup_refresh_2' },
          }),
        };
      }
      return { ok: true, status: 200, headers: new Map(), json: async () => ({}) };
    };

    const refreshed = await service.refreshSession();
    assert.strictEqual(refreshed, true);
    assert.strictEqual(await storage.getRefreshToken(), 'startup_refresh_2');
    console.log('✅ Pass 8: Startup expiration check correctly identified expired JWT and restored session');
  }

  console.log('\n🎉 ALL 8 CUSTOMER AUTH REFRESH TEST SCENARIOS PASSED!\n');
}

runTests().catch((err) => {
  console.error('\n❌ AUTH TEST SUITE FAILED:', err);
  process.exit(1);
});
