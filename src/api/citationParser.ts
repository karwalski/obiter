/**
 * Citation Parser & MNC Tokeniser (Story 17.52)
 *
 * Deterministic (non-AI) parser for Australian legal citations.
 * Recognises medium neutral citations, authorised report citations,
 * statute references, and Hansard references per AGLC4 conventions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MNCToken {
  type: "mnc";
  year: number;
  court: string;
  number: number;
  /** The raw matched string. */
  raw: string;
}

export interface ReportCitation {
  type: "report";
  year: number;
  volume: number;
  series: string;
  page: number;
  raw: string;
}

export interface StatuteCitation {
  type: "statute";
  title: string;
  year: number;
  jurisdiction: string;
  raw: string;
}

export interface HansardCitation {
  type: "hansard";
  parliament: string;
  chamber: string;
  date: string;
  page: string;
  speaker?: string;
  raw: string;
}

export type ParsedCitation =
  | MNCToken
  | ReportCitation
  | StatuteCitation
  | HansardCitation;

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Medium Neutral Citation: [YYYY] CourtCode N */
const MNC_RE = /\[(\d{4})\]\s+([A-Z]{2,10})\s+(\d+)/;
const MNC_RE_G = /\[(\d{4})\]\s+([A-Z]{2,10})\s+(\d+)/g;

/** Authorised Report: (YYYY) VOL Series PAGE */
const REPORT_RE = /\((\d{4})\)\s+(\d+)\s+([A-Z][A-Za-z\s]+?)\s+(\d+)/;
const REPORT_RE_G = /\((\d{4})\)\s+(\d+)\s+([A-Z][A-Za-z\s]+?)\s+(\d+)/g;

/** Jurisdiction abbreviations recognised in statute citations. */
const JURISDICTIONS = ["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"];
const JURISDICTION_ALTERNATION = JURISDICTIONS.join("|");

/** Statute: Title YYYY (Jurisdiction) */
const STATUTE_RE = new RegExp(
  `([A-Z][A-Za-z\\s&'()]+?)\\s+(\\d{4})\\s+\\((${JURISDICTION_ALTERNATION})\\)`,
);
const STATUTE_RE_G = new RegExp(
  `([A-Z][A-Za-z\\s&'()]+?)\\s+(\\d{4})\\s+\\((${JURISDICTION_ALTERNATION})\\)`,
  "g",
);

/**
 * Hansard: Commonwealth/State, Parliamentary Debates, Chamber, Date, Page (Speaker)
 *
 * The pattern is intentionally generous — Hansard references vary in format.
 */
const HANSARD_RE =
  /((?:Commonwealth|New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Australian Capital Territory|Northern Territory)[^,]*),\s*Parliamentary Debates\s*,\s*([^,]+),\s*([^,]+),\s*(\d+)(?:\s*\(([^)]+)\))?/;
const HANSARD_RE_G =
  /((?:Commonwealth|New South Wales|Victoria|Queensland|Western Australia|South Australia|Tasmania|Australian Capital Territory|Northern Territory)[^,]*),\s*Parliamentary Debates\s*,\s*([^,]+),\s*([^,]+),\s*(\d+)(?:\s*\(([^)]+)\))?/g;

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Tokenise a medium neutral citation string.
 *
 * @returns An `MNCToken` if the text contains an MNC, or `null`.
 */
export function tokeniseMNC(text: string): MNCToken | null {
  const m = MNC_RE.exec(text);
  if (!m) return null;
  return {
    type: "mnc",
    year: parseInt(m[1], 10),
    court: m[2],
    number: parseInt(m[3], 10),
    raw: m[0],
  };
}

/**
 * Attempt to parse a single citation from `text`.
 *
 * Tries each citation type in order: MNC, authorised report, statute,
 * Hansard. Returns the first match, or `null` if nothing is recognised.
 */
export function parseCitation(text: string): ParsedCitation | null {
  // MNC
  const mnc = tokeniseMNC(text);
  if (mnc) return mnc;

  // Authorised report
  const rpt = REPORT_RE.exec(text);
  if (rpt) {
    return {
      type: "report",
      year: parseInt(rpt[1], 10),
      volume: parseInt(rpt[2], 10),
      series: rpt[3].trim(),
      page: parseInt(rpt[4], 10),
      raw: rpt[0],
    };
  }

  // Statute
  const stat = STATUTE_RE.exec(text);
  if (stat) {
    return {
      type: "statute",
      title: stat[1].trim(),
      year: parseInt(stat[2], 10),
      jurisdiction: stat[3],
      raw: stat[0],
    };
  }

  // Hansard
  const hans = HANSARD_RE.exec(text);
  if (hans) {
    return {
      type: "hansard",
      parliament: hans[1].trim(),
      chamber: hans[2].trim(),
      date: hans[3].trim(),
      page: hans[4],
      speaker: hans[5]?.trim(),
      raw: hans[0],
    };
  }

  return null;
}

/**
 * Find all citations in a block of text.
 *
 * Scans for every MNC, report, statute, and Hansard reference and returns
 * them in document order (by match index).
 */
export function findAllCitations(text: string): ParsedCitation[] {
  const hits: Array<{ index: number; citation: ParsedCitation }> = [];

  // MNCs
  let m: RegExpExecArray | null;
  // Reset lastIndex for global regexes
  MNC_RE_G.lastIndex = 0;
  while ((m = MNC_RE_G.exec(text)) !== null) {
    hits.push({
      index: m.index,
      citation: {
        type: "mnc",
        year: parseInt(m[1], 10),
        court: m[2],
        number: parseInt(m[3], 10),
        raw: m[0],
      },
    });
  }

  // Reports
  REPORT_RE_G.lastIndex = 0;
  while ((m = REPORT_RE_G.exec(text)) !== null) {
    hits.push({
      index: m.index,
      citation: {
        type: "report",
        year: parseInt(m[1], 10),
        volume: parseInt(m[2], 10),
        series: m[3].trim(),
        page: parseInt(m[4], 10),
        raw: m[0],
      },
    });
  }

  // Statutes
  STATUTE_RE_G.lastIndex = 0;
  while ((m = STATUTE_RE_G.exec(text)) !== null) {
    hits.push({
      index: m.index,
      citation: {
        type: "statute",
        title: m[1].trim(),
        year: parseInt(m[2], 10),
        jurisdiction: m[3],
        raw: m[0],
      },
    });
  }

  // Hansard
  HANSARD_RE_G.lastIndex = 0;
  while ((m = HANSARD_RE_G.exec(text)) !== null) {
    hits.push({
      index: m.index,
      citation: {
        type: "hansard",
        parliament: m[1].trim(),
        chamber: m[2].trim(),
        date: m[3].trim(),
        page: m[4],
        speaker: m[5]?.trim(),
        raw: m[0],
      },
    });
  }

  // Sort by position in text
  hits.sort((a, b) => a.index - b.index);
  return hits.map((h) => h.citation);
}
