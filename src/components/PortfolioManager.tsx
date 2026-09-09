"use client";

import { useCallback, useState } from "react";
import type { PortfolioProject } from "@/lib/portfolio-data";
import {
  createPortfolioProject,
  updatePortfolioProject,
  setPortfolioShots,
  setPortfolioLogo,
  togglePortfolioPublished,
  reorderPortfolio,
  deletePortfolioProject,
  seedLegacyPortfolio,
  listPortfolio,
  republishPortfolio,
} from "@/app/portfolio-actions";

// ─── helpers ────────────────────────────────────────────────────────────────

async function downscale(
  file: File,
  opts: { maxW: number; mime: "image/jpeg" | "image/png"; quality: number }
): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, opts.maxW / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  if (opts.mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob(res, opts.mime, opts.quality)
  );
  if (!blob) return file;
  const ext = opts.mime === "image/png" ? "png" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "img";
  return new File([blob], `${base}.${ext}`, { type: opts.mime });
}

async function uploadToR2(file: File, slug: string, kind: "shot" | "logo") {
  const fd = new FormData();
  fd.append("slug", slug);
  fd.append("kind", kind);
  fd.append("file", file);
  const res = await fetch("/api/portfolio/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "فشل رفع الملف");
  return data.url as string;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// ─── component ──────────────────────────────────────────────────────────────

export default function PortfolioManager({
  initial,
  r2Ready,
}: {
  initial: PortfolioProject[];
  r2Ready: boolean;
}) {
  const [projects, setProjects] = useState<PortfolioProject[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);

  const flash = useCallback((kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    if (kind === "ok") setTimeout(() => setMsg(null), 3500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setProjects(await listPortfolio());
    } catch (e: any) {
      flash("err", e?.message || "تعذّر تحديث القائمة");
    }
  }, [flash]);

  // wraps a server action: shows busy, surfaces {warning}, refetches
  const run = useCallback(
    async (id: string, fn: () => Promise<any>, okText?: string) => {
      setBusy(id);
      setMsg(null);
      try {
        const r = await fn();
        await refresh();
        if (r && r.ok === false && r.warning) flash("err", r.warning);
        else if (okText) flash("ok", okText);
      } catch (e: any) {
        flash("err", e?.message || "حصل خطأ");
      } finally {
        setBusy(null);
      }
    },
    [refresh, flash]
  );

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`px-4 py-3 rounded-lg text-sm border ${
            msg.kind === "ok"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowNew((v) => !v)}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
        >
          {showNew ? "إغلاق" : "+ مشروع جديد"}
        </button>
        {projects.length === 0 && (
          <button
            onClick={() =>
              run("seed", seedLegacyPortfolio, "تم استيراد قائمة الأنظمة")
            }
            disabled={busy === "seed"}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
          >
            استيراد الأنظمة الـ9 المعروفة
          </button>
        )}
        <button
          onClick={() =>
            run("republish", republishPortfolio, "تمت إعادة النشر على R2")
          }
          disabled={busy === "republish"}
          className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
        >
          إعادة نشر portfolio.json
        </button>
      </div>

      {showNew && (
        <NewProjectForm
          disabled={busy === "new"}
          onCreate={async (payload) => {
            await run(
              "new",
              () => createPortfolioProject(payload),
              "تمت إضافة المشروع"
            );
            setShowNew(false);
          }}
        />
      )}

      {projects.length === 0 && !showNew && (
        <p className="text-sm text-gray-500 bg-white border border-gray-100 rounded-2xl p-6">
          لسه مفيش مشاريع. اضغط «استيراد الأنظمة الـ9 المعروفة» عشان تبدأ بيها، أو
          «مشروع جديد».
        </p>
      )}

      <ol className="space-y-4">
        {projects.map((p, i) => (
          <ProjectCard
            key={p.id}
            project={p}
            index={i}
            total={projects.length}
            r2Ready={r2Ready}
            busy={busy === p.id}
            onSave={(data) =>
              run(p.id, () => updatePortfolioProject(p.id, data), "تم الحفظ")
            }
            onTogglePublish={() =>
              run(p.id, () =>
                togglePortfolioPublished(p.id, !p.isPublished)
              )
            }
            onDelete={() => {
              if (
                confirm(`حذف مشروع «${p.name}» وكل صوره؟ مفيش تراجع.`)
              )
                run(p.id, () => deletePortfolioProject(p.id), "تم الحذف");
            }}
            onMove={(dir) => {
              const next = move(projects, i, i + dir).map((x) => x.id);
              run(p.id, () => reorderPortfolio(next));
            }}
            onShotsChange={(shots) =>
              run(p.id, () => setPortfolioShots(p.id, shots))
            }
            onLogoChange={(url) =>
              run(p.id, () => setPortfolioLogo(p.id, url), "تم تحديث اللوجو")
            }
          />
        ))}
      </ol>
    </div>
  );
}

// ─── new project form ──────────────────────────────────────────────────────

function NewProjectForm({
  onCreate,
  disabled,
}: {
  onCreate: (p: {
    slug: string;
    name: string;
    subtitle: string;
    description: string;
    youtubeUrl: string;
  }) => void;
  disabled: boolean;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="المعرّف (slug) — إنجليزي صغير">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="kishk"
            className="inp"
            dir="ltr"
          />
        </Field>
        <Field label="اسم المشروع">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أحمد كشك"
            className="inp"
          />
        </Field>
      </div>
      <Field label="السطر التعريفي القصير">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="الأقمشة والستائر الفاخرة"
          className="inp"
        />
      </Field>
      <Field label="وصف المشروع (يظهر فوق الصور في المودال)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="inp"
        />
      </Field>
      <Field label="رابط فيديو يوتيوب (اختياري)">
        <input
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtu.be/…"
          className="inp"
          dir="ltr"
        />
      </Field>
      <button
        disabled={disabled}
        onClick={() =>
          onCreate({ slug, name, subtitle, description, youtubeUrl })
        }
        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        إضافة
      </button>
      <style>{`
        .inp{width:100%;border:1px solid #e5e7eb;border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.875rem;outline:none;background:#fff}
        .inp:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
      `}</style>
    </div>
  );
}

// ─── project card ──────────────────────────────────────────────────────────

function ProjectCard({
  project,
  index,
  total,
  r2Ready,
  busy,
  onSave,
  onTogglePublish,
  onDelete,
  onMove,
  onShotsChange,
  onLogoChange,
}: {
  project: PortfolioProject;
  index: number;
  total: number;
  r2Ready: boolean;
  busy: boolean;
  onSave: (d: {
    name: string;
    subtitle: string;
    description: string;
    youtubeUrl: string;
  }) => void;
  onTogglePublish: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onShotsChange: (shots: string[]) => void;
  onLogoChange: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [subtitle, setSubtitle] = useState(project.subtitle);
  const [description, setDescription] = useState(project.description);
  const [youtubeUrl, setYoutubeUrl] = useState(
    project.youtubeId ? `https://youtu.be/${project.youtubeId}` : ""
  );
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState("");

  const shots = project.shots;

  const addShots = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!r2Ready) {
      alert("ابدأ بضبط متغيرات R2 على السيرفر قبل رفع الصور.");
      return;
    }
    setUploading(true);
    const urls: string[] = [];
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        setUploadInfo(`جارٍ رفع ${i + 1} / ${list.length}`);
        const small = await downscale(list[i], {
          maxW: 1600,
          mime: "image/jpeg",
          quality: 0.82,
        });
        urls.push(await uploadToR2(small, project.slug, "shot"));
      }
      onShotsChange([...shots, ...urls]);
    } catch (e: any) {
      alert(e?.message || "فشل رفع الصور");
    } finally {
      setUploading(false);
      setUploadInfo("");
    }
  };

  const replaceLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!r2Ready) {
      alert("ابدأ بضبط متغيرات R2 على السيرفر قبل رفع اللوجو.");
      return;
    }
    setUploading(true);
    try {
      const small = await downscale(file, {
        maxW: 512,
        mime: "image/png",
        quality: 1,
      });
      onLogoChange(await uploadToR2(small, project.slug, "logo"));
    } catch (e: any) {
      alert(e?.message || "فشل رفع اللوجو");
    } finally {
      setUploading(false);
    }
  };

  const dirty =
    name !== project.name ||
    subtitle !== project.subtitle ||
    description !== project.description ||
    youtubeUrl !==
      (project.youtubeId ? `https://youtu.be/${project.youtubeId}` : "");

  return (
    <li className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0 || busy}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none"
            aria-label="أعلى"
          >
            ▲
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1 || busy}
            className="text-gray-400 hover:text-gray-700 disabled:opacity-30 leading-none"
            aria-label="أسفل"
          >
            ▼
          </button>
        </div>

        {project.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.logoUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 grid place-items-center text-gray-400 text-lg">
            🏢
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {project.name}
          </div>
          <div className="text-xs text-gray-500 truncate">
            <span dir="ltr">{project.slug}</span> · {shots.length} صورة
            {project.youtubeId ? " · 🎬 فيديو" : ""}
          </div>
        </div>

        <button
          onClick={onTogglePublish}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 ${
            project.isPublished
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {project.isPublished ? "منشور" : "مخفي"}
        </button>

        <button
          onClick={() => setOpen((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700"
        >
          {open ? "طيّ" : "تعديل"}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/60">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="اسم المشروع">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="inp2"
              />
            </Field>
            <Field label="السطر التعريفي">
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="inp2"
              />
            </Field>
          </div>
          <Field label="وصف المشروع (فوق الصور في المودال)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="inp2"
            />
          </Field>
          <Field label="رابط فيديو يوتيوب (اختياري)">
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="inp2"
              dir="ltr"
              placeholder="https://youtu.be/…"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                onSave({ name, subtitle, description, youtubeUrl })
              }
              disabled={busy || !dirty}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
            >
              حفظ البيانات
            </button>
            <label className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
              {project.logoUrl ? "تغيير اللوجو" : "رفع لوجو"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => replaceLogo(e.target.files?.[0])}
              />
            </label>
            <button
              onClick={onDelete}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 ms-auto"
            >
              حذف المشروع
            </button>
          </div>

          {/* screenshots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                الشاشات ({shots.length})
              </span>
              <label className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:bg-blue-700">
                + إضافة صور
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => addShots(e.target.files)}
                />
              </label>
            </div>

            {uploading && (
              <p className="text-xs text-blue-600 mb-2">
                {uploadInfo || "جارٍ الرفع…"}
              </p>
            )}

            {shots.length === 0 ? (
              <p className="text-xs text-gray-400">
                مفيش صور بعد — المشروع مش هيظهر على الموقع لحد ما تضيف صور وتخليه
                «منشور».
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {shots.map((src, i) => (
                  <div
                    key={src}
                    className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="w-full aspect-video object-cover object-top"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 text-white text-xs opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() =>
                          onShotsChange(move(shots, i, i - 1))
                        }
                        disabled={i === 0 || busy}
                        className="px-2 py-1 disabled:opacity-30"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("حذف الصورة؟"))
                            onShotsChange(shots.filter((_, j) => j !== i));
                        }}
                        disabled={busy}
                        className="px-2 py-1 text-red-300"
                      >
                        حذف
                      </button>
                      <button
                        onClick={() =>
                          onShotsChange(move(shots, i, i + 1))
                        }
                        disabled={i === shots.length - 1 || busy}
                        className="px-2 py-1 disabled:opacity-30"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        .inp2{width:100%;border:1px solid #e5e7eb;border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.875rem;outline:none;background:#fff}
        .inp2:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.15)}
      `}</style>
    </li>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
