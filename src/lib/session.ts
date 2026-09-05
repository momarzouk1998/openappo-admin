import { cookies } from "next/headers";
import { decrypt } from "./auth";
import { prisma } from "./prisma";

export type CurrentAdmin = {
  id: string;
  username: string;
  role: "owner" | "staff";
  allowedPages: string[];
  canSeePricing: boolean;
};

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;
    if (!sessionCookie) return null;

    const payload = await decrypt(sessionCookie);
    if (!payload?.adminId) return null;

    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId as string } });
    if (!admin) return null;

    let allowedPages: string[] = [];
    try {
      allowedPages = JSON.parse(admin.allowedPages || "[]");
    } catch {
      allowedPages = [];
    }

    return {
      id: admin.id,
      username: admin.username,
      role: (admin.role as "owner" | "staff") || "owner",
      allowedPages,
      canSeePricing: admin.canSeePricing ?? true,
    };
  } catch {
    return null;
  }
}
