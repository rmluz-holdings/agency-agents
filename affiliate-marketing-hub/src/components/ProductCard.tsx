"use client";

import Link from "next/link";
import { Check, Star, Trophy, X } from "lucide-react";
import { AffiliateCTA } from "@/components/AffiliateCTA";
import { useStoreQuery } from "@/hooks/useStore";
import { api } from "@/lib/api";
import type { BillingPeriod, ClickSource, Product, ProductBadge } from "@/lib/types";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

export type ProductCardVariant = "grid" | "featured" | "compact";

export interface ProductCardProps {
  product: Product;
  /** 1-based rank – renders a "#1" medallion on the header band. */
  rank?: number;
  /** Attribution source stored on the click event. */
  source?: ClickSource;
  variant?: ProductCardVariant;
  /** AffiliateLink.slug – resolved from product.affiliateLinkId when omitted. */
  linkSlug?: string;
  className?: string;
}

const BADGE: Record<ProductBadge, { label: string; className: string }> = {
  "editors-choice": {
    label: "Editor's Choice",
    className: "bg-amber-100 text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/30",
  },
  "best-value": {
    label: "Best Value",
    className:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/30",
  },
  trending: {
    label: "Trending",
    className: "bg-rose-100 text-rose-900 ring-1 ring-rose-300/70 dark:bg-rose-400/15 dark:text-rose-200 dark:ring-rose-400/30",
  },
  "high-ticket": {
    label: "High Ticket",
    className:
      "bg-violet-100 text-violet-900 ring-1 ring-violet-300/70 dark:bg-violet-400/15 dark:text-violet-200 dark:ring-violet-400/30",
  },
  new: {
    label: "New",
    className: "bg-sky-100 text-sky-900 ring-1 ring-sky-300/70 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/30",
  },
};

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  mo: "/mo",
  yr: "/yr",
  once: "one-time",
};

/** Five stars with fractional fill (e.g. 4.6 → four full + one 60% star). */
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Rated ${clamped.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return (
          <span key={i} className="relative inline-block h-4 w-4" aria-hidden>
            <Star className="absolute inset-0 h-4 w-4 text-border" strokeWidth={1.75} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.75} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function savePercent(amount: number, original?: number): number | null {
  if (!original || original <= amount) return null;
  return Math.round((1 - amount / original) * 100);
}

function PriceBadge({ product, large }: { product: Product; large?: boolean }) {
  const { price } = product;
  const save = savePercent(price.amount, price.originalAmount);
  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
      <span className={cn("font-bold tracking-tight text-foreground", large ? "text-3xl" : "text-2xl")}>
        {formatCurrency(price.amount)}
      </span>
      <span className="pb-0.5 text-sm text-muted-foreground">{PERIOD_LABEL[price.period]}</span>
      {price.originalAmount && save !== null && (
        <>
          <span className="pb-0.5 text-sm text-muted-foreground line-through decoration-danger/70">
            {formatCurrency(price.originalAmount)}
          </span>
          <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
            Save {save}%
          </span>
        </>
      )}
    </div>
  );
}

function ProsCons({ product, max }: { product: Product; max: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-success">Pros</h4>
        <ul className="mt-1.5 space-y-1.5">
          {product.pros.slice(0, max).map((p) => (
            <li key={p} className="flex gap-2 text-sm text-foreground/90">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-danger">Cons</h4>
        <ul className="mt-1.5 space-y-1.5">
          {product.cons.slice(0, max).map((c) => (
            <li key={c} className="flex gap-2 text-sm text-foreground/90">
              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RankMedallion({ rank }: { rank: number }) {
  const top = rank === 1;
  return (
    <span
      className={cn(
        "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-md ring-1 ring-white/50",
        top ? "bg-amber-300 text-amber-950" : "bg-white/90 text-slate-900",
      )}
      aria-label={`Ranked number ${rank}`}
    >
      {top && <Trophy className="h-3.5 w-3.5" aria-hidden />}#{rank}
    </span>
  );
}

function BadgeRow({ badges, className }: { badges: ProductBadge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Highlights">
      {badges.map((b) => (
        <li key={b} className={cn("badge", BADGE[b].className)}>
          {BADGE[b].label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Conversion-optimised product card used across the visitor hub, directory
 * and (in `compact` form) the publisher admin.
 *
 * - `grid`      default vertical card for directories
 * - `featured`  wide hero card (#1 pick) – two columns on md+
 * - `compact`   dense card with the publisher-facing commission hint
 */
export function ProductCard({
  product,
  rank,
  source = "hub",
  variant = "grid",
  linkSlug,
  className,
}: ProductCardProps) {
  // Resolve the cloaked slug from the linked AffiliateLink unless supplied.
  const { data: link } = useStoreQuery(
    () => (linkSlug ? Promise.resolve(null) : api.links.get(product.affiliateLinkId)),
    [api.links],
    [linkSlug, product.affiliateLinkId],
  );
  const resolvedSlug = linkSlug ?? link?.slug ?? product.slug;

  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const reviewHref = `/reviews?product=${encodeURIComponent(product.slug)}`;
  const headingId = `product-${product.id}-title`;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        "card group relative flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        isFeatured && "md:flex-row",
        className,
      )}
    >
      {/* Gradient header band */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center bg-gradient-to-br text-white",
          product.gradient,
          isCompact ? "h-20" : "h-32",
          isFeatured && "md:h-auto md:w-2/5 md:min-h-[18rem]",
        )}
      >
        <span
          className={cn(
            "select-none drop-shadow-lg transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none",
            isCompact ? "text-4xl" : isFeatured ? "text-6xl md:text-8xl" : "text-5xl",
          )}
          aria-hidden
        >
          {product.icon}
        </span>
        {rank !== undefined && <RankMedallion rank={rank} />}
        <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" aria-hidden />
      </div>

      {/* Body */}
      <div className={cn("flex flex-1 flex-col", isCompact ? "gap-3 p-4" : "gap-4 p-5", isFeatured && "md:p-7")}>
        <div className="space-y-2">
          <BadgeRow badges={product.badges} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{product.vendor}</p>
            <h3
              id={headingId}
              className={cn("font-bold tracking-tight text-foreground", isFeatured ? "text-2xl" : "text-lg")}
            >
              {product.name}
            </h3>
          </div>
          {!isCompact && <p className="text-sm leading-relaxed text-muted-foreground">{product.tagline}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <StarRating rating={product.rating} />
          <span className="text-sm font-semibold text-foreground">{product.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">
            ({formatNumber(product.reviewCount, { compact: true })} reviews)
          </span>
        </div>

        <PriceBadge product={product} large={isFeatured} />

        {isCompact && (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-brand">
            Est. payout {formatCurrency(product.commission.estimatedPayout)} · {product.commission.cookieDays}-day cookie
            {product.commission.type === "recurring" && ` · ${product.commission.value}% recurring`}
          </p>
        )}

        <ProsCons product={product} max={isCompact ? 2 : isFeatured ? 3 : 2} />

        <p className="text-sm text-foreground/90">
          <span className="font-semibold text-foreground">Best for:</span> {product.bestFor}
        </p>

        <div className={cn("mt-auto space-y-2 pt-1", isFeatured && "sm:max-w-sm")}>
          <AffiliateCTA
            linkSlug={resolvedSlug}
            source={source}
            block
            withDisclosure
            size={isFeatured ? "lg" : isCompact ? "sm" : "md"}
          >
            Try {product.vendor} →
          </AffiliateCTA>
          <Link
            href={reviewHref}
            className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Read review
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Loading placeholder that matches the card's footprint. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card flex flex-col overflow-hidden", className)} aria-hidden>
      <div className="skeleton h-32 rounded-none" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex gap-2">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-full" />
        </div>
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-8 w-28" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/6" />
          </div>
        </div>
        <div className="skeleton mt-auto h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
