/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: Germany (Rules 18.1–18.2)
 *
 * Pure formatting functions for German case citations, legislation
 * (BGB, StGB, GG, etc.), and Grundgesetz (Basic Law) provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── German Court Abbreviations ─────────────────────────────────────────────

/**
 * Standard abbreviations for German courts.
 *
 * AGLC4 Rule 18.1: German courts are abbreviated as follows:
 * - BVerfG: Bundesverfassungsgericht (Federal Constitutional Court)
 * - BGH: Bundesgerichtshof (Federal Court of Justice)
 * - BAG: Bundesarbeitsgericht (Federal Labour Court)
 * - BVerwG: Bundesverwaltungsgericht (Federal Administrative Court)
 */
const COURT_ABBREVIATIONS: Record<string, string> = {
  BVerfG: "Bundesverfassungsgericht",
  BGH: "Bundesgerichtshof",
  BAG: "Bundesarbeitsgericht",
  BVerwG: "Bundesverwaltungsgericht",
  BFH: "Bundesfinanzhof",
  BSG: "Bundessozialgericht",
};

// ─── FRGN-004: German Cases (Rule 18.1) ─────────────────────────────────────

/**
 * Formats a German case citation per AGLC4 Rule 18.1.
 *
 * @remarks AGLC4 Rule 18.1: German case citations include the case name
 * (if any) in italics, followed by the court abbreviation (e.g. BVerfG, BGH),
 * the report series (e.g. BVerfGE, BGHZ, NJW), volume, and starting page.
 * Many German cases are identified by report series and page number
 * rather than party names.
 *
 * @example
 *   // Luth (1958) 7 BVerfGE 198
 *   formatCase({ caseName: "Luth", year: 1958, reportSeries: "BVerfGE", volume: 7, startingPage: 198 })
 *
 * @param data - German case citation data
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
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Court identifier (if not apparent from report series)
  const seriesImplyingCourt = new Set(["BVerfGE", "BGHZ", "BGHSt"]);
  if (data.court && !seriesImplyingCourt.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-004: German Legislation (Rule 18.2) ───────────────────────────────

/**
 * Formats a German legislative citation per AGLC4 Rule 18.2.
 *
 * @remarks AGLC4 Rule 18.2: German legislation is cited using
 * the standard abbreviation (e.g. BGB, StGB, HGB, GG) in italics.
 * Pinpoint references use the paragraph symbol for sections.
 * Full titles may be provided in parentheses after the abbreviation
 * on first citation.
 *
 * @example
 *   // Burgerliches Gesetzbuch [German Civil Code] (Germany) s 823
 *   formatLegislation({ title: "Burgerliches Gesetzbuch", jurisdiction: "Germany", pinpoint: "s 823" })
 *
 * @param data - German legislation citation data
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
    runs.push({ text: ` ${data.year}` });
  }

  // Jurisdiction in parentheses
  if (data.jurisdiction) {
    runs.push({ text: ` (${data.jurisdiction})` });
  }

  // Pinpoint (section/paragraph, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-004: Grundgesetz (Basic Law) ──────────────────────────────────────

/**
 * Formats a citation to the German Grundgesetz (Basic Law) per AGLC4 Rule 18.2.
 *
 * @remarks AGLC4 Rule 18.2: The Grundgesetz (Basic Law) is cited
 * in italics with article pinpoint references. The abbreviation GG
 * may be used after the first full citation.
 *
 * @example
 *   // Grundgesetz fur die Bundesrepublik Deutschland [Basic Law of the Federal Republic of Germany] art 1
 *   formatConstitution({ title: "Grundgesetz fur die Bundesrepublik Deutschland", pinpoint: "art 1" })
 *
 * @param data - German constitutional citation data
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
