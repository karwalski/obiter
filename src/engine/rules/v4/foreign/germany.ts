/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: Germany (Rules 18.1–18.2)
 *
 * Pure formatting functions for German-language cases, individual laws,
 * codes and the Grundgesetz (Basic Law). German-language elements take
 * a square-bracketed English translation immediately after the element,
 * in roman type (rule 26.1.1).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── German Case Data (Rule 18.1) ────────────────────────────────────────────

interface GermanCaseData {
  /**
   * Popular or commonly used case name (italicised), where one exists;
   * it precedes the court name and takes a roman comma (rule 18.1).
   */
  popularName?: string;
  /**
   * Court name, in roman type (e.g. 'Bundesgerichtshof',
   * 'Oberlandesgericht München'). The leading element of the citation.
   */
  court: string;
  /** English translation of the court name (e.g. 'German Federal Court of Justice'). */
  translation?: string;
  /** Docket/case number (e.g. 'VII ZR 110/83'). */
  caseNumber?: string;
  /** European Case Law Identifier, inserted directly after the case number. */
  ecli?: string;
  /** Full date of the decision (e.g. '19 January 1984'). */
  date: string;
  /**
   * Report citation, emitted after the connector 'reported in'
   * (e.g. '(1984) 89 BGHZ 376, 378'). Omit for unreported decisions —
   * the connector is dropped with it (rule 18.1).
   */
  reportedIn?: string;
}

// ─── FRGN-004: German Cases (Rule 18.1) ─────────────────────────────────────

/**
 * Formats a German case per AGLC4 Rule 18.1.
 *
 * AGLC4 Rule 18.1 template: Court Name, Case Number, Full Date reported
 * in (Year of Decision) Volume Number Abbreviation of Report Series
 * Starting Page, Pinpoint. The court name leads in roman type (never
 * suppressed); a popular case name may precede it in italics with a
 * roman comma; an ECLI follows the case number with a comma on each
 * side; 'reported in' and the report citation appear only when a report
 * exists.
 *
 * @example
 *   // Bundesgerichtshof [German Federal Court of Justice],
 *   //   VII ZR 110/83, 19 January 1984 reported in (1984) 89 BGHZ 376,
 *   //   378  — AGLC4 ex 2
 *   formatCourtDecision({
 *     court: "Bundesgerichtshof",
 *     translation: "German Federal Court of Justice",
 *     caseNumber: "VII ZR 110/83", date: "19 January 1984",
 *     reportedIn: "(1984) 89 BGHZ 376, 378",
 *   })
 *
 * @example
 *   // Pumuckl, Oberlandesgericht München [Munich Court of Appeal],
 *   //   29 U 4743/02, 4 September 2003  — AGLC4 ex 4 (unreported)
 *   formatCourtDecision({
 *     popularName: "Pumuckl",
 *     court: "Oberlandesgericht München",
 *     translation: "Munich Court of Appeal",
 *     caseNumber: "29 U 4743/02", date: "4 September 2003",
 *   })
 */
export function formatCourtDecision(data: GermanCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Popular case name in italics, followed by a roman comma (rule 18.1)
  if (data.popularName) {
    runs.push({ text: data.popularName, italic: true });
    runs.push({ text: ", " });
  }

  // Court name in roman type, with bracketed translation (rule 26.1.1)
  runs.push({ text: data.court });
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Case number, then ECLI with a comma on each side (rule 18.1)
  if (data.caseNumber) {
    runs.push({ text: `, ${data.caseNumber}` });
  }
  if (data.ecli) {
    runs.push({ text: `, ${data.ecli}` });
  }

  // Full date of decision
  runs.push({ text: `, ${data.date}` });

  // Report citation — connector dropped when unreported (rule 18.1)
  if (data.reportedIn) {
    runs.push({ text: ` reported in ${data.reportedIn}` });
  }

  return runs;
}

/**
 * Formats a German case in the legacy reported-case shape.
 *
 * @deprecated This shape (*Case Name* (Year) Volume Series Page) is not
 * the AGLC4 rule 18.1 pattern. Rule 18.1 places the court name first in
 * roman type — it is a mandatory leading element, never suppressed —
 * followed by the docket number, the full date and, where a report
 * exists, 'reported in' plus the report citation. Use
 * {@link formatCourtDecision} instead.
 *
 * @param data - German case citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatCase(data: {
  caseName: string;
  year: number;
  reportSeries: string;
  volume?: number;
  startingPage: number;
  court?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year in parentheses
  runs.push({ text: ` (${data.year})` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Court identifier (if not apparent from report series)
  const seriesImplyingCourt = new Set(["BVerfGE", "BGHZ", "BGHSt"]);
  if (data.court && !seriesImplyingCourt.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-004: German Legislation — Individual Laws and Codes (Rule 18.2) ───

/**
 * Formats a German legislative citation per AGLC4 Rules 18.2.1–18.2.2.
 *
 * AGLC4 Rule 18.2.1 (individual laws): *Title of Law* [Translation]
 * (Germany) Full Date of Enactment, Abbreviated Gazette Name, Year,
 * Starting Page, Pinpoint. The translation is roman (rule 26.1.1).
 *
 * AGLC4 Rule 18.2.2 (codes): *Title of Code* [Translation] (Germany)
 * Pinpoint — no date or gazette reference. A commonly used abbreviation
 * may be given in the first citation as a short title per rule 3.5
 * (e.g. "('BGB')") and used in subsequent references.
 *
 * @example
 *   // Sozialversicherungs-Rechnungsverordnung [Social Security
 *   //   Calculation Regulation] (Germany) 27 April 2009, BGBl I, 2009,
 *   //   951  — AGLC4 ex 5 (rule 18.2.1)
 *   formatLegislation({
 *     title: "Sozialversicherungs-Rechnungsverordnung",
 *     translation: "Social Security Calculation Regulation",
 *     jurisdiction: "Germany",
 *     enactmentDate: "27 April 2009",
 *     gazette: "BGBl I, 2009, 951",
 *   })
 *
 * @example
 *   // Bürgerliches Gesetzbuch [Civil Code] (Germany) § 823(1) ('BGB')
 *   //   — AGLC4 ex 6 (rule 18.2.2)
 *   formatLegislation({
 *     title: "Bürgerliches Gesetzbuch", translation: "Civil Code",
 *     jurisdiction: "Germany", pinpoint: "§ 823(1)", shortTitle: "BGB",
 *   })
 */
export function formatLegislation(data: {
  title: string;
  /**
   * @deprecated Rule 18.2.1 has no separate year element — the full
   * date of enactment (`enactmentDate`) identifies the law. When
   * provided, the year is folded into the italicised title.
   */
  year?: number;
  jurisdiction?: string;
  pinpoint?: string;
  /** English translation of the title, in roman type (rule 26.1.1). */
  translation?: string;
  /** Full date of enactment (e.g. '27 April 2009') — rule 18.2.1. */
  enactmentDate?: string;
  /**
   * Gazette reference: abbreviated gazette name, year and starting page
   * (e.g. 'BGBl I, 2009, 951') — rule 18.2.1.
   */
  gazette?: string;
  /**
   * Commonly used abbreviation, given as an italicised short title in
   * the first citation per rules 18.2.2 and 3.5 (e.g. 'BGB').
   */
  shortTitle?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics (legacy year folded into the title)
  const titleText = data.year !== undefined ? `${data.title} ${data.year}` : data.title;
  runs.push({ text: titleText, italic: true });

  // Translation of the title (roman — rule 26.1.1)
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Enactment date and gazette reference (rule 18.2.1)
  const tail: string[] = [];
  if (data.enactmentDate) {
    tail.push(data.enactmentDate);
  }
  if (data.gazette) {
    tail.push(data.gazette);
  }
  if (tail.length > 0) {
    runs.push({ text: ` ${tail.join(", ")}` });
  }

  // Pinpoint (comma-separated after date/gazette elements)
  if (data.pinpoint) {
    runs.push({ text: tail.length > 0 ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  // Short title per rules 18.2.2 and 3.5 (italicised, in quotes)
  if (data.shortTitle) {
    runs.push({ text: " ('" });
    runs.push({ text: data.shortTitle, italic: true });
    runs.push({ text: "')" });
  }

  return runs;
}

// ─── FRGN-004: Grundgesetz (Basic Law) (Rule 18.2.3) ────────────────────────

/**
 * Formats a citation to the German Grundgesetz per AGLC4 Rule 18.2.3.
 *
 * AGLC4 Rule 18.2.3 fixed form: *Grundgesetz für die Bundesrepublik
 * Deutschland* [Basic Law for the Federal Republic of Germany]
 * Pinpoint. The German title is italicised; the bracketed translation
 * is roman (rule 26.1.1).
 *
 * @example
 *   // Grundgesetz für die Bundesrepublik Deutschland [Basic Law for
 *   //   the Federal Republic of Germany] art 8(1)  — AGLC4 ex 9
 *   formatConstitution({
 *     title: "Grundgesetz für die Bundesrepublik Deutschland",
 *     translation: "Basic Law for the Federal Republic of Germany",
 *     pinpoint: "art 8(1)",
 *   })
 */
export function formatConstitution(data: {
  title: string;
  /** English translation of the title, in roman type (rule 26.1.1). */
  translation?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Translation of the title (roman — rule 26.1.1)
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Pinpoint (article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
