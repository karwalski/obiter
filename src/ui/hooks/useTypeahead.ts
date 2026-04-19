/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Hook that manages typeahead search state: debouncing, request
 * cancellation, and error handling.
 */

import { useState, useEffect, useRef } from "react";
import { LookupResult } from "../../api/types";

interface TypeaheadState {
  results: LookupResult[];
  loading: boolean;
  error: string | null;
}

/**
 * Debounces calls to `searchFn` and returns the latest results.
 *
 * Automatically cancels stale requests: if a newer query fires before the
 * previous one resolves, the older result is discarded. Errors are captured
 * in the `error` field and never thrown.
 */
export function useTypeahead(
  searchFn: (query: string) => Promise<LookupResult[]>,
  query: string,
  minChars: number = 3,
  debounceMs: number = 300,
): TypeaheadState {
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request so stale responses can be ignored.
  const requestIdRef = useRef(0);

  useEffect(() => {
    // Reset when query is too short.
    if (query.trim().length < minChars) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      searchFn(query.trim())
        .then((data) => {
          // Only apply if this is still the most recent request.
          if (currentId === requestIdRef.current) {
            setResults(data);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (currentId === requestIdRef.current) {
            const message = err instanceof Error ? err.message : "Search failed";
            setError(message);
            setResults([]);
            setLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [searchFn, query, minChars, debounceMs]);

  return { results, loading, error };
}
