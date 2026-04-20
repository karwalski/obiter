/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSC-007: OSCOLA Rule 2.3 — UK Parliamentary Materials
 *
 * Formats Hansard (HC Deb/HL Deb), Command Papers (C/Cd/Cmd/Cmnd/Cm series),
 * and Law Commission reports.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface OscolaHansardData {
  /** Chamber: House of Commons or House of Lords. */
  chamber: "HC" | "HL";
  /** Date of the debate (e.g. '3 March 2020'). */
  date: string;
  /** Volume number. */
  volume: number;
  /** Column number or range (e.g. 800 or '800-05'). */
  column: number | string;
  /** Speaker name (optional). */
  speaker?: string;
}

export interface OscolaCommandPaperData {
  /** Author or issuing body. */
  author: string;
  /** Title of the paper (will be italicised). */
  title: string;
  /**
   * Command paper series prefix.
   * - 'C': 1st series (1833–1869)
   * - 'Cd': 2nd series (1900–1918)
   * - 'Cmd': 3rd series (1919–1956)
   * - 'Cmnd': 4th series (1956–1986)
   * - 'Cm': 5th series (1986–present)
   */
  seriesPrefix: "C" | "Cd" | "Cmd" | "Cmnd" | "Cm";
  /** Paper number. */
  paperNumber: string | number;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface OscolaLawCommissionData {
  /** Title of the report (will be italicised). */
  title: string;
  /** Law Commission report number. */
  reportNumber: number | string;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface OscolaParliamentaryReportData {
  /** Committee or body name. */
  committee: string;
  /** Title of the report (will be italicised). */
  title: string;
  /** Session identifier (e.g. '2019-21'). */
  session?: string;
  /** Paper number (e.g. 'HC 95', 'HL Paper 30'). */
  paperNumber?: string;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── OSC-007: Hansard (OSCOLA Rule 2.3) ─────────────────────────────────────

/**
 * Formats a UK Hansard citation per OSCOLA Rule 2.3.
 *
 * OSCOLA Rule 2.3: Hansard is cited as
 *   'HC Deb/HL Deb Day Month Year, vol X, col Y'
 * All in roman type (not italic). Speaker in parentheses if included.
 *
 * @example
 *   // HC Deb 3 March 2020, vol 672, col 800 (Boris Johnson)
 *   formatOscolaHansard({
 *     chamber: "HC", date: "3 March 2020",
 *     volume: 672, column: 800, speaker: "Boris Johnson",
 *   })
 *
 * @example
 *   // HL Deb 18 November 2019, vol 800, col 60
 *   formatOscolaHansard({
 *     chamber: "HL", date: "18 November 2019",
 *     volume: 800, column: 60,
 *   })
 */
export function formatOscolaHansard(data: OscolaHansardData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Chamber abbreviation + Deb
  let text = `${data.chamber} Deb ${data.date}, vol ${data.volume}, col ${data.column}`;

  // Speaker in parentheses
  if (data.speaker) {
    text += ` (${data.speaker})`;
  }

  runs.push({ text });

  return runs;
}

// ─── OSC-007: Command Papers (OSCOLA Rule 2.3) ──────────────────────────────

/**
 * Formats a UK Command Paper citation per OSCOLA Rule 2.3.
 *
 * OSCOLA Rule 2.3: Command Papers are cited with the author/body,
 * title in italics, and the command paper number and year in parentheses.
 * The series prefix (C, Cd, Cmd, Cmnd, Cm) indicates the historical series.
 *
 * @example
 *   // Lord Chancellor's Department, Striking the Balance (Cm 6189, 2004)
 *   formatOscolaCommandPaper({
 *     author: "Lord Chancellor's Department",
 *     title: "Striking the Balance",
 *     seriesPrefix: "Cm", paperNumber: "6189", year: 2004,
 *   })
 *
 * @example
 *   // Ministry of Justice, Proposals for the Reform of Legal Aid in England and Wales (Cm 7967, 2010)
 *   formatOscolaCommandPaper({
 *     author: "Ministry of Justice",
 *     title: "Proposals for the Reform of Legal Aid in England and Wales",
 *     seriesPrefix: "Cm", paperNumber: "7967", year: 2010,
 *   })
 */
export function formatOscolaCommandPaper(
  data: OscolaCommandPaperData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author}, ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Command paper number and year in parentheses
  runs.push({
    text: ` (${data.seriesPrefix} ${data.paperNumber}, ${data.year})`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── OSC-007: Law Commission Reports (OSCOLA Rule 2.3) ──────────────────────

/**
 * Formats a Law Commission report citation per OSCOLA Rule 2.3.
 *
 * OSCOLA Rule 2.3: Law Commission reports are cited as
 *   'Law Commission, Title (Law Com No X, Year)'
 * Title in italics; 'Law Commission' and parenthetical in roman.
 *
 * @example
 *   // Law Commission, Aggravated, Exemplary and Restitutionary Damages (Law Com No 247, 1997)
 *   formatOscolaLawCommission({
 *     title: "Aggravated, Exemplary and Restitutionary Damages",
 *     reportNumber: 247, year: 1997,
 *   })
 */
export function formatOscolaLawCommission(
  data: OscolaLawCommissionData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // "Law Commission, "
  runs.push({ text: "Law Commission, " });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Report number and year
  runs.push({ text: ` (Law Com No ${data.reportNumber}, ${data.year})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── OSC-007: Parliamentary Reports (OSCOLA Rule 2.3) ────────────────────────

/**
 * Formats a UK Parliamentary report citation per OSCOLA Rule 2.3.
 *
 * OSCOLA Rule 2.3: Parliamentary reports (select committee reports, etc.)
 * are cited with the committee name, title in italics, session identifier,
 * and paper number.
 *
 * @example
 *   // House of Commons Justice Committee, The Coroner Service (2019-21, HC 68)
 *   formatOscolaParliamentaryReport({
 *     committee: "House of Commons Justice Committee",
 *     title: "The Coroner Service",
 *     session: "2019-21", paperNumber: "HC 68", year: 2021,
 *   })
 */
export function formatOscolaParliamentaryReport(
  data: OscolaParliamentaryReportData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Committee name
  runs.push({ text: `${data.committee}, ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Session and paper number in parentheses
  const parts: string[] = [];
  if (data.session) {
    parts.push(data.session);
  }
  if (data.paperNumber) {
    parts.push(data.paperNumber);
  }
  if (parts.length > 0) {
    runs.push({ text: ` (${parts.join(", ")})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
