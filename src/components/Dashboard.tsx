"use client";

import { useState } from "react";
import { addSystem, updateSystem, toggleSystemStatus } from "@/app/actions";

type System = {
  id: string;
  name: string;
  displayName: string;
  monthlyFee: number;
  subscriptionEndDate: Date;
  gracePeriodDays: number;
  warningDays: number;
  isActive: boolean;
};

export default function Dashboard({ initialSystems }: { initialSystems: System[] }) {
  const [systems, setSystems] = useState<System[]>(initialSystems);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState(0);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [gracePeriodDays, setGracePeriodDays] = useState(0);
  const [warningDays, setWarningDays] = useState(3);

  const openAddModal = () => {
    setEditingSystem(null);
    setName("");
    setDisplayName("");
    setMonthlyFee(0);
    setSubscriptionEndDate(new Date().toISOString().split("T")[0]);
    setGracePeriodDays(3);
    setWarningDays(3);
    setModalOpen(true);
  };

  const openEditModal = (sys: System) => {
    setEditingSystem(sys);
    setName(sys.name);
    setDisplayName(sys.displayName);
    setMonthlyFee(sys.monthlyFee);
    setSubscriptionEndDate(new Date(sys.subscriptionEndDate).toISOString().split("T")[0]);
    setGracePeriodDays(sys.gracePeriodDays);
    setWarningDays(sys.warningDays || 3);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSystem) {
      await updateSystem(editingSystem.id, {
        displayName,
        monthlyFee,
        subscriptionEndDate,
        gracePeriodDays,
        warningDays,
      });
    } else {
      await addSystem({
        name,
        displayName,
        monthlyFee,
        subscriptionEndDate,
        gracePeriodDays,
        warningDays,
      });
    }
    setModalOpen(false);
    window.location.reload(); // Quick refresh for MVP
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleSystemStatus(id, !currentStatus);
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans" dir="rtl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">إدارة الأنظمة</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all"
        >
          + إضافة نظام جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map((sys) => {
          const endDate = new Date(sys.subscriptionEndDate);
          const graceEnd = new Date(endDate.getTime() + sys.gracePeriodDays * 24 * 60 * 60 * 1000);
          const isExpired = new Date() > graceEnd;

          return (
            <div key={sys.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{sys.displayName}</h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">{sys.name}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${sys.isActive ? (isExpired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') : 'bg-gray-100 text-gray-700'}`}>
                  {!sys.isActive ? 'موقف' : (isExpired ? 'منتهي الصلاحية' : 'نشط')}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">الاشتراك الشهري:</span>
                  <span className="font-semibold text-gray-900">{sys.monthlyFee} ج.م</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">تاريخ الانتهاء:</span>
                  <span className="font-semibold text-gray-900">{endDate.toLocaleDateString("ar-EG")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">فترة السماح:</span>
                  <span className="font-semibold text-gray-900">{sys.gracePeriodDays} أيام</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">أيام التنبيه المبكر:</span>
                  <span className="font-semibold text-gray-900">{sys.warningDays} أيام</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button
                  onClick={() => openEditModal(sys)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleToggle(sys.id, sys.isActive)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${sys.isActive ? 'bg-orange-50 hover:bg-orange-100 text-orange-700' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}
                >
                  {sys.isActive ? 'إيقاف النظام' : 'تفعيل النظام'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSystem ? "تعديل النظام" : "إضافة نظام جديد"}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingSystem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">معرف النظام (System Name)</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="e.g. elnazlawy-system" />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العرض</label>
                <input required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="مثال: معرض النزلاوي" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاشتراك الشهري</label>
                <input required type="number" value={monthlyFee} onChange={e => setMonthlyFee(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
                <input required type="date" value={subscriptionEndDate} onChange={e => setSubscriptionEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">فترة السماح (بالأيام)</label>
                <input required type="number" value={gracePeriodDays} onChange={e => setGracePeriodDays(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تنبيه قبل الانتهاء بـ (بالأيام)</label>
                <input required type="number" value={warningDays} onChange={e => setWarningDays(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors">
                  حفظ
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
