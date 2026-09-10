/**
 * Repoint every stored portfolio asset URL at a new R2 public base, then
 * rewrite portfolio.json. Use after moving the bucket from the rate-limited
 * `*.r2.dev` dev URL onto a custom domain (or between custom domains).
 *
 * Run inside the admin container (needs its node_modules + env):
 *   docker cp scripts/rebase-portfolio-urls.mjs openappo-admin:/app/
 *   docker exec -w /app openappo-admin node rebase-portfolio-urls.mjs <NEW_BASE> [--apply]
 *
 * Without --apply it only prints what would change.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const NEW_BASE = (process.argv[2] || "").replace(/\/+$/, "");
const APPLY = process.argv.includes("--apply");

if (!/^https:\/\/[^/]+$/.test(NEW_BASE)) {
  console.error("usage: node rebase-portfolio-urls.mjs https://cdn.example.com [--apply]");
  process.exit(1);
}

const prisma = new PrismaClient();
const rows = await prisma.portfolioProject.findMany({ orderBy: { orderIndex: "asc" } });

// Anything that looks like one of our own asset URLs, whatever base it carries.
const rebase = (url) => {
  if (!url) return url;
  const m = url.match(/^https?:\/\/[^/]+\/((?:systems|logos)\/.+)$/);
  return m ? `${NEW_BASE}/${m[1]}` : url;
};

let changed = 0;
for (const r of rows) {
  const shots = JSON.parse(r.shots || "[]");
  const nextShots = shots.map(rebase);
  const nextLogo = rebase(r.logoUrl);
  const dirty =
    nextLogo !== r.logoUrl || JSON.stringify(nextShots) !== JSON.stringify(shots);
  console.log(
    `${r.slug.padEnd(14)} shots=${shots.length} logo=${r.logoUrl ? "y" : "n"} ${dirty ? "→ CHANGED" : "unchanged"}`
  );
  if (dirty && APPLY) {
    await prisma.portfolioProject.update({
      where: { id: r.id },
      data: { logoUrl: nextLogo, shots: JSON.stringify(nextShots) },
    });
    changed++;
  } else if (dirty) {
    changed++;
  }
}

if (!APPLY) {
  console.log(`\n${changed} project(s) would change. Re-run with --apply.`);
  await prisma.$disconnect();
  process.exit(0);
}

// Rewrite the manifest from the updated rows.
const fresh = await prisma.portfolioProject.findMany({
  orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
});
const manifest = {
  updatedAt: new Date().toISOString(),
  projects: fresh
    .filter((r) => r.isPublished && JSON.parse(r.shots || "[]").length > 0)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      subtitle: r.subtitle,
      desc: r.description,
      youtubeId: r.youtubeId,
      logo: r.logoUrl,
      shots: JSON.parse(r.shots || "[]"),
    })),
};

const s3 = new S3Client({
  region: "auto",
  endpoint:
    process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
await s3.send(
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: "portfolio.json",
    Body: Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    ContentType: "application/json; charset=utf-8",
    CacheControl: "public, max-age=60",
  })
);

console.log(`\napplied to ${changed} project(s); manifest rewritten with ${manifest.projects.length} published.`);
console.log("Remember to set R2_PUBLIC_BASE in /opt/openappo-admin/.env and recreate the container.");
await prisma.$disconnect();
