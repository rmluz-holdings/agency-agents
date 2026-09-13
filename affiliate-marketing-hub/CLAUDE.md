# CLAUDE.md — Affiliate Marketing & Content Hub

Guidance for Claude working in this directory. The repository root is a
collection of agent personas; this folder is a standalone Next.js app. Treat
`affiliate-marketing-hub/` as the project root for every command below.

## What this app is

A zero-budget affiliate content site: visitor hub and product directory,
cloaked `/go/<slug>` redirects that inject the publisher tracking ID, an
analytics dashboard, a link manager, and a deterministic SEO article
generator. All data persists through a swappable `StorageAdapter`
(`src/lib/storage.ts`), backed by `localStorage` today. `README.md` has the
full architecture map; read it before changing structure.

## Commands

```bash
npm install
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (Next 16 config, React hooks rules are errors)
npm run build        # production build
npm run check        # typecheck + lint + build, run before every push
```

## Working style

- When you have enough information to act, act. Do not re-derive facts
  already established in the conversation or re-litigate decisions the user
  has made. If weighing a choice, give one recommendation.
- Do the simplest thing that works well. Don't add features, abstractions,
  fallbacks, or validation beyond what the task requires. A bug fix does not
  need surrounding cleanup. Trust framework guarantees; validate only at
  system boundaries (form input, external URLs).
- Stay in scope. The requested change is the deliverable. Don't quietly
  narrow, widen, or transform it. If part of it is blocked, finish the rest
  and say exactly what was left out and why.
- When the user describes a problem or asks a question, the deliverable is
  your assessment. Report findings and stop; don't apply a fix until asked.
- Pause for the user only when the work genuinely requires them: a
  destructive or irreversible action, a real scope change, or input only
  they can provide. Otherwise proceed and end the turn with the work done,
  not with a promise to do it.

## Verification and reporting

- Before reporting progress, audit each claim against a tool result from
  this session. Only report work you can point to evidence for. If tests or
  the build fail, say so and include the output. If a step was skipped, say
  that.
- Run `npm run check` before every push. For UI changes, also load the
  affected route in a headless browser (Playwright is pre-installed) and
  confirm no console errors; screenshot desktop, mobile (390px), and dark
  mode for anything visual.
- Any change that touches CTAs, disclosures, or redirects must re-confirm
  three invariants: the FTC disclosure banner renders before the first
  affiliate link on the page, every outbound button routes through
  `/go/<slug>`, and the resolved redirect URL carries the tracking ID.
- Lead the final message with the outcome. Short sentences, no shorthand,
  no arrow chains, no made-up labels. A reader who did not watch the work
  should understand it on its own.

## Delegation

- Split independent modules across parallel subagents (this app was built by
  three: UI, content engine, analytics/links). Give each one a fixed list of
  files it owns, the shared contract to read first (`src/lib/types.ts`,
  `src/lib/api/index.ts`, `src/hooks/useStore.ts`, `src/components/AffiliateCTA.tsx`,
  `src/components/FtcDisclosure.tsx`, `src/app/globals.css`), and tell it not
  to run `npm install`, `next build`, or `next dev` while others are working.
- Have subagents run `tsc` and `eslint` on their own files before reporting.
  The orchestrator runs the full build and browser check after integration.
- For long runs, verify with a fresh-context subagent against the spec rather
  than self-critique.

## Project conventions

- **Data access**: components never touch `localStorage` directly. Read and
  write through `api.*` in `src/lib/api/` and subscribe with `useStoreQuery`.
  Anything that reads `api.*` is a client component and must handle the
  loading state (skeleton utilities exist in `globals.css`).
- **Affiliate links**: `AffiliateCTA` is the only way to render an outbound
  affiliate button. Never hard-code partner URLs or tracking IDs in content.
  Tracking-ID injection lives in `buildAffiliateUrl` in `src/lib/affiliate.ts`;
  add new networks to `NETWORK_TRACKING_PARAM` there.
- **Compliance**: `FtcDisclosure` copy comes from settings. Use the `banner`
  variant above product grids and articles, `inline` under CTAs, `footer` in
  the site footer. Publisher-only data (commission, cookie length, payout)
  must never appear in visitor-facing copy, including seed product pros and
  generated article sections.
- **Content generator**: `src/lib/content/generator.ts` is pure and
  deterministic (seeded by keyword). Keep it free of React and browser APIs
  so it can move server-side or be replaced by an LLM call without UI changes.
- **Styling**: Tailwind v4 with tokens defined in `globals.css` (`bg-card`,
  `text-muted-foreground`, `bg-brand`, etc.) and utilities `card`, `btn-cta`,
  `btn-primary`, `btn-secondary`, `input`, `label`, `badge`, `skeleton`. Dark
  mode is the `.dark` class on `<html>`. Icons are lucide-react only; charts
  are recharts.
- **Types**: strict TypeScript, no `any`. Type layout props explicitly as
  `{ children: React.ReactNode }`.
- **Git**: `package-lock.json` is ignored at the repo root; do not force-add
  it. Keep commits scoped to this directory unless the task says otherwise.

## Lessons from previous sessions

One lesson per bullet, with why it mattered. Update or delete these as they
change; add new ones when something costs real time.

- **React hooks lint rules are errors in Next 16.** `react-hooks/set-state-in-effect`
  rejects any synchronous `setState` reachable from an effect body, including
  through a callback the effect calls, and `react-hooks/refs` rejects writing
  a ref during render. Derive state instead (see the deps-token pattern in
  `useStoreQuery`) and assign refs inside an effect.
- **Recharts v3 tooltip typing.** A custom `<Tooltip content>` must be typed
  as plain `TooltipContentProps`; adding generics fails type-checking.
- **Seed data is cached.** Seeds are copied into `localStorage` on first
  load, so editing `src/lib/data/seed.ts` does not change what an existing
  browser shows until "Reset demo data" in admin Settings is used. Say so
  when reporting seed changes.
- **Tailwind only compiles classes it can see.** Gradient strings on products
  live in `seed.ts`, which Tailwind scans. Products created at runtime with
  novel gradient classes will not get styles; pick from existing values.
- **Stopping the local server.** `pkill -f "next start"` matches the calling
  shell and kills it. Find the server by port or the `next-server` process
  name instead.
- **`/go/[slug]` renders inside the root layout.** The interstitial shows the
  site header and footer briefly; add `src/app/go/layout.tsx` if a bare
  redirect page is wanted.
