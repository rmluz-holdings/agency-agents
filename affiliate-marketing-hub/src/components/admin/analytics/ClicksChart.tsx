"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { DailyStat, DateRange } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

export interface ClicksChartProps {
  data: DailyStat[];
  range: DateRange;
}

/** "2026-01-05" → "Jan 5" (parsed as UTC so the bucket never shifts a day). */
function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function ClicksChart({ data, range }: ClicksChartProps) {
  const byDate = useMemo(() => new Map(data.map((d) => [d.date, d])), [data]);
  // Keep the axis readable on 90-day ranges.
  const tickInterval = range === 7 ? 0 : range === 30 ? 3 : 11;

  const renderTooltip = ({ active, label }: TooltipContentProps) => {
    if (!active || typeof label !== "string") return null;
    const row = byDate.get(label);
    if (!row) return null;
    return (
      <div className="card px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold">{dayLabel(row.date)}</p>
        <dl className="mt-1.5 space-y-1">
          <div className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} aria-hidden />
              Clicks
            </dt>
            <dd className="font-semibold tabular-nums">{formatNumber(row.clicks)}</dd>
          </div>
          <div className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
              Conversions
            </dt>
            <dd className="font-semibold tabular-nums">{formatNumber(row.conversions)}</dd>
          </div>
          <div className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--success)" }} aria-hidden />
              Revenue
            </dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(row.revenue)}</dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={dayLabel}
            interval={tickInterval}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            minTickGap={8}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => formatNumber(v, { compact: true })}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
          />
          <Tooltip content={renderTooltip} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#clicksFill)"
            activeDot={{ r: 4 }}
          />
          <Bar
            yAxisId="left"
            dataKey="conversions"
            name="Conversions"
            fill="var(--accent)"
            radius={[3, 3, 0, 0]}
            maxBarSize={18}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
