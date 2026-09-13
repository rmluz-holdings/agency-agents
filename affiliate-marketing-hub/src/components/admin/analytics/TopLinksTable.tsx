"use client";

import Link from "next/link";
import { NETWORK_LABEL } from "@/lib/affiliate";
import type { LinkStat } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export interface TopLinksTableProps {
  stats: LinkStat[];
  /** How many rows to show. */
  limit?: number;
}

export function TopLinksTable({ stats, limit = 8 }: TopLinksTableProps) {
  const rows = stats.filter((s) => s.clicks > 0).slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => r.clicks));

  if (rows.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        No clicks recorded in this period yet. Use the simulator above to generate some traffic.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="sr-only">Affiliate links ranked by revenue</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-semibold">
              #
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Link
            </th>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Network
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Clicks
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Conv
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              CR
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              EPC
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Revenue
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.linkId} className="border-b border-border/60 last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-3">
                <span className="block font-semibold">{row.name}</span>
                <Link
                  href={`/go/${row.slug}?preview=1`}
                  target="_blank"
                  className="font-mono text-xs text-muted-foreground hover:text-brand"
                >
                  /go/{row.slug}
                </Link>
                <span className="mt-1.5 block h-1 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(4, (row.clicks / max) * 100)}%` }}
                  />
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="badge bg-muted text-muted-foreground">{NETWORK_LABEL[row.network]}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.clicks)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatNumber(row.conversions)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatPercent(row.conversionRate)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.epc)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-success">
                {formatCurrency(row.revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
