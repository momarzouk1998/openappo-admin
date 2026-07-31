"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addSystem(data: { name: string; displayName: string; monthlyFee: number; subscriptionEndDate: string; gracePeriodDays: number; warningDays: number }) {
  await prisma.system.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
    }
  });
  revalidatePath("/");
}

export async function updateSystem(id: string, data: { displayName: string; monthlyFee: number; subscriptionEndDate: string; gracePeriodDays: number; warningDays: number }) {
  await prisma.system.update({
    where: { id },
    data: {
      displayName: data.displayName,
      monthlyFee: data.monthlyFee,
      subscriptionEndDate: new Date(data.subscriptionEndDate),
      gracePeriodDays: data.gracePeriodDays,
      warningDays: data.warningDays,
    }
  });
  revalidatePath("/");
}

export async function toggleSystemStatus(id: string, isActive: boolean) {
  await prisma.system.update({
    where: { id },
    data: { isActive },
  });
  revalidatePath("/");
}
