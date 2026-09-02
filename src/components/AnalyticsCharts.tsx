"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import type { MonthlyPoint } from "@/app/actions";

const COLORS = {
  collected: "#2563eb",
  expenses:  "#ef4444",
  profit:    "#10b981",
  active:    "#22c55e",
  inactive:  "#f87171",
};

type PiePoint = { name: string; value: number };

type Props = {
  monthly: MonthlyPoint[];
  activeSystems: number;
  inactiveSystems: number;
};

function ArabicTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-right text-sm" dir="rtl">
      <p className="font-bold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {entry.value.toLocaleString("ar-EG")} ج.م
        </p>
      ))}
    </div>
  );
}

export function AnalyticsCharts({ monthly, activeSystems, inactiveSystems }: Props) {
  const pieData: PiePoint[] = [
    { name: "نشط", value: activeSystems },
    { name: "متوقف", value: inactiveSystems },
  ].filter((d) => d.value > 0);

  const profitData = monthly.map((m) => ({
    ...m,
    profit: m.collected - m.expenses,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
      {/* ── Bar Chart: Revenue vs Expenses ─────────────────────────────── */}
      <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>📊</span> الإيرادات والمصروفات (آخر 6 أشهر)
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={profitData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.split(" ")[0]}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
              width={40}
            />
            <Tooltip content={<ArabicTooltip />} />
            <Legend
              formatter={(val) =>
                val === "collected" ? "المحصّل" : val === "expenses" ? "المصروفات" : "صافي الربح"
              }
              wrapperStyle={{ fontSize: 12, paddingTop: 12, direction: "rtl" }}
            />
            <Bar dataKey="collected" name="collected" fill={COLORS.collected} radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses"  name="expenses"  fill={COLORS.expenses}  radius={[6, 6, 0, 0]} />
            <Bar dataKey="profit"    name="profit"    fill={COLORS.profit}    radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Donut Chart: System Status ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>🥧</span> حالة الأنظمة
        </h2>
        <div className="flex-1 flex flex-col items-center justify-center">
          {pieData.length === 0 ? (
            <p className="text-gray-400 text-sm">لا توجد بيانات</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={i === 0 ? COLORS.active : COLORS.inactive}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [`${val} نظام`, name]}
                    contentStyle={{ direction: "rtl", borderRadius: 12, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-2">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ background: i === 0 ? COLORS.active : COLORS.inactive }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}: <strong>{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
