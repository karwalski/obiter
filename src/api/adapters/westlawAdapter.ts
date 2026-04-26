/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.47 — Westlaw AU Adapter Stub
 *
 * Full implementation requires a Thomson Reuters Developer Portal contract.
 * Contact Thomson Reuters for API access.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";
import { getKey } from "../keyVault";

export class WestlawAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "westlaw-au",
    displayName: "Westlaw AU",
    jurisdictions: ["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"],
    contentTypes: ["case", "legislation", "journal"],
    accessTier: "link-only",
    licence: "Commercial — requires Westlaw subscription",
    requiresKey: true,
    rateLimitHint: { requestsPerSecond: 5, burst: 10 },
    fragile: false,
  };

  private getApiKey(): string {
    return getKey("westlaw-au");
  }

  /** Requires Thomson Reuters API contract — returns empty results. */
  async search(_query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    if (!this.getApiKey()) return [];
    // Requires Thomson Reuters Developer Portal contract
    return [];
  }

  /** Stub — returns null until API contract is in place. */
  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Stub — returns null until API contract is in place. */
  async getMetadata(_id: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Returns "degraded" if no key, "healthy" if key present. */
  async healthcheck(): Promise<AdapterHealth> {
    return this.getApiKey() ? "healthy" : "degraded";
  }
}
