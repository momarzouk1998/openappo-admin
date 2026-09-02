"use client";

import { useEffect, useState } from "react";

export function PushSubscribeButton() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSupported(true);
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
          setSubscribed(false);
        }
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
          || "BM60FWH1bqwiFuHJ3RQk6yijXl5aPs3EnmLd-Ykd-VwAjd3C_PTKOVFQiI2EjjiAbUyFe8R87NL4DAMYducvAfU";
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
        setSubscribed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={subscribed ? "إيقاف الإشعارات" : "تفعيل الإشعارات"}
      className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
        subscribed
          ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
      }`}
    >
      <span className="text-lg">{subscribed ? "🔔" : "🔕"}</span>
      <span>{loading ? "..." : subscribed ? "إشعارات مفعلة" : "تفعيل الإشعارات"}</span>
    </button>
  );
}
