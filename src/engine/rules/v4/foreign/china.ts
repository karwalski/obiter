/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: China (Rules 16.1–16.4)
 *
 * Pure formatting functions for Chinese case citations and legislation.
 * Author/party name order follows Chinese convention (family name first).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── Chinese Court Hierarchy ─────────────────────────────────────────────────

/**
 * Abbreviations for the Chinese court hierarchy used in case citations.
 *
 * AGLC4 Rule 16.1: Chinese courts are referenced by their standard
 * abbreviations reflecting the four-tier court system.
 */
const COURT_ABBREVIATIONS: Record<string, string> = {
  SPC: "Supreme People's Court",
  HPC: "Higher People's Court",
  IPC: "Intermediate People's Court",
  BPC: "Basic People's Court",
};

// ─── FRGN-002: Chinese Cases (Rules 16.1–16.2) ──────────────────────────────

/**
 * Formats a Chinese case citation per AGLC4 Rules 16.1–16.2.
 *
 * @remarks AGLC4 Rule 16.1: Chinese case citations include the case name
 * in italics, followed by the year in parentheses, the report series,
 * and starting page. The court level is indicated in parentheses.
 *
 * @remarks AGLC4 Rule 16.2: Party names follow Chinese convention
 * (family name first). Case names are transliterated into pinyin.
 *
 * @example
 *   // Zhang San v Li Si (2015) SPC Civil Final No 120
 *   formatCase({ caseName: "Zhang San v Li Si", year: 2015, reportSeries: "SPC Civil Final No 120", startingPage: 0, court: "SPC" })
 *
 * @param data - Chinese case citation data
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
  if (data.startingPage > 0) {
    runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });
  } else {
    // Chinese case numbers often serve as the identifier
    runs.push({ text: ` ${data.reportSeries}` });
  }

  // Court identifier
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-002: Chinese Legislation (Rules 16.3–16.4) ────────────────────────

/**
 * Formats a Chinese legislative citation per AGLC4 Rules 16.3–16.4.
 *
 * @remarks AGLC4 Rule 16.3: Chinese legislative acts are cited with the
 * title in italics, followed by the enacting body and date of promulgation
 * in parentheses. Titles are given in English translation.
 *
 * @remarks AGLC4 Rule 16.4: The People's Republic of China is abbreviated
 * as 'PRC' in jurisdiction references.
 *
 * @example
 *   // Contract Law of the People's Republic of China (PRC)
 *   formatLegislation({ title: "Contract Law of the People's Republic of China", jurisdiction: "PRC" })
 *
 * @param data - Chinese legislation citation data
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

  // Jurisdiction (PRC) and/or year
  const parenthetical: string[] = [];
  if (data.jurisdiction) {
    parenthetical.push(data.jurisdiction);
  }
  if (data.year !== undefined) {
    parenthetical.push(String(data.year));
  }
  if (parenthetical.length > 0) {
    runs.push({ text: ` (${parenthetical.join(", ")})` });
  }

  // Pinpoint (article, section, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
