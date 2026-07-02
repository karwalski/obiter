/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part V — Foreign Domestic Materials: Malaysia (Rules 20.1–20.2)
 *
 * Pure formatting functions for Malaysian case citations, legislation,
 * and Federal Constitution provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-006: Malaysian Cases (Rule 20.1) ──────────────────────────────────

/**
 * Formats a Malaysian case citation per AGLC4 Rules 20.1–20.1.1.
 *
 * @remarks AGLC4 Rule 20.1: Malaysian cases are cited in accordance
 * with chapter 2, except that individuals' names are generally given in
 * full, 'Sendirian Berhad' is abbreviated 'Sdn Bhd', and 'Datuk' and
 * 'Haji' are omitted from party names. Adding the court's name can be
 * helpful, per rule 2.2.6.
 *
 * @remarks AGLC4 Rule 20.1.1: cite the Malayan Law Journal ('MLJ')
 * where possible; otherwise the Current Law Journal ('CLJ').
 * Rule 20.1.2: Malaysian courts do not allocate medium neutral
 * citations — unreported decisions use the rule 2.3.2 format.
 *
 * @example
 *   // Ratna Ammal v Tan Chow Soo [1964] 1 MLJ 399  — AGLC4 ex 1
 *   formatCase({ caseName: "Ratna Ammal v Tan Chow Soo", year: 1964, reportSeries: "MLJ", volume: 1, startingPage: 399 })
 *
 * @example
 *   // Polygram Records Sdn Bhd v The Search [1994] 3 MLJ 127, 140
 *   //   (Sinnadurai J) (High Court of Malaya)  — AGLC4 ex 3
 *   formatCase({ caseName: "Polygram Records Sdn Bhd v The Search", year: 1994, volume: 3, reportSeries: "MLJ", startingPage: 127, pinpoint: "140 (Sinnadurai J)", court: "High Court of Malaya" })
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
  /** Pinpoint reference (follows the starting page after a comma). */
  pinpoint?: string;
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

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Court name in parentheses where not otherwise apparent (rule 2.2.6)
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-006: Malaysian Legislation (Rule 20.2) ────────────────────────────

/**
 * Formats a Malaysian legislative citation per AGLC4 Rule 20.2.1.
 *
 * @remarks AGLC4 Rule 20.2.1: Malaysian statutes and delegated
 * legislation follow chapter 3, with the jurisdiction written
 * '(Malaysia)'.
 *
 * @example
 *   // Copyright Act 1987 (Malaysia) s 7  — AGLC4 ex 7
 *   formatLegislation({ title: "Copyright Act", year: 1987, jurisdiction: "Malaysia", pinpoint: "s 7" })
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
 * Formats a citation to the Malaysian Federal Constitution per AGLC4
 * Rule 20.2.2.
 *
 * @remarks AGLC4 Rule 20.2.2 template: *Federal Constitution*
 * (Malaysia) Pinpoint.
 *
 * @example
 *   // Federal Constitution (Malaysia) art 5  — AGLC4 ex 9
 *   formatConstitution({ title: "Federal Constitution", pinpoint: "art 5" })
 *
 * @param data - Malaysian constitutional citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: { title: string; pinpoint?: string }): FormattedRun[] {
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
