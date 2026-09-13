"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cloakedPath, OUTBOUND_REL } from "@/lib/affiliate";
import type { ClickSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FtcDisclosure } from "./FtcDisclosure";

interface AffiliateCTAProps {
  /** AffiliateLink.slug – the CTA always routes through the cloaked /go/<slug> path. */
  linkSlug: string;
  /** Where the click originated; stored on the ClickEvent for attribution. */
  source: ClickSource;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Stretch to the container width. */
  block?: boolean;
  /** Show the one-line "affiliate link" note under the button. */
  withDisclosure?: boolean;
  className?: string;
  variant?: "cta" | "primary" | "secondary";
}

const SIZE: Record<NonNullable<AffiliateCTAProps["size"]>, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

const VARIANT: Record<NonNullable<AffiliateCTAProps["variant"]>, string> = {
  cta: "btn-cta",
  primary: "btn-primary",
  secondary: "btn-secondary",
};

/**
 * The one and only way to render an outbound affiliate button.
 *
 * - Always points at the cloaked `/go/<slug>` path, so the raw partner URL and
 *   tracking ID are injected server-side of the user (in the redirect page),
 *   never hard-coded in content.
 * - Carries `rel="sponsored nofollow"` per Google's affiliate link guidance.
 * - Passes `src` so the analytics dashboard can attribute the click.
 */
export function AffiliateCTA({
  linkSlug,
  source,
  children = "Get the deal",
  size = "md",
  block = false,
  withDisclosure = false,
  className,
  variant = "cta",
}: AffiliateCTAProps) {
  const href = `${cloakedPath(linkSlug)}?src=${encodeURIComponent(source)}`;
  return (
    <div className={cn(block && "w-full", withDisclosure && "space-y-1.5")}>
      <Link
        href={href}
        rel={OUTBOUND_REL}
        target="_blank"
        prefetch={false}
        data-affiliate-link={linkSlug}
        className={cn(VARIANT[variant], SIZE[size], block && "w-full", className)}
      >
        <span>{children}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
      </Link>
      {withDisclosure && <FtcDisclosure variant="inline" className={block ? "text-center" : undefined} />}
    </div>
  );
}
