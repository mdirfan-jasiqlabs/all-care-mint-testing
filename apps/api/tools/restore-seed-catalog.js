const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== RESTORE SEED CATALOG ===`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (RESTORATION)' : 'DRY RUN'}\n`);

  const categories = [
    { name: 'Cleaning', description: 'Professional home cleaning and deep cleaning services', displayOrder: 1, iconUrl: 'https://img.icons8.com/fluency/48/broom.png' },
    { name: 'AC Repair', description: 'Professional AC repair and service', displayOrder: 2, iconUrl: 'https://img.icons8.com/fluency/48/air-conditioner.png' },
    { name: 'Plumbing', description: 'Expert plumbing repairs and installation services', displayOrder: 3, iconUrl: 'https://img.icons8.com/fluency/48/plumbing.png' },
    { name: 'Painting', description: 'Professional home wall painting services', displayOrder: 4, iconUrl: 'https://img.icons8.com/fluency/48/paint-brush.png' },
  ];

  const serviceData = [
    { categoryName: 'Cleaning', name: 'Regular Cleaning', description: '2-hour standard home cleaning session', fixedPrice: 499.00, estimatedDuration: '120 min' },
    { categoryName: 'Cleaning', name: 'Deep Cleaning', description: 'Thorough deep cleaning of entire home', fixedPrice: 4500.00, estimatedDuration: '240 min' },
    { categoryName: 'Cleaning', name: 'Sofa Cleaning', description: 'Multi-seat fabric shampooing and sanitizing', fixedPrice: 1500.00, estimatedDuration: '150 min' },
    { categoryName: 'Cleaning', name: 'Kitchen Cleaning', description: 'Professional kitchen deep clean', fixedPrice: 1200.00, estimatedDuration: '150 min' },
    { categoryName: 'AC Repair', name: 'AC General Service', description: 'Filter cleaning & gas charge check', fixedPrice: 1200.00, estimatedDuration: '60 min' },
    { categoryName: 'Plumbing', name: 'Leak Repair', description: 'Fix kitchen/bathroom tap or pipe leaks', fixedPrice: 600.00, estimatedDuration: '60 min' },
    { categoryName: 'Painting', name: 'Wall Painting', description: 'Professional home painting service per room', fixedPrice: 8000.00, estimatedDuration: '480 min' },
  ];

  if (!isExecute) {
    console.log('[Dry Run] Checking what would be restored:');
  }

  const categoryMap = {};

  for (const cat of categories) {
    const existing = await prisma.serviceCategory.findUnique({
      where: { name: cat.name }
    });

    if (!existing || !existing.isActive) {
      console.log(`  + Will restore category: "${cat.name}"`);
    } else {
      console.log(`  = Category already active: "${cat.name}"`);
    }

    if (isExecute) {
      const category = await prisma.serviceCategory.upsert({
        where: { name: cat.name },
        update: { description: cat.description, displayOrder: cat.displayOrder, iconUrl: cat.iconUrl, isActive: true },
        create: { ...cat, isActive: true },
      });
      categoryMap[cat.name] = category.id;
    }
  }

  for (const svc of serviceData) {
    if (isExecute) {
      const categoryId = categoryMap[svc.categoryName] || await prisma.serviceCategory.findUnique({ where: { name: svc.categoryName } }).then(c => c.id);
      const existingSvc = await prisma.service.findFirst({
        where: { categoryId, name: svc.name }
      });

      if (!existingSvc || !existingSvc.isActive) {
        console.log(`  + Will restore service: "${svc.name}" under "${svc.categoryName}"`);
      }

      await prisma.service.upsert({
        where: { categoryId_name: { categoryId, name: svc.name } },
        update: { description: svc.description, fixedPrice: svc.fixedPrice, estimatedDuration: svc.estimatedDuration, isActive: true },
        create: {
          categoryId,
          name: svc.name,
          description: svc.description,
          fixedPrice: svc.fixedPrice,
          estimatedDuration: svc.estimatedDuration,
          isActive: true,
        },
      });
    } else {
      console.log(`  = Will verify/restore service: "${svc.name}" under "${svc.categoryName}"`);
    }
  }

  if (isExecute) {
    const versionHash = crypto.createHash('sha256').update(new Date().toISOString()).digest('hex').substring(0, 16);
    await prisma.catalogVersion.create({
      data: { versionHash },
    });
    console.log(`\n✅ Production seed catalog successfully restored and ETag invalidated (new version: ${versionHash}).`);
  } else {
    console.log('\n[Dry Run] No changes made. Use --execute to run restoration.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
