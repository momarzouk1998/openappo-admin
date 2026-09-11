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
    .filter((p) => p.isPublished) // entries may be published with copy + logo before their screenshots arrive
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


// ─── Canonical portfolio copy ────────────────────────────────────────────────
// Seed data for the "import known systems" action. Each description is written
// from that system's actual module set, in Modern Standard Arabic, and carries
// the search terms the site should rank for — it is the page's SEO body copy,
// not filler. Editing a project in the admin overrides this; it is only a seed.
export const PORTFOLIO_SEED: Array<{
  slug: string;
  name: string;
  subtitle: string;
  description: string;
}> = [
  {
    slug: "kishk",
    name: "مؤسسة أحمد كشك",
    subtitle: "نظام إدارة تصنيع الستائر والأقمشة",
    description:
      "نظام إدارة متكامل لمؤسسة أحمد كشك للأقمشة والستائر عبر فروعها الأربعة. يتتبّع النظام دورة الطلب كاملةً: رفع المقاسات والمعاينة، ثم التسعير والتعاقد، ثم قصّ القماش والتفصيل في الورشة وتركيب الإكسسوارات، وصولًا إلى التركيب لدى العميل والمعاينة النهائية. ويشمل إدارة المخزون والأصناف والمشتريات، وحسابات العملاء والتحصيلات، وصلاحيات الموظفين لكل فرع على حدة، وتقارير تشغيلية ومالية لحظية.",
  },
  {
    slug: "mazaya",
    name: "مزايا للأثاث",
    subtitle: "نظام تخطيط موارد لمصانع الأثاث",
    description:
      "نظام تخطيط موارد (ERP) لمصنع مزايا للأثاث يربط خط الإنتاج بالحسابات في منظومة واحدة. يدير أوامر التشغيل وإضافات الطلبات، ومخزون الألواح والإكسسوارات ومراكز المخزون، والمقاولين والأعمال الخارجية، والنقل الداخلي بين الفروع. ويغطّي الجانب المالي بخزائن منفصلة للمصنع والألواح، ودفتر يومية محاسبي، وموازنات ومصروفات غير مباشرة، مع تقارير تكلفة وربحية لكل أمر تشغيل.",
  },
  {
    slug: "elnazlawy",
    name: "معرض النزلاوي",
    subtitle: "نظام إدارة تجارة وتوزيع الأجهزة الكهربائية",
    description:
      "نظام إدارة مبيعات وتوزيع لمعرض النزلاوي للأجهزة الكهربائية والإضاءة. يغطّي المبيعات والمشتريات والمرتجعات، وإدارة الأصناف والمخزون، وحسابات العملاء والموردين، ومتابعة الشيكات والتحصيلات وحركة الخزنة والمصروفات. ويدعم مندوبي البيع بخطوط سير ومخزون ومبيعات مستقلة لكل مندوب، مع تقارير مبيعات وأرباح ومديونيات لحظية.",
  },
  {
    slug: "elhoot",
    name: "الحوت للأدوات الكهربائية",
    subtitle: "نظام إدارة تجارة الجملة والتوزيع",
    description:
      "نظام إدارة تجارة جملة للأدوات الكهربائية يشمل المبيعات والمشتريات والمرتجعات وإدارة الأصناف والمخزون. يتابع حسابات العملاء والموردين، والشيكات والتحصيلات وحركة الخزنة والمصروفات، ويمنح كل مندوب خط سير ومخزونًا ومبيعات خاصة به. تقارير تفصيلية عن المبيعات والأرباح وأعمار الديون وحركة الأصناف.",
  },
  {
    slug: "elnesr",
    name: "النسر للتوزيع",
    subtitle: "نظام إدارة التوزيع والمناديب",
    description:
      "نظام توزيع وإدارة مبيعات لشركة النسر يجمع المبيعات والمشتريات والمرتجعات والمخزون في منظومة واحدة. يتضمّن إدارة شؤون الموظفين، وحسابات العملاء والموردين، والشيكات والتحصيلات والخزنة والمصروفات، وخطوط سير المناديب بمخزون ومبيعات مستقلة لكل مندوب، مع تقارير مالية وتشغيلية لحظية.",
  },
  {
    slug: "rtx",
    name: "RTX للتجارة والتصنيع",
    subtitle: "نظام إدارة التصنيع ومراحل الإنتاج",
    description:
      "نظام إدارة تصنيع لشركة RTX يتابع المنتج عبر مراحله الثلاث: استلام الخامات، ثم مرحلة التصنيع والإنتاج، ثم مرحلة البيع. يدير المصانع والموردين والخامات والمنتجات والمخزون، ويتيح تتبّع أوامر الطلبات لحظةً بلحظة، إضافةً إلى المبيعات والمدفوعات وكشوف الحسابات والخزنة والمصروفات وصلاحيات المستخدمين.",
  },
  {
    slug: "maspero",
    name: "ماسبيرو للخدمات الرقمية",
    subtitle: "نظام نقاط بيع وإدارة المحافظ الإلكترونية",
    description:
      "نظام نقاط بيع (POS) وإدارة خدمات رقمية لفروع ماسبيرو، يغطّي خدمات الطباعة والإنترنت وشحن المحافظ الإلكترونية. يدير الورديات وتسليمها بين الموظفين مع سجلّ كامل لكل وردية، وفواتير الخدمات وسجلّ عمليات الشحن والمحافظ، والمصروفات وشؤون الموظفين وقواعد العمولات، ونظام تذاكر للمتابعة — بلوحة إشراف للمدير على جميع الفروع.",
  },
  {
    slug: "roknalanaqa",
    name: "ركن الأناقة",
    subtitle: "نظام إدارة المحلات والورش",
    description:
      "نظام إدارة لمجموعة ركن الأناقة يجمع محلات الملابس وورشة الستائر والمفروشات في منظومة واحدة. يغطّي المبيعات والعملاء والموردين والمخزون والمصروفات، وإدارة أعمال الورشة ومتابعتها، وحسابات الشركاء وتوزيع الأرباح، مع تقارير مالية دورية ولوحة متابعة للإدارة.",
  },
  {
    slug: "binqasim",
    name: "بي قاسم للاستيراد والتصدير",
    subtitle: "نظام إدارة الاستيراد وسلاسل الإمداد",
    description:
      "نظام إدارة لشركة بي قاسم للاستيراد والتصدير والتوزيع. يدير شحنات الاستيراد وتوزيع تكاليفها على الأصناف، والمخزون والمنتجات، والعملاء والموردين والمبيعات، وأسطول النقل، وشؤون الموظفين، والإدارة المالية بتقارير تكلفة وربحية.",
  },
  {
    slug: "opengym",
    name: "OpenGym",
    subtitle: "منصة إدارة الصالات الرياضية",
    description:
      "منصة سحابية لإدارة الصالات الرياضية والأندية. تغطّي اشتراكات الأعضاء وتجديدها والمدفوعات، وتسجيل الحضور والانصراف، وإدارة المدربين والموظفين، ولوحة تحكم إدارية بتقارير الإيرادات والاشتراكات. وتتضمّن بوابة مستقلة للأعضاء، وتعمل كتطبيق ويب تقدّمي (PWA) يدعم العمل دون اتصال بالإنترنت.",
  },
  {
    slug: "riyadalquran",
    name: "جمعية رياض القرآن الكريم",
    subtitle: "نظام إدارة الجمعيات الخيرية والحضانات",
    description:
      "نظام إدارة لجمعية رياض القرآن الكريم الخيرية يستقبل طلبات المساعدة ويصنّفها — الحالات المرضية والأيتام والأسر الأولى بالرعاية — ويتابعها حتى الصرف. ويضمّ إدارة الحضانة ببوابات منفصلة لأولياء الأمور والمعلّمين، ولوحة إشراف إدارية لمتابعة الحالات والتسجيلات والتقارير.",
  },
  {
    slug: "vos",
    name: "Volunteer Operating System",
    subtitle: "نظام إدارة المتطوعين والفرق التطوعية",
    description:
      "نظام متكامل لإدارة العمل التطوعي: استقبال طلبات الانضمام واعتمادها، وملفات المتطوعين وساعات التطوع والحضور، وتنظيم الفعاليات والقوافل، والتدريب وإصدار الشهادات وتوثيقها إلكترونيًا، ولوحات المتصدّرين وتقارير الاستبقاء — مع نظام صلاحيات دقيق وسجلّ تدقيق لكل إجراء.",
  },
];
