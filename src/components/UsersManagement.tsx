"use client";

import { useState } from "react";
import {
  addStaffAdmin,
  updateAdminPermissions,
  resetAdminPassword,
  deleteAdmin,
  type AdminRow,
} from "@/app/actions";

const ALL_PAGES = [
  { href: "/", label: "الإحصائيات" },
  { href: "/systems", label: "إدارة الأنظمة" },
  { href: "/payments", label: "سجل المدفوعات" },
  { href: "/expenses", label: "المصروفات" },
  { href: "/settings", label: "إعدادات الحساب" },
];

export default function UsersManagement({ initialAdmins }: { initialAdmins: AdminRow[] }) {
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState("");

  // Add form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [allowedPages, setAllowedPages] = useState<string[]>(["/systems"]);
  const [canSeePricing, setCanSeePricing] = useState(false);

  const togglePage = (href: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(href) ? list.filter((p) => p !== href) : [...list, href]);
  };

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setAllowedPages(["/systems"]);
    setCanSeePricing(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await addStaffAdmin({ username, password, allowedPages, canSeePricing });
      resetForm();
      setShowAddForm(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "حدث خطأ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    await deleteAdmin(id);
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 max-w-2xl mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">المستخدمون والصلاحيات</h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {showAddForm ? "إلغاء" : "+ إضافة مستخدم"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
            <input
              required
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input
              required
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
              placeholder="6 أحرف على الأقل"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الصفحات المسموح بها</label>
            <div className="flex flex-wrap gap-2">
              {ALL_PAGES.map((p) => (
                <label
                  key={p.href}
                  className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border ${
                    allowedPages.includes(p.href)
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allowedPages.includes(p.href)}
                    onChange={() => togglePage(p.href, allowedPages, setAllowedPages)}
                    className="hidden"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-white rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={canSeePricing}
              onChange={(e) => setCanSeePricing(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <span className="text-sm font-semibold text-gray-800">السماح برؤية أسعار الاشتراكات</span>
              <p className="text-xs text-gray-500 mt-0.5">
                لو متروكة بدون تفعيل، المستخدم يقدر يجدد الاشتراك بس من غير ما يشوف قيمته
              </p>
            </div>
          </label>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold">
            حفظ المستخدم
          </button>
        </form>
      )}

      <div className="space-y-3">
        {admins.map((a) => (
          <AdminCard key={a.id} admin={a} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function AdminCard({ admin, onDelete }: { admin: AdminRow; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [allowedPages, setAllowedPages] = useState<string[]>(admin.allowedPages);
  const [canSeePricing, setCanSeePricing] = useState(admin.canSeePricing);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const togglePage = (href: string) => {
    setAllowedPages((prev) => (prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminPermissions(admin.id, { allowedPages, canSeePricing });
      if (newPassword) {
        await resetAdminPassword(admin.id, newPassword);
        setNewPassword("");
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-semibold text-gray-900">{admin.username}</p>
          <p className="text-xs text-gray-400">{admin.role === "owner" ? "مالك (كل الصلاحيات)" : "موظف"}</p>
        </div>
        {admin.role !== "owner" && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
            >
              {editing ? "إغلاق" : "تعديل الصلاحيات"}
            </button>
            <button
              onClick={() => onDelete(admin.id)}
              className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium"
            >
              حذف
            </button>
          </div>
        )}
      </div>

      {admin.role !== "owner" && !editing && (
        <p className="text-xs text-gray-500 mt-2">
          الصفحات: {admin.allowedPages.length ? admin.allowedPages.join("، ") : "لا شيء"} ·{" "}
          {admin.canSeePricing ? "يشوف الأسعار" : "مايشوفش الأسعار"}
        </p>
      )}

      {editing && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap gap-2">
            {ALL_PAGES.map((p) => (
              <label
                key={p.href}
                className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border ${
                  allowedPages.includes(p.href)
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <input
                  type="checkbox"
                  checked={allowedPages.includes(p.href)}
                  onChange={() => togglePage(p.href)}
                  className="hidden"
                />
                {p.label}
              </label>
            ))}
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={canSeePricing}
              onChange={(e) => setCanSeePricing(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-800">السماح برؤية أسعار الاشتراكات</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تغيير كلمة المرور (اختياري)</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              dir="ltr"
              placeholder="اتركها فارغة لعدم التغيير"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-70"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      )}
    </div>
  );
}
