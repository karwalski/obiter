/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Foreign Cases and Legislation: Canada (Rules 15.1–15.5)
 *
 * Pure formatting functions for Canadian case citations, legislation,
 * and constitutional provisions.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── FRGN-001: Canadian Cases (Rules 15.1–15.3) ─────────────────────────────

/**
 * Formats a Canadian case citation per AGLC4 Rules 15.1–15.3.
 *
 * @remarks AGLC4 Rule 15.1: Canadian cases are cited using the standard
 * format: *Case Name* [year] volume Report Series starting page.
 * Common Canadian report series include SCR (Supreme Court Reports),
 * FC (Federal Court Reports), and OR (Ontario Reports).
 *
 * @remarks AGLC4 Rule 15.2: The court identifier is included in
 * parentheses unless it is apparent from the report series.
 *
 * @example
 *   // R v Oakes [1986] 1 SCR 103
 *   formatCase({ caseName: "R v Oakes", year: 1986, reportSeries: "SCR", volume: 1, startingPage: 103 })
 *
 * @param data - Canadian case citation data
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

  // Year in square brackets for Canadian reports
  runs.push({ text: ` [${data.year}]` });

  // Volume (if applicable)
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series and starting page
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Court identifier (if not apparent from series)
  const seriesImplyingCourt = new Set(["SCR", "FC", "Ex CR"]);
  if (data.court && !seriesImplyingCourt.has(data.reportSeries)) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── FRGN-001: Canadian Legislation (Rule 15.4) ─────────────────────────────

/**
 * Formats a Canadian legislative citation per AGLC4 Rule 15.4.
 *
 * @remarks AGLC4 Rule 15.4: Canadian statutes are cited using
 * the Revised Statutes of Canada (RSC) or Statutes of Canada (SC) format.
 * The title appears in italics, followed by the statutory compilation
 * abbreviation and chapter number in roman type.
 *
 * @example
 *   // Criminal Code, RSC 1985, c C-46
 *   formatLegislation({ title: "Criminal Code", year: 1985, jurisdiction: "RSC", pinpoint: "c C-46" })
 *
 * @example
 *   // Canada Evidence Act, RSC 1985, c C-5, s 30
 *   formatLegislation({ title: "Canada Evidence Act", year: 1985, jurisdiction: "RSC", pinpoint: "c C-5, s 30" })
 *
 * @param data - Canadian legislation citation data
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

  // Jurisdiction abbreviation (RSC/SC) and year
  if (data.jurisdiction && data.year !== undefined) {
    runs.push({ text: `, ${data.jurisdiction} ${data.year}` });
  }

  // Pinpoint (chapter, section, etc.)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── FRGN-001: Canadian Constitution (Rule 15.5) ────────────────────────────

/**
 * Formats a citation to the Canadian Constitution per AGLC4 Rule 15.5.
 *
 * @remarks AGLC4 Rule 15.5: The Constitution Act is cited in italics
 * with the year, followed by any applicable pinpoint reference.
 * The Canadian Charter of Rights and Freedoms is cited as part of
 * the Constitution Act, 1982.
 *
 * @example
 *   // Constitution Act, 1982, s 2
 *   formatConstitution({ title: "Constitution Act, 1982", pinpoint: "s 2" })
 *
 * @example
 *   // Canadian Charter of Rights and Freedoms, pt I of the Constitution Act, 1982
 *   formatConstitution({ title: "Canadian Charter of Rights and Freedoms", pinpoint: "pt I of the Constitution Act, 1982" })
 *
 * @param data - Canadian constitutional citation data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatConstitution(data: {
  title: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Pinpoint (section, part, etc.)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
