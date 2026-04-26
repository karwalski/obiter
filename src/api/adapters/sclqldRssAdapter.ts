/**
 * SCLQLD RSS Adapter (Story 17.18)
 *
 * Implements SourceAdapter against the Supreme Court Library Queensland's
 * public RSS feeds for QSC, QCA, and QCAT decisions.
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

/** RSS feed base URL. */
const SCLQLD_BASE = "https://www.sclqld.org.au/caselaw/rss";

/** Individual court feeds. */
const SCLQLD_FEEDS = [
  `${SCLQLD_BASE}/QSC`,
  `${SCLQLD_BASE}/QCA`,
  `${SCLQLD_BASE}/QCAT`,
];

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

export class SclqldRssAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "sclqld-rss",
    displayName: "Qld Courts RSS",
    jurisdictions: ["Qld"],
    contentTypes: ["case"],
    accessTier: "live",
    licence: "State of Queensland — open access",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 3 },
    fragile: true,
  };

  /**
   * Fetch all three SCLQLD feeds and merge items.
   * Extracted to a method so tests can override it.
   */
  protected async fetchAllFeeds(): Promise<RssItem[]> {
    const results = await Promise.allSettled(
      SCLQLD_FEEDS.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssItems(xml);
      }),
    );

    const items: RssItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        items.push(...result.value);
      }
    }
    return items;
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const items = await this.fetchAllFeeds();
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
          attribution: "Supreme Court Library Queensland",
        };
      });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    const mnc = tokeniseMNC(citation);
    if (!mnc) return null;

    const items = await this.fetchAllFeeds();

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
    const items = await this.fetchAllFeeds();
    const item = items.find((i) => i.link === id);
    if (!item) return null;

    const mnc = tokeniseMNC(item.title);
    return this.itemToMetadata(item, mnc);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      // Check the first feed as a health proxy
      const res = await fetch(SCLQLD_FEEDS[0], { method: "HEAD" });
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
      jurisdiction: "Qld",
    };
  }
}
