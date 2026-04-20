/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSC-001 + OSC-002: OSCOLA Rules 2.1.1–2.1.8 — UK Case Citations
 *
 * Formats modern UK cases (post-2001) with neutral citation + best report,
 * and pre-2001 cases with report citation only.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Report Hierarchy ────────────────────────────────────────────────────────

/**
 * OSCOLA Rule 2.1.3: Report series hierarchy for selecting the "best" report.
 * Law Reports (AC/QB/Ch/Fam) > WLR > All ER > specialist.
 */
export const OSCOLA_REPORT_HIERARCHY: readonly string[] = [
  "AC",
  "QB",
  "KB",
  "Ch",
  "Fam",
  "WLR",
  "All ER",
];

// ─── Series-implied courts ───────────────────────────────────────────────────

/**
 * Report series from which the court is apparent (OSCOLA Rule 2.1.2).
 * When a case is cited to one of these, no separate court identifier is needed.
 */
const OSCOLA_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "AC",
  "QB",
  "KB",
  "Ch",
  "Fam",
  "P",
  "UKSC",
  "UKHL",
  "UKPC",
  "EWCA Civ",
  "EWCA Crim",
  "EWHC",
  "SC",
  "SLT",
  "CSIH",
  "CSOH",
  "HCJAC",
  "NICA",
  "NIQB",
  "NIJB",
]);

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface OscolaCaseData {
  /** Case name (will be italicised; 'v' is rendered in roman). */
  caseName: string;
  /** Neutral citation (post-2001 cases). */
  neutralCitation?: OscolaNeutralCitation;
  /** Best report citation. */
  reportCitation?: OscolaReportCitation;
  /** Pinpoint reference (paragraph number or page). */
  pinpoint?: string;
  /** Court identifier — required for pre-2001 if not apparent from report. */
  courtId?: string;
  /**
   * Whether this is a BAILII retrospective neutral citation.
   * Per OSCOLA 5 Rule 2.1.8, these are disregarded.
   */
  bailiiRetrospective?: boolean;
}

export interface OscolaNeutralCitation {
  /** Year in square brackets (e.g. 2008). */
  year: number;
  /** Court identifier (e.g. 'UKHL', 'EWCA Civ', 'EWHC'). */
  court: string;
  /** Judgment number. */
  number: number;
  /** EWHC division (e.g. 'Admin', 'Ch', 'QB'). */
  ewhcDivision?: string;
}

export interface OscolaReportCitation {
  /** Year of the report volume. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /** Report series abbreviation (e.g. 'AC', 'WLR', 'All ER'). */
  series: string;
  /** Starting page number. */
  startPage: number | string;
}

// ─── Case Name Splitting ─────────────────────────────────────────────────────

/**
 * Splits a case name around ' v ' to render the 'v' in roman (not italic)
 * per OSCOLA convention.
 */
function renderCaseName(caseName: string): FormattedRun[] {
  const vIndex = caseName.indexOf(" v ");
  if (vIndex === -1) {
    return [{ text: caseName, italic: true }];
  }
  return [
    { text: caseName.substring(0, vIndex), italic: true },
    { text: " v " },
    { text: caseName.substring(vIndex + 3), italic: true },
  ];
}

// ─── Format Neutral Citation ─────────────────────────────────────────────────

function renderNeutralCitation(nc: OscolaNeutralCitation): string {
  let text = `[${nc.year}] ${nc.court} ${nc.number}`;
  if (nc.ewhcDivision) {
    text += ` (${nc.ewhcDivision})`;
  }
  return text;
}

// ─── Format Report Citation ──────────────────────────────────────────────────

function renderReportCitation(rc: OscolaReportCitation): string {
  const open = rc.yearType === "round" ? "(" : "[";
  const close = rc.yearType === "round" ? ")" : "]";
  let text = `${open}${rc.year}${close}`;
  if (rc.volume !== undefined) {
    text += ` ${rc.volume}`;
  }
  text += ` ${rc.series} ${rc.startPage}`;
  return text;
}

// ─── OSC-001: Modern UK Case (OSCOLA Rules 2.1.1–2.1.5) ─────────────────────

/**
 * Formats a modern UK case citation per OSCOLA Rules 2.1.1–2.1.5.
 *
 * OSCOLA Rule 2.1.1: Case names are italicised; 'v' is roman.
 * OSCOLA Rule 2.1.2: Neutral citation appears first (post-2001).
 * OSCOLA Rule 2.1.3: Best report follows, separated by comma.
 *   Hierarchy: Law Reports (AC/QB/Ch/Fam) > WLR > All ER > specialist.
 * OSCOLA Rule 2.1.5: Court identifiers — UKSC, UKPC, EWCA Civ/Crim,
 *   EWHC (with division).
 *
 * OSC-002 (OSCOLA Rules 2.1.6–2.1.8):
 * - Pre-2001: report citation only, court in parentheses if not apparent.
 * - BAILII retrospective neutral citations are disregarded per OSCOLA 5.
 *
 * @example
 *   // Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884
 *   formatOscolaCase({
 *     caseName: "Corr v IBC Vehicles Ltd",
 *     neutralCitation: { year: 2008, court: "UKHL", number: 15 },
 *     reportCitation: { year: 2008, yearType: "square", volume: 1, series: "AC", startPage: 884 },
 *   })
 *
 * @example
 *   // Donoghue v Stevenson [1932] AC 562 (HL)
 *   formatOscolaCase({
 *     caseName: "Donoghue v Stevenson",
 *     reportCitation: { year: 1932, yearType: "square", series: "AC", startPage: 562 },
 *     courtId: "HL",
 *   })
 */
export function formatOscolaCase(data: OscolaCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name with 'v' in roman
  runs.push(...renderCaseName(data.caseName));

  // Determine effective neutral citation (disregard BAILII retrospective)
  const effectiveNeutral =
    data.neutralCitation && !data.bailiiRetrospective
      ? data.neutralCitation
      : undefined;

  if (effectiveNeutral && data.reportCitation) {
    // Modern parallel form: neutral citation, report citation
    runs.push({ text: ` ${renderNeutralCitation(effectiveNeutral)}` });
    runs.push({ text: `, ${renderReportCitation(data.reportCitation)}` });
  } else if (effectiveNeutral) {
    // Neutral citation only
    runs.push({ text: ` ${renderNeutralCitation(effectiveNeutral)}` });
  } else if (data.reportCitation) {
    // Pre-2001 or no neutral: report citation only
    runs.push({ text: ` ${renderReportCitation(data.reportCitation)}` });
    // Court in parentheses if not apparent from series
    if (
      data.courtId &&
      !OSCOLA_SERIES_IMPLIED_COURT.has(data.reportCitation.series)
    ) {
      runs.push({ text: ` (${data.courtId})` });
    }
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
