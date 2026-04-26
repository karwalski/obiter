/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * State Legislation Scraper Framework (Story 17.25)
 *
 * Abstract base class for per-state legislation scrapers. Each state's
 * legislation website has a slightly different HTML structure, so concrete
 * subclasses implement the four abstract methods that deal with URL
 * construction and HTML parsing. The base class provides the SourceAdapter
 * contract (search, resolve, getMetadata, healthcheck) with shared logic
 * and graceful degradation.
 *
 * These scrapers are inherently fragile — upstream HTML changes can break
 * parsing at any time. The framework makes updating a single state trivial:
 * just fix the relevant parseSearchResults / parseDetailPage override.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

/**
 * Extract a legislation title and optional year from a citation string.
 *
 * Handles common patterns like:
 *   "Crimes Act 1900 (NSW)"  →  { title: "Crimes Act 1900", year: 1900 }
 *   "Environmental Planning and Assessment Act 1979"  →  { title: "...", year: 1979 }
 *   "Crimes Act"  →  { title: "Crimes Act", year: undefined }
 */
export function parseCitationForStatute(citation: string): {
  title: string;
  year?: number;
} {
  // Strip jurisdiction abbreviation in parentheses at the end
  const stripped = citation.replace(/\s*\([A-Za-z]{2,4}\)\s*$/, "").trim();

  // Try to extract a trailing 4-digit year — title keeps the year (AGLC4 convention)
  const yearMatch = stripped.match(/(\d{4})\s*$/);
  if (yearMatch) {
    return { title: stripped, year: parseInt(yearMatch[1], 10) };
  }

  return { title: stripped };
}

export abstract class StateLegislationAdapter implements SourceAdapter {
  abstract readonly descriptor: SourceAdapterDescriptor;

  /** Build the search URL for the state legislation site. */
  abstract buildSearchUrl(title: string, year?: number): string;

  /** Build a detail/view URL for a specific piece of legislation by ID. */
  abstract buildDetailUrl(id: string): string;

  /** Parse the HTML of a search results page into LookupResults. */
  abstract parseSearchResults(html: string): LookupResult[];

  /** Parse the HTML of a detail page into SourceMetadata, or null on failure. */
  abstract parseDetailPage(html: string): SourceMetadata | null;

  /** Base URL for the legislation site (used by healthcheck). */
  protected abstract readonly baseUrl: string;

  /**
   * Fetch a URL and return the response text. Isolated for testability.
   * Subclasses or tests can override this.
   */
  protected async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Obiter/1.0 (AGLC4 Citation Tool; +https://obiter.com.au)",
        Accept: "text/html",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return response.text();
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    try {
      const { title, year } = parseCitationForStatute(query);
      const url = this.buildSearchUrl(title, year);
      const html = await this.fetchHtml(url);
      return this.parseSearchResults(html);
    } catch {
      // Graceful degradation — scraper failures should not propagate
      return [];
    }
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    try {
      const url = this.buildDetailUrl(id);
      const html = await this.fetchHtml(url);
      return this.parseDetailPage(html);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Obiter/1.0 (AGLC4 Citation Tool; +https://obiter.com.au)",
        },
      });
      if (response.ok) return "healthy";
      if (response.status < 500) return "degraded";
      return "offline";
    } catch {
      return "offline";
    }
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    try {
      const results = await this.search(citation);
      if (results.length === 0) return null;

      // Return metadata for the top match
      const top = results[0];
      return this.getMetadata(top.sourceId);
    } catch {
      return null;
    }
  }
}
