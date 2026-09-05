export const ALL_PAGES = [
  { href: "/", label: "الإحصائيات" },
  { href: "/systems", label: "إدارة الأنظمة" },
  { href: "/payments", label: "سجل المدفوعات" },
  { href: "/expenses", label: "المصروفات" },
  { href: "/reports", label: "التقارير" },
  { href: "/settings", label: "إعدادات الحساب" },
] as const;

export function firstAllowedPage(allowedPages: string[]): string {
  const found = ALL_PAGES.find((p) => allowedPages.includes(p.href));
  return found?.href || "/login";
}
