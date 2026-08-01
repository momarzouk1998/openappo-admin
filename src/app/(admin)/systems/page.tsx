import { prisma, ensureDbTables } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  let systems: any[] = [];
  try {
    await ensureDbTables();

    let rawSystems = await prisma.system.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Auto-seed default systems if DB is empty
    if (rawSystems.length === 0) {
      const defaultSystems = [
        {
          name: "elnazlawy-system",
          displayName: "معرض النزلاوي",
          monthlyFee: 750,
          subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          gracePeriodDays: 3,
          warningDays: 3,
        },
        {
          name: "mazaya-system",
          displayName: "مزايا للأثاث",
          monthlyFee: 750,
          subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          gracePeriodDays: 3,
          warningDays: 3,
        },
        {
          name: "Rtx",
          displayName: "RTX للتجارة",
          monthlyFee: 700,
          subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          gracePeriodDays: 3,
          warningDays: 3,
        }
      ];

      for (const sys of defaultSystems) {
        await prisma.system.upsert({
          where: { name: sys.name },
          update: {},
          create: sys,
        });
      }

      rawSystems = await prisma.system.findMany({
        orderBy: { createdAt: 'asc' }
      });
    }

    // Serialize Dates and Prisma objects to plain JSON
    systems = JSON.parse(JSON.stringify(rawSystems));
  } catch (error) {
    console.error("Failed to load systems from database:", error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Dashboard initialSystems={systems} />
    </main>
  );
}
