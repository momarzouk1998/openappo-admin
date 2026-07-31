"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", label: "الإحصائيات", icon: "📊" },
    { href: "/systems", label: "إدارة الأنظمة", icon: "🖥️" },
    { href: "/settings", label: "إعدادات الحساب", icon: "⚙️" },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 bg-white border-l border-gray-200 min-h-screen flex flex-col font-sans dir-rtl">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 text-center">OpenAppo Admin</h1>
      </div>
      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname === link.href
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
