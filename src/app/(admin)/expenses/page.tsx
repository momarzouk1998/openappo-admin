import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getExpenses, getExpenseStats } from "@/app/actions";
import ExpensesDashboard from "@/components/ExpensesDashboard";
import { getCurrentAdmin } from "@/lib/session";
import { firstAllowedPage } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const admin = await getCurrentAdmin();
  if (admin && admin.role === "staff" && !admin.allowedPages.includes("/expenses")) {
    redirect(firstAllowedPage(admin.allowedPages));
  }

  await ensureDbTables();

  const [expenses, stats] = await Promise.all([
    getExpenses(),
    getExpenseStats(),
  ]);

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });

  return (
    <ExpensesDashboard
      initialExpenses={expenses}
      stats={stats}
      currentMonthLabel={currentMonthLabel}
    />
  );
}
