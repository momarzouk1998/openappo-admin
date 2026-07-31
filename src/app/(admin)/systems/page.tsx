import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  let systems: any[] = [];
  try {
    const rawSystems = await prisma.system.findMany({
      orderBy: { createdAt: 'asc' }
    });
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
