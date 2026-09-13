import { KEYS, storage } from "../storage";
import type { Settings } from "../types";
import { DEFAULT_SETTINGS } from "../data/seed";

export const settingsApi = {
  key: KEYS.settings,
  async get(): Promise<Settings> {
    const stored = await storage.get<Partial<Settings>>(KEYS.settings);
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  },
  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await settingsApi.get();
    const next = { ...current, ...patch };
    await storage.set(KEYS.settings, next);
    return next;
  },
  async reset(): Promise<Settings> {
    await storage.remove(KEYS.settings);
    return DEFAULT_SETTINGS;
  },
  subscribe(listener: () => void) {
    return storage.subscribe(KEYS.settings, listener);
  },
};

/** Interpolate {{siteName}} etc. into the disclosure copy. */
export function renderDisclosure(settings: Settings): string {
  return settings.disclosureText.replace(/\{\{\s*siteName\s*\}\}/g, settings.siteName);
}
