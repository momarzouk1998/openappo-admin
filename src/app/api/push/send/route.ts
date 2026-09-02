import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbTables } from "@/lib/prisma";
import { webpush } from "@/lib/push";

type SubRow = { endpoint: string; p256dh: string; auth: string };

export async function POST(req: NextRequest) {
  try {
    await ensureDbTables();
    const { title, body, url } = await req.json();

    const subs = await prisma.$queryRawUnsafe<SubRow[]>(
      `SELECT endpoint, p256dh, auth FROM PushSubscription`
    );

    if (subs.length === 0) {
      return NextResponse.json({ sent: 0, message: "لا يوجد مشتركون" });
    }

    const payload = JSON.stringify({
      title: title ?? "OpenAppo Admin",
      body:  body  ?? "إشعار جديد",
      url:   url   ?? "/",
      icon:  "/icon-192.png",
      badge: "/icon-96.png",
    });

    let sent = 0;
    const stale: string[] = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(sub.endpoint);
        }
      }
    }

    // Remove expired subscriptions
    for (const ep of stale) {
      await prisma.$executeRawUnsafe(`DELETE FROM PushSubscription WHERE endpoint = ?`, ep);
    }

    return NextResponse.json({ sent, removed: stale.length });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: "فشل الإرسال" }, { status: 500 });
  }
}
