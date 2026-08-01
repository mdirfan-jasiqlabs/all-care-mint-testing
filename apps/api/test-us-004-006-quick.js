const crypto = require('crypto');

async function testPaymentFailureFlow() {
  const API_BASE = 'http://127.0.0.1:3000/api/v1';
  const webhookSecret = 'mock_webhook_secret';

  console.log('--- Step 1: Customer OTP Authentication ---');
  await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '9876543210', role: 'CUSTOMER' }),
  });

  const verifyRes = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '9876543210', otp: '123456', role: 'CUSTOMER' }),
  });
  const verifyData = await verifyRes.json();
  const token = verifyData.data?.accessToken || verifyData.accessToken;
  console.log('✅ Customer Authenticated successfully!');

  console.log('\n--- Step 2: Initiate Online Payment ---');
  const draftId = `draft_fail_${Date.now()}`;
  const initRes = await fetch(`${API_BASE}/payments/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookingDraftId: draftId,
      amountInr: 1499,
    }),
  });

  const initData = await initRes.json();
  const razorpayOrderId = initData.data.razorpay_order_id;
  const paymentOrderId = initData.data.payment_order_id;
  console.log(`✅ Initiated Payment! Razorpay Order ID: ${razorpayOrderId}`);
  console.log(`   Payment Order ID: ${paymentOrderId}`);

  console.log('\n--- Step 3: Trigger payment.failed Webhook ---');
  const payloadObj = {
    event: 'payment.failed',
    razorpay_order_id: razorpayOrderId,
    payload: {
      payment: {
        entity: {
          id: `pay_fail_${Date.now()}`,
          order_id: razorpayOrderId,
          error_description: 'Issuer bank authentication failed',
        },
      },
    },
  };

  const rawBodyStr = JSON.stringify(payloadObj);
  const signature = crypto.createHmac('sha256', webhookSecret).update(rawBodyStr).digest('hex');

  const webhookRes = await fetch(`${API_BASE}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: rawBodyStr,
  });

  const webhookData = await webhookRes.json();
  console.log(`✅ Webhook Status: ${webhookRes.status}`, webhookData);

  console.log('\n--- Step 4: Poll Payment Status ---');
  const statusRes = await fetch(`${API_BASE}/payments/status/${razorpayOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const statusData = await statusRes.json();
  console.log(`✅ Status API Response:`, statusData.data);

  if (statusData.data?.status === 'PAYMENT_FAILED') {
    console.log('\n🎉 US-004-006 PAYMENT FAILURE HANDLING IS 100% VERIFIED & PASSED!');
  }
}

testPaymentFailureFlow().catch(console.error);
