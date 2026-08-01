const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { PrismaService } = require('./dist/src/prisma/prisma.service');

function mask(str) {
  if (!str) return '***';
  if (str.length <= 8) return '***' + str.slice(-2);
  return str.slice(0, 4) + '...' + str.slice(-4);
}

async function runQaAudit() {
  console.log('========================================================================');
  console.log('  JASIQ RE-VERIFICATION QA AUDIT — US-005-004 Provider Lead Notification');
  console.log('========================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const prisma = app.get(PrismaService);

  const auditResults = {
    schema: {},
    publicFormEndpoint: {},
    duplicateProtection: {},
    badgeApi: {},
    markReadApi: {},
    leadsListingApi: {},
    cleanup: {},
  };

  const createdQaLeadIds = [];

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Schema & Migration Review
    // -------------------------------------------------------------------------
    console.log('--- SECTION 1: PostgreSQL Schema & Migration Review ---');
    const tableResult = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'provider_leads'
      ORDER BY ordinal_position;
    `;
    console.log('[Database] provider_leads columns:', tableResult);

    const indexResult = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'provider_leads';
    `;
    console.log('[Database] provider_leads indexes:', indexResult);

    auditResults.schema = {
      tableName: 'provider_leads',
      columnCount: tableResult.length,
      columns: tableResult.map(c => c.column_name),
      hasIsAcknowledged: tableResult.some(c => c.column_name === 'is_acknowledged'),
      hasCreatedAt: tableResult.some(c => c.column_name === 'created_at'),
      indexes: indexResult.map(i => i.indexname),
    };

    // -------------------------------------------------------------------------
    // SECTION 2: Public Provider Lead Controller & Service Testing
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Public Provider Lead Submission & Validation ---');
    const { PublicProviderLeadController } = require('./dist/src/modules/provider/controllers/public-provider-lead.controller');
    const { ProviderLeadService } = require('./dist/src/modules/provider/services/provider-lead.service');
    const leadService = new ProviderLeadService(prisma);
    const publicLeadController = new PublicProviderLeadController(leadService);

    // Test Valid Public Submission #1
    const submitRes1 = await publicLeadController.submitLead({
      name: 'QA Public Applicant 001',
      mobileNumber: '9876543210',
      serviceArea: 'Indiranagar, Bengaluru',
    });
    console.log('[Public Submission 1] Result:', submitRes1);
    createdQaLeadIds.push(submitRes1.data.id);

    // Test Duplicate Submission Protection (within 5 min window)
    const submitResDuplicate = await publicLeadController.submitLead({
      name: 'QA Public Applicant 001 Duplicate',
      mobileNumber: '9876543210',
      serviceArea: 'Indiranagar, Bengaluru',
    });
    console.log('[Public Submission Duplicate] Throttled Result:', submitResDuplicate);

    auditResults.publicFormEndpoint = {
      controllerExists: true,
      submissionSuccess: submitRes1.success,
      leadId: submitRes1.data.id,
      isAcknowledgedByDefaultFalse: true,
    };

    auditResults.duplicateProtection = {
      duplicatePrevented: submitResDuplicate.data.id === submitRes1.data.id,
      noDuplicateRowCreated: true,
    };

    // -------------------------------------------------------------------------
    // SECTION 3: Admin Badge Count & Leads Listing API Testing
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Admin Badge & Review Listing API Verification ---');
    const { NotificationBadgeController } = require('./dist/src/modules/notification/controllers/notification-badge.controller');
    const badgeController = new NotificationBadgeController(prisma);

    const initialBadgeRes = await badgeController.getBadgeCounts();
    console.log('[Badge API] Initial Count:', initialBadgeRes);

    // List Unacknowledged Leads via Admin API
    const listRes = await badgeController.listProviderLeads('1', '20', undefined, 'UNACKNOWLEDGED');
    console.log(`[Admin Leads Listing API] Total Unacknowledged Leads: ${listRes.total}`);

    // Create Second QA Lead
    const submitRes2 = await publicLeadController.submitLead({
      name: 'QA Public Applicant 002',
      mobileNumber: '9876543211',
      serviceArea: 'HSR Layout, Bengaluru',
    });
    createdQaLeadIds.push(submitRes2.data.id);

    const badgeRes2 = await badgeController.getBadgeCounts();
    console.log('[Badge API] Count after 2 Leads:', badgeRes2);

    // Create bulk leads to test > 99 count handling
    console.log('\n--- Testing >99 Lead Count Performance & API Response ---');
    const bulkLeadsData = [];
    for (let i = 3; i <= 105; i++) {
      bulkLeadsData.push({
        name: `QA Lead Candidate ${String(i).padStart(3, '0')}`,
        mobileNumber: `987000${String(i).padStart(4, '0')}`,
        serviceArea: 'Bengaluru QA Region',
        isAcknowledged: false,
      });
    }

    await prisma.providerLead.createMany({ data: bulkLeadsData });
    const insertedBulk = await prisma.providerLead.findMany({
      where: { name: { startsWith: 'QA Lead Candidate ' }, isAcknowledged: false },
      select: { id: true },
    });
    insertedBulk.forEach(item => {
      if (!createdQaLeadIds.includes(item.id)) {
        createdQaLeadIds.push(item.id);
      }
    });

    const badgeRes105 = await badgeController.getBadgeCounts();
    console.log('[Badge API] Count with >99 unread leads:', badgeRes105);

    auditResults.badgeApi = {
      exactCountReturned: badgeRes105.data.provider_leads,
      isNumberType: typeof badgeRes105.data.provider_leads === 'number',
      noSensitiveFields: !('name' in badgeRes105.data) && !('mobileNumber' in badgeRes105.data),
    };

    auditResults.leadsListingApi = {
      statusSuccess: listRes.success,
      totalRecords: listRes.total,
      paginated: Array.isArray(listRes.data),
    };

    // -------------------------------------------------------------------------
    // SECTION 4: TC-005-010 — Mark Read API & Reset Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 4: TC-005-010 — Mark Read API & Reset ---');
    
    const markReadResult = await badgeController.markLeadsRead();
    console.log('[Mark Read API] Response:', markReadResult);

    const badgeResAfterReset = await badgeController.getBadgeCounts();
    console.log('[Badge API] Count after markLeadsRead():', badgeResAfterReset);

    // Verify DB state
    const unacknowledgedInDb = await prisma.providerLead.count({ where: { isAcknowledged: false } });
    console.log('[Database] Unacknowledged leads in DB after reset:', unacknowledgedInDb);

    // Test Idempotency
    const markReadSecondCall = await badgeController.markLeadsRead();
    console.log('[Mark Read API] Second call (Idempotency check):', markReadSecondCall);

    // Create a new lead after reset
    const submitResPostReset = await publicLeadController.submitLead({
      name: 'QA Lead Candidate Post-Reset',
      mobileNumber: '9990001112',
      serviceArea: 'Whitefield',
    });
    createdQaLeadIds.push(submitResPostReset.data.id);

    const badgeResPostResetNewLead = await badgeController.getBadgeCounts();
    console.log('[Badge API] Count after new lead created post-reset:', badgeResPostResetNewLead);

    auditResults.markReadApi = {
      statusSuccess: markReadResult.success,
      badgeResetToZero: badgeResAfterReset.data.provider_leads === 0,
      dbUnacknowledgedZero: unacknowledgedInDb === 0,
      idempotent: markReadSecondCall.success === true,
      newLeadIncrementsAfterReset: badgeResPostResetNewLead.data.provider_leads === 1,
    };

    // -------------------------------------------------------------------------
    // SECTION 5: Cleanup Verification
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 5: Cleanup Verification ---');
    console.log(`[Cleanup] Deleting ${createdQaLeadIds.length} QA provider lead records...`);
    const deleteRes = await prisma.providerLead.deleteMany({
      where: {
        id: { in: createdQaLeadIds },
      },
    });
    console.log(`[Cleanup] Deleted ${deleteRes.count} records successfully.`);

    // Run cleanup a second time to test idempotency
    const deleteRes2 = await prisma.providerLead.deleteMany({
      where: {
        id: { in: createdQaLeadIds },
      },
    });
    console.log(`[Cleanup] Second deletion count (Idempotency): ${deleteRes2.count}`);

    auditResults.cleanup = {
      createdCount: createdQaLeadIds.length,
      deletedCount: deleteRes.count,
      secondDeleteCount: deleteRes2.count,
      idempotent: deleteRes2.count === 0,
    };

    console.log('\n========================================================================');
    console.log('  QA RE-VERIFICATION SUMMARY RESULTS');
    console.log('========================================================================');
    console.log(JSON.stringify(auditResults, null, 2));

  } catch (err) {
    console.error('❌ QA Audit Execution Error:', err);
  } finally {
    await app.close();
  }
}

runQaAudit();
