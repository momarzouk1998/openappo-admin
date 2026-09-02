"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Systems ─────────────────────────────────────────────────────────────────

export async function addSystem(data: {
  name: string;
  displayName: string;
  monthlyFee: number;
  subscriptionEndDate: string;
  gracePeriodDays: number;
  warningDays: number;
}) {
  await prisma.system.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
    },
  });
  revalidatePath("/");
  revalidatePath("/payments");
}

export async function updateSystem(
  id: string,
  data: {
    displayName: string;
    monthlyFee: number;
    subscriptionEndDate: string;
    gracePeriodDays: number;
    warningDays: number;
    recordPayment?: boolean; // whether to auto-record a payment for this renewal
  }
) {
  const existing = await prisma.system.findUnique({ where: { id } });

  await prisma.system.update({
    where: { id },
    data: {
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
    },
  });

  // Auto-record a payment when the subscription date was actually extended
  if (data.recordPayment && existing) {
    const oldDate = new Date(existing.subscriptionEndDate).toISOString().split("T")[0];
    const newDate = new Date(data.subscriptionEndDate).toISOString().split("T")[0];
    const dateChanged = oldDate !== newDate;

    if (dateChanged) {
      await prisma.payment.create({
        data: {
          systemId: id,
          systemName: data.displayName,
          amount: data.monthlyFee,
          // paidAt = the NEW subscription end date (represents the month being paid for)
          paidAt: new Date(data.subscriptionEndDate),
        },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/payments");
}

export async function toggleSystemStatus(id: string, isActive: boolean) {
  await prisma.system.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/");
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function addPayment(data: {
  systemId: string;
  amount: number;
  paidAt: string;
  note?: string;
}) {
  const system = await prisma.system.findUnique({ where: { id: data.systemId } });
  if (!system) throw new Error("النظام غير موجود");

  await prisma.payment.create({
    data: {
      systemId: data.systemId,
      systemName: system.displayName,
      amount: data.amount,
      paidAt: new Date(data.paidAt),
      note: data.note ?? "",
    },
  });
  revalidatePath("/payments");
}

export async function updatePayment(
  id: string,
  data: { amount: number; paidAt: string; note?: string }
) {
  await prisma.payment.update({
    where: { id },
    data: {
      amount: data.amount,
      paidAt: new Date(data.paidAt),
      note: data.note ?? "",
      updatedAt: new Date(),
    },
  });
  revalidatePath("/payments");
}

export async function deletePayment(id: string) {
  await prisma.payment.delete({ where: { id } });
  revalidatePath("/payments");
}

// ─── Payment Queries (used by server components) ─────────────────────────────

export type PaymentRow = {
  id: string;
  systemId: string;
  systemName: string;
  amount: number;
  paidAt: string; // ISO string
  note: string;
  createdAt: string;
};

export type PaymentStats = {
  currentMonthTotal: number;
  currentMonthCount: number;
  nextMonthForecast: number;
  nextMonthSystems: { id: string; displayName: string; monthlyFee: number }[];
};

export async function getPayments(): Promise<PaymentRow[]> {
  const rows = await prisma.payment.findMany({
    orderBy: { paidAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    systemId: r.systemId,
    systemName: r.systemName,
    amount: r.amount,
    paidAt: r.paidAt.toISOString(),
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getPaymentStats(): Promise<PaymentStats> {
  const now = new Date();

  // Current month boundaries (local midnight)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Next month boundaries
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  // Payments collected THIS month
  const currentMonthPayments = await prisma.payment.findMany({
    where: { paidAt: { gte: currentMonthStart, lte: currentMonthEnd } },
  });
  const currentMonthTotal = currentMonthPayments.reduce((s, p) => s + p.amount, 0);

  // Active systems whose subscriptionEndDate falls in NEXT month
  // = they'll need to renew next month (haven't paid yet for that month)
  const allActiveSystems = await prisma.system.findMany({
    where: { isActive: true },
  });

  // Systems that have already paid for next month (paidAt in next month range)
  const nextMonthPaidSystemIds = await prisma.payment.findMany({
    where: { paidAt: { gte: nextMonthStart, lte: nextMonthEnd } },
    select: { systemId: true },
  });
  const alreadyPaidNextMonth = new Set(nextMonthPaidSystemIds.map((p) => p.systemId));

  // Forecast = active systems that have NOT already paid for next month
  const nextMonthSystems = allActiveSystems
    .filter((s) => !alreadyPaidNextMonth.has(s.id))
    .map((s) => ({ id: s.id, displayName: s.displayName, monthlyFee: s.monthlyFee }));

  const nextMonthForecast = nextMonthSystems.reduce((s, sys) => s + sys.monthlyFee, 0);

  return {
    currentMonthTotal,
    currentMonthCount: currentMonthPayments.length,
    nextMonthForecast,
    nextMonthSystems,
  };
}

export async function getSystems() {
  const systems = await prisma.system.findMany({ orderBy: { createdAt: "asc" } });
  return systems.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    monthlyFee: s.monthlyFee,
  }));
}

export type MonthlyPoint = {
  month: string; // "يناير 2026"
  collected: number;
  expenses: number;
};

export async function getMonthlyChartData(months = 6): Promise<MonthlyPoint[]> {
  const now = new Date();
  const result: MonthlyPoint[] = [];

  const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                     "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [pays, exps] = await Promise.all([
      prisma.payment.findMany({ where: { paidAt: { gte: start, lte: end } } }),
      prisma.expense.findMany({ where: { paidAt: { gte: start, lte: end } } }),
    ]);

    result.push({
      month: `${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`,
      collected: pays.reduce((s, p) => s + p.amount, 0),
      expenses:  exps.reduce((s, e) => s + e.amount, 0),
    });
  }
  return result;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

// EXPENSE_CATEGORIES and ExpenseCategory live in @/lib/constants (shared with client)
export type { ExpenseCategory } from "@/lib/constants";

export type ExpenseRow = {
  id: string;
  category: string;
  label: string;
  amount: number;
  paidAt: string; // ISO
  note: string;
  createdAt: string;
};

export type ExpenseStats = {
  currentMonthTotal: number;
  currentMonthCount: number;
  byCategory: { category: string; total: number }[];
  netProfit: number;          // currentMonth payments revenue - currentMonth expenses
  currentMonthRevenue: number;
};

export async function addExpense(data: {
  category: string;
  label: string;
  amount: number;
  paidAt: string;
  note?: string;
}) {
  await prisma.expense.create({
    data: {
      category: data.category,
      label: data.label,
      amount: data.amount,
      paidAt: new Date(data.paidAt),
      note: data.note ?? "",
    },
  });
  revalidatePath("/expenses");
}

export async function updateExpense(
  id: string,
  data: { category: string; label: string; amount: number; paidAt: string; note?: string }
) {
  await prisma.expense.update({
    where: { id },
    data: {
      category: data.category,
      label: data.label,
      amount: data.amount,
      paidAt: new Date(data.paidAt),
      note: data.note ?? "",
      updatedAt: new Date(),
    },
  });
  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
}

export async function getExpenses(): Promise<ExpenseRow[]> {
  const rows = await prisma.expense.findMany({ orderBy: { paidAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    amount: r.amount,
    paidAt: r.paidAt.toISOString(),
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [monthExpenses, monthPayments] = await Promise.all([
    prisma.expense.findMany({ where: { paidAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.payment.findMany({ where: { paidAt: { gte: monthStart, lte: monthEnd } } }),
  ]);

  const currentMonthTotal   = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const currentMonthRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);

  // group by category
  const catMap: Record<string, number> = {};
  for (const e of monthExpenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
  }
  const byCategory = Object.entries(catMap).map(([category, total]) => ({ category, total }));

  return {
    currentMonthTotal,
    currentMonthCount: monthExpenses.length,
    byCategory,
    netProfit: currentMonthRevenue - currentMonthTotal,
    currentMonthRevenue,
  };
}
