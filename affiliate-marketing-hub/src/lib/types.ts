/**
 * Domain types for the Affiliate Marketing & Content Hub.
 *
 * Every entity is a plain JSON-serialisable object so the persistence layer
 * (localStorage today, Supabase / Vercel KV tomorrow) can store it unchanged.
 */

export type AffiliateNetwork =
  | "amazon"
  | "shareasale"
  | "impact"
  | "cj"
  | "partnerstack"
  | "direct";

export type ProductCategory =
  | "ai-tools"
  | "marketing"
  | "hosting"
  | "finance"
  | "education"
  | "productivity"
  | "design";

export type ProductBadge =
  | "editors-choice"
  | "best-value"
  | "trending"
  | "high-ticket"
  | "new";

export type BillingPeriod = "mo" | "yr" | "once";

export interface ProductPrice {
  amount: number;
  currency: "USD";
  period: BillingPeriod;
  /** Strike-through price when a discount is active. */
  originalAmount?: number;
}

export interface Commission {
  type: "percent" | "flat" | "recurring";
  /** Percent (0-100) for percent/recurring, USD for flat. */
  value: number;
  cookieDays: number;
  /** Estimated USD payout per conversion – used by the analytics dashboard. */
  estimatedPayout: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  category: ProductCategory;
  tagline: string;
  description: string;
  price: ProductPrice;
  commission: Commission;
  /** 0 – 5 */
  rating: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
  features: string[];
  badges: ProductBadge[];
  /** Emoji / short glyph used as a lightweight visual (no image hosting needed). */
  icon: string;
  /** Tailwind gradient classes for the card header, e.g. "from-violet-500 to-indigo-600". */
  gradient: string;
  /** References AffiliateLink.id */
  affiliateLinkId: string;
  featured: boolean;
  bestFor: string;
}

export interface AffiliateLink {
  id: string;
  /** Clean internal path segment: /go/<slug> */
  slug: string;
  name: string;
  /**
   * Raw affiliate destination. May contain the literal token {{trackingId}}
   * which is replaced at redirect time with Settings.trackingId.
   */
  destinationUrl: string;
  network: AffiliateNetwork;
  productId?: string;
  tags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ClickSource = "hub" | "review" | "directory" | "direct" | "admin-test";
export type DeviceType = "mobile" | "desktop" | "tablet";

export interface ClickEvent {
  id: string;
  linkId: string;
  /** ISO timestamp */
  timestamp: string;
  source: ClickSource;
  device: DeviceType;
  referrer?: string;
  converted: boolean;
  /** USD payout attributed to this click when converted. */
  payout: number;
}

export interface DailyStat {
  /** YYYY-MM-DD */
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface LinkStat {
  linkId: string;
  slug: string;
  name: string;
  network: AffiliateNetwork;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  /** Earnings per click */
  epc: number;
}

export interface AnalyticsSummary {
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  epc: number;
  /** Percent change versus the previous period of the same length. */
  deltas: {
    clicks: number;
    conversions: number;
    revenue: number;
  };
}

export type ArticleSectionType =
  | "intro"
  | "product"
  | "comparison"
  | "buying-guide"
  | "faq"
  | "verdict";

export interface ArticleSection {
  id: string;
  type: ArticleSectionType;
  heading: string;
  /** Markdown-ish paragraphs (plain text, one paragraph per array item). */
  paragraphs: string[];
  /** Present on "product" sections. */
  productId?: string;
  /** Present on "faq" sections. */
  faq?: { question: string; answer: string }[];
  /** Present on "comparison" sections. */
  comparisonRows?: { label: string; values: string[] }[];
}

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keyword: string;
  /** Secondary keywords woven into the copy. */
  secondaryKeywords: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  sections: ArticleSection[];
  productIds: string[];
  /** Tracking ID captured at generation time; CTAs re-resolve at render time. */
  trackingIdSnapshot: string;
  readingMinutes: number;
  wordCount: number;
}

export interface Settings {
  siteName: string;
  siteTagline: string;
  /** e.g. "yoursite-20" (Amazon) or any partner tracking id. */
  trackingId: string;
  defaultNetwork: AffiliateNetwork;
  /** Custom FTC disclosure copy; {{siteName}} is interpolated. */
  disclosureText: string;
  authorName: string;
  /** Number of years appended to generated titles, e.g. 2026. */
  contentYear: number;
}

export type DateRange = 7 | 30 | 90;
