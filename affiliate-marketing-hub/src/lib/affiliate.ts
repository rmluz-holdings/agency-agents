import type { AffiliateNetwork } from "./types";

/**
 * Query-string parameter each network uses for the publisher tracking ID.
 * Extend this map when onboarding a new program.
 */
export const NETWORK_TRACKING_PARAM: Record<AffiliateNetwork, string> = {
  amazon: "tag",
  shareasale: "afftrack",
  impact: "subId1",
  cj: "sid",
  partnerstack: "ps_xid",
  direct: "ref",
};

export const NETWORK_LABEL: Record<AffiliateNetwork, string> = {
  amazon: "Amazon Associates",
  shareasale: "ShareASale",
  impact: "Impact",
  cj: "CJ Affiliate",
  partnerstack: "PartnerStack",
  direct: "Direct program",
};

export const TRACKING_TOKEN = "{{trackingId}}";

/**
 * Build the final outbound URL by injecting the publisher tracking ID.
 *
 * 1. If the destination contains `{{trackingId}}`, it is replaced in place.
 * 2. Otherwise the network-specific parameter is appended (never overwriting
 *    a value the user already set by hand).
 */
export function buildAffiliateUrl(
  destinationUrl: string,
  trackingId: string,
  network: AffiliateNetwork,
): string {
  const cleanId = trackingId.trim();
  let url = destinationUrl.trim();

  if (url.includes(TRACKING_TOKEN)) {
    return url.split(TRACKING_TOKEN).join(encodeURIComponent(cleanId));
  }

  try {
    const parsed = new URL(url);
    const param = NETWORK_TRACKING_PARAM[network];
    if (cleanId && !parsed.searchParams.has(param)) {
      parsed.searchParams.set(param, cleanId);
    }
    url = parsed.toString();
  } catch {
    /* leave malformed URLs untouched – validation happens in the UI */
  }
  return url;
}

/** Clean internal path for a cloaked link. */
export function cloakedPath(slug: string): string {
  return `/go/${slug}`;
}

/** Absolute cloaked URL when window is available; falls back to the path. */
export function cloakedUrl(slug: string): string {
  if (typeof window === "undefined") return cloakedPath(slug);
  return `${window.location.origin}${cloakedPath(slug)}`;
}

/**
 * Attributes every outbound affiliate anchor must carry.
 * `sponsored` is what Google asks for on paid/affiliate links.
 */
export const OUTBOUND_REL = "sponsored nofollow noopener noreferrer";
