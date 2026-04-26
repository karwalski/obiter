/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * WA Supreme Court RSS Adapter (Story 17.20)
 *
 * Implements SourceAdapter against the WA Supreme Court's
 * subscription RSS feed for recent judgments.
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

/** RSS feed URL for WA Supreme Court judgments. */
const WA_SC_RSS_URL =
  "https://ecourts.justice.wa.gov.au/eCourtsPortal/Decisions/rss";

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

export class WaScRssAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "wa-sc-rss",
    displayName: "WA Supreme Court RSS",
    jurisdictions: ["WA"],
    contentTypes: ["case"],
    accessTier: "live",
    licence: "WA Crown Copyright",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 3 },
    fragile: true,
  };

  /**
   * Fetch the RSS feed. Extracted to a method so tests can override it.
   */
  protected async fetchFeed(): Promise<RssItem[]> {
    const res = await fetch(WA_SC_RSS_URL);
    if (!res.ok) {
      throw new Error(`WA SC RSS fetch failed: ${res.status} ${res.statusText}`);
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
          attribution: "Supreme Court of Western Australia",
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
      const res = await fetch(WA_SC_RSS_URL, { method: "HEAD" });
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
      jurisdiction: "WA",
    };
  }
}
