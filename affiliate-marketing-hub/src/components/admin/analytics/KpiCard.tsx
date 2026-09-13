"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string;
  /** Percent change versus the previous period. Omit to hide the delta row. */
  delta?: number;
  /** Copy shown next to the delta, e.g. "vs previous 30 days". */
  deltaLabel?: string;
  icon: LucideIcon;
  /** Secondary line when there is no delta to show. */
  hint?: string;
  loading?: boolean;
}

function formatDelta(delta: number): string {
  const rounded = Math.abs(delta) >= 100 ? Math.round(delta) : Number(delta.toFixed(1));
  return `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(rounded)}%`;
}

export function KpiCard({ label, value, delta, deltaLabel, icon: Icon, hint, loading }: KpiCardProps) {
  const direction = delta === undefined ? "flat" : delta > 0.05 ? "up" : delta < -0.05 ? "down" : "flat";
  const DeltaIcon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>

      {loading ? (
        <div className="skeleton mt-3 h-8 w-24" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      )}

      {delta !== undefined && !loading ? (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
              direction === "up" && "bg-emerald-500/10 text-success",
              direction === "down" && "bg-rose-500/10 text-danger",
              direction === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden />
            {formatDelta(delta)}
          </span>
          <span className="text-muted-foreground">{deltaLabel ?? "vs previous period"}</span>
        </p>
      ) : hint && !loading ? (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
