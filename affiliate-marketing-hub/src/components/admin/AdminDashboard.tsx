"use client";

import { useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnalyticsOverview } from "@/components/admin/analytics/AnalyticsOverview";
import { ContentBuilder } from "@/components/admin/content/ContentBuilder";
import { LinkManager } from "@/components/admin/links/LinkManager";
import { SettingsPanel } from "@/components/admin/settings/SettingsPanel";
import { cn } from "@/lib/utils";
import { ADMIN_TABS, parseTab, type AdminTab } from "./tabs";

/**
 * Central management system. The active panel lives in the URL (`?tab=`) so
 * every view is linkable, shareable and survives a refresh.
 */
export function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get("tab"));
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = useCallback(
    (tab: AdminTab) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      router.replace(`/admin/dashboard?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const index = ADMIN_TABS.findIndex((t) => t.id === active);
    const nextTab = ADMIN_TABS[(index + delta + ADMIN_TABS.length) % ADMIN_TABS.length];
    select(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  };

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Admin panels"
        className="flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
      >
        {ADMIN_TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`admin-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={onKeyDown}
              className={cn(
                "inline-flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`admin-panel-${active}`}
        aria-labelledby={`admin-tab-${active}`}
        tabIndex={-1}
        className="animate-fade-up"
        key={active}
      >
        {active === "overview" && <AnalyticsOverview />}
        {active === "links" && <LinkManager />}
        {active === "content" && <ContentBuilder />}
        {active === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}
