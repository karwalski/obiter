/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Law Reform Commission Scrapers (Story 17.35)
 *
 * Implements SourceAdapter for Australian Law Reform Commissions.
 * Per-commission configuration allows each sub-adapter to be
 * independently disabled without affecting others.
 *
 * Rate limit: 0.5 RPS per commission.
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
// Per-commission configuration
// ---------------------------------------------------------------------------

export interface LrcCommissionConfig {
  /** Short identifier, e.g. "alrc". */
  id: string;
  /** Full name, e.g. "Australian Law Reform Commission". */
  name: string;
  /** Abbreviation used in citations, e.g. "ALRC". */
  abbreviation: string;
  /** Jurisdiction code. */
  jurisdiction: string;
  /** Base URL for the commission's website. */
  baseUrl: string;
  /** URL pattern for searching reports. Use {query} as placeholder. */
  searchPattern: string;
  /** Whether this sub-adapter is currently enabled. */
  enabled: boolean;
}

/** Default commission configurations. */
export const DEFAULT_LRC_CONFIGS: LrcCommissionConfig[] = [
  {
    id: "alrc",
    name: "Australian Law Reform Commission",
    abbreviation: "ALRC",
    jurisdiction: "Cth",
    baseUrl: "https://www.alrc.gov.au",
    searchPattern: "https://www.alrc.gov.au/?s={query}",
    enabled: true,
  },
  {
    id: "nswlrc",
    name: "NSW Law Reform Commission",
    abbreviation: "NSWLRC",
    jurisdiction: "NSW",
    baseUrl: "https://www.lawreform.justice.nsw.gov.au",
    searchPattern:
      "https://www.lawreform.justice.nsw.gov.au/Pages/lrc/search.aspx?query={query}",
    enabled: true,
  },
  {
    id: "vlrc",
    name: "Victorian Law Reform Commission",
    abbreviation: "VLRC",
    jurisdiction: "Vic",
    baseUrl: "https://www.lawreform.vic.gov.au",
    searchPattern: "https://www.lawreform.vic.gov.au/search?query={query}",
    enabled: true,
  },
  {
    id: "qlrc",
    name: "Queensland Law Reform Commission",
    abbreviation: "QLRC",
    jurisdiction: "Qld",
    baseUrl: "https://www.qlrc.qld.gov.au",
    searchPattern: "https://www.qlrc.qld.gov.au/?s={query}",
    enabled: true,
  },
  {
    id: "walrc",
    name: "Law Reform Commission of Western Australia",
    abbreviation: "WALRC",
    jurisdiction: "WA",
    baseUrl: "https://www.lrc.justice.wa.gov.au",
    searchPattern: "https://www.lrc.justice.wa.gov.au/?s={query}",
    enabled: true,
  },
  {
    id: "salri",
    name: "South Australian Law Reform Institute",
    abbreviation: "SALRI",
    jurisdiction: "SA",
    baseUrl: "https://law.adelaide.edu.au/south-australian-law-reform-institute",
    searchPattern:
      "https://law.adelaide.edu.au/south-australian-law-reform-institute?q={query}",
    enabled: true,
  },
  {
    id: "tlri",
    name: "Tasmania Law Reform Institute",
    abbreviation: "TLRI",
    jurisdiction: "Tas",
    baseUrl: "https://www.utas.edu.au/law-reform",
    searchPattern: "https://www.utas.edu.au/law-reform?q={query}",
    enabled: true,
  },
  {
    id: "ntlrc",
    name: "Northern Territory Law Reform Committee",
    abbreviation: "NTLRC",
    jurisdiction: "NT",
    baseUrl: "https://justice.nt.gov.au/attorney-general-and-justice/law-reform-committee",
    searchPattern:
      "https://justice.nt.gov.au/attorney-general-and-justice/law-reform-committee?q={query}",
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract report number from text.
 * Common patterns: "Report 123", "Report No 123", "ALRC Report 123"
 */
function extractReportNumber(text: string): string | undefined {
  const m = text.match(/Report\s+(?:No\.?\s*)?(\d+)/i);
  return m ? m[1] : undefined;
}

/**
 * Extract a year from text.
 */
function extractYear(text: string): number | undefined {
  const m = text.match(/\b((?:19|20)\d{2})\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class LrcAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "lrc",
    displayName: "Law Reform Commissions",
    jurisdictions: ["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas", "NT"],
    contentTypes: ["lrc-report"],
    accessTier: "live",
    licence: "Various Crown Copyright",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 0.5, burst: 2 },
    fragile: true,
  };

  private readonly configs: LrcCommissionConfig[];

  constructor(configs?: LrcCommissionConfig[]) {
    this.configs = configs || DEFAULT_LRC_CONFIGS;
  }

  /**
   * Get the list of enabled commission configs.
   */
  getEnabledCommissions(): LrcCommissionConfig[] {
    return this.configs.filter((c) => c.enabled);
  }

  /**
   * Disable a specific sub-adapter by commission id.
   */
  disableCommission(commissionId: string): void {
    const config = this.configs.find((c) => c.id === commissionId);
    if (config) config.enabled = false;
  }

  /**
   * Enable a specific sub-adapter by commission id.
   */
  enableCommission(commissionId: string): void {
    const config = this.configs.find((c) => c.id === commissionId);
    if (config) config.enabled = true;
  }

  /**
   * Build a search URL for a specific commission.
   */
  buildSearchUrl(config: LrcCommissionConfig, query: string): string {
    return config.searchPattern.replace("{query}", encodeURIComponent(query));
  }

  /**
   * Fetch HTML from a URL. Isolated for testability.
   */
  protected async fetchHtml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Obiter/1.0 (AGLC4 Citation Tool; +https://obiter.com.au)",
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      throw new Error(`LRC fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    const enabled = this.getEnabledCommissions();

    // Filter by jurisdiction if specified
    const targeted = filters?.jurisdiction
      ? enabled.filter((c) => c.jurisdiction === filters.jurisdiction)
      : enabled;

    const allResults: LookupResult[] = [];

    // Search each commission sequentially to respect rate limits
    for (const config of targeted) {
      try {
        const url = this.buildSearchUrl(config, query);
        const html = await this.fetchHtml(url);
        const results = this.parseSearchResults(html, config);
        allResults.push(...results);
      } catch {
        // Individual commission failures should not block others
        continue;
      }
    }

    return allResults;
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    // Try to identify the commission from the citation
    const enabled = this.getEnabledCommissions();

    for (const config of enabled) {
      if (
        citation.includes(config.abbreviation) ||
        citation.toLowerCase().includes(config.name.toLowerCase())
      ) {
        try {
          const results = await this.searchCommission(config, citation);
          if (results.length > 0) {
            return this.resultToMetadata(results[0], config);
          }
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    // id format: "commission-id:report-url"
    const colonIdx = id.indexOf(":");
    if (colonIdx < 0) return null;

    const commissionId = id.substring(0, colonIdx);
    const config = this.configs.find((c) => c.id === commissionId);
    if (!config) return null;

    try {
      const url = id.substring(colonIdx + 1);
      const html = await this.fetchHtml(url);
      return this.parseDetailPage(html, config);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    // Check the first enabled commission as a health proxy
    const enabled = this.getEnabledCommissions();
    if (enabled.length === 0) return "offline";

    try {
      const res = await fetch(enabled[0].baseUrl, {
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

  private async searchCommission(
    config: LrcCommissionConfig,
    query: string,
  ): Promise<LookupResult[]> {
    const url = this.buildSearchUrl(config, query);
    const html = await this.fetchHtml(url);
    return this.parseSearchResults(html, config);
  }

  private parseSearchResults(
    html: string,
    config: LrcCommissionConfig,
  ): LookupResult[] {
    const results: LookupResult[] = [];
    // Generic pattern: look for links with "report" in text or URL
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]*(?:report|paper)[^<]*)<\/a>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].trim();
      if (!title) continue;

      const reportNum = extractReportNumber(title);
      const year = extractYear(title);
      const fullUrl = href.startsWith("http")
        ? href
        : `${config.baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;

      results.push({
        title: `${config.abbreviation} ${title}`,
        snippet: reportNum
          ? `${config.name}, Report ${reportNum}${year ? ` (${year})` : ""}`
          : title,
        sourceId: `${config.id}:${fullUrl}`,
        confidence: reportNum ? 0.7 : 0.4,
        sourceUrl: fullUrl,
        attribution: config.name,
      });
    }

    return results;
  }

  private resultToMetadata(
    result: LookupResult,
    config: LrcCommissionConfig,
  ): SourceMetadata {
    const reportNum = extractReportNumber(result.title);
    const year = extractYear(result.title);

    return {
      title: result.title,
      year,
      jurisdiction: config.jurisdiction,
      commission: config.name,
      commissionAbbreviation: config.abbreviation,
      reportNumber: reportNum,
      sourceUrl: result.sourceUrl,
    };
  }

  private parseDetailPage(
    html: string,
    config: LrcCommissionConfig,
  ): SourceMetadata | null {
    // Try to extract title from heading
    const headingMatch = html.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    const title = headingMatch?.[1]?.trim() || titleMatch?.[1]?.trim();

    if (!title) return null;

    const reportNum = extractReportNumber(html);
    const year = extractYear(title);

    return {
      title,
      year,
      jurisdiction: config.jurisdiction,
      commission: config.name,
      commissionAbbreviation: config.abbreviation,
      reportNumber: reportNum,
    };
  }
}
