"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Copy,
  CopyCheck,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  FileText,
  Gauge,
  ListOrdered,
  Loader2,
  Scale,
  Search,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { ArticleRenderer } from "@/components/ArticleRenderer";
import { useSettings } from "@/hooks/useSettings";
import { useStoreQuery } from "@/hooks/useStore";
import { api } from "@/lib/api";
import {
  TEMPLATE_META,
  TEMPLATE_ORDER,
  TONE_LABEL,
  TONE_ORDER,
  articleToHtml,
  articleToMarkdown,
  formatPrice,
  generateArticle,
  productsForTemplate,
  resolveCtas,
  seoScore,
  type ArticleTemplate,
  type ArticleTone,
} from "@/lib/content/generator";
import type { Article, Product } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

type BuilderTab = "preview" | "seo" | "export";

const TEMPLATE_ICON: Record<ArticleTemplate, typeof ListOrdered> = {
  "top-list": ListOrdered,
  "single-review": Star,
  comparison: Scale,
  alternatives: Shuffle,
};

const TAB_META: { id: BuilderTab; label: string; icon: typeof Eye }[] = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "seo", label: "SEO", icon: Gauge },
  { id: "export", label: "Export", icon: FileCode2 },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------- sub-views */

function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 85 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`SEO score ${score} out of 100`}>
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-border" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-700", tone)}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-extrabold tabular-nums", tone)}>{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">SEO</span>
      </div>
    </div>
  );
}

function CopyBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copy() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError("Clipboard blocked — select the text and copy manually.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="label mb-0">{label}</p>
        <button type="button" onClick={copy} className="btn-secondary px-2.5 py-1 text-xs">
          {copied ? <CopyCheck className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <textarea
        readOnly
        value={value}
        spellCheck={false}
        rows={14}
        className="input mt-2 font-mono text-xs leading-relaxed"
        aria-label={label}
      />
      {copyError ? <p className="mt-1 text-xs text-danger">{copyError}</p> : null}
    </div>
  );
}

function MetaEditor({
  article,
  onSaveTitle,
  onPatch,
}: {
  article: Article;
  onSaveTitle: (title: string) => void | Promise<void>;
  onPatch: (patch: Partial<Article>) => void | Promise<void>;
}) {
  // Mounted with key={article.id}, so local drafts reset when another article opens.
  const [draft, setDraft] = useState({
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
  });

  const descOk = draft.metaDescription.length >= 140 && draft.metaDescription.length <= 160;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="cb-title">Article title (H1)</label>
        <input
          id="cb-title"
          className="input"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onBlur={() => void onSaveTitle(draft.title)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          /reviews/{article.slug} · {article.wordCount.toLocaleString()} words · {article.readingMinutes} min read
        </p>
      </div>

      <div>
        <label className="label" htmlFor="cb-metatitle">
          Meta title{" "}
          <span className={cn(draft.metaTitle.length > 60 ? "text-danger" : "text-muted-foreground")}>
            ({draft.metaTitle.length}/60)
          </span>
        </label>
        <input
          id="cb-metatitle"
          className="input"
          value={draft.metaTitle}
          onChange={(e) => setDraft((d) => ({ ...d, metaTitle: e.target.value }))}
          onBlur={() => {
            const value = draft.metaTitle.trim();
            if (value && value !== article.metaTitle) void onPatch({ metaTitle: value });
          }}
        />
      </div>

      <div>
        <label className="label" htmlFor="cb-metadesc">
          Meta description{" "}
          <span className={cn(descOk ? "text-emerald-600 dark:text-emerald-400" : "text-danger")}>
            ({draft.metaDescription.length}/140–160)
          </span>
        </label>
        <textarea
          id="cb-metadesc"
          rows={2}
          className="input"
          value={draft.metaDescription}
          onChange={(e) => setDraft((d) => ({ ...d, metaDescription: e.target.value }))}
          onBlur={() => {
            const value = draft.metaDescription.trim();
            if (value && value !== article.metaDescription) void onPatch({ metaDescription: value });
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- main view */

export function ContentBuilder() {
  const { settings } = useSettings();
  const productsQuery = useStoreQuery(() => api.products.list(), [api.products]);
  const linksQuery = useStoreQuery(() => api.links.list(), [api.links]);
  const articlesQuery = useStoreQuery(() => api.articles.list(), [api.articles]);

  const allProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const allLinks = useMemo(() => linksQuery.data ?? [], [linksQuery.data]);
  const articles = useMemo(
    () => [...(articlesQuery.data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [articlesQuery.data],
  );

  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState<ArticleTemplate>("top-list");
  const [count, setCount] = useState(5);
  const [tone, setTone] = useState<ArticleTone>("authoritative");
  const [autoSelect, setAutoSelect] = useState(true);
  const [manualIds, setManualIds] = useState<string[]>([]);

  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [tab, setTab] = useState<BuilderTab>("preview");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const fixedCount = TEMPLATE_META[template].fixedProductCount;
  const needed = fixedCount ?? count;

  const steps = useMemo(
    () => [
      "Analyzing SERP intent…",
      "Selecting products…",
      "Drafting the outline…",
      "Writing sections…",
      `Injecting tracking ID ${settings.trackingId}…`,
      "Running SEO audit…",
    ],
    [settings.trackingId],
  );

  const current = useMemo(() => articles.find((a) => a.id === currentId) ?? null, [articles, currentId]);

  /* ----------------------------------------------------------- selection */
  const manualProducts = useMemo(
    () =>
      manualIds
        .map((id) => allProducts.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p)),
    [manualIds, allProducts],
  );

  const previewSelection = useMemo(
    () => (autoSelect ? [] : productsForTemplate(manualProducts, template, count)),
    [autoSelect, manualProducts, template, count],
  );

  function toggleProduct(id: string) {
    setManualIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const ensureUniqueSlug = useCallback(async (base: string, ignoreId?: string) => {
    const root = slugify(base) || "article";
    let candidate = root;
    let n = 2;
    while (!(await api.articles.isSlugAvailable(candidate, ignoreId))) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }, []);

  /* ---------------------------------------------------------- generation */
  async function handleGenerate() {
    setError(null);
    setNotice(null);
    if (!keyword.trim()) {
      setError("Enter a target keyword before generating.");
      return;
    }
    setGenerating(true);
    try {
      const pool = autoSelect ? await api.products.search(keyword, needed) : manualProducts;
      if (pool.length === 0) {
        throw new Error(
          autoSelect
            ? "No products matched that keyword. Add products first or pick them manually."
            : "Pick at least one product, or switch auto-select back on.",
        );
      }
      for (let i = 0; i < steps.length; i++) {
        setStep(i);
        await delay(300);
      }
      const article = generateArticle({ keyword, template, products: pool, settings, count, tone });
      article.slug = await ensureUniqueSlug(article.slug);
      const created = await api.articles.create(article);
      await articlesQuery.refetch();
      setCurrentId(created.id);
      setTab("preview");
      setNotice(`Draft saved — ${created.wordCount.toLocaleString()} words, tracking ID ${settings.trackingId} applied to every CTA.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGenerating(false);
      setStep(-1);
    }
  }

  /* ------------------------------------------------------------- actions */
  async function patchCurrent(patch: Partial<Article>) {
    if (!current) return;
    setError(null);
    try {
      await api.articles.update(current.id, { ...patch, updatedAt: new Date().toISOString() });
      await articlesQuery.refetch();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveTitle(nextTitle: string) {
    if (!current) return;
    const title = nextTitle.trim();
    if (!title || title === current.title) return;
    setError(null);
    try {
      const nextSlug = slugify(title);
      const slug = nextSlug === current.slug ? current.slug : await ensureUniqueSlug(nextSlug, current.id);
      await api.articles.update(current.id, { title, slug, updatedAt: new Date().toISOString() });
      await articlesQuery.refetch();
      if (slug !== nextSlug) setNotice(`Slug adjusted to /reviews/${slug} to stay unique.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function toggleStatus(article: Article) {
    setError(null);
    try {
      await api.articles.update(article.id, {
        status: article.status === "published" ? "draft" : "published",
        updatedAt: new Date().toISOString(),
      });
      await articlesQuery.refetch();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function confirmDelete(id: string) {
    setError(null);
    try {
      await api.articles.remove(id);
      await articlesQuery.refetch();
      if (currentId === id) setCurrentId(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPendingDelete(null);
    }
  }

  /* -------------------------------------------------------------- export */
  const currentProducts = useMemo(
    () =>
      current
        ? current.productIds
            .map((id) => allProducts.find((p) => p.id === id))
            .filter((p): p is Product => Boolean(p))
        : [],
    [current, allProducts],
  );

  const report = useMemo(() => (current ? seoScore(current) : null), [current]);
  const ctas = useMemo(
    () => (current ? resolveCtas(current, currentProducts, settings, allLinks) : []),
    [current, currentProducts, settings, allLinks],
  );
  const markdown = useMemo(
    () => (current ? articleToMarkdown(current, currentProducts, settings, allLinks) : ""),
    [current, currentProducts, settings, allLinks],
  );
  const html = useMemo(
    () => (current ? articleToHtml(current, currentProducts, settings, allLinks) : ""),
    [current, currentProducts, settings, allLinks],
  );

  const loading = productsQuery.loading || articlesQuery.loading;

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{notice}</span>
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ------------------------------------------------------ form */}
        <section className="card h-fit p-5" aria-label="Article generator">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-brand" aria-hidden />
            AI Content Generator
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a full, SEO-structured affiliate article from one keyword.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="cb-keyword">
                Target keyword <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  id="cb-keyword"
                  className="input pl-9"
                  placeholder="e.g. email marketing software"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                />
              </div>
            </div>

            <fieldset>
              <legend className="label">Template</legend>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATE_ORDER.map((id) => {
                  const meta = TEMPLATE_META[id];
                  const Icon = TEMPLATE_ICON[id];
                  const active = template === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTemplate(id)}
                      aria-pressed={active}
                      title={meta.description}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-brand bg-brand-soft text-brand"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="text-xs font-semibold leading-tight">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{TEMPLATE_META[template].description}</p>
            </fieldset>

            <div>
              <label className="label" htmlFor="cb-count">
                Products featured
                {fixedCount ? (
                  <span className="ml-1 normal-case text-muted-foreground">— fixed at {fixedCount}</span>
                ) : null}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="cb-count"
                  type="range"
                  min={3}
                  max={8}
                  step={1}
                  value={count}
                  disabled={Boolean(fixedCount)}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-[var(--brand)] disabled:opacity-50"
                />
                <span className="w-6 text-center text-sm font-bold tabular-nums">{needed}</span>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="cb-tone">Tone</label>
              <select
                id="cb-tone"
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value as ArticleTone)}
              >
                {TONE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {TONE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-border p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={autoSelect}
                  onChange={(e) => setAutoSelect(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                />
                <span>
                  <span className="block text-sm font-semibold">Auto-select products</span>
                  <span className="block text-xs text-muted-foreground">
                    Ranks your catalogue against the keyword and picks the {needed} best matches.
                  </span>
                </span>
              </label>

              {!autoSelect ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="label">Pick products ({manualIds.length} selected)</p>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="skeleton h-7 w-full" />
                      <div className="skeleton h-7 w-2/3" />
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allProducts.map((p) => {
                        const active = manualIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            aria-pressed={active}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                              active
                                ? "border-brand bg-brand-soft text-brand"
                                : "border-border bg-card text-muted-foreground hover:bg-muted",
                            )}
                          >
                            <span aria-hidden>{p.icon}</span>
                            {p.name}
                            {active ? <X className="h-3 w-3" aria-hidden /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {previewSelection.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Will feature: {previewSelection.map((p) => p.name).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary w-full py-3"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {generating ? "Generating…" : "Generate article"}
            </button>

            {generating ? (
              <ol className="space-y-1.5 rounded-xl bg-muted/60 p-3" aria-live="polite">
                {steps.map((label, i) => (
                  <li
                    key={label}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-opacity",
                      i < step ? "text-muted-foreground" : i === step ? "font-semibold text-foreground" : "opacity-40",
                    )}
                  >
                    {i < step ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                    ) : i === step ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-hidden />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full border border-border" aria-hidden />
                    )}
                    {label}
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-xs text-brand">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                Every CTA routes through <code className="font-mono">/go/&lt;slug&gt;</code> and carries tracking ID{" "}
                <strong className="font-mono">{settings.trackingId}</strong>.
              </span>
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- workspace */}
        <section className="min-w-0 space-y-6" aria-label="Article workspace">
          {current ? (
            <>
              <div className="card p-5">
                <MetaEditor
                  key={current.id}
                  article={current}
                  onSaveTitle={saveTitle}
                  onPatch={patchCurrent}
                />

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                  <button type="button" onClick={() => toggleStatus(current)} className="btn-primary text-sm">
                    {current.status === "published" ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                    {current.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  {current.status === "published" ? (
                    <Link href={`/reviews/${current.slug}`} className="btn-secondary text-sm" target="_blank">
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      View live
                    </Link>
                  ) : null}
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    {current.secondaryKeywords.slice(0, 3).map((k) => (
                      <span key={k} className="badge bg-muted text-muted-foreground">{k}</span>
                    ))}
                  </span>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div role="tablist" aria-label="Article views" className="flex border-b border-border">
                  {TAB_META.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      role="tab"
                      type="button"
                      id={`cb-tab-${id}`}
                      aria-selected={tab === id}
                      aria-controls={`cb-panel-${id}`}
                      onClick={() => setTab(id)}
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
                        tab === id
                          ? "border-b-2 border-brand text-brand"
                          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>

                <div id={`cb-panel-${tab}`} role="tabpanel" aria-labelledby={`cb-tab-${tab}`} className="p-5">
                  {tab === "preview" ? (
                    <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-background p-4 sm:p-6">
                      <ArticleRenderer
                        article={current}
                        products={currentProducts}
                        links={allLinks}
                        source="admin-test"
                      />
                    </div>
                  ) : null}

                  {tab === "seo" && report ? (
                    <div className="flex flex-col gap-5 sm:flex-row">
                      <ScoreRing score={report.score} />
                      <ul className="flex-1 space-y-2">
                        {report.checks.map((check) => (
                          <li key={check.label} className="flex items-start gap-2.5 text-sm">
                            {check.pass ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                            ) : (
                              <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                            )}
                            <span>
                              <span className={cn(check.pass ? "" : "font-semibold")}>{check.label}</span>
                              {!check.pass && check.hint ? (
                                <span className="block text-xs text-muted-foreground">{check.hint}</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {tab === "export" ? (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm text-brand">
                        <p className="flex items-center gap-2 font-semibold">
                          <Target className="h-4 w-4" aria-hidden />
                          All CTAs include tracking ID: <span className="font-mono">{settings.trackingId}</span>
                        </p>
                        <ul className="mt-3 space-y-2">
                          {ctas.map((cta) => (
                            <li key={cta.product.id} className="min-w-0 text-xs">
                              <span className="font-semibold">{cta.product.name}</span>{" "}
                              <span className="opacity-70">({formatPrice(cta.product.price)})</span>
                              <br />
                              {cta.url ? (
                                <code className="block break-all font-mono opacity-80">{cta.url}</code>
                              ) : (
                                <span className="opacity-80">No affiliate link mapped — add one in Links.</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid gap-5 lg:grid-cols-2">
                        <CopyBox
                          label="Markdown"
                          value={markdown}
                          hint="Disclosure first, absolute affiliate URLs on every CTA."
                        />
                        <CopyBox
                          label="HTML"
                          value={html}
                          hint='Paste into WordPress. Links carry rel="sponsored nofollow noopener noreferrer".'
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="card flex flex-col items-center justify-center p-10 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-semibold">No article open</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Generate a new draft from a keyword, or open one from the library below.
              </p>
            </div>
          )}

          {/* ------------------------------------------------- library */}
          <div className="card p-5">
            <h3 className="text-base font-bold tracking-tight">Article library</h3>
            {loading ? (
              <div className="mt-4 space-y-2">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
              </div>
            ) : articles.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing generated yet. Your saved drafts will appear here.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {articles.map((article) => (
                  <li key={article.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{article.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "badge",
                            article.status === "published"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {article.status}
                        </span>
                        <span>{article.keyword}</span>
                        <span aria-hidden>·</span>
                        <span>{article.wordCount.toLocaleString()} words</span>
                        <span aria-hidden>·</span>
                        <span>Updated {formatDate(article.updatedAt)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleStatus(article)}
                        className="btn-secondary px-2.5 py-1 text-xs"
                      >
                        {article.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentId(article.id);
                          setTab("preview");
                        }}
                        className="btn-secondary px-2.5 py-1 text-xs"
                      >
                        Open
                      </button>
                      {article.status === "published" ? (
                        <Link
                          href={`/reviews/${article.slug}`}
                          target="_blank"
                          className="btn-secondary px-2.5 py-1 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          View live
                        </Link>
                      ) : null}
                      {pendingDelete === article.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => confirmDelete(article.id)}
                            className="btn-secondary border-danger px-2.5 py-1 text-xs text-danger"
                          >
                            Confirm delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            className="btn-secondary px-2.5 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(article.id)}
                          aria-label={`Delete ${article.title}`}
                          className="btn-secondary px-2.5 py-1 text-xs text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
