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

// ---------------------------------------------------------------------------
// Legislative history (AGLC4 Rule 3.8) — opt-in hybrid detection
// ---------------------------------------------------------------------------

/**
 * A single statute reference within a legislative-history relationship: title,
 * year, jurisdiction, optional `(No N)` number, and a raw pinpoint string.
 */
export interface StatuteRef {
  title: string;
  year: number;
  jurisdiction: string;
  number?: string;
  /** Raw pinpoint text as written, e.g. "s 7", "ss 7(2)–(4)", "sch 6 item 11". */
  pinpoint?: string;
}

/**
 * A parsed AGLC4 Rule 3.8 hybrid: a lead statute linked to a related statute
 * by a directional connector (or a solo "as enacted" / "as at" tail).
 */
export interface LegislativeHistoryCitation {
  type: "legislative-history";
  connector: string;
  lead: StatuteRef;
  /** Omitted for the solo connectors "as enacted" and "as at". */
  related?: StatuteRef;
  /** Full date captured for the "as at" connector, e.g. "28 June 1994". */
  asAtDate?: string;
  raw: string;
}

/**
 * The closed Rule 3.8 connector set, ordered longest-first so the combined
 * matcher prefers the more specific phrase (e.g. "later amended by" over
 * "amended by", "as amended by" over "amended by").
 */
const LEG_HISTORY_CONNECTORS = [
  "later amended by",
  "as amended by",
  "as repealed by",
  "as inserted by",
  "as enacted",
  "amended by",
  "repealed by",
  "amending",
  "repealing",
  "inserting",
  "as at",
] as const;

/** Connectors that stand alone with no related Act (Rule 3.8). */
const SOLO_CONNECTORS = new Set(["as enacted", "as at"]);

/**
 * Connector matcher. AGLC4 requires the connector to be "preceded by a comma",
 * which also disambiguates "amended by" from "later amended by" / "as amended
 * by" (only the intended phrase immediately follows the comma).
 */
const LEG_HISTORY_CONNECTOR_RE = new RegExp(
  `,\\s*(${LEG_HISTORY_CONNECTORS.join("|")})\\b`,
  "i",
);

/** Single statute reference: Title [ (No N) ] YYYY (Jurisdiction) [pinpoint]. */
const STATUTE_REF_RE = new RegExp(
  `^\\s*(.+?)\\s+(\\d{4})\\s+\\((${JURISDICTION_ALTERNATION})\\)\\s*(.*?)\\s*$`,
);

/**
 * Parse a single statute reference into its structured parts.
 *
 * The jurisdiction is anchored to the parenthetical that follows the year, so a
 * title containing its own parentheses — `(Raising the Bar)`, `(No 2)` — is not
 * mistaken for the jurisdiction. A leading article ("the") on the title is
 * stripped (AGLC4 omits it), and a trailing `(No N)` is lifted into `number`.
 *
 * @returns A `StatuteRef`, or `null` if the text is not a statute reference.
 */
export function parseStatuteRef(text: string): StatuteRef | null {
  const m = STATUTE_REF_RE.exec(text.trim());
  if (!m) return null;

  let title = m[1].trim().replace(/^the\s+/i, "");
  let number: string | undefined;

  // Lift a trailing "(No N)" out of the title into its own field.
  const numMatch = title.match(/\s*\((No\s+\d+)\)$/i);
  if (numMatch) {
    number = `(${numMatch[1]})`;
    title = title.slice(0, numMatch.index).trim();
  }

  const pinpoint = m[4].trim() || undefined;

  return {
    title,
    year: parseInt(m[2], 10),
    jurisdiction: m[3],
    ...(number ? { number } : {}),
    ...(pinpoint ? { pinpoint } : {}),
  };
}

/**
 * Detect and parse an AGLC4 Rule 3.8 legislative-history hybrid.
 *
 * Returns `null` when the text contains no Rule 3.8 connector — i.e. a plain
 * single-Act citation, which is the default form (DECISION-008). A connector is
 * never synthesised; only an explicit "…, as amended by …" / "…, amending …"
 * (etc.) is recognised as a hybrid.
 *
 * @returns A `LegislativeHistoryCitation`, or `null`.
 */
export function parseLegislativeHistory(
  text: string,
): LegislativeHistoryCitation | null {
  // Drop a single trailing sentence full stop (AGLC4 uses none in citations).
  const raw = text.trim().replace(/\.$/, "");

  const m = LEG_HISTORY_CONNECTOR_RE.exec(raw);
  if (!m) return null;

  const connector = m[1].toLowerCase();
  const leadText = raw.slice(0, m.index);
  const tail = raw.slice(m.index + m[0].length).trim();

  const lead = parseStatuteRef(leadText);
  if (!lead) return null;

  if (SOLO_CONNECTORS.has(connector)) {
    return {
      type: "legislative-history",
      connector,
      lead,
      ...(connector === "as at" && tail ? { asAtDate: tail } : {}),
      raw,
    };
  }

  const related = parseStatuteRef(tail);
  if (!related) return null;

  return { type: "legislative-history", connector, lead, related, raw };
}
