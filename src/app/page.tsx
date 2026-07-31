import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  let systems: any[] = [];
  try {
    systems = await prisma.system.findMany({
      orderBy: { createdAt: 'asc' }
    });
  } catch (error) {
    console.error("Failed to load systems from database:", error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Dashboard initialSystems={systems} />
    </main>
  );
}
