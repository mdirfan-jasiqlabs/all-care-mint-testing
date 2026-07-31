const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function main() {
  console.log('====================================================');
  console.log('  US-004-003 Complete Independent QA Audit Runner   ');
  console.log('====================================================\n');

  let passedTests = 0;
  let failedTests = 0;
  const defects = [];

  function assert(condition, testName, failureDetail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (failureDetail) console.error(`     Details: ${failureDetail}`);
      failedTests++;
      defects.push({ testName, failureDetail });
    }
  }

  try {
    // 1. SETUP TEST ACCOUNTS & GET REAL JWT TOKENS
    console.log('--- 1. Setup Test Accounts & Fetch Real JWT Tokens ---');
    let customer = await prisma.customer.findFirst({ where: { mobileNumber: '+919876544301' } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          mobileNumber: '+919876544301',
          displayName: 'QA US-004-003 Customer',
        },
      });
    }

    let provider = await prisma.provider.findFirst({ where: { mobileNumber: '+919876544302' } });
    if (!provider) {
      provider = await prisma.provider.create({
        data: {
          mobileNumber: '+919876544302',
          displayName: 'QA US-004-003 Provider',
          serviceArea: 'Indiranagar, Bengaluru',
          status: 'APPROVED',
        },
      });
    }

    const hashedPassword = await bcrypt.hash('Password@123', 10);
    let admin = await prisma.adminUser.findFirst({ where: { email: 'admin_qa_004_003@allcare.com' } });
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email: 'admin_qa_004_003@allcare.com',
          passwordHash: hashedPassword,
        },
      });
    } else {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash: hashedPassword, isSuspended: false, failedAttempts: 0 },
      });
    }

    // Customer Token via OTP
    await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9876544301', role: 'CUSTOMER' }),
    });
    const custRes = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9876544301', otp: '123456', role: 'CUSTOMER' }),
    });
    const custAuth = await custRes.json();
    const customerToken = custAuth.data?.accessToken || custAuth.accessToken;

    // Provider Token via OTP
    await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9876544302', role: 'PROVIDER' }),
    });
    const provRes = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9876544302', otp: '123456', role: 'PROVIDER' }),
    });
    const provAuth = await provRes.json();
    const providerToken = provAuth.data?.accessToken || provAuth.accessToken;

    // Admin Token via Admin Login
    const adminRes = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin_qa_004_003@allcare.com', password: 'Password@123' }),
    });
    const adminAuth = await adminRes.json();
    const adminToken = adminAuth.data?.accessToken || adminAuth.accessToken;

    assert(Boolean(customerToken), 'Customer JWT acquired successfully');
    assert(Boolean(providerToken), 'Provider JWT acquired successfully');
    assert(Boolean(adminToken), 'Admin JWT acquired successfully');

    // SETUP TEST FIXTURES IN DB
    console.log('\n--- 2. Creating Fixture Records in Database ---');
    let category = await prisma.serviceCategory.findFirst({ where: { name: 'QA Ledger Category' } });
    if (!category) {
      category = await prisma.serviceCategory.create({
        data: { name: 'QA Ledger Category' },
      });
    }

    let service = await prisma.service.findFirst({ where: { name: 'QA Deep Cleaning' } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          categoryId: category.id,
          name: 'QA Deep Cleaning',
          fixedPrice: 1999,
        },
      });
    }

    let address = await prisma.customerAddress.findFirst({ where: { customerId: customer.id } });
    if (!address) {
      address = await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: 'Home',
          addressLine1: '456 QA Blvd',
          city: 'Bengaluru',
          pincode: '560008',
        },
      });
    }

    let slot = await prisma.bookingTimeSlot.findFirst();
    if (!slot) {
      slot = await prisma.bookingTimeSlot.create({
        data: {
          label: '02:00 PM - 03:00 PM',
          startTime: new Date('2026-08-15T14:00:00Z'),
          endTime: new Date('2026-08-15T15:00:00Z'),
        },
      });
    }

    // Helper to create booking and payment order
    async function createTestBookingAndPayment(paymentMethod, status, suffix) {
      const bookingRef = `ACM-20260815-${suffix}`;
      const booking = await prisma.booking.create({
        data: {
          bookingReference: bookingRef,
          customerId: customer.id,
          providerId: provider.id,
          serviceId: service.id,
          slotId: slot.id,
          addressId: address.id,
          slotDate: new Date('2026-08-15'),
          status: 'COMPLETED',
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: 1999,
        },
      });

      const paymentOrder = await prisma.paymentOrder.create({
        data: {
          customerId: customer.id,
          bookingId: booking.id,
          amountPaise: 199900,
          paymentMethod,
          status,
          razorpayOrderId: paymentMethod === 'ONLINE' ? `order_qa_${suffix}` : null,
          razorpayPaymentId: status === 'PAYMENT_SUCCESS' ? `pay_qa_${suffix}` : null,
        },
      });

      return { booking, paymentOrder };
    }

    const cashOrder1 = await createTestBookingAndPayment('CASH_ON_SERVICE', 'CASH_PENDING', 'CASH1');
    const cashOrder2 = await createTestBookingAndPayment('CASH_ON_SERVICE', 'CASH_PENDING', 'CONCUR1');
    const cashSettledOrder = await createTestBookingAndPayment('CASH_ON_SERVICE', 'CASH_SETTLED', 'SETTLED1');
    const onlineSuccessOrder = await createTestBookingAndPayment('ONLINE', 'PAYMENT_SUCCESS', 'ONSUCC1');
    const onlinePendingOrder = await createTestBookingAndPayment('ONLINE', 'PAYMENT_PENDING', 'ONPEND1');
    const paymentFailedOrder = await createTestBookingAndPayment('ONLINE', 'PAYMENT_FAILED', 'ONFAIL1');

    console.log(`Created Cash Pending Order 1: ${cashOrder1.paymentOrder.id}`);
    console.log(`Created Cash Pending Order 2 (Concurrency): ${cashOrder2.paymentOrder.id}`);

    // SECTION A: AUTHORIZATION & ROLE VERIFICATION
    console.log('\n--- 3. Authorization & Role Verification ---');

    // GET /admin/payments with missing JWT -> 401
    const noJwtGet = await fetch(`${API_BASE}/admin/payments`);
    assert(noJwtGet.status === 401, 'GET /admin/payments without JWT returns HTTP 401', `Status: ${noJwtGet.status}`);

    // GET /admin/payments with Customer JWT -> 403
    const custJwtGet = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custJwtGet.status === 403, 'GET /admin/payments with Customer JWT returns HTTP 403', `Status: ${custJwtGet.status}`);

    // GET /admin/payments with Provider JWT -> 403
    const provJwtGet = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    assert(provJwtGet.status === 403, 'GET /admin/payments with Provider JWT returns HTTP 403', `Status: ${provJwtGet.status}`);

    // GET /admin/payments with Invalid JWT -> 401
    const invalidJwtGet = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert(invalidJwtGet.status === 401, 'GET /admin/payments with Invalid JWT returns HTTP 401', `Status: ${invalidJwtGet.status}`);

    // GET /admin/payments with Admin JWT -> 200
    const adminJwtGet = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminJwtGet.status === 200, 'GET /admin/payments with valid Admin JWT returns HTTP 200', `Status: ${adminJwtGet.status}`);

    // PATCH /admin/payments/:id/settle with missing JWT -> 401
    const noJwtPatch = await fetch(`${API_BASE}/admin/payments/${cashOrder1.paymentOrder.id}/settle`, {
      method: 'PATCH',
    });
    assert(noJwtPatch.status === 401, 'PATCH /admin/payments/:id/settle without JWT returns HTTP 401', `Status: ${noJwtPatch.status}`);

    // PATCH /admin/payments/:id/settle with Customer JWT -> 403
    const custJwtPatch = await fetch(`${API_BASE}/admin/payments/${cashOrder1.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(custJwtPatch.status === 403, 'PATCH /admin/payments/:id/settle with Customer JWT returns HTTP 403', `Status: ${custJwtPatch.status}`);

    // PATCH /admin/payments/:id/settle with Provider JWT -> 403
    const provJwtPatch = await fetch(`${API_BASE}/admin/payments/${cashOrder1.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    assert(provJwtPatch.status === 403, 'PATCH /admin/payments/:id/settle with Provider JWT returns HTTP 403', `Status: ${provJwtPatch.status}`);

    // SECTION B: LEDGER RESPONSE FORMAT VERIFICATION
    console.log('\n--- 4. Ledger Response Verification ---');
    const ledgerRes = await fetch(`${API_BASE}/admin/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerData.success === true && Array.isArray(ledgerData.data?.data), 'Response structure contains success=true and data.data array');
    
    const record = ledgerData.data?.data?.find((i) => i.id === cashOrder1.paymentOrder.id);
    assert(Boolean(record), 'Created test payment record found in ledger');
    if (record) {
      assert(record.booking_id === cashOrder1.booking.bookingReference, 'Ledger maps booking_id to bookingReference', `Got: ${record.booking_id}`);
      assert(record.customer_name === 'QA US-004-003 Customer', 'Ledger maps customer_name correctly', `Got: ${record.customer_name}`);
      assert(record.service_name === 'QA Deep Cleaning', 'Ledger maps service_name correctly', `Got: ${record.service_name}`);
      assert(record.provider_name === 'QA US-004-003 Provider', 'Ledger maps provider_name correctly', `Got: ${record.provider_name}`);
      assert(record.amount_inr === 1999, 'Ledger converts amountPaise to amount_inr correctly', `Got: ${record.amount_inr}`);
      assert(record.payment_method === 'CASH', 'Ledger maps CASH_ON_SERVICE to CASH', `Got: ${record.payment_method}`);
      assert(record.status === 'CASH_PENDING', 'Ledger status matches DB status', `Got: ${record.status}`);
      assert(Boolean(record.date), 'Ledger includes valid ISO date string');
      assert(!record.passwordHash && !record.secret, 'No sensitive authentication secrets exposed in ledger item');
    }

    // SECTION C: QUERY FILTERING VERIFICATION (TC-004-006)
    console.log('\n--- 5. Query Filtering Verification (TC-004-006) ---');

    // method=CASH
    const cashFilterRes = await fetch(`${API_BASE}/admin/payments?method=CASH`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const cashFilterData = await cashFilterRes.json();
    const cashItems = cashFilterData.data?.data || [];
    const onlyCash = cashItems.every((i) => i.payment_method === 'CASH');
    const hasCashOrder = cashItems.some((i) => i.id === cashOrder1.paymentOrder.id);
    const noOnlineInCash = !cashItems.some((i) => i.id === onlineSuccessOrder.paymentOrder.id);
    assert(onlyCash && hasCashOrder && noOnlineInCash, 'TC-004-006: method=CASH returns only CASH records and no ONLINE records');

    // method=ONLINE
    const onlineFilterRes = await fetch(`${API_BASE}/admin/payments?method=ONLINE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const onlineFilterData = await onlineFilterRes.json();
    const onlineItems = onlineFilterData.data?.data || [];
    const onlyOnline = onlineItems.every((i) => i.payment_method === 'ONLINE');
    const hasOnlineOrder = onlineItems.some((i) => i.id === onlineSuccessOrder.paymentOrder.id);
    const noCashInOnline = !onlineItems.some((i) => i.id === cashOrder1.paymentOrder.id);
    assert(onlyOnline && hasOnlineOrder && noCashInOnline, 'TC-004-006: method=ONLINE returns only ONLINE records and no CASH records');

    // status=CASH_PENDING
    const pendingFilterRes = await fetch(`${API_BASE}/admin/payments?status=CASH_PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pendingFilterData = await pendingFilterRes.json();
    const pendingItems = pendingFilterData.data?.data || [];
    const onlyPending = pendingItems.every((i) => i.status === 'CASH_PENDING');
    assert(onlyPending && pendingItems.some((i) => i.id === cashOrder1.paymentOrder.id), 'status=CASH_PENDING returns only CASH_PENDING records');

    // status=PAYMENT_SUCCESS
    const successFilterRes = await fetch(`${API_BASE}/admin/payments?status=PAYMENT_SUCCESS`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const successFilterData = await successFilterRes.json();
    const successItems = successFilterData.data?.data || [];
    const onlySuccess = successItems.every((i) => i.status === 'PAYMENT_SUCCESS');
    assert(onlySuccess && successItems.some((i) => i.id === onlineSuccessOrder.paymentOrder.id), 'status=PAYMENT_SUCCESS returns only PAYMENT_SUCCESS records');

    // Combined method=CASH&status=CASH_PENDING
    const combinedRes = await fetch(`${API_BASE}/admin/payments?method=CASH&status=CASH_PENDING`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const combinedData = await combinedRes.json();
    const combinedItems = combinedData.data?.data || [];
    const matchCombined = combinedItems.every((i) => i.payment_method === 'CASH' && i.status === 'CASH_PENDING');
    assert(matchCombined, 'Combined filter method=CASH&status=CASH_PENDING works correctly');

    // Date range filter
    const today = new Date().toISOString().split('T')[0];
    const dateRangeRes = await fetch(`${API_BASE}/admin/payments?date_from=${today}&date_to=${today}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(dateRangeRes.status === 200, 'date_from and date_to filter returns HTTP 200');

    // Invalid method filter -> HTTP 400
    const invalidMethodRes = await fetch(`${API_BASE}/admin/payments?method=BITCOIN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidMethodRes.status === 400, 'Unsupported method=BITCOIN returns controlled HTTP 400', `Status: ${invalidMethodRes.status}`);

    // Invalid status filter -> HTTP 400
    const invalidStatusRes = await fetch(`${API_BASE}/admin/payments?status=FOOBAR`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidStatusRes.status === 400, 'Unsupported status=FOOBAR returns controlled HTTP 400', `Status: ${invalidStatusRes.status}`);

    // Invalid date format -> HTTP 400
    const invalidDateRes = await fetch(`${API_BASE}/admin/payments?date_from=not-a-date`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invalidDateRes.status === 400, 'Invalid date_from format returns controlled HTTP 400', `Status: ${invalidDateRes.status}`);

    // Inverted date range -> HTTP 400
    const invertedDateRes = await fetch(`${API_BASE}/admin/payments?date_from=2026-12-31&date_to=2026-01-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(invertedDateRes.status === 400, 'date_from after date_to returns controlled HTTP 400', `Status: ${invertedDateRes.status}`);

    // SECTION D: PAGINATION VERIFICATION
    console.log('\n--- 6. Pagination Verification ---');

    // Default pagination metadata
    assert(ledgerData.data?.meta?.page === 1, 'Default page is 1');
    assert(ledgerData.data?.meta?.page_size === 20, 'Default page_size is 20');
    assert(typeof ledgerData.data?.meta?.total === 'number', 'Total count is provided');
    assert(typeof ledgerData.data?.meta?.total_pages === 'number', 'Total pages count is provided');

    // Custom limit & page navigation
    const p1Res = await fetch(`${API_BASE}/admin/payments?page=1&page_size=2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const p1Data = await p1Res.json();
    const p2Res = await fetch(`${API_BASE}/admin/payments?page=2&page_size=2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const p2Data = await p2Res.json();

    assert(p1Data.data?.data?.length <= 2, 'page_size=2 returns at most 2 records for page 1');
    assert(p2Data.data?.data?.length <= 2, 'page_size=2 returns at most 2 records for page 2');
    
    // Check no duplicate IDs between adjacent pages
    const p1Ids = new Set((p1Data.data?.data || []).map((i) => i.id));
    const p2Ids = (p2Data.data?.data || []).map((i) => i.id);
    const hasOverlap = p2Ids.some((id) => p1Ids.has(id));
    assert(!hasOverlap, 'No duplicate records between adjacent pages (page=1 & page=2)');

    // Invalid page=0 -> HTTP 400
    const pageZeroRes = await fetch(`${API_BASE}/admin/payments?page=0`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(pageZeroRes.status === 400, 'page=0 returns controlled HTTP 400', `Status: ${pageZeroRes.status}`);

    // Invalid page=-1 -> HTTP 400
    const negPageRes = await fetch(`${API_BASE}/admin/payments?page=-1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(negPageRes.status === 400, 'page=-1 returns controlled HTTP 400', `Status: ${negPageRes.status}`);

    // Invalid limit=0 -> HTTP 400
    const limitZeroRes = await fetch(`${API_BASE}/admin/payments?page_size=0`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(limitZeroRes.status === 400, 'page_size=0 returns controlled HTTP 400', `Status: ${limitZeroRes.status}`);

    // Excessive limit=150 -> HTTP 400
    const excessiveLimitRes = await fetch(`${API_BASE}/admin/payments?page_size=150`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(excessiveLimitRes.status === 400, 'page_size=150 returns controlled HTTP 400', `Status: ${excessiveLimitRes.status}`);

    // Out of bounds page -> HTTP 200 with empty data array
    const outOfBoundsRes = await fetch(`${API_BASE}/admin/payments?page=9999`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const outOfBoundsData = await outOfBoundsRes.json();
    assert(outOfBoundsRes.status === 200 && Array.isArray(outOfBoundsData.data?.data) && outOfBoundsData.data.data.length === 0, 'page=9999 returns HTTP 200 with empty data array');

    // SECTION E: SETTLEMENT ELIGIBILITY & SAFETY VERIFICATION (TC-004-007)
    console.log('\n--- 7. Settlement Eligibility & DB State Verification (TC-004-007) ---');

    // Settle eligible cash payment (cashOrder1)
    const settleRes = await fetch(`${API_BASE}/admin/payments/${cashOrder1.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const settleData = await settleRes.json();
    assert(settleRes.status === 200, 'TC-004-007: PATCH /admin/payments/:id/settle returns HTTP 200', `Status: ${settleRes.status}`);
    assert(settleData.data?.status === 'CASH_SETTLED', 'TC-004-007: Settlement response reports status CASH_SETTLED', `Got: ${settleData.data?.status}`);

    // Verify DB state changes
    const updatedDbOrder = await prisma.paymentOrder.findUnique({
      where: { id: cashOrder1.paymentOrder.id },
    });
    assert(updatedDbOrder.status === 'CASH_SETTLED', 'TC-004-007: Database status changed to CASH_SETTLED');
    assert(updatedDbOrder.amountPaise === 199900, 'Payment amount remains unchanged in DB');
    assert(updatedDbOrder.customerId === customer.id, 'Customer linkage remains unchanged in DB');
    assert(updatedDbOrder.bookingId === cashOrder1.booking.id, 'Booking linkage remains unchanged in DB');
    assert(updatedDbOrder.paymentMethod === 'CASH_ON_SERVICE', 'Payment method remains unchanged in DB');

    // Verify linked booking state is preserved
    const updatedDbBooking = await prisma.booking.findUnique({
      where: { id: cashOrder1.booking.id },
    });
    assert(updatedDbBooking.status === 'COMPLETED', 'Linked booking status remains unchanged (COMPLETED)');

    // Attempt to settle already CASH_SETTLED payment -> HTTP 409 Conflict
    const alreadySettledRes = await fetch(`${API_BASE}/admin/payments/${cashOrder1.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(alreadySettledRes.status === 409, 'Settling an already CASH_SETTLED payment returns controlled HTTP 409 Conflict', `Status: ${alreadySettledRes.status}`);

    // Attempt to settle ONLINE PAYMENT_SUCCESS payment -> HTTP 409 Conflict
    const onlineSettledRes = await fetch(`${API_BASE}/admin/payments/${onlineSuccessOrder.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(onlineSettledRes.status === 409, 'Settling an ONLINE payment returns controlled HTTP 409 Conflict', `Status: ${onlineSettledRes.status}`);

    // Attempt to settle ONLINE PAYMENT_PENDING payment -> HTTP 409 Conflict
    const onlinePendingSettledRes = await fetch(`${API_BASE}/admin/payments/${onlinePendingOrder.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(onlinePendingSettledRes.status === 409, 'Settling a PAYMENT_PENDING online payment returns controlled HTTP 409 Conflict', `Status: ${onlinePendingSettledRes.status}`);

    // Attempt to settle PAYMENT_FAILED payment -> HTTP 409 Conflict
    const failedSettledRes = await fetch(`${API_BASE}/admin/payments/${paymentFailedOrder.paymentOrder.id}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(failedSettledRes.status === 409, 'Settling a PAYMENT_FAILED payment returns controlled HTTP 409 Conflict', `Status: ${failedSettledRes.status}`);

    // Non-existent payment ID -> HTTP 404
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const nonExistentRes = await fetch(`${API_BASE}/admin/payments/${fakeUuid}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(nonExistentRes.status === 404, 'Settling a non-existent payment ID returns HTTP 404 Not Found', `Status: ${nonExistentRes.status}`);

    // Malformed payment ID -> HTTP 404
    const malformedRes = await fetch(`${API_BASE}/admin/payments/invalid-id-format/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(malformedRes.status === 404 || malformedRes.status === 400, 'Malformed payment ID returns HTTP 404 or 400', `Status: ${malformedRes.status}`);

    // SECTION F: IDEMPOTENCY & CONCURRENCY VERIFICATION
    console.log('\n--- 8. Idempotency & Concurrency Verification ---');

    // 10 Concurrent Settle Requests to cashOrder2 (CASH_PENDING)
    console.log(`Sending 10 concurrent settle requests for cashOrder2 (${cashOrder2.paymentOrder.id})...`);
    const concurrentPromises = Array.from({ length: 10 }).map(() =>
      fetch(`${API_BASE}/admin/payments/${cashOrder2.paymentOrder.id}/settle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    const concurrentResponses = await Promise.all(concurrentPromises);
    const statuses = concurrentResponses.map((r) => r.status);
    const count200 = statuses.filter((s) => s === 200).length;
    const count409 = statuses.filter((s) => s === 409).length;

    assert(count200 === 1, 'Exactly ONE concurrent settle request returns HTTP 200', `200 count: ${count200}`);
    assert(count409 === 9, 'Remaining 9 concurrent settle requests return HTTP 409 Conflict', `409 count: ${count409}`);
    assert(!statuses.includes(500), 'Zero HTTP 500 server errors under 10 concurrent requests');

    const finalDbState = await prisma.paymentOrder.findUnique({
      where: { id: cashOrder2.paymentOrder.id },
    });
    assert(finalDbState.status === 'CASH_SETTLED', 'Final DB status after concurrent requests is CASH_SETTLED');

    // SECTION G: REGRESSION VERIFICATION
    console.log('\n--- 9. Regression Verification ---');
    const earningsRes = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    assert(earningsRes.status === 200, 'Provider earnings endpoint GET /providers/me/earnings remains operational');

    // CLEANUP
    console.log('\n--- 10. Cleaning Up Test DB Records ---');
    await prisma.paymentOrder.deleteMany({
      where: { customerId: customer.id },
    });
    await prisma.booking.deleteMany({
      where: { customerId: customer.id },
    });

    console.log('\n====================================================');
    console.log(`  QA Audit Summary: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('====================================================');

    if (failedTests > 0) {
      console.error('\nDefects Found:');
      console.error(JSON.stringify(defects, null, 2));
      process.exit(1);
    } else {
      console.log('\n🎉 ALL QA AUDIT TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal audit error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
