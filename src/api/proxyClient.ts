/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { WEBSITE_URL } from "../constants";
import type { LookupResult } from "./types";

const PROXY_BASE = `${WEBSITE_URL}/api/proxy`;

/**
 * Combined case search: queries AustLII and Jade in parallel via the proxy,
 * merges and deduplicates results by sourceId.
 */
export async function searchCasesViaProxy(query: string): Promise<LookupResult[]> {
  try {
    const [austliiRes, jadeRes] = await Promise.allSettled([
      fetch(`${PROXY_BASE}/austlii?q=${encodeURIComponent(query)}`).then((r) => r.json()),
      fetch(`${PROXY_BASE}/jade?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    ]);

    const austliiResults: LookupResult[] =
      austliiRes.status === "fulfilled" ? (austliiRes.value.results ?? []) : [];
    const jadeResults: LookupResult[] =
      jadeRes.status === "fulfilled" ? (jadeRes.value.results ?? []) : [];

    // Deduplicate by sourceId, preferring Jade results
    const seen = new Set<string>();
    const merged: LookupResult[] = [];

    for (const result of [...jadeResults, ...austliiResults]) {
      if (!seen.has(result.sourceId)) {
        seen.add(result.sourceId);
        merged.push(result);
      }
    }

    return merged;
  } catch {
    // Proxy unreachable (e.g. dev environment without the server running)
    return [];
  }
}

/**
 * Legislation search via the proxy (Federal Register of Legislation).
 */
export async function searchLegislationViaProxy(query: string): Promise<LookupResult[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/legislation?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    // Proxy unreachable — return empty results silently
    return [];
  }
}
