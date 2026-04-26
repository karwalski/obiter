/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.46 — Lexis+ AU Adapter Stub
 *
 * Full implementation requires a Lexis API contract. Contact LexisNexis
 * for API access.
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

export class LexisAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "lexis-au",
    displayName: "Lexis+ AU",
    jurisdictions: ["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"],
    contentTypes: ["case", "legislation", "journal"],
    accessTier: "link-only",
    licence: "Commercial — requires Lexis+ subscription",
    requiresKey: true,
    rateLimitHint: { requestsPerSecond: 5, burst: 10 },
    fragile: false,
  };

  private getApiKey(): string {
    return getKey("lexis-au");
  }

  /** Requires Lexis API contract — returns empty results. */
  async search(_query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    if (!this.getApiKey()) return [];
    // Requires Lexis API contract
    return [];
  }

  /** Stub — returns null until Lexis API contract is in place. */
  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Stub — returns null until Lexis API contract is in place. */
  async getMetadata(_id: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Returns "degraded" if no key, "healthy" if key present. */
  async healthcheck(): Promise<AdapterHealth> {
    return this.getApiKey() ? "healthy" : "degraded";
  }
}
