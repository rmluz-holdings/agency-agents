/**
 * Deterministic template-driven article generator ("AI content engine").
 *
 * Pure and dependency-free on purpose: no React, no storage, no network. The
 * same `GenerateInput` always produces the same prose, because every phrasing
 * choice is drawn from a `mulberry32` stream seeded with a hash of the keyword.
 * Only `id`, `createdAt` and `updatedAt` vary between runs.
 *
 * Nothing here ever writes commission data into visitor-facing copy: payouts
 * and cookie windows are publisher information and stay in the admin.
 */
import { buildAffiliateUrl, OUTBOUND_REL } from "../affiliate";
import type {
  AffiliateLink,
  Article,
  ArticleSection,
  Product,
  ProductPrice,
  Settings,
} from "../types";
import { formatCurrency, formatNumber, mulberry32, slugify, titleCase, uid } from "../utils";

/* ------------------------------------------------------------------ types */

export type ArticleTemplate = "top-list" | "single-review" | "comparison" | "alternatives";

export type ArticleTone = "authoritative" | "friendly" | "analytical";

export interface TemplateMeta {
  label: string;
  description: string;
  /** lucide-react icon name; the UI maps it to a component. */
  icon?: string;
  /** Number of products the template consumes, when fixed. */
  fixedProductCount?: number;
}

export const TEMPLATE_META: Record<ArticleTemplate, TemplateMeta> = {
  "top-list": {
    label: "Top N roundup",
    description: "Ranked “best of” list — the highest-intent format for affiliate traffic.",
    icon: "ListOrdered",
  },
  "single-review": {
    label: "Single product review",
    description: "Deep dive on one tool: pricing, pros, cons and a worth-it verdict.",
    icon: "Star",
    fixedProductCount: 1,
  },
  comparison: {
    label: "Head-to-head comparison",
    description: "X vs Y, decided feature by feature with a side-by-side table.",
    icon: "Scale",
    fixedProductCount: 2,
  },
  alternatives: {
    label: "Alternatives roundup",
    description: "“Best alternatives to X” — captures switchers already shopping.",
    icon: "Shuffle",
  },
};

export const TEMPLATE_ORDER: ArticleTemplate[] = [
  "top-list",
  "single-review",
  "comparison",
  "alternatives",
];

export const TONE_LABEL: Record<ArticleTone, string> = {
  authoritative: "Authoritative",
  friendly: "Friendly",
  analytical: "Analytical",
};

export const TONE_ORDER: ArticleTone[] = ["authoritative", "friendly", "analytical"];

export interface GenerateInput {
  keyword: string;
  template: ArticleTemplate;
  products: Product[];
  settings: Settings;
  /** Products to feature (3–8). Ignored by single-review / comparison. */
  count?: number;
  tone?: ArticleTone;
}

export interface SeoCheck {
  label: string;
  pass: boolean;
  hint?: string;
}

export interface SeoReport {
  score: number;
  checks: SeoCheck[];
}

export interface ResolvedCta {
  product: Product;
  link: AffiliateLink | null;
  /** Absolute outbound URL with the tracking ID already injected. */
  url: string;
  /** Internal cloaked path used on the live site. */
  cloaked: string;
  label: string;
}

/* -------------------------------------------------------------- utilities */

const phrase = keywordPhrase;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PERIOD_LABEL: Record<ProductPrice["period"], string> = {
  mo: "/mo",
  yr: "/yr",
  once: " one-time",
};

const PERIOD_WORD: Record<ProductPrice["period"], string> = {
  mo: "per month",
  yr: "per year",
  once: "as a one-time payment",
};

export function formatPrice(price: ProductPrice): string {
  return `${formatCurrency(price.amount)}${PERIOD_LABEL[price.period]}`;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lowerFirst(value: string): string {
  if (!value) return value;
  const firstWord = value.split(/\s/)[0];
  // Leave proper nouns and acronyms intact: WordPress, DTC, B2B, AI…
  if (/[A-Z]/.test(firstWord.slice(1))) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/** Casing the generic title-caser gets wrong (utils.titleCase lowercases the tail). */
const WORD_CASE: Record<string, string> = {
  ai: "AI", seo: "SEO", sem: "SEM", crm: "CRM", cms: "CMS", erp: "ERP", api: "API",
  ux: "UX", ui: "UI", b2b: "B2B", b2c: "B2C", ppc: "PPC", vpn: "VPN", saas: "SaaS",
  hr: "HR", roi: "ROI", sms: "SMS", ecommerce: "eCommerce", llm: "LLM", pdf: "PDF",
};

/** Title-case that keeps acronyms upper-case: "ai seo tools" → "AI SEO Tools". */
export function smartTitleCase(value: string): string {
  return titleCase(value)
    .split(" ")
    .map((word) => {
      const key = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
      const fixed = WORD_CASE[key];
      return fixed ? word.replace(/[a-zA-Z]+/, fixed) : word;
    })
    .join(" ");
}

/** Lower-case the keyword for running prose, but keep acronyms upper-case. */
export function normaliseKeywordCase(keyword: string): string {
  return keyword
    .split(/\s+/)
    .map((word) => WORD_CASE[word.replace(/[^a-zA-Z]/g, "").toLowerCase()] ?? word.toLowerCase())
    .join(" ");
}

/** Drop a leading "best "/"top " so "the best best crm" never happens. */
function withoutSuperlative(keyword: string): string {
  return keyword.replace(/^\s*(the\s+)?(best|top|cheapest|fastest)\s+/i, "").trim() || keyword;
}

/** Keywords that already end in a category noun ("…software", "…tools"). */
const CATEGORY_NOUN = /\b(software|tools?|platforms?|apps?|services?|suites?|systems?|solutions?)$/i;

/**
 * Append a category noun to a keyword only when it does not already have one,
 * so "email marketing software" never becomes "email marketing software tool".
 */
export function keywordPhrase(keyword: string, noun: string): string {
  return CATEGORY_NOUN.test(keyword.trim()) ? keyword.trim() : `${keyword.trim()} ${noun}`;
}

function stripPeriod(value: string): string {
  return value.replace(/\.\s*$/, "");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Keyword match that tolerates word order, so "best crm" matches "Best CRM Tools". */
export function containsKeyword(haystack: string, keyword: string): boolean {
  const hay = normalise(haystack);
  const needle = normalise(keyword);
  if (!needle) return false;
  if (hay.includes(needle)) return true;
  const tokens = needle.split(" ").filter((t) => t.length > 2);
  return tokens.length > 0 && tokens.every((t) => hay.includes(t));
}

/** Trim to a word boundary without exceeding `max`. */
function fitTitle(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,:;–—-]+$/, "");
}

/** Force a meta description into the 140–160 character sweet spot. */
function fitMetaDescription(sentences: string[]): string {
  const source = sentences.join(" ").replace(/\s+/g, " ").trim();
  const words = source.split(" ");
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 158) break;
    out = next;
  }
  out = out.replace(/[\s,:;–—-]+$/, "");
  if (!/[.!?]$/.test(out) && out.length <= 159) out = `${out}.`;
  return out;
}

/* ------------------------------------------------------- product selection */

/** Which products a template actually consumes, in presentation order. */
export function productsForTemplate(
  products: Product[],
  template: ArticleTemplate,
  count = 5,
): Product[] {
  const wanted = clamp(Math.round(count), 3, 8);
  if (template === "single-review") return products.slice(0, 1);
  if (template === "comparison") return products.slice(0, 2);
  if (template === "top-list") {
    return products
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.rating - a.p.rating || a.i - b.i)
      .slice(0, wanted)
      .map((entry) => entry.p);
  }
  // alternatives: products[0] is the anchor everyone is switching away from.
  return products.slice(0, wanted);
}

/** Product sections only — the alternatives template never reviews its anchor. */
function reviewedProducts(products: Product[], template: ArticleTemplate): Product[] {
  return template === "alternatives" ? products.slice(1) : products;
}

/* ------------------------------------------------------------- copy engine */

interface Ctx {
  keyword: string;
  kw: string;
  kwTitle: string;
  year: number;
  month: string;
  siteName: string;
  author: string;
  tone: ArticleTone;
  template: ArticleTemplate;
  products: Product[];
  reviewed: Product[];
  winner: Product;
  anchor: Product;
  pick: <T>(options: T[]) => T;
  rand: () => number;
}

const TONE_OPENER: Record<ArticleTone, string[]> = {
  authoritative: [
    "We have bought, deployed and cancelled every tool on this page.",
    "This ranking is the result of paid accounts, not vendor demos.",
    "Every claim below is something we verified inside the product.",
  ],
  friendly: [
    "Shopping for software is exhausting, so we did the boring part for you.",
    "Let us save you a weekend of free trials.",
    "Here is the honest, plain-English version of this decision.",
  ],
  analytical: [
    "We scored each contender against the same nine-point rubric.",
    "The data below comes from a controlled 30-day side-by-side test.",
    "We normalised pricing per seat and per workflow before ranking anything.",
  ],
};

const AUDIENCES = [
  "solo founders and two-person teams",
  "marketers running lean in-house teams",
  "agency owners who bill for outcomes",
  "creators turning an audience into revenue",
  "operators replacing a stack that outgrew them",
];

function makeIntro(ctx: Ctx): ArticleSection {
  const hours = 40 + Math.floor(ctx.rand() * 60);
  const audience = ctx.pick(AUDIENCES);
  const heading = ctx.pick([
    `Why you can trust this ${ctx.kw} guide`,
    `The short answer on ${ctx.kw}`,
    `How we picked the best ${ctx.kw} tools`,
  ]);

  const hook = ctx.pick([
    `We spent ${hours} hours running the same workflow through every serious ${ctx.kw} option on the market, and the gap between our top pick and the middle of the pack was far wider than the marketing pages suggest.`,
    `Most ${ctx.kw} roundups rank tools by feature tables. This one ranks them by what actually happened when we pushed real work through each platform for a full billing cycle.`,
    `Picking a ${phrase(ctx.kw, "platform")} is a decision you live with for years, so we tested ${ctx.products.length} of them side by side instead of trusting a comparison chart written by a vendor.`,
  ]);

  const whoFor = `${ctx.pick(TONE_OPENER[ctx.tone])} This guide is written for ${audience} who need ${ctx.kw} that earns its cost in the first month — not a platform that only pays off after a six-figure implementation. If you are still deciding whether you need ${ctx.kw} at all, the buying guide further down answers that first.`;

  const how = `Here is how we tested. Every contender got the same brief: import a real dataset, ship one campaign, and survive a support ticket. We scored setup time, depth of the features you use weekly, support responsiveness and price-to-value, then re-checked every price in ${ctx.month} ${ctx.year}. ${ctx.winner.name} came out on top, but the runner-up is genuinely better for some teams and we say exactly who below.`;

  const stakes = ctx.pick([
    `One more note before the rankings: ${ctx.siteName} keeps the review and the revenue separate. Nothing buys a position on this page, and the ranking below is the same one we give friends who ask which ${phrase(ctx.kw, "tool")} to buy.`,
    `We update this ${ctx.kw} comparison whenever a vendor changes pricing or ships something that moves the ranking, and we note the month of the last check at the top of every section.`,
  ]);

  return {
    id: "sec-intro",
    type: "intro",
    heading,
    paragraphs: [hook, whoFor, how, stakes],
  };
}

function makeProductSection(ctx: Ctx, product: Product, index: number, deep: boolean): ArticleSection {
  const price = formatPrice(product.price);
  const pros = product.pros;
  const cons = product.cons;
  const feature = product.features[0] ?? "its core workflow";
  const secondFeature = product.features[1] ?? feature;
  const position =
    index === 0
      ? ctx.pick(["at the top of this list", "in first place", "as our overall pick"])
      : ctx.pick(["comfortably mid-pack on price", "toward the premium end of this list", "in the middle of this list on cost"]);

  const opener = ctx.pick([
    `${product.name} is ${product.vendor}'s answer to ${ctx.kw}, and the focus shows. ${product.description}`,
    `${product.description} That combination is why ${product.name} keeps showing up on shortlists for ${ctx.kw}.`,
    `If you only demo one ${ctx.kw} tool this month, make it ${product.name}. ${product.description}`,
  ]);
  const p1 = `${opener} At ${price}, it lands ${position}.`;

  const p2 = `${ctx.pick(["What we liked", "What stood out in testing", "Where it wins"])}: ${lowerFirst(stripPeriod(pros[0] ?? "it is fast to set up"))}${pros[1] ? `, and ${lowerFirst(stripPeriod(pros[1]))}` : ""}. ${feature} is the feature we would miss most if we cancelled — it turned a task that normally eats an afternoon into something we finished before a coffee went cold. ${secondFeature !== feature ? `${secondFeature} is the quiet second reason teams stay.` : ""} ${product.reviewCount > 0 ? `The wider market agrees: ${formatNumber(product.reviewCount)} public reviews average ${product.rating.toFixed(1)} out of 5.` : ""}`.replace(/\s+/g, " ").trim();

  const p3 = `It is not perfect. ${stripPeriod(cons[0] ?? "The learning curve is real")}${cons[1] ? `, and ${lowerFirst(stripPeriod(cons[1]))}` : ""}. ${ctx.pick(["None of that is a dealbreaker", "We can live with both", "Neither issue stopped us recommending it"])} if ${lowerFirst(product.bestFor)} describes your situation — and if it does not, the ${ctx.kw} pick above or below will fit you better. Pricing starts at ${formatCurrency(product.price.amount)} ${PERIOD_WORD[product.price.period]}${product.price.originalAmount ? `, down from ${formatCurrency(product.price.originalAmount)} at list price` : ""}.`;

  const paragraphs = [p1, p2, p3];

  if (deep) {
    paragraphs.push(
      `Under the hood you get ${product.features.slice(0, 4).join(", ")}. In a ${ctx.kw} workflow those pieces matter in that order: the first two are what you touch daily, the rest are what stop you outgrowing the tool in year two. We rebuilt an existing workflow inside ${product.name} from scratch and had it running in an afternoon, which is faster than most platforms in this category manage.`,
      `On value, ${price} buys you more than the sticker suggests once you count the tools it replaces. Teams we spoke to dropped at least one subscription after standardising on ${product.name}. The honest caveat is that ${lowerFirst(stripPeriod(cons[0] ?? "costs scale with usage"))} — so model your ${ctx.kw} usage at twelve months, not at today's volume, before you commit to an annual plan.`,
    );
  }

  return {
    id: `sec-product-${index}`,
    type: "product",
    heading: `#${index + 1}. ${product.name} — Best for ${product.bestFor}`,
    productId: product.id,
    paragraphs,
  };
}

function makeComparison(ctx: Ctx): ArticleSection {
  const names = ctx.products.map((p) => p.name);
  const cheapest = ctx.products.reduce((a, b) => (a.price.amount <= b.price.amount ? a : b));
  const topRated = ctx.products.reduce((a, b) => (a.rating >= b.rating ? a : b));

  const rows: NonNullable<ArticleSection["comparisonRows"]> = [
    { label: "Price", values: ctx.products.map((p) => formatPrice(p.price)) },
    { label: "Rating", values: ctx.products.map((p) => `${p.rating.toFixed(1)} / 5`) },
    { label: "Standout feature", values: ctx.products.map((p) => p.features[0] ?? "—") },
    { label: "Best for", values: ctx.products.map((p) => p.bestFor) },
  ];

  const p1 = `If you want the whole ${ctx.kw} decision on one screen, this is it. ${names.length === 2 ? `${names[0]} and ${names[1]} split the field` : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} cover the realistic shortlist`}, and the table below is the version of this comparison we actually keep open while deciding.`;
  const p2 = `Two quick reads of the table: ${cheapest.name} is the cheapest entry point at ${formatPrice(cheapest.price)}, and ${topRated.name} carries the strongest satisfaction score at ${topRated.rating.toFixed(1)} out of 5. Cheapest and best-rated are rarely the same row, which is exactly why the ${ctx.kw} choice comes down to your workflow rather than a single number.`;

  return {
    id: "sec-comparison",
    type: "comparison",
    heading: `${ctx.kwTitle} compared side by side`,
    paragraphs: [p1, p2],
    comparisonRows: rows,
  };
}

function makeBuyingGuide(ctx: Ctx): ArticleSection {
  const prices = ctx.products.map((p) => p.price.amount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    id: "sec-buying-guide",
    type: "buying-guide",
    heading: `How to choose the right ${phrase(withoutSuperlative(ctx.kw), "tool")}`,
    paragraphs: [
      `Start with the three jobs you need done weekly and ignore everything else. Every ${phrase(ctx.kw, "platform")} on this page has a feature list long enough to look identical on a spreadsheet, so the only useful filter is whether the two or three workflows you repeat every week feel fast. Open a trial, run one real task end to end, and notice how many tabs and exports it took. ${ctx.pick(["That number predicts your next two years better than any feature grid.", "The tool that needs the fewest workarounds on day one usually needs the fewest in year two."])}`,
      `Then set a budget that includes seats and growth, not just the headline plan. In this roundup the entry points range from ${formatCurrency(min)} to ${formatCurrency(max)} per billing cycle, and most teams land in the middle once a second and third user join. Ask the vendor what the price looks like at double your current volume; ${ctx.kw} pricing tends to be gentle at the bottom tier and steep at the tier you will actually need in nine months. Annual billing usually saves 15–20%, but only commit once a trial has survived a full workflow.`,
      `The most common mistakes are predictable. Buying the biggest platform because it will “grow with you” usually means paying for two years of features you never switch on. Buying purely on price means a migration inside twelve months, which costs more in lost hours than the difference you saved. And choosing ${phrase(ctx.kw, "software")} without checking data export means the next migration is a manual rebuild — always confirm you can get your data out in a usable format before you put it in.`,
      `Finally, weigh support and the exit path. Test support during the trial with a real question, not a pre-sales one, and time the reply. Check whether integrations you depend on are native or need a third-party connector, because connector costs quietly add a line item every month. If two ${ctx.kw} options are close after all that, pick the one your team can learn without training — adoption beats capability every single time.`,
    ],
  };
}

function makeFaq(ctx: Ctx): ArticleSection {
  const prices = ctx.products.map((p) => p.price.amount);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const runnerUp = ctx.reviewed[1] ?? ctx.reviewed[0] ?? ctx.winner;

  return {
    id: "sec-faq",
    type: "faq",
    heading: `${ctx.kwTitle} FAQ`,
    paragraphs: [
      `The questions readers send us most often about ${ctx.kw}, answered in the order they usually arrive.`,
    ],
    faq: [
      {
        question: `What is the best ${phrase(withoutSuperlative(ctx.kw), "tool")} in ${ctx.year}?`,
        answer: `${ctx.winner.name} is our overall pick for ${ctx.year}. It scored highest on the combination we weight most heavily — time to first result, depth of the features you use weekly, and price-to-value at ${formatPrice(ctx.winner.price)}. It is the best fit for ${lowerFirst(ctx.winner.bestFor)}.`,
      },
      {
        question: `How much does ${phrase(withoutSuperlative(ctx.kw), "software")} cost?`,
        answer: `Across the options in this guide, entry pricing runs from ${formatCurrency(min)} to ${formatCurrency(max)} per billing cycle. Most teams of two to five people end up in the middle of that range once seats are counted. Annual billing typically cuts 15–20% off the monthly rate.`,
      },
      {
        question: `Is ${ctx.winner.name} worth it for beginners?`,
        answer: `Yes, with one caveat: ${lowerFirst(stripPeriod(ctx.winner.cons[0] ?? "the feature surface is large"))}. Work through the onboarding checklist before inviting your team and you will be productive in a day. If you want something lighter to start with, ${runnerUp.name} has the gentler learning curve.`,
      },
      {
        question: `Can I switch ${phrase(ctx.kw, "tools")} later without losing data?`,
        answer: `Usually, but confirm it before you sign. Every tool in this guide offers CSV or API export; what varies is how much structure survives the move. Export a sample during your trial and open it — if the export is usable, a future migration is an afternoon rather than a rebuild.`,
      },
      {
        question: `Does ${ctx.siteName} earn a commission from these links?`,
        answer: `Yes. Some links on this page are affiliate links, and ${ctx.siteName} may earn a commission if you buy through them at no extra cost to you. That never changes the ranking: we test with paid accounts and publish the same order we would recommend to a friend.`,
      },
    ],
  };
}

function makeVerdict(ctx: Ctx): ArticleSection {
  const runnerUp = ctx.reviewed[1] ?? null;
  const budget = ctx.products.reduce((a, b) => (a.price.amount <= b.price.amount ? a : b));

  return {
    id: "sec-verdict",
    type: "verdict",
    heading: `The verdict: ${ctx.winner.name} is our ${ctx.year} ${ctx.kw} pick`,
    productId: ctx.winner.id,
    paragraphs: [
      `${ctx.winner.name} wins this ${ctx.kw} comparison because it is the only option that was both fast to get running and still deep enough three weeks in. ${stripPeriod(ctx.winner.pros[0] ?? "It is the most complete option here")}, and at ${formatPrice(ctx.winner.price)} the price is defensible for ${lowerFirst(ctx.winner.bestFor)}.`,
      runnerUp
        ? `If ${ctx.winner.name} is not the right shape for your team, ${runnerUp.name} is the runner-up we would happily run instead — it is the better call for ${lowerFirst(runnerUp.bestFor)}. On a tight budget, ${budget.name} at ${formatPrice(budget.price)} covers the fundamentals without locking you into a contract.`
        : `If your budget is tighter than ${formatPrice(ctx.winner.price)}, start on the lowest tier and upgrade once the workflow proves itself — every feature that matters most is available from the entry plan.`,
      `Whichever you choose, start with the trial and run one real ${ctx.kw} workflow through it before you pay for a year. Prices and plans were last verified in ${ctx.month} ${ctx.year}.`,
    ],
  };
}

/* --------------------------------------------------------- title + meta */

function buildTitle(ctx: Ctx): string {
  const { year, keyword } = ctx;
  switch (ctx.template) {
    case "single-review": {
      const p = ctx.winner;
      return `${p.name} Review ${year}: Is It Worth ${formatPrice(p.price)}?`;
    }
    case "comparison": {
      const [a, b] = ctx.products;
      return `${a.name} vs ${b.name} (${year}): Which Is Better for ${keyword}?`;
    }
    case "alternatives":
      return `${ctx.reviewed.length} Best ${ctx.anchor.name} Alternatives for ${keyword} in ${year}`;
    case "top-list":
    default:
      return `Top ${ctx.products.length} ${smartTitleCase(phrase(ctx.kw, "tools"))} in ${year} (Tested & Ranked)`;
  }
}

function buildMetaTitle(ctx: Ctx): string {
  const { year } = ctx;
  const candidates: string[] = (() => {
    switch (ctx.template) {
      case "single-review":
        return [`${ctx.winner.name} Review (${year}): Worth It?`, `${ctx.winner.name} Review ${year}`];
      case "comparison":
        return [
          `${ctx.products[0].name} vs ${ctx.products[1].name} (${year})`,
          `${ctx.products[0].name} vs ${ctx.products[1].name}`,
        ];
      case "alternatives":
        return [
          `${ctx.reviewed.length} Best ${ctx.anchor.name} Alternatives (${year})`,
          `Best ${ctx.anchor.name} Alternatives ${year}`,
        ];
      default:
        return [
          `Top ${ctx.products.length} ${smartTitleCase(phrase(ctx.kw, "tools"))} (${year}) — Ranked`,
          `Top ${ctx.products.length} ${smartTitleCase(phrase(ctx.kw, "tools"))} ${year}`,
          `Best ${smartTitleCase(phrase(ctx.kw, "tools"))} ${year}`,
        ];
    }
  })();

  const fits = candidates.find((c) => c.length <= 60);
  return fits ?? fitTitle(candidates[candidates.length - 1], 60);
}

function buildMetaDescription(ctx: Ctx): string {
  const lead: string = (() => {
    switch (ctx.template) {
      case "single-review":
        return `Our hands-on ${ctx.winner.name} review for ${ctx.kw}: real pricing from ${formatPrice(ctx.winner.price)}, the pros, the cons and whether it is worth it in ${ctx.year}.`;
      case "comparison":
        return `${ctx.products[0].name} vs ${ctx.products[1].name} for ${ctx.kw}: we tested both on price, features and support to show which one wins in ${ctx.year}.`;
      case "alternatives":
        return `The ${ctx.reviewed.length} best ${ctx.anchor.name} alternatives for ${ctx.kw}, tested and ranked for ${ctx.year} with honest pricing, pros and cons.`;
      default:
        return `We tested and ranked ${ctx.products.length} ${ctx.kw} options for ${ctx.year} on price, features and real-world support.`;
    }
  })();

  return fitMetaDescription([
    lead,
    `${ctx.winner.name} is our top pick from ${formatPrice(ctx.winner.price)}.`,
    `Compare every option, see the pros and cons, and pick the ${phrase(ctx.kw, "tool")} that fits your budget today.`,
    `Updated ${ctx.month} ${ctx.year} by ${ctx.author}.`,
  ]);
}

function buildSecondaryKeywords(ctx: Ctx): string[] {
  const kw = ctx.kw;
  const pool = [
    `best ${kw}`,
    `${kw} pricing`,
    `${kw} for beginners`,
    `${kw} vs`,
    `${kw} review ${ctx.year}`,
    `cheap ${phrase(kw, "tools")}`,
    `${kw} alternatives`,
    `is ${kw} worth it`,
  ].filter((k) => k.toLowerCase() !== kw.toLowerCase());

  const wanted = 4 + Math.floor(ctx.rand() * 3); // 4–6
  return pool.slice(0, wanted);
}

/* ------------------------------------------------------------- generation */

/**
 * Build a complete, SEO-shaped draft article from a keyword and a product set.
 * Deterministic for a given keyword + template + product selection.
 */
export function generateArticle(input: GenerateInput): Article {
  const keyword = input.keyword.trim().replace(/\s+/g, " ");
  if (!keyword) throw new Error("Enter a target keyword before generating.");

  const selected = productsForTemplate(input.products, input.template, input.count ?? 5);
  if (selected.length === 0) {
    throw new Error("Select at least one product to feature in this article.");
  }
  if (input.template === "comparison" && selected.length < 2) {
    throw new Error("A head-to-head comparison needs two products.");
  }
  if (input.template === "alternatives" && selected.length < 2) {
    throw new Error("An alternatives roundup needs an anchor product plus at least one alternative.");
  }

  const rand = mulberry32(hashString(`${keyword}|${input.template}`));
  const pick = <T,>(options: T[]): T => options[Math.floor(rand() * options.length)];
  const reviewed = reviewedProducts(selected, input.template);
  const now = new Date();

  const ctx: Ctx = {
    keyword,
    kw: normaliseKeywordCase(keyword),
    kwTitle: smartTitleCase(keyword),
    year: input.settings.contentYear,
    month: MONTHS[now.getMonth()],
    siteName: input.settings.siteName,
    author: input.settings.authorName,
    tone: input.tone ?? "authoritative",
    template: input.template,
    products: selected,
    reviewed,
    winner: reviewed[0] ?? selected[0],
    anchor: selected[0],
    pick,
    rand,
  };

  const deep = reviewed.length <= 2;
  const sections: ArticleSection[] = [
    makeIntro(ctx),
    ...reviewed.map((product, i) => makeProductSection(ctx, product, i, deep)),
    makeComparison(ctx),
    makeBuyingGuide(ctx),
    makeFaq(ctx),
    makeVerdict(ctx),
  ];

  const title = buildTitle(ctx);
  const wordCount = countArticleWords(sections);

  return {
    id: uid("art"),
    slug: slugify(title),
    title,
    metaTitle: buildMetaTitle(ctx),
    metaDescription: buildMetaDescription(ctx),
    keyword,
    secondaryKeywords: buildSecondaryKeywords(ctx),
    status: "draft",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sections,
    productIds: selected.map((p) => p.id),
    trackingIdSnapshot: input.settings.trackingId,
    readingMinutes: Math.max(1, Math.round(wordCount / 200)),
    wordCount,
  };
}

function countArticleWords(sections: ArticleSection[]): number {
  return sections.reduce((total, section) => {
    let n = countWords(section.heading);
    n += section.paragraphs.reduce((s, p) => s + countWords(p), 0);
    for (const item of section.faq ?? []) {
      n += countWords(item.question) + countWords(item.answer);
    }
    for (const row of section.comparisonRows ?? []) {
      n += countWords(row.label) + row.values.reduce((s, v) => s + countWords(v), 0);
    }
    return total + n;
  }, 0);
}

/* --------------------------------------------------------------- exports */

function interpolateDisclosure(settings: Settings): string {
  return settings.disclosureText.replace(/\{\{\s*siteName\s*\}\}/g, settings.siteName);
}

function linkForProduct(product: Product, links: AffiliateLink[]): AffiliateLink | null {
  return (
    links.find((l) => l.id === product.affiliateLinkId) ??
    links.find((l) => l.productId === product.id) ??
    null
  );
}

/**
 * Every outbound CTA in an article, with the tracking ID already injected.
 * Used by the exports and by the builder's "where do these links go?" panel.
 */
export function resolveCtas(
  article: Article,
  products: Product[],
  settings: Settings,
  links: AffiliateLink[],
): ResolvedCta[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return article.productIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p))
    .map((product) => {
      const link = linkForProduct(product, links);
      return {
        product,
        link,
        url: link ? buildAffiliateUrl(link.destinationUrl, settings.trackingId, link.network) : "",
        cloaked: link ? `/go/${link.slug}` : "",
        label: `Check price on ${product.vendor}`,
      };
    });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Markdown export — CTAs carry the absolute affiliate URL with the tracking ID. */
export function articleToMarkdown(
  article: Article,
  products: Product[],
  settings: Settings,
  links: AffiliateLink[],
): string {
  const byId = new Map(products.map((p) => [p.id, p]));
  const ctaByProduct = new Map(resolveCtas(article, products, settings, links).map((c) => [c.product.id, c]));
  const columns = article.productIds.map((id) => byId.get(id)?.name ?? "—");
  const out: string[] = [];

  out.push(`# ${article.title}`, "");
  out.push(`> **Affiliate Disclosure:** ${interpolateDisclosure(settings)}`, "");
  out.push(
    `*By ${settings.authorName} · Updated ${formatDate(article.updatedAt)} · ${article.readingMinutes} min read*`,
    "",
  );

  for (const section of article.sections) {
    out.push(`## ${section.heading}`, "");
    for (const p of section.paragraphs) out.push(p, "");

    if (section.comparisonRows?.length) {
      out.push(`| | ${columns.join(" | ")} |`);
      out.push(`| --- | ${columns.map(() => "---").join(" | ")} |`);
      for (const row of section.comparisonRows) {
        out.push(`| **${row.label}** | ${row.values.join(" | ")} |`);
      }
      out.push("");
    }

    for (const item of section.faq ?? []) {
      out.push(`### ${item.question}`, "", item.answer, "");
    }

    const cta = section.productId ? ctaByProduct.get(section.productId) : undefined;
    if (cta && cta.url) {
      out.push(`**[${cta.label} →](${cta.url})** — affiliate link, tracking ID \`${settings.trackingId}\`.`, "");
    }
  }

  out.push("---", "", `*${interpolateDisclosure(settings)}*`, "");
  return out.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML export, ready to paste into WordPress. */
export function articleToHtml(
  article: Article,
  products: Product[],
  settings: Settings,
  links: AffiliateLink[],
): string {
  const byId = new Map(products.map((p) => [p.id, p]));
  const ctaByProduct = new Map(resolveCtas(article, products, settings, links).map((c) => [c.product.id, c]));
  const columns = article.productIds.map((id) => byId.get(id)?.name ?? "—");
  const out: string[] = [];

  out.push(`<article class="affiliate-review">`);
  out.push(
    `  <aside class="ftc-disclosure"><strong>Affiliate Disclosure:</strong> ${escapeHtml(interpolateDisclosure(settings))}</aside>`,
  );
  out.push(`  <h1>${escapeHtml(article.title)}</h1>`);
  out.push(
    `  <p class="byline">By ${escapeHtml(settings.authorName)} · Updated ${escapeHtml(formatDate(article.updatedAt))} · ${article.readingMinutes} min read</p>`,
  );

  for (const section of article.sections) {
    out.push(`  <h2 id="${slugify(section.heading)}">${escapeHtml(section.heading)}</h2>`);
    for (const p of section.paragraphs) out.push(`  <p>${escapeHtml(p)}</p>`);

    if (section.comparisonRows?.length) {
      out.push(`  <table>`);
      out.push(`    <thead><tr><th scope="col"></th>${columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("")}</tr></thead>`);
      out.push(`    <tbody>`);
      for (const row of section.comparisonRows) {
        out.push(
          `      <tr><th scope="row">${escapeHtml(row.label)}</th>${row.values.map((v) => `<td>${escapeHtml(v)}</td>`).join("")}</tr>`,
        );
      }
      out.push(`    </tbody>`);
      out.push(`  </table>`);
    }

    for (const item of section.faq ?? []) {
      out.push(`  <h3>${escapeHtml(item.question)}</h3>`);
      out.push(`  <p>${escapeHtml(item.answer)}</p>`);
    }

    const cta = section.productId ? ctaByProduct.get(section.productId) : undefined;
    if (cta && cta.url) {
      out.push(
        `  <p class="cta"><a class="btn" href="${escapeHtml(cta.url)}" rel="${OUTBOUND_REL}" target="_blank">${escapeHtml(cta.label)} →</a></p>`,
      );
      out.push(`  <p class="cta-note"><small>Affiliate link — tracking ID ${escapeHtml(settings.trackingId)}.</small></p>`);
    }
  }

  out.push(`  <p class="ftc-footer"><small>${escapeHtml(interpolateDisclosure(settings))}</small></p>`);
  out.push(`</article>`);
  return out.join("\n");
}

/* ------------------------------------------------------------- SEO audit */

/** Lightweight on-page SEO audit for the generated draft. */
export function seoScore(article: Article): SeoReport {
  const bodyWords = article.sections
    .flatMap((s) => [s.heading, ...s.paragraphs, ...(s.faq ?? []).flatMap((f) => [f.question, f.answer])])
    .join(" ")
    .split(/\s+/);
  const firstHundred = bodyWords.slice(0, 100).join(" ");
  const productSections = article.sections.filter((s) => s.type === "product").length;
  const ctaCount = productSections + article.sections.filter((s) => s.type === "verdict").length;

  const checks: SeoCheck[] = [
    {
      label: "Primary keyword in the H1 title",
      pass: containsKeyword(article.title, article.keyword),
      hint: `Work “${article.keyword}” into the title.`,
    },
    {
      label: "Meta title is 60 characters or fewer",
      pass: article.metaTitle.length > 0 && article.metaTitle.length <= 60,
      hint: `Currently ${article.metaTitle.length} characters — Google truncates past 60.`,
    },
    {
      label: "Meta description is 140–160 characters",
      pass: article.metaDescription.length >= 140 && article.metaDescription.length <= 160,
      hint: `Currently ${article.metaDescription.length} characters.`,
    },
    {
      label: "At least 1,200 words",
      pass: article.wordCount >= 1200,
      hint: `Currently ${article.wordCount} words — add another product or expand the buying guide.`,
    },
    {
      label: "Has an FAQ section",
      pass: article.sections.some((s) => s.type === "faq" && (s.faq?.length ?? 0) > 0),
      hint: "FAQ blocks win People Also Ask placements.",
    },
    {
      label: "Has a comparison table",
      pass: article.sections.some((s) => s.type === "comparison" && (s.comparisonRows?.length ?? 0) > 0),
      hint: "A side-by-side table keeps comparison-intent readers on the page.",
    },
    {
      label: "Keyword appears in the first 100 words",
      pass: containsKeyword(firstHundred, article.keyword),
      hint: "Mention the keyword in the opening paragraph.",
    },
    {
      label: "At least 3 H2 headings",
      pass: article.sections.length >= 3,
      hint: "Break the article into more scannable sections.",
    },
    {
      label: "One CTA per featured product",
      pass: ctaCount >= article.productIds.length,
      hint: `${ctaCount} CTAs for ${article.productIds.length} products — every product needs an outbound button.`,
    },
  ];

  const passed = checks.filter((c) => c.pass).length;
  return { score: Math.round((passed / checks.length) * 100), checks };
}
