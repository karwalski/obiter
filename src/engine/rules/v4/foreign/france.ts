/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: France (Rules 17.1–17.2)
 *
 * Pure formatting functions for French case citations, code citations,
 * and constitutional provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── French Court Abbreviations ──────────────────────────────────────────────

/**
 * Standard abbreviations for French courts.
 *
 * AGLC4 Rule 17.1: French courts are abbreviated as follows:
 * - Cass: Cour de cassation (highest court of ordinary jurisdiction)
 * - CE: Conseil d'Etat (highest administrative court)
 * - CC: Conseil constitutionnel (constitutional court)
 */
const COURT_ABBREVIATIONS: Record<string, string> = {
  Cass: "Cour de cassation",
  CE: "Conseil d'Etat",
  CC: "Conseil constitutionnel",
};

// ─── FRGN-003: French Cases (Rule 17.1) ─────────────────────────────────────

/**
 * Formats a French case citation per AGLC4 Rule 17.1.
 *
 * @remarks AGLC4 Rule 17.1: French case citations begin with the
 * case name (if any) in italics, followed by the court abbreviation
 * (Cass, CE, or CC), the report series, and the page or decision number.
 * French cases frequently lack named parties.
 *
 * @example
 *   // Conseil constitutionnel [CC], Decision No 2012-647 DC
 *   formatCase({ caseName: "Decision No 2012-647 DC", year: 2012, reportSeries: "Rec", startingPage: 1, court: "CC" })
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

// ─── FRGN-003: French Legislation — Codes (Rule 17.2) ───────────────────────

/**
 * Formats a French legislative or code citation per AGLC4 Rule 17.2.
 *
 * @remarks AGLC4 Rule 17.2: French codes are cited with the code title
 * in italics (e.g. *Code civil*, *Code penal*). Pinpoint references
 * use 'art' for article. Ordinary legislation is cited with the title
 * in italics followed by the Journal officiel reference.
 *
 * @example
 *   // Code civil [Civil Code] (France) art 1382
 *   formatLegislation({ title: "Code civil", pinpoint: "art 1382", jurisdiction: "France" })
 *
 * @param data - French legislation citation data
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

  // Year (if applicable, for ordinary legislation)
  if (data.year !== undefined) {
    runs.push({ text: ` ${data.year}` });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Pinpoint (article, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-003: French Constitution ──────────────────────────────────────────

/**
 * Formats a citation to the French Constitution per AGLC4 Rule 17.2.
 *
 * @remarks AGLC4 Rule 17.2: The French Constitution is cited as
 * *Constitution of the French Republic* in italics, with pinpoint
 * references to specific articles.
 *
 * @example
 *   // Constitution of the French Republic art 55
 *   formatConstitution({ title: "Constitution of the French Republic", pinpoint: "art 55" })
 *
 * @param data - French constitutional citation data
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
