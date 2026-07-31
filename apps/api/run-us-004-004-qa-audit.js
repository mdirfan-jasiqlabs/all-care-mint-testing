const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const ARTIFACT_DIR = 'C:\\Users\\rn555\\.gemini\\antigravity-ide\\brain\\ae3e0040-5442-4443-9881-428ab7f6a4f5';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function main() {
  console.log('=== Starting US-004-004 QA Audit Execution ===');

  // 1. Prepare Test Data in Database
  let adminUser = await prisma.adminUser.findFirst({ where: { isSuspended: false } });
  if (!adminUser) {
    adminUser = await prisma.adminUser.create({
      data: {
        email: `qa_admin_${Date.now()}@allcare.com`,
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', // Password@123
        displayName: 'QA Test Admin',
        role: 'ADMIN',
        isSuspended: false,
      },
    });
  }

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        mobileNumber: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
        displayName: 'QA Customer',
      },
    });
  }

  let provider = await prisma.provider.findFirst();
  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        mobileNumber: `+9198764${Math.floor(10000 + Math.random() * 90000)}`,
        displayName: 'QA Provider Pro',
      },
    });
  }

  let service = await prisma.service.findFirst({ where: { isActive: true } });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: 'AC Deep Cleaning QA',
        fixedPrice: 1499,
        durationMinutes: 60,
        isActive: true,
      },
    });
  }

  // Create QA payment records across methods and statuses
  const qaOrders = [];

  // Record 1: ONLINE / PAYMENT_SUCCESS
  const order1 = await prisma.paymentOrder.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      amountPaise: 149900,
      paymentMethod: 'ONLINE',
      status: 'PAYMENT_SUCCESS',
      razorpayOrderId: `order_qa_online_success_${Date.now()}`,
      razorpayPaymentId: `pay_qa_online_success_${Date.now()}`,
    },
  });
  qaOrders.push(order1.id);

  // Record 2: CASH / CASH_PENDING (For testing method filtering & settlement)
  const order2 = await prisma.paymentOrder.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      amountPaise: 149900,
      paymentMethod: 'CASH_ON_SERVICE',
      status: 'CASH_PENDING',
      razorpayOrderId: `order_qa_cash_pending_${Date.now()}`,
    },
  });
  qaOrders.push(order2.id);

  // Record 3: CASH / CASH_SETTLED
  const order3 = await prisma.paymentOrder.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      amountPaise: 149900,
      paymentMethod: 'CASH_ON_SERVICE',
      status: 'CASH_SETTLED',
      razorpayOrderId: `order_qa_cash_settled_${Date.now()}`,
    },
  });
  qaOrders.push(order3.id);

  // Record 4: ONLINE / PAYMENT_FAILED
  const order4 = await prisma.paymentOrder.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      amountPaise: 149900,
      paymentMethod: 'ONLINE',
      status: 'PAYMENT_FAILED',
      razorpayOrderId: `order_qa_online_failed_${Date.now()}`,
    },
  });
  qaOrders.push(order4.id);

  console.log(`Created ${qaOrders.length} QA payment orders in DB.`);

  // Launch Playwright Browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkRequests = [];

  page.on('console', (msg) => {
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });

  page.on('request', (req) => {
    if (req.url().includes('/api/v1/admin/payments')) {
      networkRequests.push({ url: req.url(), method: req.method() });
    }
  });

  // 2. Perform Admin Login
  console.log('Navigating to Admin Login...');
  await page.goto('http://localhost:3001/admin/login');
  await page.fill('#email-input', adminUser.email);
  await page.fill('#password-input', 'Password@123');
  await page.click('#btn-submit');
  await page.waitForTimeout(3000);

  // 3. Navigate to Admin Payments Page
  console.log('Navigating to Admin Payments Page (/admin/payments)...');
  await page.goto('http://localhost:3001/admin/payments');
  await page.waitForSelector('#admin-payments-table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin_login_navigation.png') });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'full_payments_table.png') });
  console.log('Captured full payments table screenshot.');

  // 4. Verify Badges
  const onlineBadge = page.locator('span', { hasText: 'ONLINE' }).first();
  const cashBadge = page.locator('span', { hasText: 'CASH' }).first();
  const successBadge = page.locator('span', { hasText: 'PAYMENT_SUCCESS' }).first();
  const cashPendingBadge = page.locator('span', { hasText: 'CASH_PENDING' }).first();
  const cashSettledBadge = page.locator('span', { hasText: 'CASH_SETTLED' }).first();

  if (await onlineBadge.isVisible()) {
    await onlineBadge.screenshot({ path: path.join(SCREENSHOT_DIR, 'online_badge.png') });
  }
  if (await cashBadge.isVisible()) {
    await cashBadge.screenshot({ path: path.join(SCREENSHOT_DIR, 'cash_badge.png') });
  }
  if (await successBadge.isVisible()) {
    await successBadge.screenshot({ path: path.join(SCREENSHOT_DIR, 'payment_success_badge.png') });
  }
  if (await cashPendingBadge.isVisible()) {
    await cashPendingBadge.screenshot({ path: path.join(SCREENSHOT_DIR, 'cash_pending_badge.png') });
  }
  if (await cashSettledBadge.isVisible()) {
    await cashSettledBadge.screenshot({ path: path.join(SCREENSHOT_DIR, 'cash_settled_badge.png') });
  }
  console.log('Captured badge screenshots.');

  // 5. Test TC-004-008: Method Filter = ONLINE
  console.log('Executing TC-004-008 (Method Filter = ONLINE)...');
  await page.selectOption('#method-filter-select', 'ONLINE');
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'online_filter_before_after.png') });

  const rowsAfterOnlineFilter = await page.locator('#admin-payments-table tbody tr').allTextContents();
  const hasCashInOnlineFilter = rowsAfterOnlineFilter.some((rowText) => rowText.includes('CASH') && !rowText.includes('ONLINE'));
  const allRowsAreOnline = rowsAfterOnlineFilter.every((rowText) => rowText.includes('ONLINE') || rowText.includes('No payment transactions found'));

  console.log(`TC-004-008 Check: No CASH rows visible = ${!hasCashInOnlineFilter}, All visible rows ONLINE = ${allRowsAreOnline}`);

  // Reset Method Filter
  await page.selectOption('#method-filter-select', '');
  await page.waitForTimeout(800);

  // 6. Test Date Range Filtering
  console.log('Testing Date Range Filtering...');
  const todayStr = new Date().toISOString().split('T')[0];
  await page.fill('#date-from-input', todayStr);
  await page.fill('#date-to-input', todayStr);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'date_filter_results.png') });

  // Clear Date Filters
  await page.fill('#date-from-input', '');
  await page.fill('#date-to-input', '');
  await page.waitForTimeout(800);

  // 7. Test Pagination Evidence
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'pagination_state.png') });

  // 8. Test Settlement Action Integration
  console.log('Testing Settlement Action Integration...');
  const settleBtn = page.locator(`#settle-btn-${order2.id}`);
  if (await settleBtn.isVisible()) {
    // Click Mark Settled
    await settleBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mark_settled_loading_and_success.png') });
    await page.waitForTimeout(1000);
  }

  // 9. Test TC-004-009: CSV Export
  console.log('Executing TC-004-009 (CSV Export)...');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#export-csv-btn'),
  ]);

  const csvPath = path.join(ARTIFACT_DIR, 'payments-report-downloaded.csv');
  await download.saveAs(csvPath);
  console.log(`CSV Export downloaded successfully to: ${csvPath}`);

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvLines = csvContent.trim().split('\n');
  const csvHeaders = csvLines[0];

  console.log('CSV Headers:', csvHeaders);
  console.log('CSV Line Count:', csvLines.length);

  // 10. Test Empty State
  console.log('Testing Empty State...');
  await page.selectOption('#status-filter-select', 'PAYMENT_FAILED');
  await page.fill('#date-from-input', '2000-01-01');
  await page.fill('#date-to-input', '2000-01-02');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'empty_state.png') });

  // Reset Filters
  await page.selectOption('#status-filter-select', '');
  await page.fill('#date-from-input', '');
  await page.fill('#date-to-input', '');
  await page.waitForTimeout(800);

  // 11. Responsive Screenshots
  console.log('Capturing responsive screenshots...');
  const viewports = [
    { width: 1440, height: 900, name: '1440x900' },
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1024, height: 768, name: '1024x768' },
    { width: 768, height: 1024, name: '768x1024' },
    { width: 375, height: 812, name: '375x812' },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `responsive_${vp.name}.png`) });
  }

  // 12. Security Test: Non-Admin Access Rejection
  console.log('Testing Security & Non-Admin Access Rejection...');
  const incognitoContext = await browser.newContext();
  const incognitoPage = await incognitoContext.newPage();

  // Try direct access without admin token
  await incognitoPage.goto('http://localhost:3001/admin/payments');
  await incognitoPage.waitForTimeout(1500);

  const currentUrl = incognitoPage.url();
  await incognitoPage.screenshot({ path: path.join(SCREENSHOT_DIR, 'non_admin_rejection.png') });
  console.log(`Unauthenticated navigation landed on: ${currentUrl}`);

  await incognitoContext.close();
  await browser.close();

  // 13. Data Cleanup
  console.log('Cleaning up QA test data...');
  await prisma.paymentOrder.deleteMany({
    where: { id: { in: qaOrders } },
  });
  console.log('Cleaned up QA test data.');

  await prisma.$disconnect();

  const auditReport = {
    tc_004_008_pass: !hasCashInOnlineFilter && allRowsAreOnline,
    tc_004_009_pass: fs.existsSync(csvPath) && csvLines.length > 1 && csvHeaders.includes('Booking ID'),
    csv_headers: csvHeaders,
    csv_line_count: csvLines.length,
    unauthenticated_redirect_target: currentUrl,
    network_requests_count: networkRequests.length,
    console_error_count: consoleLogs.filter((l) => l.type === 'error').length,
  };

  fs.writeFileSync(path.join(ARTIFACT_DIR, 'audit_execution_summary.json'), JSON.stringify(auditReport, null, 2));
  console.log('=== Audit Execution Finished Successfully ===');
  console.log(auditReport);
}

main().catch(async (e) => {
  console.error('Audit execution error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
