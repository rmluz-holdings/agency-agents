import { KEYS, storage, type StorageKey } from "../storage";

/**
 * Generic collection repository over the storage adapter.
 * Seeds itself on first read so the app is never empty.
 */
export function createCollection<T extends { id: string }>(
  key: StorageKey,
  seed: () => T[],
) {
  let seeding: Promise<T[]> | null = null;

  async function list(): Promise<T[]> {
    const existing = await storage.get<T[]>(key);
    if (existing) return existing;
    if (!seeding) {
      seeding = (async () => {
        const data = seed();
        await storage.set(key, data);
        return data;
      })();
    }
    return seeding;
  }

  async function get(id: string): Promise<T | null> {
    return (await list()).find((item) => item.id === id) ?? null;
  }

  async function replaceAll(items: T[]): Promise<T[]> {
    await storage.set(key, items);
    return items;
  }

  async function create(item: T): Promise<T> {
    const items = await list();
    if (items.some((i) => i.id === item.id)) {
      throw new Error(`Duplicate id "${item.id}" in ${key}`);
    }
    await replaceAll([...items, item]);
    return item;
  }

  async function update(id: string, patch: Partial<T>): Promise<T> {
    const items = await list();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`${key}: no item with id "${id}"`);
    const next = { ...items[idx], ...patch, id } as T;
    const copy = items.slice();
    copy[idx] = next;
    await replaceAll(copy);
    return next;
  }

  async function remove(id: string): Promise<void> {
    const items = await list();
    await replaceAll(items.filter((i) => i.id !== id));
  }

  async function reset(): Promise<T[]> {
    seeding = null;
    await storage.remove(key);
    return list();
  }

  function subscribe(listener: () => void): () => void {
    return storage.subscribe(key, listener);
  }

  return { key, list, get, create, update, remove, replaceAll, reset, subscribe };
}

export { KEYS };
