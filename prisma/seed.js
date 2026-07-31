const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial data...");

  // Seed Admin
  const adminUsername = "01008977105";
  const adminPassword = "123456";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: hashedPassword,
    }
  });
  console.log("Admin seeded.");

  const systems = [
    {
      name: "elnazlawy-system",
      displayName: "معرض النزلاوي",
      monthlyFee: 750,
      subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // +1 month
      gracePeriodDays: 3,
    },
    {
      name: "mazaya-system",
      displayName: "مزايا للأثاث",
      monthlyFee: 750,
      subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      gracePeriodDays: 3,
    },
    {
      name: "Rtx",
      displayName: "RTX للتجارة",
      monthlyFee: 700,
      subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      gracePeriodDays: 3,
    }
  ];

  for (const sys of systems) {
    await prisma.system.upsert({
      where: { name: sys.name },
      update: {},
      create: sys,
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
