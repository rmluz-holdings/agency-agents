"use client";

import { Info, ShieldCheck } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

type Variant = "banner" | "inline" | "footer" | "compact";

interface FtcDisclosureProps {
  /**
   * banner  – prominent box placed above content (articles, product grids)
   * inline  – short sentence under a CTA button
   * footer  – muted paragraph for the site footer
   * compact – single line with an icon, for cards/tables
   */
  variant?: Variant;
  className?: string;
  /** Override the copy (defaults to Settings.disclosureText). */
  text?: string;
}

/**
 * FTC-compliant affiliate disclosure. The copy is dynamic (editable in the
 * admin settings) and interpolates the site name. Per 16 CFR Part 255 the
 * disclosure must be clear, conspicuous, and placed *before* affiliate links,
 * so use the `banner` variant at the top of any content that contains CTAs.
 */
export function FtcDisclosure({ variant = "banner", className, text }: FtcDisclosureProps) {
  const { disclosure } = useSettings();
  const copy = text ?? disclosure;

  if (variant === "inline") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)} role="note">
        Affiliate link – we may earn a commission.
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)} role="note">
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{copy}</span>
      </p>
    );
  }

  if (variant === "footer") {
    return (
      <p className={cn("text-xs leading-relaxed text-muted-foreground", className)} role="note">
        <strong className="font-semibold text-foreground">Affiliate Disclosure:</strong> {copy}
      </p>
    );
  }

  return (
    <aside
      role="note"
      aria-label="Affiliate disclosure"
      className={cn(
        "flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100",
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
      <div>
        <p className="font-semibold">Affiliate Disclosure</p>
        <p className="mt-0.5 leading-relaxed opacity-90">{copy}</p>
      </div>
    </aside>
  );
}
