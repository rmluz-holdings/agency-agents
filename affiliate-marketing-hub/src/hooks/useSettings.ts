"use client";

import { api, renderDisclosure } from "@/lib/api";
import type { Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/data/seed";
import { useStoreQuery } from "./useStore";

/**
 * Settings with a synchronous default so SSR and first paint never flash
 * empty values. `disclosure` is the fully-interpolated FTC copy.
 */
export function useSettings(): {
  settings: Settings;
  disclosure: string;
  loading: boolean;
  update: (patch: Partial<Settings>) => Promise<Settings>;
} {
  const { data, loading } = useStoreQuery(() => api.settings.get(), [api.settings]);
  const settings = data ?? DEFAULT_SETTINGS;
  return {
    settings,
    disclosure: renderDisclosure(settings),
    loading,
    update: (patch) => api.settings.update(patch),
  };
}
