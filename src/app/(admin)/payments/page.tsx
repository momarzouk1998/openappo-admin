import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getPayments, getSystems } from "@/app/actions";
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

  const [payments, systems] = await Promise.all([
    getPayments(),
    getSystems(),
  ]);

  return <PaymentsDashboard initialPayments={payments} systems={systems} />;
}
