import { ensureDbTables } from "@/lib/prisma";
import { getExpenses, getExpenseStats } from "@/app/actions";
import ExpensesDashboard from "@/components/ExpensesDashboard";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
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
