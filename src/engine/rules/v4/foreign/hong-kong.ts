/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: Hong Kong (Rules 19.1–19.2)
 *
 * Pure formatting functions for Hong Kong case citations, legislation,
 * and Basic Law provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-005: Hong Kong Cases (Rule 19.1) ──────────────────────────────────

/**
 * Formats a Hong Kong case citation per AGLC4 Rule 19.1.
 *
 * @remarks AGLC4 Rule 19.1: Hong Kong cases are cited with the case name
 * in italics, followed by the year in square brackets, volume (if any),
 * report series abbreviation (e.g. HKLRD, HKCA), and starting page.
 * The court abbreviation is included in parentheses unless apparent
 * from the report series.
 *
 * @example
 *   // Leung Kwok Hung v HKSAR [2005] 3 HKLRD 164
 *   formatCase({ caseName: "Leung Kwok Hung v HKSAR", year: 2005, reportSeries: "HKLRD", volume: 3, startingPage: 164 })
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
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year in square brackets
  runs.push({ text: ` [${data.year}]` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Court identifier (if not apparent from series)
  const seriesImplyingCourt = new Set(["HKLRD", "HKCA", "HKCFA"]);
  if (data.court && !seriesImplyingCourt.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-005: Hong Kong Legislation (Rule 19.2) ────────────────────────────

/**
 * Formats a Hong Kong legislative citation per AGLC4 Rule 19.2.
 *
 * @remarks AGLC4 Rule 19.2: Hong Kong ordinances are cited with the
 * title in italics, followed by the chapter number in parentheses.
 * The jurisdiction 'HK' appears in parentheses. Pinpoint references
 * use section abbreviations.
 *
 * @example
 *   // Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China
 *   formatLegislation({ title: "Crimes Ordinance", jurisdiction: "HK", pinpoint: "cap 200, s 47" })
 *
 * @param data - Hong Kong legislation citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatLegislation(data: {
  title: string;
  year?: number;
  jurisdiction?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Year (if applicable)
  if (data.year !== undefined) {
    runs.push({ text: ` ${data.year}`, italic: true });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Pinpoint (cap, section, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-005: Hong Kong Basic Law ──────────────────────────────────────────

/**
 * Formats a citation to the Hong Kong Basic Law per AGLC4 Rule 19.2.
 *
 * @remarks AGLC4 Rule 19.2: The Basic Law of the Hong Kong Special
 * Administrative Region is cited with the full title in italics,
 * followed by article pinpoint references.
 *
 * @example
 *   // Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China art 23
 *   formatConstitution({ title: "Basic Law of the Hong Kong Special Administrative Region of the People's Republic of China", pinpoint: "art 23" })
 *
 * @param data - Hong Kong Basic Law citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: {
  title: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Pinpoint (article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
