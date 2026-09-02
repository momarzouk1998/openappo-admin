"use client";

import { useState, useMemo } from "react";
import {
  addExpense,
  updateExpense,
  deleteExpense,
  type ExpenseRow,
  type ExpenseStats,
} from "@/app/actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

type Props = {
  initialExpenses: ExpenseRow[];
  stats: ExpenseStats;
  currentMonthLabel: string;
};

const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function categoryMeta(value: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ??
    { value: "other", label: "أخرى", icon: "📦" }
  );
}

type ModalMode = "add" | "edit" | null;

export default function ExpensesDashboard({
  initialExpenses,
  stats,
  currentMonthLabel,
}: Props) {
  const [expenses]        = useState<ExpenseRow[]>(initialExpenses);
  const [liveStats]       = useState<ExpenseStats>(stats);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filterMonth,    setFilterMonth]    = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [modalMode,      setModalMode]      = useState<ModalMode>(null);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [formCategory,   setFormCategory]   = useState("ads");
  const [formLabel,      setFormLabel]      = useState("");
  const [formAmount,     setFormAmount]     = useState<number>(0);
  const [formDate,       setFormDate]       = useState(todayStr());
  const [formNote,       setFormNote]       = useState("");
  const [saving,         setSaving]         = useState(false);
  const [deleteConfirmId,setDeleteConfirmId]= useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const monthOk = filterMonth    ? e.paidAt.startsWith(filterMonth)    : true;
      const catOk   = filterCategory ? e.category === filterCategory        : true;
      return monthOk && catOk;
    });
  }, [expenses, filterMonth, filterCategory]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered]
  );

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => set.add(e.paidAt.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setModalMode("add"); setEditingId(null);
    setFormCategory("ads"); setFormLabel("");
    setFormAmount(0); setFormDate(todayStr()); setFormNote("");
  };

  const openEdit = (e: ExpenseRow) => {
    setModalMode("edit"); setEditingId(e.id);
    setFormCategory(e.category); setFormLabel(e.label);
    setFormAmount(e.amount); setFormDate(e.paidAt.split("T")[0]); setFormNote(e.note);
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true);
    try {
      if (modalMode === "add") {
        await addExpense({ category: formCategory, label: formLabel, amount: formAmount, paidAt: formDate, note: formNote });
      } else if (modalMode === "edit" && editingId) {
        await updateExpense(editingId, { category: formCategory, label: formLabel, amount: formAmount, paidAt: formDate, note: formNote });
      }
      window.location.reload();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try { await deleteExpense(id); window.location.reload(); }
    finally { setSaving(false); setDeleteConfirmId(null); }
  };

  // ── Net profit color ──────────────────────────────────────────────────────
  const profitColor = liveStats.netProfit >= 0 ? "text-green-600" : "text-red-600";
  const profitBg    = liveStats.netProfit >= 0 ? "bg-green-50"    : "bg-red-50";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans" dir="rtl">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">💸 المصروفات</h1>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

        {/* Total expenses this month */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-xl">💸</div>
            <p className="text-sm font-medium text-gray-500">مصروفات — {currentMonthLabel}</p>
          </div>
          <p className="text-3xl font-bold text-red-500">
            {liveStats.currentMonthTotal.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-gray-400 mt-1">{liveStats.currentMonthCount} عملية هذا الشهر</p>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl">💰</div>
            <p className="text-sm font-medium text-gray-500">إيرادات — {currentMonthLabel}</p>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {liveStats.currentMonthRevenue.toLocaleString("ar-EG")} ج.م
          </p>
        </div>

        {/* Net profit */}
        <div className={`rounded-2xl p-6 shadow-sm border border-gray-100 ${profitBg}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${liveStats.netProfit >= 0 ? "bg-green-100" : "bg-red-100"}`}>
              {liveStats.netProfit >= 0 ? "📈" : "📉"}
            </div>
            <p className="text-sm font-medium text-gray-500">صافي الربح — {currentMonthLabel}</p>
          </div>
          <p className={`text-3xl font-bold ${profitColor}`}>
            {liveStats.netProfit >= 0 ? "+" : ""}{liveStats.netProfit.toLocaleString("ar-EG")} ج.م
          </p>
          <p className="text-xs text-gray-400 mt-1">إيرادات − مصروفات</p>
        </div>

        {/* By category breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-xl">🗂️</div>
            <p className="text-sm font-medium text-gray-500">توزيع المصروفات</p>
          </div>
          {liveStats.byCategory.length === 0 ? (
            <p className="text-sm text-gray-400">لا مصروفات هذا الشهر</p>
          ) : (
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {liveStats.byCategory
                .sort((a, b) => b.total - a.total)
                .map(({ category, total }) => {
                  const meta = categoryMeta(category);
                  return (
                    <li key={category} className="flex justify-between text-sm">
                      <span className="text-gray-600">{meta.icon} {meta.label}</span>
                      <span className="font-semibold text-gray-800">{total.toLocaleString()} ج.م</span>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      {/* ── Filters + Add ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={openAdd}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all text-sm"
        >
          + إضافة مصروف
        </button>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
        >
          <option value="">كل الفئات</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
        >
          <option value="">كل الأشهر</option>
          {monthOptions.map((m) => {
            const [y, mo] = m.split("-");
            return (
              <option key={m} value={m}>
                {MONTHS_AR[parseInt(mo, 10) - 1]} {y}
              </option>
            );
          })}
        </select>

        {(filterMonth || filterCategory) && (
          <span className="text-sm text-gray-500">
            إجمالي: <strong className="text-gray-800">{filteredTotal.toLocaleString("ar-EG")} ج.م</strong>
            <span className="text-gray-400"> ({filtered.length} عملية)</span>
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🪙</p>
            <p className="text-lg font-medium">لا توجد مصروفات مطابقة</p>
            <p className="text-sm mt-1">غيّر الفلتر أو أضف مصروفاً جديداً</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">الفئة</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">الوصف</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">المبلغ</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">التاريخ</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ملاحظة</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((e) => {
                  const meta = categoryMeta(e.category);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-gray-900">{e.label}</td>
                      <td className="px-5 py-4">
                        <span className="inline-block bg-red-50 text-red-600 font-bold px-3 py-1 rounded-full text-sm">
                          {e.amount.toLocaleString("ar-EG")} ج.م
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600 text-sm">{formatDate(e.paidAt)}</td>
                      <td className="px-5 py-4 text-gray-400 text-sm max-w-[180px] truncate">{e.note || "—"}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(e)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(e.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === "add" ? "➕ إضافة مصروف جديد" : "✏️ تعديل المصروف"}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <div className="grid grid-cols-5 gap-2">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormCategory(c.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-colors text-xs font-semibold ${
                        formCategory === c.value
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{c.icon}</span>
                      <span className="leading-tight text-center">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <input
                  required
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={`مثال: ${categoryMeta(formCategory).label} — سبتمبر`}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  dir="ltr"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  dir="ltr"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="تفاصيل إضافية..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">حذف المصروف؟</h3>
            <p className="text-sm text-gray-500 mb-6">هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
              >
                {saving ? "..." : "نعم، احذف"}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
