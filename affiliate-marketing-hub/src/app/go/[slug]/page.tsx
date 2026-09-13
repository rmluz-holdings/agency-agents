"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Home, Loader2, Link2Off, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { NETWORK_LABEL, OUTBOUND_REL, buildAffiliateUrl } from "@/lib/affiliate";
import type { AffiliateLink, ClickSource } from "@/lib/types";

const SOURCES: ClickSource[] = ["hub", "review", "directory", "direct", "admin-test"];

/** Narrow the untrusted `?src=` value to a known ClickSource. */
function parseSource(value: string | null): ClickSource {
  return SOURCES.includes(value as ClickSource) ? (value as ClickSource) : "direct";
}

type State =
  | { status: "loading" }
  | { status: "missing"; link: AffiliateLink | null }
  | { status: "ready"; link: AffiliateLink; url: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-16 sm:px-6">
      <div className="card w-full p-8 text-center animate-fade-up">{children}</div>
    </div>
  );
}

function Redirector() {
  const params = useParams<{ slug: string | string[] }>();
  const searchParams = useSearchParams();
  const raw = params?.slug;
  const slug = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const preview = searchParams.get("preview") === "1";
  const source = parseSource(searchParams.get("src"));

  const [resolved, setResolved] = useState<State>({ status: "loading" });
  // A missing slug can be decided during render – no effect needed.
  const state: State = slug ? resolved : { status: "missing", link: null };
  // Guards against React StrictMode double-invoking the effect in development,
  // which would otherwise record the click twice.
  const firedRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    void (async () => {
      const [link, settings] = await Promise.all([api.links.bySlug(slug), api.settings.get()]);
      if (cancelled) return;

      if (!link || !link.active) {
        setResolved({ status: "missing", link });
        return;
      }

      const url = buildAffiliateUrl(link.destinationUrl, settings.trackingId, link.network);
      setResolved({ status: "ready", link, url });

      if (preview || firedRef.current) return;
      firedRef.current = true;

      const referrer = typeof document !== "undefined" && document.referrer ? document.referrer : undefined;
      await api.analytics.recordClick(link.id, source, referrer);
      if (cancelled) return;
      window.location.replace(url);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, preview, source]);

  if (state.status === "loading") {
    return (
      <Shell>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" aria-hidden />
        <p className="mt-4 text-sm text-muted-foreground">Resolving link…</p>
        <span className="sr-only" role="status">
          Resolving affiliate link
        </span>
      </Shell>
    );
  }

  if (state.status === "missing") {
    return (
      <Shell>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Link2Off className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-bold tracking-tight">This link is no longer available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.link
            ? `“${state.link.name}” has been paused by the publisher.`
            : `We couldn’t find an offer at /go/${slug}.`}{" "}
          The partner programme may have ended or the URL may be mistyped.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            <Home className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
          <Link href="/tools" className="btn-secondary">
            Browse all tools
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Shell>
    );
  }

  const { link, url } = state;

  if (preview) {
    return (
      <Shell>
        <span className="badge mx-auto bg-brand-soft text-brand">Preview mode</span>
        <h1 className="mt-3 text-xl font-bold tracking-tight">{link.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {NETWORK_LABEL[link.network]} · <code className="font-mono">/go/{link.slug}</code>
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resolved outbound URL
        </p>
        <p className="mt-1 break-all rounded-xl border border-border bg-muted px-3 py-2 text-left font-mono text-xs">
          {url}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          No click was recorded and no redirect was performed.
        </p>
        <a href={url} target="_blank" rel={OUTBOUND_REL} className="btn-primary mt-5 w-full">
          Open destination
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </Shell>
    );
  }

  return (
    <Shell>
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" aria-hidden />
      <h1 className="mt-4 text-lg font-bold tracking-tight" role="status">
        Taking you to {link.name}…
      </h1>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        Affiliate link — we may earn a commission at no extra cost to you.
      </p>
      <a href={url} rel={OUTBOUND_REL} className="btn-secondary mt-6">
        Not redirected? Continue manually
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    </Shell>
  );
}

export default function GoPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">Resolving link…</p>
        </Shell>
      }
    >
      <Redirector />
    </Suspense>
  );
}
