"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * In-memory stale-while-revalidate cache for page data: a page shows what it showed last time immediately
 * and refreshes in the background, so navigating around the app never waits on the network.
 * Cleared on sign-out (session.ts).
 */
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<(value: unknown) => void>>();

function publish(key: string, value: unknown) {
  cache.set(key, value);
  listeners.get(key)?.forEach((notify) => notify(value));
}

export function clearQueryCache() {
  cache.clear();
}

/** Fetch in the background and store the result (e.g. warm the next page). */
export async function prefetchQuery<T>(key: string, fetcher: () => Promise<T | undefined>) {
  if (cache.has(key)) return;
  const value = await fetcher();
  if (value !== undefined) publish(key, value);
}

/**
 * `fetcher` returns the data, or undefined when the request failed (the cached value is kept and
 * `error` becomes true). `mutate` updates the cached value locally (optimistic updates).
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T | undefined>) {
  const [data, setData] = useState<T | undefined>(() => cache.get(key) as T | undefined);
  const [error, setError] = useState(false);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refresh = useCallback(async () => {
    try {
      const value = await fetcherRef.current();
      if (value === undefined) return setError(true);
      setError(false);
      publish(key, value);
    } catch {
      setError(true);
    }
  }, [key]);

  useEffect(() => {
    const notify = (value: unknown) => setData(value as T);
    const set = listeners.get(key) ?? new Set();
    set.add(notify);
    listeners.set(key, set);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the cached value for a new key, then revalidate
    setData(cache.get(key) as T | undefined);
    refresh();
    return () => {
      set.delete(notify);
    };
  }, [key, refresh]);

  const mutate = useCallback(
    (update: (current: T | undefined) => T | undefined) => {
      const next = update(cache.get(key) as T | undefined);
      if (next !== undefined) publish(key, next);
    },
    [key],
  );

  return { data, error, refresh, mutate };
}
