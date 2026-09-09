// Shared portfolio types + helpers. Safe to import from client and server
// (no server-only imports here).

export type PortfolioProjectRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  youtubeId: string;
  logoUrl: string;
  shots: string; // JSON string of string[] in the DB
  orderIndex: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PortfolioProject = Omit<PortfolioProjectRow, "shots"> & {
  shots: string[];
};

export function parseShots(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x) => typeof x === "string");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rowToProject(r: PortfolioProjectRow): PortfolioProject {
  return { ...r, shots: parseShots(r.shots), isPublished: Boolean(r.isPublished) };
}

/** Accepts a full YouTube URL or a bare id and returns the 11-char video id. */
export function parseYouTubeId(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) ||
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export function isValidSlug(s: string): boolean {
  return SLUG_RE.test(s) && s.length <= 40;
}

// The manifest the marketing site consumes. Only published projects, ordered.
export type ManifestProject = {
  slug: string;
  name: string;
  subtitle: string;
  desc: string;
  youtubeId: string;
  logo: string;
  shots: string[];
};

export function buildManifest(projects: PortfolioProject[]): {
  updatedAt: string;
  projects: ManifestProject[];
} {
  const published = projects
    .filter((p) => p.isPublished && p.shots.length > 0)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name))
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      desc: p.description,
      youtubeId: p.youtubeId,
      logo: p.logoUrl,
      shots: p.shots,
    }));
  return { updatedAt: new Date().toISOString(), projects: published };
}

// ─── Legacy metadata (mirrors the old app/portfolio/PortfolioGallery.jsx list) ──
// Used once by the "import" action to seed the DB. Screenshots/logos are added
// per-project through the admin UI afterwards.
export const LEGACY_PROJECTS: Array<{
  slug: string;
  name: string;
  subtitle: string;
  description: string;
}> = [
  { slug: "opengym", name: "OpenGym", subtitle: "منصة إدارة الجيمات", description: "منصة متكاملة لإدارة الجيمات: الاشتراكات والمدفوعات والأعضاء والموظفين والتقارير من لوحة تحكم واحدة." },
  { slug: "binqasim", name: "بي قاسم", subtitle: "استيراد وتصدير وتوزيع", description: "نظام إدارة شركة استيراد وتصدير: شحنات الاستيراد وتوزيع التكاليف، المخزون وتقييم العملات، العملاء والموردين، المبيعات والأقساط، الموارد البشرية والتقارير المالية." },
  { slug: "elhoot", name: "الحوت للأدوات الكهربائية", subtitle: "نظام إدارة تجارة الجملة", description: "نظام إدارة تجارة الجملة للأدوات الكهربائية — مبيعات، مخزون، عملاء وموردين، وحسابات في مكان واحد." },
  { slug: "elnazlawy", name: "النزلاوي", subtitle: "تجارة وتوزيع الأجهزة الكهربائية", description: "نظام إدارة تجارة وتوزيع الأجهزة الكهربائية والإضاءة — مبيعات ومخزون وعملاء وحسابات." },
  { slug: "maspero", name: "ماسبيرو", subtitle: "الخدمات الرقمية والمحافظ", description: "نظام إدارة خدمات الطباعة والإنترنت والمحافظ الإلكترونية — نقطة بيع، إدارة الشفتات، التعاملات المالية وحوافز الموظفين." },
  { slug: "mazaya", name: "مزايا للأثاث", subtitle: "نظام إدارة المصنع", description: "نظام إدارة مصنع أثاث — متابعة الإنتاج والمخزون والطلبات والحسابات." },
  { slug: "kishk", name: "أحمد كشك", subtitle: "الأقمشة والستائر الفاخرة", description: "نظام متكامل لإدارة مؤسسة أحمد كشك للأقمشة والستائر بفروعها الأربعة. بيتابع رحلة الطلب من رفع المقاسات والتسعير والعقد، لقص القماش والورشة والتركيب — مع المخزون والأصناف، الحسابات والتحصيلات، صلاحيات الموظفين لكل فرع، وتقارير تنفيذية لحظية." },
  { slug: "rtx", name: "RTX", subtitle: "نظام إدارة الشركة", description: "نظام إدارة شركة RTX للتجارة والتصنيع — الاشتراكات والعمليات والمتابعة اليومية." },
  { slug: "riyadalquran", name: "رياض القرآن الكريم", subtitle: "موقع جمعية خيرية", description: "الموقع الإلكتروني لجمعية رياض القرآن الكريم الخيرية — عرض المشاريع والحالات وبوابة التبرعات." },
];
