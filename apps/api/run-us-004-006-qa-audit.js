const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load root .env file without external dotenv dependency
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of envLines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const prisma = new PrismaClient();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const privateKey = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret';

function computeSignature(payloadObj) {
  const rawBody = JSON.stringify(payloadObj);
  return crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
}

async function main() {
  console.log('================================================================');
  console.log('  US-004-006 Payment Failure Handling & Retry UI Standalone QA');
  console.log('================================================================\n');

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

  // 1. SETUP TEST ACCOUNTS & GET REAL TOKENS
  console.log('--- 1. Setup Test Accounts & Tokens ---');
  let customerA = await prisma.customer.findFirst({ where: { mobileNumber: '+919999004006' } });
  if (!customerA) {
    customerA = await prisma.customer.create({
      data: {
        mobileNumber: '+919999004006',
        displayName: 'QA US-004-006 Customer A',
      },
    });
  }

  let customerB = await prisma.customer.findFirst({ where: { mobileNumber: '+919999004007' } });
  if (!customerB) {
    customerB = await prisma.customer.create({
      data: {
        mobileNumber: '+919999004007',
        displayName: 'QA US-004-006 Customer B',
      },
    });
  }

  const tokenA = jwt.sign(
    { sub: customerA.id, id: customerA.id, role: 'CUSTOMER', mobile_number: customerA.mobileNumber },
    privateKey,
    { algorithm: 'RS256', expiresIn: '1h' }
  );

  const tokenB = jwt.sign(
    { sub: customerB.id, id: customerB.id, role: 'CUSTOMER', mobile_number: customerB.mobileNumber },
    privateKey,
    { algorithm: 'RS256', expiresIn: '1h' }
  );

  let service = await prisma.service.findFirst({ where: { isActive: true } });
  if (!service) {
    let cat = await prisma.serviceCategory.findFirst();
    if (!cat) {
      cat = await prisma.serviceCategory.create({ data: { name: 'Audit Cat' } });
    }
    service = await prisma.service.create({
      data: { name: 'QA Test Service', fixedPrice: 499, categoryId: cat.id },
    });
  }

  let addressA = await prisma.customerAddress.findFirst({ where: { customerId: customerA.id } });
  if (!addressA) {
    addressA = await prisma.customerAddress.create({
      data: {
        customerId: customerA.id,
        label: 'Home',
        addressLine1: '123 QA Lane',
        city: 'Bengaluru',
        pincode: '560001',
      },
    });
  }

  let slot = await prisma.bookingTimeSlot.findFirst({ where: { isActive: true } });
  if (!slot) {
    slot = await prisma.bookingTimeSlot.create({
      data: { startTime: '09:00', endTime: '10:00', label: '09:00 AM - 10:00 AM' },
    });
  }

  const testSlotDate = '2026-08-28';
  console.log(`Customer A ID: ${customerA.id}`);
  console.log(`Customer B ID: ${customerB.id}`);
  console.log(`Service ID: ${service.id}`);
  console.log(`Address A ID: ${addressA.id}`);
  console.log(`Slot ID: ${slot.id}\n`);

  // 2. MANDATORY RUNTIME SCENARIO & AC-004-005 AUDIT
  console.log('--- 2. Mandatory AC-004-005 Execution ---');
  // Lock Slot
  const lockRes = await fetch(`${API_BASE}/bookings/slots/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ slotId: slot.id, date: testSlotDate }),
  });
  assert(lockRes.status === 201, 'Lock slot returns HTTP 201', `Status: ${lockRes.status}`);

  // Initiate Online Payment
  const draftId = `draft_standalone_${Date.now()}`;
  const initRes = await fetch(`${API_BASE}/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      bookingDraftId: draftId,
      serviceId: service.id,
      slotId: slot.id,
      slotDate: testSlotDate,
      addressId: addressA.id,
      amountInr: parseFloat(service.fixedPrice.toString()),
    }),
  });
  const initData = await initRes.json();
  assert(initRes.status === 201 && initData.success === true, 'Initiate online payment returns HTTP 201', `Data: ${JSON.stringify(initData)}`);

  const razorpayOrderId = initData.data.razorpay_order_id;
  const onlinePaymentOrderId = initData.data.payment_order_id;
  console.log(`Generated Razorpay Order ID: ${razorpayOrderId}`);
  console.log(`Generated Payment Order ID: ${onlinePaymentOrderId}`);

  // Initial DB check: status = PAYMENT_PENDING
  const dbOrderPending = await prisma.paymentOrder.findUnique({ where: { id: onlinePaymentOrderId } });
  assert(dbOrderPending.status === 'PAYMENT_PENDING', 'Payment order initially in PAYMENT_PENDING state', `Status: ${dbOrderPending.status}`);
  assert(dbOrderPending.bookingId === null, 'No booking created initially for payment order');

  // Trigger payment.failed webhook
  const failPayload = {
    event: 'payment.failed',
    razorpay_order_id: razorpayOrderId,
    payload: {
      payment: {
        entity: {
          id: `pay_fail_standalone_${Date.now()}`,
          order_id: razorpayOrderId,
          error_description: 'Issuer bank authentication failed',
        },
      },
    },
  };
  const failWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': computeSignature(failPayload),
    },
    body: JSON.stringify(failPayload),
  });
  assert(failWebhookRes.status === 201 || failWebhookRes.status === 200, 'payment.failed webhook accepted HTTP 201/200');

  // DB Check after failure webhook
  const dbOrderFailed = await prisma.paymentOrder.findUnique({ where: { id: onlinePaymentOrderId } });
  assert(dbOrderFailed.status === 'PAYMENT_FAILED', 'Payment order status transitioned to PAYMENT_FAILED', `Status: ${dbOrderFailed.status}`);
  assert(dbOrderFailed.bookingId === null, 'No booking created for PAYMENT_FAILED online order');

  // Status Polling API GET /api/v1/payments/status/:order_id
  const statusPollRes = await fetch(`${API_BASE}/payments/status/${razorpayOrderId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const statusPollData = await statusPollRes.json();
  assert(statusPollRes.status === 200 && statusPollData.data.status === 'PAYMENT_FAILED', 'Status API returns status PAYMENT_FAILED to polling client', `Response: ${JSON.stringify(statusPollData)}`);

  // Switch to Cash: Create CASH_ON_SERVICE booking
  const cashIdempotencyKey = crypto.randomUUID();
  const cashRes = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      'x-idempotency-key': cashIdempotencyKey,
    },
    body: JSON.stringify({
      serviceId: service.id,
      slotId: slot.id,
      slotDate: testSlotDate,
      addressId: addressA.id,
      paymentMethod: 'CASH_ON_SERVICE',
    }),
  });
  const cashData = await cashRes.json();
  assert(cashRes.status === 201 && cashData.success === true, 'Pay with Cash fallback creates CASH booking HTTP 201', `Data: ${JSON.stringify(cashData)}`);
  const cashBookingId = cashData.data.bookingId;

  // AC-004-005 Core DB Verifications:
  // 1. Original failed payment_orders row remains present with status PAYMENT_FAILED
  const dbOriginalAfterCash = await prisma.paymentOrder.findUnique({ where: { id: onlinePaymentOrderId } });
  assert(dbOriginalAfterCash.status === 'PAYMENT_FAILED', 'AC-004-005: Original payment_orders status remains PAYMENT_FAILED', `Status: ${dbOriginalAfterCash.status}`);
  assert(dbOriginalAfterCash.razorpayOrderId === razorpayOrderId, 'AC-004-005: Original Razorpay order ID preserved', `ID: ${dbOriginalAfterCash.razorpayOrderId}`);
  assert(dbOriginalAfterCash.paymentMethod === 'ONLINE', 'AC-004-005: Original payment method remains ONLINE', `Method: ${dbOriginalAfterCash.paymentMethod}`);
  assert(dbOriginalAfterCash.bookingId === null, 'AC-004-005: Original failed online payment order is not linked to cash booking');

  // 2. Exactly 1 CASH booking created and 1 CASH_PENDING payment order row created
  const cashBookingInDb = await prisma.booking.findUnique({ where: { id: cashBookingId } });
  assert(cashBookingInDb !== null && cashBookingInDb.paymentMethod === 'CASH_ON_SERVICE', 'AC-004-005: New booking created with CASH_ON_SERVICE payment method');

  const cashPaymentOrdersInDb = await prisma.paymentOrder.findMany({
    where: { bookingId: cashBookingId },
  });
  assert(cashPaymentOrdersInDb.length === 1 && cashPaymentOrdersInDb[0].status === 'CASH_PENDING', 'AC-004-005: New CASH_PENDING payment order created for cash booking');

  // 3. BOLA & Authorization Checks
  console.log('\n--- 3. Authorization & BOLA Controls ---');
  // Unauthenticated status poll -> 401
  const unauthRes = await fetch(`${API_BASE}/payments/status/${razorpayOrderId}`);
  assert(unauthRes.status === 401, 'Unauthenticated status poll returns HTTP 401');

  // Customer B accessing Customer A status -> 403
  const bolaRes = await fetch(`${API_BASE}/payments/status/${razorpayOrderId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert(bolaRes.status === 403, 'Customer B attempting to inspect Customer A payment order returns HTTP 403 Forbidden');

  // 4. LATE WEBHOOK RACE CONDITION AUDIT (DEF-006-003)
  console.log('\n--- 4. Late Webhook Race Condition Audit (DEF-006-003) ---');
  const lateCapturedPayload = {
    event: 'payment.captured',
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: `pay_late_${Date.now()}`,
    payload: {
      payment: {
        entity: { id: `pay_late_${Date.now()}`, order_id: razorpayOrderId, amount: 49900, currency: 'INR' },
      },
    },
  };
  const lateWebhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': computeSignature(lateCapturedPayload),
    },
    body: JSON.stringify(lateCapturedPayload),
  });
  assert(lateWebhookRes.status === 201 || lateWebhookRes.status === 200, 'Late payment.captured webhook processed without crash HTTP 201/200');

  const onlineOrderAfterLateWebhook = await prisma.paymentOrder.findUnique({ where: { id: onlinePaymentOrderId } });
  assert(onlineOrderAfterLateWebhook.status === 'PAYMENT_SUCCESS', 'DEF-006-003: Online payment order status updated to PAYMENT_SUCCESS on late capture', `Status: ${onlineOrderAfterLateWebhook.status}`);
  assert(onlineOrderAfterLateWebhook.bookingId === cashBookingId, 'DEF-006-003: Online payment order linked to EXISTING cash booking ID (no duplicate booking created)', `Linked ID: ${onlineOrderAfterLateWebhook.bookingId}`);

  const cashOrderAfterLateWebhook = await prisma.paymentOrder.findFirst({
    where: { bookingId: cashBookingId, paymentMethod: 'CASH_ON_SERVICE' },
  });
  assert(cashOrderAfterLateWebhook !== null && cashOrderAfterLateWebhook.status === 'CANCELLED', 'Financial Reconciliation: Cash payment order status transitioned to CANCELLED (superseded)', `Status: ${cashOrderAfterLateWebhook?.status}`);
  assert(cashOrderAfterLateWebhook.failureReason.includes('Superseded'), 'Financial Reconciliation: Cash payment order failureReason records audit trace');

  const cashBookingAfterLateWebhook = await prisma.booking.findUnique({ where: { id: cashBookingId } });
  assert(cashBookingAfterLateWebhook.paymentMethod === 'ONLINE', 'Financial Reconciliation: Booking paymentMethod updated to ONLINE', `Method: ${cashBookingAfterLateWebhook.paymentMethod}`);

  // Admin settlement attempt on CANCELLED cash order -> HTTP 409 Conflict
  const settleRes = await fetch(`${API_BASE}/admin/payments/${cashOrderAfterLateWebhook.id}/settle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tokenAdmin}` },
  });
  assert(settleRes.status === 409, 'Financial Reconciliation: Admin attempting to settle CANCELLED cash payment returns HTTP 409 Conflict', `Status: ${settleRes.status}`);

  const totalBookingsForIntent = await prisma.booking.count({
    where: {
      customerId: customerA.id,
      slotId: slot.id,
      slotDate: new Date(testSlotDate),
      status: { not: 'CANCELLED' },
    },
  });
  assert(totalBookingsForIntent === 1, 'DEF-006-003: Total non-cancelled bookings for booking intent is EXACTLY 1', `Total: ${totalBookingsForIntent}`);

  // Summary
  console.log('\n================================================================');
  console.log(`  QA Audit Result: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error in standalone QA script:', err);
  process.exit(1);
});
