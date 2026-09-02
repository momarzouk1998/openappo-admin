"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __pwaPrompt: any;
  }
}

type State = "standalone" | "native" | "ios" | "android" | null;

export function InstallPWAButton() {
  const [state, setState] = useState<State>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setState("standalone");
      return;
    }

    const ua = navigator.userAgent;
    const isIos    = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const isAndroid = /android/i.test(ua);

    // iOS Safari → manual guide
    if (isIos && isSafari) {
      setState("ios");
      return;
    }

    // Check if the event was already captured before React loaded
    if (window.__pwaPrompt) {
      setState("native");
      return;
    }

    // Android Chrome → listen for late-firing event
    if (isAndroid) {
      setState("android"); // show button immediately
      window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        window.__pwaPrompt = e;
        setState("native"); // upgrade to native prompt
      });
      return;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      setState("native");
    });

    window.addEventListener("appinstalled", () => setState("standalone"));
  }, []);

  const triggerNative = async () => {
    if (!window.__pwaPrompt) { setShowGuide(true); return; }
    await window.__pwaPrompt.prompt();
    const { outcome } = await window.__pwaPrompt.userChoice;
    if (outcome === "accepted") setState("standalone");
    window.__pwaPrompt = null;
  };

  if (state === null || state === "standalone") return null;

  return (
    <>
      <button
        onClick={state === "ios" || state === "android" ? () => setShowGuide(true) : triggerNative}
        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm"
      >
        <span className="text-lg">📲</span>
        <span>تثبيت التطبيق</span>
      </button>

      {/* Guide overlay */}
      {showGuide && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {state === "ios" ? (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">تثبيت على iPhone</h3>
                <ol className="space-y-4 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">1️⃣</span>
                    <span>اضغط على زر <strong>المشاركة</strong> <span className="text-blue-500 text-base">⎙</span> في أسفل Safari</span>
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
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">تثبيت على Android</h3>
                <ol className="space-y-4 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">1️⃣</span>
                    <span>اضغط على <strong>⋮</strong> (القائمة) في أعلى Chrome</span>
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
              </>
            )}
            <button
              onClick={() => setShowGuide(false)}
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
