/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSC-003: OSCOLA Rule 2.1.9 (inferred) — Scottish Courts and Reports
 *
 * Handles Scottish cases: Session Cases, Scots Law Times,
 * CSIH/CSOH devolved court identifiers, and pre-1906 historical series.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Scottish Court Identifiers ──────────────────────────────────────────────

/**
 * OSCOLA Rule 2.1.9: Scottish court identifiers for neutral citations.
 */
export const SCOTTISH_COURT_IDS = [
  "CSIH", // Court of Session, Inner House
  "CSOH", // Court of Session, Outer House
  "HCJAC", // High Court of Justiciary (Appeal Court)
  "HCJ", // High Court of Justiciary
  "SAC", // Sheriff Appeal Court
  "ScotCS", // Court of Session (older neutral citations)
  "ScotHC", // High Court of Justiciary (older neutral citations)
] as const;

/**
 * OSCOLA Rule 2.1.9: Scottish report series from which the court is apparent.
 */
const SCOTTISH_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "SC",
  "SC (HL)",
  "SC (PC)",
  "SLT",
  "SCLR",
  "JC",
  "CSIH",
  "CSOH",
  "HCJAC",
]);

// ─── Pre-1906 Historical Series ─────────────────────────────────────────────

/**
 * Pre-1906 Scottish historical report series with editor designations.
 * S = Shaw; D = Dunlop; M = Macpherson; R = Rettie; F = Fraser.
 */
export const SCOTTISH_HISTORICAL_SERIES: ReadonlyMap<string, string> = new Map([
  ["S", "Shaw"],
  ["D", "Dunlop"],
  ["M", "Macpherson"],
  ["R", "Rettie"],
  ["F", "Fraser"],
]);

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface OscolaScottishCaseData {
  /** Case name (will be italicised; 'v' is rendered in roman). */
  caseName: string;
  /** Year of the decision or report. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /** Report series abbreviation. */
  reportSeries: string;
  /** Starting page number. */
  startPage: number | string;
  /** Neutral citation (for post-devolution cases). */
  neutralCitation?: ScottishNeutralCitation;
  /** Court identifier (if not apparent from series). */
  courtId?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Whether this is a pre-1906 historical series citation.
   * If true, the single-letter series code (S/D/M/R/F) is used.
   */
  historicalSeries?: boolean;
}

export interface ScottishNeutralCitation {
  /** Year in square brackets. */
  year: number;
  /** Court identifier (CSIH, CSOH, HCJAC, etc.). */
  court: string;
  /** Judgment number. */
  number: number;
}

// ─── Case Name Rendering ─────────────────────────────────────────────────────

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

// ─── OSC-003: Scottish Case (OSCOLA Rule 2.1.9) ─────────────────────────────

/**
 * Formats a Scottish case citation per OSCOLA Rule 2.1.9.
 *
 * OSCOLA Rule 2.1.9: Scottish cases use Session Cases (SC),
 * Scots Law Times (SLT), and devolved court identifiers (CSIH, CSOH).
 * Pre-1906 historical series use single-letter codes with editor designation.
 * Criminal cases use JC and HCJAC. Sheriff court cases use the
 * neutral citation format.
 *
 * @example
 *   // AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, 2011 SC 158
 *   formatOscolaScottishCase({
 *     caseName: "AXA General Insurance Ltd v Lord Advocate",
 *     year: 2011, yearType: "round",
 *     reportSeries: "SC", startPage: 158,
 *     neutralCitation: { year: 2011, court: "CSIH", number: 31 },
 *   })
 *
 * @example
 *   // Balfour v Baird (1857) 19 D 534
 *   formatOscolaScottishCase({
 *     caseName: "Balfour v Baird",
 *     year: 1857, yearType: "round",
 *     volume: 19, reportSeries: "D", startPage: 534,
 *     historicalSeries: true,
 *   })
 */
export function formatOscolaScottishCase(
  data: OscolaScottishCaseData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name with 'v' in roman
  runs.push(...renderCaseName(data.caseName));

  // Neutral citation (if present)
  if (data.neutralCitation) {
    const nc = data.neutralCitation;
    runs.push({ text: ` [${nc.year}] ${nc.court} ${nc.number}` });
  }

  // Report citation
  const open = data.yearType === "round" ? "(" : "[";
  const close = data.yearType === "round" ? ")" : "]";
  let reportText = "";

  if (data.neutralCitation) {
    // Comma separator when following a neutral citation
    reportText += ", ";
  } else {
    reportText += " ";
  }

  reportText += `${open}${data.year}${close}`;
  if (data.volume !== undefined) {
    reportText += ` ${data.volume}`;
  }
  reportText += ` ${data.reportSeries} ${data.startPage}`;
  runs.push({ text: reportText });

  // Court identifier (if not apparent from series)
  if (
    data.courtId &&
    !SCOTTISH_SERIES_IMPLIED_COURT.has(data.reportSeries) &&
    !data.neutralCitation
  ) {
    runs.push({ text: ` (${data.courtId})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
