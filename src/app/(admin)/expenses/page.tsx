import { redirect } from "next/navigation";
import { ensureDbTables } from "@/lib/prisma";
import { getExpenses } from "@/app/actions";
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

  const expenses = await getExpenses();

  return <ExpensesDashboard initialExpenses={expenses} />;
}
