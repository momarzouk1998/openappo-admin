"use client";

import { useState, useMemo } from "react";
import {
  addPayment,
  updatePayment,
  deletePayment,
  type PaymentRow,
  type PaymentStats,
} from "@/app/actions";

type SystemOption = { id: string; displayName: string; monthlyFee: number };

type Props = {
  initialPayments: PaymentRow[];
  stats: PaymentStats;
  systems: SystemOption[];
  currentMonthLabel: string;
  nextMonthLabel: string;
};

const MONTHS_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

type ModalMode = "add" | "edit" | null;

export default function PaymentsDashboard({
  initialPayments,
  stats,
  systems,
  currentMonthLabel,
  nextMonthLabel,
}: Props) {
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [liveStats, setLiveStats] = useState<PaymentStats>(stats);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterMonth, setFilterMonth] = useState<string>(""); // "YYYY-MM" or ""
  const [filterSystem, setFilterSystem] = useState<string>("");

  // ── Modal state ──────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSystemId, setFormSystemId] = useState("");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDate, setFormDate] = useState(todayStr());
  const [formNote, setFormNote] = useState("");
  const [formType, setFormType] = useState<"subscription" | "setup">("subscription");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Derived: filtered payments ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const monthMatch = filterMonth
        ? p.paidAt.startsWith(filterMonth)
        : true;
      const sysMatch = filterSystem ? p.systemId === filterSystem : true;
      return monthMatch && sysMatch;
    });
  }, [payments, filterMonth, filterSystem]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, p) => s + p.amount, 0),
    [filtered]
  );

  // ── Available months from data ────────────────────────────────────────────
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => set.add(p.paidAt.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [payments]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setModalMode("add");
    setEditingId(null);
    setFormSystemId(systems[0]?.id ?? "");
    setFormAmount(systems[0]?.monthlyFee ?? 0);
    setFormDate(todayStr());
    setFormNote("");
    setFormType("subscription");
  };

  const openEdit = (p: PaymentRow) => {
    setModalMode("edit");
    setEditingId(p.id);
    setFormSystemId(p.systemId);
    setFormAmount(p.amount);
    setFormDate(p.paidAt.split("T")[0]);
    setFormNote(p.note);
    setFormType(p.type);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSystemChange = (id: string) => {
    setFormSystemId(id);
    if (formType === "subscription") {
      const sys = systems.find((s) => s.id === id);
      if (sys) setFormAmount(sys.monthlyFee);
    }
  };

  const handleTypeChange = (type: "subscription" | "setup") => {
    setFormType(type);
    if (type === "subscription") {
      const sys = systems.find((s) => s.id === formSystemId);
      setFormAmount(sys?.monthlyFee ?? 0);
    } else {
      setFormAmount(0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "add") {
        await addPayment({ systemId: formSystemId, amount: formAmount, paidAt: formDate, note: formNote, type: formType });
      } else if (modalMode === "edit" && editingId) {
        await updatePayment(editingId, { amount: formAmount, paidAt: formDate, note: formNote, type: formType });
      }
      // Refresh by reloading (consistent with existing MVP pattern)
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deletePayment(id);
      window.location.reload();
    } finally {
      setSaving(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans" dir="rtl">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">💳 سجل المدفوعات</h1>

      {/* ── Stats Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Current month */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl">✅</div>
            <p className="text-sm font-medium text-gray-500">تم تحصيله — {currentMonthLabel}</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{liveStats.currentMonthTotal.toLocaleString("ar-EG")} ج.م</p>
          <p className="text-xs text-gray-400 mt-1">{liveStats.currentMonthCount} دفعة مسجلة هذا الشهر</p>
        </div>

        {/* Next month forecast */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl">📅</div>
            <p className="text-sm font-medium text-gray-500">متوقع — {nextMonthLabel}</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{liveStats.nextMonthForecast.toLocaleString("ar-EG")} ج.م</p>
          <p className="text-xs text-gray-400 mt-1">
            {liveStats.nextMonthSystems.length} عميل لم يسدد بعد الشهر القادم
          </p>
        </div>

        {/* Next month breakdown */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center text-xl">🔔</div>
            <p className="text-sm font-medium text-gray-500">العملاء المتوقعون الشهر القادم</p>
          </div>
          {liveStats.nextMonthSystems.length === 0 ? (
            <p className="text-sm text-gray-400">الكل سدد بالفعل 🎉</p>
          ) : (
            <ul className="space-y-1 max-h-28 overflow-y-auto">
              {liveStats.nextMonthSystems.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="text-gray-700 truncate">{s.displayName}</span>
                  <span className="font-semibold text-orange-600 shrink-0 mr-2">{s.monthlyFee.toLocaleString()} ج.م</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Filters + Add button ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all text-sm"
        >
          + إضافة دفعة
        </button>

        <select
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">كل العملاء</option>
          {systems.map((s) => (
            <option key={s.id} value={s.id}>{s.displayName}</option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
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

        {(filterMonth || filterSystem) && (
          <span className="text-sm text-gray-500">
            إجمالي الفلتر: <strong className="text-gray-800">{filteredTotal.toLocaleString("ar-EG")} ج.م</strong>
            <span className="text-gray-400"> ({filtered.length} دفعة)</span>
          </span>
        )}
      </div>

      {/* ── Payments Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-lg font-medium">لا توجد مدفوعات مطابقة</p>
            <p className="text-sm mt-1">غيّر الفلتر أو أضف دفعة جديدة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">العميل</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">النوع</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">المبلغ</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">تاريخ الدفع</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ملاحظة</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{p.systemName}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.type === "setup" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {p.type === "setup" ? "تأسيس" : "اشتراك"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full text-sm">
                        {p.amount.toLocaleString("ar-EG")} ج.م
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-sm">{formatDate(p.paidAt)}</td>
                    <td className="px-5 py-4 text-gray-400 text-sm max-w-[200px] truncate">{p.note || "—"}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                {modalMode === "add" ? "➕ إضافة دفعة جديدة" : "✏️ تعديل الدفعة"}
              </h2>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع الدفعة</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("subscription")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      formType === "subscription"
                        ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    اشتراك شهري
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("setup")}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      formType === "setup"
                        ? "bg-purple-50 border-purple-300 text-purple-700"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    مبلغ تأسيس (مرة واحدة)
                  </button>
                </div>
              </div>

              {modalMode === "add" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                  <select
                    required
                    value={formSystemId}
                    onChange={(e) => handleSystemChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    {systems.map((s) => (
                      <option key={s.id} value={s.id}>{s.displayName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (ج.م)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الدفع</label>
                <input
                  required
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="مثال: تجديد شهر سبتمبر..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
                >
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">حذف الدفعة؟</h3>
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
