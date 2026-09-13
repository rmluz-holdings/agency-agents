import type {
  AffiliateLink,
  ClickEvent,
  ClickSource,
  DeviceType,
  Product,
  Settings,
} from "../types";
import { daysAgo, mulberry32 } from "../utils";

const NOW_ISO = "2026-01-01T00:00:00.000Z";

export const DEFAULT_SETTINGS: Settings = {
  siteName: "StackPicks",
  siteTagline: "Hand-tested tools for people who build online businesses.",
  trackingId: "stackpicks-20",
  defaultNetwork: "direct",
  disclosureText:
    "{{siteName}} is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you. We only recommend products we have personally tested.",
  authorName: "The StackPicks Team",
  contentYear: 2026,
};

/**
 * Seed affiliate links. Destinations are illustrative placeholders – replace
 * them with your real partner URLs in the admin panel.
 */
export const SEED_LINKS: AffiliateLink[] = [
  {
    id: "lnk_hubspot",
    slug: "hubspot",
    name: "HubSpot Marketing Hub",
    destinationUrl: "https://www.hubspot.com/products/marketing?irclickid={{trackingId}}",
    network: "impact",
    productId: "prd_hubspot",
    tags: ["crm", "marketing", "high-ticket"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_semrush",
    slug: "semrush",
    name: "Semrush Pro",
    destinationUrl: "https://www.semrush.com/pricing/",
    network: "impact",
    productId: "prd_semrush",
    tags: ["seo", "marketing"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_kinsta",
    slug: "kinsta",
    name: "Kinsta Managed Hosting",
    destinationUrl: "https://kinsta.com/plans/",
    network: "direct",
    productId: "prd_kinsta",
    tags: ["hosting", "recurring"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_jasper",
    slug: "jasper",
    name: "Jasper AI",
    destinationUrl: "https://www.jasper.ai/pricing",
    network: "partnerstack",
    productId: "prd_jasper",
    tags: ["ai", "content"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_clickfunnels",
    slug: "clickfunnels",
    name: "ClickFunnels 2.0",
    destinationUrl: "https://www.clickfunnels.com/pricing",
    network: "direct",
    productId: "prd_clickfunnels",
    tags: ["funnels", "high-ticket", "recurring"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_teachable",
    slug: "teachable",
    name: "Teachable Pro",
    destinationUrl: "https://teachable.com/pricing",
    network: "impact",
    productId: "prd_teachable",
    tags: ["courses", "education"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_shopify",
    slug: "shopify",
    name: "Shopify Plus",
    destinationUrl: "https://www.shopify.com/plus",
    network: "impact",
    productId: "prd_shopify",
    tags: ["ecommerce", "high-ticket"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_notion",
    slug: "notion",
    name: "Notion Business",
    destinationUrl: "https://www.notion.so/pricing",
    network: "partnerstack",
    productId: "prd_notion",
    tags: ["productivity"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_amazon_desk",
    slug: "standing-desk",
    name: "Amazon – Standing Desk Pick",
    destinationUrl: "https://www.amazon.com/dp/B0EXAMPLE1",
    network: "amazon",
    tags: ["amazon", "office"],
    active: true,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
  {
    id: "lnk_legacy",
    slug: "old-webinar-offer",
    name: "Legacy Webinar Offer (paused)",
    destinationUrl: "https://example.com/webinar?aff={{trackingId}}",
    network: "direct",
    tags: ["archived"],
    active: false,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: "prd_hubspot",
    slug: "hubspot-marketing-hub",
    name: "HubSpot Marketing Hub",
    vendor: "HubSpot",
    category: "marketing",
    tagline: "The all-in-one CRM and marketing automation platform for scaling teams.",
    description:
      "HubSpot Marketing Hub combines email, automation, landing pages, and a full CRM in one workspace. Its Professional tier is where serious teams live: multi-touch attribution, custom reporting, and workflows that trigger from any property.",
    price: { amount: 890, currency: "USD", period: "mo", originalAmount: 1080 },
    commission: { type: "recurring", value: 30, cookieDays: 180, estimatedPayout: 267 },
    rating: 4.6,
    reviewCount: 11840,
    pros: [
      "Genuinely unified CRM, email, and automation",
      "Best-in-class onboarding and documentation",
      "Attribution reporting that marketers actually use",
    ],
    cons: ["Pricing climbs fast with contact count", "Advanced features locked to Enterprise"],
    features: ["Marketing automation", "Multi-touch attribution", "A/B testing", "Custom objects"],
    badges: ["editors-choice", "high-ticket"],
    icon: "🧲",
    gradient: "from-orange-500 to-rose-500",
    affiliateLinkId: "lnk_hubspot",
    featured: true,
    bestFor: "B2B teams that want CRM + automation under one roof",
  },
  {
    id: "prd_semrush",
    slug: "semrush-pro",
    name: "Semrush Pro",
    vendor: "Semrush",
    category: "marketing",
    tagline: "Keyword research, competitor intelligence, and rank tracking in one suite.",
    description:
      "Semrush is the SEO toolkit most agencies standardise on. Keyword Magic, Site Audit, and Position Tracking cover 90% of an SEO workflow, and the content toolkit closes the loop from research to publish.",
    price: { amount: 139.95, currency: "USD", period: "mo" },
    commission: { type: "flat", value: 200, cookieDays: 120, estimatedPayout: 200 },
    rating: 4.5,
    reviewCount: 6210,
    pros: ["Largest keyword database in the category", "Excellent competitor gap analysis", "Reliable rank tracking"],
    cons: ["Interface can feel dense for beginners", "Extra users cost extra"],
    features: ["Keyword Magic Tool", "Site Audit", "Position Tracking", "Backlink Analytics"],
    badges: ["trending"],
    icon: "🔍",
    gradient: "from-orange-400 to-amber-500",
    affiliateLinkId: "lnk_semrush",
    featured: true,
    bestFor: "Content sites and agencies serious about organic growth",
  },
  {
    id: "prd_kinsta",
    slug: "kinsta-managed-hosting",
    name: "Kinsta Managed Hosting",
    vendor: "Kinsta",
    category: "hosting",
    tagline: "Premium managed WordPress hosting on Google Cloud's fastest tier.",
    description:
      "Kinsta runs every site on Google Cloud C2 machines with Cloudflare Enterprise in front. You get automatic daily backups, staging environments, and support engineers who actually debug your site.",
    price: { amount: 35, currency: "USD", period: "mo" },
    commission: { type: "flat", value: 500, cookieDays: 60, estimatedPayout: 500 },
    rating: 4.8,
    reviewCount: 3420,
    pros: ["Blazing performance out of the box", "Up to $500 one-time + 10% recurring commission", "Free migrations"],
    cons: ["Visit-based pricing tiers", "No email hosting"],
    features: ["Google Cloud C2", "Cloudflare Enterprise CDN", "Staging environments", "24/7 expert support"],
    badges: ["editors-choice", "high-ticket"],
    icon: "⚡",
    gradient: "from-violet-500 to-indigo-600",
    affiliateLinkId: "lnk_kinsta",
    featured: true,
    bestFor: "WordPress sites that outgrew shared hosting",
  },
  {
    id: "prd_jasper",
    slug: "jasper-ai",
    name: "Jasper AI",
    vendor: "Jasper",
    category: "ai-tools",
    tagline: "AI marketing copilot with brand voice, campaigns, and team workflows.",
    description:
      "Jasper wraps large language models in a marketing-specific workflow: brand voice memory, campaign templates, and an editor built for long-form. Teams use it to draft blog posts, ads, and email sequences at scale.",
    price: { amount: 59, currency: "USD", period: "mo", originalAmount: 69 },
    commission: { type: "recurring", value: 30, cookieDays: 30, estimatedPayout: 212 },
    rating: 4.4,
    reviewCount: 2980,
    pros: ["Brand voice stays consistent across writers", "50+ marketing templates", "Chrome extension works everywhere"],
    cons: ["Output still needs a human editor", "Seat pricing adds up"],
    features: ["Brand Voice", "Campaigns", "Jasper Chat", "Browser extension"],
    badges: ["trending", "new"],
    icon: "✨",
    gradient: "from-fuchsia-500 to-pink-600",
    affiliateLinkId: "lnk_jasper",
    featured: true,
    bestFor: "Content teams publishing daily",
  },
  {
    id: "prd_clickfunnels",
    slug: "clickfunnels-2",
    name: "ClickFunnels 2.0",
    vendor: "ClickFunnels",
    category: "marketing",
    tagline: "Funnel builder, courses, and email in one high-converting stack.",
    description:
      "ClickFunnels 2.0 rebuilt the platform from scratch: a visual funnel editor, built-in courses and memberships, a CRM, and one-click upsells. It is opinionated about conversion and that is exactly why people pay for it.",
    price: { amount: 297, currency: "USD", period: "mo" },
    commission: { type: "recurring", value: 30, cookieDays: 45, estimatedPayout: 1069 },
    rating: 4.3,
    reviewCount: 4110,
    pros: ["Highest lifetime commission in this list", "Everything a funnel needs in one tool", "Massive template library"],
    cons: ["Expensive for beginners", "Page load speeds lag dedicated builders"],
    features: ["Funnel builder", "Courses & memberships", "Email workflows", "One-click upsells"],
    badges: ["high-ticket", "best-value"],
    icon: "🚀",
    gradient: "from-sky-500 to-blue-600",
    affiliateLinkId: "lnk_clickfunnels",
    featured: true,
    bestFor: "Info-product sellers and coaches",
  },
  {
    id: "prd_teachable",
    slug: "teachable-pro",
    name: "Teachable Pro",
    vendor: "Teachable",
    category: "education",
    tagline: "Launch and sell online courses, coaching, and digital downloads.",
    description:
      "Teachable is the fastest route from expertise to a paid course. Pro unlocks zero transaction fees, affiliate marketing for your own students, and graded quizzes.",
    price: { amount: 159, currency: "USD", period: "mo" },
    commission: { type: "recurring", value: 30, cookieDays: 90, estimatedPayout: 572 },
    rating: 4.2,
    reviewCount: 2140,
    pros: ["Simple, fast course builder", "Built-in payments and tax handling", "Coaching product type"],
    cons: ["Limited design customisation", "Community features are basic"],
    features: ["Course builder", "Coaching", "Certificates", "Built-in affiliates"],
    badges: ["best-value"],
    icon: "🎓",
    gradient: "from-emerald-500 to-teal-600",
    affiliateLinkId: "lnk_teachable",
    featured: false,
    bestFor: "Creators launching their first course",
  },
  {
    id: "prd_shopify",
    slug: "shopify-plus",
    name: "Shopify Plus",
    vendor: "Shopify",
    category: "finance",
    tagline: "Enterprise-grade commerce for brands doing serious volume.",
    description:
      "Shopify Plus is the platform behind thousands of eight-figure DTC brands. Checkout extensibility, B2B storefronts, automation with Flow, and dedicated launch engineers.",
    price: { amount: 2300, currency: "USD", period: "mo" },
    commission: { type: "flat", value: 500, cookieDays: 30, estimatedPayout: 500 },
    rating: 4.7,
    reviewCount: 9860,
    pros: ["Checkout converts better than anything self-hosted", "Flow automation is exceptional", "Unlimited staff accounts"],
    cons: ["Minimum $2,300/mo commitment", "App costs stack up"],
    features: ["Checkout extensibility", "Shopify Flow", "B2B storefronts", "Launch engineer"],
    badges: ["high-ticket"],
    icon: "🛍️",
    gradient: "from-lime-500 to-green-600",
    affiliateLinkId: "lnk_shopify",
    featured: true,
    bestFor: "DTC brands past $1M/year",
  },
  {
    id: "prd_notion",
    slug: "notion-business",
    name: "Notion Business",
    vendor: "Notion",
    category: "productivity",
    tagline: "Docs, wikis, projects, and AI in one connected workspace.",
    description:
      "Notion's Business plan adds SAML SSO, private teamspaces, and Notion AI across the workspace. It is the operating system for most modern remote teams.",
    price: { amount: 20, currency: "USD", period: "mo" },
    commission: { type: "percent", value: 50, cookieDays: 90, estimatedPayout: 120 },
    rating: 4.7,
    reviewCount: 15400,
    pros: ["Flexible enough for any workflow", "Generous 50% first-year commission", "Best template ecosystem"],
    cons: ["Can become messy without structure", "Offline mode is limited"],
    features: ["Notion AI", "Teamspaces", "SAML SSO", "Automations"],
    badges: ["best-value"],
    icon: "📓",
    gradient: "from-slate-600 to-zinc-800",
    affiliateLinkId: "lnk_notion",
    featured: false,
    bestFor: "Remote teams standardising on one workspace",
  },
];

/**
 * Generate ~90 days of realistic click history. Deterministic so charts and
 * KPIs look the same on every fresh load.
 */
export function generateSeedClicks(now = new Date()): ClickEvent[] {
  const rand = mulberry32(20260101);
  const events: ClickEvent[] = [];
  const activeLinks = SEED_LINKS.filter((l) => l.active);
  const sources: ClickSource[] = ["hub", "review", "directory", "direct"];
  const devices: DeviceType[] = ["mobile", "desktop", "tablet"];

  // Popularity weights so the leaderboard is interesting.
  const weight: Record<string, number> = {
    lnk_hubspot: 1.2,
    lnk_semrush: 1.6,
    lnk_kinsta: 1.4,
    lnk_jasper: 1.9,
    lnk_clickfunnels: 0.9,
    lnk_teachable: 0.8,
    lnk_shopify: 0.5,
    lnk_notion: 2.1,
    lnk_amazon_desk: 1.0,
  };
  const payoutByLink: Record<string, number> = Object.fromEntries(
    SEED_PRODUCTS.map((p) => [p.affiliateLinkId, p.commission.estimatedPayout]),
  );
  payoutByLink.lnk_amazon_desk = 18;

  for (let d = 89; d >= 0; d--) {
    const day = daysAgo(d, now);
    const weekday = day.getUTCDay();
    // Weekends dip, plus a gentle upward trend over the quarter.
    const seasonal = (weekday === 0 || weekday === 6 ? 0.65 : 1) * (1 + (89 - d) / 140);
    for (const link of activeLinks) {
      const expected = 4 * (weight[link.id] ?? 1) * seasonal;
      const count = Math.max(0, Math.round(expected + (rand() - 0.5) * expected));
      for (let i = 0; i < count; i++) {
        const ts = new Date(day);
        ts.setUTCHours(Math.floor(rand() * 24), Math.floor(rand() * 60), Math.floor(rand() * 60));
        const converted = rand() < 0.031;
        events.push({
          id: `clk_${d}_${link.id}_${i}`,
          linkId: link.id,
          timestamp: ts.toISOString(),
          source: sources[Math.floor(rand() * sources.length)],
          device: devices[Math.floor(rand() * devices.length)],
          converted,
          payout: converted ? payoutByLink[link.id] ?? 25 : 0,
        });
      }
    }
  }
  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
