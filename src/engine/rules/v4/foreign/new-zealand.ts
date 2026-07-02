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
   * Identifies Māori Land Court or Waitangi Tribunal decisions. Not
   * consumed by formatCase — those decisions have their own formats:
   * use {@link formatMaoriLandCourt} (rule 21.1.4) or
   * {@link formatWaitangiTribunal} (rule 21.1.5) instead.
   */
  specialCourt?: "MaoriLandCourt" | "WaitangiTribunal";
}

// ─── Court-implied series ────────────────────────────────────────────────────

/**
 * Report series from which the court can be inferred (Rule 21.1).
 * When a case is reported in one of these series, the court identifier
 * is omitted.
 */
const NZ_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set(["NZLR", "NZAR"]);

// ─── FRGN-007-CASE: New Zealand Cases (Rule 21.1) ───────────────────────────

/**
 * Formats a New Zealand case citation per AGLC4 Rule 21.1.
 *
 * AGLC4 Rule 21.1.1: New Zealand cases follow chapter 2 unchanged.
 * Rule 21.1.2: the authorised NZLR is the preferred series. Rule
 * 21.1.3: court-assigned medium neutral citations use identifiers
 * such as NZSC, NZCA and NZHC (from the years in the 21.1.3 table).
 * Māori Land Court and Māori Appellate Court decisions have their own
 * minute-book format — use {@link formatMaoriLandCourt} (rule 21.1.4).
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

// ─── NZ Māori Land Court Data ────────────────────────────────────────────────

interface NZMaoriLandCourtData {
  /** Parties' names, separated with 'v' (e.g. "O'Rorke v Hohaia"). */
  parties: string;
  /**
   * Block name, included only where it appears in the decision
   * (e.g. 'Pukekohatu 7B Block'). Joined to the parties with a spaced
   * em-dash inside the italicised case name.
   */
  blockName?: string;
  /** Year of the decision (round brackets). */
  year: number;
  /** Case (minute book volume) number (e.g. 173). */
  caseNumber: number | string;
  /** Registry name, written in full (e.g. 'Aotea', 'Hauraki'). */
  registry: string;
  /**
   * Minute book abbreviation per the rule 21.1.4 table: 'MB' (Minute
   * Book), 'ACMB' (Appellate Court Minute Book) or 'CJMB' (Chief
   * Judge's Minute Book). Defaults to 'MB'. See NZ_MINUTE_BOOKS in
   * src/engine/data/nz-court-identifiers.ts.
   */
  minuteBook?: "MB" | "ACMB" | "CJMB";
  /** Starting page in the minute book. */
  startingPage: number | string;
  /** Pinpoint reference (rule 2.2.5). */
  pinpoint?: string;
  /** Judicial officer(s), per rule 2.4.1 (e.g. 'Judge Harvey'). */
  judicialOfficer?: string;
}

// ─── FRGN-007-MLC: Māori Land Court and Māori Appellate Court (Rule 21.1.4) ─

/**
 * Formats a Māori Land Court or Māori Appellate Court decision per
 * AGLC4 Rule 21.1.4.
 *
 * AGLC4 Rule 21.1.4 template: *Parties' Names — Block Name* (Year)
 * Case Number Registry Minute Book Abbreviation Starting Page,
 * Pinpoint. The block name is included only where it appears in the
 * decision (omitting any introductory 'In the matter of'); where no
 * minute book reference is available, cite as an unreported decision
 * under rule 2.3.
 *
 * @example
 *   // O'Rorke v Hohaia — Pukekohatu 7B Block (2006) 173 Aotea MB 114,
 *   //   117 [12]–[13] (Judge Harvey)  — AGLC4 ex 13
 *   formatMaoriLandCourt({
 *     parties: "O'Rorke v Hohaia", blockName: "Pukekohatu 7B Block",
 *     year: 2006, caseNumber: 173, registry: "Aotea",
 *     startingPage: 114, pinpoint: "117 [12]–[13]",
 *     judicialOfficer: "Judge Harvey",
 *   })
 *
 * @example
 *   // Taipari v Hauraki Maori Trust Board (2008) 114 Hauraki MB 34  — AGLC4 ex 14
 *   formatMaoriLandCourt({
 *     parties: "Taipari v Hauraki Maori Trust Board",
 *     year: 2008, caseNumber: 114, registry: "Hauraki", startingPage: 34,
 *   })
 */
export function formatMaoriLandCourt(data: NZMaoriLandCourtData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const minuteBook = data.minuteBook ?? "MB";

  // Case name in italics, with the block name after a spaced em-dash
  const caseName = data.blockName ? `${data.parties} — ${data.blockName}` : data.parties;
  runs.push({ text: caseName, italic: true });

  // Year, case number, registry, minute book abbreviation, starting page
  runs.push({
    text: ` (${data.year}) ${data.caseNumber} ${data.registry} ${minuteBook} ${data.startingPage}`,
  });

  // Pinpoint (rule 2.2.5)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Judicial officer(s) (rule 2.4.1)
  if (data.judicialOfficer) {
    runs.push({ text: ` (${data.judicialOfficer})` });
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
export function formatWaitangiTribunal(data: NZWaitangiTribunalData): FormattedRun[] {
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
export function formatDelegatedLegislation(data: NZDelegatedLegislationData): FormattedRun[] {
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
