const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');
const { TokenService } = require('./dist/src/modules/auth/services/token.service');
const http = require('http');

async function runBackendAudit() {
  console.log('========================================================================');
  console.log('  EMPIRICAL QA AUDIT — US-007-003 BACKEND & DATABASE VERIFICATION');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const tokenService = app.get(TokenService);

  const results = {
    authMatrix: {},
    metricsSchema: {},
    dbVsApiMetrics: {},
    recentBookingsDbVsApi: {},
    performanceSla: {},
  };

  try {
    // 1. Obtain Test Users & Generate JWT Tokens
    console.log('--- 1. Generating JWT Tokens ---');
    const adminUser = await prisma.adminUser.findFirst();
    const customerUser = await prisma.customer.findFirst();
    const providerUser = await prisma.provider.findFirst({ where: { status: 'APPROVED' } });

    if (!adminUser || !customerUser || !providerUser) {
      throw new Error(`Missing test users in DB. Admin: ${!!adminUser}, Customer: ${!!customerUser}, Provider: ${!!providerUser}`);
    }

    const adminTokens = await tokenService.generateTokenPair(adminUser.id, 'ADMIN');
    const customerTokens = await tokenService.generateTokenPair(customerUser.id, 'CUSTOMER');
    const providerTokens = await tokenService.generateTokenPair(providerUser.id, 'PROVIDER');

    const adminJwt = adminTokens.accessToken;
    const customerJwt = customerTokens.accessToken;
    const providerJwt = providerTokens.accessToken;
    const invalidJwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    const expiredJwt = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OCIsInJvbGUiOiJBRE1JTiIsImV4cCI6MTAwMDAwMDAwMH0.fake';

    const makeRequest = (path, method = 'GET', headers = {}) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: 3000,
            path,
            method,
            headers,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              const durationMs = Date.now() - startTime;
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: data,
                durationMs,
              });
            });
          },
        );
        req.on('error', reject);
        req.end();
      });
    };

    // 2. Authentication & Role Security Matrix
    console.log('--- 2. Authentication & Authorization Matrix ---');
    const authScenarios = [
      { name: 'Admin JWT', headers: { Authorization: `Bearer ${adminJwt}` }, expectedStatus: 200 },
      { name: 'Customer JWT', headers: { Authorization: `Bearer ${customerJwt}` }, expectedStatus: 403 },
      { name: 'Provider JWT', headers: { Authorization: `Bearer ${providerJwt}` }, expectedStatus: 403 },
      { name: 'Missing JWT', headers: {}, expectedStatus: 401 },
      { name: 'Invalid JWT', headers: { Authorization: `Bearer ${invalidJwt}` }, expectedStatus: 401 },
      { name: 'Expired JWT', headers: { Authorization: `Bearer ${expiredJwt}` }, expectedStatus: 401 },
    ];

    for (const sc of authScenarios) {
      const res = await makeRequest('/api/v1/admin/dashboard/metrics', 'GET', sc.headers);
      const passed = res.status === sc.expectedStatus;
      console.log(`[AUTH] ${sc.name} -> HTTP ${res.status} (Expected ${sc.expectedStatus}): ${passed ? 'PASS' : 'FAIL'}`);
      results.authMatrix[sc.name] = { status: res.status, expected: sc.expectedStatus, passed };
    }

    // 3. GET /api/v1/admin/dashboard/metrics Response Keys Verification
    console.log('\n--- 3. Metrics Response Schema Verification ---');
    const metricsRes = await makeRequest('/api/v1/admin/dashboard/metrics', 'GET', {
      Authorization: `Bearer ${adminJwt}`,
    });
    let metricsBody = {};
    try {
      metricsBody = JSON.parse(metricsRes.body);
    } catch (e) {
      console.error('Failed to parse JSON body:', metricsRes.body);
    }

    const expectedKeys = [
      'total_bookings_today',
      'revenue_today_inr',
      'unassigned_count',
      'active_providers_count',
      'avg_rating',
    ];
    const actualKeys = Object.keys(metricsBody).sort();
    const exactKeysMatch = JSON.stringify(actualKeys) === JSON.stringify(expectedKeys.sort());

    console.log(`Response status: ${metricsRes.status}`);
    console.log(`Actual keys: ${JSON.stringify(actualKeys)}`);
    console.log(`Exact schema match: ${exactKeysMatch ? 'PASS' : 'FAIL'}`);
    results.metricsSchema = {
      status: metricsRes.status,
      keys: actualKeys,
      expectedKeys,
      exactMatch: exactKeysMatch,
      body: metricsBody,
    };

    // 4. Live PostgreSQL Comparison for 5 KPIs
    console.log('\n--- 4. Direct Database Calculations vs API Metrics ---');
    const now = new Date();
    const istParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);

    const year = istParts.find((p) => p.type === 'year')?.value;
    const month = istParts.find((p) => p.type === 'month')?.value;
    const day = istParts.find((p) => p.type === 'day')?.value;

    const startOfTodayIst = new Date(`${year}-${month}-${day}T00:00:00.000+05:30`);
    const endOfTodayIst = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);

    // KPI 1: total_bookings_today
    const dbBookingsToday = await prisma.booking.count({
      where: { createdAt: { gte: startOfTodayIst, lte: endOfTodayIst } },
    });

    // KPI 2: revenue_today_inr
    const onlinePaymentsToday = await prisma.paymentOrder.aggregate({
      where: {
        status: 'PAYMENT_SUCCESS',
        updatedAt: { gte: startOfTodayIst, lte: endOfTodayIst },
      },
      _sum: { amountPaise: true },
    });
    const onlineInr = (onlinePaymentsToday._sum.amountPaise || 0) / 100;

    const cashSettledPaymentsToday = await prisma.paymentOrder.findMany({
      where: {
        status: 'CASH_SETTLED',
        updatedAt: { gte: startOfTodayIst, lte: endOfTodayIst },
      },
      select: { amountPaise: true, bookingId: true },
    });
    const cashSettledInr = cashSettledPaymentsToday.reduce((acc, p) => acc + p.amountPaise / 100, 0);
    const settledBookingIds = cashSettledPaymentsToday.map((p) => p.bookingId).filter(Boolean);

    const completedCashBookingsToday = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        paymentMethod: 'CASH_ON_SERVICE',
        updatedAt: { gte: startOfTodayIst, lte: endOfTodayIst },
        id: settledBookingIds.length > 0 ? { notIn: settledBookingIds } : undefined,
      },
      select: { servicePriceSnapshot: true, paymentMethod: true },
    });
    const completedCashInr = completedCashBookingsToday
      .filter((b) => b.paymentMethod === 'CASH_ON_SERVICE')
      .reduce((acc, b) => acc + Number(b.servicePriceSnapshot || 0), 0);

    const dbRevenueToday = Math.round((onlineInr + cashSettledInr + completedCashInr) * 100) / 100;

    // KPI 3: unassigned_count
    const dbUnassignedCount = await prisma.booking.count({
      where: { status: 'PENDING', providerId: null },
    });

    // KPI 4: active_providers_count
    const dbActiveProvidersCount = await prisma.provider.count({
      where: { status: 'APPROVED' },
    });

    // KPI 5: avg_rating
    const dbRatingAggregate = await prisma.rating.aggregate({
      _avg: { ratingScore: true },
    });
    const dbRawAvg = dbRatingAggregate._avg.ratingScore || 0;
    const dbAvgRating = Math.round(dbRawAvg * 100) / 100;

    console.log(`KPI 1 (Bookings Today):      API = ${metricsBody.total_bookings_today} | DB = ${dbBookingsToday} -> ${metricsBody.total_bookings_today === dbBookingsToday ? 'PASS' : 'FAIL'}`);
    console.log(`KPI 2 (Revenue Today INR):   API = ${metricsBody.revenue_today_inr} | DB = ${dbRevenueToday} -> ${metricsBody.revenue_today_inr === dbRevenueToday ? 'PASS' : 'FAIL'}`);
    console.log(`KPI 3 (Unassigned Count):    API = ${metricsBody.unassigned_count} | DB = ${dbUnassignedCount} -> ${metricsBody.unassigned_count === dbUnassignedCount ? 'PASS' : 'FAIL'}`);
    console.log(`KPI 4 (Active Providers):    API = ${metricsBody.active_providers_count} | DB = ${dbActiveProvidersCount} -> ${metricsBody.active_providers_count === dbActiveProvidersCount ? 'PASS' : 'FAIL'}`);
    console.log(`KPI 5 (Avg Rating):          API = ${metricsBody.avg_rating} | DB = ${dbAvgRating} -> ${metricsBody.avg_rating === dbAvgRating ? 'PASS' : 'FAIL'}`);

    results.dbVsApiMetrics = {
      total_bookings_today: { api: metricsBody.total_bookings_today, db: dbBookingsToday, match: metricsBody.total_bookings_today === dbBookingsToday },
      revenue_today_inr: { api: metricsBody.revenue_today_inr, db: dbRevenueToday, match: metricsBody.revenue_today_inr === dbRevenueToday },
      unassigned_count: { api: metricsBody.unassigned_count, db: dbUnassignedCount, match: metricsBody.unassigned_count === dbUnassignedCount },
      active_providers_count: { api: metricsBody.active_providers_count, db: dbActiveProvidersCount, match: metricsBody.active_providers_count === dbActiveProvidersCount },
      avg_rating: { api: metricsBody.avg_rating, db: dbAvgRating, match: metricsBody.avg_rating === dbAvgRating },
    };

    // 5. Recent Bookings API vs Database
    console.log('\n--- 5. Recent Bookings API vs Database Verification ---');
    const bookingsApiRes = await makeRequest('/api/v1/admin/bookings?status=PENDING&limit=10', 'GET', {
      Authorization: `Bearer ${adminJwt}`,
    });

    let apiBookings = [];
    try {
      const parsed = JSON.parse(bookingsApiRes.body);
      apiBookings = parsed.data || parsed.bookings || [];
    } catch (e) {}

    const dbUnassignedBookings = await prisma.booking.findMany({
      where: { status: 'PENDING' },
      include: { customer: true, service: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`API returned ${apiBookings.length} unassigned bookings, DB query returned ${dbUnassignedBookings.length}`);
    const tableLimitPassed = apiBookings.length <= 10;
    console.log(`Max 10 rows constraint: ${tableLimitPassed ? 'PASS' : 'FAIL'}`);

    results.recentBookingsDbVsApi = {
      apiCount: apiBookings.length,
      dbCount: dbUnassignedBookings.length,
      withinLimit: tableLimitPassed,
      itemsSample: apiBookings.map((b) => ({ id: b.id, ref: b.bookingReference })),
    };

    // 6. Performance SLA (10 Warm Requests)
    console.log('\n--- 6. Performance SLA (10 Warm Requests) ---');
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const res = await makeRequest('/api/v1/admin/dashboard/metrics', 'GET', {
        Authorization: `Bearer ${adminJwt}`,
      });
      latencies.push(res.durationMs);
    }

    latencies.sort((a, b) => a - b);
    const minMs = latencies[0];
    const maxMs = latencies[latencies.length - 1];
    const avgMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    // P95 calculation (index 8 for 10 samples)
    const p95Ms = latencies[Math.floor(0.95 * (latencies.length - 1))];

    console.log(`Latencies (ms): ${latencies.join(', ')}`);
    console.log(`Min: ${minMs} ms | Max: ${maxMs} ms | Avg: ${avgMs} ms | P95: ${p95Ms} ms`);
    console.log(`Under 3 seconds SLA (<3000ms): ${maxMs < 3000 ? 'PASS' : 'FAIL'}`);

    results.performanceSla = {
      minMs,
      maxMs,
      avgMs,
      p95Ms,
      under3sSla: maxMs < 3000,
    };

    console.log('\n========================================================================');
    console.log('  BACKEND AUDIT COMPLETE');
    console.log('========================================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Backend audit failed with error:', err);
  } finally {
    await app.close();
    process.exit(0);
  }
}

runBackendAudit();
