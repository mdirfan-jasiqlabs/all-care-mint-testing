const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== OPERATIONAL CLEANUP: DELETING QA RESIDUE ===`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (DELETION)' : 'DRY RUN'}\n`);

  // 1. Identify all QA/E2E-generated categories matching documented patterns
  const qaCategories = await prisma.serviceCategory.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Test Category', mode: 'insensitive' } },
        { name: { startsWith: 'Audit Category', mode: 'insensitive' } },
        { name: { startsWith: 'Audit Cat', mode: 'insensitive' } },
        { name: { startsWith: 'Audit Visibility', mode: 'insensitive' } }
      ]
    }
  });

  if (qaCategories.length === 0) {
    console.log('No QA/E2E residue categories found.');
  } else {
    console.log(`Found ${qaCategories.length} matching QA categories:`);
  }

  const categoriesToDelete = [];
  const servicesToDelete = [];

  for (const cat of qaCategories) {
    console.log(`\nCategory: "${cat.name}" [ID: ${cat.id}]`);
    
    // Find linked services
    const services = await prisma.service.findMany({
      where: { categoryId: cat.id }
    });

    console.log(`  Linked services: ${services.length}`);
    let categorySafeToDelete = true;
    const catServicesToDelete = [];

    for (const svc of services) {
      // Check historical references (bookings)
      const bookingCount = await prisma.booking.count({
        where: { serviceId: svc.id }
      });
      // Check locks
      const bookings = await prisma.booking.findMany({ where: { serviceId: svc.id } });
      const bookingIds = bookings.map(b => b.id);
      const lockCount = await prisma.bookingSlotLock.count({
        where: { bookingId: { in: bookingIds } }
      });

      console.log(`    - Service: "${svc.name}" [ID: ${svc.id}] | Bookings: ${bookingCount} | Locks: ${lockCount}`);
      
      if (bookingCount > 0 || lockCount > 0) {
        console.log(`      ⚠️ UNSAFE: Service is referenced in history. Skipping deletion of this category and its services.`);
        categorySafeToDelete = false;
      } else {
        catServicesToDelete.push(svc.id);
      }
    }

    if (categorySafeToDelete) {
      categoriesToDelete.push(cat);
      servicesToDelete.push(...catServicesToDelete);
      console.log(`    ✅ Safe to delete.`);
    }
  }

  console.log('\n--- Deletion Summary ---');
  console.log(`Categories to delete: ${categoriesToDelete.length}`);
  console.log(`Services to delete: ${servicesToDelete.length}`);

  if (isExecute) {
    if (categoriesToDelete.length > 0) {
      console.log('\nExecuting deletion inside transaction...');
      await prisma.$transaction(async (tx) => {
        if (servicesToDelete.length > 0) {
          await tx.service.deleteMany({
            where: { id: { in: servicesToDelete } }
          });
        }
        await tx.serviceCategory.deleteMany({
          where: { id: { in: categoriesToDelete.map(c => c.id) } }
        });

        // Write structured audit logs in batch
        const auditData = categoriesToDelete.map(cat => ({
          actorId: '00000000-0000-0000-0000-000000000000',
          actorRole: 'SYSTEM_CLEANUP',
          action: 'catalog.category.delete',
          entityType: 'ServiceCategory',
          entityId: cat.id,
          oldState: JSON.parse(JSON.stringify(cat)),
          newState: null
        }));

        await tx.auditLog.createMany({
          data: auditData
        });
      }, {
        maxWait: 10000,
        timeout: 30000
      });
      console.log('✅ Deletion completed successfully.');
    } else {
      console.log('No safe QA categories to delete.');
    }
  } else {
    console.log('\n[Dry Run] No database changes were made. Use --execute to perform deletions.');
  }

  // 2. Report whether approved seed records are missing
  console.log('\n=== VERIFYING PRODUCTION SEED CATALOG ===');
  const prodCategories = ['Cleaning', 'AC Repair', 'Plumbing', 'Painting'];
  let seedMissing = false;

  for (const catName of prodCategories) {
    const cat = await prisma.serviceCategory.findUnique({
      where: { name: catName },
      include: { services: true }
    });

    if (!cat) {
      console.log(`❌ Missing production category: "${catName}"`);
      seedMissing = true;
    } else if (!cat.isActive) {
      console.log(`⚠️ Production category is inactive: "${catName}"`);
      seedMissing = true;
    } else {
      console.log(`✓ Category present and active: "${catName}" [Services: ${cat.services.length}]`);
    }
  }

  if (seedMissing) {
    console.log('\n🚨 WARNING: Approved production seed records are missing or inactive!');
    console.log('To restore them, please run:');
    console.log('node tools/restore-seed-catalog.js --execute');
  } else {
    console.log('\n✓ All approved production seed records are present and active.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
