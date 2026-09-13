"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Subscribable {
  subscribe(listener: () => void): () => void;
}

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Run an async loader against the mock API and re-run it whenever any of the
 * given collections change (same tab or another tab).
 *
 * Pass `deps` for values captured by the loader (e.g. a date range).
 */
export function useStoreQuery<T>(
  loader: () => Promise<T>,
  sources: Subscribable[],
  deps: React.DependencyList = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const versionRef = useRef(0);

  const run = useCallback(async () => {
    const version = ++versionRef.current;
    try {
      const result = await loaderRef.current();
      if (version === versionRef.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (version === versionRef.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (version === versionRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void run();
    const unsubs = sources.map((s) => s.subscribe(() => void run()));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  return { data, loading, error, refetch: run };
}

/** True once the component has mounted on the client (avoids hydration mismatch with localStorage). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
