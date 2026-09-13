import { KEYS } from "../storage";
import type { Article } from "../types";
import { createCollection } from "./collection";

const collection = createCollection<Article>(KEYS.articles, () => []);

export const articlesApi = {
  ...collection,
  async bySlug(slug: string): Promise<Article | null> {
    return (await collection.list()).find((a) => a.slug === slug) ?? null;
  },
  async published(): Promise<Article[]> {
    return (await collection.list())
      .filter((a) => a.status === "published")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async isSlugAvailable(slug: string, ignoreId?: string): Promise<boolean> {
    const all = await collection.list();
    return !all.some((a) => a.slug === slug && a.id !== ignoreId);
  },
};
