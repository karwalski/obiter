/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * @deprecated Replaced by the adapter framework (adapterSearch.ts) as of
 * Epic 17. The proxy endpoints on the server still exist for backward
 * compatibility, but all new typeahead searches route through
 * searchViaAdapters() which calls adapters directly.
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
 * Throws on complete failure so useTypeahead can display the error.
 */
export async function searchCasesViaProxy(query: string): Promise<LookupResult[]> {
  const config = loadSearchConfig();
  if (!config.enabled) return [];

  const fetches: Promise<{ results?: LookupResult[]; error?: string }>[] = [];
  const labels: string[] = [];

  if (config.providers.austlii) {
    fetches.push(
      fetch(`${PROXY_BASE}/austlii?q=${encodeURIComponent(query)}`).then((r) => {
        if (!r.ok) throw new Error(`AustLII proxy returned ${r.status}`);
        return r.json();
      }),
    );
    labels.push("austlii");
  }
  if (config.providers.jade) {
    fetches.push(
      fetch(`${PROXY_BASE}/jade?q=${encodeURIComponent(query)}`).then((r) => {
        if (!r.ok) throw new Error(`Jade proxy returned ${r.status}`);
        return r.json();
      }),
    );
    labels.push("jade");
  }

  if (fetches.length === 0) return [];

  const settled = await Promise.allSettled(fetches);

  const allResults: LookupResult[] = [];
  const errors: string[] = [];

  // Put Jade results first for deduplication preference
  const jadeIdx = labels.indexOf("jade");
  const austliiIdx = labels.indexOf("austlii");

  for (const [label, idx] of [["jade", jadeIdx], ["austlii", austliiIdx]] as const) {
    if (idx < 0) continue;
    const result = settled[idx];
    if (result.status === "fulfilled") {
      const data = result.value;
      if (data.error) {
        errors.push(`${label}: ${data.error}`);
      }
      allResults.push(...(data.results ?? []));
    } else {
      errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "request failed"}`);
    }
  }

  // If all providers failed and we have no results, throw so the UI shows an error.
  if (allResults.length === 0 && errors.length > 0) {
    throw new Error(errors.join("; "));
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
}

/**
 * Legislation search via the proxy (Federal Register of Legislation).
 *
 * Returns empty results if search is disabled or the legislation provider is inactive.
 * Throws on failure so useTypeahead can display the error.
 */
export async function searchLegislationViaProxy(query: string): Promise<LookupResult[]> {
  const config = loadSearchConfig();
  if (!config.enabled || !config.providers.legislation) return [];

  const res = await fetch(`${PROXY_BASE}/legislation?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error(`Legislation proxy returned ${res.status}`);
  }
  const data: { results?: LookupResult[]; error?: string } = await res.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.results ?? [];
}
