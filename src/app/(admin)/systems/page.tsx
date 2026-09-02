import { prisma, ensureDbTables } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  let systems: any[] = [];
  let dbError: string | null = null;

  try {
    await ensureDbTables();

    const defaultSystems = [
      {
        id: "10000000-0000-0000-0000-000000000001",
        name: "elnazlawy-system",
        displayName: "معرض النزلاوي",
        monthlyFee: 750,
        subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        gracePeriodDays: 3,
        warningDays: 3,
      },
      {
        id: "10000000-0000-0000-0000-000000000002",
        name: "mazaya-system",
        displayName: "مزايا للأثاث",
        monthlyFee: 750,
        subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        gracePeriodDays: 3,
        warningDays: 3,
      },
      {
        id: "10000000-0000-0000-0000-000000000003",
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

    const rawSystems = await prisma.system.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Serialize Dates and Prisma objects to plain JSON
    systems = JSON.parse(JSON.stringify(rawSystems));
  } catch (error: any) {
    console.error("Failed to load systems from database:", error);
    dbError = error?.message || String(error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {dbError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 font-mono text-sm">
          <strong>Database Error:</strong> {dbError}
        </div>
      )}
      <Dashboard initialSystems={systems} />
    </main>
  );
}
