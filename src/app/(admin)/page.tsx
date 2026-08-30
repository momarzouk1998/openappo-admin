import { prisma, ensureDbTables } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let systems: any[] = [];
  let currentMonthCollected = 0;
  let currentMonthExpenses  = 0;

  try {
    await ensureDbTables();

    const defaultSystems = [
      {
        name: "elnazlawy-system",
        displayName: "معرض النزلاوي",
        monthlyFee: 750,
        subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        gracePeriodDays: 3,
        warningDays: 3,
      },
      {
        name: "mazaya-system",
        displayName: "مزايا للأثاث",
        monthlyFee: 750,
        subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        gracePeriodDays: 3,
        warningDays: 3,
      },
      {
        name: "Rtx",
        displayName: "RTX للتجارة",
        monthlyFee: 700,
        subscriptionEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        gracePeriodDays: 3,
        warningDays: 3,
      },
    ];

    for (const sys of defaultSystems) {
      await prisma.system.upsert({
        where: { name: sys.name },
        update: {},
        create: sys,
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [rawSystems, monthPayments, monthExpensesRows] = await Promise.all([
      prisma.system.findMany(),
      prisma.payment.findMany({ where: { paidAt: { gte: monthStart, lte: monthEnd } } }),
      prisma.expense.findMany({ where: { paidAt: { gte: monthStart, lte: monthEnd } } }),
    ]);

    systems = rawSystems;
    currentMonthCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
    currentMonthExpenses  = monthExpensesRows.reduce((s, e) => s + e.amount, 0);
  } catch (error) {
    console.error("Failed to fetch systems in StatsPage:", error);
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const currentMonthLabel = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  let totalSystems        = systems.length;
  let activeSystems       = 0;
  let inactiveSystems     = 0;
  let totalExpectedRevenue = 0; // sum of monthlyFee for truly active systems
  const expiringSoon: typeof systems = [];

  systems.forEach((s) => {
    const expiryDate    = new Date(s.subscriptionEndDate);
    const gracePeriodMs = (s.gracePeriodDays || 0) * 24 * 60 * 60 * 1000;
    const finalDate     = new Date(expiryDate.getTime() + gracePeriodMs);
    const isActuallyActive = s.isActive && now <= finalDate;

    if (isActuallyActive) {
      activeSystems++;
      totalExpectedRevenue += s.monthlyFee || 0;
      if (expiryDate <= thirtyDaysFromNow) expiringSoon.push(s);
    } else {
      inactiveSystems++;
    }
  });

  const netProfit = currentMonthCollected - currentMonthExpenses;

  return (
    <div className="p-6 md:p-8 dir-rtl" dir="rtl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">نظرة عامة 📊</h1>

      {/* ── Row 1: Systems counts ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon="📈" iconBg="bg-blue-50"   iconColor="text-blue-600"
          label="الأنظمة المسجلة"
          value={totalSystems}
        />
        <StatCard icon="✅" iconBg="bg-green-50"  iconColor="text-green-600"
          label="الأنظمة الفعالة"
          value={activeSystems}
          valueColor="text-green-600"
        />
        <StatCard icon="❌" iconBg="bg-red-50"    iconColor="text-red-500"
          label="الأنظمة المتوقفة"
          value={inactiveSystems}
          valueColor="text-red-500"
        />
        <StatCard icon="💡" iconBg="bg-orange-50" iconColor="text-orange-500"
          label="الإيرادات المتوقعة شهرياً"
          value={`${totalExpectedRevenue.toLocaleString("ar-EG")} ج.م`}
          valueColor="text-orange-500"
        />
      </div>

      {/* ── Row 2: Financial this month ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {/* Collected */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl shrink-0">
              💳
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">المحصّل فعلاً</p>
              <p className="text-xs text-gray-500 font-semibold">{currentMonthLabel}</p>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-green-600">
            {currentMonthCollected.toLocaleString("ar-EG")}
            <span className="text-base font-semibold text-green-500 mr-1">ج.م</span>
          </p>
          {totalExpectedRevenue > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>نسبة التحصيل</span>
                <span>{Math.min(100, Math.round((currentMonthCollected / totalExpectedRevenue) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (currentMonthCollected / totalExpectedRevenue) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-xl shrink-0">
              💸
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">المصروفات</p>
              <p className="text-xs text-gray-500 font-semibold">{currentMonthLabel}</p>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-red-500">
            {currentMonthExpenses.toLocaleString("ar-EG")}
            <span className="text-base font-semibold text-red-400 mr-1">ج.م</span>
          </p>
          {currentMonthCollected > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>نسبة من المحصّل</span>
                <span>{Math.round((currentMonthExpenses / currentMonthCollected) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-red-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (currentMonthExpenses / currentMonthCollected) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Net Profit */}
        <div className={`rounded-2xl shadow-sm border p-6 ${netProfit >= 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 ${netProfit >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
              {netProfit >= 0 ? "📈" : "📉"}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">صافي الربح</p>
              <p className="text-xs text-gray-500 font-semibold">{currentMonthLabel}</p>
            </div>
          </div>
          <p className={`text-3xl font-extrabold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {netProfit >= 0 ? "+" : ""}
            {netProfit.toLocaleString("ar-EG")}
            <span className={`text-base font-semibold mr-1 ${netProfit >= 0 ? "text-emerald-500" : "text-red-400"}`}>ج.م</span>
          </p>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            محصّل {currentMonthCollected.toLocaleString("ar-EG")} −&nbsp;
            مصروفات {currentMonthExpenses.toLocaleString("ar-EG")}
          </p>
        </div>
      </div>

      {/* ── Expiring soon table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span>⚠️</span>
          <span>أنظمة تقترب من انتهاء الاشتراك (خلال 30 يوم)</span>
        </h2>

        {expiringSoon.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد أنظمة تقترب من انتهاء الاشتراك حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 font-semibold text-gray-500 text-sm">اسم النظام</th>
                  <th className="pb-3 font-semibold text-gray-500 text-sm">المعرف</th>
                  <th className="pb-3 font-semibold text-gray-500 text-sm">تاريخ الانتهاء</th>
                  <th className="pb-3 font-semibold text-gray-500 text-sm">الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map((sys) => (
                  <tr key={sys.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">{sys.displayName}</td>
                    <td className="py-4 text-gray-400 font-mono text-sm">{sys.name}</td>
                    <td className="py-4 text-red-600 font-medium text-sm">
                      {new Date(sys.subscriptionEndDate).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-4 text-gray-900 font-semibold">{sys.monthlyFee} ج.م</td>
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

/* ── Reusable mini stat card ────────────────────────────────────────────────── */
function StatCard({
  icon, iconBg, iconColor, label, value, valueColor = "text-gray-900",
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center gap-3">
      <div className={`w-11 h-11 ${iconBg} ${iconColor} rounded-full flex items-center justify-center text-xl`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 font-medium leading-snug">{label}</p>
      <p className={`text-2xl font-extrabold ${valueColor}`}>{value}</p>
    </div>
  );
}
