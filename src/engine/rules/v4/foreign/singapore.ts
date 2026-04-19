/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-008: AGLC4 Rules 22.1–22.3 — Singapore
 *
 * Formatting functions for Singapore cases and legislation.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Singapore Case Data ─────────────────────────────────────────────────────

interface SingaporeCaseData {
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
   * Primary: 'SLR' (Singapore Law Reports).
   * Medium neutral: 'SGCA', 'SGHC', 'SGDC'.
   */
  reportSeries: string;
  /** Starting page or paragraph number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Court identifier. Omitted when apparent from the report series. */
  courtId?: string;
}

// ─── Court-implied series ────────────────────────────────────────────────────

/**
 * Report series from which the Singapore court can be inferred (Rule 22.1).
 */
const SG_SERIES_IMPLIED_COURT: ReadonlySet<string> = new Set([
  "SLR",
  "MLJ",
]);

// ─── FRGN-008-CASE: Singapore Cases (Rule 22.1) ─────────────────────────────

/**
 * Formats a Singapore case citation per AGLC4 Rule 22.1.
 *
 * AGLC4 Rule 22.1: Singapore case citations follow the general
 * foreign case format. The SLR (Singapore Law Reports) is the
 * primary report series. Medium neutral citations use court
 * identifiers such as SGCA (Court of Appeal) and SGHC (High Court).
 *
 * @example
 *   // Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency
 *   // [2007] 4 SLR(R) 100
 *   formatCase({
 *     caseName: "Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency",
 *     year: 2007, yearType: "square",
 *     volume: 4, reportSeries: "SLR(R)",
 *     startingPage: 100,
 *   })
 *
 * @example
 *   // Tan Eng Hong v Attorney-General [2012] SGCA 45
 *   formatCase({
 *     caseName: "Tan Eng Hong v Attorney-General",
 *     year: 2012, yearType: "square",
 *     reportSeries: "SGCA", startingPage: 45,
 *   })
 */
export function formatCase(data: SingaporeCaseData): FormattedRun[] {
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
  if (data.courtId && !SG_SERIES_IMPLIED_COURT.has(data.reportSeries)) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── Singapore Legislation Data ──────────────────────────────────────────────

interface SingaporeLegislationData {
  /** Short title of the Act or Constitution provision. */
  title: string;
  /** Year of the Act (omitted for the Constitution). */
  year?: number;
  /** Jurisdiction abbreviation — defaults to 'Singapore'. */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 9', 'art 12'). */
  pinpoint?: string;
  /** Set to true when citing the Constitution of Singapore. */
  isConstitution?: boolean;
  /** Cap number for revised edition references (e.g. 'Cap 224'). */
  capNumber?: string;
  /** Revised edition year (e.g. '2008 Rev Ed'). */
  revisedEdition?: string;
}

// ─── FRGN-008-LEG: Singapore Legislation (Rules 22.2–22.3) ──────────────────

/**
 * Formats a Singapore legislation citation per AGLC4 Rules 22.2–22.3.
 *
 * AGLC4 Rule 22.2: Singapore statutes are cited with the title in
 * italics. The cap number and revised edition details appear in
 * parentheses in roman type, e.g. '(Cap 224, 2008 Rev Ed)'.
 *
 * AGLC4 Rule 22.3: The Constitution of the Republic of Singapore
 * is cited in italics, with pinpoints using 'art' notation.
 *
 * @example
 *   // Penal Code (Singapore, Cap 224, 2008 Rev Ed) s 377A
 *   formatLegislation({
 *     title: "Penal Code",
 *     jurisdiction: "Singapore",
 *     capNumber: "Cap 224",
 *     revisedEdition: "2008 Rev Ed",
 *     pinpoint: "s 377A",
 *   })
 *
 * @example
 *   // Constitution of the Republic of Singapore art 12
 *   formatLegislation({
 *     title: "Constitution of the Republic of Singapore",
 *     isConstitution: true,
 *     pinpoint: "art 12",
 *   })
 */
export function formatLegislation(
  data: SingaporeLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title (and year if present) in italics
  if (data.isConstitution) {
    runs.push({ text: data.title, italic: true });
  } else {
    const titleText = data.year ? `${data.title} ${data.year}` : data.title;
    runs.push({ text: titleText, italic: true });
  }

  // Parenthetical: jurisdiction, cap number, revised edition
  const parenParts: string[] = [];
  if (!data.isConstitution) {
    const jurisdiction = data.jurisdiction ?? "Singapore";
    parenParts.push(jurisdiction);
    if (data.capNumber) {
      parenParts.push(data.capNumber);
    }
    if (data.revisedEdition) {
      parenParts.push(data.revisedEdition);
    }
  }
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
