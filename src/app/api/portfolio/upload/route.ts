import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentAdmin } from "@/lib/session";
import { isValidSlug } from "@/lib/portfolio-data";
import { putObject, r2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB — client downscales before sending

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "owner") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (!r2Configured) {
    return NextResponse.json(
      { error: "تخزين R2 غير مضبوط على السيرفر (R2_PUBLIC_BASE وغيره)." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const slug = String(form.get("slug") || "").trim().toLowerCase();
  const kind = String(form.get("kind") || "shot");
  const file = form.get("file");

  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "معرّف مشروع غير صالح" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرفاق ملف" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "الملف كبير جدًا" }, { status: 413 });
  }

  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "صيغة غير مدعومة (JPG / PNG / WebP فقط)" },
      { status: 415 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const stamp = Date.now().toString(36);
  const rand = randomUUID().slice(0, 8);
  const key =
    kind === "logo"
      ? `logos/${slug}-${stamp}.${ext}`
      : `systems/${slug}/${stamp}-${rand}.${ext}`;

  try {
    const url = await putObject(key, buf, file.type);
    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("R2 upload failed:", err);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 502 });
  }
}
