import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const systemName = searchParams.get("system");

  if (!systemName) {
    return NextResponse.json({ active: true, message: "Missing system parameter" });
  }

  try {
    const system = await prisma.system.findUnique({
      where: { name: systemName },
    });

    if (!system) {
      // If the system is not registered in the admin panel, we do not block it by default
      return NextResponse.json({ active: true });
    }

    if (!system.isActive) {
      return NextResponse.json({ 
        active: false, 
        message: "تم إيقاف هذا النظام من قبل الإدارة. يرجى التواصل لاستعادته." 
      });
    }

    const now = new Date();
    const expiryDate = new Date(system.subscriptionEndDate);
    const gracePeriodMs = system.gracePeriodDays * 24 * 60 * 60 * 1000;
    const finalDate = new Date(expiryDate.getTime() + gracePeriodMs);

    if (now > finalDate) {
      return NextResponse.json({ 
        active: false, 
        message: "لقد انتهت صلاحية اشتراك هذا النظام. يرجى تجديد الاشتراك للتمكن من الدخول." 
      });
    }

    return NextResponse.json({ active: true });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    // In case of error, fail open to avoid blocking unnecessarily
    return NextResponse.json({ active: true });
  }
}
