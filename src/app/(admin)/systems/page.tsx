import { redirect } from "next/navigation";
import { prisma, ensureDbTables } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";

// Force dynamic rendering since data changes frequently
export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/systems")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  let systems: any[] = [];
  let dbError: string | null = null;

  try {
    await ensureDbTables();

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
      <Dashboard
        initialSystems={systems}
        isOwner={!admin || admin.role === "owner"}
        canSeePricing={!admin || admin.role === "owner" || admin.canSeePricing}
      />
    </main>
  );
}
