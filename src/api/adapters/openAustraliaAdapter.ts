/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.24 — OpenAustralia Hansard Adapter
 *
 * Implements SourceAdapter against the OpenAustralia API.
 * Requires an API key stored in the key vault.
 * Coverage: 2006 onwards.
 *
 * Degrades gracefully when the API key is absent — returns empty results
 * rather than throwing errors.
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
// API response shapes (subset)
// ---------------------------------------------------------------------------

export interface OpenAustraliaMatch {
  gid?: string;
  hdate?: string;
  speaker?: {
    full_name?: string;
    party?: string;
    house?: string;
  };
  body?: string;
  debate?: {
    title?: string;
  };
  listurl?: string;
}

export interface OpenAustraliaResponse {
  rows?: OpenAustraliaMatch[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.openaustralia.org.au/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapMatchToMetadata(match: OpenAustraliaMatch): SourceMetadata {
  let year: number | undefined;
  if (match.hdate) {
    const parsed = new Date(match.hdate);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
    }
  }

  return {
    title: match.debate?.title,
    speaker: match.speaker?.full_name,
    chamber: match.speaker?.house === "representatives"
      ? "House of Representatives"
      : match.speaker?.house === "senate"
        ? "Senate"
        : match.speaker?.house,
    year,
    jurisdiction: "Cth",
    date: match.hdate,
    party: match.speaker?.party,
    debateTitle: match.debate?.title,
  };
}

/**
 * Strip HTML tags from OpenAustralia body text for snippets.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OpenAustraliaAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "openaustralia",
    displayName: "OpenAustralia",
    jurisdictions: ["Cth"],
    contentTypes: ["hansard"],
    accessTier: "live",
    licence: "OpenAustralia — see terms",
    requiresKey: true,
    rateLimitHint: { requestsPerSecond: 2, burst: 4 },
    fragile: false,
  };

  /**
   * Retrieve the API key from the key vault.
   * Extracted to a method so tests can override it.
   */
  protected getApiKey(): string {
    return getKey("openaustralia");
  }

  /**
   * Fetch JSON from the OpenAustralia API.
   * Extracted to a method so tests can override it.
   */
  protected async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`OpenAustralia API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Build an OpenAustralia API URL with key and parameters.
   */
  buildUrl(
    endpoint: string,
    params: Record<string, string>,
  ): string | null {
    const key = this.getApiKey();
    if (!key) return null;

    const searchParams = new URLSearchParams({ key, output: "js", ...params });
    return `${BASE_URL}/${endpoint}?${searchParams.toString()}`;
  }

  // -----------------------------------------------------------------------
  // Public API functions
  // -----------------------------------------------------------------------

  /**
   * Search Hansard debates by keyword.
   */
  async getDebates(
    query: string,
    filters?: SearchFilters,
  ): Promise<OpenAustraliaMatch[]> {
    const params: Record<string, string> = { search: query };
    if (filters?.yearFrom) params.date = `${filters.yearFrom}-01-01`;

    const url = this.buildUrl("getDebates", params);
    if (!url) return [];

    try {
      const data = await this.fetchJson<OpenAustraliaResponse>(url);
      return data.rows ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Search Hansard entries directly.
   */
  async getHansard(
    query: string,
    filters?: SearchFilters,
  ): Promise<OpenAustraliaMatch[]> {
    const params: Record<string, string> = { search: query };
    if (filters?.yearFrom) params.date = `${filters.yearFrom}-01-01`;

    const url = this.buildUrl("getHansard", params);
    if (!url) return [];

    try {
      const data = await this.fetchJson<OpenAustraliaResponse>(url);
      return data.rows ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get division (vote) records.
   */
  async getDivisions(
    query: string,
  ): Promise<OpenAustraliaMatch[]> {
    const url = this.buildUrl("getDivisions", { search: query });
    if (!url) return [];

    try {
      const data = await this.fetchJson<OpenAustraliaResponse>(url);
      return data.rows ?? [];
    } catch {
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // SourceAdapter interface
  // -----------------------------------------------------------------------

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    // Degrade gracefully when key is absent
    const key = this.getApiKey();
    if (!key) return [];

    const matches = await this.getHansard(query, filters);

    return matches.map((match, index) => ({
      title: match.debate?.title ?? "Hansard entry",
      snippet: [
        match.speaker?.full_name,
        match.speaker?.house,
        match.hdate,
        match.body ? stripHtml(match.body).slice(0, 100) : undefined,
      ]
        .filter(Boolean)
        .join(" — "),
      sourceId: match.gid ?? `openaustralia-${index}`,
      confidence: Math.max(0, 0.8 - index * 0.05),
      sourceUrl: match.listurl,
      attribution: "OpenAustralia",
    }));
  }

  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    // Degrade gracefully when key is absent
    const key = this.getApiKey();
    if (!key) return null;

    try {
      const url = this.buildUrl("getHansard", { gid: id });
      if (!url) return null;

      const data = await this.fetchJson<OpenAustraliaResponse>(url);
      const rows = data.rows ?? [];
      if (rows.length === 0) return null;

      return mapMatchToMetadata(rows[0]);
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    const key = this.getApiKey();
    if (!key) return "degraded";

    try {
      const url = this.buildUrl("getHansard", { search: "test" });
      if (!url) return "degraded";

      const res = await fetch(url, { method: "HEAD" });
      return res.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }
}
