/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.50 — Habeas Placeholder
 *
 * Implementation deferred until Habeas exposes a stable public API.
 * All methods return empty/null. Healthcheck returns "offline".
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

export class HabeasAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "habeas",
    displayName: "Habeas",
    jurisdictions: ["AU"],
    contentTypes: ["case"],
    accessTier: "link-only",
    licence: "Commercial — requires Habeas subscription",
    requiresKey: true,
    rateLimitHint: { requestsPerSecond: 1, burst: 1 },
    fragile: false,
  };

  /** Placeholder — returns empty results. */
  async search(_query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    return [];
  }

  /** Placeholder — returns null. */
  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Placeholder — returns null. */
  async getMetadata(_id: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Always offline — no API available. */
  async healthcheck(): Promise<AdapterHealth> {
    return "offline";
  }
}
