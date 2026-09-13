"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { api, type LinkInput } from "@/lib/api";
import {
  NETWORK_LABEL,
  NETWORK_TRACKING_PARAM,
  TRACKING_TOKEN,
  buildAffiliateUrl,
} from "@/lib/affiliate";
import type { AffiliateLink, AffiliateNetwork, Product } from "@/lib/types";
import { cn, isValidHttpUrl, slugify } from "@/lib/utils";

export interface LinkFormProps {
  /** null → create a new link, otherwise edit this one. */
  link: AffiliateLink | null;
  products: Product[];
  trackingId: string;
  defaultNetwork: AffiliateNetwork;
  onClose: () => void;
  onSaved: (link: AffiliateLink) => void;
}

const NETWORKS = Object.keys(NETWORK_LABEL) as AffiliateNetwork[];

type SlugState = "idle" | "checking" | "available" | "taken";

/** Split the resolved URL so the injected tracking value can be highlighted. */
function highlightTracking(
  resolved: string,
  trackingId: string,
  network: AffiliateNetwork,
): { text: string; hit: boolean }[] {
  const id = trackingId.trim();
  if (!id) return [{ text: resolved, hit: false }];
  const param = NETWORK_TRACKING_PARAM[network];
  const candidates = [
    `${param}=${encodeURIComponent(id)}`,
    `${param}=${id}`,
    encodeURIComponent(id),
    id,
  ];
  const needle = candidates.find((c) => resolved.includes(c));
  if (!needle) return [{ text: resolved, hit: false }];

  const parts: { text: string; hit: boolean }[] = [];
  let rest = resolved;
  let idx = rest.indexOf(needle);
  while (idx !== -1) {
    if (idx > 0) parts.push({ text: rest.slice(0, idx), hit: false });
    parts.push({ text: needle, hit: true });
    rest = rest.slice(idx + needle.length);
    idx = rest.indexOf(needle);
  }
  if (rest) parts.push({ text: rest, hit: false });
  return parts;
}

export function LinkForm({
  link,
  products,
  trackingId,
  defaultNetwork,
  onClose,
  onSaved,
}: LinkFormProps) {
  const fieldId = useId();
  const isEdit = link !== null;

  const [name, setName] = useState(link?.name ?? "");
  const [destinationUrl, setDestinationUrl] = useState(link?.destinationUrl ?? "");
  const [slug, setSlug] = useState(link?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [network, setNetwork] = useState<AffiliateNetwork>(link?.network ?? defaultNetwork);
  const [productId, setProductId] = useState(link?.productId ?? "");
  const [tags, setTags] = useState((link?.tags ?? []).join(", "));
  const [active, setActive] = useState(link?.active ?? true);

  const [slugCheck, setSlugCheck] = useState<{ slug: string; available: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-suggest a slug from the name until the user edits the slug by hand.
  useEffect(() => {
    if (slugTouched || !name.trim()) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void api.links.suggestSlug(name).then((suggested) => {
        if (!cancelled) setSlug(suggested);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [name, slugTouched]);

  const normalisedSlug = slugify(slug);

  // Live availability check (debounced). The displayed state is derived so the
  // effect never has to set state synchronously.
  useEffect(() => {
    if (!normalisedSlug) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void api.links.isSlugAvailable(normalisedSlug, link?.id).then((available) => {
        if (!cancelled) setSlugCheck({ slug: normalisedSlug, available });
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [normalisedSlug, link?.id]);

  const slugState: SlugState = !normalisedSlug
    ? "idle"
    : slugCheck?.slug === normalisedSlug
      ? slugCheck.available
        ? "available"
        : "taken"
      : "checking";

  const urlValid = destinationUrl.trim() === "" || isValidHttpUrl(destinationUrl.replace(TRACKING_TOKEN, "x"));
  const resolved = useMemo(
    () => (destinationUrl.trim() ? buildAffiliateUrl(destinationUrl, trackingId, network) : ""),
    [destinationUrl, trackingId, network],
  );
  const resolvedParts = useMemo(
    () => highlightTracking(resolved, trackingId, network),
    [resolved, trackingId, network],
  );

  const canSubmit =
    name.trim().length > 0 &&
    destinationUrl.trim().length > 0 &&
    urlValid &&
    slugState !== "taken" &&
    !saving;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidHttpUrl(destinationUrl.replace(TRACKING_TOKEN, "x"))) {
      setError("Enter a valid http(s) destination URL.");
      return;
    }

    const input: LinkInput = {
      name: name.trim(),
      destinationUrl: destinationUrl.trim(),
      network,
      slug: normalisedSlug || undefined,
      productId: productId || undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      active,
    };

    setSaving(true);
    try {
      const saved = link
        ? await api.links.updateLink(link.id, input)
        : await api.links.createLink(input);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${fieldId}-title`}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-card shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div>
            <h2 id={`${fieldId}-title`} className="text-base font-bold tracking-tight">
              {isEdit ? "Edit link" : "New affiliate link"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Cloaked, tracked and rewritten with your publisher ID at redirect time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 px-5 py-5">
          <div>
            <label htmlFor={`${fieldId}-name`} className="label">
              Name
            </label>
            <input
              id={`${fieldId}-name`}
              ref={firstFieldRef}
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Semrush Pro"
              required
            />
          </div>

          <div>
            <label htmlFor={`${fieldId}-url`} className="label">
              Destination URL
            </label>
            <input
              id={`${fieldId}-url`}
              className="input font-mono text-xs"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://partner.example.com/offer"
              inputMode="url"
              aria-invalid={!urlValid}
              aria-describedby={`${fieldId}-url-hint`}
              required
            />
            <p id={`${fieldId}-url-hint`} className="mt-1 text-xs text-muted-foreground">
              Use <code className="font-mono text-brand">{TRACKING_TOKEN}</code> anywhere in the URL to
              place your tracking ID by hand — otherwise{" "}
              <code className="font-mono">{NETWORK_TRACKING_PARAM[network]}</code> is appended
              automatically.
            </p>
            {!urlValid ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-danger">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                That does not look like a valid http(s) URL.
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${fieldId}-slug`} className="label">
              Slug
            </label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">/go/</span>
              <input
                id={`${fieldId}-slug`}
                className="input font-mono text-xs"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="semrush"
                aria-describedby={`${fieldId}-slug-state`}
              />
            </div>
            <p id={`${fieldId}-slug-state`} className="mt-1 text-xs">
              {slugState === "checking" ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Checking availability…
                </span>
              ) : slugState === "available" ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  <code className="font-mono">/go/{normalisedSlug}</code> is available
                </span>
              ) : slugState === "taken" ? (
                <span className="inline-flex items-center gap-1 text-danger">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  <code className="font-mono">/go/{normalisedSlug}</code> is taken or reserved
                </span>
              ) : (
                <span className="text-muted-foreground">Leave empty to generate one from the name.</span>
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${fieldId}-network`} className="label">
                Network
              </label>
              <select
                id={`${fieldId}-network`}
                className="input"
                value={network}
                onChange={(e) => setNetwork(e.target.value as AffiliateNetwork)}
              >
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {NETWORK_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${fieldId}-product`} className="label">
                Product (optional)
              </label>
              <select
                id={`${fieldId}-product`}
                className="input"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">No product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${fieldId}-tags`} className="label">
              Tags
            </label>
            <input
              id={`${fieldId}-tags`}
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="seo, marketing, high-ticket"
              aria-describedby={`${fieldId}-tags-hint`}
            />
            <p id={`${fieldId}-tags-hint`} className="mt-1 text-xs text-muted-foreground">
              Comma separated.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--brand)]"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Active</span>
              <span className="ml-1.5 text-muted-foreground">
                inactive links show a friendly “no longer available” page.
              </span>
            </span>
          </label>

          <div className="rounded-xl border border-border bg-muted/60 p-3">
            <p className="label mb-1">Resolved outbound URL</p>
            {resolved ? (
              <p className="break-all font-mono text-xs leading-relaxed">
                {resolvedParts.map((part, i) =>
                  part.hit ? (
                    <mark
                      key={i}
                      className="rounded bg-brand-soft px-0.5 font-semibold text-brand"
                    >
                      {part.text}
                    </mark>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Enter a destination URL to preview.</p>
            )}
          </div>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className={cn("btn-primary")} disabled={!canSubmit}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {isEdit ? "Save changes" : "Create link"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
