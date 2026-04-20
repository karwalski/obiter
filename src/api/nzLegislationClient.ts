/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { WEBSITE_URL } from "../constants";
import type { LookupResult } from "./types";

const PROXY_BASE = `${WEBSITE_URL}/api/proxy`;

/**
 * Search NZ legislation from legislation.govt.nz via the proxy.
 *
 * Returns short title, year, and current status as LookupResult[].
 *
 * @remarks API-EXT-002 — NZ Legislation integration for NZLSG workflow.
 */
export async function searchNzLegislation(query: string): Promise<LookupResult[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/nzleg?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    // Proxy unreachable — return empty results silently
    return [];
  }
}
