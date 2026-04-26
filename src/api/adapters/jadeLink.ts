// LEGAL: This adapter constructs URLs only. No HTTP requests to jade.io.
// Jade ToS prohibit automated access.

/**
 * Jade.io Deep-Link Constructor (Story 17.37)
 *
 * A link-only adapter that deterministically constructs Jade.io URLs from
 * medium-neutral citation metadata. Never makes HTTP requests.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

/** MNC pattern: [YYYY] CourtCode Number */
const MNC_PATTERN = /\[(\d{4})]\s+([A-Za-z]+)\s+(\d+)/;

/**
 * Construct the canonical Jade.io URL for a case given its court code, year,
 * and decision number.
 *
 * Jade.io uses a flat URL scheme: jade.io/article/{courtCode}/{year}/{number}
 * This works for any court code — no mapping table required.
 */
export function buildJadeUrl(
  court: string,
  year: number,
  number: number,
): string {
  return `https://jade.io/article/${court}/${year}/${number}`;
}

export class JadeLinkAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "jade-link",
    displayName: "Jade.io",
    jurisdictions: ["AU"],
    contentTypes: ["case"],
    accessTier: "link-only",
    licence: "Link-only — no content retrieved",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 0, burst: 0 },
    fragile: false,
  };

  /** Link-only adapter — no search capability. */
  async search(_query: string, _filters?: SearchFilters): Promise<LookupResult[]> {
    return [];
  }

  /**
   * Parse a medium-neutral citation and construct the Jade.io deep-link URL.
   * Returns metadata with the sourceUrl populated, or null if the citation
   * cannot be parsed.
   */
  async resolve(citation: string): Promise<SourceMetadata | null> {
    const match = MNC_PATTERN.exec(citation);
    if (!match) {
      return null;
    }

    const year = parseInt(match[1], 10);
    const court = match[2];
    const number = parseInt(match[3], 10);

    const url = buildJadeUrl(court, year, number);

    return {
      mnc: `[${year}] ${court} ${number}`,
      year,
      court,
      jurisdiction: "AU",
      sourceUrl: url,
    };
  }

  /** Link-only adapter — no metadata retrieval. */
  async getMetadata(_id: string): Promise<SourceMetadata | null> {
    return null;
  }

  /** Always healthy — no external dependency. */
  async healthcheck(): Promise<AdapterHealth> {
    return "healthy";
  }
}
