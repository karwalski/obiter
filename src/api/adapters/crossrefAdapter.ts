/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.12 — Crossref Journal Adapter
 *
 * Queries the Crossref REST API for journal article metadata.
 * Uses the polite pool (mailto param) when a contact email is stored
 * in the key vault, falling back to the anonymous tier at 1 RPS.
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
// Crossref API response shapes (subset)
// ---------------------------------------------------------------------------

interface CrossrefAuthor {
  given?: string;
  family?: string;
}

interface CrossrefDateParts {
  "date-parts"?: number[][];
}

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  "published-print"?: CrossrefDateParts;
  "published-online"?: CrossrefDateParts;
}

interface CrossrefSearchResponse {
  message: {
    items: CrossrefWork[];
  };
}

interface CrossrefSingleResponse {
  message: CrossrefWork;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.crossref.org";

const SELECT_FIELDS = [
  "DOI",
  "title",
  "author",
  "container-title",
  "volume",
  "issue",
  "page",
  "published-print",
  "published-online",
].join(",");

function extractYear(work: CrossrefWork): number | undefined {
  const pub =
    work["published-print"] ?? work["published-online"];
  const parts = pub?.["date-parts"];
  if (parts && parts.length > 0 && parts[0].length > 0) {
    return parts[0][0];
  }
  return undefined;
}

function formatAuthor(a: CrossrefAuthor): string {
  const parts: string[] = [];
  if (a.given) parts.push(a.given);
  if (a.family) parts.push(a.family);
  return parts.join(" ");
}

function mapWorkToMetadata(work: CrossrefWork): SourceMetadata {
  const pageStr = work.page;
  let startingPage: number | undefined;
  if (pageStr) {
    const parsed = parseInt(pageStr.split("-")[0], 10);
    if (!isNaN(parsed)) startingPage = parsed;
  }

  return {
    title: work.title?.[0],
    authors: work.author?.map(formatAuthor).filter(Boolean),
    journal: work["container-title"]?.[0],
    volume: work.volume ? parseInt(work.volume, 10) || undefined : undefined,
    issue: work.issue,
    startingPage,
    year: extractYear(work),
    doi: work.DOI,
  };
}

function buildMailtoParam(): string {
  const email = getKey("crossref");
  return email ? `&mailto=${encodeURIComponent(email)}` : "";
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class CrossrefAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "crossref",
    displayName: "Crossref",
    jurisdictions: [],
    contentTypes: ["journal"],
    accessTier: "open",
    licence: "CC0",
    requiresKey: false,
    rateLimitHint: this.getRateLimitHint(),
    fragile: false,
  };

  private getRateLimitHint(): { requestsPerSecond: number; burst: number } {
    const hasEmail = getKey("crossref").length > 0;
    return hasEmail
      ? { requestsPerSecond: 50, burst: 50 }
      : { requestsPerSecond: 1, burst: 1 };
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const mailto = buildMailtoParam();
    const url =
      `${BASE_URL}/works?query.bibliographic=${encodedQuery}&rows=10&select=${SELECT_FIELDS}${mailto}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return [];

    const data: CrossrefSearchResponse = await response.json();
    const items = data.message?.items ?? [];

    return items.map((work, index) => {
      const meta = mapWorkToMetadata(work);
      return {
        title: meta.title ?? "Untitled",
        snippet: [meta.authors?.join(", "), meta.journal, meta.year]
          .filter(Boolean)
          .join(" — "),
        sourceId: work.DOI ?? `crossref-${index}`,
        confidence: Math.max(0, 1 - index * 0.05),
        sourceUrl: work.DOI ? `https://doi.org/${work.DOI}` : undefined,
        attribution: "Crossref",
      };
    });
  }

  async resolve(doi: string): Promise<SourceMetadata | null> {
    const mailto = buildMailtoParam();
    const encodedDoi = encodeURIComponent(doi);
    const url = `${BASE_URL}/works/${encodedDoi}${mailto ? "?" + mailto.slice(1) : ""}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data: CrossrefSingleResponse = await response.json();
    return mapWorkToMetadata(data.message);
  }

  async getMetadata(doi: string): Promise<SourceMetadata | null> {
    return this.resolve(doi);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const mailto = buildMailtoParam();
      const url = `${BASE_URL}/works?rows=0${mailto}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      return response.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
