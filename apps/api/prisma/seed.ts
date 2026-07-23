import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@allcaremint.com';
  const passwordHash = await bcrypt.hash('admin123', 10);

  const existing = await prisma.adminUser.findUnique({
    where: { email },
  });

  if (!existing) {
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
      },
    });
    console.log('Seed: Default admin user created successfully.');
  } else {
    console.log('Seed: Admin user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
