"use client";

import { useState } from "react";
import { AlertTriangle, Check, Database, Loader2, RotateCcw, Save } from "lucide-react";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { useSettings } from "@/hooks/useSettings";
import { api } from "@/lib/api";
import { NETWORK_LABEL } from "@/lib/affiliate";
import type { AffiliateNetwork, Settings } from "@/lib/types";

const NETWORKS = Object.keys(NETWORK_LABEL) as AffiliateNetwork[];

/** Mirror of `renderDisclosure` for the un-saved draft copy. */
function interpolate(text: string, siteName: string): string {
  return text.replace(/\{\{\s*siteName\s*\}\}/g, siteName);
}

export function SettingsPanel() {
  const { settings, loading } = useSettings();
  // `null` means "no local edits yet", so stored settings flow straight
  // through without an effect having to copy them into state.
  const [edits, setEdits] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  const draft = edits ?? settings;
  const dirty = edits !== null;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSaved(false);
    setEdits({ ...draft, [key]: value });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.settings.update(draft);
      setEdits(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (
      !window.confirm(
        "Reset ALL demo data? Products, links, clicks, articles and settings return to their seeded state.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await api.resetAll();
      setEdits(null);
      setSaved(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="card p-4 sm:p-6">
        <h2 className="text-sm font-bold tracking-tight">Site &amp; tracking</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The tracking ID is injected into every outbound link at redirect time, so changing it here
          updates existing links instantly.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="set-site-name" className="label">
              Site name
            </label>
            <input
              id="set-site-name"
              className="input"
              value={draft.siteName}
              onChange={(e) => set("siteName", e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="set-tracking-id" className="label">
              Tracking ID
            </label>
            <input
              id="set-tracking-id"
              className="input font-mono text-xs"
              value={draft.trackingId}
              onChange={(e) => set("trackingId", e.target.value)}
              aria-describedby="set-tracking-hint"
            />
            <p id="set-tracking-hint" className="mt-1 text-xs text-muted-foreground">
              e.g. <code className="font-mono">stackpicks-20</code>
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-tagline" className="label">
              Tagline
            </label>
            <input
              id="set-tagline"
              className="input"
              value={draft.siteTagline}
              onChange={(e) => set("siteTagline", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="set-network" className="label">
              Default network
            </label>
            <select
              id="set-network"
              className="input"
              value={draft.defaultNetwork}
              onChange={(e) => set("defaultNetwork", e.target.value as AffiliateNetwork)}
            >
              {NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {NETWORK_LABEL[n]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="set-author" className="label">
              Author name
            </label>
            <input
              id="set-author"
              className="input"
              value={draft.authorName}
              onChange={(e) => set("authorName", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="set-year" className="label">
              Content year
            </label>
            <input
              id="set-year"
              type="number"
              className="input"
              min={2000}
              max={2100}
              value={draft.contentYear}
              onChange={(e) => set("contentYear", Number(e.target.value) || draft.contentYear)}
              aria-describedby="set-year-hint"
            />
            <p id="set-year-hint" className="mt-1 text-xs text-muted-foreground">
              Appended to generated titles, e.g. “Best CRMs ({draft.contentYear})”.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-disclosure" className="label">
              FTC disclosure copy
            </label>
            <textarea
              id="set-disclosure"
              className="input min-h-28"
              value={draft.disclosureText}
              onChange={(e) => set("disclosureText", e.target.value)}
              aria-describedby="set-disclosure-hint"
            />
            <p id="set-disclosure-hint" className="mt-1 text-xs text-muted-foreground">
              <code className="font-mono">{"{{siteName}}"}</code> is replaced with the site name.
              Required by 16 CFR Part 255 — keep it clear and conspicuous.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="label">Live preview</p>
          <FtcDisclosure
            variant="banner"
            text={interpolate(draft.disclosureText, draft.siteName)}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button type="submit" className="btn-primary" disabled={saving || loading}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save settings
          </button>
          <p role="status" aria-live="polite" className="text-sm empty:hidden">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                <Check className="h-4 w-4" aria-hidden />
                Settings saved
              </span>
            ) : dirty ? (
              <span className="text-muted-foreground">Unsaved changes</span>
            ) : null}
          </p>
        </div>
      </form>

      <section className="card p-4 sm:p-6" aria-labelledby="data-layer-heading">
        <h2 id="data-layer-heading" className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <Database className="h-4 w-4 text-brand" aria-hidden />
          Data layer
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Everything you see is persisted through a single <code className="font-mono">StorageAdapter</code>{" "}
          interface (<code className="font-mono">get</code>, <code className="font-mono">set</code>,{" "}
          <code className="font-mono">remove</code>, <code className="font-mono">subscribe</code>) that
          currently writes to <code className="font-mono">localStorage</code> under the{" "}
          <code className="font-mono">amh:v1:</code> namespace. Swapping in Supabase, Vercel KV or your own
          REST API means implementing those four methods and re-exporting the adapter from{" "}
          <code className="font-mono">src/lib/storage.ts</code> — no component, hook or API call changes.
          Because the mock API in <code className="font-mono">src/lib/api</code> is already fully async,
          the migration is a drop-in replacement rather than a rewrite.
        </p>
      </section>

      <section
        className="rounded-2xl border border-danger/40 bg-danger/5 p-4 sm:p-6"
        aria-labelledby="danger-zone-heading"
      >
        <h2
          id="danger-zone-heading"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-danger"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          Danger zone
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Wipes products, links, click events, articles and settings, then re-seeds the demo dataset.
          This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => void resetAll()}
          disabled={resetting}
          className="btn-secondary mt-4 border-danger/40 text-danger"
        >
          {resetting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-4 w-4" aria-hidden />
          )}
          Reset all demo data
        </button>
      </section>
    </div>
  );
}
