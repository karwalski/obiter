/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: Malaysia (Rules 20.1–20.2)
 *
 * Pure formatting functions for Malaysian case citations, legislation,
 * and Federal Constitution provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-006: Malaysian Cases (Rule 20.1) ──────────────────────────────────

/**
 * Formats a Malaysian case citation per AGLC4 Rule 20.1.
 *
 * @remarks AGLC4 Rule 20.1: Malaysian cases are cited with the case name
 * in italics, followed by the year in square brackets, volume (if any),
 * report series abbreviation (e.g. MLJ, CLJ), and starting page.
 * The court abbreviation is included in parentheses unless apparent
 * from the report series.
 *
 * @example
 *   // Adorna Properties Sdn Bhd v Boonsom Boonyanit [2001] 1 MLJ 241
 *   formatCase({ caseName: "Adorna Properties Sdn Bhd v Boonsom Boonyanit", year: 2001, reportSeries: "MLJ", volume: 1, startingPage: 241 })
 *
 * @param data - Malaysian case citation data
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
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-006: Malaysian Legislation (Rule 20.2) ────────────────────────────

/**
 * Formats a Malaysian legislative citation per AGLC4 Rule 20.2.
 *
 * @remarks AGLC4 Rule 20.2: Malaysian legislation is cited with the
 * title in italics, followed by the year in italics, and the
 * jurisdiction 'Malaysia' in parentheses. Pinpoint references use
 * section abbreviations.
 *
 * @example
 *   // Federal Constitution (Malaysia) art 5
 *   formatLegislation({ title: "Penal Code", jurisdiction: "Malaysia", pinpoint: "s 302" })
 *
 * @param data - Malaysian legislation citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatLegislation(data: {
  title: string;
  year?: number;
  jurisdiction?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics (with year if applicable)
  if (data.year !== undefined) {
    runs.push({ text: `${data.title} ${data.year}`, italic: true });
  } else {
    runs.push({ text: data.title, italic: true });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Pinpoint (section, article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-006: Malaysian Federal Constitution ───────────────────────────────

/**
 * Formats a citation to the Malaysian Federal Constitution per AGLC4 Rule 20.2.
 *
 * @remarks AGLC4 Rule 20.2: The Federal Constitution of Malaysia is cited
 * with the title in italics, followed by article pinpoint references.
 * The jurisdiction 'Malaysia' appears in parentheses.
 *
 * @example
 *   // Federal Constitution (Malaysia) art 8
 *   formatConstitution({ title: "Federal Constitution", pinpoint: "art 8" })
 *
 * @param data - Malaysian constitutional citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: {
  title: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Jurisdiction always Malaysia for the Federal Constitution
  runs.push({ text: " (Malaysia)" });

  // Pinpoint (article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
