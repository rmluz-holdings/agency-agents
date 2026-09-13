"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CalendarDays, Clock, FileText, Filter, Sparkles, X } from "lucide-react";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { useStoreQuery } from "@/hooks/useStore";
import { api } from "@/lib/api";
import type { Article, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ArticleCard({
  article,
  products,
  highlighted,
}: {
  article: Article;
  products: Product[];
  highlighted: boolean;
}) {
  return (
    <article
      className={cn(
        "card flex h-full flex-col p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        highlighted && "border-brand ring-2 ring-brand/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge bg-brand-soft text-brand">{article.keyword}</span>
        {highlighted ? <span className="badge bg-accent/20 text-accent-foreground dark:text-accent">Featured pick</span> : null}
      </div>

      <h2 className="mt-3 text-lg font-bold leading-snug tracking-tight">
        <Link href={`/reviews/${article.slug}`} className="transition-colors hover:text-brand">
          {article.title}
        </Link>
      </h2>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{article.metaDescription}</p>

      {products.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="sr-only">Tools covered:</span>
          {products.slice(0, 6).map((p) => (
            <span key={p.id} title={p.name} aria-hidden className="text-base">
              {p.icon}
            </span>
          ))}
          <span>{products.length} tools compared</span>
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {formatDate(article.updatedAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {article.readingMinutes} min read
        </span>
        <Link
          href={`/reviews/${article.slug}`}
          className="ml-auto inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          Read
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function ReviewsIndex() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product");

  const articlesQuery = useStoreQuery(() => api.articles.published(), [api.articles]);
  const productsQuery = useStoreQuery(() => api.products.list(), [api.products]);

  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const activeProduct = useMemo(
    () => (productSlug ? products.find((p) => p.slug === productSlug) ?? null : null),
    [productSlug, products],
  );

  const productsFor = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return (article: Article): Product[] =>
      article.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [products]);

  const { matching, rest } = useMemo(() => {
    if (!activeProduct) return { matching: articles, rest: [] as Article[] };
    const hit = articles.filter((a) => a.productIds.includes(activeProduct.id));
    return { matching: hit, rest: articles.filter((a) => !a.productIds.includes(activeProduct.id)) };
  }, [articles, activeProduct]);

  const loading = articlesQuery.loading || productsQuery.loading;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand">
          <FileText className="h-4 w-4" aria-hidden />
          Reviews &amp; buying guides
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Hands-on reviews, ranked roundups and head-to-head comparisons
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Every guide is tested with a paid account, priced honestly, and clearly disclosed. Links are affiliate
          links — they never change the ranking.
        </p>
      </header>

      <FtcDisclosure variant="banner" className="mt-8" />

      {activeProduct ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
            Guides featuring <strong className="font-semibold">{activeProduct.name}</strong>
            <span className="text-muted-foreground">({matching.length})</span>
          </span>
          <Link href="/reviews" className="btn-secondary ml-auto px-2.5 py-1 text-xs">
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filter
          </Link>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-56 w-full" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center px-6 py-14 text-center">
          <Sparkles className="h-8 w-8 text-brand" aria-hidden />
          <h2 className="mt-4 text-lg font-bold">No published guides yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Publish an article from the admin Content Builder — generate one from a keyword, review the SEO score,
            then hit Publish and it appears here instantly.
          </p>
          <Link href="/admin/dashboard?tab=content" className="btn-primary mt-5">
            <Sparkles className="h-4 w-4" aria-hidden />
            Open the Content Builder
          </Link>
        </div>
      ) : (
        <>
          {activeProduct && matching.length === 0 ? (
            <p className="mt-8 rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              No published guide features {activeProduct.name} yet. Here is everything else we have published.
            </p>
          ) : null}

          {matching.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {matching.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  products={productsFor(article)}
                  highlighted={Boolean(activeProduct)}
                />
              ))}
            </div>
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">More guides</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    products={productsFor(article)}
                    highlighted={false}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
