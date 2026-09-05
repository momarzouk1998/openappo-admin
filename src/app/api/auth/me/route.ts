import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/session";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  return NextResponse.json({ admin });
}
