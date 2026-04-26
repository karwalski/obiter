/**
 * Federal Court RSS Adapter (Story 17.17)
 *
 * Implements SourceAdapter against the Federal Court of Australia's
 * public RSS feed for recent judgments.
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

/** RSS feed URL for FCA judgments. */
const FCA_RSS_URL =
  "https://www.fedcourt.gov.au/digital-law-library/judgments/rss/fca-judgments";

/** Thirty days in milliseconds. */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// RSS XML helpers
// ---------------------------------------------------------------------------

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

/**
 * Minimal RSS XML parser.
 *
 * Extracts `<item>` elements and their `<title>`, `<link>`, `<pubDate>`,
 * and `<description>` children. Does not depend on DOMParser so it works
 * in Node and browser environments.
 */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const block = itemMatch[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");

    items.push({ title, link, pubDate, description });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`);
  const m = re.exec(xml);
  return m ? m[1].trim() : "";
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class FcaRssAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "fca-rss",
    displayName: "Federal Court RSS",
    jurisdictions: ["Cth"],
    contentTypes: ["case"],
    accessTier: "live",
    licence: "Commonwealth of Australia — open access",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 3 },
    fragile: true,
  };

  /**
   * Fetch the RSS feed. Extracted to a method so tests can override it.
   */
  protected async fetchFeed(): Promise<string> {
    const res = await fetch(FCA_RSS_URL);
    if (!res.ok) {
      throw new Error(`FCA RSS fetch failed: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  async search(query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    const xml = await this.fetchFeed();
    const items = parseRssItems(xml);
    const lowerQuery = query.toLowerCase();
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    return items
      .filter((item) => {
        // Filter by query match against title
        if (lowerQuery && !item.title.toLowerCase().includes(lowerQuery)) {
          return false;
        }
        // Filter to last 30 days
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
          attribution: "Federal Court of Australia",
        };
      });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    const mnc = tokeniseMNC(citation);
    if (!mnc) return null;

    const xml = await this.fetchFeed();
    const items = parseRssItems(xml);

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
    // id is the link URL; re-fetch feed and match
    const xml = await this.fetchFeed();
    const items = parseRssItems(xml);
    const item = items.find((i) => i.link === id);
    if (!item) return null;

    const mnc = tokeniseMNC(item.title);
    return this.itemToMetadata(item, mnc);
  }

  async healthcheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(FCA_RSS_URL, { method: "HEAD" });
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
      jurisdiction: "Cth",
    };
  }
}
