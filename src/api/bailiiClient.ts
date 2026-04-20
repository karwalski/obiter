/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { WEBSITE_URL } from "../constants";
import type { LookupResult } from "./types";

const PROXY_BASE = `${WEBSITE_URL}/api/proxy`;

/**
 * Search BAILII (British and Irish Legal Information Institute) for UK and
 * Irish cases via the proxy.
 *
 * Returns case name, neutral citation, court, and date as LookupResult[].
 *
 * @remarks API-EXT-001 — BAILII integration for OSCOLA workflow.
 */
export async function searchBailii(query: string): Promise<LookupResult[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/bailii?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    // Proxy unreachable — return empty results silently
    return [];
  }
}
