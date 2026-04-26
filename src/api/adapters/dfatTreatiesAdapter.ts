/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * DFAT Treaties Scraper (Story 17.34)
 *
 * Implements SourceAdapter against the Australian Treaties Database
 * (DFAT). Scrapes HTML pages to extract treaty metadata including
 * ATS year/number, parties, signature date, and entry into force.
 *
 * Inherently fragile — upstream HTML changes will break parsing.
 * Rate limit: 0.5 RPS.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

/** Base URL for the Australian Treaties Database. */
const DFAT_BASE = "https://www.info.dfat.gov.au/Info/Treaties";

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract ATS (Australian Treaty Series) number from text.
 * Pattern: "[YYYY] ATS NN" or "ATS YYYY No NN"
 */
function extractAtsNumber(text: string): string | undefined {
  const m =
    text.match(/\[(\d{4})\]\s*ATS\s+(\d+)/) ||
    text.match(/ATS\s+(\d{4})\s+No\.?\s*(\d+)/i);
  if (m) return `[${m[1]}] ATS ${m[2]}`;
  return undefined;
}

/**
 * Extract a date field from HTML near a label.
 */
function extractDateField(html: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}[^<]*</[^>]+>\\s*(?:<[^>]+>)?\\s*([^<]+)`, "i");
  const m = re.exec(html);
  if (m) {
    const dateStr = m[1].trim();
    if (dateStr && dateStr !== "N/A" && dateStr !== "-") return dateStr;
  }
  return undefined;
}

/**
 * Extract parties from the treaty detail HTML.
 */
function extractParties(html: string): string | undefined {
  const m = html.match(/Parties[^<]*<\/[^>]+>\s*(?:<[^>]+>)?\s*([^<]+)/i);
  return m ? m[1].trim() || undefined : undefined;
}

/**
 * Extract treaty title from HTML page title or heading.
 */
function extractTreatyTitle(html: string): string {
  // Try h1/h2 heading first
  const headingMatch = html.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
  if (headingMatch) return headingMatch[1].trim();

  // Fall back to page title
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) {
    return titleMatch[1]
      .replace(/\s*[-|]\s*Australian Treaties.*$/i, "")
      .trim();
  }

  return "";
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class DfatTreatiesAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "dfat-treaties",
    displayName: "DFAT Treaty Database",
    jurisdictions: ["Cth"],
    contentTypes: ["treaty"],
    accessTier: "live",
    licence: "Commonwealth of Australia — open access",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 0.5, burst: 2 },
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
      throw new Error(`DFAT fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  /**
   * Build a search URL for the treaties database.
   */
  buildSearchUrl(query: string): string {
    return `${DFAT_BASE}/Search.aspx?SearchText=${encodeURIComponent(query)}`;
  }

  /**
   * Build a detail URL for a specific treaty.
   */
  buildDetailUrl(id: string): string {
    if (id.startsWith("http")) return id;
    return `${DFAT_BASE}/Treaty.aspx?id=${encodeURIComponent(id)}`;
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    try {
      const url = this.buildSearchUrl(query);
      const html = await this.fetchHtml(url);
      return this.parseSearchResults(html);
    } catch {
      return [];
    }
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    try {
      const results = await this.search(citation);
      if (results.length === 0) return null;
      return this.getMetadata(results[0].sourceId);
    } catch {
      return null;
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
      const res = await fetch(DFAT_BASE, {
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
  // HTML parsing helpers
  // -----------------------------------------------------------------------

  private parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const linkRegex =
      /<a[^>]+href="(Treaty\.aspx\?id=[^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const path = match[1];
      const title = match[2].trim();
      const ats = extractAtsNumber(title) || extractAtsNumber(html);

      results.push({
        title,
        snippet: ats || title,
        sourceId: path,
        confidence: ats ? 0.8 : 0.5,
        sourceUrl: `${DFAT_BASE}/${path}`,
        attribution: "DFAT Australian Treaties Database",
      });
    }

    return results;
  }

  private parseDetailPage(html: string): SourceMetadata | null {
    const title = extractTreatyTitle(html);
    if (!title) return null;

    const ats = extractAtsNumber(html);
    const parties = extractParties(html);
    const signatureDate = extractDateField(html, "Signature");
    const entryIntoForce = extractDateField(html, "Entry into force");

    // Extract year from ATS number or signature date
    const atsYearMatch = ats?.match(/\[(\d{4})\]/);
    const sigYearMatch = signatureDate?.match(/(\d{4})/);
    const year = atsYearMatch
      ? parseInt(atsYearMatch[1], 10)
      : sigYearMatch
        ? parseInt(sigYearMatch[1], 10)
        : undefined;

    return {
      title,
      year,
      parties,
      treatySeries: ats,
      jurisdiction: "Cth",
      signatureDate,
      entryIntoForce,
      sourceUrl: undefined, // populated by caller from sourceId
    };
  }
}
