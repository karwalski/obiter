// LEGAL: This adapter constructs URLs only. No HTTP requests to austlii.edu.au.
// AustLII Usage Policy prohibits automated access.

/**
 * AustLII Deep-Link Constructor (Story 17.36)
 *
 * A link-only adapter that deterministically constructs AustLII URLs from
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

/**
 * Mapping from court codes to their AustLII path segments.
 * Format: /au/cases/{jurisdiction}/{court}/
 */
const COURT_PATH_MAP: Record<string, string> = {
  // Commonwealth
  HCA: "cth/HCA",
  FCA: "cth/FCA",
  FCAFC: "cth/FCAFC",
  FamCA: "cth/FamCA",
  FCFCOA: "cth/FCFCOA",

  // New South Wales
  NSWSC: "nsw/NSWSC",
  NSWCA: "nsw/NSWCA",

  // Victoria
  VSC: "vic/VSC",
  VSCA: "vic/VSCA",

  // Queensland
  QSC: "qld/QSC",
  QCA: "qld/QCA",

  // Western Australia
  WASC: "wa/WASC",
  WASCA: "wa/WASCA",

  // South Australia
  SASC: "sa/SASC",
  SASCFC: "sa/SASCFC",

  // Tasmania
  TASSC: "tas/TASSC",
  TASCCA: "tas/TASCCA",

  // Australian Capital Territory
  ACTSC: "act/ACTSC",
  ACTCA: "act/ACTCA",

  // Northern Territory
  NTSC: "nt/NTSC",
  NTCA: "nt/NTCA",
};

/** MNC pattern: [YYYY] CourtCode Number */
const MNC_PATTERN = /\[(\d{4})]\s+([A-Za-z]+)\s+(\d+)/;

/**
 * Construct the canonical AustLII URL for a case given its court code, year,
 * and decision number.
 *
 * Returns `null` if the court code is not in the known mapping.
 */
export function buildAustliiUrl(
  court: string,
  year: number,
  number: number,
): string | null {
  const pathSegment = COURT_PATH_MAP[court];
  if (!pathSegment) {
    return null;
  }
  return `https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/${pathSegment}/${year}/${number}.html`;
}

export class AustliiLinkAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "austlii-link",
    displayName: "AustLII",
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
   * Parse a medium-neutral citation and construct the AustLII deep-link URL.
   * Returns metadata with the sourceUrl populated, or null if the citation
   * cannot be parsed or the court code is unknown.
   */
  async resolve(citation: string): Promise<SourceMetadata | null> {
    const match = MNC_PATTERN.exec(citation);
    if (!match) {
      return null;
    }

    const year = parseInt(match[1], 10);
    const court = match[2];
    const number = parseInt(match[3], 10);

    const url = buildAustliiUrl(court, year, number);
    if (!url) {
      return null;
    }

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
