/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: Hong Kong (Rules 19.1–19.2)
 *
 * Pure formatting functions for Hong Kong case citations, legislation,
 * and Basic Law provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-005: Hong Kong Cases (Rule 19.1) ──────────────────────────────────

/**
 * Series and identifiers from which the court is apparent, so the court
 * name parenthetical is unnecessary (rules 19.1 and 2.2.6): the HKCFAR
 * (Hong Kong Court of Final Appeal Reports) ties to a single court, and
 * HKCFA/HKCA are medium neutral court identifiers, not report series.
 */
const HK_SERIES_IMPLYING_COURT: ReadonlySet<string> = new Set(["HKCFAR", "HKCFA", "HKCA"]);

/**
 * Formats a Hong Kong case citation per AGLC4 Rule 19.1.
 *
 * AGLC4 Rule 19.1: Hong Kong cases are cited in accordance with
 * chapter 2, except that individuals' names (parties and judicial
 * officers) are generally given in full. The authorised series are the
 * HKLRD, HKCFAR and HKLR; the commonly used unauthorised series is the
 * HKC. Adding the court's name can be helpful, per rule 2.2.6.
 *
 * @example
 *   // Ng Ka Ling v Director of Immigration [1999] 1 HKLRD 315  — AGLC4 ex 1
 *   formatCase({ caseName: "Ng Ka Ling v Director of Immigration", year: 1999, reportSeries: "HKLRD", volume: 1, startingPage: 315 })
 *
 * @example
 *   // Victor Chandler (International) Ltd v Zhou Chu Jian He (2007)
 *   //   12 HKPLR 595, 601 [24] (Court of First Instance)  — AGLC4 ex 2
 *   formatCase({ caseName: "Victor Chandler (International) Ltd v Zhou Chu Jian He", year: 2007, yearType: "round", volume: 12, reportSeries: "HKPLR", startingPage: 595, pinpoint: "601 [24]", court: "Court of First Instance" })
 *
 * @param data - Hong Kong case citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatCase(data: {
  caseName: string;
  year: number;
  reportSeries: string;
  volume?: number;
  startingPage: number;
  court?: string;
  /**
   * Year bracket style per rules 2.2.3–2.2.4: square for year-organised
   * series (default), round for volume-organised series.
   */
  yearType?: "round" | "square";
  /** Pinpoint reference (follows the starting page after a comma). */
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year (square brackets for year-organised series — the default)
  const yearType = data.yearType ?? "square";
  const open = yearType === "round" ? "(" : "[";
  const close = yearType === "round" ? ")" : "]";
  runs.push({ text: ` ${open}${data.year}${close}` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court identifier (if not apparent from series)
  if (data.court && !HK_SERIES_IMPLYING_COURT.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-005: Hong Kong Legislation (Rule 19.2.1) ──────────────────────────

/**
 * Formats a Hong Kong legislative citation per AGLC4 Rule 19.2.1.
 *
 * AGLC4 Rule 19.2.1: Hong Kong principal and delegated legislation
 * follows rules 3.1 and 3.4–3.5 with three modifications: no year is
 * included (unless the legislation has no chapter number, or is cited
 * historically as enacted); the jurisdiction is written '(Hong Kong)';
 * and the chapter number ('cap …') follows the jurisdiction, taking a
 * comma before any pinpoint.
 *
 * @example
 *   // Evidence Ordinance (Hong Kong) cap 8, s 4  — AGLC4 ex 7
 *   formatLegislation({ title: "Evidence Ordinance", capNumber: "8", pinpoint: "s 4" })
 *
 * @example
 *   // Rules of the High Court (Hong Kong) cap 4A  — AGLC4 ex 9
 *   formatLegislation({ title: "Rules of the High Court", capNumber: "4A" })
 *
 * @param data - Hong Kong legislation citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatLegislation(data: {
  title: string;
  /**
   * Year, included only when the legislation has no chapter number or
   * is cited historically as enacted (rule 19.2.1 exception).
   */
  year?: number;
  /** Jurisdiction — rule 19.2.1 prescribes 'Hong Kong' (the default). */
  jurisdiction?: string;
  /** Chapter number (e.g. '8', '4A'), emitted as 'cap 8' after the jurisdiction. */
  capNumber?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const jurisdiction = data.jurisdiction ?? "Hong Kong";

  // Title in italics (with year only in the rule 19.2.1 exception cases)
  if (data.year !== undefined) {
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
  } else {
    runs.push({ text: data.title, italic: true });
  }

  // Jurisdiction in parentheses — written '(Hong Kong)' (rule 19.2.1)
  runs.push({ text: ` (${jurisdiction})` });

  // Chapter number after the jurisdiction (rule 19.2.1)
  if (data.capNumber) {
    runs.push({ text: ` cap ${data.capNumber}` });
  }

  // Pinpoint — comma after the chapter number when present (rule 19.2.1)
  if (data.pinpoint) {
    runs.push({ text: data.capNumber ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-005: Hong Kong Basic Law (Rule 19.2.2) ────────────────────────────

/**
 * Formats a citation to the Hong Kong Basic Law per AGLC4 Rule 19.2.2.
 *
 * AGLC4 Rule 19.2.2: the Hong Kong Constitution is cited by the full
 * italicised title of the Basic Law plus a pinpoint.
 *
 * @example
 *   // Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China art 4  — AGLC4 ex 10
 *   formatConstitution({ title: "Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China", pinpoint: "art 4" })
 *
 * @param data - Hong Kong Basic Law citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: { title: string; pinpoint?: string }): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Pinpoint (article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
