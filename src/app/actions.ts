"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/session";
import bcrypt from "bcryptjs";
import { parseInputDate, formatDateToYYYYMMDD } from "@/lib/dates";

// ─── Systems ─────────────────────────────────────────────────────────────────

async function requireOwner() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "owner") {
    throw new Error("غير مصرح لك بهذا الإجراء");
  }
  return admin;
}

export async function addSystem(data: {
  name: string;
  displayName: string;
  monthlyFee: number;
  subscriptionEndDate: string;
  gracePeriodDays: number;
  warningDays: number;
  customerPhone?: string;
  accountantPhone?: string;
}) {
  await requireOwner();
  await prisma.system.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
      customerPhone: data.customerPhone ?? "",
      accountantPhone: data.accountantPhone ?? "",
    },
  });
  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/systems");
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
    customerPhone?: string;
    accountantPhone?: string;
  }
) {
  await requireOwner();
  const existing = await prisma.system.findUnique({ where: { id } });

  await prisma.system.update({
    where: { id },
    data: {
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
      customerPhone: data.customerPhone ?? "",
      accountantPhone: data.accountantPhone ?? "",
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
  revalidatePath("/systems");
}

export async function toggleSystemStatus(id: string, isActive: boolean) {
  await requireOwner();
  await prisma.system.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/");
  revalidatePath("/systems");
}

// Restricted, safe renewal — usable by staff accounts that can't see pricing.
// Never accepts a client-supplied fee; always reuses the system's existing
// monthlyFee for the payment record so a staff user never learns the price.
export async function renewSystem(
  id: string,
  data: { subscriptionEndDate: string; recordPayment?: boolean }
) {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error("غير مصرح لك بهذا الإجراء");

  const existing = await prisma.system.findUnique({ where: { id } });
  if (!existing) throw new Error("النظام غير موجود");

  await prisma.system.update({
    where: { id },
    data: { subscriptionEndDate: new Date(data.subscriptionEndDate) },
  });

  if (data.recordPayment) {
    const oldDate = new Date(existing.subscriptionEndDate).toISOString().split("T")[0];
    const newDate = new Date(data.subscriptionEndDate).toISOString().split("T")[0];
    if (oldDate !== newDate) {
      await prisma.payment.create({
        data: {
          systemId: id,
          systemName: existing.displayName,
          amount: existing.monthlyFee,
          paidAt: new Date(data.subscriptionEndDate),
        },
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/systems");
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function addPayment(data: {
  systemId: string;
  amount: number;
  paidAt: string;
  note?: string;
  type?: "subscription" | "setup";
}) {
  const system = await prisma.system.findUnique({ where: { id: data.systemId } });
  if (!system) throw new Error("النظام غير موجود");

  await prisma.payment.create({
    data: {
      systemId: data.systemId,
      systemName: system.displayName,
      amount: data.amount,
      paidAt: parseInputDate(data.paidAt),
      type: data.type ?? "subscription",
      note: data.note ?? "",
    },
  });
  revalidatePath("/payments");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function updatePayment(
  id: string,
  data: { amount: number; paidAt: string; note?: string; type?: "subscription" | "setup" }
) {
  await prisma.payment.update({
    where: { id },
    data: {
      amount: data.amount,
      paidAt: parseInputDate(data.paidAt),
      note: data.note ?? "",
      ...(data.type ? { type: data.type } : {}),
      updatedAt: new Date(),
    },
  });
  revalidatePath("/payments");
  revalidatePath("/reports");
  revalidatePath("/");
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
  type: "subscription" | "setup";
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
    type: (r.type as "subscription" | "setup") || "subscription",
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
      paidAt: parseInputDate(data.paidAt),
      note: data.note ?? "",
    },
  });
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/");
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
      paidAt: parseInputDate(data.paidAt),
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

// ─── Staff Users (owner-only) ─────────────────────────────────────────────────

export type AdminRow = {
  id: string;
  username: string;
  role: "owner" | "staff";
  allowedPages: string[];
  canSeePricing: boolean;
};

export async function getAdmins(): Promise<AdminRow[]> {
  await requireOwner();
  const rows = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map((a) => ({
    id: a.id,
    username: a.username,
    role: (a.role as "owner" | "staff") || "owner",
    allowedPages: (() => {
      try { return JSON.parse(a.allowedPages || "[]"); } catch { return []; }
    })(),
    canSeePricing: a.canSeePricing ?? true,
  }));
}

export async function addStaffAdmin(data: {
  username: string;
  password: string;
  allowedPages: string[];
  canSeePricing: boolean;
}) {
  await requireOwner();
  if (!data.username || !data.password || data.password.length < 6) {
    throw new Error("اسم المستخدم مطلوب وكلمة المرور 6 أحرف على الأقل");
  }
  const hashedPassword = await bcrypt.hash(data.password, 10);
  await prisma.admin.create({
    data: {
      username: data.username,
      password: hashedPassword,
      role: "staff",
      allowedPages: JSON.stringify(data.allowedPages),
      canSeePricing: data.canSeePricing,
    },
  });
  revalidatePath("/settings");
}

export async function updateAdminPermissions(
  id: string,
  data: { allowedPages: string[]; canSeePricing: boolean }
) {
  await requireOwner();
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) throw new Error("المستخدم غير موجود");
  if (target.role === "owner") throw new Error("لا يمكن تقييد صلاحيات المالك");

  await prisma.admin.update({
    where: { id },
    data: {
      allowedPages: JSON.stringify(data.allowedPages),
      canSeePricing: data.canSeePricing,
    },
  });
  revalidatePath("/settings");
}

export async function resetAdminPassword(id: string, newPassword: string) {
  await requireOwner();
  if (!newPassword || newPassword.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({ where: { id }, data: { password: hashedPassword } });
  revalidatePath("/settings");
}

export async function deleteAdmin(id: string) {
  await requireOwner();
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return;
  if (target.role === "owner") throw new Error("لا يمكن حذف حساب المالك");
  await prisma.admin.delete({ where: { id } });
  revalidatePath("/settings");
}

// ─── Financial Reports (date-range) ───────────────────────────────────────────

export type FinancialReport = {
  from: string; // ISO date
  to: string;   // ISO date
  subscriptionTotal: number;
  setupFeeTotal: number;
  collectedTotal: number; // subscriptionTotal + setupFeeTotal
  expensesTotal: number;
  netProfit: number;
  paymentCount: number;
  expenseCount: number;
  expensesByCategory: { category: string; total: number }[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
};

export async function getFinancialReport(from: string, to: string): Promise<FinancialReport> {
  // Buffer start by -12h and end by +12h to safely capture records across timezone boundaries
  const rangeStart = new Date(new Date(`${from}T00:00:00.000Z`).getTime() - 12 * 3600 * 1000);
  const rangeEnd = new Date(new Date(`${to}T23:59:59.999Z`).getTime() + 12 * 3600 * 1000);

  const [rawPayments, rawExpenses] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { paidAt: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  // Precise local date string filter: guarantees matching all items that fall within from..to in local time
  const payments = rawPayments.filter((p) => {
    const dStr = formatDateToYYYYMMDD(p.paidAt);
    return dStr >= from && dStr <= to;
  });

  const expenses = rawExpenses.filter((e) => {
    const dStr = formatDateToYYYYMMDD(e.paidAt);
    return dStr >= from && dStr <= to;
  });

  let subscriptionTotal = 0;
  let setupFeeTotal = 0;
  for (const p of payments) {
    if ((p.type || "subscription") === "setup") setupFeeTotal += p.amount;
    else subscriptionTotal += p.amount;
  }

  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const collectedTotal = subscriptionTotal + setupFeeTotal;

  const catMap: Record<string, number> = {};
  for (const e of expenses) {
    catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
  }
  const expensesByCategory = Object.entries(catMap).map(([category, total]) => ({ category, total }));

  return {
    from,
    to,
    subscriptionTotal,
    setupFeeTotal,
    collectedTotal,
    expensesTotal,
    netProfit: collectedTotal - expensesTotal,
    paymentCount: payments.length,
    expenseCount: expenses.length,
    expensesByCategory,
    payments: payments.map((p) => ({
      id: p.id,
      systemId: p.systemId,
      systemName: p.systemName,
      amount: p.amount,
      paidAt: p.paidAt.toISOString(),
      type: (p.type as "subscription" | "setup") || "subscription",
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      label: e.label,
      amount: e.amount,
      paidAt: e.paidAt.toISOString(),
      note: e.note,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
