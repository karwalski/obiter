/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part II — Domestic Cases (Rules 2.2.1–2.2.7)
 *
 * Pure formatting functions for reported case citations.
 */

import { Pinpoint, ParallelCitation } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import type { PinpointStyle } from "../../../standards/types";
import { getPreferredReportOrder } from "../../../court/reportHierarchy";

// ─── Court-to-Series Mapping ─────────────────────────────────────────────────

/**
 * Map of report series abbreviations to the court they imply.
 * When a citation uses one of these series, the court identifier is omitted
 * because it is apparent from the series itself (Rule 2.2.6).
 *
 * FLR (Federal Law Reports) is deliberately absent: it is a generalist
 * unauthorised series reporting several courts, so it makes no court
 * apparent. FCAFC is a court identifier, not a report series.
 */
const SERIES_TO_COURT: Record<string, string> = {
  CLR: "HCA",
  ALJR: "HCA",
  FCR: "FCA",
  VR: "VSC",
  NSWLR: "NSWSC",
  "Qd R": "QSC",
  // Legacy alias for 'Qd R' tolerated in stored documents (Rule 2.2.3
  // prescribes 'Qd R'; older Obiter data used 'QR').
  QR: "QSC",
  SASR: "SASC",
  "Tas R": "TASSC",
  WAR: "WASC",
  ACTLR: "ACTSC",
  NTLR: "NTSC",
  NTR: "NTSC",
};

/**
 * Display metadata for the unique court identifiers used in Rule 2.2.6
 * court parentheticals. AGLC4 Rule 2.2.6 requires the court's *name*
 * (ex 77: '(Court of Appeal)'), never the Appendix B identifier code.
 * `unqualifiedName` is the form with the jurisdiction suppressed, used
 * when the jurisdiction is already apparent from the report series
 * (ex 77: '(Court of Appeal)', not '(Queensland Court of Appeal)').
 */
const COURT_DISPLAY: Record<
  string,
  { name: string; unqualifiedName?: string; jurisdiction: string }
> = {
  HCA: { name: "High Court of Australia", jurisdiction: "Cth" },
  FCA: { name: "Federal Court of Australia", jurisdiction: "Cth" },
  FCAFC: { name: "Full Court of the Federal Court of Australia", jurisdiction: "Cth" },
  FamCA: { name: "Family Court of Australia", jurisdiction: "Cth" },
  FamCAFC: { name: "Full Court of the Family Court of Australia", jurisdiction: "Cth" },
  NSWSC: {
    name: "Supreme Court of New South Wales",
    unqualifiedName: "Supreme Court",
    jurisdiction: "NSW",
  },
  NSWCA: {
    name: "New South Wales Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "NSW",
  },
  NSWCCA: {
    name: "New South Wales Court of Criminal Appeal",
    unqualifiedName: "Court of Criminal Appeal",
    jurisdiction: "NSW",
  },
  VSC: {
    name: "Supreme Court of Victoria",
    unqualifiedName: "Supreme Court",
    jurisdiction: "Vic",
  },
  VSCA: {
    name: "Victorian Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "Vic",
  },
  QSC: {
    name: "Supreme Court of Queensland",
    unqualifiedName: "Supreme Court",
    jurisdiction: "Qld",
  },
  QCA: {
    name: "Queensland Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "Qld",
  },
  SASC: {
    name: "Supreme Court of South Australia",
    unqualifiedName: "Supreme Court",
    jurisdiction: "SA",
  },
  SASCFC: {
    name: "Full Court of the Supreme Court of South Australia",
    unqualifiedName: "Full Court",
    jurisdiction: "SA",
  },
  WASC: {
    name: "Supreme Court of Western Australia",
    unqualifiedName: "Supreme Court",
    jurisdiction: "WA",
  },
  WASCA: {
    name: "Western Australian Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "WA",
  },
  TASSC: {
    name: "Supreme Court of Tasmania",
    unqualifiedName: "Supreme Court",
    jurisdiction: "Tas",
  },
  TASFC: {
    name: "Full Court of the Supreme Court of Tasmania",
    unqualifiedName: "Full Court",
    jurisdiction: "Tas",
  },
  TASCCA: {
    name: "Tasmanian Court of Criminal Appeal",
    unqualifiedName: "Court of Criminal Appeal",
    jurisdiction: "Tas",
  },
  ACTSC: {
    name: "Supreme Court of the Australian Capital Territory",
    unqualifiedName: "Supreme Court",
    jurisdiction: "ACT",
  },
  ACTCA: {
    name: "Australian Capital Territory Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "ACT",
  },
  NTSC: {
    name: "Supreme Court of the Northern Territory",
    unqualifiedName: "Supreme Court",
    jurisdiction: "NT",
  },
  NTCA: {
    name: "Northern Territory Court of Appeal",
    unqualifiedName: "Court of Appeal",
    jurisdiction: "NT",
  },
  NTCCA: {
    name: "Northern Territory Court of Criminal Appeal",
    unqualifiedName: "Court of Criminal Appeal",
    jurisdiction: "NT",
  },
};

/**
 * Jurisdiction implied by each report series, for Rule 2.2.6
 * jurisdiction suppression in the court parenthetical.
 */
const SERIES_JURISDICTION: Record<string, string> = {
  CLR: "Cth",
  ALJR: "Cth",
  FCR: "Cth",
  NSWLR: "NSW",
  VR: "Vic",
  "Qd R": "Qld",
  QR: "Qld",
  SASR: "SA",
  WAR: "WA",
  "Tas R": "Tas",
  ACTLR: "ACT",
  NTLR: "NT",
  NTR: "NT",
};

// ─── CASE-007: Year and Volume (Rule 2.2.1) ─────────────────────────────────

/**
 * Formats the year and optional volume number for a reported case citation.
 *
 * AGLC4 Rule 2.2.1:
 * - Round brackets `(year)` are used for volume-organised report series.
 *   The volume number appears between the year and the series abbreviation.
 * - Square brackets `[year]` are used for year-organised report series.
 *   No volume number is used.
 *
 * @example
 *   formatYearAndVolume("round", 2008, 190) => [{ text: "(2008) 190" }]
 *   formatYearAndVolume("square", 1974)     => [{ text: "[1974]" }]
 */
export function formatYearAndVolume(
  yearType: "round" | "square",
  year: number,
  volume?: number
): FormattedRun[] {
  const open = yearType === "round" ? "(" : "[";
  const close = yearType === "round" ? ")" : "]";
  let text = `${open}${year}${close}`;
  if (volume !== undefined) {
    text += ` ${volume}`;
  }
  return [{ text }];
}

// ─── CASE-008: Report Series (Rules 2.2.2, 2.2.3) ──────────────────────────

/**
 * Formats a report series abbreviation as plain (non-italicised) text.
 *
 * AGLC4 Rule 2.2.2: The report series abbreviation follows the year
 * (and volume, if applicable). It is not italicised.
 *
 * @example
 *   formatReportSeries("CLR") => [{ text: "CLR" }]
 */
export function formatReportSeries(series: string): FormattedRun[] {
  return [{ text: series }];
}

/**
 * Returns the preference rank of a report series for citation selection.
 *
 * AGLC4 Rule 2.2.2: The authorised report must always be used where
 * available; otherwise versions are preferred in this order:
 *   1. Authorised reports (e.g. CLR, FCR, VR, NSWLR)
 *   2. Generalist unauthorised reports (e.g. ALR, ALJR, FLR, ACTR)
 *   3. Subject-specific unauthorised reports (e.g. A Crim R, ACSR, IR)
 *   4. Unreported (medium neutral citation)
 *
 * COURT-006: When a jurisdiction is provided, the preference rank is
 * derived from the jurisdiction-aware hierarchy data instead of the
 * generic AGLC4 tiers. This supports court mode validation and
 * auto-ordering of parallel citations.
 *
 * @param series - The report series abbreviation to rank.
 * @param jurisdiction - Optional jurisdiction or court identifier. When
 *   provided and recognised, uses the jurisdiction's hierarchy ordering
 *   from COURT-006. When omitted or unrecognised, falls back to the
 *   generic AGLC4 Rule 2.2.3 tier ordering.
 * @returns A numeric rank where lower values indicate higher preference.
 *   Without jurisdiction: 1 for authorised, 2 for generalist unauthorised,
 *   3 for subject-specific, 4 for unreported/unknown.
 *   With jurisdiction: 0-based index in the hierarchy list, with unknown
 *   series ranked just below the last named series.
 */
export function getReportSeriesPreference(series: string, jurisdiction?: string): number {
  // COURT-006: jurisdiction-aware ordering when jurisdiction is provided
  if (jurisdiction !== undefined) {
    const hierarchy = getPreferredReportOrder(jurisdiction);
    if (hierarchy.length > 0) {
      const index = hierarchy.indexOf(series);
      if (index !== -1) {
        return index;
      }
      // Unknown series: rank just before MNC (subject-specific tier)
      const mncIndex = hierarchy.indexOf("MNC");
      if (mncIndex !== -1) {
        return mncIndex - 0.5;
      }
      return hierarchy.length - 0.5;
    }
    // Unrecognised jurisdiction — fall through to AGLC4 defaults
  }

  // AGLC4 Rule 2.2.2 tier 1 examples + the Rule 2.2.3 table of authorised
  // (or preferred) Australian series, including the historical series for
  // each jurisdiction. FLR is expressly a *generalist unauthorised*
  // example in the Rule 2.2.2 table; FCAFC is a court identifier, not a
  // report series — neither belongs here.
  const authorised = new Set([
    "CLR",
    "FCR",
    "ACTLR",
    "SR (NSW)",
    "NSWR",
    "NSWLR",
    "NTR",
    "NTLR",
    "St R Qd",
    "Qd R",
    // Legacy alias for 'Qd R' in stored documents.
    "QR",
    "SALR",
    "SASR",
    "Tas LR",
    "Tas SR",
    "Tas R",
    "VLR",
    "VR",
    "WALR",
    "WAR",
  ]);

  // Rule 2.2.2 tier 2 examples: ALR, ALJR, FLR, ACTR. (ACTR also appears
  // in the Rule 2.2.3 'authorised or preferred' table for the ACT
  // 1973–2008; the explicit Rule 2.2.2 tier table is followed here.)
  // IR is a *subject-specific* example in the Rule 2.2.2 table, as are
  // FLC and MVR, so they fall through to rank 3.
  const generalistUnauthorised = new Set(["ALR", "ALJR", "FLR", "ACTR"]);

  if (authorised.has(series)) {
    return 1;
  }
  if (generalistUnauthorised.has(series)) {
    return 2;
  }
  // Subject-specific series: any known abbreviation not in the above sets.
  // We treat unknown series as subject-specific rather than unreported,
  // since unreported decisions use medium neutral citations (Rule 2.3).
  const unreported = new Set(["MNC", "AustLII"]);
  if (unreported.has(series)) {
    return 4;
  }
  return 3;
}

// ─── CASE-009: Starting Page and Pinpoints (Rules 2.2.4, 2.2.5) ─────────────

/**
 * Formats the pinpoint reference text for a given pinpoint type and value.
 */
function formatPinpointText(pinpoint: Pinpoint): string {
  switch (pinpoint.type) {
    case "page":
      return `, ${pinpoint.value}`;
    case "paragraph":
      return ` ${pinpoint.value}`;
    case "footnote":
      return ` n ${pinpoint.value}`;
    default:
      return `, ${pinpoint.value}`;
  }
}

/**
 * Formats the starting page number and optional pinpoint reference.
 *
 * AGLC4 Rule 2.2.4: The starting page of the case follows the report series
 * abbreviation, separated by a space. Where the case is identified by a
 * unique reference rather than a starting page (common in CCH series),
 * that reference — including any accompanying symbols — is used instead
 * (ex 67: '(2002) EOC ¶93-198'), so a string is accepted.
 *
 * AGLC4 Rule 2.2.5: A pinpoint reference follows the starting page.
 * - Page pinpoints are separated by a comma and space: `1, 6`.
 * - Paragraph pinpoints are separated by a space: `1 [23]`.
 *
 * COURT-005: Pinpoint style parameterisation adjusts rendering:
 * - "page-only" (default): starting page + page pinpoint `420, 425`
 * - "para-only" (NSW, Qld): paragraph pinpoint only `[45]` — no starting page
 * - "para-and-page" (Vic, FCA, HCA etc): starting page + paragraph `420, [45]–[46]`
 *
 * @example
 *   formatStartingPageAndPinpoint(1)
 *     => [{ text: "1" }]
 *   formatStartingPageAndPinpoint(1, { type: "page", value: "6" })
 *     => [{ text: "1, 6" }]
 *   formatStartingPageAndPinpoint(1, { type: "paragraph", value: "[23]" })
 *     => [{ text: "1 [23]" }]
 *   formatStartingPageAndPinpoint(1, { type: "paragraph", value: "[45]" }, "para-only")
 *     => [{ text: "[45]" }]
 *   formatStartingPageAndPinpoint(420, { type: "paragraph", value: "[45]–[46]" }, "para-and-page")
 *     => [{ text: "420, [45]–[46]" }]
 */
export function formatStartingPageAndPinpoint(
  startingPage: number | string,
  pinpoint?: Pinpoint,
  pinpointStyle: PinpointStyle = "page-only"
): FormattedRun[] {
  // ── COURT-005: para-only — emit paragraph pinpoint only, no starting page ──
  if (pinpointStyle === "para-only") {
    if (pinpoint && pinpoint.type === "paragraph") {
      let text = pinpoint.value;
      if (pinpoint.subPinpoint) {
        text += formatPinpointText(pinpoint.subPinpoint);
      }
      return [{ text }];
    }
    // No paragraph pinpoint provided — fall through to emit starting page
    // (edge case: user has only a page pinpoint in para-only mode)
    if (pinpoint) {
      let text = formatPinpointText(pinpoint).replace(/^, /, "");
      if (pinpoint.subPinpoint) {
        text += formatPinpointText(pinpoint.subPinpoint);
      }
      return [{ text }];
    }
    // No pinpoint at all — emit starting page as fallback
    return [{ text: `${startingPage}` }];
  }

  // ── COURT-005: para-and-page — starting page, then paragraph pinpoint ──
  if (pinpointStyle === "para-and-page") {
    let text = `${startingPage}`;
    if (pinpoint && pinpoint.type === "paragraph") {
      // Comma-separated: "420, [45]–[46]"
      text += `, ${pinpoint.value}`;
      if (pinpoint.subPinpoint) {
        text += formatPinpointText(pinpoint.subPinpoint);
      }
    } else if (pinpoint) {
      // Non-paragraph pinpoint — render normally
      text += formatPinpointText(pinpoint);
      if (pinpoint.subPinpoint) {
        text += formatPinpointText(pinpoint.subPinpoint);
      }
    }
    return [{ text }];
  }

  // ── Default: page-only (academic) — starting page + pinpoint ──
  let text = `${startingPage}`;
  if (pinpoint) {
    text += formatPinpointText(pinpoint);
    if (pinpoint.subPinpoint) {
      text += formatPinpointText(pinpoint.subPinpoint);
    }
  }
  return [{ text }];
}

// ─── CASE-010: Court Identifier (Rule 2.2.6) ────────────────────────────────

/**
 * Returns true if the court is apparent from the given authorised report series.
 *
 * AGLC4 Rule 2.2.6: The court identifier is omitted when it is apparent
 * from the report series. For example, CLR implies HCA, FCR implies FCA.
 */
export function isCourtApparentFromSeries(reportSeries: string): boolean {
  return reportSeries in SERIES_TO_COURT;
}

/**
 * Formats a Rule 2.2.6 court parenthetical, unless the court is already
 * apparent from the report series.
 *
 * AGLC4 Rule 2.2.6: where identifying the court is important and not
 * otherwise apparent, the court's *name* may be added in parentheses.
 * The parenthetical uses the court's name, never the Appendix B code
 * (ex 77: '(Court of Appeal)'). The court's jurisdiction must not be
 * stated where it is already apparent — authorised state reports make
 * the jurisdiction apparent, so '(Court of Appeal)' is used rather than
 * '(Queensland Court of Appeal)'.
 *
 * @param courtId - The unique court identifier (eg 'QCA'), or an
 *   already-spelt-out court name, which is emitted as given.
 * @param reportSeries - The report series of the citation, used both to
 *   omit the parenthetical when the court is apparent and to suppress
 *   the jurisdiction when it is apparent.
 *
 * @example
 *   formatCourtIdentifier("HCA", "CLR")    => []  // court apparent from CLR
 *   formatCourtIdentifier("QCA", "Qd R")   => [{ text: " (Court of Appeal)" }]
 *   formatCourtIdentifier("QCA", "A Crim R") => [{ text: " (Queensland Court of Appeal)" }]
 */
export function formatCourtIdentifier(courtId: string, reportSeries?: string): FormattedRun[] {
  if (reportSeries && reportSeries in SERIES_TO_COURT) {
    // Only omit the court when the actual court matches the court implied
    // by the report series. E.g. Qd R implies QSC, so if the actual court
    // is QCA the parenthetical must be shown (AUDIT2-018, Rule 2.2.6).
    if (SERIES_TO_COURT[reportSeries] === courtId) {
      return [];
    }
  }

  const display = COURT_DISPLAY[courtId];
  if (!display) {
    // Unknown identifier — assume the caller supplied a court name
    // (eg 'Court of Appeal') and emit it as given.
    return [{ text: ` (${courtId})` }];
  }

  const seriesJurisdiction = reportSeries ? SERIES_JURISDICTION[reportSeries] : undefined;
  const name =
    seriesJurisdiction === display.jurisdiction && display.unqualifiedName
      ? display.unqualifiedName
      : display.name;
  return [{ text: ` (${name})` }];
}

// ─── CASE-011: Parallel Citations (Rule 2.2.7) ──────────────────────────────

/**
 * Formats a single parallel citation entry (year + volume + series + page).
 */
function formatSingleParallel(parallel: ParallelCitation): string {
  const open = parallel.yearType === "round" ? "(" : "[";
  const close = parallel.yearType === "round" ? ")" : "]";
  let text = `${open}${parallel.year}${close}`;
  if (parallel.volume !== undefined) {
    text += ` ${parallel.volume}`;
  }
  text += ` ${parallel.reportSeries} ${parallel.startingPage}`;
  return text;
}

/**
 * Formats parallel citations, joined with a configurable separator.
 *
 * AGLC4 Rule 2.2.7: parallel citations should NEVER be used for
 * Australian cases — only the most authoritative version (Rule 2.2.2)
 * is cited (ex 80 expressly rejects '(1999) 198 CLR 180; 164 ALR 606;
 * [1999] HCA 36'). This formatter therefore exists only for non-AGLC
 * contexts: court writing mode (practice directions), UK Nominate
 * Reports (Rule 24.1.3) and early US Supreme Court decisions
 * (Rule 25.1.3). Callers in AGLC academic mode must not pass parallels.
 *
 * OSCOLA Rule 2.1.3 / NZLSG Rule 3.2.10: Use comma separator instead.
 *
 * @param parallels - The parallel citation entries to format.
 * @param separator - The separator string between parallels. Defaults to
 *   `"; "` (AGLC4). OSCOLA and NZLSG use `", "`.
 *
 * @example
 *   formatParallelCitations([
 *     { yearType: "square", year: 1974, reportSeries: "VR", startingPage: 1 },
 *     { yearType: "round", year: 1974, volume: 4, reportSeries: "ALR", startingPage: 57 }
 *   ])
 *   => [{ text: "[1974] VR 1; (1974) 4 ALR 57" }]
 */
export function formatParallelCitations(
  parallels: ParallelCitation[],
  separator: string = "; "
): FormattedRun[] {
  if (parallels.length === 0) {
    return [];
  }
  const text = parallels.map(formatSingleParallel).join(separator);
  return [{ text }];
}

// ─── Main Formatter: Reported Case ──────────────────────────────────────────

/**
 * Input data for assembling a complete reported case citation.
 */
interface ReportedCaseData {
  caseName: FormattedRun[];
  yearType: "round" | "square";
  year: number;
  volume?: number;
  reportSeries: string;
  /**
   * Rule 2.2.4: the starting page, or a unique reference (with symbols,
   * eg '¶93-198') for series that use one instead of a starting page.
   */
  startingPage: number | string;
  pinpoint?: Pinpoint;
  courtId?: string;
  /**
   * Rule 2.2.7: must be empty in AGLC academic mode (parallel citations
   * are never used for Australian cases); populated only for court
   * writing mode and foreign-style contexts.
   */
  parallelCitations?: ParallelCitation[];
  /** COURT-005: Pinpoint style override. Defaults to "page-only". */
  pinpointStyle?: PinpointStyle;
  /**
   * Rule 2.4: pre-formatted judicial officer runs. Emitted after the
   * pinpoint but BEFORE the court parenthetical — Rule 2.2.6 places the
   * court parenthetical after pinpoints and other parenthetical clauses.
   */
  judicialOfficers?: FormattedRun[];
  /**
   * Court mode only: a medium neutral citation to emit BEFORE the
   * report citation, per WA SC Consolidated Practice Directions
   * PD 8.2.2 (updated 20 Jun 2025): "Lee v The Queen [1999] WASCA 14;
   * (1999) 18 WAR 23, 34 [15]". Never set in AGLC academic mode.
   */
  mncFirst?: string;
}

/**
 * Assembles a complete reported case citation per AGLC4 Rule 2.2.
 *
 * Format:
 *   Case Name (year) volume Series startingPage, pinpoint (Officers) (Court)
 *
 * AGLC4 Rule 2.2: A reported case citation comprises the case name
 * (italicised), followed by the year, volume (if applicable), report
 * series abbreviation, starting page, pinpoint (if applicable), any
 * judicial-officer parenthetical (Rule 2.4), and the court parenthetical
 * (Rule 2.2.6 — only when important and not apparent from the series).
 *
 * @example
 *   Mabo v Queensland (No 2) (1992) 175 CLR 1
 *   Aldrick v EM Investments (Qld) Pty Ltd [2000] 2 Qd R 346 (Court of Appeal)
 */
export function formatReportedCase(data: ReportedCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name (already formatted with italics by the caller)
  runs.push(...data.caseName);

  // Space before year
  runs.push({ text: " " });

  // Court mode, WA order: MNC precedes the report citation
  // (WA SC Consolidated PD 8.2.2, updated 20 Jun 2025).
  if (data.mncFirst) {
    runs.push({ text: `${data.mncFirst}; ` });
  }

  // Year and volume
  runs.push(...formatYearAndVolume(data.yearType, data.year, data.volume));

  // Report series
  runs.push({ text: " " });
  runs.push(...formatReportSeries(data.reportSeries));

  // Starting page and pinpoint (COURT-005: style-aware)
  runs.push({ text: " " });
  runs.push(...formatStartingPageAndPinpoint(data.startingPage, data.pinpoint, data.pinpointStyle));

  // Judicial officers (Rule 2.4) — precede the court parenthetical,
  // which Rule 2.2.6 places after "other parenthetical clauses".
  if (data.judicialOfficers && data.judicialOfficers.length > 0) {
    runs.push({ text: " " });
    runs.push(...data.judicialOfficers);
  }

  // Court parenthetical (Rule 2.2.6; omitted if apparent from series)
  if (data.courtId) {
    runs.push(...formatCourtIdentifier(data.courtId, data.reportSeries));
  }

  // Parallel citations — never present in AGLC academic mode
  // (Rule 2.2.7); used by court writing mode / foreign styles only.
  if (data.parallelCitations && data.parallelCitations.length > 0) {
    runs.push({ text: "; " });
    runs.push(...formatParallelCitations(data.parallelCitations));
  }

  return runs;
}
