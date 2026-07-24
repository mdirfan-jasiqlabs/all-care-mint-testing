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

  // 2. Seed Sample Categories
  const categories = [
    { name: 'Home Cleaning', description: 'Professional home cleaning and deep cleaning services', displayOrder: 1, iconUrl: 'https://img.icons8.com/fluency/48/broom.png' },
    { name: 'Plumbing', description: 'Expert plumbing repairs and installation services', displayOrder: 2, iconUrl: 'https://img.icons8.com/fluency/48/plumbing.png' },
    { name: 'Electrical', description: 'Licensed electrician services for your home', displayOrder: 3, iconUrl: 'https://img.icons8.com/fluency/48/electrical.png' },
    { name: 'Beauty & Spa', description: 'At-home beauty, grooming and spa services', displayOrder: 4, iconUrl: 'https://img.icons8.com/fluency/48/spa-flower.png' },
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
    { categoryName: 'Home Cleaning', name: 'Regular Cleaning', description: '2-hour standard home cleaning session', fixedPrice: 499.00, estimatedDuration: '120 min' },
    { categoryName: 'Home Cleaning', name: 'Deep Cleaning', description: 'Thorough deep cleaning of entire home', fixedPrice: 1499.00, estimatedDuration: '240 min' },
    { categoryName: 'Home Cleaning', name: 'Kitchen Cleaning', description: 'Professional kitchen deep clean', fixedPrice: 799.00, estimatedDuration: '150 min' },
    { categoryName: 'Plumbing', name: 'Tap Repair', description: 'Fix leaking or broken taps', fixedPrice: 299.00, estimatedDuration: '60 min' },
    { categoryName: 'Plumbing', name: 'Drain Cleaning', description: 'Unclog and clean drain pipes', fixedPrice: 599.00, estimatedDuration: '90 min' },
    { categoryName: 'Electrical', name: 'Wiring Repair', description: 'Fix faulty wiring and connections', fixedPrice: 399.00, estimatedDuration: '90 min' },
    { categoryName: 'Electrical', name: 'Fan Installation', description: 'Ceiling/wall fan installation', fixedPrice: 349.00, estimatedDuration: '60 min' },
    { categoryName: 'Beauty & Spa', name: 'Classic Facial', description: 'Deep cleansing facial treatment', fixedPrice: 699.00, estimatedDuration: '60 min' },
    { categoryName: 'Beauty & Spa', name: 'Hair Spa', description: 'Professional hair spa therapy', fixedPrice: 899.00, estimatedDuration: '75 min' },
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
