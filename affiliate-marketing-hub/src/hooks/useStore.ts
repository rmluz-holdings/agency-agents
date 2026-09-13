"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

interface Subscribable {
  subscribe(listener: () => void): () => void;
}

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface Snapshot<T> {
  data: T | null;
  error: Error | null;
  /** Identity token of the deps the snapshot was loaded for. */
  loadedFor: object | null;
}

/**
 * Run an async loader against the mock API and re-run it whenever any of the
 * given collections change (same tab or another tab).
 *
 * Pass `deps` for values captured by the loader (e.g. a date range). A deps
 * change re-enters the loading state; a store change refreshes silently so the
 * UI never flashes skeletons on live updates.
 */
export function useStoreQuery<T>(
  loader: () => Promise<T>,
  sources: Subscribable[],
  deps: React.DependencyList = [],
): QueryState<T> {
  // A fresh token per deps change lets `loading` be derived instead of set in an effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depsToken = useMemo(() => ({}), deps);
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({ data: null, error: null, loadedFor: null });
  const loaderRef = useRef(loader);
  const versionRef = useRef(0);

  // Keep the latest loader without re-subscribing (effects run in declaration order).
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async (token: object) => {
    const version = ++versionRef.current;
    try {
      const result = await loaderRef.current();
      if (version === versionRef.current) setSnapshot({ data: result, error: null, loadedFor: token });
    } catch (err) {
      if (version === versionRef.current) {
        setSnapshot((prev) => ({
          data: prev.data,
          error: err instanceof Error ? err : new Error(String(err)),
          loadedFor: token,
        }));
      }
    }
  }, []);

  useEffect(() => {
    void run(depsToken);
    const unsubs = sources.map((s) => s.subscribe(() => void run(depsToken)));
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, depsToken]);

  return {
    data: snapshot.data,
    loading: snapshot.loadedFor !== depsToken,
    error: snapshot.error,
    refetch: () => run(depsToken),
  };
}

const noopSubscribe = () => () => {};

/** True once the component has mounted on the client (avoids hydration mismatch with localStorage). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
