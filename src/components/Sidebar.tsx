"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { InstallPWAButton } from "./InstallPWAButton";
import { PushSubscribeButton } from "./PushSubscribeButton";

const ALL_LINKS = [
  { href: "/", label: "الإحصائيات", icon: "📊" },
  { href: "/systems", label: "إدارة الأنظمة", icon: "🖥️" },
  { href: "/payments",  label: "سجل المدفوعات", icon: "💳" },
  { href: "/expenses",  label: "المصروفات",      icon: "💸" },
  { href: "/settings",  label: "إعدادات الحساب", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState(ALL_LINKS);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.admin?.role === "staff") {
          const allowed: string[] = data.admin.allowedPages || [];
          setLinks(ALL_LINKS.filter((l) => allowed.includes(l.href)));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile Header & Hamburger Menu */}
      <div className="lg:hidden bg-white border-b border-gray-200 flex items-center justify-between p-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Image src="/icons/icon-192.png" alt="OpenAppo Admin" width={40} height={40} className="w-10 h-10 rounded-lg" priority />
          <span className="font-bold text-gray-800">OpenAppo</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gray-50 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 right-0 z-40 w-64 bg-white border-l border-gray-200 h-screen flex flex-col font-sans dir-rtl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-gray-200 hidden lg:flex lg:justify-center">
          <div className="flex flex-col items-center gap-2">
            <Image src="/icons/icon-192.png" alt="OpenAppo Admin" width={64} height={64} className="w-16 h-16 rounded-2xl shadow-md" priority />
            <span className="font-bold text-gray-800 text-lg">OpenAppo Admin</span>
          </div>
        </div>
        <div className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
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
        <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
          <InstallPWAButton />
          <PushSubscribeButton />
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
