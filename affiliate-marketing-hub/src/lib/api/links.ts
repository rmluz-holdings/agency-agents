import { KEYS } from "../storage";
import type { AffiliateLink } from "../types";
import { SEED_LINKS } from "../data/seed";
import { slugify, uid } from "../utils";
import { createCollection } from "./collection";

const collection = createCollection<AffiliateLink>(KEYS.links, () => SEED_LINKS.map((l) => ({ ...l })));

const RESERVED_SLUGS = new Set(["admin", "go", "api", "reviews", "tools", "_next"]);

export type LinkInput = Pick<AffiliateLink, "name" | "destinationUrl" | "network"> &
  Partial<Pick<AffiliateLink, "slug" | "productId" | "tags" | "active">>;

export const linksApi = {
  ...collection,
  async bySlug(slug: string): Promise<AffiliateLink | null> {
    return (await collection.list()).find((l) => l.slug === slug) ?? null;
  },
  async isSlugAvailable(slug: string, ignoreId?: string): Promise<boolean> {
    if (!slug || RESERVED_SLUGS.has(slug)) return false;
    const all = await collection.list();
    return !all.some((l) => l.slug === slug && l.id !== ignoreId);
  },
  /** Suggest a unique slug from a name. */
  async suggestSlug(name: string): Promise<string> {
    const base = slugify(name) || "link";
    let candidate = base;
    let n = 2;
    while (!(await linksApi.isSlugAvailable(candidate))) {
      candidate = `${base}-${n++}`;
    }
    return candidate;
  },
  async createLink(input: LinkInput): Promise<AffiliateLink> {
    const slug = input.slug ? slugify(input.slug) : await linksApi.suggestSlug(input.name);
    if (!(await linksApi.isSlugAvailable(slug))) {
      throw new Error(`Slug "/go/${slug}" is already taken or reserved.`);
    }
    const now = new Date().toISOString();
    return collection.create({
      id: uid("lnk"),
      slug,
      name: input.name.trim(),
      destinationUrl: input.destinationUrl.trim(),
      network: input.network,
      productId: input.productId,
      tags: input.tags ?? [],
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
  async updateLink(id: string, patch: Partial<LinkInput>): Promise<AffiliateLink> {
    if (patch.slug !== undefined) {
      const slug = slugify(patch.slug);
      if (!(await linksApi.isSlugAvailable(slug, id))) {
        throw new Error(`Slug "/go/${slug}" is already taken or reserved.`);
      }
      patch = { ...patch, slug };
    }
    return collection.update(id, { ...patch, updatedAt: new Date().toISOString() });
  },
};
