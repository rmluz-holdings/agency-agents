import { KEYS } from "../storage";
import type {
  AnalyticsSummary,
  ClickEvent,
  ClickSource,
  DailyStat,
  DateRange,
  DeviceType,
  LinkStat,
} from "../types";
import { generateSeedClicks } from "../data/seed";
import { daysAgo, toDateKey, uid } from "../utils";
import { createCollection } from "./collection";
import { linksApi } from "./links";
import { productsApi } from "./products";

const collection = createCollection<ClickEvent>(KEYS.clicks, () => generateSeedClicks());

function detectDevice(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function inRange(events: ClickEvent[], start: Date, end: Date): ClickEvent[] {
  const s = start.getTime();
  const e = end.getTime();
  return events.filter((ev) => {
    const t = new Date(ev.timestamp).getTime();
    return t >= s && t < e;
  });
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function aggregate(events: ClickEvent[]) {
  const clicks = events.length;
  const conversions = events.filter((e) => e.converted).length;
  const revenue = events.reduce((s, e) => s + e.payout, 0);
  return {
    clicks,
    conversions,
    revenue,
    conversionRate: clicks ? (conversions / clicks) * 100 : 0,
    epc: clicks ? revenue / clicks : 0,
  };
}

export const analyticsApi = {
  key: collection.key,
  list: collection.list,
  reset: collection.reset,
  subscribe: collection.subscribe,

  /** Record a real click (called by the /go/[slug] redirect page). */
  async recordClick(
    linkId: string,
    source: ClickSource = "direct",
    referrer?: string,
  ): Promise<ClickEvent> {
    const event: ClickEvent = {
      id: uid("clk"),
      linkId,
      timestamp: new Date().toISOString(),
      source,
      device: detectDevice(),
      referrer,
      converted: false,
      payout: 0,
    };
    await collection.create(event);
    return event;
  },

  /**
   * Simulate a conversion postback from the network. In production this is
   * what your webhook handler would do.
   */
  async recordConversion(linkId: string, payout?: number): Promise<ClickEvent | null> {
    const events = await collection.list();
    const candidate = [...events]
      .reverse()
      .find((e) => e.linkId === linkId && !e.converted);
    if (!candidate) return null;
    let amount = payout;
    if (amount === undefined) {
      const link = await linksApi.get(linkId);
      const product = link?.productId ? await productsApi.get(link.productId) : null;
      amount = product?.commission.estimatedPayout ?? 25;
    }
    return collection.update(candidate.id, { converted: true, payout: amount });
  },

  async summary(range: DateRange, now = new Date()): Promise<AnalyticsSummary> {
    const events = await collection.list();
    const end = new Date(now.getTime() + 60_000);
    const start = daysAgo(range, now);
    const prevStart = daysAgo(range * 2, now);
    const current = aggregate(inRange(events, start, end));
    const previous = aggregate(inRange(events, prevStart, start));
    return {
      ...current,
      deltas: {
        clicks: pctChange(current.clicks, previous.clicks),
        conversions: pctChange(current.conversions, previous.conversions),
        revenue: pctChange(current.revenue, previous.revenue),
      },
    };
  },

  async daily(range: DateRange, now = new Date()): Promise<DailyStat[]> {
    const events = await collection.list();
    const buckets = new Map<string, DailyStat>();
    for (let d = range - 1; d >= 0; d--) {
      const key = toDateKey(daysAgo(d, now));
      buckets.set(key, { date: key, clicks: 0, conversions: 0, revenue: 0 });
    }
    for (const ev of events) {
      const key = ev.timestamp.slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      b.clicks += 1;
      if (ev.converted) {
        b.conversions += 1;
        b.revenue += ev.payout;
      }
    }
    return [...buckets.values()];
  },

  async byLink(range: DateRange, now = new Date()): Promise<LinkStat[]> {
    const [events, links] = await Promise.all([collection.list(), linksApi.list()]);
    const scoped = inRange(events, daysAgo(range, now), new Date(now.getTime() + 60_000));
    return links
      .map((link) => {
        const agg = aggregate(scoped.filter((e) => e.linkId === link.id));
        return { linkId: link.id, slug: link.slug, name: link.name, network: link.network, ...agg };
      })
      .sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);
  },

  async bySource(range: DateRange, now = new Date()): Promise<{ source: ClickSource; clicks: number; conversions: number }[]> {
    const events = inRange(await collection.list(), daysAgo(range, now), new Date(now.getTime() + 60_000));
    const map = new Map<ClickSource, { source: ClickSource; clicks: number; conversions: number }>();
    for (const e of events) {
      const row = map.get(e.source) ?? { source: e.source, clicks: 0, conversions: 0 };
      row.clicks += 1;
      if (e.converted) row.conversions += 1;
      map.set(e.source, row);
    }
    return [...map.values()].sort((a, b) => b.clicks - a.clicks);
  },

  async byDevice(range: DateRange, now = new Date()): Promise<{ device: DeviceType; clicks: number }[]> {
    const events = inRange(await collection.list(), daysAgo(range, now), new Date(now.getTime() + 60_000));
    const map = new Map<DeviceType, number>();
    for (const e of events) map.set(e.device, (map.get(e.device) ?? 0) + 1);
    return [...map.entries()].map(([device, clicks]) => ({ device, clicks })).sort((a, b) => b.clicks - a.clicks);
  },

  async recent(limit = 12): Promise<ClickEvent[]> {
    const events = await collection.list();
    return events.slice(-limit).reverse();
  },
};
