/**
 * Mock API surface.
 *
 * Every function is async and returns plain objects, so the whole module can
 * be replaced with `fetch()` calls to Next.js route handlers backed by
 * Supabase or Vercel KV without touching any component.
 */
import { analyticsApi } from "./analytics";
import { articlesApi } from "./articles";
import { linksApi } from "./links";
import { productsApi } from "./products";
import { settingsApi } from "./settings";

export const api = {
  products: productsApi,
  links: linksApi,
  analytics: analyticsApi,
  articles: articlesApi,
  settings: settingsApi,
  /** Wipe everything and re-seed. */
  async resetAll() {
    await Promise.all([
      productsApi.reset(),
      linksApi.reset(),
      analyticsApi.reset(),
      articlesApi.reset(),
      settingsApi.reset(),
    ]);
  },
};

export { CATEGORY_LABEL } from "./products";
export { renderDisclosure } from "./settings";
export type { LinkInput } from "./links";
