"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Gauge, Menu, Tag, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useMounted } from "@/hooks/useStore";
import { cn } from "@/lib/utils";
import { ADMIN_TABS, parseTab, tabDef } from "./tabs";

/**
 * Admin chrome: persistent sidebar on lg+, collapsible drawer below.
 * Rendered from `src/app/admin/layout.tsx` inside a <Suspense> boundary
 * because it reads `?tab=` to highlight the active panel.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin/dashboard";
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  const activeTab = parseTab(searchParams.get("tab"));
  const active = tabDef(activeTab);
  const onDashboard = pathname.startsWith("/admin/dashboard");

  const nav = (
    <nav aria-label="Admin sections" className="flex flex-col gap-1">
      <p className="label mb-1 px-3">Dashboard</p>
      {ADMIN_TABS.map((tab) => {
        const isActive = onDashboard && tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-soft text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0">
              <span className="block">{tab.label}</span>
              <span className="mt-0.5 block text-xs font-normal opacity-70 lg:line-clamp-2">
                {tab.description}
              </span>
            </span>
          </Link>
        );
      })}

      <div className="my-3 border-t border-border" />

      <Link
        href="/"
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Back to site
      </Link>
    </nav>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* Sidebar (lg+) */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24">
          <div className="mb-4 flex items-center gap-2.5 px-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
              <Gauge className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">Admin</span>
              <span className="block text-xs text-muted-foreground">{settings.siteName}</span>
            </span>
          </div>
          {nav}
        </div>
      </aside>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="admin-mobile-nav"
              aria-label={open ? "Close admin menu" : "Open admin menu"}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                {onDashboard ? active.label : "Admin"}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {onDashboard ? active.description : "Central management system"}
              </p>
            </div>
          </div>

          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold"
            title="Tracking ID injected into every outbound affiliate link"
          >
            <Tag className="h-3.5 w-3.5 text-brand" aria-hidden />
            <span className="text-muted-foreground">Tracking ID</span>
            <code className="font-mono text-foreground">{mounted ? settings.trackingId : "…"}</code>
          </span>
        </header>

        {/* Mobile nav drawer */}
        <div
          id="admin-mobile-nav"
          hidden={!open}
          className="card mb-6 p-3 lg:hidden"
          onClick={() => setOpen(false)}
        >
          {nav}
        </div>

        {children}
      </div>
    </div>
  );
}
