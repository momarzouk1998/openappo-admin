import { NextRequest, NextResponse } from "next/server";
import { prisma, ensureDbTables } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    await ensureDbTables();
    const { endpoint, keys } = await req.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "بيانات الاشتراك غير صالحة" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `INSERT OR REPLACE INTO PushSubscription (id, endpoint, p256dh, auth, createdAt)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      randomUUID(), endpoint, keys.p256dh, keys.auth
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "فشل الاشتراك" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    await prisma.$executeRawUnsafe(
      `DELETE FROM PushSubscription WHERE endpoint = ?`, endpoint
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "فشل إلغاء الاشتراك" }, { status: 500 });
  }
}
