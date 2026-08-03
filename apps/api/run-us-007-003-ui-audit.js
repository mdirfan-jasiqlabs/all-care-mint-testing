const { chromium } = require('playwright');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');
const { TokenService } = require('./dist/src/modules/auth/services/token.service');

async function getAdminToken(app, prisma, tokenService) {
  const adminUser = await prisma.adminUser.findFirst();
  if (!adminUser) throw new Error('No admin user found');
  const tokens = await tokenService.generateTokenPair(adminUser.id, 'ADMIN');
  return tokens.accessToken;
}

async function runUiAudit() {
  console.log('========================================================================');
  console.log('  REVISED EMPIRICAL QA AUDIT — US-007-003 ADMIN WEB UI (PLAYWRIGHT)');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const tokenService = app.get(TokenService);

  const adminToken = await getAdminToken(app, prisma, tokenService);
  console.log('Admin JWT Token generated successfully.');

  const results = {
    authRedirect: {},
    authenticatedLoad: {},
    loadingState: {},
    kpiTiles: {},
    unassignedBadge: {},
    recentBookingsTable: {},
    assignButtonRouting: {},
    errorBannerAndRetry: {},
    lastKnownDataPreservation: {},
    retryRecovery: {},
    autoRefreshPolling: {},
    responsiveLayouts: {},
    securityAndConsole: {},
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  context.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
      consoleErrors.push(msg.text());
    }
  });

  const page = await context.newPage();

  try {
    // 1. Unauthenticated Redirect
    console.log('--- 1. Testing Unauthenticated Access Redirect ---');
    await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });
    const finalUrl = page.url();
    const isRedirectedToLogin = finalUrl.includes('/login/admin') || finalUrl.includes('/admin/login');
    console.log(`Redirected to login: ${isRedirectedToLogin ? 'PASS' : 'FAIL'}`);

    results.authRedirect = { requestedUrl: 'http://localhost:3001/admin/dashboard', finalUrl, isRedirectedToLogin };

    // 2. Authenticated Dashboard Load
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
    }, adminToken);

    const authResponse = await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });
    const currentUrl = page.url();
    const loadSuccess = currentUrl.includes('/admin/dashboard') && authResponse.status() === 200;
    console.log(`Dashboard page loaded successfully: ${loadSuccess ? 'PASS' : 'FAIL'}`);

    results.authenticatedLoad = { status: authResponse.status(), url: currentUrl, success: loadSuccess };

    // 3. Loading Skeletons
    console.log('\n--- 3. Verifying Loading State Placeholders ---');
    const loadingPage = await context.newPage();
    await loadingPage.route('**/api/v1/admin/dashboard/metrics', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await loadingPage.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'domcontentloaded' });
    await loadingPage.evaluate((tok) => { sessionStorage.setItem('access_token', tok); }, adminToken);
    await loadingPage.reload({ waitUntil: 'commit' });

    const skeletonCount = await loadingPage.evaluate(() => {
      return Array.from(document.querySelectorAll('div')).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.height === '36px' && style.borderRadius === '8px';
      }).length;
    });

    console.log(`Skeleton placeholders during loading: ${skeletonCount} (Expected: 5)`);
    results.loadingState = { skeletonCount, passed: skeletonCount === 5 };
    await loadingPage.close();

    // 4. KPI Cards Verification
    console.log('\n--- 4. Verifying 5 KPI Cards ---');
    const kpiCards = await page.evaluate(() => {
      const labels = ['Bookings Today', 'Revenue Today', 'Unassigned Bookings', 'Active Providers', 'Average Rating'];
      const allDivs = Array.from(document.querySelectorAll('div'));
      const cards = [];

      labels.forEach((lbl) => {
        const match = allDivs.find(d => d.innerText && d.innerText.startsWith(lbl) && d.children.length >= 2);
        if (match) {
          cards.push({ label: lbl, lines: match.innerText.split('\n').filter(Boolean) });
        }
      });
      return cards;
    });

    console.log(`Total KPI cards found: ${kpiCards.length}`);
    kpiCards.forEach((c, i) => console.log(`Card ${i + 1}: ${c.lines.join(' | ')}`));
    results.kpiTiles = { count: kpiCards.length, passed: kpiCards.length === 5, cards: kpiCards };

    // 5. Unassigned Warning Badge
    console.log('\n--- 5. Verifying Unassigned Warning Badge ---');
    const badgeElement = await page.$('span:has-text("Action Required")');
    const isBadgeVisible = badgeElement ? await badgeElement.isVisible() : false;
    const badgeText = badgeElement ? (await badgeElement.textContent())?.trim() : null;
    console.log(`Badge Visible: ${isBadgeVisible} (Text: "${badgeText}")`);
    results.unassignedBadge = { isBadgeVisible, badgeText };

    // 6. Recent Bookings Table
    console.log('\n--- 6. Verifying Recent Unassigned Bookings Table ---');
    const tableHeaders = await page.$$eval('table thead th', (ths) => ths.map((th) => th.innerText.trim()));
    const tableRowsCount = (await page.$$('table tbody tr')).length;
    console.log(`Table headers: ${JSON.stringify(tableHeaders)} | Rows: ${tableRowsCount}`);
    results.recentBookingsTable = { headers: tableHeaders, rowCount: tableRowsCount, withinLimit: tableRowsCount <= 10 };

    // 7. Assign Button Shortcut Navigation
    console.log('\n--- 7. Verifying Assign Button Navigation ---');
    const firstAssignBtn = await page.$('table tbody tr button');
    if (firstAssignBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
        firstAssignBtn.click(),
      ]);
      const targetUrl = page.url();
      console.log(`Navigated to: ${targetUrl}`);
      results.assignButtonRouting = { targetUrl, isBookingDetail: targetUrl.includes('/admin/bookings/') };
      await page.goto('http://localhost:3001/admin/dashboard', { waitUntil: 'networkidle' });
    }

    // 8. Error State & Last Known Data Preservation on API Failure (HTTP 500)
    console.log('\n--- 8. Testing API Failure Error Banner & Last Known Data Preservation ---');
    // Capture successful metric text before failure
    const originalBookingMetric = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const card = allDivs.find(d => d.innerText && d.innerText.startsWith('Bookings Today'));
      return card ? card.innerText : '';
    });
    console.log(`Preserved Baseline Metric before error:\n"${originalBookingMetric}"`);

    // Intercept metrics API to return HTTP 500
    await page.route('**/api/v1/admin/dashboard/metrics', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    console.log('Reloading page while API returns HTTP 500 to trigger error state...');
    await page.reload({ waitUntil: 'networkidle' });

    // Check error banner visibility
    const errorBanner = await page.$('#dashboard-error-banner');
    const isErrorBannerVisible = errorBanner ? await errorBanner.isVisible() : false;
    const errorBannerText = errorBanner ? (await errorBanner.textContent())?.trim() : null;
    const retryButton = await page.$('#dashboard-error-banner button:has-text("Retry")');
    const isRetryBtnVisible = retryButton ? await retryButton.isVisible() : false;

    console.log(`Error Banner Visible: ${isErrorBannerVisible}`);
    console.log(`Error Banner Text: "${errorBannerText}"`);
    console.log(`Retry Button Visible: ${isRetryBtnVisible}`);

    // Check last-known data preservation (Ensure metrics didn't flip to misleading 0)
    const preservedMetricText = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div'));
      const card = allDivs.find(d => d.innerText && d.innerText.startsWith('Bookings Today'));
      return card ? card.innerText : '';
    });
    console.log(`Metric text during API error:\n"${preservedMetricText}"`);
    const isDataPreserved = preservedMetricText.includes('55') && !preservedMetricText.includes('\n0\n');
    console.log(`Last known data preserved (not misleading 0): ${isDataPreserved ? 'PASS' : 'FAIL'}`);

    results.errorBannerAndRetry = {
      isErrorBannerVisible,
      errorBannerText,
      isRetryBtnVisible,
      passed: isErrorBannerVisible && isRetryBtnVisible,
    };
    results.lastKnownDataPreservation = {
      isDataPreserved,
      passed: isDataPreserved,
    };

    // 9. Retry Recovery Test
    console.log('\n--- 9. Testing Retry Button Recovery ---');
    // Remove failure route interception
    await page.unroute('**/api/v1/admin/dashboard/metrics');

    console.log('Clicking Retry button...');
    if (retryButton) {
      await retryButton.click();
      await page.waitForTimeout(1000);
    }

    const isErrorBannerDismissed = !(await page.$('#dashboard-error-banner'));
    console.log(`Error banner dismissed after successful retry: ${isErrorBannerDismissed ? 'PASS' : 'FAIL'}`);
    results.retryRecovery = { isErrorBannerDismissed, passed: isErrorBannerDismissed };

    // 10. Auto-Refresh 60s Polling
    console.log('\n--- 10. Verifying Auto-Refresh 60-Second Polling (62s wait) ---');
    let metricsRequestCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/api/v1/admin/dashboard/metrics')) {
        metricsRequestCount++;
      }
    });

    console.log('Listening for auto-refresh metrics request for 62 seconds...');
    await page.waitForTimeout(62000);
    console.log(`Metrics requests captured: ${metricsRequestCount}`);
    results.autoRefreshPolling = { metricsRequestCount, autoRefreshed: metricsRequestCount >= 1 };

    // 11. Responsive Layouts
    console.log('\n--- 11. Verifying Responsive Layouts ---');
    const viewports = [
      { name: '1440x900', w: 1440, h: 900 },
      { name: '1280x720', w: 1280, h: 720 },
      { name: '1024x768', w: 1024, h: 768 },
      { name: '768x1024 (Tablet)', w: 768, h: 1024 },
      { name: '800x600 (Small)', w: 800, h: 600 },
    ];

    results.responsiveLayouts = {};
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.waitForTimeout(400);
      const hasHorizScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      console.log(`Viewport ${vp.name}: Horizontal Scrollbar = ${hasHorizScroll ? 'YES (FAIL)' : 'NO (PASS)'}`);
      results.responsiveLayouts[vp.name] = { hasHorizScroll, passed: !hasHorizScroll };
    }

    results.securityAndConsole = { consoleErrorsCount: consoleErrors.length, passed: consoleErrors.length === 0 };

    console.log('\n========================================================================');
    console.log('  REVISED PLAYWRIGHT UI AUDIT COMPLETE');
    console.log('========================================================================');
    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('Playwright UI audit error:', err);
  } finally {
    await browser.close();
    await app.close();
    process.exit(0);
  }
}

runUiAudit();
