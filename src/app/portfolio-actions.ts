"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma, ensureDbTables } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/session";
import {
  buildManifest,
  isValidSlug,
  parseYouTubeId,
  rowToProject,
  type PortfolioProject,
} from "@/lib/portfolio-data";
import {
  deleteObject,
  deletePrefix,
  keyFromPublicUrl,
  putObject,
  r2Configured,
} from "@/lib/r2";
import { PORTFOLIO_SEED } from "@/lib/portfolio-data";

async function requireOwner() {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "owner") {
    throw new Error("غير مصرح لك بهذا الإجراء");
  }
  return admin;
}

async function allProjects(): Promise<PortfolioProject[]> {
  const rows = await prisma.portfolioProject.findMany({
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });
  return (JSON.parse(JSON.stringify(rows)) as any[]).map(rowToProject);
}

/** Rebuild portfolio.json on R2 from the current DB state. */
async function republish(): Promise<{ ok: boolean; warning?: string }> {
  if (!r2Configured) {
    return {
      ok: false,
      warning:
        "لم يُنشر الملف على R2 — اضبط متغيرات R2 (وخصوصًا R2_PUBLIC_BASE) على السيرفر.",
    };
  }
  const manifest = buildManifest(await allProjects());
  await putObject(
    "portfolio.json",
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    "application/json; charset=utf-8"
  );
  return { ok: true };
}

export async function listPortfolio(): Promise<PortfolioProject[]> {
  await requireOwner();
  await ensureDbTables();
  return allProjects();
}

export async function createPortfolioProject(data: {
  slug: string;
  name: string;
  subtitle?: string;
  description?: string;
  youtubeUrl?: string;
}) {
  await requireOwner();
  await ensureDbTables();

  const slug = (data.slug || "").trim().toLowerCase();
  if (!isValidSlug(slug)) {
    throw new Error("المعرّف (slug) لازم يكون إنجليزي صغير وأرقام وشرطات فقط.");
  }
  if (!data.name?.trim()) throw new Error("اسم المشروع مطلوب.");

  const exists = await prisma.portfolioProject.findUnique({ where: { slug } });
  if (exists) throw new Error("فيه مشروع بنفس المعرّف بالفعل.");

  const max = await prisma.portfolioProject.aggregate({
    _max: { orderIndex: true },
  });

  await prisma.portfolioProject.create({
    data: {
      id: randomUUID(),
      slug,
      name: data.name.trim(),
      subtitle: (data.subtitle || "").trim(),
      description: (data.description || "").trim(),
      youtubeId: parseYouTubeId(data.youtubeUrl || ""),
      orderIndex: (max._max.orderIndex ?? 0) + 1,
      isPublished: false,
    },
  });

  revalidatePath("/portfolio");
  return republish();
}

export async function updatePortfolioProject(
  id: string,
  data: {
    name: string;
    subtitle?: string;
    description?: string;
    youtubeUrl?: string;
  }
) {
  await requireOwner();
  await ensureDbTables();
  if (!data.name?.trim()) throw new Error("اسم المشروع مطلوب.");

  await prisma.portfolioProject.update({
    where: { id },
    data: {
      name: data.name.trim(),
      subtitle: (data.subtitle || "").trim(),
      description: (data.description || "").trim(),
      youtubeId: parseYouTubeId(data.youtubeUrl || ""),
    },
  });

  revalidatePath("/portfolio");
  return republish();
}

/** Client sends the full ordered list of shot URLs after add / reorder / delete. */
export async function setPortfolioShots(id: string, shots: string[]) {
  await requireOwner();
  await ensureDbTables();

  const project = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!project) throw new Error("المشروع غير موجود.");

  const clean = (shots || []).filter((s) => typeof s === "string" && s.trim());

  // Delete any R2 objects that were dropped from the list.
  const before: string[] = (() => {
    try {
      return JSON.parse(project.shots || "[]");
    } catch {
      return [];
    }
  })();
  const removed = before.filter((u) => !clean.includes(u));
  for (const url of removed) {
    const key = keyFromPublicUrl(url);
    if (key) {
      try {
        await deleteObject(key);
      } catch {
        /* best effort */
      }
    }
  }

  await prisma.portfolioProject.update({
    where: { id },
    data: { shots: JSON.stringify(clean) },
  });

  revalidatePath("/portfolio");
  return republish();
}

export async function setPortfolioLogo(id: string, logoUrl: string) {
  await requireOwner();
  await ensureDbTables();

  const project = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!project) throw new Error("المشروع غير موجود.");

  if (project.logoUrl && project.logoUrl !== logoUrl) {
    const key = keyFromPublicUrl(project.logoUrl);
    if (key) {
      try {
        await deleteObject(key);
      } catch {
        /* best effort */
      }
    }
  }

  await prisma.portfolioProject.update({
    where: { id },
    data: { logoUrl: logoUrl || "" },
  });

  revalidatePath("/portfolio");
  return republish();
}

export async function togglePortfolioPublished(id: string, isPublished: boolean) {
  await requireOwner();
  await ensureDbTables();
  await prisma.portfolioProject.update({
    where: { id },
    data: { isPublished: Boolean(isPublished) },
  });
  revalidatePath("/portfolio");
  return republish();
}

export async function reorderPortfolio(orderedIds: string[]) {
  await requireOwner();
  await ensureDbTables();
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.portfolioProject.update({
        where: { id },
        data: { orderIndex: i },
      })
    )
  );
  revalidatePath("/portfolio");
  return republish();
}

export async function deletePortfolioProject(id: string) {
  await requireOwner();
  await ensureDbTables();

  const project = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!project) return republish();

  await prisma.portfolioProject.delete({ where: { id } });

  // Wipe the project's R2 folder + logo.
  try {
    await deletePrefix(`systems/${project.slug}/`);
    const logoKey = keyFromPublicUrl(project.logoUrl);
    if (logoKey) await deleteObject(logoKey);
  } catch {
    /* best effort */
  }

  revalidatePath("/portfolio");
  return republish();
}

/** Seed rows for any system in PORTFOLIO_SEED that has no row yet. */
export async function seedLegacyPortfolio() {
  await requireOwner();
  await ensureDbTables();

  const existing = await prisma.portfolioProject.findMany({
    select: { slug: true },
  });
  const have = new Set(existing.map((e) => e.slug));

  let created = 0;
  for (let i = 0; i < PORTFOLIO_SEED.length; i++) {
    const p = PORTFOLIO_SEED[i];
    if (have.has(p.slug)) continue;
    await prisma.portfolioProject.create({
      data: {
        id: randomUUID(),
        slug: p.slug,
        name: p.name,
        subtitle: p.subtitle,
        description: p.description,
        orderIndex: i,
        isPublished: false,
      },
    });
    created++;
  }

  revalidatePath("/portfolio");
  const pub = await republish();
  return { created, ...pub };
}

export async function republishPortfolio() {
  await requireOwner();
  await ensureDbTables();
  return republish();
}
