/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * NSW Caselaw JSON Adapter (Story 17.22)
 *
 * Implements SourceAdapter against the NSW Caselaw search API.
 * Endpoint knowledge derived from Sydney-Informatics-Hub/nswcaselaw
 * (MIT licence for the client code; data is Crown Copyright NSW).
 *
 * This adapter self-disables if NSW Caselaw publishes contrary access
 * policy — check descriptor.fragile.
 *
 * Rate limit: 0.1 RPS (10-second pause between requests).
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";
import { tokeniseMNC } from "../citationParser";

/** Base URL for NSW Caselaw. */
const NSW_CASELAW_BASE = "https://www.caselaw.nsw.gov.au";

/** Search endpoint. */
const NSW_CASELAW_SEARCH = `${NSW_CASELAW_BASE}/search/advanced`;

/** Descriptive User-Agent per story requirements. */
const USER_AGENT = "Obiter AGLC4 Add-in (https://obiter.com.au)";

// ---------------------------------------------------------------------------
// JSON response types (based on observed API shape)
// ---------------------------------------------------------------------------

export interface NswCaselawDecision {
  decisionDate?: string;
  caseTitle?: string;
  catchwords?: string;
  mnc?: string;
  uri?: string;
  jurisdiction?: string;
  court?: string;
  fileNumber?: string;
}

export interface NswCaselawSearchResponse {
  results?: NswCaselawDecision[];
  totalResults?: number;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class NswCaselawAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "nsw-caselaw",
    displayName: "NSW Caselaw",
    jurisdictions: ["NSW"],
    contentTypes: ["case"],
    accessTier: "live",
    licence: "Crown Copyright (NSW)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 0.1, burst: 1 },
    fragile: true,
  };

  /**
   * Build a search query URL with the given parameters.
   */
  buildSearchUrl(params: {
    body?: string;
    title?: string;
    citation?: string;
    party?: string;
    startDate?: string;
    endDate?: string;
    fileNumber?: string;
  }): string {
    const url = new URL(NSW_CASELAW_SEARCH);
    if (params.body) url.searchParams.set("body", params.body);
    if (params.title) url.searchParams.set("title", params.title);
    if (params.citation) url.searchParams.set("mnc", params.citation);
    if (params.party) url.searchParams.set("party", params.party);
    if (params.startDate) url.searchParams.set("startDate", params.startDate);
    if (params.endDate) url.searchParams.set("endDate", params.endDate);
    if (params.fileNumber) url.searchParams.set("fileNumber", params.fileNumber);
    return url.toString();
  }

  /**
   * Build a decision URL from a URI path.
   */
  buildDecisionUrl(uri: string): string {
    if (uri.startsWith("http")) return uri;
    return `${NSW_CASELAW_BASE}${uri.startsWith("/") ? "" : "/"}${uri}`;
  }

  /**
   * Fetch JSON from the NSW Caselaw API. Isolated for testability.
   */
  protected async fetchJson(url: string): Promise<NswCaselawSearchResponse> {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`NSW Caselaw fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<NswCaselawSearchResponse>;
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    try {
      // Detect if query looks like an MNC
      const mnc = tokeniseMNC(query);
      const params: Record<string, string> = {};

      if (mnc) {
        params.citation = query;
      } else {
        params.body = query;
      }

      if (filters?.yearFrom) {
        params.startDate = `${filters.yearFrom}-01-01`;
      }
      if (filters?.yearTo) {
        params.endDate = `${filters.yearTo}-12-31`;
      }

      const url = this.buildSearchUrl(params);
      const data = await this.fetchJson(url);

      return (data.results || []).map((decision) => {
        const parsedMnc = decision.mnc ? tokeniseMNC(decision.mnc) : null;
        const decisionUrl = decision.uri
          ? this.buildDecisionUrl(decision.uri)
          : undefined;

        return {
          title: decision.caseTitle || decision.mnc || "Untitled",
          snippet: decision.catchwords || decision.caseTitle || "",
          sourceId: decision.uri || decision.mnc || "",
          confidence: parsedMnc ? 0.9 : 0.7,
          sourceUrl: decisionUrl,
          attribution: "NSW Caselaw",
        };
      });
    } catch {
      return [];
    }
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    try {
      const mnc = tokeniseMNC(citation);
      if (!mnc) return null;

      const url = this.buildSearchUrl({ citation });
      const data = await this.fetchJson(url);

      const results = data.results || [];
      if (results.length === 0) return null;

      return this.decisionToMetadata(results[0]);
    } catch {
      return null;
    }
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    try {
      // id may be a URI path — search by it
      const url = this.buildSearchUrl({ citation: id });
      const data = await this.fetchJson(url);

      const results = data.results || [];
      if (results.length === 0) return null;

      return this.decisionToMetadata(results[0]);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(NSW_CASELAW_BASE, {
        method: "HEAD",
        headers: { "User-Agent": USER_AGENT },
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

  private decisionToMetadata(decision: NswCaselawDecision): SourceMetadata {
    const mnc = decision.mnc ? tokeniseMNC(decision.mnc) : null;
    const yearMatch = decision.decisionDate?.match(/^(\d{4})/);

    return {
      title: decision.caseTitle || decision.mnc || "",
      parties: decision.caseTitle?.split("[")[0]?.trim(),
      year: mnc?.year || (yearMatch ? parseInt(yearMatch[1], 10) : undefined),
      court: mnc?.court || decision.court,
      mnc: mnc?.raw || decision.mnc,
      jurisdiction: "NSW",
      sourceUrl: decision.uri
        ? this.buildDecisionUrl(decision.uri)
        : undefined,
    };
  }
}
