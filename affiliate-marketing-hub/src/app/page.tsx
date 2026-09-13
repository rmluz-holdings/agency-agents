import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { FtcDisclosure } from "@/components/FtcDisclosure";
import { HeroTagline } from "@/components/site/HeroTagline";
import { NewsletterCapture } from "@/components/site/NewsletterCapture";
import { ProductGrid } from "@/components/site/ProductGrid";
import { TopPicks } from "@/components/site/TopPicks";

export const metadata: Metadata = {
  title: "Hand-tested tools for people who build online businesses",
  description:
    "Our ranked picks of the high-ticket marketing, hosting, AI and productivity tools we'd actually pay for – with honest pros, cons and clearly disclosed affiliate links.",
};

const TRUST = [
  { icon: ShieldCheck, label: "Independently tested" },
  { icon: BadgeCheck, label: "Updated for 2026" },
  { icon: Users, label: "Trusted by builders" },
] as const;

const STEPS = [
  {
    icon: FlaskConical,
    title: "We pay and use it",
    body: "Every tool on this site is one we've run in a real project for at least 30 days – on our own card, not a vendor trial.",
  },
  {
    icon: ClipboardCheck,
    title: "We score what matters",
    body: "Onboarding, real-world performance, support quality and total cost at scale. Commission rates never influence a rating.",
  },
  {
    icon: RefreshCw,
    title: "We re-check quarterly",
    body: "Pricing, features and partner terms change. Reviews get a fresh pass every quarter and the date is always shown.",
  },
] as const;

function Container({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-brand-soft via-background to-background">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgb(99_102_241_/_0.18),transparent)]"
          aria-hidden
        />
        <Container className="relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-card px-3.5 py-1.5 text-xs font-semibold text-brand shadow-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Ranked picks, refreshed quarterly
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              The high-ticket tool stack we&apos;d{" "}
              <span className="bg-gradient-to-r from-brand via-indigo-500 to-violet-500 bg-clip-text text-transparent dark:from-indigo-300 dark:via-brand dark:to-violet-400">
                actually pay for
              </span>
            </h1>
            <HeroTagline className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl" />
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#top-picks" className="btn-cta w-full px-7 py-3.5 text-base sm:w-auto">
                See our top picks
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <Link href="/tools" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                Browse all tools
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3" aria-label="Why trust us">
              {TRUST.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className="h-4 w-4 text-brand" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </div>

      {/* Disclosure – must precede any affiliate CTA */}
      <Container className="pt-8">
        <FtcDisclosure variant="banner" />
      </Container>

      {/* Top picks */}
      <Container id="top-picks" className="scroll-mt-24 pt-12">
        <SectionHeading
          eyebrow="Top picks"
          title="Our highest-rated tools right now"
          body="Ranked by our testing score, then by the number of verified reviews. The #1 pick is the one we'd recommend to a friend without hesitation."
        />
        <div className="mt-8">
          <TopPicks limit={5} source="hub" />
        </div>
      </Container>

      {/* Directory preview */}
      <Container className="pt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Directory"
            title="Recommended Tools & Resources"
            body="Filter by category or search for the exact feature you need."
          />
          <Link
            href="/tools"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            View all tools
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8">
          <ProductGrid showFilters limit={6} source="hub" />
        </div>
        <div className="mt-8 text-center">
          <Link href="/tools" className="btn-secondary">
            View all tools
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Container>

      {/* How we review */}
      <Container id="how-we-review" className="scroll-mt-24 pt-20">
        <SectionHeading
          eyebrow="How we review"
          title="Opinionated, transparent, and never pay-to-play"
          body="Affiliate commissions keep the lights on, but they don't decide who wins. Here's the process every tool goes through."
          center
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="card relative p-6">
              <span className="absolute right-5 top-5 text-4xl font-black text-border" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </Container>

      {/* Newsletter */}
      <Container className="pt-20">
        <NewsletterCapture />
      </Container>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  center = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>}
    </div>
  );
}
