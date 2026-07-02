/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part II — Domestic Legislation: Supplementary Rules (Rules 3.3–3.9)
 *
 * Pure formatting functions for delegated legislation, short titles,
 * subsequent references, constitutions, explanatory memoranda,
 * legislative history, and quasi-legislative materials.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";
import { formatLegislationPinpoint, formatStatute, formatBill } from "./legislation";

// ─── LEG-005: Order of Parallel Australian Statutes (Rule 3.3) — PLACEHOLDER ─

/**
 * AGLC4 Rule 3.3: When citing statutes from multiple Australian
 * jurisdictions in parallel, Commonwealth legislation is cited first,
 * followed by states and territories in alphabetical order.
 */
export const PARALLEL_STATUTE_ORDER_GUIDANCE =
  "Cth first, then alphabetical by state/territory: ACT, NSW, NT, Qld, SA, Tas, Vic, WA";

/** Canonical jurisdiction order per AGLC4 Rule 3.3. */
const JURISDICTION_ORDER: readonly string[] = [
  "Cth",
  "ACT",
  "NSW",
  "NT",
  "Qld",
  "SA",
  "Tas",
  "Vic",
  "WA",
];

/**
 * Validates whether a list of jurisdictions is in the correct AGLC4 order.
 *
 * AGLC4 Rule 3.3: Commonwealth legislation is cited first, followed by
 * states and territories in alphabetical order.
 *
 * @param jurisdictions - Array of jurisdiction abbreviations to check
 * @returns Object with `valid` flag and `suggested` reordering
 */
export function validateStatuteOrder(jurisdictions: string[]): {
  valid: boolean;
  suggested: string[];
} {
  const suggested = [...jurisdictions].sort((a, b) => {
    const indexA = JURISDICTION_ORDER.indexOf(a);
    const indexB = JURISDICTION_ORDER.indexOf(b);
    // Unknown jurisdictions sort to the end, preserving relative order
    const posA = indexA === -1 ? JURISDICTION_ORDER.length : indexA;
    const posB = indexB === -1 ? JURISDICTION_ORDER.length : indexB;
    return posA - posB;
  });

  const valid = jurisdictions.every((j, i) => j === suggested[i]);

  return { valid, suggested };
}

// ─── LEG-006: Delegated Legislation (Rule 3.4) ──────────────────────────────

/**
 * Formats a delegated legislation citation.
 *
 * AGLC4 Rule 3.4: Delegated legislation (regulations, rules, orders, etc.)
 * is cited in the same manner as statutes: title and year in italics,
 * followed by the jurisdiction abbreviation in parentheses (not italicised).
 *
 * @example
 *   formatDelegatedLegislation({ title: "Competition and Consumer Regulations", year: 2010, jurisdiction: "Cth" })
 *   => [{ text: "Competition and Consumer Regulations 2010", italic: true }, { text: " (Cth)" }]
 */
export function formatDelegatedLegislation(data: {
  title: string;
  year: number;
  jurisdiction: string;
}): FormattedRun[] {
  return [
    { text: `${data.title} ${data.year}`, italic: true },
    { text: ` (${data.jurisdiction})` },
  ];
}

// ─── LEG-007: Short Titles and Subsequent References (Rule 3.5) ──────────────

/**
 * Formats a legislation short title for use immediately after the first citation.
 *
 * AGLC4 Rule 3.5: A short title is introduced within single inverted commas
 * inside parentheses after the initial citation. The short title itself is
 * italicised according to this chapter's rules (italic for Acts and delegated
 * legislation, roman for Bills); the parentheses and quotation marks are roman.
 *
 * AGLC4 Example 45: `Property Law Act 1958 (Vic) s 6 ('Property Act')` —
 * only "Property Act" is italic.
 *
 * @param shortTitle - The short title being introduced
 * @param italicTitle - Whether the short title is italicised (default true;
 *   pass false for Bills per Rules 3.2 and 3.5)
 */
export function formatLegislationShortTitle(
  shortTitle: string,
  italicTitle = true
): FormattedRun[] {
  if (!italicTitle) {
    return [{ text: ` (‘${shortTitle}’)` }];
  }
  return [{ text: " (‘" }, { text: shortTitle, italic: true }, { text: "’)" }];
}

/**
 * Formats a subsequent reference to legislation using a previously
 * introduced short title.
 *
 * AGLC4 Rule 3.5: Subsequent references use the short title (italicised per
 * this chapter's rules: italic for Acts/delegated legislation, roman for
 * Bills) followed by a cross-reference to the footnote in which the
 * legislation was first cited, in the form `(n X)`, plus an optional pinpoint.
 *
 * @example
 *   formatLegislationSubsequentRef("CCA", 1, { type: "section", value: "52" })
 *   => [{ text: "CCA", italic: true }, { text: " (n 1) s 52" }]
 *
 *   formatLegislationSubsequentRef("CCA", 1)
 *   => [{ text: "CCA", italic: true }, { text: " (n 1)" }]
 *
 * @param shortTitle - The previously introduced short title
 * @param footnoteNumber - The footnote in which the material was first cited
 * @param pinpoint - Optional pinpoint reference
 * @param italicTitle - Whether the short title is italicised (default true;
 *   pass false for Bills per Rules 3.2 and 3.5)
 */
export function formatLegislationSubsequentRef(
  shortTitle: string,
  footnoteNumber: number,
  pinpoint?: Pinpoint,
  italicTitle = true
): FormattedRun[] {
  const runs: FormattedRun[] = italicTitle
    ? [{ text: shortTitle, italic: true }]
    : [{ text: shortTitle }];

  let refText = ` (n ${footnoteNumber})`;

  if (pinpoint) {
    refText += " ";
    runs.push({ text: refText });
    runs.push(...formatLegislationPinpoint(pinpoint));
  } else {
    runs.push({ text: refText });
  }

  return runs;
}

// ─── LEG-008: Australian Constitutions (Rule 3.6) ────────────────────────────

/**
 * Formats a reference to the Commonwealth Constitution.
 *
 * AGLC4 Rule 3.6: The Commonwealth Constitution is cited as
 * 'Australian Constitution' in italics, without a year or jurisdiction.
 * A pinpoint follows in non-italic text.
 *
 * @example
 *   formatCommonwealthConstitution({ type: "section", value: "51(i)" })
 *   => [{ text: "Australian Constitution", italic: true }, { text: " s 51(i)" }]
 *
 *   formatCommonwealthConstitution()
 *   => [{ text: "Australian Constitution", italic: true }]
 */
export function formatCommonwealthConstitution(pinpoint?: Pinpoint): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: "Australian Constitution", italic: true }];

  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Formats a reference to a state or territory constitution.
 *
 * AGLC4 Rule 3.6: State and territory constitutions are cited as
 * standard statutes: title and year in italics, jurisdiction in
 * parentheses (not italicised), followed by any pinpoint.
 *
 * @example
 *   formatStateConstitution({
 *     title: "Constitution Act",
 *     year: 1975,
 *     jurisdiction: "Vic",
 *     pinpoint: { type: "section", value: "85" }
 *   })
 *   => [{ text: "Constitution Act 1975", italic: true }, { text: " (Vic)" }, { text: " s 85" }]
 */
export function formatStateConstitution(data: {
  title: string;
  year: number;
  jurisdiction: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: `${data.title} ${data.year}`, italic: true },
    { text: ` (${data.jurisdiction})` },
  ];

  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── LEG-009: Explanatory Memoranda (Rule 3.7) ──────────────────────────────

/**
 * Formats an explanatory memorandum citation.
 *
 * AGLC4 Rule 3.7: Explanatory memoranda, explanatory statements, and
 * explanatory notes are cited as `Explanatory Memorandum, «Bill Citation»
 * «Pinpoint»`. The document label is roman, and the Bill citation follows
 * Rule 3.2 — so the bill title and year are NOT italicised. Pinpoints are
 * to pages, or pages and paragraphs (Rules 1.1.6–1.1.7).
 *
 * AGLC4 Example 58: `Explanatory Memorandum, Charter of Human Rights and
 * Responsibilities Bill 2006 (Vic).` — no italics anywhere.
 *
 * @example
 *   formatExplanatoryMemorandum({
 *     type: "Explanatory Memorandum",
 *     billTitle: "Competition and Consumer Bill",
 *     billYear: 2010,
 *     jurisdiction: "Cth",
 *     pinpoint: { type: "page", value: "5" }
 *   })
 *   => [
 *     { text: "Explanatory Memorandum, " },
 *     { text: "Competition and Consumer Bill 2010" },
 *     { text: " (Cth)" },
 *     { text: " 5" }
 *   ]
 */
export function formatExplanatoryMemorandum(data: {
  type: string;
  billTitle: string;
  billYear: number;
  jurisdiction: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  // Bill title and year roman per Rule 3.2 (imported by Rule 3.7)
  const runs: FormattedRun[] = [
    { text: `${data.type}, ` },
    { text: `${data.billTitle} ${data.billYear}` },
    { text: ` (${data.jurisdiction})` },
  ];

  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── LEG-010: Legislative History (Rule 3.8) ────────────────────────────────

/**
 * AGLC4 Rule 3.8: Legislative history references indicate how a provision
 * has been amended, inserted, or repealed by subsequent legislation.
 *
 * Authoring guidance only. The default citation form is a single principal Act
 * — the Note to Rule 3.1.2 (AGLC4 p 68) states that a citation to an Act
 * "refer[s] to the Act as amended (and consolidated)", and that "[g]enerally,
 * a principal Act rather than an amending Act should be cited (but see rule
 * 3.8)". The hybrid form below is the opt-in exception for the narrow case
 * where a single footnote needs a provision together with its history-source.
 * See docs/decisions.md DECISION-008.
 */
export const LEGISLATIVE_HISTORY_GUIDANCE =
  "Use 'as amended by', 'as inserted by', 'as repealed by' to indicate legislative changes. Cite the amending act in full.";

/**
 * The closed set of connector expressions that link a provision to its
 * legislative history under AGLC4 Rule 3.8 (p 78). The expressions are
 * directional and NOT interchangeable:
 *
 * - Passive forms lead with the affected Act ("…s 7, as amended by …").
 * - Active (gerund) forms lead with the amending instrument ("…, amending …").
 *
 * Where the amending instrument is a Bill, AGLC4 uses the "as"-less passive
 * forms ("amended by", "repealed by"). "inserted by" is deliberately omitted:
 * the Bill sentence in Rule 3.8 attests only "amended by/repealed by", so an
 * "as"-less inserting form is not added here without researcher confirmation.
 */
export type LegislativeHistoryConnector =
  | "as enacted"
  | "as at"
  | "as amended by"
  | "amended by"
  | "later amended by"
  | "amending"
  | "as repealed by"
  | "repealed by"
  | "repealing"
  | "as inserted by"
  | "inserting";

/**
 * The other Act or Bill in a Rule 3.8 legislative-history relationship. It
 * carries its own complete citation (title, year, jurisdiction, optional
 * number and pinpoint), per the worked examples at AGLC4 fns 61–68.
 */
export interface RelatedLegislation {
  title: string;
  year: number;
  jurisdiction: string;
  number?: string;
  pinpoint?: Pinpoint;
  /** When true, the related instrument is a Bill: not italicised (Rule 3.2). */
  isBill?: boolean;
}

/**
 * A Rule 3.8 legislative-history link applied to a lead citation. The
 * `connector` fixes both the relationship and which instrument leads;
 * `relatedAct` is omitted for the solo connectors ("as enacted" / "as at").
 */
export interface LegislativeHistory {
  connector: LegislativeHistoryConnector;
  /** Full date for the "as at" connector, e.g. "28 June 1994" (Rule 3.8). */
  asAtDate?: string;
  relatedAct?: RelatedLegislation;
}

/**
 * Append a Rule 3.8 legislative-history tail to an already-formatted lead
 * citation.
 *
 * @remarks AGLC4 Rule 3.8 (p 78): the two instruments are linked by a comma
 * followed by a connector expression in roman type; each instrument keeps its
 * own complete citation and pinpoint. This is the opt-in hybrid mode — callers
 * pass it only when the legislative history is itself the point of the
 * footnote (DECISION-008). The formatter never synthesises a connector: if a
 * non-solo connector is supplied without a `relatedAct` (or "as at" without a
 * date), the lead is returned unchanged rather than emitting a dangling tail.
 *
 * @example
 * // Patents Act 1990 (Cth) s 7, as amended by
 * //   Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth)
 *
 * @param lead - The lead citation, already formatted (statute or bill + pinpoint)
 * @param history - The Rule 3.8 connector and related instrument
 * @returns The lead runs with the legislative-history tail appended
 */
export function formatLegislativeHistory(
  lead: FormattedRun[],
  history: LegislativeHistory
): FormattedRun[] {
  const runs: FormattedRun[] = [...lead];

  // "as at <Full Date>" — solo connector; no related Act (Rule 3.8).
  if (history.connector === "as at") {
    if (history.asAtDate) {
      runs.push({ text: `, as at ${history.asAtDate}` });
    }
    return runs;
  }

  // "as enacted" — solo connector; no related Act (Rule 3.8 fn 67).
  if (history.connector === "as enacted") {
    runs.push({ text: ", as enacted" });
    return runs;
  }

  // All remaining connectors require a related instrument. Without one, emit no
  // dangling connector — the validator flags the omission; the formatter does
  // no harm (DECISION-008: never synthesise a hybrid).
  if (!history.relatedAct) {
    return runs;
  }

  runs.push({ text: `, ${history.connector} ` });

  const rel = history.relatedAct;
  const relData = {
    title: rel.title,
    year: rel.year,
    jurisdiction: rel.jurisdiction,
    number: rel.number,
  };
  runs.push(...(rel.isBill ? formatBill(relData) : formatStatute(relData)));

  if (rel.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(rel.pinpoint));
  }

  return runs;
}

// ─── LEG-011: Quasi-Legislative Materials (Rules 3.9.1–3.9.4) ───────────────

/**
 * Formats a government gazette citation.
 *
 * AGLC4 Rule 3.9.1: Gazettes are cited as `«Jurisdiction», «Gazette Title»,
 * No «Gazette Number», «Full Date», «Pinpoint»`. Where multiple notices
 * appear in the same gazette or on the same page, the notice's author (if
 * available) and title are prepended: `«Author», '«Title of Notice»' in
 * «Jurisdiction», «Gazette Title», No «Gazette Number», «Full Date»,
 * «Starting Page», «Pinpoint»`. Only the gazette title is italicised; the
 * notice title sits in roman inside single quotation marks.
 *
 * AGLC4 Example 69: `Commonwealth, Gazette: Special, No S 489, 1 December 2004.`
 * AGLC4 Example 71 adds author, notice title, starting page 1142 and
 * pinpoint 1143.
 *
 * @param data.noticeAuthor - Author of an individual notice (optional even
 *   in the notice form — AGLC4 ex 70 has a notice title but no author)
 * @param data.noticeTitle - Title of an individual notice, rendered in roman
 *   within single quotation marks followed by ` in `
 * @param data.page - Starting page of the notice (Rule 3.9.1)
 * @param data.pinpoint - Page pinpoint following the starting page
 */
export function formatGazette(data: {
  jurisdiction: string;
  gazetteType: string;
  number?: string;
  date: string;
  page?: number | string;
  pinpoint?: string;
  noticeAuthor?: string;
  noticeTitle?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Individual-notice form: Author, 'Title of Notice' in Jurisdiction, ...
  if (data.noticeTitle) {
    const author = data.noticeAuthor ? `${data.noticeAuthor}, ` : "";
    runs.push({ text: `${author}‘${data.noticeTitle}’ in ` });
  }

  runs.push({ text: `${data.jurisdiction}, ` });
  runs.push({ text: data.gazetteType, italic: true });

  let suffix = "";
  if (data.number !== undefined) {
    suffix += `, No ${data.number}`;
  }
  suffix += `, ${data.date}`;
  if (data.page !== undefined) {
    suffix += `, ${data.page}`;
  }
  if (data.pinpoint !== undefined) {
    suffix += `, ${data.pinpoint}`;
  }

  runs.push({ text: suffix });

  return runs;
}

/**
 * Trims a non-government issuing body's name per AGLC4 Rule 3.9.3: terms
 * designating the body as a company (eg 'Pty', 'Ltd', 'Co', 'Inc') are
 * omitted from its name, as is 'The' at the start of the name.
 *
 * AGLC4 Example 77: `Victorian Bar` — not `The Victorian Bar Inc`.
 *
 * @param name - The issuing body's name as supplied
 * @returns The name with a leading 'The' and company-status designators removed
 */
export function trimIssuingBodyName(name: string): string {
  return name
    .replace(/^[Tt]he\s+/, "")
    .replace(/\s+(Pty|Ltd|Co|Inc|NL)\b\.?/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Formats an order or ruling of a government instrumentality or officer
 * (Rule 3.9.2), or delegated legislation issued by a non-government entity
 * (Rule 3.9.3), such as ASIC class orders, ATO taxation rulings, or ASX
 * listing rules.
 *
 * AGLC4 Rule 3.9.2: cited as `«Instrumentality/Officer», «Instrument Title»
 * («Document Number», «Full Date») «Pinpoint»` — the instrument title is
 * italicised, and the document number (only if one appears on the
 * instrument) and full date of effect sit together in roman parentheses.
 * Where a government department or officer promulgates the instrument, the
 * jurisdiction is added in parentheses after the department/officer name.
 *
 * AGLC4 Rule 3.9.3: non-government delegated legislation is cited in the
 * same way, except that where there is no document number or the source is
 * frequently updated, the parenthetical takes the version date as
 * `(at «Full Date»)` (pass `atDate`), and company-status designators and a
 * leading 'The' are omitted from the issuing body's name.
 *
 * AGLC4 Example 72: `Australian Taxation Office, Income Tax: Carrying on a
 * Business as a Professional Artist (TR 2005/1, 12 January 2005).`
 * AGLC4 Example 75: `ASX, Listing Rules (at 19 December 2016).`
 *
 * @param data.issuingBody - The instrumentality, officer, or issuing body
 * @param data.bodyJurisdiction - Jurisdiction abbreviation appended in
 *   parentheses after a department/officer name (Rule 3.9.2, ex 74)
 * @param data.title - The instrument title (italicised)
 * @param data.documentType - Legacy fallback: used as the italic title when
 *   `title` is absent (older stored citations placed the title here)
 * @param data.number - Document number as it appears on the instrument
 * @param data.date - Full date the instrument takes effect
 * @param data.atDate - Version date for the `(at «Full Date»)` form
 *   (Rule 3.9.3); when present, `number`/`date` are not rendered and the
 *   issuing body's name is trimmed per Rule 3.9.3
 * @param data.pinpoint - Optional pinpoint following the parenthetical
 */
export function formatQuasiLegislative(data: {
  issuingBody: string;
  bodyJurisdiction?: string;
  title?: string;
  documentType?: string;
  number?: string;
  date?: string;
  atDate?: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Rule 3.9.3: trim company designators and leading 'The' for the
  // non-government `(at date)` form
  const body = data.atDate ? trimIssuingBodyName(data.issuingBody) : data.issuingBody;
  const bodyJurisdiction = data.bodyJurisdiction ? ` (${data.bodyJurisdiction})` : "";
  runs.push({ text: `${body}${bodyJurisdiction}, ` });

  // Instrument title in italics (title leads; documentType is a legacy alias)
  const title = data.title ?? data.documentType ?? "";
  if (title) {
    runs.push({ text: title, italic: true });
  }

  // Parenthetical: (at Date) | (Number, Date) | (Number) | (Date)
  let parenthetical = "";
  if (data.atDate) {
    parenthetical = `(at ${data.atDate})`;
  } else if (data.number && data.date) {
    parenthetical = `(${data.number}, ${data.date})`;
  } else if (data.number) {
    parenthetical = `(${data.number})`;
  } else if (data.date) {
    parenthetical = `(${data.date})`;
  }
  if (parenthetical) {
    runs.push({ text: ` ${parenthetical}` });
  }

  if (data.pinpoint) {
    runs.push({ text: " " });
    // Paragraph pinpoints on rulings take the bracketed Rule 1.1.6 form
    // (ex 73: "[4]") — the value is rendered directly; other subdivisions
    // use the legislation abbreviations (ex 77: "rr 4–5").
    if (data.pinpoint.type === "paragraph" || data.pinpoint.type === "page") {
      runs.push(...formatPinpoint(data.pinpoint));
    } else {
      runs.push(...formatLegislationPinpoint(data.pinpoint));
    }
  }

  return runs;
}

/**
 * Formats a court practice direction or practice note citation (Rule 3.9.4).
 *
 * AGLC4 Rule 3.9.4: a practice direction/note reproduced in a report series
 * is cited as `«Court», Practice Direction/Note «Number/Identifier»:
 * «Title» «Citation to Report Series», «Pinpoint»`; one not in a report
 * series as `«Court», Practice Direction/Note «Number/Identifier»: «Title»,
 * «Full Date», «Pinpoint»`. The words 'Practice Direction'/'Practice Note',
 * the number/identifier and the title are all italicised; the report
 * citation or date is roman. Where the identifier is clearly specified as a
 * number, 'No' is inserted before it, separated by a space.
 *
 * AGLC4 Example 78: `Supreme Court of Victoria, Practice Note No 8 of 2010:
 * Management of Group Proceedings (2010) 30 VR 693.`
 * AGLC4 Example 79: `Supreme Court of Victoria, Practice Note SC Gen 10:
 * Conduct of Group Proceedings (Class Actions), 30 January 2017.` — no 'No'
 * before a non-numeric identifier.
 *
 * @param data.court - The issuing court (roman)
 * @param data.designation - 'Practice Direction' or 'Practice Note' (or the
 *   court's own label, eg 'Central Practice Note' — AGLC4 ex 81)
 * @param data.identifier - Number or identifier (eg "8 of 2010",
 *   "SC Gen 10"); 'No' is inserted automatically for numeric identifiers;
 *   omitted entirely for designation-only notes (ex 81)
 * @param data.title - Title of the practice direction/note
 * @param data.reportCitation - Report-series citation (eg "(2010) 30 VR
 *   693") for the report-series form; takes precedence over `date`
 * @param data.date - Full date for the non-report-series form
 * @param data.pinpoint - Optional pinpoint (pages, or pages and paragraphs,
 *   per Rules 1.1.6–1.1.7)
 */
export function formatPracticeDirection(data: {
  court: string;
  designation: string;
  identifier?: string;
  title: string;
  reportCitation?: string;
  date?: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: `${data.court}, ` }];

  // Insert 'No' before identifiers clearly specified as numbers (Rule 3.9.4);
  // identifiers like "SC Gen 10" are reproduced as-is (ex 79).
  let identifier = "";
  if (data.identifier) {
    const needsNo = /^\d/.test(data.identifier) && !/^No\s/i.test(data.identifier);
    identifier = ` ${needsNo ? "No " : ""}${data.identifier}`;
  }

  // Designation, identifier and title are one italic unit
  runs.push({ text: `${data.designation}${identifier}: ${data.title}`, italic: true });

  if (data.reportCitation) {
    // Report-series form (Rule 2.2.2 citation, roman)
    runs.push({ text: ` ${data.reportCitation}` });
  } else if (data.date) {
    // Dated form
    runs.push({ text: `, ${data.date}` });
  }

  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}
