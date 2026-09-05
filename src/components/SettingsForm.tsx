"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل تغيير كلمة المرور");
      }

      setSuccess("تم تغيير كلمة المرور بنجاح! سيتم تسجيل خروجك...");

      // Logout after 2 seconds
      setTimeout(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 max-w-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-6">تغيير كلمة المرور</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 border border-green-100">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الحالية</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور الجديدة</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور الجديدة</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            required
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !!success}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition shadow-md shadow-blue-200 disabled:opacity-70"
        >
          {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}
