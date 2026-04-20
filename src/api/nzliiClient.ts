/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { WEBSITE_URL } from "../constants";
import type { LookupResult } from "./types";

const PROXY_BASE = `${WEBSITE_URL}/api/proxy`;

/**
 * Search NZLII (New Zealand Legal Information Institute) for NZ cases and
 * tribunal decisions via the proxy.
 *
 * Returns case name, neutral citation, court, and date as LookupResult[].
 * Handles Maori Land Court and Waitangi Tribunal results.
 *
 * @remarks API-EXT-003 — NZLII integration for NZLSG workflow.
 */
export async function searchNzlii(query: string): Promise<LookupResult[]> {
  try {
    const res = await fetch(`${PROXY_BASE}/nzlii?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results ?? [];
  } catch {
    // Proxy unreachable — return empty results silently
    return [];
  }
}
