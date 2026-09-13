"use client";

import { useSettings } from "@/hooks/useSettings";

/**
 * Tiny client island so the server-rendered hero can show the editable
 * `Settings.siteTagline` (which lives in localStorage) without turning the
 * whole page into a client component. Falls back to the seed default on SSR.
 */
export function HeroTagline({ className }: { className?: string }) {
  const { settings } = useSettings();
  return <p className={className}>{settings.siteTagline}</p>;
}
