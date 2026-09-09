import { NextResponse } from "next/server";
import { prisma, ensureDbTables } from "@/lib/prisma";
import { buildManifest, rowToProject } from "@/lib/portfolio-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, unauthenticated (see middleware allow-list). The marketing site reads
// the R2 manifest first and can fall back to this endpoint.
export async function GET() {
  try {
    await ensureDbTables();
    const rows = await prisma.portfolioProject.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    const projects = (JSON.parse(JSON.stringify(rows)) as any[]).map(rowToProject);
    const manifest = buildManifest(projects);
    return NextResponse.json(manifest, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30, s-maxage=60",
      },
    });
  } catch (err) {
    console.error("public portfolio manifest failed:", err);
    return NextResponse.json(
      { updatedAt: new Date().toISOString(), projects: [] },
      { status: 200 }
    );
  }
}
