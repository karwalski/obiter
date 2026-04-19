/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * FRGN-009: AGLC4 Rules 23.1–23.3 — South Africa
 *
 * Formatting functions for South African cases and legislation.
 * Covers Constitutional Court (ZACC), Supreme Court of Appeal (ZASCA),
 * traditional SA reports, and Truth and Reconciliation Commission materials.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── South African Case Data ─────────────────────────────────────────────────

interface SouthAfricaCaseData {
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
   * Medium neutral: 'ZACC', 'ZASCA', 'ZAGPJHC'.
   * Traditional: 'SA', 'BCLR', 'SACR'.
   */
  reportSeries: string;
  /** Starting page or paragraph number. */
  startingPage: number | string;
  /** Pinpoint reference. */
  pinpoint?: string;
  /**
   * Court identifier. Included in parentheses for traditional reports.
   * For medium neutral citations the court is apparent from the series.
   */
  courtId?: string;
  /**
   * Division indicator for the SA Reports (e.g. 'A' for Appellate Division,
   * 'T' for Transvaal). Placed in parentheses after the page number.
   */
  division?: string;
  /** Set to true for TRC (Truth and Reconciliation Commission) materials. */
  isTRC?: boolean;
  /** TRC volume and details (when isTRC is true). */
  trcDetails?: string;
}

// ─── Medium neutral series ───────────────────────────────────────────────────

/**
 * Medium neutral citation prefixes from which the court can be inferred
 * (Rule 23.1). Court identifier is omitted for these.
 */
const SA_MEDIUM_NEUTRAL_PREFIXES: ReadonlyArray<string> = [
  "ZACC",
  "ZASCA",
  "ZAGPJHC",
  "ZAGPPHC",
  "ZAKZDHC",
  "ZAKZPHC",
  "ZAWCHC",
  "ZAECGHC",
  "ZAECMHC",
  "ZAFSHC",
  "ZANCHC",
  "ZALBHC",
];

function isMediumNeutral(series: string): boolean {
  return SA_MEDIUM_NEUTRAL_PREFIXES.some(
    (prefix) => series === prefix || series.startsWith(prefix),
  );
}

// ─── FRGN-009-CASE: South African Cases (Rule 23.1) ─────────────────────────

/**
 * Formats a South African case citation per AGLC4 Rule 23.1.
 *
 * AGLC4 Rule 23.1: South African case citations follow the general
 * foreign case format. Medium neutral citations use court identifiers
 * such as ZACC (Constitutional Court) and ZASCA (Supreme Court of Appeal).
 * Traditional SA Reports include a division indicator in parentheses
 * (e.g. '(A)' for Appellate Division). TRC materials follow a
 * specialised format referencing the TRC report volumes.
 *
 * @example
 *   // Minister of Home Affairs v Fourie [2005] ZACC 19
 *   formatCase({
 *     caseName: "Minister of Home Affairs v Fourie",
 *     year: 2005, yearType: "square",
 *     reportSeries: "ZACC", startingPage: 19,
 *   })
 *
 * @example
 *   // S v Makwanyane 1995 (3) SA 391 (CC)
 *   formatCase({
 *     caseName: "S v Makwanyane",
 *     year: 1995, yearType: "round",
 *     volume: 3, reportSeries: "SA",
 *     startingPage: 391, courtId: "CC",
 *   })
 */
export function formatCase(data: SouthAfricaCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // TRC materials
  if (data.isTRC && data.trcDetails) {
    runs.push({ text: data.caseName, italic: true });
    runs.push({ text: `, ${data.trcDetails}` });
    return runs;
  }

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

  // Division or court identifier
  if (data.division) {
    runs.push({ text: ` (${data.division})` });
  } else if (data.courtId && !isMediumNeutral(data.reportSeries)) {
    runs.push({ text: ` (${data.courtId})` });
  }

  return runs;
}

// ─── South African Legislation Data ──────────────────────────────────────────

interface SouthAfricaLegislationData {
  /** Short title of the Act. */
  title: string;
  /** Act number (e.g. '108 of 1996'). */
  actNumber?: string;
  /** Year of the Act. */
  year: number;
  /** Jurisdiction abbreviation — defaults to 'South Africa'. */
  jurisdiction?: string;
  /** Pinpoint reference (e.g. 's 9'). */
  pinpoint?: string;
  /** Set to true when citing the Constitution. */
  isConstitution?: boolean;
}

// ─── FRGN-009-LEG: South African Legislation (Rules 23.2–23.3) ──────────────

/**
 * Formats a South African legislation citation per AGLC4 Rules 23.2–23.3.
 *
 * AGLC4 Rule 23.2: South African statutes are cited with the title
 * in italics, followed by the Act number and year. The jurisdiction
 * abbreviation '(South Africa)' appears in parentheses in roman type.
 *
 * AGLC4 Rule 23.3: The Constitution of the Republic of South Africa
 * is cited with its full title in italics, including the Act number
 * ('Act 108 of 1996').
 *
 * @example
 *   // Constitution of the Republic of South Africa Act 108 of 1996 s 9
 *   formatLegislation({
 *     title: "Constitution of the Republic of South Africa",
 *     actNumber: "108 of 1996",
 *     year: 1996,
 *     isConstitution: true,
 *     pinpoint: "s 9",
 *   })
 *
 * @example
 *   // Promotion of Equality and Prevention of Unfair Discrimination Act 4 of 2000 (South Africa)
 *   formatLegislation({
 *     title: "Promotion of Equality and Prevention of Unfair Discrimination Act",
 *     actNumber: "4 of 2000",
 *     year: 2000,
 *   })
 */
export function formatLegislation(
  data: SouthAfricaLegislationData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  if (data.actNumber) {
    runs.push({
      text: `${data.title} ${data.actNumber}`,
      italic: true,
    });
  } else {
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
  }

  // Jurisdiction (Rule 23.2.2: Constitution cited as regular legislation)
  const jurisdiction = data.jurisdiction ?? "South Africa";
  runs.push({ text: ` (${jurisdiction})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
