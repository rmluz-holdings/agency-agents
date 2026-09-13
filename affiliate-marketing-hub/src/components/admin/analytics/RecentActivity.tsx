"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Laptop, MousePointerClick, Smartphone, Tablet } from "lucide-react";
import type { AffiliateLink, ClickEvent, ClickSource, DeviceType } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export interface RecentActivityProps {
  events: ClickEvent[];
  links: AffiliateLink[];
}

const SOURCE_LABEL: Record<ClickSource, string> = {
  hub: "hub",
  review: "review",
  directory: "directory",
  direct: "direct",
  "admin-test": "admin test",
};

const DEVICE_ICON: Record<DeviceType, LucideIcon> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function RecentActivity({ events, links }: RecentActivityProps) {
  // A slow clock keeps the "time ago" labels fresh without re-rendering the
  // whole dashboard, and keeps render itself pure.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const nameFor = (linkId: string) => links.find((l) => l.id === linkId)?.name ?? "Deleted link";

  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => {
        const DeviceIcon = DEVICE_ICON[event.device];
        return (
          <li key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={
                event.converted
                  ? "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-success"
                  : "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
              }
            >
              {event.converted ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <MousePointerClick className="h-4 w-4" aria-hidden />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{nameFor(event.linkId)}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <time dateTime={event.timestamp}>{timeAgo(event.timestamp, now)}</time>
                <span aria-hidden>·</span>
                <span>{SOURCE_LABEL[event.source]}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <DeviceIcon className="h-3 w-3" aria-hidden />
                  {event.device}
                </span>
              </p>
            </div>

            {event.converted ? (
              <span className="badge shrink-0 bg-emerald-500/10 text-success">
                +{formatCurrency(event.payout)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
