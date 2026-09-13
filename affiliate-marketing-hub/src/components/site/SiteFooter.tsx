"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { useSettings } from "@/hooks/useSettings";
import { useMounted } from "@/hooks/useStore";

interface FooterLink {
  href: string;
  label: string;
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Explore",
    links: [
      { href: "/", label: "Home" },
      { href: "/#top-picks", label: "Top picks" },
      { href: "/tools", label: "All tools" },
      { href: "/reviews", label: "Reviews" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/#disclosure", label: "Affiliate disclosure" },
      { href: "/#how-we-review", label: "Editorial policy" },
      { href: "/tools", label: "Partner programs" },
    ],
  },
  {
    heading: "About",
    links: [
      { href: "/#how-we-review", label: "How we review" },
      { href: "/#newsletter", label: "Newsletter" },
      { href: "/admin/dashboard", label: "Publisher dashboard" },
    ],
  },
];

export function SiteFooter() {
  const { settings } = useSettings();
  const mounted = useMounted();
  // Use a fixed year during SSR / before mount to avoid a Dec-31 mismatch.
  const year = mounted ? new Date().getFullYear() : settings.contentYear;

  return (
    <footer className="mt-16 border-t border-border bg-card/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-indigo-400 text-white dark:to-violet-500">
                <Layers className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-lg">{settings.siteName}</span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{settings.siteTagline}</p>
            <p className="text-xs text-muted-foreground">
              Curated by <span className="font-medium text-foreground">{settings.authorName}</span>
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-labelledby={`footer-${col.heading.toLowerCase()}`}>
              <h2
                id={`footer-${col.heading.toLowerCase()}`}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {col.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-brand"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div id="disclosure" className="mt-10 rounded-xl border border-border bg-background/60 p-4 sm:p-5">
          <FtcDisclosure variant="footer" />
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.siteName}. All rights reserved.
          </p>
          <p>
            Prices and commissions shown are illustrative and may change. Always confirm on the vendor&apos;s site.
          </p>
        </div>
      </div>
    </footer>
  );
}
