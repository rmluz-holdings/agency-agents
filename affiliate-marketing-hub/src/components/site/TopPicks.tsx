"use client";

import { useMemo } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { useStoreQuery } from "@/hooks/useStore";
import { api } from "@/lib/api";
import type { ClickSource } from "@/lib/types";

interface TopPicksProps {
  /** Maximum number of ranked picks to show. */
  limit?: number;
  source?: ClickSource;
}

/**
 * Ranked featured products: #1 renders as the wide "featured" card, the rest
 * as standard grid cards. Ranking is by rating, then review count.
 */
export function TopPicks({ limit = 5, source = "hub" }: TopPicksProps) {
  const { data, loading } = useStoreQuery(() => api.products.featured(), [api.products]);

  const ranked = useMemo(
    () =>
      (data ?? [])
        .slice()
        .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
        .slice(0, limit),
    [data, limit],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <ProductCardSkeleton className="md:min-h-[18rem]" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: Math.max(0, Math.min(limit - 1, 4)) }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <p className="card px-6 py-10 text-center text-sm text-muted-foreground">
        No featured picks yet. Mark a product as featured in the admin to show it here.
      </p>
    );
  }

  const [first, ...rest] = ranked;

  return (
    <div className="space-y-6">
      <ProductCard product={first} rank={1} variant="featured" source={source} className="animate-fade-up" />
      {rest.length > 0 && (
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Runner-up picks">
          {rest.map((p, i) => (
            <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${(i + 1) * 60}ms` }}>
              <ProductCard product={p} rank={i + 2} variant="grid" source={source} className="h-full" />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
