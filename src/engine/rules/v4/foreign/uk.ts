/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-010: AGLC4 Rules 24.1–24.5 — United Kingdom
 *
 * Formatting functions for UK cases (modern and historical),
 * legislation (including regnal years), delegated legislation (SIs),
 * Hansard, and command papers.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── UK Case Data ────────────────────────────────────────────────────────────

interface UKCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year of the report or decision. */
  year: number;
  /** Whether the year is in round or square brackets. */
  yearType: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /**
   * Report series abbreviation.
   * Modern neutral: 'UKSC', 'UKHL', 'EWCA Civ', 'EWCA Crim', 'EWHC'.
   * Nominate: 'AC', 'QB', 'Ch', 'WLR', 'All ER'.
   * Scottish: 'SC', 'SLT', 'CSIH', 'CSOH'.
   */
  reportSeries: string;
  /** Starting page or paragraph number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Court identifier. Omitted when apparent from the series. */
  courtId?: string;
  /**
   * EWHC division (e.g. 'Admin', 'Ch', 'Comm', 'Fam', 'QB', 'Pat', 'TCC').
   * Placed in parentheses after the court identifier for EWHC citations.
   */
  ewhcDivision?: string;
}

// ─── Series-implied courts ───────────────────────────────────────────────────

/**
 * Report series from which the court can be inferred (Rule 24.1).
 */
const UK_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
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
  "HCJAC",
  "HCJT",
  "CSIH",
  "CSOH",
  "NICA",
  "NICh",
  "NIFam",
  "NIQB",
  "NICC",
  "SC",
  "SLT",
]);

// ─── FRGN-010-CASE: UK Cases (Rules 24.1–24.2) ──────────────────────────────

/**
 * Formats a United Kingdom case citation per AGLC4 Rules 24.1–24.2.
 *
 * AGLC4 Rule 24.1: Modern UK case citations use medium neutral
 * citation identifiers (UKSC, UKHL, EWCA Civ, EWCA Crim, EWHC).
 * Nominate reports (AC, QB, Ch, WLR, All ER) follow the standard
 * reported case format.
 *
 * AGLC4 Rule 24.2: Scottish cases use SC (Session Cases), SLT,
 * CSIH, and CSOH identifiers. The court identifier is placed in
 * parentheses where not apparent from the series.
 *
 * @example
 *   // R (Miller) v Secretary of State for Exiting the European Union [2017] UKSC 5
 *   formatCase({
 *     caseName: "R (Miller) v Secretary of State for Exiting the European Union",
 *     year: 2017, yearType: "square",
 *     reportSeries: "UKSC", startingPage: 5,
 *   })
 *
 * @example
 *   // Donoghue v Stevenson [1932] AC 562
 *   formatCase({
 *     caseName: "Donoghue v Stevenson",
 *     year: 1932, yearType: "square",
 *     reportSeries: "AC", startingPage: 562,
 *   })
 *
 * @example
 *   // AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31
 *   formatCase({
 *     caseName: "AXA General Insurance Ltd v Lord Advocate",
 *     year: 2011, yearType: "square",
 *     reportSeries: "CSIH", startingPage: 31,
 *   })
 */
export function formatCase(data: UKCaseData): FormattedRun[] {
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
  let reportText = ` ${data.reportSeries} ${data.startingPage}`;
  // EWHC division appears after the judgment number: e.g. EWHC 61 (Admin)
  if (data.ewhcDivision) {
    reportText += ` (${data.ewhcDivision})`;
  }
  runs.push({ text: reportText });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court identifier (omitted when apparent from series)
  if (
    data.courtId &&
    !data.ewhcDivision &&
    !UK_SERIES_IMPLIED_COURT.has(data.reportSeries)
  ) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── UK Legislation Data ─────────────────────────────────────────────────────

interface UKLegislationData {
  /** Short title of the Act. */
  title: string;
  /** Year of the Act. */
  year: number;
  /** Jurisdiction abbreviation — defaults to 'UK'. */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 6'). */
  pinpoint?: string;
  /**
   * Regnal year for historical statutes (e.g. '39 & 40 Geo III').
   * When provided, replaces the calendar year and appears after the title.
   */
  regnalYear?: string;
  /** Chapter number for historical statutes (e.g. 'c 67'). */
  chapter?: string;
}

// ─── FRGN-010-LEG: UK Legislation (Rules 24.3–24.4) ─────────────────────────

/**
 * Formats a United Kingdom legislation citation per AGLC4 Rules 24.3–24.4.
 *
 * AGLC4 Rule 24.3: Modern UK statutes are cited with the title
 * and year in italics, followed by the jurisdiction abbreviation
 * '(UK)' in parentheses in roman type.
 *
 * AGLC4 Rule 24.4: Historical statutes use the regnal year and
 * chapter number in lieu of or in addition to the calendar year.
 * The regnal year appears in italics as part of the title. Delegated
 * legislation (Statutory Instruments) uses the SI number.
 *
 * @example
 *   // Human Rights Act 1998 (UK) s 6
 *   formatLegislation({ title: "Human Rights Act", year: 1998, pinpoint: "s 6" })
 *
 * @example
 *   // Act of Settlement 1701, 12 & 13 Will III, c 2 (UK)
 *   formatLegislation({
 *     title: "Act of Settlement",
 *     year: 1701,
 *     regnalYear: "12 & 13 Will III",
 *     chapter: "c 2",
 *   })
 */
export function formatLegislation(data: UKLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "UK";

  if (data.regnalYear) {
    // Historical statute with regnal year (Rule 24.2.2–24.2.3)
    // Pre-1963 UK Parliament statutes omit jurisdiction; (Imp) is optional
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
    // Jurisdiction appears after title+year only if explicitly provided (e.g. 'Imp')
    if (data.jurisdiction) {
      runs.push({ text: ` (${data.jurisdiction})` });
    } else {
      runs.push({ text: "," });
    }
    runs.push({ text: ` ${data.regnalYear}` });
    if (data.chapter) {
      runs.push({ text: `, ${data.chapter}` });
    }
  } else {
    // Modern statute
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
    runs.push({ text: ` (${jurisdiction})` });
  }

  // Pinpoint (Rule 24.2.4: preceded by comma when regnal year/chapter given)
  if (data.pinpoint) {
    if (data.regnalYear) {
      runs.push({ text: `, ${data.pinpoint}` });
    } else {
      runs.push({ text: ` ${data.pinpoint}` });
    }
  }

  return runs;
}

// ─── Statutory Instrument Data ───────────────────────────────────────────────

interface UKStatutoryInstrumentData {
  /** Title of the SI. */
  title: string;
  /** Year of the SI. */
  year: number;
  /** SI number (e.g. '1234'). */
  siNumber: string;
  /** Jurisdiction abbreviation — defaults to 'UK'. */
  jurisdiction?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-010-SI: Statutory Instruments (Rule 24.4) ─────────────────────────

/**
 * Formats a UK Statutory Instrument citation per AGLC4 Rule 24.4.
 *
 * AGLC4 Rule 24.4: Delegated legislation in the form of Statutory
 * Instruments is cited with the title in italics, followed by the
 * year, the SI number, and the jurisdiction abbreviation.
 *
 * @example
 *   // Civil Procedure Rules 1998 (UK) SI 1998/3132
 *   formatStatutoryInstrument({
 *     title: "Civil Procedure Rules",
 *     year: 1998, siNumber: "3132",
 *   })
 */
export function formatStatutoryInstrument(
  data: UKStatutoryInstrumentData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "UK";

  // Title and year in italics
  runs.push({ text: `${data.title} ${data.year}`, italic: true });

  // Jurisdiction and SI number
  runs.push({ text: ` (${jurisdiction}) SI ${data.year}/${data.siNumber}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── Hansard Data ────────────────────────────────────────────────────────────

interface UKHansardData {
  /** Chamber: House of Lords or House of Commons. */
  chamber: "HL" | "HC";
  /** Date of the debate (e.g. '3 March 2020'). */
  date: string;
  /** Volume number. */
  volume: number;
  /** Column number. */
  column: number | string;
  /** Speaker name (optional). */
  speaker?: string;
  /** Series number (e.g. 5 for 5th series). */
  series?: number;
}

// ─── FRGN-010-HANSARD: UK Hansard (Rule 24.5) ───────────────────────────────

/**
 * Formats a UK Hansard citation per AGLC4 Rule 24.5.
 *
 * AGLC4 Rule 24.5: United Kingdom parliamentary debates are cited
 * as 'United Kingdom, Parliamentary Debates, House of [Lords/Commons],
 * date, vol X, col Y (Speaker)'. Abbreviated forms use
 * 'HL Deb' or 'HC Deb'.
 *
 * @example
 *   // United Kingdom, Parliamentary Debates, House of Commons,
 *   // 3 March 2020, vol 672, col 800 (Boris Johnson)
 *   formatHansard({
 *     chamber: "HC", date: "3 March 2020",
 *     volume: 672, column: 800, speaker: "Boris Johnson",
 *   })
 */
export function formatHansard(data: UKHansardData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const chamberFull =
    data.chamber === "HL" ? "House of Lords" : "House of Commons";

  runs.push({
    text: "United Kingdom, Parliamentary Debates, ",
  });
  runs.push({ text: chamberFull });

  let details = `, ${data.date}, vol ${data.volume}, col ${data.column}`;
  if (data.speaker) {
    details += ` (${data.speaker})`;
  }
  runs.push({ text: details });

  return runs;
}

// ─── Command Paper Data ─────────────────────────────────────────────────────

interface UKCommandPaperData {
  /** Author or body. */
  author: string;
  /** Title of the paper (will be italicised). */
  title: string;
  /** Command paper series prefix (e.g. 'Cmd', 'Cmnd', 'Cm'). */
  seriesPrefix: string;
  /** Paper number. */
  paperNumber: string;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── FRGN-010-CMD: Command Papers (Rule 24.5) ───────────────────────────────

/**
 * Formats a UK Command Paper citation per AGLC4 Rule 24.5.
 *
 * AGLC4 Rule 24.5: Command papers are cited with the author,
 * title in italics, and the command paper number and year in
 * parentheses.
 *
 * @example
 *   // Lord Chancellor's Department, Striking the Balance (Cm 6189, 2004)
 *   formatCommandPaper({
 *     author: "Lord Chancellor's Department",
 *     title: "Striking the Balance",
 *     seriesPrefix: "Cm", paperNumber: "6189", year: 2004,
 *   })
 */
export function formatCommandPaper(data: UKCommandPaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author}, ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Command paper number and year
  runs.push({
    text: ` (${data.seriesPrefix} ${data.paperNumber}, ${data.year})`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
