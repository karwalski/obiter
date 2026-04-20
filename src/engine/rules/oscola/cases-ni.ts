/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSC-004: OSCOLA Rule 2.1 (NI-specific) — Northern Ireland Courts
 *
 * Handles Northern Ireland case citations with NICA, NIQB, NIJB
 * court identifiers and NI report series.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── NI Court Identifiers ────────────────────────────────────────────────────

/**
 * OSCOLA Rule 2.1 (NI-specific): Northern Ireland court identifiers.
 */
export const NI_COURT_IDS = [
  "NICA", // Court of Appeal in Northern Ireland
  "NIQB", // High Court (Queen's Bench Division)
  "NICh", // High Court (Chancery Division)
  "NIFam", // High Court (Family Division)
  "NIJB", // Judgment Bulletin
  "NICC", // Crown Court
  "NIMag", // Magistrates' Court
  "NIMHC", // Mental Health Review Commission
] as const;

/**
 * NI report series from which the court is apparent.
 */
const NI_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "NICA",
  "NIQB",
  "NICh",
  "NIFam",
  "NIJB",
  "NICC",
]);

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface OscolaNICaseData {
  /** Case name (will be italicised; 'v' is rendered in roman). */
  caseName: string;
  /** Neutral citation (post-2001 NI cases). */
  neutralCitation?: NINeutralCitation;
  /** Report citation (NI report series). */
  reportCitation?: NIReportCitation;
  /** Court identifier (if not apparent from series). */
  courtId?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NINeutralCitation {
  /** Year in square brackets. */
  year: number;
  /** Court identifier (NICA, NIQB, NIJB, etc.). */
  court: string;
  /** Judgment number. */
  number: number;
}

export interface NIReportCitation {
  /** Year of the report volume. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /** Report series abbreviation (e.g. 'NI', 'NIJB'). */
  series: string;
  /** Starting page number. */
  startPage: number | string;
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

// ─── OSC-004: Northern Ireland Case (OSCOLA Rule 2.1, NI) ───────────────────

/**
 * Formats a Northern Ireland case citation per OSCOLA Rule 2.1 (NI-specific).
 *
 * OSCOLA Rule 2.1 (NI): Northern Ireland cases use neutral citation
 * identifiers NICA, NIQB, NIJB. The NI report series (NI, NIJB) are
 * used as the best report where available. Court identifier is placed
 * in parentheses if not apparent from the series or neutral citation.
 *
 * @example
 *   // Re McFarland [2004] NICA 29, [2004] NI 380
 *   formatOscolaNICase({
 *     caseName: "Re McFarland",
 *     neutralCitation: { year: 2004, court: "NICA", number: 29 },
 *     reportCitation: { year: 2004, yearType: "square", series: "NI", startPage: 380 },
 *   })
 *
 * @example
 *   // R v Magee [2001] NIQB 14
 *   formatOscolaNICase({
 *     caseName: "R v Magee",
 *     neutralCitation: { year: 2001, court: "NIQB", number: 14 },
 *   })
 */
export function formatOscolaNICase(data: OscolaNICaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name with 'v' in roman
  runs.push(...renderCaseName(data.caseName));

  // Neutral citation
  if (data.neutralCitation) {
    const nc = data.neutralCitation;
    runs.push({ text: ` [${nc.year}] ${nc.court} ${nc.number}` });
  }

  // Report citation
  if (data.reportCitation) {
    const rc = data.reportCitation;
    const open = rc.yearType === "round" ? "(" : "[";
    const close = rc.yearType === "round" ? ")" : "]";

    let reportText = data.neutralCitation ? ", " : " ";
    reportText += `${open}${rc.year}${close}`;
    if (rc.volume !== undefined) {
      reportText += ` ${rc.volume}`;
    }
    reportText += ` ${rc.series} ${rc.startPage}`;
    runs.push({ text: reportText });
  }

  // Court identifier (if not apparent)
  if (data.courtId && !data.neutralCitation) {
    const series = data.reportCitation?.series;
    if (!series || !NI_SERIES_IMPLIED_COURT.has(series)) {
      runs.push({ text: ` (${data.courtId})` });
    }
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
