import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/auth";
import { cookies } from "next/headers";

import { ensureDbTables } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    await ensureDbTables();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "اسم المستخدم وكلمة المرور مطلوبان" }, { status: 400 });
    }

    let admin = await prisma.admin.findUnique({
      where: { username },
    });

    // Auto-create default admin user if database is fresh
    if (!admin && username === "01008977105") {
      const hashedPassword = await bcrypt.hash("123456", 10);
      admin = await prisma.admin.create({
        data: {
          username: "01008977105",
          password: hashedPassword,
        }
      });
    }

    if (!admin) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    // Create session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const session = await encrypt({ adminId: admin.id, username: admin.username, expires });

    const cookieStore = await cookies();
    cookieStore.set("admin_session", session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
