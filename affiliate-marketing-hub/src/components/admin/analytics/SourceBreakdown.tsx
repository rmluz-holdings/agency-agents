"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { Laptop, Smartphone, Tablet } from "lucide-react";
import type { ClickSource, DeviceType } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/utils";

export interface SourceRow {
  source: ClickSource;
  clicks: number;
  conversions: number;
}

export interface DeviceRow {
  device: DeviceType;
  clicks: number;
}

export interface SourceBreakdownProps {
  sources: SourceRow[];
  devices: DeviceRow[];
}

const SOURCE_LABEL: Record<ClickSource, string> = {
  hub: "Homepage hub",
  review: "Review articles",
  directory: "Tool directory",
  direct: "Direct / other",
  "admin-test": "Admin test",
};

const DEVICE_LABEL: Record<DeviceType, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
};

const DEVICE_ICON: Record<DeviceType, LucideIcon> = {
  desktop: Laptop,
  mobile: Smartphone,
  tablet: Tablet,
};

const DEVICE_COLOR: Record<DeviceType, string> = {
  desktop: "var(--brand)",
  mobile: "var(--accent)",
  tablet: "var(--success)",
};

export function SourceBreakdown({ sources, devices }: SourceBreakdownProps) {
  const sourceTotal = sources.reduce((s, r) => s + r.clicks, 0);
  const deviceTotal = devices.reduce((s, r) => s + r.clicks, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="traffic-sources-heading">
        <h3 id="traffic-sources-heading" className="text-sm font-bold tracking-tight">
          Traffic sources
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Where the click happened before hitting <code className="font-mono">/go/…</code>
        </p>

        {sourceTotal === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No clicks in this period.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sources.map((row) => {
              const share = (row.clicks / sourceTotal) * 100;
              return (
                <li key={row.source}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{SOURCE_LABEL[row.source]}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(row.clicks)}
                      <span className="ml-1.5 text-xs">({formatPercent(share, 0)})</span>
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${SOURCE_LABEL[row.source]}: ${formatPercent(share, 0)} of clicks`}
                  >
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-500"
                      style={{ width: `${Math.max(2, share)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatNumber(row.conversions)} conversions
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5" aria-labelledby="devices-heading">
        <h3 id="devices-heading" className="text-sm font-bold tracking-tight">
          Devices
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Detected from the visitor user agent.</p>

        {deviceTotal === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No clicks in this period.</p>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devices}
                    dataKey="clicks"
                    nameKey="device"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {devices.map((row) => (
                      <Cell key={row.device} fill={DEVICE_COLOR[row.device]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="w-full space-y-2.5">
              {devices.map((row) => {
                const Icon = DEVICE_ICON[row.device];
                const share = (row.clicks / deviceTotal) * 100;
                return (
                  <li key={row.device} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: DEVICE_COLOR[row.device] }}
                      aria-hidden
                    />
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="font-medium">{DEVICE_LABEL[row.device]}</span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {formatNumber(row.clicks)}
                      <span className="ml-1.5 text-xs">({formatPercent(share, 0)})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
