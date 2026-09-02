"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type InstallState = "standalone" | "prompt" | "ios" | "unsupported";

export function InstallPWAButton() {
  const [state, setState] = useState<InstallState | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setState("standalone");
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      setState("ios");
      return;
    }

    // Chrome/Edge: listen for the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setState("prompt");
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setState("standalone"));

    // Show generic button on Android even before prompt fires
    const isMobile = /android|mobile/i.test(navigator.userAgent);
    if (isMobile) setState("unsupported"); // fallback until prompt fires

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (state === null || state === "standalone") return null;

  // iOS: show instructions overlay
  if (state === "ios") {
    return (
      <>
        <button
          onClick={() => setShowIosHelp(true)}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm"
        >
          <span className="text-lg">📲</span>
          <span>تثبيت التطبيق</span>
        </button>

        {showIosHelp && (
          <div
            className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
            onClick={() => setShowIosHelp(false)}
          >
            <div
              className="bg-white rounded-t-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">تثبيت التطبيق على iPhone</h3>
              <ol className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">1️⃣</span>
                  <span>اضغط على زر <strong>المشاركة</strong> أسفل الشاشة <span className="text-blue-500">⎙</span></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">2️⃣</span>
                  <span>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">3️⃣</span>
                  <span>اضغط <strong>إضافة</strong> ✅</span>
                </li>
              </ol>
              <button
                onClick={() => setShowIosHelp(false)}
                className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium"
              >
                تمام
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Chrome/Android: native prompt available
  if (state === "prompt" && prompt) {
    return (
      <button
        onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === "accepted") setState("standalone");
        }}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm"
      >
        <span className="text-lg">📲</span>
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // Android but prompt not fired yet — show button that explains
  if (state === "unsupported") {
    return (
      <button
        onClick={() => setShowIosHelp(true)}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors font-medium text-sm"
      >
        <span className="text-lg">📲</span>
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  return null;
}
