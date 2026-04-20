/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 Section 4 — International Materials (OSC-010)
 *
 * Pure formatting functions for treaties, UN documents, ICJ/ITLOS/ICC,
 * and WTO per OSCOLA 5's reintegrated international section.
 *
 * Reuses shared international module logic (src/engine/rules/v4/international/)
 * with OSCOLA-specific formatting overrides:
 * - Treaty titles italic (same as AGLC4)
 * - "adopted" rather than "opened for signature" as default date prefix
 * - Edition abbreviation "edn" not "ed"
 * - Pinpoint with comma separation
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Treaties (OSCOLA 5 §4.1) ───────────────────────────────────────────────

/**
 * Formats a treaty citation per OSCOLA 5 §4.1.
 *
 * OSCOLA format:
 *   *Title* (adopted Date) Treaty Series Volume Page
 *
 * @example
 *   *Convention on the Rights of the Child* (adopted 20 November 1989,
 *   entered into force 2 September 1990) 1577 UNTS 3
 *
 * @example
 *   *Vienna Convention on the Law of Treaties* (adopted 23 May 1969,
 *   entered into force 27 January 1980) 1155 UNTS 331, art 31
 */
export function formatTreaty(data: {
  title: string;
  adoptedDate?: string;
  entryIntoForceDate?: string;
  notYetInForce?: boolean;
  treatySeries?: string;
  seriesVolume?: number;
  startingPage?: number;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italic
  runs.push({ text: data.title, italic: true });

  // Date parenthetical
  const dateParts: string[] = [];
  if (data.adoptedDate) {
    dateParts.push(`adopted ${data.adoptedDate}`);
  }
  if (data.notYetInForce) {
    dateParts.push("not yet in force");
  } else if (data.entryIntoForceDate) {
    dateParts.push(`entered into force ${data.entryIntoForceDate}`);
  }
  if (dateParts.length > 0) {
    runs.push({ text: ` (${dateParts.join(", ")})` });
  }

  // Treaty series and volume/page
  if (data.treatySeries) {
    let seriesText = " ";
    if (data.seriesVolume !== undefined) {
      seriesText += `${data.seriesVolume} `;
    }
    seriesText += data.treatySeries;
    if (data.startingPage !== undefined) {
      seriesText += ` ${data.startingPage}`;
    }
    runs.push({ text: seriesText });
  }

  // Pinpoint — comma-separated per OSCOLA
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── UN Documents (OSCOLA 5 §4.2) ───────────────────────────────────────────

/**
 * Formats a UN document citation per OSCOLA 5 §4.2.
 *
 * OSCOLA format:
 *   UNGA Res 61/295 (13 September 2007) UN Doc A/RES/61/295
 *
 * @example
 *   UNGA Res 217A (III) (10 December 1948) UN Doc A/810
 *
 * @example
 *   UNSC Res 1373 (28 September 2001) UN Doc S/RES/1373
 */
export function formatUnDocument(data: {
  body: string;
  title?: string;
  resolutionNumber?: string;
  sessionInfo?: string;
  date: string;
  documentSymbol: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body abbreviation (UNGA, UNSC, etc.)
  runs.push({ text: data.body });

  // Resolution number
  if (data.resolutionNumber) {
    runs.push({ text: ` Res ${data.resolutionNumber}` });
  }

  // Session info
  if (data.sessionInfo) {
    runs.push({ text: ` (${data.sessionInfo})` });
  }

  // Title — italic if provided
  if (data.title) {
    runs.push({ text: " " });
    runs.push({ text: data.title, italic: true });
  }

  // Date
  runs.push({ text: ` (${data.date})` });

  // Document symbol
  runs.push({ text: ` UN Doc ${data.documentSymbol}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

/**
 * Formats a UN General Assembly or Security Council resolution (short form).
 *
 * @example
 *   UNGA Res 61/295 (13 September 2007)
 */
export function formatUnResolution(data: {
  body: "UNGA" | "UNSC" | string;
  resolutionNumber: string;
  date: string;
  documentSymbol?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: `${data.body} Res ${data.resolutionNumber}` });
  runs.push({ text: ` (${data.date})` });

  if (data.documentSymbol) {
    runs.push({ text: ` UN Doc ${data.documentSymbol}` });
  }

  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── ICJ Cases (OSCOLA 5 §4.4) ──────────────────────────────────────────────

/**
 * Formats an ICJ case citation per OSCOLA 5 §4.4.
 *
 * OSCOLA format:
 *   *Case Name* (Phase) [Year] ICJ Rep Page
 *
 * @example
 *   *Case Concerning Armed Activities on the Territory of the Congo
 *   (Democratic Republic of the Congo v Uganda)* (Merits)
 *   [2005] ICJ Rep 168
 */
export function formatIcjCase(data: {
  caseName: string;
  phase?: string;
  year: number;
  reportSeries?: string;
  page?: number;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italic
  runs.push({ text: data.caseName, italic: true });

  // Phase
  if (data.phase) {
    runs.push({ text: ` (${data.phase})` });
  }

  // Report reference
  const series = data.reportSeries ?? "ICJ Rep";
  runs.push({ text: ` [${data.year}] ${series}` });
  if (data.page !== undefined) {
    runs.push({ text: ` ${data.page}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Judge (separate/dissenting opinion)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

// ─── ITLOS Cases (OSCOLA 5 §4.4) ────────────────────────────────────────────

/**
 * Formats an ITLOS case citation per OSCOLA 5.
 *
 * @example
 *   *The M/V "Saiga" (No 2) Case (Saint Vincent and the Grenadines
 *   v Guinea)* (Merits) (1999) ITLOS Reports 10
 */
export function formatItlosCase(data: {
  caseName: string;
  phase?: string;
  year: number;
  caseNumber?: string;
  page?: number;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italic
  runs.push({ text: data.caseName, italic: true });

  // Phase
  if (data.phase) {
    runs.push({ text: ` (${data.phase})` });
  }

  // Report reference
  runs.push({ text: ` (${data.year}) ITLOS Reports` });
  if (data.page !== undefined) {
    runs.push({ text: ` ${data.page}` });
  }

  // Case number
  if (data.caseNumber) {
    runs.push({ text: ` (Case No ${data.caseNumber})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── ICC Cases (OSCOLA 5 §4.5) ──────────────────────────────────────────────

/**
 * Formats an ICC case citation per OSCOLA 5.
 *
 * OSCOLA format:
 *   *Prosecutor v Name* (Phase) (Court, Case No, Date)
 *
 * @example
 *   *Prosecutor v Lubanga* (Judgment) (ICC, Trial Chamber I,
 *   Case No ICC-01/04-01/06, 14 March 2012)
 */
export function formatIccCase(data: {
  caseName: string;
  phase: string;
  court: string;
  chamber: string;
  caseNumber: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italic
  runs.push({ text: data.caseName, italic: true });

  // Phase
  runs.push({ text: ` (${data.phase})` });

  // Court details
  runs.push({
    text: ` (${data.court}, ${data.chamber}, Case No ${data.caseNumber}, ${data.date})`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── WTO Panel/Appellate Body Reports (OSCOLA 5 §4.6) ───────────────────────

/**
 * Formats a WTO panel or appellate body report per OSCOLA 5.
 *
 * OSCOLA format:
 *   Body Report, *Title*, WT/Doc Number (Date)
 *
 * @example
 *   Appellate Body Report, *United States — Import Prohibition of
 *   Certain Shrimp and Shrimp Products*, WT/DS58/AB/R
 *   (12 October 1998)
 */
export function formatWtoReport(data: {
  reportType: "Panel Report" | "Appellate Body Report" | string;
  title: string;
  documentNumber: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Report type
  runs.push({ text: `${data.reportType}, ` });

  // Title — italic
  runs.push({ text: data.title, italic: true });

  // Document number and date
  runs.push({ text: `, ${data.documentNumber} (${data.date})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
