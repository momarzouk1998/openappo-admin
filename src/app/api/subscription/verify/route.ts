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

    // Strip time for accurate calendar day calculations (UTC midnight)
    const nowStr = now.toISOString().split('T')[0];
    const expStr = expiryDate.toISOString().split('T')[0];
    const finStr = finalDate.toISOString().split('T')[0];
    
    const todayMidnight = new Date(nowStr).getTime();
    const expMidnight = new Date(expStr).getTime();
    const finMidnight = new Date(finStr).getTime();

    const msInDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.round((expMidnight - todayMidnight) / msInDay);
    const graceDaysLeft = Math.round((finMidnight - todayMidnight) / msInDay);

    if (todayMidnight > finMidnight) {
      return NextResponse.json({ 
        active: false,
        status: "expired",
        message: "مرحباً يا فندم 👋، نعتذر لإيقاف النظام نظراً لانتهاء فترة السماح للاشتراك. برجاء تحويل قيمة التجديد للرقم 01558282760 (محفظة أو إنستاباي) وسيعود للعمل فوراً 🚀🤍" 
      });
    }

    // Grace Period Phase (today is strictly after normal expiration day, but <= final day)
    if (todayMidnight > expMidnight && todayMidnight <= finMidnight) {
      return NextResponse.json({ 
        active: true,
        status: "grace_period",
        graceDaysLeft,
        message: `عذراً يا فندم 🥺، انتهت فترة الاشتراك الأساسية ويتبقى ${graceDaysLeft} يوم في فترة السماح. يرجى تجديد الاشتراك عبر (محفظة أو إنستاباي) للرقم 01558282760 🔄🙏`
      });
    }

    // Warning Phase (expires today or within warningDaysThreshold)
    const warningDaysThreshold = system.warningDays || 3;
    if (daysLeft >= 0 && daysLeft <= warningDaysThreshold) {
      const formattedDate = new Date(expStr).toLocaleDateString("ar-EG");
      return NextResponse.json({ 
        active: true,
        status: "expiring_soon",
        daysLeft,
        message: `مقدرين وقتك وانشغالك جداً يا فندم 🤍، بنفكرك بموعد تجديد الاشتراك الشهري (سينتهي ${daysLeft === 0 ? 'اليوم' : 'بتاريخ ' + formattedDate}). يمكنك التحويل على الرقم 01558282760 (محفظة أو إنستاباي) 💳✨`
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
