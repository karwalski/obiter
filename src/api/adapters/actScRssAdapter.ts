/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ACT Supreme Court RSS Adapter (Story 17.19)
 *
 * Implements SourceAdapter against the data.gov.au dataset for
 * ACT Supreme Court judgments, served as an RSS feed.
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
import { parseRssItems } from "./fcaRssAdapter";

/** RSS feed URL for ACT Supreme Court judgments on data.gov.au. */
const ACT_SC_RSS_URL =
  "https://data.gov.au/data/dataset/act-supreme-court-judgments/resource/rss";

/** Thirty days in milliseconds. */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class ActScRssAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "act-sc-rss",
    displayName: "ACT Supreme Court RSS",
    jurisdictions: ["ACT"],
    contentTypes: ["case"],
    accessTier: "open",
    licence: "CC BY 3.0 AU",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 3 },
    fragile: true,
  };

  /**
   * Fetch the RSS feed. Extracted to a method so tests can override it.
   */
  protected async fetchFeed(): Promise<RssItem[]> {
    const res = await fetch(ACT_SC_RSS_URL);
    if (!res.ok) {
      throw new Error(`ACT SC RSS fetch failed: ${res.status} ${res.statusText}`);
    }
    const xml = await res.text();
    return parseRssItems(xml);
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const items = await this.fetchFeed();
    const lowerQuery = query.toLowerCase();
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    return items
      .filter((item) => {
        if (lowerQuery && !item.title.toLowerCase().includes(lowerQuery)) {
          return false;
        }
        const pubTime = new Date(item.pubDate).getTime();
        if (pubTime < cutoff) {
          return false;
        }
        return true;
      })
      .map((item) => {
        const mnc = tokeniseMNC(item.title);
        return {
          title: item.title,
          snippet: item.description || item.title,
          sourceId: item.link,
          confidence: mnc ? 0.9 : 0.7,
          sourceUrl: item.link,
          attribution: "ACT Supreme Court (data.gov.au)",
        };
      });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    const mnc = tokeniseMNC(citation);
    if (!mnc) return null;

    const items = await this.fetchFeed();

    for (const item of items) {
      const itemMnc = tokeniseMNC(item.title);
      if (
        itemMnc &&
        itemMnc.year === mnc.year &&
        itemMnc.court === mnc.court &&
        itemMnc.number === mnc.number
      ) {
        return this.itemToMetadata(item, itemMnc);
      }
    }

    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    const items = await this.fetchFeed();
    const item = items.find((i) => i.link === id);
    if (!item) return null;

    const mnc = tokeniseMNC(item.title);
    return this.itemToMetadata(item, mnc);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(ACT_SC_RSS_URL, { method: "HEAD" });
      return res.ok ? "healthy" : "degraded";
    } catch {
      return "offline";
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private itemToMetadata(
    item: RssItem,
    mnc: ReturnType<typeof tokeniseMNC>,
  ): SourceMetadata {
    return {
      title: item.title,
      parties: item.title.split("[")[0]?.trim() || item.title,
      year: mnc?.year,
      court: mnc?.court,
      mnc: mnc?.raw,
      jurisdiction: "ACT",
    };
  }
}
