import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getFinancialReport } from "@/app/actions";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";
import ReportsDashboard from "@/components/ReportsDashboard";

export const dynamic = "force-dynamic";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  return { from: toISO(start), to: toISO(end) };
}

export default async function ReportsPage() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/reports")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  await ensureDbTables();

  const { from, to } = currentMonthRange();
  const report = await getFinancialReport(from, to);

  return (
    <ReportsDashboard
      initialReport={report}
      canSeePricing={!admin || admin.role === "owner" || admin.canSeePricing}
    />
  );
}
