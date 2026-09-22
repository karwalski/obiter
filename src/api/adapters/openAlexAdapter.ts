/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.13 — OpenAlex Fallback Adapter
 *
 * Queries the OpenAlex API for journal article metadata.
 * Intended as a fallback when Crossref returns no results —
 * adapter preference ordering in the orchestrator handles this.
 *
 * ENP-008: also a CitatorAdapter — `citedBy` resolves a work and lists the
 * works that cite it (`filter=cites:{id}`), most-cited first.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
  CitatorAdapter,
  CitedByResult,
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
  /** ENP-008: number of works citing this one. */
  cited_by_count?: number;
  /** ENP-008: OpenAlex's own URL for the citing-works query. */
  cited_by_api_url?: string;
  /** ENP-008: OpenAlex ids of the works this one cites. */
  referenced_works?: string[];
}

interface OpenAlexSearchResponse {
  results: OpenAlexWork[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.openalex.org";

/** ENP-008: attribution line for anything drawn from OpenAlex. */
export const OPENALEX_ATTRIBUTION = "Data from OpenAlex (CC0)";

const DOI_PREFIX = "https://doi.org/";

function isDoi(id: string): boolean {
  return id.startsWith("10.") || id.startsWith(DOI_PREFIX);
}

/**
 * The short OpenAlex work id ("W2741809807") from either the bare id or the
 * full openalex.org work URL that OpenAlex returns in `id`. Undefined when
 * the value is not a work id.
 */
export function shortWorkId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const match = /(W\d+)$/i.exec(id.trim());
  return match ? match[1].toUpperCase() : undefined;
}

/** ENP-008: "Authors, Journal vol(issue) year" for a citing-works row. */
function describeWork(meta: SourceMetadata): string {
  const volIssue =
    meta.volume !== undefined
      ? meta.issue
        ? `${meta.volume}(${meta.issue})`
        : String(meta.volume)
      : meta.issue
        ? `(${meta.issue})`
        : "";
  const where = [meta.journal, volIssue, meta.year].filter(Boolean).join(" ");
  return [meta.authors?.join(", "), where].filter(Boolean).join(", ");
}

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
    volume: work.biblio?.volume ? parseInt(work.biblio.volume, 10) || undefined : undefined,
    issue: work.biblio?.issue,
    startingPage,
    year: work.publication_year,
    doi,
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OpenAlexAdapter implements SourceAdapter, CitatorAdapter {
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
    const url = `${BASE_URL}/works?search=${encodedQuery}&filter=type:article&per_page=10`;

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
        snippet: [meta.authors?.join(", "), meta.journal, meta.year].filter(Boolean).join(" — "),
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
    const work = await this.fetchWork(id);
    return work ? mapWorkToMetadata(work) : null;
  }

  /**
   * Resolve one work by DOI (via the DOI filter), by OpenAlex work id (via
   * the single-work endpoint) or, failing both, by a one-result search.
   */
  private async fetchWork(id: string): Promise<OpenAlexWork | null> {
    const workId = isDoi(id) ? undefined : shortWorkId(id);
    const url = isDoi(id)
      ? `${BASE_URL}/works?filter=doi:${encodeURIComponent(id)}&per_page=1`
      : workId
        ? `${BASE_URL}/works/${workId}`
        : `${BASE_URL}/works?search=${encodeURIComponent(id)}&per_page=1`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data: Partial<OpenAlexSearchResponse> & OpenAlexWork = await response.json();
    // The single-work endpoint returns the work itself; list endpoints wrap
    // it in `results`.
    if (Array.isArray(data.results)) {
      return data.results.length > 0 ? data.results[0] : null;
    }
    return data.id ? data : null;
  }

  /**
   * ENP-008: works citing the given work (by DOI or OpenAlex id), most-cited
   * first. The count comes from the work itself (`cited_by_count`); the rows
   * from `filter=cites:{id}`. Each row carries its mapped metadata so it can
   * be added to the library without another request.
   */
  async citedBy(doiOrId: string, limit = 10): Promise<CitedByResult> {
    const work = await this.fetchWork(doiOrId);
    if (!work) return { count: null, works: [], attribution: OPENALEX_ATTRIBUTION };

    const count = typeof work.cited_by_count === "number" ? work.cited_by_count : null;
    const workId = shortWorkId(work.id);
    if (!workId) return { count, works: [], attribution: OPENALEX_ATTRIBUTION };

    const perPage = Math.max(1, Math.min(200, Math.floor(limit)));
    const url = `${BASE_URL}/works?filter=cites:${workId}&per_page=${perPage}&sort=cited_by_count:desc`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { count, works: [], attribution: OPENALEX_ATTRIBUTION };

    const data: OpenAlexSearchResponse = await response.json();
    const works = (data.results ?? []).map((citing, index): LookupResult => {
      const meta = mapWorkToMetadata(citing);
      const citingId = shortWorkId(citing.id);
      return {
        title: meta.title ?? "Untitled",
        snippet: describeWork(meta),
        sourceId: meta.doi ?? citingId ?? `openalex-cites-${index}`,
        confidence: Math.max(0, 1 - index * 0.05),
        sourceUrl: meta.doi ? `${DOI_PREFIX}${meta.doi}` : (citing.id ?? undefined),
        attribution: OPENALEX_ATTRIBUTION,
        metadata: meta,
      };
    });

    return { count, works, attribution: OPENALEX_ATTRIBUTION };
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
