"use client";

import { useId, useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useStoreQuery } from "@/hooks/useStore";
import { api, CATEGORY_LABEL } from "@/lib/api";
import type { ClickSource, Product, ProductCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "rating" | "payout" | "price-asc" | "price-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating", label: "Top rated" },
  { value: "payout", label: "Highest payout" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  payout: (a, b) => b.commission.estimatedPayout - a.commission.estimatedPayout,
  "price-asc": (a, b) => a.price.amount - b.price.amount,
  "price-desc": (a, b) => b.price.amount - a.price.amount,
};

export interface ProductGridProps {
  initialCategory?: ProductCategory;
  /** Cap the number of cards rendered (after filtering/sorting). */
  limit?: number;
  showFilters?: boolean;
  source?: ClickSource;
  className?: string;
}

function matchesQuery(p: Product, q: string): boolean {
  if (!q) return true;
  const haystack = [p.name, p.vendor, p.tagline, p.bestFor, CATEGORY_LABEL[p.category], ...p.features]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => haystack.includes(t));
}

/**
 * "Recommended Tools & Resources" directory. Loads products from the mock API
 * and offers category chips, search, and sorting. Renders skeletons until
 * the store has hydrated so SSR markup never depends on localStorage.
 */
export function ProductGrid({
  initialCategory,
  limit,
  showFilters = true,
  source = "hub",
  className,
}: ProductGridProps) {
  const { data: products, loading } = useStoreQuery(() => api.products.list(), [api.products]);
  const [category, setCategory] = useState<ProductCategory | "all">(initialCategory ?? "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const searchId = useId();
  const sortId = useId();

  const categories = useMemo(() => {
    const present = new Set((products ?? []).map((p) => p.category));
    return (Object.keys(CATEGORY_LABEL) as ProductCategory[]).filter((c) => present.has(c));
  }, [products]);

  const visible = useMemo(() => {
    const all = products ?? [];
    const filtered = all
      .filter((p) => category === "all" || p.category === category)
      .filter((p) => matchesQuery(p, query))
      .sort(SORTERS[sort]);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [products, category, query, sort, limit]);

  const skeletonCount = limit ? Math.min(limit, 6) : 6;
  const isEmpty = !loading && visible.length === 0;
  const totalCount = products?.length ?? 0;

  return (
    <div className={cn("space-y-6", className)}>
      {showFilters && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <label htmlFor={searchId} className="sr-only">
                Search tools
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, vendor, or feature…"
                className="input pl-9"
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor={sortId} className="whitespace-nowrap text-sm text-muted-foreground">
                Sort by
              </label>
              <select
                id={sortId}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="input w-auto min-w-[11rem] cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter by category">
            <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
                All
                {totalCount > 0 && <span className="ml-1 opacity-70">({totalCount})</span>}
              </CategoryChip>
              {loading && categories.length === 0
                ? Array.from({ length: 4 }, (_, i) => <span key={i} className="skeleton h-8 w-24 rounded-full" />)
                : categories.map((c) => (
                    <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)}>
                      {CATEGORY_LABEL[c]}
                    </CategoryChip>
                  ))}
            </div>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {loading ? "Loading tools" : `${visible.length} tools shown`}
      </p>

      {isEmpty ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="text-lg font-semibold">No tools match those filters</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different keyword or clear the category filter to see the full directory.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="btn-secondary mt-1"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" role="list">
          {loading
            ? Array.from({ length: skeletonCount }, (_, i) => (
                <li key={i}>
                  <ProductCardSkeleton className="h-full" />
                </li>
              ))
            : visible.map((p, i) => (
                <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <ProductCard product={p} source={source} variant="grid" className="h-full" />
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border bg-card text-foreground hover:border-brand/50 hover:text-brand",
      )}
    >
      {children}
    </button>
  );
}
