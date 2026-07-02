/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-012: AGLC4 Rules 26.1–26.4 — Other Foreign Domestic Materials
 *
 * Generic formatting functions for foreign jurisdictions not covered
 * by chapters 15–25. Covers translated titles (rule 26.1.1), judicial
 * and administrative decisions (rule 26.2) and legislative materials
 * (rule 26.3).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Translator attribution (Rule 26.1.1) ───────────────────────────────────

/**
 * Builds the rule 26.1.1 translation-attribution marker.
 *
 * AGLC4 Rule 26.1.1: translations made by the author are flagged by
 * '[tr author]' at the end of the citation; translations made by another
 * person on the author's behalf are flagged '[tr «Translator's Name»]',
 * also at the end of the citation.
 *
 * @param translator - "author" for the author's own translation, or the
 *   translator's name (e.g. "Nawaar Hassan").
 */
function translatorMarker(translator: string): string {
  return ` [tr ${translator}]`;
}

// ─── Generic Foreign Case Data ───────────────────────────────────────────────

interface GenericForeignCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Year of the report or decision. */
  year?: number;
  /** Whether the year is in round or square brackets. */
  yearType?: "round" | "square";
  /** Volume number (for volume-organised series). */
  volume?: number;
  /** Report series or court abbreviation. */
  reportSeries?: string;
  /** Starting page or decision number. */
  startingPage?: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Court identifier. */
  courtId?: string;
  /** Country or jurisdiction name (for parenthetical). */
  jurisdiction?: string;
  /**
   * English translation of the case name, for non-English titles.
   * Appears in square brackets after the original title, in roman
   * type (rule 26.1.1: translated titles are never italicised).
   */
  translatedCaseName?: string;
  /**
   * Translation attribution per rule 26.1.1. Pass "author" for the
   * author's own translation (emits '[tr author]'), or a translator's
   * name (emits '[tr Name]'). Always the final element of the citation.
   */
  translator?: string;
  /** Full free-form citation string, for jurisdictions with unique formats. */
  freeFormCitation?: string;
}

// ─── FRGN-012-CASE: Common Law Foreign Cases (Rule 26.2) ────────────────────

/**
 * Formats a foreign case from a common law system per AGLC4 Rule 26.2.
 *
 * AGLC4 Rule 26.2: decisions of courts of foreign common law systems
 * are cited as consistently as possible with chapter 2 (report series
 * per rule 2.2.3, court name in parentheses per rule 2.2.6).
 *
 * AGLC4 Rule 26.1.1: a translated case name follows the original in
 * square brackets, never italicised; the author's translations are
 * flagged '[tr author]' at the end of the citation.
 *
 * For decisions of non-common-law systems, use
 * {@link formatOtherDecision} (rule 26.2 element list).
 *
 * @example
 *   // Asuquo v State [1967] 1 All NLR 123, 126–7 (Bairamian JSC)
 *   //   (Supreme Court of Nigeria)  — AGLC4 ex 8 (rule 26.2)
 *   formatCase({
 *     caseName: "Asuquo v State",
 *     year: 1967, yearType: "square", volume: 1,
 *     reportSeries: "All NLR", startingPage: 123,
 *     pinpoint: "126–7 (Bairamian JSC)",
 *     courtId: "Supreme Court of Nigeria",
 *   })
 */
export function formatCase(data: GenericForeignCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Free-form citation overrides structured formatting
  if (data.freeFormCitation) {
    runs.push({ text: data.caseName, italic: true });
    // Remove the case name from the free-form string if it's a prefix
    const remainder = data.freeFormCitation.startsWith(data.caseName)
      ? data.freeFormCitation.slice(data.caseName.length)
      : `, ${data.freeFormCitation}`;
    if (remainder) {
      runs.push({ text: remainder });
    }
    if (data.translator) {
      runs.push({ text: translatorMarker(data.translator) });
    }
    return runs;
  }

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Translation in square brackets (roman — rule 26.1.1)
  if (data.translatedCaseName) {
    runs.push({ text: ` [${data.translatedCaseName}]` });
  }

  // Year (and volume, for volume-organised series — mirrors rule 2.2.3)
  if (data.year !== undefined && data.reportSeries) {
    const yearType = data.yearType ?? "round";
    const open = yearType === "round" ? "(" : "[";
    const close = yearType === "round" ? ")" : "]";
    let yearText = ` ${open}${data.year}${close}`;
    if (data.volume !== undefined) {
      yearText += ` ${data.volume}`;
    }
    runs.push({ text: yearText });
  }

  // Volume (when year is not used as delimiter)
  if (data.volume !== undefined && data.year === undefined) {
    runs.push({ text: `, ${data.volume}` });
  }

  // Report series and starting page
  if (data.reportSeries) {
    runs.push({ text: ` ${data.reportSeries}` });
    if (data.startingPage !== undefined) {
      runs.push({ text: ` ${data.startingPage}` });
    }
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court or jurisdiction parenthetical
  const parenParts: string[] = [];
  if (data.courtId) {
    parenParts.push(data.courtId);
  }
  if (data.jurisdiction) {
    parenParts.push(data.jurisdiction);
  }
  if (data.year !== undefined && !data.reportSeries) {
    parenParts.push(String(data.year));
  }
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  // Translation attribution — always the final element (rule 26.1.1)
  if (data.translator) {
    runs.push({ text: translatorMarker(data.translator) });
  }

  return runs;
}

// ─── Non-Common-Law Decision Data ───────────────────────────────────────────

interface OtherDecisionData {
  /**
   * Popular or commonly used case name (italicised), where one exists.
   * Most non-common-law decisions have none.
   */
  caseName?: string;
  /** Name of the deciding court or body (roman type). */
  court: string;
  /**
   * English translation of the court name, in square brackets after it
   * (roman — rule 26.1.1). Append the jurisdiction inside the translation
   * where the name does not make it apparent.
   */
  courtTranslation?: string;
  /** Case or decision number (e.g. 'No 239', '1 U 59/48'). */
  caseNumber?: string;
  /** Full date of decision (e.g. '29 December 1982'). */
  date?: string;
  /**
   * Report series details, preceded by 'reported in' (no comma before
   * the connector). Pass FormattedRun[] where part of the reference
   * (e.g. a series title written out in full) is italicised.
   */
  reportedIn?: string | FormattedRun[];
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Translation attribution per rule 26.1.1 ('author' or a translator's
   * name), emitted as '[tr …]' at the end of the citation.
   */
  translator?: string;
}

// ─── FRGN-012-DECISION: Other Foreign Decisions (Rule 26.2) ─────────────────

/**
 * Formats a decision of a non-common-law foreign system per AGLC4
 * Rule 26.2.
 *
 * AGLC4 Rule 26.2: for systems other than common law systems, include
 * (where available and appropriate): the case name; the deciding court
 * or body; the case or decision number; the full date of decision;
 * details of any report series preceded by 'reported in'; and a
 * pinpoint. Elements are separated by commas, except that no comma
 * precedes 'reported in'.
 *
 * @example
 *   // Corte costituzionale [Italian Constitutional Court], No 239,
 *   //   29 December 1982 reported in [1983] I Il Foro Italiano:
 *   //   Raccolta Generale di Giurisprudenza 2, 4–5  — AGLC4 ex 12
 *   formatOtherDecision({
 *     court: "Corte costituzionale",
 *     courtTranslation: "Italian Constitutional Court",
 *     caseNumber: "No 239",
 *     date: "29 December 1982",
 *     reportedIn: [
 *       { text: "[1983] I " },
 *       { text: "Il Foro Italiano: Raccolta Generale di Giurisprudenza", italic: true },
 *       { text: " 2" },
 *     ],
 *     pinpoint: "4–5",
 *   })
 */
export function formatOtherDecision(data: OtherDecisionData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Popular case name (italic) followed by a roman comma
  if (data.caseName) {
    runs.push({ text: data.caseName, italic: true });
    runs.push({ text: ", " });
  }

  // Court or body (roman) with bracketed translation
  runs.push({ text: data.court });
  if (data.courtTranslation) {
    runs.push({ text: ` [${data.courtTranslation}]` });
  }

  // Case number and full date, comma-separated
  if (data.caseNumber) {
    runs.push({ text: `, ${data.caseNumber}` });
  }
  if (data.date) {
    runs.push({ text: `, ${data.date}` });
  }

  // Report reference — no comma before 'reported in'
  if (data.reportedIn) {
    runs.push({ text: " reported in " });
    if (typeof data.reportedIn === "string") {
      runs.push({ text: data.reportedIn });
    } else {
      runs.push(...data.reportedIn);
    }
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Translation attribution — always the final element (rule 26.1.1)
  if (data.translator) {
    runs.push({ text: translatorMarker(data.translator) });
  }

  return runs;
}

// ─── Generic Foreign Legislation Data ────────────────────────────────────────

interface GenericForeignLegislationData {
  /** Title of the legislation. */
  title: string;
  /** Year of the legislation (forms part of the italicised title). */
  year?: number;
  /** Jurisdiction name (e.g. 'India', 'Japan') — not abbreviated. */
  jurisdiction: string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * English translation of the title, for non-English legislation.
   * Appears in square brackets after the original title, in roman
   * type (rule 26.1.1: translated titles are never italicised).
   */
  translatedTitle?: string;
  /**
   * Rule 26.3 'other information' elements, comma-separated: the
   * promulgating body, the law's number, the full enactment date
   * and/or an official publication reference
   * (e.g. '9 January 2008, BGBl II, 8/2008').
   */
  otherInformation?: string;
  /**
   * If true, appends '[tr author]' at the end of the citation to
   * indicate the translation is the author's own (rule 26.1.1).
   * Equivalent to `translator: "author"`.
   */
  isAuthorTranslation?: boolean;
  /**
   * Translation attribution per rule 26.1.1 ('author' or a translator's
   * name), emitted as '[tr …]' at the end of the citation. Takes
   * precedence over `isAuthorTranslation`.
   */
  translator?: string;
  /** Free-form citation string for unique legislative formats. */
  freeFormCitation?: string;
}

// ─── FRGN-012-LEG: Generic Foreign Legislation (Rule 26.3) ──────────────────

/**
 * Formats a generic foreign legislation citation per AGLC4 Rule 26.3.
 *
 * AGLC4 Rule 26.3: foreign legislation from common law systems follows
 * chapter 3 as closely as possible; other foreign legislation takes the
 * form: italicised title, jurisdiction in parentheses (not abbreviated),
 * comma-separated 'other information' elements, then a pinpoint.
 *
 * AGLC4 Rule 26.1.1: a translated title follows the original in square
 * brackets, never italicised; the author's translation is flagged
 * '[tr author]' — and a third party's '[tr Name]' — at the end of the
 * citation.
 *
 * @example
 *   // Urheberrechtsgesetz [Copyright Law] (Switzerland) 9 October 1992,
 *   //   SR 231.1, art 29(2)(a) [tr author]  — AGLC4 ex 1 (rule 26.1.1)
 *   formatLegislation({
 *     title: "Urheberrechtsgesetz",
 *     translatedTitle: "Copyright Law",
 *     jurisdiction: "Switzerland",
 *     otherInformation: "9 October 1992, SR 231.1",
 *     pinpoint: "art 29(2)(a)",
 *     translator: "author",
 *   })
 *
 * @example
 *   // Passports Act 1982 (Papua New Guinea)  — AGLC4 ex 14 (rule 26.3)
 *   formatLegislation({
 *     title: "Passports Act", year: 1982,
 *     jurisdiction: "Papua New Guinea",
 *   })
 */
export function formatLegislation(data: GenericForeignLegislationData): FormattedRun[] {
  const runs: FormattedRun[] = [];
  const translator = data.translator ?? (data.isAuthorTranslation ? "author" : undefined);

  // Free-form citation overrides structured formatting
  if (data.freeFormCitation) {
    runs.push({ text: data.title, italic: true });
    const remainder = data.freeFormCitation.startsWith(data.title)
      ? data.freeFormCitation.slice(data.title.length)
      : ` ${data.freeFormCitation}`;
    if (remainder) {
      runs.push({ text: remainder });
    }
    if (translator) {
      runs.push({ text: translatorMarker(translator) });
    }
    return runs;
  }

  // Title in italics (with year if provided)
  const titleText = data.year ? `${data.title} ${data.year}` : data.title;
  runs.push({ text: titleText, italic: true });

  // Translated title in square brackets (roman — rule 26.1.1)
  if (data.translatedTitle) {
    runs.push({ text: ` [${data.translatedTitle}]` });
  }

  // Jurisdiction in parentheses (not abbreviated)
  runs.push({ text: ` (${data.jurisdiction})` });

  // Other information elements (rule 26.3)
  if (data.otherInformation) {
    runs.push({ text: ` ${data.otherInformation}` });
  }

  // Pinpoint (comma-separated from any other information)
  if (data.pinpoint) {
    runs.push({ text: data.otherInformation ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  // Translation attribution — always the final element (rule 26.1.1)
  if (translator) {
    runs.push({ text: translatorMarker(translator) });
  }

  return runs;
}
