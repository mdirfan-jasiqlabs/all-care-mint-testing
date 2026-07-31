const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

async function main() {
  console.log('====================================================');
  console.log('  MOD-004 Payment Processing QA Audit & Verification ');
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

  // 1. SETUP TEST ACCOUNTS & GET REAL JWT TOKENS
  console.log('--- 1. Setup Test Accounts & Fetch Real JWT Tokens ---');
  let customer = await prisma.customer.findFirst({ where: { mobileNumber: '+919876544001' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        mobileNumber: '+919876544001',
        displayName: 'QA Payment Customer',
      },
    });
  }

  let provider = await prisma.provider.findFirst({ where: { mobileNumber: '+919876544002' } });
  if (!provider) {
    provider = await prisma.provider.create({
      data: {
        mobileNumber: '+919876544002',
        displayName: 'QA Payment Provider',
        serviceArea: 'Koramangala, Bengaluru',
        status: 'APPROVED',
      },
    });
  }

  const hashedPassword = await bcrypt.hash('Password@123', 10);
  let admin = await prisma.adminUser.findFirst({ where: { email: 'admin_payment_qa@allcare.com' } });
  if (!admin) {
    admin = await prisma.adminUser.create({
      data: {
        email: 'admin_payment_qa@allcare.com',
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
    body: JSON.stringify({ mobileNumber: '9876544001', role: 'CUSTOMER' }),
  });
  const custRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '9876544001', otp: '123456', role: 'CUSTOMER' }),
  });
  const custAuth = await custRes.json();
  const customerToken = custAuth.data?.accessToken || custAuth.accessToken;

  // Provider Token via OTP
  await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '9876544002', role: 'PROVIDER' }),
  });
  const provRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '9876544002', otp: '123456', role: 'PROVIDER' }),
  });
  const provAuth = await provRes.json();
  const providerToken = provAuth.data?.accessToken || provAuth.accessToken;

  // Admin Token via Admin Login
  const adminRes = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin_payment_qa@allcare.com', password: 'Password@123' }),
  });
  const adminAuth = await adminRes.json();
  const adminToken = adminAuth.data?.accessToken || adminAuth.accessToken;

  assert(Boolean(customerToken && providerToken && adminToken), 'Setup: Authenticated Customer, Provider, and Admin users with real tokens');

  let createdRazorpayOrderId = null;
  let createdPaymentOrderId = null;
  let cashPaymentOrderId = null;

  // 2. TEST ONLINE PAYMENT INITIATION (US-004-001)
  console.log('\n--- 2. Testing Customer Online Payment Initiation (US-004-001) ---');
  try {
    const res = await fetch(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bookingDraftId: 'draft_qa_004_1',
        amountInr: 750,
      }),
    });
    const data = await res.json();
    assert(res.status === 201 && data.success === true, 'TC-004-001: POST /payments/initiate returns HTTP 201', JSON.stringify(data));
    assert(data.data?.razorpay_order_id && data.data?.amount_paise === 75000, 'TC-004-001: Returns razorpay_order_id and correct amount in paise', JSON.stringify(data));

    if (data.data?.payment_order_id) {
      createdPaymentOrderId = data.data.payment_order_id;
      createdRazorpayOrderId = data.data.razorpay_order_id;

      const dbOrder = await prisma.paymentOrder.findUnique({ where: { id: createdPaymentOrderId } });
      assert(dbOrder && dbOrder.status === 'PAYMENT_PENDING', 'TC-004-001: PaymentOrder created in DB with status PAYMENT_PENDING');
    }
  } catch (e) {
    assert(false, 'TC-004-001: Initiate online payment exception', e.message);
  }

  // 3. TEST INVALID WEBHOOK SIGNATURE (US-004-001 Error 8B)
  console.log('\n--- 3. Testing Webhook Invalid Signature Security Gate (US-004-001) ---');
  try {
    const res = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'invalid_signature_xyz_123',
      },
      body: JSON.stringify({
        event: 'payment.captured',
        razorpay_order_id: createdRazorpayOrderId,
      }),
    });
    assert(res.status === 400, 'TC-004-004: Invalid HMAC signature webhook returns HTTP 400 Bad Request', `HTTP ${res.status}`);

    if (createdPaymentOrderId) {
      const dbOrder = await prisma.paymentOrder.findUnique({ where: { id: createdPaymentOrderId } });
      assert(dbOrder && dbOrder.status === 'PAYMENT_PENDING', 'TC-004-004: Payment status remains PAYMENT_PENDING on signature failure');
    }
  } catch (e) {
    assert(false, 'TC-004-004: Invalid signature test exception', e.message);
  }

  // 4. TEST VALID WEBHOOK CAPTURE (US-004-001 & US-004-002)
  console.log('\n--- 4. Testing Razorpay Webhook Payment Captured (US-004-002) ---');
  const mockPaymentId = `pay_qa_${Date.now()}`;
  try {
    const res = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'valid_mock_signature',
      },
      body: JSON.stringify({
        event: 'payment.captured',
        razorpay_order_id: createdRazorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        payload: {
          payment: {
            entity: {
              id: mockPaymentId,
              order_id: createdRazorpayOrderId,
            },
          },
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 || res.status === 201, 'TC-004-002: Valid payment.captured webhook returns HTTP 200/201', JSON.stringify(data));

    if (createdPaymentOrderId) {
      const dbOrder = await prisma.paymentOrder.findUnique({ where: { id: createdPaymentOrderId } });
      assert(dbOrder && dbOrder.status === 'PAYMENT_SUCCESS', 'TC-004-002: PaymentOrder status updated to PAYMENT_SUCCESS in DB');
    }
  } catch (e) {
    assert(false, 'TC-004-002: Valid webhook capture exception', e.message);
  }

  // 5. TEST DUPLICATE WEBHOOK IDEMPOTENCY (US-004-002)
  console.log('\n--- 5. Testing Webhook Idempotency (US-004-002) ---');
  try {
    const res = await fetch(`${API_BASE}/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'valid_mock_signature',
      },
      body: JSON.stringify({
        event: 'payment.captured',
        razorpay_order_id: createdRazorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        payload: {
          payment: {
            entity: {
              id: mockPaymentId,
              order_id: createdRazorpayOrderId,
            },
          },
        },
      }),
    });
    const data = await res.json();
    assert(res.status === 200 || res.status === 201, 'TC-004-003: Duplicate webhook call returns HTTP 200/201', JSON.stringify(data));
    assert(data.message && data.message.includes('idempotent'), 'TC-004-003: Response contains idempotency message', JSON.stringify(data));
  } catch (e) {
    assert(false, 'TC-004-003: Webhook idempotency exception', e.message);
  }

  // 6. TEST PAYMENT STATUS CHECK (US-004-001)
  console.log('\n--- 6. Testing Payment Status Check API (US-004-001) ---');
  try {
    const res = await fetch(`${API_BASE}/payments/status/${createdRazorpayOrderId}`);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'TC-004-005: GET /payments/status/:order_id returns HTTP 200');
    assert(data.data?.status === 'PAYMENT_SUCCESS', 'TC-004-005: Status endpoint returns PAYMENT_SUCCESS', JSON.stringify(data));
  } catch (e) {
    assert(false, 'TC-004-005: Payment status check exception', e.message);
  }

  // 7. SETUP CASH PAYMENT & ADMIN LEDGER (US-004-003 & US-004-004)
  console.log('\n--- 7. Testing Admin Cash Reconciliation Ledger & Settlement (US-004-003 & US-004-004) ---');
  try {
    const cashOrder = await prisma.paymentOrder.create({
      data: {
        customerId: customer.id,
        amountPaise: 120000,
        paymentMethod: 'CASH_ON_SERVICE',
        status: 'CASH_PENDING',
      },
    });
    cashPaymentOrderId = cashOrder.id;

    // List payments
    const listRes = await fetch(`${API_BASE}/admin/payments?method=CASH`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listData = await listRes.json();
    assert(listRes.status === 200 && listData.success === true, 'TC-004-006: GET /admin/payments returns HTTP 200 for Admin', `HTTP ${listRes.status} Body: ${JSON.stringify(listData)}`);
    assert(Array.isArray(listData.data?.data) && listData.data.data.some(i => i.id === cashPaymentOrderId), 'TC-004-006: Cash payment appears in admin list', `Found: ${JSON.stringify(listData.data?.data)}`);

    // CSV Export
    const csvRes = await fetch(`${API_BASE}/admin/payments?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const csvText = await csvRes.text();
    assert(csvRes.status === 200 && csvText.includes('Amount (INR)'), 'TC-004-009: GET /admin/payments?format=csv returns CSV content with headers', `HTTP ${csvRes.status} Body: ${csvText.substring(0, 200)}`);

    // Settle cash payment
    const settleRes = await fetch(`${API_BASE}/admin/payments/${cashPaymentOrderId}/settle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const settleData = await settleRes.json();
    assert(settleRes.status === 200 && settleData.data?.status === 'CASH_SETTLED', 'TC-004-007: PATCH /admin/payments/:id/settle updates status to CASH_SETTLED', JSON.stringify(settleData));
  } catch (e) {
    assert(false, 'TC-004-006/007: Admin cash reconciliation exception', e.message);
  }

  // 8. TEST PROVIDER EARNINGS (US-004-005)
  console.log('\n--- 8. Testing Provider Earnings Summary (US-004-005) ---');
  try {
    const res = await fetch(`${API_BASE}/providers/me/earnings`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const data = await res.json();
    assert(res.status === 200 && data.success === true, 'TC-004-010: GET /providers/me/earnings returns HTTP 200');
    assert(typeof data.data?.total_earnings_inr === 'number' && Array.isArray(data.data?.jobs), 'TC-004-010: Earnings response contains total_earnings_inr and jobs array', JSON.stringify(data));
  } catch (e) {
    assert(false, 'TC-004-010: Provider earnings exception', e.message);
  }

  // CLEANUP
  console.log('\n--- 9. Cleaning Up Test DB Records ---');
  await prisma.paymentOrder.deleteMany({
    where: { customerId: customer.id },
  });

  console.log('\n====================================================');
  console.log(`  QA Audit Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal audit error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
