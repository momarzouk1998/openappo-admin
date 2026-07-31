import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const systemName = searchParams.get("system");

  if (!systemName) {
    return NextResponse.json({ active: true, status: "active", message: "Missing system parameter" });
  }

  try {
    const system = await prisma.system.findUnique({
      where: { name: systemName },
    });

    if (!system) {
      // If the system is not registered in the admin panel, we do not block it by default
      return NextResponse.json({ active: true, status: "active" });
    }

    if (!system.isActive) {
      return NextResponse.json({ 
        active: false,
        status: "suspended",
        message: "تم إيقاف هذا النظام من قبل الإدارة. يرجى التواصل لاستعادته." 
      });
    }

    const now = new Date();
    const expiryDate = new Date(system.subscriptionEndDate);
    const gracePeriodMs = system.gracePeriodDays * 24 * 60 * 60 * 1000;
    const finalDate = new Date(expiryDate.getTime() + gracePeriodMs);

    // Calculate time differences in days
    const msInDay = 24 * 60 * 60 * 1000;
    
    // Total days until normal expiration
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / msInDay);
    
    // Total days until absolute block (end of grace period)
    const graceDaysLeft = Math.ceil((finalDate.getTime() - now.getTime()) / msInDay);

    if (now > finalDate) {
      return NextResponse.json({ 
        active: false,
        status: "expired",
        message: "لقد انتهت صلاحية اشتراك هذا النظام. يرجى تجديد الاشتراك للتمكن من الدخول." 
      });
    }

    // Grace Period Phase (Normal Expiration passed, but still within grace days)
    if (now > expiryDate && now <= finalDate) {
      return NextResponse.json({ 
        active: true,
        status: "grace_period",
        graceDaysLeft,
        message: `لقد انتهت فترة الاشتراك الأساسية. النظام يعمل الآن في فترة السماح ويتبقى ${graceDaysLeft} يوم قبل التوقف التام.`
      });
    }

    // Warning Phase (3 days or less until normal expiration)
    if (daysLeft > 0 && daysLeft <= 3) {
      return NextResponse.json({ 
        active: true,
        status: "expiring_soon",
        daysLeft,
        message: `تنبيه: سينتهي اشتراك هذا النظام بعد ${daysLeft} يوم. يرجى المبادرة بالتجديد لضمان استمرار الخدمة.`
      });
    }

    // Safe Phase
    return NextResponse.json({ active: true, status: "active" });
  } catch (error) {
    console.error("Error verifying subscription:", error);
    // In case of error, fail open to avoid blocking unnecessarily
    return NextResponse.json({ active: true, status: "active" });
  }
}
