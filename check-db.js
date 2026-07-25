const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking database status...');
  const slotsCount = await prisma.bookingTimeSlot.count();
  const providersCount = await prisma.provider.count();
  const customersCount = await prisma.customer.count();

  console.log(`Slots: ${slotsCount}`);
  console.log(`Providers: ${providersCount}`);
  console.log(`Customers: ${customersCount}`);

  if (slotsCount === 0) {
    console.log('No slots found. Seeding active time slots...');
    const slots = [
      { label: '09:00 AM - 11:00 AM', startTime: new Date('1970-01-01T09:00:00Z'), endTime: new Date('1970-01-01T11:00:00Z'), displayOrder: 1 },
      { label: '11:00 AM - 01:00 PM', startTime: new Date('1970-01-01T11:00:00Z'), endTime: new Date('1970-01-01T13:00:00Z'), displayOrder: 2 },
      { label: '02:00 PM - 04:00 PM', startTime: new Date('1970-01-01T14:00:00Z'), endTime: new Date('1970-01-01T16:00:00Z'), displayOrder: 3 },
      { label: '04:00 PM - 06:00 PM', startTime: new Date('1970-01-01T16:00:00Z'), endTime: new Date('1970-01-01T18:00:00Z'), displayOrder: 4 },
    ];
    for (const slot of slots) {
      await prisma.bookingTimeSlot.create({
        data: {
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          displayOrder: slot.displayOrder,
          isActive: true
        }
      });
    }
    console.log('Slots seeded!');
  }

  if (providersCount === 0) {
    console.log('No providers found. Seeding APPROVED provider...');
    await prisma.provider.create({
      data: {
        mobileNumber: '+919876543211',
        displayName: 'Irfan Provider',
        status: 'APPROVED',
        serviceArea: 'Bengaluru'
      }
    });
    console.log('Provider seeded!');
  }

  if (customersCount === 0) {
    console.log('No customers found. Seeding active customer...');
    await prisma.customer.create({
      data: {
        mobileNumber: '+919876543210',
        displayName: 'Irfan Customer',
        firebaseUid: 'mock-uid-customer'
      }
    });
    console.log('Customer seeded!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
