"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { ArticleRenderer } from "@/components/ArticleRenderer";
import { useStoreQuery } from "@/hooks/useStore";
import { api } from "@/lib/api";
import type { AffiliateLink, Article, Product } from "@/lib/types";

interface ArticlePayload {
  article: Article | null;
  products: Product[];
  links: AffiliateLink[];
}

export default function ArticlePage() {
  const params = useParams<{ slug: string | string[] }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? "";

  const { data, loading } = useStoreQuery<ArticlePayload>(
    async () => {
      const [article, products, links] = await Promise.all([
        api.articles.bySlug(slug),
        api.products.list(),
        api.links.list(),
      ]);
      return { article, products, links };
    },
    [api.articles, api.products, api.links],
    [slug],
  );

  const article = data?.article ?? null;
  const visible = article?.status === "published" ? article : null;

  const products = useMemo(() => {
    if (!visible || !data) return [];
    const byId = new Map(data.products.map((p) => [p.id, p]));
    return visible.productIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  }, [visible, data]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton mt-6 h-12 w-5/6" />
        <div className="skeleton mt-4 h-4 w-2/3" />
        <div className="skeleton mt-10 h-64 w-full" />
      </div>
    );
  }

  if (!visible) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
        <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">This guide isn&apos;t available</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {article
            ? "This article is still a draft. Publish it from the admin Content Builder to make it live."
            : "We couldn't find a published guide at this address. It may have been renamed or unpublished."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/reviews" className="btn-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All reviews
          </Link>
          <Link href="/admin/dashboard?tab=content" className="btn-secondary">
            Open the Content Builder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/reviews"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All reviews
      </Link>
      <div className="mt-6">
        <ArticleRenderer article={visible} products={products} links={data?.links ?? []} source="review" />
      </div>
    </div>
  );
}
