/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Federal Register of Legislation HTML Adapter (Story 17.21)
 *
 * Implements SourceAdapter against legislation.gov.au. Uses the public
 * HTML pages to extract legislation metadata. Degrades gracefully when
 * the SPA shell blocks server-side HTML parsing.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";
import { parseCitationForStatute } from "./stateLegislationBase";

/** Base URL for the Federal Register of Legislation. */
const FRL_BASE = "https://www.legislation.gov.au";

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to extract the page title from an FRL HTML page.
 * Falls back to empty string if parsing fails.
 */
function extractTitle(html: string): string {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (!m) return "";
  // FRL titles are usually "Title - Federal Register of Legislation"
  const raw = m[1].trim();
  return raw.replace(/\s*[-|]\s*Federal Register of Legislation\s*$/i, "").trim();
}

/**
 * Attempt to extract the FRLI identifier from the HTML or URL.
 */
function extractFrliId(html: string, url: string): string | undefined {
  // Try meta tag
  const metaMatch = html.match(/name="dcterms\.identifier"\s+content="([^"]+)"/i);
  if (metaMatch) return metaMatch[1];

  // Try from URL path
  const urlMatch = url.match(/legislation\.gov\.au\/Details\/([\w/]+)/);
  if (urlMatch) return urlMatch[1];

  return undefined;
}

/**
 * Attempt to extract the legislation status (e.g. "In force", "Repealed").
 */
function extractStatus(html: string): string | undefined {
  const m = html.match(/class="[^"]*status[^"]*"[^>]*>([^<]+)</i);
  return m ? m[1].trim() : undefined;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FrlAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "frl",
    displayName: "Federal Register of Legislation",
    jurisdictions: ["Cth"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Commonwealth of Australia — open access",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 3 },
    fragile: true,
  };

  /**
   * Fetch a URL and return HTML. Isolated for testability.
   */
  protected async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Obiter/1.0 (AGLC4 Citation Tool; +https://obiter.com.au)",
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      throw new Error(`FRL fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  /**
   * Build a search URL on the FRL site.
   */
  buildSearchUrl(title: string, year?: number): string {
    const query = year ? `${title}` : title;
    return `${FRL_BASE}/Search/Results/Quick?SearchCategory=Acts&SearchText=${encodeURIComponent(query)}`;
  }

  /**
   * Build a direct URL for a statute by title + year.
   */
  buildStatuteUrl(title: string): string {
    // FRL uses the pattern /Details/{Title} with spaces replaced
    const slug = title.replace(/\s+/g, "%20");
    return `${FRL_BASE}/Details/${slug}`;
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    try {
      const { title, year } = parseCitationForStatute(query);
      const url = this.buildSearchUrl(title, year);
      const html = await this.fetchHtml(url);

      // Attempt to parse search results from HTML
      const results = this.parseSearchResults(html);
      if (results.length > 0) return results;

      // Degrade to URL-only result
      return [
        {
          title: query,
          snippet: "Search on Federal Register of Legislation",
          sourceId: url,
          confidence: 0.3,
          sourceUrl: url,
          attribution: "Federal Register of Legislation",
        },
      ];
    } catch {
      return [];
    }
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    try {
      const { title, year } = parseCitationForStatute(citation);
      const url = this.buildStatuteUrl(title);
      const html = await this.fetchHtml(url);

      const extractedTitle = extractTitle(html);
      if (!extractedTitle) {
        // SPA blocked — return URL-only metadata
        return {
          title: title,
          year,
          jurisdiction: "Cth",
          sourceUrl: url,
        };
      }

      return {
        title: extractedTitle,
        year,
        frliId: extractFrliId(html, url),
        status: extractStatus(html),
        jurisdiction: "Cth",
        sourceUrl: url,
      };
    } catch {
      return null;
    }
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    try {
      // id may be a URL or an FRLI path
      const url = id.startsWith("http") ? id : `${FRL_BASE}/Details/${id}`;
      const html = await this.fetchHtml(url);

      const title = extractTitle(html);
      if (!title) return null;

      const yearMatch = title.match(/(\d{4})\s*$/);
      return {
        title,
        year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
        frliId: extractFrliId(html, url),
        status: extractStatus(html),
        jurisdiction: "Cth",
        sourceUrl: url,
      };
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(FRL_BASE, {
        method: "HEAD",
        headers: {
          "User-Agent": "Obiter/1.0 (AGLC4 Citation Tool; +https://obiter.com.au)",
        },
      });
      if (res.ok) return "healthy";
      if (res.status < 500) return "degraded";
      return "offline";
    } catch {
      return "offline";
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Best-effort parse of FRL search result page HTML.
   * Returns empty array if HTML structure is unrecognised (SPA shell).
   */
  private parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    // FRL search results are in <div class="result-title"> / <a> tags
    const resultRegex =
      /<a[^>]+href="(\/Details\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    let match: RegExpExecArray | null;

    while ((match = resultRegex.exec(html)) !== null) {
      const path = match[1];
      const title = match[2].trim();
      results.push({
        title,
        snippet: title,
        sourceId: `${FRL_BASE}${path}`,
        confidence: 0.7,
        sourceUrl: `${FRL_BASE}${path}`,
        attribution: "Federal Register of Legislation",
      });
    }

    return results;
  }
}
