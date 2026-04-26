/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.14 — DOAJ Open-Access Adapter
 *
 * Queries the Directory of Open Access Journals (DOAJ) API for
 * open-access journal article metadata. Captures PDF/HTML URLs
 * from bibjson.link entries.
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
// DOAJ API response shapes (subset)
// ---------------------------------------------------------------------------

interface DoajAuthor {
  name?: string;
}

interface DoajLink {
  type?: string;
  url?: string;
  content_type?: string;
}

interface DoajIdentifier {
  type?: string;
  id?: string;
}

interface DoajBibJson {
  title?: string;
  author?: DoajAuthor[];
  journal?: {
    title?: string;
    volume?: string;
    number?: string;
  };
  year?: string;
  start_page?: string;
  link?: DoajLink[];
  identifier?: DoajIdentifier[];
}

interface DoajResult {
  id?: string;
  bibjson?: DoajBibJson;
}

interface DoajSearchResponse {
  results?: DoajResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://doaj.org";

function extractDoi(identifiers?: DoajIdentifier[]): string | undefined {
  if (!identifiers) return undefined;
  const doiEntry = identifiers.find((i) => i.type === "doi");
  return doiEntry?.id;
}

function extractOpenUrl(links?: DoajLink[]): string | undefined {
  if (!links) return undefined;
  // Prefer fulltext / open-access links
  const fulltext = links.find(
    (l) =>
      l.type === "fulltext" ||
      l.content_type === "application/pdf" ||
      l.content_type === "text/html",
  );
  return fulltext?.url;
}

function mapResultToMetadata(result: DoajResult): SourceMetadata {
  const bib = result.bibjson;
  if (!bib) return {};

  let startingPage: number | undefined;
  if (bib.start_page) {
    const parsed = parseInt(bib.start_page, 10);
    if (!isNaN(parsed)) startingPage = parsed;
  }

  return {
    title: bib.title,
    authors: bib.author
      ?.map((a) => a.name)
      .filter((name): name is string => !!name),
    journal: bib.journal?.title,
    volume: bib.journal?.volume
      ? parseInt(bib.journal.volume, 10) || undefined
      : undefined,
    issue: bib.journal?.number,
    startingPage,
    year: bib.year ? parseInt(bib.year, 10) || undefined : undefined,
    doi: extractDoi(bib.identifier),
    openAccessUrl: extractOpenUrl(bib.link),
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class DoajAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "doaj",
    displayName: "DOAJ",
    jurisdictions: [],
    contentTypes: ["journal"],
    accessTier: "open",
    licence: "CC BY",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 2, burst: 2 },
    fragile: false,
  };

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/api/search/articles/${encodedQuery}?pageSize=10`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return [];

    const data: DoajSearchResponse = await response.json();
    const items = data.results ?? [];

    return items.map((result, index) => {
      const meta = mapResultToMetadata(result);
      const openUrl = extractOpenUrl(result.bibjson?.link);
      return {
        title: meta.title ?? "Untitled",
        snippet: [meta.authors?.join(", "), meta.journal, meta.year]
          .filter(Boolean)
          .join(" — "),
        sourceId: result.id ?? `doaj-${index}`,
        confidence: Math.max(0, 1 - index * 0.05),
        sourceUrl: openUrl ?? (meta.doi ? `https://doi.org/${meta.doi}` : undefined),
        attribution: "DOAJ",
      };
    });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    // DOAJ does not support direct citation resolution; search and return top hit.
    const results = await this.search(citation);
    if (results.length === 0) return null;
    return this.getMetadata(results[0].sourceId);
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    const url = `${BASE_URL}/api/articles/${encodeURIComponent(id)}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data: DoajResult = await response.json();
    if (!data.bibjson) return null;

    return mapResultToMetadata(data);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const url = `${BASE_URL}/api/search/articles/test?pageSize=0`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      return response.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
