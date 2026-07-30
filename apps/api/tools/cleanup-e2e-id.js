const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const idArg = process.argv.find(arg => arg.startsWith('--id='));
  if (!idArg) {
    console.error('Error: Category ID not specified. Use --id=<uuid>');
    process.exit(1);
  }
  const categoryId = idArg.split('=')[1];

  console.log(`=== E2E TEARDOWN UTILITY: DELETING CATEGORY ${categoryId} ===`);

  // 1. Verify that the category exists
  const category = await prisma.serviceCategory.findUnique({
    where: { id: categoryId }
  });

  if (!category) {
    console.error(`Error: Category with ID ${categoryId} not found.`);
    process.exit(1);
  }

  // 2. Verify that its name matches the expected E2E pattern
  if (!category.name.startsWith('Test Category')) {
    console.error(`Error: Category "${category.name}" name does not match the expected "Test Category*" pattern. Refusing deletion.`);
    process.exit(1);
  }

  // 3. Check linked services and historical booking references
  const services = await prisma.service.findMany({
    where: { categoryId }
  });

  console.log(`Checking services under category: ${services.length} services found.`);
  const serviceIds = services.map(s => s.id);

  if (serviceIds.length > 0) {
    const bookingCount = await prisma.booking.count({
      where: { serviceId: { in: serviceIds } }
    });
    
    // Check locks
    const bookings = await prisma.booking.findMany({ where: { serviceId: { in: serviceIds } } });
    const bookingIds = bookings.map(b => b.id);
    const lockCount = await prisma.bookingSlotLock.count({
      where: { bookingId: { in: bookingIds } }
    });

    if (bookingCount > 0 || lockCount > 0) {
      console.error(`Conflict: Services in category are referenced by bookings (${bookingCount}) or locks (${lockCount}). Refusing deletion.`);
      process.exit(1);
    }
  }

  // 4. Run safe deletions inside a Prisma transaction
  await prisma.$transaction(async (tx) => {
    // Delete services
    if (serviceIds.length > 0) {
      await tx.service.deleteMany({
        where: { id: { in: serviceIds } }
      });
      console.log(`Deleted ${serviceIds.length} services.`);
    }

    // Delete category
    await tx.serviceCategory.delete({
      where: { id: categoryId }
    });
    console.log(`Deleted category "${category.name}" (${categoryId}).`);

    // 5. Produce structured audit logs
    await tx.auditLog.create({
      data: {
        actorId: '00000000-0000-0000-0000-000000000000',
        actorRole: 'SYSTEM_TEST',
        action: 'catalog.category.delete',
        entityType: 'ServiceCategory',
        entityId: categoryId,
        oldState: JSON.parse(JSON.stringify(category)),
        newState: null
      }
    });
  });

  console.log('✅ E2E teardown completed successfully.');
}

main()
  .catch(err => {
    console.error('Fatal cleanup error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
