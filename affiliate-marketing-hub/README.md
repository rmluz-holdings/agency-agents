# Affiliate Marketing & Content Hub

A production-ready starter for running a high-ticket affiliate content site: a
conversion-optimised visitor hub, a link cloaking & shortener utility, a
click/conversion analytics dashboard, and a mock "AI" SEO content generator –
all on a **zero-budget stack** with no backend required.

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Styling | Tailwind CSS v4 with design tokens + class-based dark mode |
| Icons | lucide-react |
| Charts | recharts |
| Persistence | `localStorage` behind a swappable `StorageAdapter` (Supabase / Vercel KV ready) |

## Quick start

```bash
cd affiliate-marketing-hub
npm install
npm run dev          # http://localhost:3000
npm run check        # typecheck + lint + production build
```

## What's inside

```
src/
├── app/
│   ├── layout.tsx              Root layout: header, footer, FTC footer disclosure, theme bootstrap
│   ├── page.tsx                Visitor hub: hero, top picks, Recommended Tools & Resources grid
│   ├── tools/page.tsx          Full product directory with filters/sort
│   ├── reviews/                Public article index + /reviews/[slug] article pages
│   ├── go/[slug]/page.tsx      Cloaked redirect: /go/<slug> → tracking-ID-injected partner URL
│   └── admin/
│       ├── layout.tsx          Admin shell (sidebar, tracking-ID chip)
│       └── dashboard/page.tsx  Central management system (Overview · Links · Content · Settings)
├── components/
│   ├── ProductCard.tsx         Reusable conversion card: price badge, pros/cons, premium CTA
│   ├── AffiliateCTA.tsx        The only way to render an outbound affiliate button
│   ├── FtcDisclosure.tsx       Dynamic FTC disclosure (banner / inline / footer / compact)
│   ├── ArticleRenderer.tsx     Visitor-facing article renderer with JSON-LD
│   ├── site/                   Header, footer, theme toggle, product grid, newsletter capture
│   └── admin/                  analytics/, links/, content/, settings/
├── hooks/                      useStoreQuery (reactive mock-API queries), useSettings
└── lib/
    ├── types.ts                Domain model (Product, AffiliateLink, ClickEvent, Article, Settings)
    ├── storage.ts              StorageAdapter interface + localStorage implementation
    ├── affiliate.ts            buildAffiliateUrl(): injects the tracking ID per network
    ├── content/generator.ts    Deterministic SEO article template engine + SEO audit + exports
    ├── api/                    Mock API (products, links, analytics, articles, settings)
    └── data/seed.ts            Seed products, links, and 90 days of click history
```

## How the pieces fit

### Link cloaking & tracking-ID injection

Content never hard-codes a partner URL. Every CTA renders through
`<AffiliateCTA linkSlug="kinsta" source="review" />`, which points at
`/go/kinsta?src=review`. The redirect page looks the slug up, records a
`ClickEvent` (source, device, referrer), builds the outbound URL with
`buildAffiliateUrl()` and sends the visitor on.

`buildAffiliateUrl()` injects `Settings.trackingId` in one of two ways:

1. A literal `{{trackingId}}` token in the destination is replaced in place.
2. Otherwise the network-specific query parameter is appended
   (`tag=` for Amazon, `subId1=` for Impact, `ps_xid=` for PartnerStack, …).

Change the tracking ID once in **Admin → Settings** and every link, article and
export updates.

### FTC compliance

`<FtcDisclosure />` reads its copy from settings and is rendered:

- as a **banner above** every product grid and every article (before any
  affiliate link, per 16 CFR Part 255),
- **inline** under each CTA button,
- in the **site footer** on every page,
- at the top of every Markdown/HTML export from the content generator.

All outbound links carry `rel="sponsored nofollow noopener noreferrer"`.

### Content engine

`generateArticle()` in `src/lib/content/generator.ts` turns a keyword +
template (top-list, single review, comparison, alternatives) + a set of products
into a complete `Article` – SEO title, meta tags, intro, ranked product sections,
comparison table, buying guide, FAQ and verdict – then `seoScore()` audits it.
It is deterministic (seeded by the keyword) so the same input always produces
the same draft. Swap the body of `generateArticle()` for a call to an LLM API
when you have budget; the surrounding UI, storage, and exports stay unchanged.

### Analytics

`src/lib/api/analytics.ts` aggregates `ClickEvent`s into daily series, per-link
leaderboards (clicks, conversions, CR, EPC, revenue), source/device breakdowns
and period-over-period deltas. `recordConversion()` is the shape of the webhook
handler you would wire to a network postback.

## Moving off localStorage

Everything persists through `StorageAdapter` in `src/lib/storage.ts`:

```ts
interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  subscribe(key: string, listener: () => void): () => void;
}
```

To move to Supabase or Vercel KV, implement those four methods against a
`kv(key text primary key, value jsonb)` table (or `kv.get/set`) and change the
single `export const storage = …` line. Because the mock API in `src/lib/api/`
is fully async, you can alternatively replace each repository with `fetch()`
calls to route handlers – no component needs to change.

Keys used: `products`, `links`, `clicks`, `articles`, `settings`
(namespaced `amh:v1:` in localStorage).

## Placeholder data

Seed products, prices, commission figures and destination URLs in
`src/lib/data/seed.ts` are illustrative examples for the demo. Replace them with
the real terms from your partner dashboards before going live.
