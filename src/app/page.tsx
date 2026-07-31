import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  const systems = await prisma.system.findMany({
    orderBy: { createdAt: 'asc' }
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <Dashboard initialSystems={systems} />
    </main>
  );
}
