/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-007: AGLC4 Rules 21.1–21.3 — New Zealand
 *
 * Formatting functions for New Zealand cases and legislation.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── NZ Case Data ────────────────────────────────────────────────────────────

interface NZCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year of the report or decision. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for round-bracket/volume-organised series). */
  volume?: number;
  /** Report series abbreviation (e.g. 'NZLR', 'NZAR', 'NZSC'). */
  reportSeries: string;
  /** Starting page or paragraph number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Court identifier. Omitted when apparent from the report series.
   * Required for medium neutral citations (e.g. 'NZSC', 'NZCA', 'NZHC').
   */
  courtId?: string;
  /**
   * Identifies Maori Land Court or Waitangi Tribunal decisions,
   * which use distinctive court abbreviations per Rule 21.1.
   */
  specialCourt?: "MaoriLandCourt" | "WaitangiTribunal";
}

// ─── Court-implied series ────────────────────────────────────────────────────

/**
 * Report series from which the court can be inferred (Rule 21.1).
 * When a case is reported in one of these series, the court identifier
 * is omitted.
 */
const NZ_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "NZLR",
  "NZAR",
]);

// ─── FRGN-007-CASE: New Zealand Cases (Rule 21.1) ───────────────────────────

/**
 * Formats a New Zealand case citation per AGLC4 Rule 21.1.
 *
 * AGLC4 Rule 21.1: New Zealand case citations follow the general
 * foreign case format. The NZLR and NZAR are the primary report
 * series. Medium neutral citations use court identifiers such as
 * NZSC, NZCA, and NZHC. The Maori Land Court uses the abbreviation
 * 'NZ Maori LR' and the Waitangi Tribunal uses 'Waitangi Tribunal'.
 *
 * @example
 *   // Couch v Attorney-General [2008] 3 NZLR 725
 *   formatCase({
 *     caseName: "Couch v Attorney-General",
 *     year: 2008, yearType: "square",
 *     volume: 3, reportSeries: "NZLR",
 *     startingPage: 725,
 *   })
 *
 * @example
 *   // Proprietors of Wakatū v Attorney-General [2017] NZSC 17
 *   formatCase({
 *     caseName: "Proprietors of Wakatū v Attorney-General",
 *     year: 2017, yearType: "square",
 *     reportSeries: "NZSC", startingPage: 17,
 *   })
 */
export function formatCase(data: NZCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year
  const open = data.yearType === "round" ? "(" : "[";
  const close = data.yearType === "round" ? ")" : "]";
  let yearText = ` ${open}${data.year}${close}`;
  if (data.volume !== undefined) {
    yearText += ` ${data.volume}`;
  }
  runs.push({ text: yearText });

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court identifier (omitted when apparent from series)
  if (data.courtId && !NZ_SERIES_IMPLIED_COURT.has(data.reportSeries)) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── NZ Waitangi Tribunal Data ───────────────────────────────────────────────

interface NZWaitangiTribunalData {
  /** Title of the report. */
  title: string;
  /** Wai number (e.g. 'Wai 413'). */
  waiNumber?: string;
  /** Year of the report. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-007-WAITANGI: Waitangi Tribunal (Rule 21.1.5) ────────────────────

/**
 * Formats a Waitangi Tribunal report citation per AGLC4 Rule 21.1.5.
 *
 * AGLC4 Rule 21.1.5: Reports of the Waitangi Tribunal should be cited as:
 * Waitangi Tribunal, *Title of Report* (Wai Number, Year) Pinpoint.
 *
 * @example
 *   // Waitangi Tribunal, Maori Electoral Option Report (Wai 413, 1994) 37 [5.1]
 *   formatWaitangiTribunal({
 *     title: "Maori Electoral Option Report",
 *     waiNumber: "Wai 413", year: 1994,
 *     pinpoint: "37 [5.1]",
 *   })
 */
export function formatWaitangiTribunal(
  data: NZWaitangiTribunalData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author: Waitangi Tribunal
  runs.push({ text: "Waitangi Tribunal, " });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Parenthetical: Wai number (if available) and year
  const parenParts: string[] = [];
  if (data.waiNumber) {
    parenParts.push(data.waiNumber);
  }
  parenParts.push(String(data.year));
  runs.push({ text: ` (${parenParts.join(", ")})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZ Delegated Legislation Data ──────────────────────────────────────────

interface NZDelegatedLegislationData {
  /** Short title of the regulation. */
  title: string;
  /** Year of the regulation. */
  year: number;
  /** Statutory rule number (e.g. 'SR 2003/288'). */
  srNumber?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-007-DELEGATED: NZ Delegated Legislation (Rule 21.2.2) ────────────

/**
 * Formats a NZ delegated legislation citation per AGLC4 Rule 21.2.2.
 *
 * AGLC4 Rule 21.2.2: NZ delegated legislation is cited in the standard
 * format but includes a statutory rule number (SR Year/Number) after
 * the jurisdiction.
 *
 * @example
 *   // Electronic Transactions Regulations 2003 (NZ) SR 2003/288, reg 4
 *   formatDelegatedLegislation({
 *     title: "Electronic Transactions Regulations",
 *     year: 2003,
 *     srNumber: "SR 2003/288",
 *     pinpoint: "reg 4",
 *   })
 */
export function formatDelegatedLegislation(
  data: NZDelegatedLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year in italics
  runs.push({ text: `${data.title} ${data.year}`, italic: true });

  // Jurisdiction
  runs.push({ text: " (NZ)" });

  // SR number
  if (data.srNumber) {
    runs.push({ text: ` ${data.srNumber}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    if (data.srNumber) {
      runs.push({ text: `, ${data.pinpoint}` });
    } else {
      runs.push({ text: ` ${data.pinpoint}` });
    }
  }

  return runs;
}

// ─── NZ Legislation Data ─────────────────────────────────────────────────────

interface NZLegislationData {
  /** Short title of the Act (e.g. 'Property Law Act'). */
  title: string;
  /** Year of the Act. */
  year: number;
  /** Jurisdiction abbreviation — always 'NZ'. */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 27'). */
  pinpoint?: string;
}

// ─── FRGN-007-LEG: New Zealand Legislation (Rules 21.2–21.3) ────────────────

/**
 * Formats a New Zealand legislation citation per AGLC4 Rules 21.2–21.3.
 *
 * AGLC4 Rule 21.2: New Zealand statutes are cited with the title and
 * year in italics, followed by the jurisdiction abbreviation '(NZ)'
 * in roman type. The jurisdiction abbreviation is mandatory.
 *
 * AGLC4 Rule 21.3: Delegated legislation follows the same format
 * as statutes, with the title and year in italics.
 *
 * @example
 *   // Property Law Act 2007 (NZ)
 *   formatLegislation({ title: "Property Law Act", year: 2007 })
 *
 * @example
 *   // Property Law Act 2007 (NZ) s 27
 *   formatLegislation({ title: "Property Law Act", year: 2007, pinpoint: "s 27" })
 */
export function formatLegislation(data: NZLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "NZ";

  // Title and year in italics
  runs.push({ text: `${data.title} ${data.year}`, italic: true });

  // Jurisdiction in parentheses, roman type
  runs.push({ text: ` (${jurisdiction})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
