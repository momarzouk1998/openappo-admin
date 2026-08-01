import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  let systems: any[] = [];
  try {
    systems = await prisma.system.findMany();
    if (systems.length === 0) {
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
        }
      ];

      for (const sys of defaultSystems) {
        await prisma.system.upsert({
          where: { name: sys.name },
          update: {},
          create: sys,
        });
      }

      systems = await prisma.system.findMany();
    }
  } catch (error) {
    console.error("Failed to fetch systems in StatsPage:", error);
  }
  
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalSystems = systems.length;
  let activeSystems = 0;
  let inactiveSystems = 0;
  let totalMonthlyRevenue = 0;
  const expiringSoon: typeof systems = [];

  systems.forEach((s) => {
    const expiryDate = new Date(s.subscriptionEndDate);
    const gracePeriodMs = (s.gracePeriodDays || 0) * 24 * 60 * 60 * 1000;
    const finalDate = new Date(expiryDate.getTime() + gracePeriodMs);
    
    // System is active if manually toggled ON and hasn't passed its final grace date
    const isActuallyActive = s.isActive && now <= finalDate;

    if (isActuallyActive) {
      activeSystems++;
      totalMonthlyRevenue += (s.monthlyFee || 0);
      
      // If it's active but expires within 30 days (even if it's in grace period)
      if (expiryDate <= thirtyDaysFromNow) {
        expiringSoon.push(s);
      }
    } else {
      inactiveSystems++;
    }
  });

  return (
    <div className="p-8 dir-rtl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">نظرة عامة على الأنظمة 📊</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4">
            📈
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">الأنظمة المسجلة</p>
          <h3 className="text-3xl font-bold text-gray-900">{totalSystems}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-2xl mb-4">
            ✅
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">الأنظمة الفعالة</p>
          <h3 className="text-3xl font-bold text-green-600">{activeSystems}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl mb-4">
            ❌
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">الأنظمة المتوقفة</p>
          <h3 className="text-3xl font-bold text-red-600">{inactiveSystems}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center text-2xl mb-4">
            💰
          </div>
          <p className="text-sm text-gray-500 font-medium mb-1">إجمالي الدخل الشهري</p>
          <h3 className="text-3xl font-bold text-orange-600">{totalMonthlyRevenue} ج.م</h3>
        </div>
      </div>

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
                  <th className="pb-3 font-semibold text-gray-500">اسم النظام</th>
                  <th className="pb-3 font-semibold text-gray-500">المعرف</th>
                  <th className="pb-3 font-semibold text-gray-500">تاريخ الانتهاء</th>
                  <th className="pb-3 font-semibold text-gray-500">الاشتراك</th>
                </tr>
              </thead>
              <tbody>
                {expiringSoon.map((sys) => (
                  <tr key={sys.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">{sys.displayName}</td>
                    <td className="py-4 text-gray-500 font-mono text-sm">{sys.name}</td>
                    <td className="py-4 text-red-600 font-medium">
                      {new Date(sys.subscriptionEndDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-4 text-gray-900">{sys.monthlyFee} ج.م</td>
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
