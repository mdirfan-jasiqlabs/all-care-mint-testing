const { chromium } = require('playwright');
const http = require('http');

// Helper to obtain Admin JWT token from backend
async function getAdminToken() {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../api/dist/src/app.module');
  const { PrismaService } = require('../api/dist/src/prisma/prisma.service');
  const { TokenService } = require('../api/dist/src/modules/auth/services/token.service');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const tokenService = app.get(TokenService);

  const adminUser = await prisma.adminUser.findFirst();
  if (!adminUser) throw new Error('No admin user found');

  const tokens = await tokenService.generateTokenPair(adminUser.id, 'ADMIN');
  await app.close();
  return tokens.accessToken;
}

async function runUiAudit() {
  console.log('========================================================================');
  console.log('  EMPIRICAL QA AUDIT — US-007-003 ADMIN WEB UI (PLAYWRIGHT)');
  console.log('========================================================================\n');

  const adminToken = await getAdminToken();
  console.log('Admin JWT Token obtained successfully.');

  const results = {
    authRedirect: {},
    authenticatedLoad: {},
    kpiTiles: {},
    unassignedBadge: {},
    loadingState: {},
    recentBookingsTable: {},
    assignButtonRouting: {},
    autoRefreshPolling: {},
    responsiveLayouts: {},
    errorStates: {},
    emptyStates: {},
    securityAndConsole: {},
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const consoleLogs = [];
  const consoleErrors = [];

  context.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------------------
    // 1. Unauthenticated Access & Middleware Redirect Test
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Unauthenticated Access Redirect ---');
    const unauthResponse = await page.goto('http://localhost:3001/admin/dashboard', {
      waitUntil: 'networkidle',
    });
    const finalUrl = page.url();
    console.log(`Initial URL requested: http://localhost:3001/admin/dashboard`);
    console.log(`Final URL after redirect: ${finalUrl}`);
    const isRedirectedToLogin = finalUrl.includes('/login/admin') || finalUrl.includes('/admin/login');
    console.log(`Redirected to login: ${isRedirectedToLogin ? 'PASS' : 'FAIL'}`);

    results.authRedirect = {
      requestedUrl: 'http://localhost:3001/admin/dashboard',
      finalUrl,
      isRedirectedToLogin,
    };

    // -------------------------------------------------------------------------
    // 2. Authenticated Access & Cookie/Storage Setup
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Authenticated Access ---');
    await context.addCookies([
      {
        name: 'admin_access_token',
        value: adminToken,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => {
      sessionStorage.setItem('access_token', tok);
      localStorage.setItem('access_token', tok);
      localStorage.setItem('admin_token', tok);
    }, adminToken);

    // Reload page to consume session storage & cookies
    const authResponse = await page.goto('http://localhost:3001/admin/dashboard', {
      waitUntil: 'networkidle',
    });

    const currentUrl = page.url();
    console.log(`Authenticated page URL: ${currentUrl}`);
    const loadSuccess = currentUrl.includes('/admin/dashboard') && authResponse.status() === 200;
    console.log(`Dashboard page loaded successfully: ${loadSuccess ? 'PASS' : 'FAIL'}`);

    results.authenticatedLoad = {
      status: authResponse.status(),
      url: currentUrl,
      success: loadSuccess,
    };

    // -------------------------------------------------------------------------
    // 3. KPI Tiles Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Verifying 5 KPI Tiles ---');
    const headerTitle = await page.textContent('h2');
    console.log(`Dashboard Header: "${headerTitle?.trim()}"`);

    // Extract all text inside KPI grid cards
    const kpiCards = await page.$$eval(
      'div[style*="gridTemplateColumns"] > div',
      (cards) =>
        cards.map((c) => {
          const text = c.innerText.split('\n').filter(Boolean);
          const style = window.getComputedStyle(c);
          return {
            fullText: c.innerText,
            lines: text,
            bgColor: style.backgroundColor,
          };
        }),
    );

    console.log(`Total KPI cards found: ${kpiCards.length} (Expected: 5)`);
    kpiCards.forEach((card, idx) => {
      console.log(`Card ${idx + 1}: ${card.lines.join(' | ')}`);
    });

    const has5KpiTiles = kpiCards.length === 5;
    console.log(`Exactly 5 KPI tiles present: ${has5KpiTiles ? 'PASS' : 'FAIL'}`);

    results.kpiTiles = {
      count: kpiCards.length,
      has5KpiTiles,
      cards: kpiCards,
    };

    // -------------------------------------------------------------------------
    // 4. Unassigned Tile & Warning Badge Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Verifying Unassigned Tile & Warning Badge ---');
    const unassignedCardText = kpiCards.find((c) => c.fullText.includes('Unassigned Bookings'));
    let badgeText = null;
    let isBadgeVisible = false;

    const badgeElement = await page.$('span:has-text("Action Required")');
    if (badgeElement) {
      badgeText = await badgeElement.textContent();
      isBadgeVisible = await badgeElement.isVisible();
    }

    console.log(`Unassigned Card Text:\n"${unassignedCardText?.fullText}"`);
    console.log(`Warning Badge Visible: ${isBadgeVisible} (Text: "${badgeText}")`);

    results.unassignedBadge = {
      cardFound: !!unassignedCardText,
      isBadgeVisible,
      badgeText,
    };

    // -------------------------------------------------------------------------
    // 5. Recent Bookings Table Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Verifying Recent Unassigned Bookings Table ---');
    const tableHeader = await page.textContent('h3');
    console.log(`Table Section Title: "${tableHeader?.trim()}"`);

    const tableHeaders = await page.$$eval('table thead th', (ths) => ths.map((th) => th.innerText.trim()));
    console.log(`Table Column Headers: ${JSON.stringify(tableHeaders)}`);

    const tableRows = await page.$$eval('table tbody tr', (rows) =>
      rows.map((r) => {
        const cols = Array.from(r.querySelectorAll('td')).map((td) => td.innerText.trim());
        const assignBtn = r.querySelector('button');
        return {
          time: cols[0],
          customer: cols[1],
          service: cols[2],
          actionBtnText: cols[3] || (assignBtn ? assignBtn.innerText.trim() : null),
        };
      }),
    );

    console.log(`Rows count: ${tableRows.length} (Max allowed: 10)`);
    tableRows.forEach((row, i) => {
      console.log(`Row ${i + 1}: Time="${row.time}" | Customer="${row.customer}" | Service="${row.service}" | Action="${row.actionBtnText}"`);
    });

    const max10RowsPassed = tableRows.length <= 10;
    const columnsMatch = tableHeaders.join(', ') === 'Time, Customer, Service, Action';
    console.log(`Max 10 rows rule: ${max10RowsPassed ? 'PASS' : 'FAIL'}`);
    console.log(`Columns structure match: ${columnsMatch ? 'PASS' : 'FAIL'}`);

    results.recentBookingsTable = {
      headerTitle: tableHeader?.trim(),
      headers: tableHeaders,
      rowCount: tableRows.length,
      max10RowsPassed,
      rows: tableRows,
    };

    // -------------------------------------------------------------------------
    // 6. Assign Button & Navigation Shortcut
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Verifying Assign Button Navigation ---');
    const assignButtons = await page.$$('table tbody tr button');
    console.log(`Found ${assignButtons.length} Assign buttons in table`);

    if (assignButtons.length > 0) {
      // Intercept navigation or click first assign button
      const firstBtn = assignButtons[0];
      const targetBookingId = await page.$eval('table tbody tr', (tr) => {
        // extract row button click handler target if possible
        return tr.innerHTML;
      });

      console.log('Clicking first Assign button...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
        firstBtn.click(),
      ]);

      const navUrl = page.url();
      console.log(`URL after clicking Assign button: ${navUrl}`);
      const isBookingDetailRoute = navUrl.includes('/admin/bookings/');
      console.log(`Navigated to /admin/bookings/:id: ${isBookingDetailRoute ? 'PASS' : 'FAIL'}`);

      results.assignButtonRouting = {
        navigatedUrl: navUrl,
        isBookingDetailRoute,
      };

      // Navigate back to dashboard
      await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });
    }

    // -------------------------------------------------------------------------
    // 7. Auto-Refresh / 60-Second Polling Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Verifying Auto-Refresh Polling Request ---');
    let metricsRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/admin/dashboard/metrics')) {
        metricsRequestCount++;
      }
    });

    console.log('Listening for background metrics requests for 62 seconds...');
    metricsRequestCount = 0; // reset baseline
    await page.waitForTimeout(62000);

    console.log(`Metrics requests captured in 62s: ${metricsRequestCount}`);
    const autoRefreshed = metricsRequestCount >= 1;
    console.log(`Auto-refresh triggered without page reload: ${autoRefreshed ? 'PASS' : 'FAIL'}`);

    results.autoRefreshPolling = {
      metricsRequestCount,
      autoRefreshed,
    };

    // -------------------------------------------------------------------------
    // 8. Responsive Viewports Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Verifying Responsive UI Layouts ---');
    const viewports = [
      { name: 'Desktop Large (1440x900)', width: 1440, height: 900 },
      { name: 'Desktop Standard (1280x720)', width: 1280, height: 720 },
      { name: 'Desktop Small (1024x768)', width: 1024, height: 768 },
      { name: 'Tablet (768x1024)', width: 768, height: 1024 },
      { name: 'Small Screen (800x600)', width: 800, height: 600 },
    ];

    results.responsiveLayouts = {};
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`[Viewport ${vp.name}] Width: ${vp.width}px | Horiz Scrollbar: ${hasHorizontalScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);
      results.responsiveLayouts[vp.name] = {
        width: vp.width,
        height: vp.height,
        hasHorizontalScroll,
        passed: !hasHorizontalScroll,
      };
    }

    // Reset viewport back to desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    // -------------------------------------------------------------------------
    // 9. Error States Verification (API Failure Interception)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Verifying Error States on API Failure ---');
    const errorPage = await context.newPage();
    await errorPage.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await errorPage.evaluate((tok) => {
      sessionStorage.setItem('access_token', tok);
      localStorage.setItem('access_token', tok);
    }, adminToken);

    // Intercept metrics API to return HTTP 500
    await errorPage.route('**/api/v1/admin/dashboard/metrics', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await errorPage.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });

    // Check if error banner / retry button is shown
    const hasErrorBanner = await errorPage.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('error') || text.includes('failed') || text.includes('something went wrong');
    });

    const retryButton = await errorPage.$('button:has-text("Retry"), button:has-text("Try Again")');
    console.log(`API Error Banner Visible: ${hasErrorBanner ? 'YES' : 'NO (FAIL - Fallback to 0s without banner)'}`);
    console.log(`Retry Button Visible: ${!!retryButton ? 'YES' : 'NO (FAIL)'}`);

    results.errorStates = {
      apiStatus: 500,
      hasErrorBanner,
      hasRetryButton: !!retryButton,
      passed: hasErrorBanner && !!retryButton,
    };

    await errorPage.close();

    // -------------------------------------------------------------------------
    // 10. Security & Console Log Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Security & Console Log Inspection ---');
    console.log(`Total Console Errors logged: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }

    results.securityAndConsole = {
      consoleErrorsCount: consoleErrors.length,
      consoleErrors,
      passed: consoleErrors.length === 0,
    };

    console.log('\n========================================================================');
    console.log('  PLAYWRIGHT UI AUDIT COMPLETE');
    console.log('========================================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Playwright UI audit error:', err);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

runUiAudit();
