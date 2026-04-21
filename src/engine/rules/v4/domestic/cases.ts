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
 * Map of authorised report series abbreviations to the court they imply.
 * When a citation uses one of these series, the court identifier is omitted
 * because it is apparent from the series itself (Rule 2.2.6).
 */
const SERIES_TO_COURT: Record<string, string> = {
  CLR: "HCA",
  ALJR: "HCA",
  FCR: "FCA",
  FCAFC: "FCA",
  FLR: "FCA",
  VR: "VSC",
  NSWLR: "NSWSC",
  QR: "QSC",
  SASR: "SASC",
  "Tas R": "TASSC",
  WAR: "WASC",
  ACTLR: "ACTSC",
  NTR: "NTSC",
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
 * AGLC4 Rule 2.2.3: When a case is reported in multiple series,
 * preference is given in this order:
 *   1. Authorised reports (e.g. CLR, FCR)
 *   2. Generalist unauthorised reports (e.g. ALJR)
 *   3. Subject-specific unauthorised reports
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
export function getReportSeriesPreference(
  series: string,
  jurisdiction?: string,
): number {
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

  // AGLC4 Rule 2.2.3: generic tier ordering
  const authorised = new Set([
    "CLR",
    "FCR",
    "FCAFC",
    "FLR",
    "NSWLR",
    "VR",
    "QR",
    "SASR",
    "Tas R",
    "WAR",
    "ACTLR",
    "NTR",
  ]);

  const generalistUnauthorised = new Set([
    "ALJR",
    "ALR",
    "IR",
    "FLC",
    "MVR",
  ]);

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
 * abbreviation, separated by a space.
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
  startingPage: number,
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
 * Formats a court identifier in parentheses, unless the court is already
 * apparent from the report series.
 *
 * AGLC4 Rule 2.2.6: The court identifier appears in parentheses at the
 * end of the citation, unless the court can be determined from the
 * report series abbreviation alone.
 *
 * @example
 *   formatCourtIdentifier("HCA", "CLR") => []  // court apparent from CLR
 *   formatCourtIdentifier("HCA")        => [{ text: " (HCA)" }]
 */
export function formatCourtIdentifier(
  courtId: string,
  reportSeries?: string
): FormattedRun[] {
  if (reportSeries && reportSeries in SERIES_TO_COURT) {
    // Only omit the court when the actual court matches the court implied
    // by the report series. E.g. QR implies QSC, so if the actual court
    // is QCA the identifier must be shown (AUDIT2-018, Rule 2.2.6).
    if (SERIES_TO_COURT[reportSeries] === courtId) {
      return [];
    }
  }
  return [{ text: ` (${courtId})` }];
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
 * AGLC4 Rule 2.2.7: When a case is reported in more than one report
 * series, parallel citations are provided, separated by semicolons.
 * Authorised reports are cited first, followed by unauthorised reports
 * in order of preference (Rule 2.2.3).
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
  startingPage: number;
  pinpoint?: Pinpoint;
  courtId?: string;
  parallelCitations?: ParallelCitation[];
  /** COURT-005: Pinpoint style override. Defaults to "page-only". */
  pinpointStyle?: PinpointStyle;
}

/**
 * Assembles a complete reported case citation per AGLC4 Rule 2.2.
 *
 * Format:
 *   Case Name (year) volume Series startingPage, pinpoint (Court)
 *
 * AGLC4 Rule 2.2: A reported case citation comprises the case name
 * (italicised), followed by the year, volume (if applicable), report
 * series abbreviation, starting page, pinpoint (if applicable), and
 * court identifier (if not apparent from the report series).
 *
 * @example
 *   Mabo v Queensland (No 2) (1992) 175 CLR 1
 *   Smith v Jones [1974] VR 1; (1974) 4 ALR 57
 */
export function formatReportedCase(data: ReportedCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name (already formatted with italics by the caller)
  runs.push(...data.caseName);

  // Space before year
  runs.push({ text: " " });

  // Year and volume
  runs.push(...formatYearAndVolume(data.yearType, data.year, data.volume));

  // Report series
  runs.push({ text: " " });
  runs.push(...formatReportSeries(data.reportSeries));

  // Starting page and pinpoint (COURT-005: style-aware)
  runs.push({ text: " " });
  runs.push(
    ...formatStartingPageAndPinpoint(data.startingPage, data.pinpoint, data.pinpointStyle)
  );

  // Court identifier (omitted if apparent from series)
  if (data.courtId) {
    runs.push(...formatCourtIdentifier(data.courtId, data.reportSeries));
  }

  // Parallel citations
  if (data.parallelCitations && data.parallelCitations.length > 0) {
    runs.push({ text: "; " });
    runs.push(...formatParallelCitations(data.parallelCitations));
  }

  return runs;
}
