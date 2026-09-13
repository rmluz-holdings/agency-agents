"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { NETWORK_LABEL, cloakedPath, cloakedUrl } from "@/lib/affiliate";
import type { AffiliateLink } from "@/lib/types";
import { cn, formatNumber, truncate } from "@/lib/utils";

export interface LinkTableProps {
  links: AffiliateLink[];
  /** linkId → clicks in the last 30 days. */
  clicks: Record<string, number>;
  onEdit: (link: AffiliateLink) => void;
  onDelete: (link: AffiliateLink) => void;
  onToggleActive: (link: AffiliateLink) => void;
}

export function LinkTable({ links, clicks, onEdit, onDelete, onToggleActive }: LinkTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (link: AffiliateLink) => {
    try {
      await navigator.clipboard.writeText(cloakedUrl(link.slug));
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1800);
    } catch {
      /* clipboard blocked – the path is visible in the cell anyway */
    }
  };

  if (links.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-muted-foreground">
        No links match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">All cloaked affiliate links</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Link
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Destination
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Network
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Clicks 30d
            </th>
            <th scope="col" className="px-4 py-2.5 text-center font-semibold">
              Active
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => {
            const copied = copiedId === link.id;
            return (
              <tr key={link.id} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 align-top">
                  <span className="block font-semibold">{link.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <code className="font-mono text-xs text-muted-foreground">
                      {cloakedPath(link.slug)}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copy(link)}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={`Copy the full URL for ${link.name}`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-success" aria-hidden />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" aria-hidden />
                          Copy
                        </>
                      )}
                    </button>
                  </span>
                  {link.tags.length > 0 ? (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {link.tags.map((tag) => (
                        <span key={tag} className="badge bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </td>

                <td className="max-w-xs px-4 py-3 align-top">
                  <span
                    className="block truncate font-mono text-xs text-muted-foreground"
                    title={link.destinationUrl}
                  >
                    {truncate(link.destinationUrl, 52)}
                  </span>
                </td>

                <td className="px-4 py-3 align-top">
                  <span className="badge bg-brand-soft text-brand">{NETWORK_LABEL[link.network]}</span>
                </td>

                <td className="px-4 py-3 text-right align-top tabular-nums">
                  {formatNumber(clicks[link.id] ?? 0)}
                </td>

                <td className="px-4 py-3 text-center align-top">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={link.active}
                    aria-label={`${link.active ? "Deactivate" : "Activate"} ${link.name}`}
                    onClick={() => onToggleActive(link)}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                      link.active ? "bg-success" : "bg-border",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                        link.active ? "translate-x-[18px]" : "translate-x-[2px]",
                      )}
                    />
                  </button>
                </td>

                <td className="px-4 py-3 align-top">
                  <span className="flex items-center justify-end gap-1">
                    <a
                      href={`${cloakedPath(link.slug)}?preview=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title="Open the resolved outbound URL without recording a click"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Test
                    </a>
                    <button
                      type="button"
                      onClick={() => onEdit(link)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(link)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only sm:not-sr-only">Delete</span>
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
