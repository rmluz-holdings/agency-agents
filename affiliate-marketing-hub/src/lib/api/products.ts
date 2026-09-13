import { KEYS } from "../storage";
import type { Product, ProductCategory } from "../types";
import { SEED_PRODUCTS } from "../data/seed";
import { createCollection } from "./collection";

const collection = createCollection<Product>(KEYS.products, () => SEED_PRODUCTS.map((p) => ({ ...p })));

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  "ai-tools": "AI Tools",
  marketing: "Marketing",
  hosting: "Hosting",
  finance: "Commerce & Finance",
  education: "Education",
  productivity: "Productivity",
  design: "Design",
};

export const productsApi = {
  ...collection,
  async featured(): Promise<Product[]> {
    return (await collection.list()).filter((p) => p.featured);
  },
  async bySlug(slug: string): Promise<Product | null> {
    return (await collection.list()).find((p) => p.slug === slug) ?? null;
  },
  async byCategory(category: ProductCategory): Promise<Product[]> {
    return (await collection.list()).filter((p) => p.category === category);
  },
  /** Simple keyword relevance used by the content generator. */
  async search(query: string, limit = 5): Promise<Product[]> {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const all = await collection.list();
    const scored = all.map((p) => {
      const haystack = [p.name, p.vendor, p.category, p.tagline, p.description, p.bestFor, ...p.features]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
      return { p, score: score + p.rating / 10 + (p.featured ? 0.5 : 0) };
    });
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.p);
  },
};
