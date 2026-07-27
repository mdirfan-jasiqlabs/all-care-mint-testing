const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying table columns for bookings table...');
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'bookings';
  `;
  console.log('Columns in bookings table:', columns);
}

main().catch(console.error).finally(() => prisma.$disconnect());
