const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');
const { TokenService } = require('./dist/src/modules/auth/services/token.service');
const http = require('http');

async function runQaAudit() {
  console.log('========================================================================');
  console.log('  RE-VERIFICATION EMPIRICAL QA AUDIT — US-007-001 Admin Dashboard and Reports');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const tokenService = app.get(TokenService);

  const results = {
    schemaAndIndexes: {},
    auth: {},
    dashboardMetricsApi: {},
    dbVsApiMetrics: {},
    performanceSla: {},
    reportsApi: {},
    dateRangeValidation: {},
    reportTypeAndFormatValidation: {},
    csvGenerationAndHeaders: {},
    csvSecurity: {},
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Database Index & Schema Verification
    // -------------------------------------------------------------------------
    console.log('--- 1. Database Index & Migration Verification ---');
    const indexes = await prisma.$queryRaw`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('bookings', 'payment_orders', 'providers', 'ratings')
      ORDER BY tablename, indexname;
    `;

    const idxBookingsCreatedAt = indexes.some((i) => i.indexname === 'idx_bookings_created_at');
    const idxPaymentOrdersBookingId = indexes.some((i) => i.indexname === 'idx_payment_orders_booking_id');

    results.schemaAndIndexes = {
      idx_bookings_created_at: idxBookingsCreatedAt,
      idx_payment_orders_booking_id: idxPaymentOrdersBookingId,
    };
    console.log(`idx_bookings_created_at exists in PostgreSQL: ${idxBookingsCreatedAt ? 'PASS' : 'FAIL'}`);
    console.log(`idx_payment_orders_booking_id exists in PostgreSQL: ${idxPaymentOrdersBookingId ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // 2. Identify / Create Test Users & Tokens
    // -------------------------------------------------------------------------
    console.log('--- 2. Identifying / Generating JWT Tokens ---');
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

    // Helper for HTTP requests
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

    // -------------------------------------------------------------------------
    // 3. Section 3: Authentication & Authorization Tests
    // -------------------------------------------------------------------------
    console.log('--- 3. Authentication & Authorization Matrix ---');
    const authScenarios = [
      { name: 'Admin JWT', headers: { Authorization: `Bearer ${adminJwt}` }, expectedStatus: 200 },
      { name: 'Customer JWT', headers: { Authorization: `Bearer ${customerJwt}` }, expectedStatus: 403 },
      { name: 'Provider JWT', headers: { Authorization: `Bearer ${providerJwt}` }, expectedStatus: 403 },
      { name: 'Missing JWT', headers: {}, expectedStatus: 401 },
      { name: 'Invalid JWT', headers: { Authorization: `Bearer ${invalidJwt}` }, expectedStatus: 401 },
      { name: 'Expired JWT', headers: { Authorization: `Bearer ${expiredJwt}` }, expectedStatus: 401 },
      {
        name: 'Role Spoofing Attempt (Customer JWT + ?role=ADMIN)',
        headers: { Authorization: `Bearer ${customerJwt}` },
        pathSuffix: '?role=ADMIN',
        expectedStatus: 403,
      },
    ];

    results.auth = {};
    for (const sc of authScenarios) {
      const path = `/api/v1/admin/dashboard/metrics${sc.pathSuffix || ''}`;
      const res = await makeRequest(path, 'GET', sc.headers);
      const passed = res.status === sc.expectedStatus;
      console.log(`[AUTH] ${sc.name} -> HTTP ${res.status} (Expected ${sc.expectedStatus}): ${passed ? 'PASS' : 'FAIL'}`);
      results.auth[sc.name] = { status: res.status, expected: sc.expectedStatus, passed };
    }

    // -------------------------------------------------------------------------
    // 4. Section 4 & 10: Dashboard Metrics API Response & Performance SLA
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Dashboard Metrics API Response & Performance SLA ---');
    const metricsRes = await makeRequest('/api/v1/admin/dashboard/metrics', 'GET', {
      Authorization: `Bearer ${adminJwt}`,
    });
    console.log(`Metrics Response Status: ${metricsRes.status}`);
    console.log(`Metrics Response Latency: ${metricsRes.durationMs} ms`);
    console.log(`Metrics Response Body:\n${metricsRes.body}`);

    let metricsBody = {};
    try {
      metricsBody = JSON.parse(metricsRes.body);
    } catch (e) {}

    results.dashboardMetricsApi = {
      status: metricsRes.status,
      durationMs: metricsRes.durationMs,
      body: metricsBody,
    };

    // Performance SLA (10 warm requests)
    console.log('\nRunning 10 warm performance requests for SLA verification (< 3000 ms)...');
    const timings = [];
    for (let i = 0; i < 10; i++) {
      const r = await makeRequest('/api/v1/admin/dashboard/metrics', 'GET', {
        Authorization: `Bearer ${adminJwt}`,
      });
      timings.push(r.durationMs);
    }
    const maxTiming = Math.max(...timings);
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`10 Requests Latencies (ms): ${timings.join(', ')}`);
    console.log(`Max Latency: ${maxTiming} ms | Avg Latency: ${avgTiming.toFixed(2)} ms`);
    results.performanceSla = {
      timings,
      maxTiming,
      avgTiming,
      slaPassed: maxTiming < 3000,
    };

    // -------------------------------------------------------------------------
    // 5. Sections 5 - 9: Direct Database Comparisons of All 5 KPIs
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Direct Database Calculations vs API Metrics ---');
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

    console.log(`Asia/Kolkata Start of Today: ${startOfTodayIst.toISOString()}`);
    console.log(`Asia/Kolkata End of Today: ${endOfTodayIst.toISOString()}`);

    // DB KPI 1: Total Bookings Today
    const dbBookingsToday = await prisma.booking.count({
      where: { createdAt: { gte: startOfTodayIst, lte: endOfTodayIst } },
    });
    console.log(`KPI 1 (Bookings Today): API = ${metricsBody.total_bookings_today} | DB Calc = ${dbBookingsToday}`);

    // DB KPI 2: Revenue Today
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
    console.log(`KPI 2 (Revenue Today INR): API = ${metricsBody.revenue_today_inr} | DB Calc = ${dbRevenueToday}`);

    // DB KPI 3: Unassigned Bookings
    const dbUnassignedCount = await prisma.booking.count({
      where: { status: 'PENDING', providerId: null },
    });
    console.log(`KPI 3 (Unassigned Count): API = ${metricsBody.unassigned_count} | DB Calc = ${dbUnassignedCount}`);

    // DB KPI 4: Active Providers
    const dbActiveProvidersCount = await prisma.provider.count({
      where: { status: 'APPROVED' },
    });
    console.log(`KPI 4 (Active Providers): API = ${metricsBody.active_providers_count} | DB Calc = ${dbActiveProvidersCount}`);

    // DB KPI 5: Avg Rating
    const dbRatingAggregate = await prisma.rating.aggregate({
      _avg: { ratingScore: true },
    });
    const dbRawAvg = dbRatingAggregate._avg.ratingScore || 0;
    const dbAvgRating = Math.round(dbRawAvg * 100) / 100;
    console.log(`KPI 5 (Avg Rating): API = ${metricsBody.avg_rating} | DB Calc = ${dbAvgRating}`);

    results.dbVsApiMetrics = {
      api: metricsBody,
      db: {
        total_bookings_today: dbBookingsToday,
        revenue_today_inr: dbRevenueToday,
        unassigned_count: dbUnassignedCount,
        active_providers_count: dbActiveProvidersCount,
        avg_rating: dbAvgRating,
      },
      matches: {
        total_bookings_today: metricsBody.total_bookings_today === dbBookingsToday,
        revenue_today_inr: metricsBody.revenue_today_inr === dbRevenueToday,
        unassigned_count: metricsBody.unassigned_count === dbUnassignedCount,
        active_providers_count: metricsBody.active_providers_count === dbActiveProvidersCount,
        avg_rating: metricsBody.avg_rating === dbAvgRating,
      },
    };

    // -------------------------------------------------------------------------
    // 6. Section 14 - 18: Reports API & Allowlist Validation Tests
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Reports API & Date Range / Query Validation ---');
    const reportScenarios = [
      {
        name: 'Valid Booking Report (JSON)',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-07-01&date_to=2026-07-31',
        expectedStatus: 200,
      },
      {
        name: 'Valid Revenue Report (JSON)',
        path: '/api/v1/admin/reports?type=revenue&date_from=2026-07-01&date_to=2026-07-31',
        expectedStatus: 200,
      },
      {
        name: 'Same Date Range (1 Day)',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-07-15&date_to=2026-07-15',
        expectedStatus: 200,
      },
      {
        name: '89 Days Range',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-05-01&date_to=2026-07-29',
        expectedStatus: 200,
      },
      {
        name: 'Exactly 90 Days Range (2026-05-01 to 2026-07-30)',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-05-01&date_to=2026-07-30',
        expectedStatus: 200,
      },
      {
        name: 'TC-007-003: Range > 90 Days (2026-05-01 to 2026-08-01 = 92 days)',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-05-01&date_to=2026-08-01',
        expectedStatus: 400,
      },
      {
        name: 'Reversed Date Range (date_from > date_to)',
        path: '/api/v1/admin/reports?type=booking&date_from=2026-07-31&date_to=2026-07-01',
        expectedStatus: 400,
      },
      {
        name: 'Invalid Date String',
        path: '/api/v1/admin/reports?type=booking&date_from=invalid-date&date_to=2026-07-31',
        expectedStatus: 400,
      },
      {
        name: 'Invalid Report Type Allowlist Check (type=foo_bar)',
        path: '/api/v1/admin/reports?type=foo_bar&date_from=2026-07-01&date_to=2026-07-31',
        expectedStatus: 400,
      },
      {
        name: 'Invalid Report Format Allowlist Check (format=xml)',
        path: '/api/v1/admin/reports?type=booking&format=xml&date_from=2026-07-01&date_to=2026-07-31',
        expectedStatus: 400,
      },
    ];

    results.reportsApi = {};
    for (const sc of reportScenarios) {
      const res = await makeRequest(sc.path, 'GET', { Authorization: `Bearer ${adminJwt}` });
      const passed = res.status === sc.expectedStatus;
      console.log(`[REPORT-TEST] ${sc.name} -> HTTP ${res.status} (Expected ${sc.expectedStatus}): ${passed ? 'PASS' : 'FAIL'}`);
      results.reportsApi[sc.name] = { status: res.status, expected: sc.expectedStatus, passed, body: res.body };
    }

    // -------------------------------------------------------------------------
    // 7. Sections 19, 20 & 21: CSV Generation, Headers & Security Formula Injection
    // -------------------------------------------------------------------------
    console.log('\n--- 7. CSV Export & Contract Header Verification ---');

    // TC-007-002 / AC-007-002 Revenue CSV
    const revenueCsvRes = await makeRequest(
      '/api/v1/admin/reports?type=revenue&format=csv&date_from=2026-07-01&date_to=2026-07-31',
      'GET',
      { Authorization: `Bearer ${adminJwt}` },
    );
    console.log(`Revenue CSV Status: ${revenueCsvRes.status}`);
    console.log(`Revenue CSV Content-Type: ${revenueCsvRes.headers['content-type']}`);
    console.log(`Revenue CSV Content-Disposition: ${revenueCsvRes.headers['content-disposition']}`);

    const csvLines = revenueCsvRes.body.split('\n');
    const firstLineHeader = csvLines[0] ? csvLines[0].trim() : '';
    console.log(`Revenue CSV Header Line:\n"${firstLineHeader}"`);

    const expectedRevenueHeader = 'Date,Booking ID,Customer Name,Service Name,Amount (INR),Payment Method,Status';
    const headerMatched = firstLineHeader === expectedRevenueHeader;
    console.log(`Revenue CSV Header exact match: ${headerMatched ? 'PASS' : 'FAIL'}`);

    // Booking CSV (TC-007-002 request)
    const bookingCsvRes = await makeRequest(
      '/api/v1/admin/reports?type=booking&format=csv&date_from=2026-07-01&date_to=2026-07-31',
      'GET',
      { Authorization: `Bearer ${adminJwt}` },
    );
    console.log(`\nBooking CSV Status: ${bookingCsvRes.status}`);
    console.log(`Booking CSV Header Line:\n"${bookingCsvRes.body.split('\n')[0]}"`);

    results.csvGenerationAndHeaders = {
      revenueCsv: {
        status: revenueCsvRes.status,
        contentType: revenueCsvRes.headers['content-type'],
        contentDisposition: revenueCsvRes.headers['content-disposition'],
        header: firstLineHeader,
        expectedHeader: expectedRevenueHeader,
        headerMatched,
        sampleRows: csvLines.slice(1, 5),
      },
      bookingCsv: {
        status: bookingCsvRes.status,
        header: bookingCsvRes.body.split('\n')[0],
      },
    };

    // CSV Formula Security Check
    console.log('\n--- CSV Formula Security Check ---');
    const hasFormulaVulnerability = csvLines.some((line) => {
      const parts = line.split(',');
      return parts.some((p) => /^"[=+\-@]/.test(p));
    });
    console.log(`Unescaped formula triggers starting with =, +, -, @ found: ${hasFormulaVulnerability ? 'FAIL' : 'PASS'}`);

    results.csvSecurity = {
      formulaInjectionMitigated: !hasFormulaVulnerability,
    };

    // -------------------------------------------------------------------------
    // 8. Summary & Final Audit Data Output
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('  RE-VERIFICATION AUDIT COMPLETE — SUMMARY RESULT');
    console.log('========================================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Audit script encountered error:', err);
  } finally {
    await app.close();
  }
}

runQaAudit();
