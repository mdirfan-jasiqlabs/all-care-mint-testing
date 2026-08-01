const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Syncing database DDL for PushToken migration...');
  await prisma.$executeRawUnsafe(`ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS platform VARCHAR(20) NOT NULL DEFAULT 'ANDROID';`);
  await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS uq_push_tokens_user_role_device;`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS uq_push_tokens_user_device ON push_tokens(user_id, device_id);`);
  console.log('Database DDL sync completed successfully.');
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
