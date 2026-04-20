/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-001 + NZLSG-002: NZ Case Citations
 *
 * NZLSG Rule 3.2–3.4: NZ cases with neutral citation and parallel reports.
 * Post-neutral: [Year] CourtIdentifier Number
 * Pre-neutral (unreported): Case Name Court Registry File#, Date
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── NZ Court Identifiers (NZLSG 3.3.3) ────────────────────────────────────

/**
 * Court identifiers per NZLSG 3.3.3 table.
 */
export const NZ_COURT_IDENTIFIERS = [
  "NZSC",
  "NZCA",
  "NZHC",
  "NZDC",
  "NZFC",
  "NZLCRO",
  "NZACC",
  "NZEnvC",
  "NZHRRT",
  "NZMVDT",
  "NZIEAA",
  "NZIACDT",
  "NZLAT",
  "NZSHD",
  "NZTRA",
  "NZBSA",
  "NZREADT",
  "NZEmpC",
  "NZARLA",
  "NZACT",
] as const;

export type NZCourtIdentifier = (typeof NZ_COURT_IDENTIFIERS)[number] | string;

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZNeutralCitationData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year in square brackets for the neutral citation. */
  year: number;
  /** Court identifier (e.g. 'NZCA', 'NZSC'). */
  courtIdentifier: NZCourtIdentifier;
  /** Decision number. */
  decisionNumber: number;
  /** Parallel report citation (optional). */
  parallelReport?: NZReportCitation;
  /** Pinpoint reference with 'at' prefix per NZLSG. */
  pinpoint?: string;
}

export interface NZReportCitation {
  /** Year in square brackets. */
  year: number;
  /** Volume number (if applicable). */
  volume?: number;
  /** Report series abbreviation (e.g. 'NZLR'). */
  reportSeries: string;
  /** Starting page. */
  startPage: number;
}

export interface NZPreNeutralCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Court abbreviation. */
  court: string;
  /** Registry abbreviation (omitted for single-registry courts like NZSC, NZCA). */
  registry?: string;
  /** File number. */
  fileNumber: string;
  /** Decision date formatted as 'D Month Year'. */
  date: string;
  /** Pinpoint reference with 'at' prefix per NZLSG. */
  pinpoint?: string;
}

// ─── NZLSG-001: NZ Case Citation — Neutral Citation ────────────────────────

/**
 * Formats a NZ case citation with neutral citation per NZLSG Rules 3.2–3.3.
 *
 * NZLSG Rule 3.2: The neutral citation format is [Year] CourtIdentifier Number.
 * NZLSG Rule 3.3: Court identifiers are standardised abbreviations.
 *
 * @example
 *   // R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338
 *   formatNeutralCitation({
 *     caseName: "R v Fonotia",
 *     year: 2007,
 *     courtIdentifier: "NZCA",
 *     decisionNumber: 188,
 *     parallelReport: { year: 2007, volume: 3, reportSeries: "NZLR", startPage: 338 },
 *   })
 */
export function formatNeutralCitation(
  data: NZNeutralCitationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Neutral citation: [Year] Court Number
  runs.push({
    text: ` [${data.year}] ${data.courtIdentifier} ${data.decisionNumber}`,
  });

  // Parallel report citation
  if (data.parallelReport) {
    const rpt = data.parallelReport;
    let reportText = `, [${rpt.year}]`;
    if (rpt.volume !== undefined) {
      reportText += ` ${rpt.volume}`;
    }
    reportText += ` ${rpt.reportSeries} ${rpt.startPage}`;
    runs.push({ text: reportText });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-002: NZ Case Citation — Pre-Neutral Citation ────────────────────

/**
 * Formats a NZ case citation for pre-neutral citation era per NZLSG Rule 3.4.
 *
 * NZLSG Rule 3.4: Unreported decisions from before neutral citations:
 * Case Name Court Registry File#, Date.
 *
 * @example
 *   // Taylor v Beere HC Wellington CP 291/85, 7 November 1985
 *   formatPreNeutralCase({
 *     caseName: "Taylor v Beere",
 *     court: "HC",
 *     registry: "Wellington",
 *     fileNumber: "CP 291/85",
 *     date: "7 November 1985",
 *   })
 */
export function formatPreNeutralCase(
  data: NZPreNeutralCaseData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Court
  runs.push({ text: ` ${data.court}` });

  // Registry (omitted for single-registry courts)
  if (data.registry) {
    runs.push({ text: ` ${data.registry}` });
  }

  // File number and date
  runs.push({ text: ` ${data.fileNumber}, ${data.date}` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
