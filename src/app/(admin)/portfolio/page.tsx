import { redirect } from "next/navigation";
import { prisma, ensureDbTables } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";
import { rowToProject } from "@/lib/portfolio-data";
import { r2Configured, R2_PUBLIC_BASE } from "@/lib/r2";
import PortfolioManager from "@/components/PortfolioManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/portfolio")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  let initial: any[] = [];
  let dbError: string | null = null;
  try {
    await ensureDbTables();
    const rows = await prisma.portfolioProject.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    initial = (JSON.parse(JSON.stringify(rows)) as any[]).map(rowToProject);
  } catch (error: any) {
    console.error("Failed to load portfolio projects:", error);
    dbError = error?.message || String(error);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سابقة الأعمال</h1>
          <p className="text-sm text-gray-500 mt-1">
            المشاريع اللي بتظهر في صفحة{" "}
            <a
              href="https://openappo.com/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              openappo.com/portfolio
            </a>
            . أي تعديل بيتنشر خلال دقيقة بدون رفع كود.
          </p>
        </div>
      </div>

      {dbError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 font-mono text-sm">
          <strong>Database Error:</strong> {dbError}
        </div>
      )}

      {!r2Configured && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
          تخزين R2 لسه مش مكتمل الضبط على السيرفر
          {R2_PUBLIC_BASE ? "" : " (متغيّر R2_PUBLIC_BASE ناقص)"}. تقدر تضيف
          المشاريع دلوقتي، بس رفع الصور والنشر الفعلي هيشتغل بعد ضبط المتغيرات.
        </div>
      )}

      <PortfolioManager initial={initial} r2Ready={r2Configured} />
    </main>
  );
}
