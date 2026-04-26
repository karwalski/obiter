/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.16 — SA Parliament Hansard API Adapter
 *
 * Implements SourceAdapter against the SA Parliament Hansard API.
 * SA Parliament publishes an OpenAPI spec — endpoint patterns follow that spec.
 *
 * NOTE: Older Hansard may carry OCR artefacts from digitisation.
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
// API response shapes (subset, aligned with SA OpenAPI spec)
// ---------------------------------------------------------------------------

export interface SaHansardEntry {
  id?: string;
  date?: string;
  chamber?: string;
  speaker?: string;
  page?: string;
  title?: string;
  text?: string;
  bill?: string;
  url?: string;
}

export interface SaHansardSearchResponse {
  results?: SaHansardEntry[];
  totalResults?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base URL following the SA Parliament OpenAPI spec. */
const BASE_URL = "https://hansard.parliament.sa.gov.au/api/v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapEntryToMetadata(entry: SaHansardEntry): SourceMetadata {
  let year: number | undefined;
  if (entry.date) {
    const parsed = new Date(entry.date);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
    }
  }

  return {
    title: entry.title ?? entry.text?.slice(0, 120),
    speaker: entry.speaker,
    chamber: entry.chamber,
    page: entry.page,
    year,
    jurisdiction: "SA",
    date: entry.date,
    bill: entry.bill,
    /** Older Hansard may carry OCR artefacts from digitisation. */
    ocrWarning: "Older Hansard may carry OCR artefacts",
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class SaHansardAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "sa-hansard",
    displayName: "SA Parliament Hansard",
    jurisdictions: ["SA"],
    contentTypes: ["hansard"],
    accessTier: "open",
    licence: "SA Parliament — open access",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 2, burst: 4 },
    fragile: false,
  };

  /**
   * Fetch JSON from the SA Hansard API.
   * Extracted to a method so tests can override it.
   */
  protected async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`SA Hansard API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Build the search URL following the SA OpenAPI spec.
   */
  buildSearchUrl(query: string, filters?: SearchFilters): string {
    const params = new URLSearchParams({ q: query });

    if (filters?.yearFrom) {
      params.set("dateFrom", `${filters.yearFrom}-01-01`);
    }
    if (filters?.yearTo) {
      params.set("dateTo", `${filters.yearTo}-12-31`);
    }

    return `${BASE_URL}/search?${params.toString()}`;
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    const url = this.buildSearchUrl(query, filters);
    const data = await this.fetchJson<SaHansardSearchResponse>(url);
    const entries = data.results ?? [];

    return entries.map((entry, index) => ({
      title: entry.title ?? entry.text?.slice(0, 80) ?? "Hansard entry",
      snippet: [entry.speaker, entry.chamber, entry.date]
        .filter(Boolean)
        .join(" — "),
      sourceId: entry.id ?? `sa-hansard-${index}`,
      confidence: Math.max(0, 0.85 - index * 0.05),
      sourceUrl: entry.url,
      attribution: "SA Parliament Hansard",
    }));
  }

  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    try {
      const url = `${BASE_URL}/entries/${encodeURIComponent(id)}`;
      const entry = await this.fetchJson<SaHansardEntry>(url);
      if (!entry || !entry.id) return null;
      return mapEntryToMetadata(entry);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const url = `${BASE_URL}/search?q=test`;
      const res = await fetch(url, { method: "HEAD" });
      return res.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
