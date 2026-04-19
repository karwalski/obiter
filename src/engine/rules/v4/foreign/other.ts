/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-012: AGLC4 Rules 26.1–26.4 — Other Foreign Jurisdictions
 *
 * Generic formatting functions for foreign jurisdictions not covered
 * by specific AGLC4 rules. Supports translated titles and flexible
 * citation forms.
 */

import { FormattedRun } from "../../../../types/formattedRun";

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
   * Appears in square brackets after the original title with
   * '[Author's trans]' notation per Rule 26.3.
   */
  translatedCaseName?: string;
  /** Full free-form citation string, for jurisdictions with unique formats. */
  freeFormCitation?: string;
}

// ─── FRGN-012-CASE: Generic Foreign Cases (Rules 26.1–26.3) ─────────────────

/**
 * Formats a generic foreign case citation per AGLC4 Rules 26.1–26.3.
 *
 * AGLC4 Rule 26.1: Cases from foreign jurisdictions not specifically
 * addressed should follow the general citation format of the
 * originating jurisdiction where possible, adapted to conform with
 * AGLC4 conventions.
 *
 * AGLC4 Rule 26.2: Case names should appear in italics regardless of
 * the jurisdiction.
 *
 * AGLC4 Rule 26.3: Where a case name is in a language other than
 * English, the original-language title should be given, followed
 * by an English translation in square brackets with the notation
 * '[Author's trans]' if the translation is the author's own.
 *
 * @example
 *   // Bundesverfassungsgericht [Federal Constitutional Court],
 *   // 1 BVerfGE 14 (1951)
 *   formatCase({
 *     caseName: "Bundesverfassungsgericht",
 *     translatedCaseName: "Federal Constitutional Court",
 *     volume: 1, reportSeries: "BVerfGE",
 *     startingPage: 14, year: 1951,
 *   })
 *
 * @example
 *   // Free-form citation for unique formats
 *   formatCase({
 *     caseName: "Example Case",
 *     freeFormCitation: "Example Case, Tribunal Supreme, 12 January 2020",
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
    return runs;
  }

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Translation in square brackets
  if (data.translatedCaseName) {
    runs.push({ text: ` [${data.translatedCaseName}]` });
  }

  // Year
  if (data.year !== undefined) {
    if (data.reportSeries) {
      // Standard formatted citation
      const yearType = data.yearType ?? "round";
      const open = yearType === "round" ? "(" : "[";
      const close = yearType === "round" ? ")" : "]";
      let yearText = ` ${open}${data.year}${close}`;
      if (data.volume !== undefined) {
        yearText = `, ${data.volume}`;
      }
      runs.push({ text: yearText });
    }
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

  return runs;
}

// ─── Generic Foreign Legislation Data ────────────────────────────────────────

interface GenericForeignLegislationData {
  /** Title of the legislation. */
  title: string;
  /** Year of the legislation. */
  year?: number;
  /** Jurisdiction name (e.g. 'India', 'Japan'). */
  jurisdiction: string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * English translation of the title, for non-English legislation.
   * Appears in square brackets after the original title.
   */
  translatedTitle?: string;
  /**
   * If true, appends '[Author's trans]' after the translated title
   * to indicate the translation is the author's own (Rule 26.3).
   */
  isAuthorTranslation?: boolean;
  /** Free-form citation string for unique legislative formats. */
  freeFormCitation?: string;
}

// ─── FRGN-012-LEG: Generic Foreign Legislation (Rules 26.2–26.4) ────────────

/**
 * Formats a generic foreign legislation citation per AGLC4 Rules 26.2–26.4.
 *
 * AGLC4 Rule 26.2: Foreign legislation is cited with the title in
 * italics, followed by the jurisdiction in parentheses.
 *
 * AGLC4 Rule 26.3: Non-English titles should be given in the original
 * language followed by an English translation in square brackets.
 * If the translation is the author's own, '[Author's trans]' is appended.
 *
 * AGLC4 Rule 26.4: Where the citation conventions of the originating
 * jurisdiction differ substantially, a flexible form may be used
 * provided it includes sufficient detail for identification.
 *
 * @example
 *   // Bürgerliches Gesetzbuch [Civil Code] (Germany) § 242
 *   formatLegislation({
 *     title: "Bürgerliches Gesetzbuch",
 *     translatedTitle: "Civil Code",
 *     jurisdiction: "Germany",
 *     pinpoint: "§ 242",
 *   })
 *
 * @example
 *   // Minpō [Civil Code] (Japan) [Author's trans] art 709
 *   formatLegislation({
 *     title: "Minpō",
 *     translatedTitle: "Civil Code",
 *     jurisdiction: "Japan",
 *     isAuthorTranslation: true,
 *     pinpoint: "art 709",
 *   })
 */
export function formatLegislation(
  data: GenericForeignLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Free-form citation overrides structured formatting
  if (data.freeFormCitation) {
    runs.push({ text: data.title, italic: true });
    const remainder = data.freeFormCitation.startsWith(data.title)
      ? data.freeFormCitation.slice(data.title.length)
      : ` ${data.freeFormCitation}`;
    if (remainder) {
      runs.push({ text: remainder });
    }
    return runs;
  }

  // Title in italics (with year if provided)
  const titleText = data.year ? `${data.title} ${data.year}` : data.title;
  runs.push({ text: titleText, italic: true });

  // Translated title in square brackets
  if (data.translatedTitle) {
    runs.push({ text: ` [${data.translatedTitle}]` });
  }

  // Jurisdiction in parentheses
  runs.push({ text: ` (${data.jurisdiction})` });

  // Author's translation notation
  if (data.isAuthorTranslation) {
    runs.push({ text: ` [Author\u2019s trans]` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
