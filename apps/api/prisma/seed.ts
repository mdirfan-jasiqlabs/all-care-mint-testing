import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user and sample catalog data...');

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@allcaremint.com' },
    update: { passwordHash },
    create: {
      email: 'admin@allcaremint.com',
      passwordHash,
    },
  });
  console.log(`✅ Admin user seeded: ${admin.email} (id: ${admin.id})`);

  // Seed Student E2E User
  const passwordHashStudent = await bcrypt.hash('StudentPass@2026', 12);
  const student = await prisma.adminUser.upsert({
    where: { email: 'student.e2e@cogniquiz.com' },
    update: { passwordHash: passwordHashStudent },
    create: {
      email: 'student.e2e@cogniquiz.com',
      passwordHash: passwordHashStudent,
    },
  });
  console.log(`✅ Student E2E user seeded: ${student.email} (id: ${student.id})`);

  // 2. Seed Sample Categories
  const categories = [
    { name: 'Cleaning', description: 'Professional home cleaning and deep cleaning services', displayOrder: 1, iconUrl: 'https://img.icons8.com/fluency/48/broom.png' },
    { name: 'AC Repair', description: 'Professional AC repair and service', displayOrder: 2, iconUrl: 'https://img.icons8.com/fluency/48/air-conditioner.png' },
    { name: 'Plumbing', description: 'Expert plumbing repairs and installation services', displayOrder: 3, iconUrl: 'https://img.icons8.com/fluency/48/plumbing.png' },
    { name: 'Painting', description: 'Professional home wall painting services', displayOrder: 4, iconUrl: 'https://img.icons8.com/fluency/48/paint-brush.png' },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const category = await prisma.serviceCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description, displayOrder: cat.displayOrder, iconUrl: cat.iconUrl },
      create: { ...cat, isActive: true },
    });
    categoryMap[cat.name] = category.id;
    console.log(`✅ Category seeded: ${category.name} (id: ${category.id})`);
  }

  // 3. Seed sample services
  const serviceData = [
    { categoryName: 'Cleaning', name: 'Regular Cleaning', description: '2-hour standard home cleaning session', fixedPrice: 499.00, estimatedDuration: '120 min' },
    { categoryName: 'Cleaning', name: 'Deep Cleaning', description: 'Thorough deep cleaning of entire home', fixedPrice: 4500.00, estimatedDuration: '240 min' },
    { categoryName: 'Cleaning', name: 'Sofa Cleaning', description: 'Multi-seat fabric shampooing and sanitizing', fixedPrice: 1500.00, estimatedDuration: '150 min' },
    { categoryName: 'Cleaning', name: 'Kitchen Cleaning', description: 'Professional kitchen deep clean', fixedPrice: 1200.00, estimatedDuration: '150 min' },
    { categoryName: 'AC Repair', name: 'AC General Service', description: 'Filter cleaning & gas charge check', fixedPrice: 1200.00, estimatedDuration: '60 min' },
    { categoryName: 'Plumbing', name: 'Leak Repair', description: 'Fix kitchen/bathroom tap or pipe leaks', fixedPrice: 600.00, estimatedDuration: '60 min' },
    { categoryName: 'Painting', name: 'Wall Painting', description: 'Professional home painting service per room', fixedPrice: 8000.00, estimatedDuration: '480 min' },
  ];

  for (const svc of serviceData) {
    const categoryId = categoryMap[svc.categoryName];
    const service = await prisma.service.upsert({
      where: { categoryId_name: { categoryId, name: svc.name } },
      update: { description: svc.description, fixedPrice: svc.fixedPrice, estimatedDuration: svc.estimatedDuration },
      create: {
        categoryId,
        name: svc.name,
        description: svc.description,
        fixedPrice: svc.fixedPrice,
        estimatedDuration: svc.estimatedDuration,
        isActive: true,
      },
    });
    console.log(`   ✅ Service seeded: ${service.name} (₹${service.fixedPrice})`);
  }

  // 4. Create initial catalog version
  const versionHash = crypto.createHash('sha256').update(new Date().toISOString()).digest('hex').substring(0, 16);
  await prisma.catalogVersion.create({
    data: { versionHash },
  });
  console.log(`✅ Catalog version created: ${versionHash}`);

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
