import type { LucideIcon } from "lucide-react";
import { BarChart3, Link2, PenLine, SlidersHorizontal } from "lucide-react";

/** The four panels of the admin dashboard, driven by `?tab=`. */
export type AdminTab = "overview" | "links" | "content" | "settings";

export interface AdminTabDef {
  id: AdminTab;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const ADMIN_TABS: AdminTabDef[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Clicks, conversions and revenue across your links.",
    icon: BarChart3,
    href: "/admin/dashboard?tab=overview",
  },
  {
    id: "links",
    label: "Links",
    description: "Cloak, shorten and track every affiliate destination.",
    icon: Link2,
    href: "/admin/dashboard?tab=links",
  },
  {
    id: "content",
    label: "Content",
    description: "Generate SEO review articles with embedded CTAs.",
    icon: PenLine,
    href: "/admin/dashboard?tab=content",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Tracking ID, disclosure copy and demo data.",
    icon: SlidersHorizontal,
    href: "/admin/dashboard?tab=settings",
  },
];

export const DEFAULT_TAB: AdminTab = "overview";

/** Narrow an untrusted `?tab=` value to a known tab. */
export function parseTab(value: string | null | undefined): AdminTab {
  return ADMIN_TABS.some((t) => t.id === value) ? (value as AdminTab) : DEFAULT_TAB;
}

export function tabDef(tab: AdminTab): AdminTabDef {
  return ADMIN_TABS.find((t) => t.id === tab) ?? ADMIN_TABS[0];
}
