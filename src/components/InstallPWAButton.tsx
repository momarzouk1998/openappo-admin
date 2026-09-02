'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) { setInstalled(true); return; }

    // Pick up event captured before React mounted (fires early on Android)
    if ((window as any).__pwaPrompt) {
      setDeferredPrompt((window as any).__pwaPrompt as BeforeInstallPromptEvent);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).__pwaPrompt = e;
    };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') { setInstalled(true); setDeferredPrompt(null); }
    } else if (isIOS) {
      setShowIOSHint(true);
    }
  }

  if (installed) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-400/30"
      >
        <Download className="w-4 h-4 animate-bounce" />
        <span>تثبيت البرنامج</span>
      </button>

      {showIOSHint && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowIOSHint(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-sm text-right space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <h3 className="font-bold text-base text-gray-900">📱 تثبيت البرنامج على iPhone</h3>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal pr-4">
              <li>اضغط على زر <strong>مشاركة (Share) ⎙</strong> أسفل صفحة Safari.</li>
              <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>.</li>
            </ol>
            <button
              onClick={() => setShowIOSHint(false)}
              className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </>
  );
}
