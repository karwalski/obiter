/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: France (Rules 17.1–17.2)
 *
 * Pure formatting functions for French-language cases, individual laws,
 * codes and the Constitution. French-language elements take a
 * square-bracketed English translation immediately after the element,
 * in roman type (rule 26.1.1).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── French Case Data (Rule 17.1) ────────────────────────────────────────────

interface FrenchCaseData {
  /**
   * Popular or commonly used case name (italicised), where one exists;
   * it precedes the court name and takes a roman comma (rule 17.1).
   */
  popularName?: string;
  /**
   * Court name, in roman type (e.g. 'Cour de cassation',
   * 'Cour d'appel de Toulouse'). The leading element of the citation.
   */
  court: string;
  /** English translation of the court name (e.g. 'French Court of Cassation'). */
  translation?: string;
  /**
   * Appeal, decision or case number. For the Cour de cassation this is
   * the 'nº de pourvoi' (e.g. '06-81968'); for the Conseil
   * constitutionnel include the prefix (e.g. 'decision nº 2005-527 DC').
   */
  caseNumber?: string;
  /** European Case Law Identifier, inserted directly after the case number. */
  ecli?: string;
  /** Full date of the decision (e.g. '5 December 2006'). */
  date: string;
  /**
   * Report citation, emitted after the connector 'reported in'
   * (e.g. '(2006) Bull crim nº 304, 1095', 'JO, 13 December 2005, 19162',
   * '[1971] Rec Lebon 409'). Omit for unreported decisions — the
   * connector is dropped with it (rule 17.1).
   */
  reportedIn?: string;
}

// ─── FRGN-003: French Cases (Rule 17.1) ─────────────────────────────────────

/**
 * Formats a French case per AGLC4 Rule 17.1.
 *
 * AGLC4 Rule 17.1 patterns (Cour de cassation shown): Cour de cassation
 * [French Court of Cassation], Appeal Number, Full Date reported in
 * (Year of Publication) Abbreviation nº Number, Pinpoint. The court
 * name leads in roman type; a popular case name may precede it in
 * italics with a roman comma; an ECLI follows the case number with a
 * comma on each side; 'reported in' and the report citation appear
 * only when a published report exists.
 *
 * @example
 *   // Cour de cassation [French Court of Cassation], 06-81968,
 *   //   5 December 2006 reported in (2006) Bull crim nº 304, 1095
 *   //   — AGLC4 ex 1
 *   formatCourtDecision({
 *     court: "Cour de cassation",
 *     translation: "French Court of Cassation",
 *     caseNumber: "06-81968", date: "5 December 2006",
 *     reportedIn: "(2006) Bull crim nº 304, 1095",
 *   })
 *
 * @example
 *   // Cour d'appel de Toulouse [Toulouse Court of Appeal], 2003/05292,
 *   //   7 March 2005  — AGLC4 ex 4 (unreported: no 'reported in')
 *   formatCourtDecision({
 *     court: "Cour d'appel de Toulouse",
 *     translation: "Toulouse Court of Appeal",
 *     caseNumber: "2003/05292", date: "7 March 2005",
 *   })
 */
export function formatCourtDecision(data: FrenchCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Popular case name in italics, followed by a roman comma (rule 17.1)
  if (data.popularName) {
    runs.push({ text: data.popularName, italic: true });
    runs.push({ text: ", " });
  }

  // Court name in roman type, with bracketed translation (rule 26.1.1)
  runs.push({ text: data.court });
  if (data.translation) {
    runs.push({ text: ` [${data.translation}]` });
  }

  // Case number, then ECLI with a comma on each side (rule 17.1)
  if (data.caseNumber) {
    runs.push({ text: `, ${data.caseNumber}` });
  }
  if (data.ecli) {
    runs.push({ text: `, ${data.ecli}` });
  }

  // Full date of decision
  runs.push({ text: `, ${data.date}` });

  // Report citation — connector dropped when unreported (rule 17.1)
  if (data.reportedIn) {
    runs.push({ text: ` reported in ${data.reportedIn}` });
  }

  return runs;
}

/**
 * Formats a French case in the legacy reported-case shape.
 *
 * @deprecated This shape (*Case Name* (Court) [Year] Series Page) is not
 * an AGLC4 rule 17.1 pattern. Rule 17.1 places the court name first in
 * roman type, followed by the case number, the full date and — where a
 * report exists — 'reported in' plus the report citation. Use
 * {@link formatCourtDecision} instead.
 *
 * @param data - French case citation data
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

  // Court abbreviation
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  // Year in square brackets
  runs.push({ text: ` [${data.year}]` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  return runs;
}

// ─── FRGN-003: French Legislation — Individual Materials and Codes (Rule 17.2)

/**
 * Formats a French legislative citation per AGLC4 Rules 17.2.1–17.2.2.
 *
 * AGLC4 Rule 17.2.1 (individual materials): *Title of Law* [Translation]
 * (France) JO, Full Date of Publication, Pinpoint. The law's number
 * ('nº …') and date ('du …') stay inside the italicised title; French
 * laws are gazetted in the Journal officiel ('JO'). The translation is
 * roman (rule 26.1.1 — the guide's cross-reference to '25.1.1' is a
 * misprint).
 *
 * AGLC4 Rule 17.2.2 (codes): *Title of Code* [Translation] (France)
 * Pinpoint — no date or gazette reference.
 *
 * @example
 *   // Loi nº 91-662 du 13 juillet 1991 [Law No 91-662 of 13 July 1991]
 *   //   (France) JO, 19 July 1991, 9521  — AGLC4 ex 5 (rule 17.2.1)
 *   formatLegislation({
 *     title: "Loi nº 91-662 du 13 juillet 1991",
 *     translation: "Law No 91-662 of 13 July 1991",
 *     jurisdiction: "France",
 *     gazetteDate: "19 July 1991", pinpoint: "9521",
 *   })
 *
 * @example
 *   // Code civil [Civil Code] (France) art 147  — AGLC4 ex 7 (rule 17.2.2)
 *   formatLegislation({
 *     title: "Code civil", translation: "Civil Code",
 *     jurisdiction: "France", pinpoint: "art 147",
 *   })
 */
export function formatLegislation(data: {
  title: string;
  /**
   * @deprecated Rule 17.2.1 has no separate year element — a French
   * law's date belongs inside its title ('du 13 juillet 1991'). When
   * provided, the year is folded into the italicised title.
   */
  year?: number;
  jurisdiction?: string;
  pinpoint?: string;
  /** English translation of the title, in roman type (rule 26.1.1). */
  translation?: string;
  /**
   * Full date of publication in the Journal officiel (e.g.
   * '19 July 1991'). Emits ' JO, «date»' after the jurisdiction
   * (rule 17.2.1). Omit for codes (rule 17.2.2).
   */
  gazetteDate?: string;
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

  // Journal officiel reference (rule 17.2.1)
  if (data.gazetteDate) {
    runs.push({ text: ` JO, ${data.gazetteDate}` });
  }

  // Pinpoint (comma-separated after a gazette reference)
  if (data.pinpoint) {
    runs.push({ text: data.gazetteDate ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-003: French Constitution (Rule 17.2.3) ────────────────────────────

/**
 * Formats a citation to the French Constitution per AGLC4 Rule 17.2.3.
 *
 * AGLC4 Rule 17.2.3 fixed form: *La Constitution du 4 octobre 1958*
 * [French Constitution of 4 October 1958] Pinpoint. The French title is
 * italicised; the bracketed translation is roman (rule 26.1.1).
 *
 * @example
 *   // La Constitution du 4 octobre 1958 [French Constitution of
 *   //   4 October 1958] art 2  — AGLC4 ex 9
 *   formatConstitution({
 *     title: "La Constitution du 4 octobre 1958",
 *     translation: "French Constitution of 4 October 1958",
 *     pinpoint: "art 2",
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
