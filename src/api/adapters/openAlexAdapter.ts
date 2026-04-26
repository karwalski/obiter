/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.13 — OpenAlex Fallback Adapter
 *
 * Queries the OpenAlex API for journal article metadata.
 * Intended as a fallback when Crossref returns no results —
 * adapter preference ordering in the orchestrator handles this.
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
// OpenAlex API response shapes (subset)
// ---------------------------------------------------------------------------

interface OpenAlexAuthorship {
  author: {
    display_name?: string;
  };
}

interface OpenAlexWork {
  id?: string;
  doi?: string;
  title?: string;
  authorships?: OpenAlexAuthorship[];
  primary_location?: {
    source?: {
      display_name?: string;
    };
  };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
  };
  publication_year?: number;
}

interface OpenAlexSearchResponse {
  results: OpenAlexWork[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.openalex.org";

function mapWorkToMetadata(work: OpenAlexWork): SourceMetadata {
  let startingPage: number | undefined;
  if (work.biblio?.first_page) {
    const parsed = parseInt(work.biblio.first_page, 10);
    if (!isNaN(parsed)) startingPage = parsed;
  }

  // OpenAlex DOIs include the full URL prefix; strip it for the bare DOI.
  let doi = work.doi;
  if (doi && doi.startsWith("https://doi.org/")) {
    doi = doi.slice("https://doi.org/".length);
  }

  return {
    title: work.title,
    authors: work.authorships
      ?.map((a) => a.author.display_name)
      .filter((name): name is string => !!name),
    journal: work.primary_location?.source?.display_name,
    volume: work.biblio?.volume
      ? parseInt(work.biblio.volume, 10) || undefined
      : undefined,
    issue: work.biblio?.issue,
    startingPage,
    year: work.publication_year,
    doi,
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OpenAlexAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "openalex",
    displayName: "OpenAlex",
    jurisdictions: [],
    contentTypes: ["journal"],
    accessTier: "open",
    licence: "CC0",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 10, burst: 10 },
    fragile: false,
  };

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url =
      `${BASE_URL}/works?search=${encodedQuery}&filter=type:article&per_page=10`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return [];

    const data: OpenAlexSearchResponse = await response.json();
    const items = data.results ?? [];

    return items.map((work, index) => {
      const meta = mapWorkToMetadata(work);
      return {
        title: meta.title ?? "Untitled",
        snippet: [meta.authors?.join(", "), meta.journal, meta.year]
          .filter(Boolean)
          .join(" — "),
        sourceId: work.doi ?? work.id ?? `openalex-${index}`,
        confidence: Math.max(0, 1 - index * 0.05),
        sourceUrl: work.doi ?? undefined,
        attribution: "OpenAlex",
      };
    });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    // OpenAlex does not support direct DOI resolution via the search endpoint;
    // attempt to search for the citation string and return the top hit.
    const results = await this.search(citation);
    if (results.length === 0) return null;
    return this.getMetadata(results[0].sourceId);
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    // If the id looks like a DOI, query via the DOI filter.
    const isDoi = id.startsWith("10.") || id.startsWith("https://doi.org/");
    const url = isDoi
      ? `${BASE_URL}/works?filter=doi:${encodeURIComponent(id)}&per_page=1`
      : `${BASE_URL}/works?search=${encodeURIComponent(id)}&per_page=1`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data: OpenAlexSearchResponse = await response.json();
    if (!data.results || data.results.length === 0) return null;

    return mapWorkToMetadata(data.results[0]);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const url = `${BASE_URL}/works?per_page=0`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      return response.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
