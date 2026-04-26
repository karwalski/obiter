// LEGAL: No HTTP requests to jade.io. Link construction only.
// Jade ToS prohibit automation. This adapter constructs URLs only.

/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.49 — Jade Professional Link-Out
 *
 * NOT an API adapter. Constructs professional portal URLs instead of
 * free-tier URLs when the user has indicated they hold a Jade Pro
 * subscription. No HTTP requests are made.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";
import { getDevicePref } from "../../store/devicePreferences";

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

/** MNC pattern: [YYYY] CourtCode Number */
const MNC_PATTERN = /\[(\d{4})]\s+([A-Za-z]+)\s+(\d+)/;

/** Free-tier Jade URL. */
export function buildJadeFreeUrl(
  court: string,
  year: number,
  number: number,
): string {
  return `https://jade.io/article/${court}/${year}/${number}`;
}

/** Jade Professional portal URL. */
export function buildJadeProUrl(
  court: string,
  year: number,
  number: number,
): string {
  return `https://pro.jade.io/article/${court}/${year}/${number}`;
}

// ---------------------------------------------------------------------------
// Subscription toggle
// ---------------------------------------------------------------------------

/** Check whether the user has indicated they hold a Jade Pro subscription. */
export function hasJadeProSubscription(): boolean {
  return getDevicePref("jadeProSubscription") === true;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class JadeProAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "jade-pro",
    displayName: "Jade Professional",
    jurisdictions: ["AU"],
    contentTypes: ["case"],
    accessTier: "link-only",
    licence: "Link-only — requires Jade Professional subscription",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 0, burst: 0 },
    fragile: false,
  };

  /** Link-only adapter — no search capability. */
  async search(_query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    return [];
  }

  /**
   * Parse a medium-neutral citation and construct the appropriate Jade URL.
   * Uses the professional portal URL when the Pro subscription toggle is
   * enabled, otherwise falls back to the free-tier URL.
   */
  async resolve(citation: string): Promise<SourceMetadata | null> {
    const match = MNC_PATTERN.exec(citation);
    if (!match) return null;

    const year = parseInt(match[1], 10);
    const court = match[2];
    const number = parseInt(match[3], 10);

    const isPro = hasJadeProSubscription();
    const url = isPro
      ? buildJadeProUrl(court, year, number)
      : buildJadeFreeUrl(court, year, number);

    return {
      mnc: `[${year}] ${court} ${number}`,
      year,
      court,
      jurisdiction: "AU",
      sourceUrl: url,
    };
  }

  /** Link-only adapter — no metadata retrieval. */
  async getMetadata(_id: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Always healthy — no external dependency. */
  async healthcheck(): Promise<AdapterHealth> {
    return "healthy";
  }
}
