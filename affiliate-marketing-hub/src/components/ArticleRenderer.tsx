"use client";

import { useMemo } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  ListTree,
  Minus,
  Star,
  Trophy,
  UserRound,
} from "lucide-react";
import { AffiliateCTA } from "@/components/AffiliateCTA";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { useSettings } from "@/hooks/useSettings";
import { formatPrice } from "@/lib/content/generator";
import type { AffiliateLink, Article, ArticleSection, ClickSource, Product } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

interface ArticleRendererProps {
  article: Article;
  products: Product[];
  links: AffiliateLink[];
  /** Attribution source stamped on every outbound click. */
  source?: ClickSource;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", DATE_FORMAT);
}

/** JSON-LD must never be able to break out of the script tag. */
function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, "");
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${rating.toFixed(1)} out of 5`}>
      <span className="flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              rating >= i + 0.75
                ? "fill-amber-400 text-amber-400"
                : rating >= i + 0.25
                  ? "fill-amber-400/50 text-amber-400"
                  : "text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
    </span>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className="mt-4 text-[15px] leading-7 text-foreground/90 sm:text-base sm:leading-8">
          {p}
        </p>
      ))}
    </>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl font-bold tracking-tight sm:text-2xl">
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------ product box */

function ProductBox({
  product,
  link,
  rank,
  source,
}: {
  product: Product;
  link: AffiliateLink | null;
  rank: number;
  source: ClickSource;
}) {
  return (
    <div className="card mt-5 overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm",
            product.gradient,
          )}
          aria-hidden
        >
          {product.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="badge bg-brand-soft text-brand">#{rank} pick</span>
            <h3 className="text-lg font-bold tracking-tight">{product.name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{product.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Stars rating={product.rating} />
            <span className="text-sm font-semibold">
              {formatPrice(product.price)}
              {product.price.originalAmount ? (
                <span className="ml-2 font-normal text-muted-foreground line-through">
                  ${product.price.originalAmount}
                </span>
              ) : null}
            </span>
            <span className="text-sm text-muted-foreground">Best for {product.bestFor}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Pros</p>
          <ul className="mt-2 space-y-1.5">
            {product.pros.map((pro) => (
              <li key={pro} className="flex gap-2 text-sm leading-6">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Cons</p>
          <ul className="mt-2 space-y-1.5">
            {product.cons.map((con) => (
              <li key={con} className="flex gap-2 text-sm leading-6">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {link ? (
        <div className="border-t border-border bg-brand-soft/40 px-4 py-4 sm:px-5">
          <AffiliateCTA linkSlug={link.slug} source={source} size="lg" block withDisclosure>
            Check price on {product.vendor}
          </AffiliateCTA>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- renderer */

export function ArticleRenderer({ article, products, links, source = "review" }: ArticleRendererProps) {
  const { settings } = useSettings();

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const linkFor = useMemo(() => {
    return (product: Product): AffiliateLink | null =>
      links.find((l) => l.id === product.affiliateLinkId) ??
      links.find((l) => l.productId === product.id) ??
      null;
  }, [links]);

  const columnProducts = useMemo(
    () => article.productIds.map((id) => productById.get(id)).filter((p): p is Product => Boolean(p)),
    [article.productIds, productById],
  );

  const toc = useMemo(
    () => article.sections.map((s) => ({ id: slugify(s.heading), heading: s.heading })),
    [article.sections],
  );

  const faqSection = article.sections.find((s) => s.type === "faq");

  const jsonLd = useMemo(() => {
    const graph: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.metaTitle || article.title,
        name: article.title,
        description: article.metaDescription,
        keywords: [article.keyword, ...article.secondaryKeywords].join(", "),
        datePublished: article.createdAt,
        dateModified: article.updatedAt,
        wordCount: article.wordCount,
        inLanguage: "en-US",
        author: { "@type": "Person", name: settings.authorName },
        publisher: { "@type": "Organization", name: settings.siteName },
        mainEntityOfPage: { "@type": "WebPage", "@id": `/reviews/${article.slug}` },
      },
    ];
    if (faqSection?.faq?.length) {
      graph.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqSection.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }
    return safeJsonLd(graph);
  }, [article, faqSection, settings.authorName, settings.siteName]);

  /** Rank badge per product section, derived from section order (no render-time mutation). */
  const rankBySectionId = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 0;
    for (const section of article.sections) {
      if (section.type === "product") map.set(section.id, ++rank);
    }
    return map;
  }, [article.sections]);

  function renderSectionBody(section: ArticleSection) {
    switch (section.type) {
      case "product": {
        const product = section.productId ? productById.get(section.productId) : undefined;
        const rank = rankBySectionId.get(section.id) ?? 1;
        return (
          <>
            {product ? (
              <ProductBox product={product} link={linkFor(product)} rank={rank} source={source} />
            ) : null}
            <Paragraphs items={section.paragraphs} />
          </>
        );
      }

      case "comparison": {
        return (
          <>
            <Paragraphs items={section.paragraphs} />
            <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[38rem] border-collapse text-sm">
                <caption className="sr-only">{section.heading}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-32 border-b border-border px-3 py-3 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      Compare
                    </th>
                    {columnProducts.map((p) => (
                      <th key={p.id} scope="col" className="border-b border-border px-3 py-3 text-left font-bold">
                        <span className="mr-1.5" aria-hidden>{p.icon}</span>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(section.comparisonRows ?? []).map((row) => (
                    <tr key={row.label} className="odd:bg-muted/40">
                      <th scope="row" className="border-b border-border px-3 py-3 text-left font-semibold text-muted-foreground">
                        {row.label}
                      </th>
                      {row.values.map((value, i) => (
                        <td key={i} className="border-b border-border px-3 py-3 align-top">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="px-3 py-4 text-left font-semibold text-muted-foreground">
                      Get it
                    </th>
                    {columnProducts.map((p) => {
                      const link = linkFor(p);
                      return (
                        <td key={p.id} className="px-3 py-4 align-top">
                          {link ? (
                            <AffiliateCTA linkSlug={link.slug} source={source} size="sm" block>
                              Check price
                            </AffiliateCTA>
                          ) : (
                            <span className="text-xs text-muted-foreground">No link</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <FtcDisclosure variant="inline" className="mt-2" />
          </>
        );
      }

      case "faq": {
        return (
          <>
            <Paragraphs items={section.paragraphs} />
            <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {(section.faq ?? []).map((item) => (
                <details key={item.question} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                    <span>{item.question}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </>
        );
      }

      case "verdict": {
        const product = section.productId ? productById.get(section.productId) : undefined;
        const link = product ? linkFor(product) : null;
        return (
          <>
            <Paragraphs items={section.paragraphs} />
            {product ? (
              <div className="card mt-5 border-brand/40 bg-brand-soft/60 p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand">
                  <Trophy className="h-4 w-4" aria-hidden />
                  Our top pick
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="text-2xl" aria-hidden>{product.icon}</span>
                  <div>
                    <p className="text-lg font-bold">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(product.price)} · Best for {product.bestFor}
                    </p>
                  </div>
                </div>
                {link ? (
                  <div className="mt-4">
                    <AffiliateCTA linkSlug={link.slug} source={source} size="lg" block withDisclosure>
                      Check price on {product.vendor}
                    </AffiliateCTA>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        );
      }

      default:
        return <Paragraphs items={section.paragraphs} />;
    }
  }

  return (
    <article className="animate-fade-up">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* FTC: the disclosure must come before any affiliate link on the page. */}
      <FtcDisclosure variant="banner" />

      <header className="mt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{article.title}</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{article.metaDescription}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-4 w-4" aria-hidden />
            {settings.authorName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden />
            Updated {formatDate(article.updatedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden />
            {article.readingMinutes} min read
          </span>
        </div>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
        <div className="min-w-0">
          {article.sections.map((section) => (
            <section key={section.id} className="mt-10 first:mt-0">
              <SectionHeading id={slugify(section.heading)}>{section.heading}</SectionHeading>
              {renderSectionBody(section)}
            </section>
          ))}
        </div>

        <aside className="order-first mb-8 lg:order-none lg:mb-0">
          <nav aria-label="On this page" className="card p-4 lg:sticky lg:top-24">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <ListTree className="h-4 w-4" aria-hidden />
              On this page
            </p>
            <ol className="mt-3 space-y-2 text-sm">
              {toc.map((entry, i) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="block text-muted-foreground transition-colors hover:text-brand"
                  >
                    <span className="mr-1.5 tabular-nums opacity-60">{i + 1}.</span>
                    {entry.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>

      <FtcDisclosure variant="footer" className="mt-12 border-t border-border pt-6" />
    </article>
  );
}
