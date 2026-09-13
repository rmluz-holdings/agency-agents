"use client";

import { useCallback, useState } from "react";
import {
  Activity,
  BadgeDollarSign,
  MousePointerClick,
  Percent,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Target,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  AffiliateLink,
  AnalyticsSummary,
  ClickEvent,
  DailyStat,
  DateRange,
  LinkStat,
} from "@/lib/types";
import { useStoreQuery } from "@/hooks/useStore";
import { cn, formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ClicksChart } from "./ClicksChart";
import { KpiCard } from "./KpiCard";
import { RecentActivity } from "./RecentActivity";
import { SourceBreakdown, type DeviceRow, type SourceRow } from "./SourceBreakdown";
import { TopLinksTable } from "./TopLinksTable";

const RANGES: DateRange[] = [7, 30, 90];

interface OverviewData {
  summary: AnalyticsSummary;
  daily: DailyStat[];
  byLink: LinkStat[];
  bySource: SourceRow[];
  byDevice: DeviceRow[];
  recent: ClickEvent[];
  links: AffiliateLink[];
}

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

export function AnalyticsOverview() {
  const [range, setRange] = useState<DateRange>(30);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading } = useStoreQuery<OverviewData>(
    async () => {
      const [summary, daily, byLink, bySource, byDevice, recent, links] = await Promise.all([
        api.analytics.summary(range),
        api.analytics.daily(range),
        api.analytics.byLink(range),
        api.analytics.bySource(range),
        api.analytics.byDevice(range),
        api.analytics.recent(10),
        api.links.list(),
      ]);
      return { summary, daily, byLink, bySource, byDevice, recent, links };
    },
    [api.analytics, api.links],
    [range],
  );

  const simulateClick = useCallback(async () => {
    setBusy(true);
    try {
      const links = await api.links.list();
      const link = pickRandom(links.filter((l) => l.active));
      if (!link) {
        setNotice("No active links to click. Create one in the Links tab first.");
        return;
      }
      await api.analytics.recordClick(link.id, "admin-test", "admin-dashboard");
      setNotice(`Recorded a test click on “${link.name}”.`);
    } finally {
      setBusy(false);
    }
  }, []);

  const simulateConversion = useCallback(async () => {
    setBusy(true);
    try {
      const links = await api.links.list();
      const link = pickRandom(links);
      if (!link) {
        setNotice("No links available.");
        return;
      }
      const event = await api.analytics.recordConversion(link.id);
      setNotice(
        event
          ? `Converted a click on “${link.name}” for ${formatCurrency(event.payout)}.`
          : `No unconverted clicks left on “${link.name}” — simulate a click first.`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const resetDemoData = useCallback(async () => {
    if (!window.confirm("Reset all click and conversion data back to the generated demo set?")) return;
    setBusy(true);
    try {
      await api.analytics.reset();
      setNotice("Demo analytics data has been regenerated.");
    } finally {
      setBusy(false);
    }
  }, []);

  const summary = data?.summary;
  const rangeLabel = `vs previous ${range} days`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div
          className="flex rounded-lg border border-border p-0.5"
          role="group"
          aria-label="Date range"
        >
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                range === r
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {r} days
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void simulateClick()}
            disabled={busy}
            className="btn-secondary text-xs"
          >
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
            Simulate click
          </button>
          <button
            type="button"
            onClick={() => void simulateConversion()}
            disabled={busy}
            className="btn-secondary text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Simulate conversion
          </button>
          <button
            type="button"
            onClick={() => void resetDemoData()}
            disabled={busy}
            className="btn-secondary text-xs text-danger"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset demo data
          </button>
        </div>

        <p role="status" aria-live="polite" className="w-full text-xs text-muted-foreground empty:hidden">
          {notice}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Clicks"
          value={summary ? formatNumber(summary.clicks) : "—"}
          delta={summary?.deltas.clicks}
          deltaLabel={rangeLabel}
          icon={MousePointerClick}
          loading={loading}
        />
        <KpiCard
          label="Conversions"
          value={summary ? formatNumber(summary.conversions) : "—"}
          delta={summary?.deltas.conversions}
          deltaLabel={rangeLabel}
          icon={ShoppingCart}
          loading={loading}
        />
        <KpiCard
          label="Conversion rate"
          value={summary ? formatPercent(summary.conversionRate) : "—"}
          icon={Percent}
          hint={summary ? `${formatCurrency(summary.epc)} earnings per click` : undefined}
          loading={loading}
        />
        <KpiCard
          label="Estimated payout"
          value={summary ? formatCurrency(summary.revenue) : "—"}
          delta={summary?.deltas.revenue}
          deltaLabel={rangeLabel}
          icon={BadgeDollarSign}
          loading={loading}
        />
      </div>

      {/* Chart */}
      <section className="card p-4 sm:p-5" aria-labelledby="performance-heading">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="performance-heading" className="text-sm font-bold tracking-tight">
              Performance over time
            </h2>
            <p className="text-xs text-muted-foreground">
              Clicks and conversions on the left axis, revenue on the right.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            Last {range} days
          </span>
        </div>
        {loading || !data ? (
          <div className="skeleton h-72 w-full sm:h-80" />
        ) : (
          <ClicksChart data={data.daily} range={range} />
        )}
      </section>

      {/* Leaderboard */}
      <section className="card overflow-hidden" aria-labelledby="top-links-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
          <h2 id="top-links-heading" className="text-sm font-bold tracking-tight">
            Top performing links
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" aria-hidden />
            Ranked by revenue
          </span>
        </div>
        {loading || !data ? (
          <div className="skeleton m-4 h-56" />
        ) : (
          <TopLinksTable stats={data.byLink} />
        )}
      </section>

      {/* Sources + devices */}
      {loading || !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
      ) : (
        <SourceBreakdown sources={data.bySource} devices={data.byDevice} />
      )}

      {/* Activity */}
      <section className="card p-4 sm:p-5" aria-labelledby="recent-activity-heading">
        <h2 id="recent-activity-heading" className="text-sm font-bold tracking-tight">
          Recent activity
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">The last 10 recorded click events.</p>
        {loading || !data ? (
          <div className="skeleton h-48 w-full" />
        ) : (
          <RecentActivity events={data.recent} links={data.links} />
        )}
      </section>
    </div>
  );
}
