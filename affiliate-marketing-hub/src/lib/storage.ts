/**
 * Persistence adapter.
 *
 * The rest of the app only ever talks to `StorageAdapter`. Swap the default
 * export for a Supabase / Vercel KV / REST implementation and nothing else
 * changes. The default adapter uses `localStorage` in the browser and an
 * in-memory map during SSR / tests.
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  /** Subscribe to changes of a key (same tab + cross-tab). Returns unsubscribe. */
  subscribe(key: string, listener: () => void): () => void;
}

const NAMESPACE = "amh:v1:";

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`[storage] listener for "${key}" threw`, err);
    }
  });
}

const memory = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readRaw(key: string): string | null {
  const fullKey = NAMESPACE + key;
  if (hasLocalStorage()) {
    try {
      return window.localStorage.getItem(fullKey);
    } catch {
      /* private mode / quota – fall through to memory */
    }
  }
  return memory.get(fullKey) ?? null;
}

function writeRaw(key: string, value: string | null) {
  const fullKey = NAMESPACE + key;
  if (value === null) {
    memory.delete(fullKey);
  } else {
    memory.set(fullKey, value);
  }
  if (hasLocalStorage()) {
    try {
      if (value === null) window.localStorage.removeItem(fullKey);
      else window.localStorage.setItem(fullKey, value);
    } catch (err) {
      console.warn("[storage] localStorage write failed, using memory only", err);
    }
  }
}

let crossTabBound = false;
function bindCrossTab() {
  if (crossTabBound || typeof window === "undefined") return;
  crossTabBound = true;
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith(NAMESPACE)) {
      emit(e.key.slice(NAMESPACE.length));
    }
  });
}

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    const raw = readRaw(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[storage] corrupt JSON for "${key}" – discarding`);
      writeRaw(key, null);
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    writeRaw(key, JSON.stringify(value));
    emit(key);
  },
  async remove(key: string): Promise<void> {
    writeRaw(key, null);
    emit(key);
  },
  subscribe(key: string, listener: Listener): () => void {
    bindCrossTab();
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(listener);
    return () => {
      listeners.get(key)?.delete(listener);
    };
  },
};

/**
 * Example of what a remote adapter looks like. Kept as documentation so the
 * migration path is obvious:
 *
 * export const supabaseAdapter: StorageAdapter = {
 *   get: async (key) => (await supabase.from("kv").select("value").eq("key", key).single()).data?.value ?? null,
 *   set: async (key, value) => { await supabase.from("kv").upsert({ key, value }); emit(key); },
 *   remove: async (key) => { await supabase.from("kv").delete().eq("key", key); emit(key); },
 *   subscribe: (key, fn) => { const ch = supabase.channel(key).on(...).subscribe(); return () => ch.unsubscribe(); },
 * };
 */

export const storage: StorageAdapter = localStorageAdapter;

/** Storage keys used by the mock API. */
export const KEYS = {
  products: "products",
  links: "links",
  clicks: "clicks",
  articles: "articles",
  settings: "settings",
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];
