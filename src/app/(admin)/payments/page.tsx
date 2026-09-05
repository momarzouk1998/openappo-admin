import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getPayments, getPaymentStats, getSystems } from "@/app/actions";
import PaymentsDashboard from "@/components/PaymentsDashboard";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/payments")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  await ensureDbTables();

  const [payments, stats, systems] = await Promise.all([
    getPayments(),
    getPaymentStats(),
    getSystems(),
  ]);

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  const nextMonthLabel = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(
    "ar-EG",
    { month: "long", year: "numeric" }
  );

  return (
    <PaymentsDashboard
      initialPayments={payments}
      stats={stats}
      systems={systems}
      currentMonthLabel={currentMonthLabel}
      nextMonthLabel={nextMonthLabel}
    />
  );
}
