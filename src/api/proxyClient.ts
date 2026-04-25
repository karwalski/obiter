/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { WEBSITE_URL } from "../constants";
import type { LookupResult } from "./types";
import { loadSearchConfig } from "./searchConfig";

const PROXY_BASE = `${WEBSITE_URL}/api/proxy`;

/**
 * Combined case search: queries AustLII and Jade in parallel via the proxy,
 * merges and deduplicates results by sourceId.
 *
 * Returns empty results if search is disabled or no case providers are active.
 */
export async function searchCasesViaProxy(query: string): Promise<LookupResult[]> {
  const config = loadSearchConfig();
  if (!config.enabled) return [];

  const fetches: Promise<{ results?: LookupResult[] }>[] = [];
  const labels: string[] = [];

  if (config.providers.austlii) {
    fetches.push(fetch(`${PROXY_BASE}/austlii?q=${encodeURIComponent(query)}`).then((r) => r.json()));
    labels.push("austlii");
  }
  if (config.providers.jade) {
    fetches.push(fetch(`${PROXY_BASE}/jade?q=${encodeURIComponent(query)}`).then((r) => r.json()));
    labels.push("jade");
  }

  if (fetches.length === 0) return [];

  try {
    const results = await Promise.allSettled(fetches);

    const allResults: LookupResult[] = [];
    // Put Jade results first for deduplication preference
    const jadeIdx = labels.indexOf("jade");
    const austliiIdx = labels.indexOf("austlii");

    if (jadeIdx >= 0 && results[jadeIdx].status === "fulfilled") {
      allResults.push(...((results[jadeIdx] as PromiseFulfilledResult<{ results?: LookupResult[] }>).value.results ?? []));
    }
    if (austliiIdx >= 0 && results[austliiIdx].status === "fulfilled") {
      allResults.push(...((results[austliiIdx] as PromiseFulfilledResult<{ results?: LookupResult[] }>).value.results ?? []));
    }

    // Deduplicate by sourceId
    const seen = new Set<string>();
    const merged: LookupResult[] = [];
    for (const result of allResults) {
      if (!seen.has(result.sourceId)) {
        seen.add(result.sourceId);
        merged.push(result);
      }
    }

    return merged;
  } catch {
    return [];
  }
}

/**
 * Legislation search via the proxy (Federal Register of Legislation).
 *
 * Returns empty results if search is disabled or the legislation provider is inactive.
 */
export async function searchLegislationViaProxy(query: string): Promise<LookupResult[]> {
  const config = loadSearchConfig();
  if (!config.enabled || !config.providers.legislation) return [];

  try {
    const res = await fetch(`${PROXY_BASE}/legislation?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
