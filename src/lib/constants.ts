// Shared constants — NOT a server module, safe to import from client components

export const EXPENSE_CATEGORIES = [
  { value: "ads",      label: "إعلانات",       icon: "📢" },
  { value: "hosting",  label: "استضافة",        icon: "🌐" },
  { value: "database", label: "قاعدة بيانات",   icon: "🗄️" },
  { value: "ai",       label: "ذكاء اصطناعي",  icon: "🤖" },
  { value: "other",    label: "أخرى",           icon: "📦" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
