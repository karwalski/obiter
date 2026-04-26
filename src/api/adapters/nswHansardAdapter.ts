/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.15 — NSW Parliament Hansard API Adapter
 *
 * Implements SourceAdapter against the NSW Parliament Hansard API.
 * Coverage: September 1991 onwards.
 * Licence: CC BY (NSW Parliament).
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

// ---------------------------------------------------------------------------
// API response shapes (subset)
// ---------------------------------------------------------------------------

export interface NswHansardEntry {
  Id?: string;
  Date?: string;
  Chamber?: string;
  Speaker?: string;
  Page?: string;
  Title?: string;
  Content?: string;
  Bill?: string;
  Url?: string;
}

export interface NswHansardSearchResponse {
  Results?: NswHansardEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.parliament.nsw.gov.au/api/hansard/search/daily";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapEntryToMetadata(entry: NswHansardEntry): SourceMetadata {
  const dateStr = entry.Date;
  let year: number | undefined;
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
    }
  }

  return {
    title: entry.Title ?? entry.Content?.slice(0, 120),
    speaker: entry.Speaker,
    chamber: entry.Chamber,
    page: entry.Page,
    year,
    jurisdiction: "NSW",
    date: entry.Date,
    bill: entry.Bill,
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class NswHansardAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "nsw-hansard",
    displayName: "NSW Parliament Hansard",
    jurisdictions: ["NSW"],
    contentTypes: ["hansard"],
    accessTier: "open",
    licence: "CC BY (NSW Parliament)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 2, burst: 4 },
    fragile: false,
  };

  /**
   * Fetch JSON from the NSW Hansard API.
   * Extracted to a method so tests can override it.
   */
  protected async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`NSW Hansard API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Build the search URL from a query and optional date filters.
   */
  buildSearchUrl(query: string, filters?: SearchFilters): string {
    const params = new URLSearchParams({ searchTerm: query });

    if (filters?.yearFrom) {
      params.set("startDate", `${filters.yearFrom}-01-01`);
    }
    if (filters?.yearTo) {
      params.set("endDate", `${filters.yearTo}-12-31`);
    }

    return `${BASE_URL}?${params.toString()}`;
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    const url = this.buildSearchUrl(query, filters);
    const data = await this.fetchJson<NswHansardSearchResponse>(url);
    const entries = data.Results ?? [];

    return entries.map((entry, index) => ({
      title: entry.Title ?? entry.Content?.slice(0, 80) ?? "Hansard entry",
      snippet: [entry.Speaker, entry.Chamber, entry.Date]
        .filter(Boolean)
        .join(" — "),
      sourceId: entry.Id ?? `nsw-hansard-${index}`,
      confidence: Math.max(0, 0.85 - index * 0.05),
      sourceUrl: entry.Url,
      attribution: "NSW Parliament Hansard, CC BY",
    }));
  }

  async resolve(_citation: string): Promise<SourceMetadata | null> {
    // Hansard citations are not readily parseable into search params;
    // return null to defer to other adapters or manual lookup.
    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    try {
      const url = `${BASE_URL}/${encodeURIComponent(id)}`;
      const entry = await this.fetchJson<NswHansardEntry>(url);
      if (!entry || !entry.Id) return null;
      return mapEntryToMetadata(entry);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const url = this.buildSearchUrl("test");
      const res = await fetch(url, { method: "HEAD" });
      return res.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
