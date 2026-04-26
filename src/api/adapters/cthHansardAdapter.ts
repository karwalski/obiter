/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * 17.23 — Cth Hansard ParlInfo XML Adapter
 *
 * Implements SourceAdapter against ParlInfo XML links for Commonwealth
 * Parliament Hansard.
 *
 * CRITICAL LICENCE CONSTRAINT:
 *   Cth Hansard is CC BY-NC-ND 3.0 AU.
 *   - NO IndexedDB persistence
 *   - Session-only memory cache
 *   - NO cloud replication
 *
 * The `noPersist` flag on the descriptor signals to the cache layer and
 * orchestrator that results from this adapter must NOT be written to
 * IndexedDB or replicated.
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
// ParlInfo response shapes (subset)
// ---------------------------------------------------------------------------

export interface ParlInfoHansardEntry {
  id?: string;
  date?: string;
  chamber?: string;
  speaker?: string;
  party?: string;
  electorate?: string;
  page?: string;
  debateTitle?: string;
  content?: string;
  url?: string;
}

export interface ParlInfoSearchResponse {
  results?: ParlInfoHansardEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "https://parlinfo.aph.gov.au/parlInfo/feeds/rss.w3p";

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

/**
 * Minimal XML tag extractor. ParlInfo returns XML; we extract fields
 * without requiring a DOM parser for Node/browser portability.
 */
export function extractXmlTag(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`,
  );
  const m = re.exec(xml);
  return m ? m[1].trim() : "";
}

/**
 * Parse a ParlInfo XML response into structured entries.
 */
export function parseParlInfoEntries(xml: string): ParlInfoHansardEntry[] {
  const entries: ParlInfoHansardEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    entries.push({
      id: extractXmlTag(block, "guid") || extractXmlTag(block, "link"),
      date: extractXmlTag(block, "pubDate") || extractXmlTag(block, "date"),
      chamber: extractXmlTag(block, "chamber"),
      speaker: extractXmlTag(block, "speaker"),
      party: extractXmlTag(block, "party"),
      electorate: extractXmlTag(block, "electorate"),
      page: extractXmlTag(block, "page"),
      debateTitle: extractXmlTag(block, "title"),
      content: extractXmlTag(block, "description"),
      url: extractXmlTag(block, "link"),
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapEntryToMetadata(entry: ParlInfoHansardEntry): SourceMetadata {
  let year: number | undefined;
  if (entry.date) {
    const parsed = new Date(entry.date);
    if (!isNaN(parsed.getTime())) {
      year = parsed.getFullYear();
    }
  }

  return {
    title: entry.debateTitle,
    speaker: entry.speaker,
    chamber: entry.chamber,
    page: entry.page,
    year,
    jurisdiction: "Cth",
    date: entry.date,
    party: entry.party,
    electorate: entry.electorate,
    debateTitle: entry.debateTitle,
  };
}

// ---------------------------------------------------------------------------
// Session-only memory cache (CC BY-NC-ND 3.0 AU — no persistent storage)
// ---------------------------------------------------------------------------

const sessionCache = new Map<string, SourceMetadata>();

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class CthHansardAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor & { noPersist: true } = {
    id: "cth-hansard",
    displayName: "Cth Hansard (ParlInfo)",
    jurisdictions: ["Cth"],
    contentTypes: ["hansard"],
    accessTier: "live",
    licence: "CC BY-NC-ND 3.0 AU",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
    /**
     * CRITICAL: Signals that results from this adapter must NOT be
     * persisted to IndexedDB or replicated to cloud storage.
     * The CC BY-NC-ND 3.0 AU licence prohibits derivative works
     * and commercial use. Session-only memory cache only.
     */
    noPersist: true,
  };

  /**
   * Fetch XML from ParlInfo.
   * Extracted to a method so tests can override it.
   */
  protected async fetchXml(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: { Accept: "application/xml, text/xml" },
    });
    if (!res.ok) {
      throw new Error(`ParlInfo fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  /**
   * Build the ParlInfo search URL.
   */
  buildSearchUrl(query: string, filters?: SearchFilters): string {
    const params = new URLSearchParams({
      adv: "yes",
      orderBy: "date-eFirst",
      query: query,
      type: "hansard",
    });

    if (filters?.yearFrom) {
      params.set("startDate", `01/01/${filters.yearFrom}`);
    }
    if (filters?.yearTo) {
      params.set("endDate", `31/12/${filters.yearTo}`);
    }

    return `${BASE_URL}?${params.toString()}`;
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    const url = this.buildSearchUrl(query, filters);
    const xml = await this.fetchXml(url);
    const entries = parseParlInfoEntries(xml);

    return entries.map((entry, index) => {
      const result: LookupResult = {
        title: entry.debateTitle ?? entry.content?.slice(0, 80) ?? "Hansard entry",
        snippet: [entry.speaker, entry.chamber, entry.date]
          .filter(Boolean)
          .join(" — "),
        sourceId: entry.id ?? `cth-hansard-${index}`,
        confidence: Math.max(0, 0.8 - index * 0.05),
        sourceUrl: entry.url,
        attribution: "Commonwealth of Australia, CC BY-NC-ND 3.0 AU",
      };

      // Cache in session memory (not persistent)
      if (entry.id) {
        sessionCache.set(entry.id, mapEntryToMetadata(entry));
      }

      return result;
    });
  }

  async resolve(_citation: string): Promise<SourceMetadata | null> {
    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    // Check session cache first
    const cached = sessionCache.get(id);
    if (cached) return cached;

    try {
      const url = id.startsWith("http") ? id : `${BASE_URL}?id=${encodeURIComponent(id)}`;
      const xml = await this.fetchXml(url);
      const entries = parseParlInfoEntries(xml);
      if (entries.length === 0) return null;

      const meta = mapEntryToMetadata(entries[0]);
      // Store in session cache only — no IndexedDB
      sessionCache.set(id, meta);
      return meta;
    } catch {
      return null;
    }
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const url = this.buildSearchUrl("test");
      const res = await fetch(url, { method: "HEAD" });
      return res.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }

  /**
   * Clear the session-only memory cache.
   * Exposed for testing and for the UI to call on sign-out.
   */
  clearSessionCache(): void {
    sessionCache.clear();
  }
}
