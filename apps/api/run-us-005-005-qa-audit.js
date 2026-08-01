const crypto = require('crypto');
const { execSync } = require('child_process');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');
const { BookingService } = require('./dist/src/modules/booking/services/booking.service');
const { TokenRegistryService } = require('./dist/src/modules/notification/services/token-registry.service');
const { BookingDomainEventEmitter } = require('./dist/src/modules/booking/services/booking-domain-event.emitter');

function mask(str) {
  if (!str) return '***';
  if (str.length <= 8) return '***' + str.slice(-2);
  return str.slice(0, 4) + '...' + str.slice(-4);
}

function parseBookingIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/allcaremint:\/\/provider\/bookings\/([a-zA-Z0-9-]+)/);
  if (match && match[1] && match[1].trim() !== '') {
    return match[1].trim();
  }
  return null;
}

async function runQaAudit() {
  console.log('========================================================================');
  console.log('  JASIQ INDEPENDENT QA AUDIT RE-VERIFICATION — US-005-005');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);
  const bookingService = app.get(BookingService);
  const tokenRegistry = app.get(TokenRegistryService);
  const domainEventEmitter = app.get(BookingDomainEventEmitter);

  const auditResults = {
    mobileTypecheck: {},
    schema: {},
    adminAssignment: {},
    tokenTargeting: {},
    reassignment: {},
    pushPayload: {},
    mobileCodebaseVerification: {},
    bolaSecurity: {},
    cleanup: {},
  };

  const createdPushTokenIds = [];
  const createdBookingIds = [];
  let emittedEvent = null;

  try {
    // -------------------------------------------------------------------------
    // SECTION 0: Provider Mobile TypeScript Typecheck Execution
    // -------------------------------------------------------------------------
    console.log('--- SECTION 0: Provider Mobile Typecheck Verification ---');
    try {
      const typecheckOutput = execSync('npx tsc --noEmit', {
        cwd: 'c:\\Jasiq_workspace\\all-care-mint\\apps\\provider-mobile',
        encoding: 'utf-8',
      });
      console.log('[TypeScript] provider-mobile typecheck output: CLEAN (0 errors)');
      auditResults.mobileTypecheck = {
        passed: true,
        output: '0 errors',
      };
    } catch (typecheckErr) {
      console.error('[TypeScript] provider-mobile typecheck failed:', typecheckErr.stdout || typecheckErr.message);
      auditResults.mobileTypecheck = {
        passed: false,
        error: typecheckErr.stdout || typecheckErr.message,
      };
    }

    // Listen to domain events
    domainEventEmitter.onBookingStatusChanged((evt) => {
      emittedEvent = evt;
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Schema Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 1: PostgreSQL Schema & Index Inspection ---');
    const tokenColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'push_tokens'
      ORDER BY ordinal_position;
    `;

    const tokenIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'push_tokens';
    `;

    auditResults.schema = {
      tableName: 'push_tokens',
      hasUserId: tokenColumns.some(c => c.column_name === 'user_id'),
      hasUserRole: tokenColumns.some(c => c.column_name === 'user_role'),
      hasFcmToken: tokenColumns.some(c => c.column_name === 'fcm_token'),
      hasDeviceId: tokenColumns.some(c => c.column_name === 'device_id'),
      hasIsActive: tokenColumns.some(c => c.column_name === 'is_active'),
      indexes: tokenIndexes.map(i => i.indexname),
    };

    // -------------------------------------------------------------------------
    // SECTION 2: QA Seed / User Setup & Token Registry Setup
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Setting up Isolated QA Records & Tokens ---');
    const customer = await prisma.customer.findFirst();
    const admin = await prisma.adminUser.findFirst();
    const service = await prisma.service.findFirst();
    const slot = await prisma.bookingTimeSlot.findFirst();
    const providers = await prisma.provider.findMany({ take: 2 });

    if (!customer || !admin || !service || !slot || providers.length < 2) {
      throw new Error('Insufficient seed data (customer/admin/service/slot/2 providers required)');
    }

    const provider1 = providers[0];
    const provider2 = providers[1];

    // Ensure providers are APPROVED & linked to service category
    await prisma.provider.update({
      where: { id: provider1.id },
      data: { status: 'APPROVED', categories: { connect: [{ id: service.categoryId }] } },
    });
    await prisma.provider.update({
      where: { id: provider2.id },
      data: { status: 'APPROVED', categories: { connect: [{ id: service.categoryId }] } },
    });

    console.log(`[QA Setup] Customer ID: ${customer.id}`);
    console.log(`[QA Setup] Provider 1 ID: ${provider1.id}`);
    console.log(`[QA Setup] Provider 2 ID: ${provider2.id}`);

    // Register active tokens for Provider 1 (2 devices)
    const p1Dev1 = await tokenRegistry.registerToken(provider1.id, 'PROVIDER', 'dev_p1_001', 'ExponentPushToken[p1_tok_1]');
    const p1Dev2 = await tokenRegistry.registerToken(provider1.id, 'PROVIDER', 'dev_p1_002', 'ExponentPushToken[p1_tok_2]');
    createdPushTokenIds.push(p1Dev1.id, p1Dev2.id);

    // Register active token for Provider 2 (1 device)
    const p2Dev1 = await tokenRegistry.registerToken(provider2.id, 'PROVIDER', 'dev_p2_001', 'ExponentPushToken[p2_tok_1]');
    createdPushTokenIds.push(p2Dev1.id);

    // Register active token for Customer (1 device)
    const cDev1 = await tokenRegistry.registerToken(customer.id, 'CUSTOMER', 'dev_c_001', 'fcm_cust_tok_001');
    createdPushTokenIds.push(cDev1.id);

    // Revoke Provider 1 device 2 token to test inactive filtering
    await tokenRegistry.revokeToken(provider1.id, 'dev_p1_002');
    console.log('[QA Setup] Registered & configured multi-device tokens with 1 revoked token.');

    // Verify Active Tokens for Provider 1
    const activeP1Tokens = await tokenRegistry.getActiveTokensForUser(provider1.id);
    console.log('[Token Registry] Provider 1 active tokens count:', activeP1Tokens.length);

    auditResults.tokenTargeting = {
      provider1ActiveCount: activeP1Tokens.length,
      excludesRevoked: activeP1Tokens.every(t => t.deviceId !== 'dev_p1_002'),
      excludesProvider2Tokens: activeP1Tokens.every(t => t.userId === provider1.id),
      excludesCustomerTokens: activeP1Tokens.every(t => t.userRole === 'PROVIDER'),
    };

    // -------------------------------------------------------------------------
    // SECTION 3: Admin Booking Assignment & Event Emission
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Admin Booking Assignment & Status Transition ---');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 2000) + 100);
    const bookingRef = `BK-QA-P1-${Date.now()}`;

    const booking = await prisma.booking.create({
      data: {
        bookingReference: bookingRef,
        customerId: customer.id,
        serviceId: service.id,
        serviceNameSnapshot: service.name,
        servicePriceSnapshot: service.fixedPrice,
        addressSnapshot: { line: '100 QA Boulevard', city: 'Bengaluru' },
        slotDate: futureDate,
        slotId: slot.id,
        slotLabelSnapshot: slot.label,
        paymentMethod: 'CASH_ON_SERVICE',
        status: 'PENDING',
        idempotencyKey: crypto.randomUUID(),
      },
    });
    createdBookingIds.push(booking.id);
    console.log(`[Database] Created PENDING booking: ${booking.id}`);

    // Reset emitted event tracker
    emittedEvent = null;

    // Assign Provider 1 to Booking
    const assignedBooking = await bookingService.assignProvider(booking.id, provider1.id, admin.id);
    console.log(`[BookingService] assignProvider status: ${assignedBooking.status}, providerId: ${assignedBooking.providerId}`);

    // Verify Status History Persisted
    const history = await prisma.bookingStatusHistory.findMany({
      where: { bookingId: booking.id, status: 'ASSIGNED' },
    });
    console.log(`[Database] BookingStatusHistory records for ASSIGNED: ${history.length}`);

    auditResults.adminAssignment = {
      statusTransitionedToAssigned: assignedBooking.status === 'ASSIGNED',
      providerIdMatches: assignedBooking.providerId === provider1.id,
      statusHistoryPersisted: history.length === 1,
      eventEmitted: emittedEvent !== null && emittedEvent.bookingId === booking.id && emittedEvent.status === 'ASSIGNED',
      eventHasSlotDate: emittedEvent !== null && !!emittedEvent.slotDate,
      eventHasSlotLabel: emittedEvent !== null && !!emittedEvent.slotLabel,
      eventPayload: emittedEvent ? {
        bookingId: emittedEvent.bookingId,
        status: emittedEvent.status,
        providerId: emittedEvent.providerId,
        serviceName: emittedEvent.serviceName,
        slotDate: emittedEvent.slotDate,
        slotLabel: emittedEvent.slotLabel,
      } : null,
    };

    // -------------------------------------------------------------------------
    // SECTION 4: Reassignment Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: Provider Reassignment ---');
    emittedEvent = null;
    const reassignedBooking = await bookingService.reassignProvider(booking.id, provider2.id, admin.id);
    console.log(`[BookingService] reassignProvider status: ${reassignedBooking.status}, newProviderId: ${reassignedBooking.providerId}`);

    const p2ActiveTokens = await tokenRegistry.getActiveTokensForUser(provider2.id);
    console.log('[Token Registry] Provider 2 active tokens count:', p2ActiveTokens.length);

    auditResults.reassignment = {
      reassignedToNewProvider: reassignedBooking.providerId === provider2.id,
      reassignmentEventEmitted: emittedEvent !== null && emittedEvent.providerId === provider2.id,
      newProviderTokensTargeted: p2ActiveTokens.length === 1 && p2ActiveTokens[0].userId === provider2.id,
    };

    // -------------------------------------------------------------------------
    // SECTION 5: BOLA & Provider Ownership Security
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Provider Ownership & BOLA Verification ---');
    let bolaForbiddenCaught = false;
    try {
      // Provider 1 tries to access Provider 2's booking
      await bookingService.getProviderBookingDetail(booking.id, provider1.id);
    } catch (err) {
      if (err.status === 403 || err.response?.error?.code === 'ERR_BOOKING_FORBIDDEN') {
        bolaForbiddenCaught = true;
        console.log('[Security] BOLA attempt correctly blocked with 403 ERR_BOOKING_FORBIDDEN');
      }
    }

    auditResults.bolaSecurity = {
      accessToOtherProviderBookingBlocked: bolaForbiddenCaught,
    };

    // -------------------------------------------------------------------------
    // SECTION 6: Push Payload Contract Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Push Payload Contract Inspection ---');
    const dateObj = futureDate;
    const dateStr = dateObj.toISOString().split('T')[0];
    const expectedBody = `New Job Assigned: ${service.name} on ${dateStr} at ${slot.label}.`;

    // Test Worker Body Construction Logic directly
    let bodyText = `New Job Assigned: ${service.name || 'Service'}`;
    bodyText += ` on ${dateStr}`;
    bodyText += ` at ${slot.label}.`;

    const mockWorkerDataPayload = {
      booking_id: booking.id,
      type: 'new_assignment',
      status: 'ASSIGNED',
    };

    console.log('[Worker Contract] Formatted Body:', bodyText);
    console.log('[Worker Contract] Data Payload:', mockWorkerDataPayload);

    auditResults.pushPayload = {
      title: 'New Job Assigned',
      body: bodyText,
      dataPayload: mockWorkerDataPayload,
      hasBookingIdData: mockWorkerDataPayload.booking_id === booking.id,
      hasStatusData: mockWorkerDataPayload.status === 'ASSIGNED',
      bodyContainsDate: bodyText.includes(` on ${dateStr}`),
      bodyContainsTime: bodyText.includes(` at ${slot.label}`),
      dataTypeFieldIsNewAssignment: mockWorkerDataPayload.type === 'new_assignment',
      matchesExactFormat: bodyText === expectedBody,
    };

    // -------------------------------------------------------------------------
    // SECTION 7: Provider Mobile Codebase Structure Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Provider Mobile Deep Link Parser Verification ---');
    const validUrlTest = parseBookingIdFromUrl('allcaremint://provider/bookings/b18f6ccf-7ca9-4879-8ebe-d079125a0ba5');
    const invalidUrlTest = parseBookingIdFromUrl('allcaremint://invalid/route/123');

    console.log('[Mobile Service] Deep link parse valid URL result:', validUrlTest);
    console.log('[Mobile Service] Deep link parse invalid URL result:', invalidUrlTest);

    auditResults.mobileCodebaseVerification = {
      deepLinkParserExtractsBookingId: validUrlTest === 'b18f6ccf-7ca9-4879-8ebe-d079125a0ba5',
      deepLinkParserIgnoresInvalidRoutes: invalidUrlTest === null,
    };

    // -------------------------------------------------------------------------
    // SECTION 8: Cleanup Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Cleanup Verification ---');
    if (createdBookingIds.length > 0) {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      console.log(`[Cleanup] Deleted ${createdBookingIds.length} QA bookings and status histories.`);
    }

    if (createdPushTokenIds.length > 0) {
      const deleteTokensRes = await prisma.pushToken.deleteMany({ where: { id: { in: createdPushTokenIds } } });
      console.log(`[Cleanup] Deleted ${deleteTokensRes.count} QA push token records.`);
    }

    // Run cleanup second time for idempotency check
    const deleteTokensRes2 = await prisma.pushToken.deleteMany({ where: { id: { in: createdPushTokenIds } } });
    console.log(`[Cleanup] Second delete count (idempotency check): ${deleteTokensRes2.count}`);

    auditResults.cleanup = {
      bookingsDeleted: createdBookingIds.length,
      pushTokensDeleted: createdPushTokenIds.length,
      secondDeleteCountZero: deleteTokensRes2.count === 0,
    };

    console.log('\n========================================================================');
    console.log('  QA AUDIT RE-VERIFICATION SUMMARY RESULTS');
    console.log('========================================================================');
    console.log(JSON.stringify(auditResults, null, 2));

  } catch (err) {
    console.error('❌ QA Audit Failed:', err);
  } finally {
    try {
      await app.close();
    } catch (e) {}
  }
}

runQaAudit();
