import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getFinancialReport } from "@/app/actions";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";
import ReportsDashboard from "@/components/ReportsDashboard";

export const dynamic = "force-dynamic";

import { currentMonthRange } from "@/lib/dates";

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
