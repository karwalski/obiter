/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.48 — vLex Adapter
 *
 * vLex has the most developer-friendly API of the commercial providers.
 * Queries the vLex REST API with Bearer token authentication.
 * Rate limit: 5 RPS.
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

// ---------------------------------------------------------------------------
// vLex API response shapes (subset)
// ---------------------------------------------------------------------------

interface VlexDocument {
  id: string;
  title?: string;
  snippet?: string;
  url?: string;
  jurisdiction?: string;
  court?: string;
  year?: number;
  parties?: string;
  authors?: string[];
  publication?: string;
  volume?: string;
  issue?: string;
  page?: string;
}

interface VlexSearchResponse {
  results?: VlexDocument[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VLEX_API_BASE = "https://api.vlex.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapVlexDocToMetadata(doc: VlexDocument): SourceMetadata {
  let startingPage: number | undefined;
  if (doc.page) {
    const parsed = parseInt(doc.page.split("-")[0], 10);
    if (!isNaN(parsed)) startingPage = parsed;
  }

  return {
    title: doc.title ?? doc.parties,
    parties: doc.parties,
    year: doc.year,
    court: doc.court,
    jurisdiction: doc.jurisdiction,
    authors: doc.authors,
    journal: doc.publication,
    volume: doc.volume ? parseInt(doc.volume, 10) || undefined : undefined,
    issue: doc.issue,
    startingPage,
    sourceUrl: doc.url,
  };
}

function mapVlexDocToResult(doc: VlexDocument, index: number): LookupResult {
  return {
    title: doc.title ?? "Untitled",
    snippet: doc.snippet ?? "",
    sourceId: doc.id,
    confidence: Math.max(0, 1 - index * 0.05),
    sourceUrl: doc.url,
    attribution: "vLex",
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class VlexAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "vlex",
    displayName: "vLex",
    jurisdictions: [],
    contentTypes: ["case", "legislation", "journal"],
    accessTier: "link-only",
    licence: "Commercial — requires vLex subscription",
    requiresKey: true,
    rateLimitHint: { requestsPerSecond: 5, burst: 10 },
    fragile: false,
  };

  private getApiKey(): string {
    return getKey("vlex");
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      Accept: "application/json",
    };
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];

    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${VLEX_API_BASE}/search?q=${encodedQuery}`;

      const response = await fetch(url, {
        headers: this.buildHeaders(),
      });

      if (!response.ok) return [];

      const data: VlexSearchResponse = await response.json();
      const results = data.results ?? [];

      return results.map(mapVlexDocToResult);
    } catch {
      return [];
    }
  }

  /** Search for the citation and return the top match's metadata. */
  async resolve(citation: string): Promise<SourceMetadata | null> {
    const results = await this.search(citation);
    if (results.length === 0) return null;

    return this.getMetadata(results[0].sourceId);
  }

  /** Fetch document metadata by vLex document ID. */
  async getMetadata(id: string): Promise<SourceMetadata | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const url = `${VLEX_API_BASE}/documents/${encodeURIComponent(id)}`;
      const response = await fetch(url, {
        headers: this.buildHeaders(),
      });

      if (!response.ok) return null;

      const doc: VlexDocument = await response.json();
      return mapVlexDocToMetadata(doc);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    const apiKey = this.getApiKey();
    if (!apiKey) return "degraded";

    try {
      const url = `${VLEX_API_BASE}/search?q=test&rows=0`;
      const response = await fetch(url, {
        headers: this.buildHeaders(),
      });
      return response.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
