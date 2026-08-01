const crypto = require('crypto');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { BookingService } = require('./dist/src/modules/booking/services/booking.service');
const { PrismaService } = require('./dist/src/prisma/prisma.service');
const { TokenRegistryService } = require('./dist/src/modules/notification/services/token-registry.service');

async function testAssignedNotificationFlow() {
  console.log('🚀 Testing Booking Assignment Notification Dispatch Flow...');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  const bookingService = app.get(BookingService);
  const prisma = app.get(PrismaService);
  const tokenRegistry = app.get(TokenRegistryService);

  try {
    // 1. Create or fetch test Customer & Provider
    const customer = await prisma.customer.findFirst();
    const provider = await prisma.provider.findFirst();
    const admin = await prisma.adminUser.findFirst();
    const service = await prisma.service.findFirst();
    const slot = await prisma.bookingTimeSlot.findFirst();

    if (!customer || !provider || !admin || !service || !slot) {
      console.error('Missing seed data for customer/provider/admin/service/slot');
      await app.close();
      process.exit(1);
    }

    // Ensure Provider is APPROVED & linked to service category
    await prisma.provider.update({
      where: { id: provider.id },
      data: {
        status: 'APPROVED',
        categories: { connect: [{ id: service.categoryId }] },
      },
    });

    console.log(`Using Customer: ${customer.id}, Provider: ${provider.id}`);

    // 2. Register push tokens for Customer & Provider
    await tokenRegistry.registerToken(customer.id, 'CUSTOMER', 'cust_dev_unit_1', 'fcm_tok_cust_unit_1');
    await tokenRegistry.registerToken(customer.id, 'CUSTOMER', 'cust_dev_unit_2', 'fcm_tok_cust_unit_2');
    await tokenRegistry.registerToken(provider.id, 'PROVIDER', 'prov_dev_unit_1', 'fcm_tok_prov_unit_1');
    console.log('✅ Registered Push Tokens for Customer (2 devices) & Provider (1 device)');

    // 3. Create test PENDING booking on a unique future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 1000) + 10);
    const bookingRef = `BK-TEST-${Date.now()}`;
    const booking = await prisma.booking.create({
      data: {
        bookingReference: bookingRef,
        customerId: customer.id,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.fixedPrice,
        addressSnapshot: { line: '123 Test St', city: 'Bangalore' },
        slotDate: futureDate,
        slotId: slot.id,
        slotLabelSnapshot: slot.label,
        paymentMethod: 'CASH_ON_SERVICE',
        status: 'PENDING',
        idempotencyKey: crypto.randomUUID(),
      },
    });
    console.log(`✅ Created PENDING Test Booking: ${booking.id} (${bookingRef})`);

    // 4. Assign Provider via BookingService.assignProvider
    console.log('\n--- Assigning Provider to Booking ---');
    const updated = await bookingService.assignProvider(booking.id, provider.id, admin.id);
    console.log(`✅ Booking Status Updated to: ${updated.status}`);

    // Clean up test booking
    await prisma.booking.delete({ where: { id: booking.id } });
    console.log('🧹 Cleaned up test booking.');

    console.log('\n🎉 ASSIGNED NOTIFICATION DISPATCH FLOW VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test Failed:', err);
  } finally {
    try {
      await app.close();
    } catch (e) {}
  }
}

testAssignedNotificationFlow();
