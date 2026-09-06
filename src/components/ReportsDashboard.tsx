"use client";

import { useState, useTransition } from "react";
import { getFinancialReport, type FinancialReport } from "@/app/actions";

import { currentMonthRange } from "@/lib/dates";

const CATEGORY_LABELS: Record<string, string> = {
  ads: "إعلانات",
  hosting: "استضافة",
  database: "قاعدة بيانات",
  ai: "ذكاء اصطناعي",
  other: "أخرى",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

export default function ReportsDashboard({
  initialReport,
  canSeePricing,
}: {
  initialReport: FinancialReport;
  canSeePricing: boolean;
}) {
  const [report, setReport] = useState<FinancialReport>(initialReport);
  const [from, setFrom] = useState(initialReport.from);
  const [to, setTo] = useState(initialReport.to);
  const [isPending, startTransition] = useTransition();

  const runReport = (f: string, t: string) => {
    if (!f || !t) return;
    startTransition(async () => {
      const r = await getFinancialReport(f, t);
      setReport(r);
      setFrom(f);
      setTo(t);
    });
  };

  const resetToCurrentMonth = () => {
    const { from: f, to: t } = currentMonthRange();
    runReport(f, t);
  };

  if (!canSeePricing) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 dir-rtl" dir="rtl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">التقارير 📑</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-500">
          مش متاح لك تشوف التقارير المالية. تواصل مع المالك لو محتاج صلاحية.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 dir-rtl max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">التقارير 📑</h1>

      {/* ── Date range filter ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => runReport(e.target.value, to)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => runReport(from, e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            dir="ltr"
          />
        </div>
        <button
          onClick={resetToCurrentMonth}
          className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200"
        >
          الشهر الحالي
        </button>
        {isPending && <span className="text-sm text-gray-400">جاري التحديث...</span>}
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-2">اشتراكات شهرية</p>
          <p className="text-2xl font-bold text-blue-600">{report.subscriptionTotal.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span></p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-2">مبالغ تأسيس</p>
          <p className="text-2xl font-bold text-purple-600">{report.setupFeeTotal.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span></p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-2">إجمالي المصروفات</p>
          <p className="text-2xl font-bold text-red-500">{report.expensesTotal.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span></p>
        </div>
        <div className={`rounded-2xl p-5 shadow-sm border ${report.netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <p className="text-xs text-gray-500 font-medium mb-2">صافي الربح</p>
          <p className={`text-2xl font-bold ${report.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {report.netProfit >= 0 ? "+" : ""}{report.netProfit.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-6">
        الفترة: {formatDate(report.from)} — {formatDate(report.to)} · {report.paymentCount} دفعة · {report.expenseCount} مصروف
      </p>

      {/* ── Expenses by category ───────────────────────────────────────────── */}
      {report.expensesByCategory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">المصروفات حسب الفئة</h2>
          <div className="space-y-2">
            {report.expensesByCategory.map((c) => (
              <div key={c.category} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-600">{CATEGORY_LABELS[c.category] || c.category}</span>
                <span className="font-semibold text-gray-900">{c.total.toLocaleString("ar-EG")} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payments in range ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 p-6 pb-0">المدفوعات خلال الفترة</h2>
        {report.payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد مدفوعات في هذه الفترة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500">العميل</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500">النوع</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500">المبلغ</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{p.systemName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.type === "setup" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {p.type === "setup" ? "تأسيس" : "اشتراك"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-green-700">{p.amount.toLocaleString("ar-EG")} ج.م</td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">{formatDate(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
