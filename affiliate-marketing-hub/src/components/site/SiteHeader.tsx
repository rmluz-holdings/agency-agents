"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Layers, LayoutDashboard, Menu, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "Tools" },
  { href: "/reviews", label: "Reviews" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Prevent background scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const adminActive = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight text-foreground"
          aria-label={`${settings.siteName} home`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-400 text-white shadow-[0_6px_16px_-6px_rgb(79_70_229_/_0.7)] dark:to-violet-500">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg">{settings.siteName}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            aria-current={adminActive ? "page" : undefined}
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:inline-flex",
              adminActive
                ? "border-brand/40 bg-brand text-brand-foreground"
                : "border-border bg-card text-foreground hover:border-brand/40 hover:text-brand",
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Admin
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted md:hidden"
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-border bg-background md:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/admin/dashboard"
            onClick={close}
            aria-current={adminActive ? "page" : undefined}
            className={cn(
              "mt-1 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold",
              adminActive ? "bg-brand text-brand-foreground" : "bg-card text-foreground hover:bg-muted",
            )}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Admin dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
