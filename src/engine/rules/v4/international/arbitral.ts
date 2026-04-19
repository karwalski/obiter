/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — International Arbitral Awards (Rules 11.1–11.3)
 *
 * INTL-007: Pure formatting functions for state–state arbitrations,
 * investor–state arbitrations, and ICSID cases.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-007a: State–State Arbitration (Rule 11.1) ─────────────────────────

/**
 * Formats a state–state or inter-state arbitration citation.
 *
 * AGLC4 Rule 11.1: State–state arbitrations are cited with the
 * party names (italicised), followed by the award details, the
 * tribunal name, the report series (if applicable), and the year.
 *
 * Format:
 *   *Parties* (Award Details) (Tribunal, Report Series, Year)
 *   *Parties* (Award Details) (Tribunal, Year)
 *
 * @example
 *   Island of Palmas (Netherlands v United States of America)
 *   (Award) (PCA, 2 RIAA 829, 1928)
 */
/**
 * Formats a reported state-state arbitral decision per AGLC4 Rule 11.1.1.
 *
 * AGLC4 Rule 11.1.1: Reported state-state decisions follow Rule 10.2 format:
 *   Case Name (Parties) (Phase) (Year) Volume Report Series StartPage, Pinpoint.
 *
 * @param data - The state-state arbitration citation data.
 * @returns An array of FormattedRun objects.
 */
export function formatStateArbitrationReported(data: {
  caseName: string;
  parties?: string;
  phase?: string;
  year: number;
  volume?: number;
  reportSeries: string;
  startingPage: number;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised (Rule 11.1.1)
  runs.push({ text: data.caseName, italic: true });

  // Parties — italicised in parentheses
  if (data.parties) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.parties})`, italic: true });
  }

  // Phase — italicised in parentheses
  if (data.phase) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.phase})`, italic: true });
  }

  // Year in round brackets, volume, report series, starting page
  runs.push({ text: ` (${data.year})` });
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Judge/arbitrator
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

/**
 * Formats an unreported state-state arbitral decision per AGLC4 Rule 11.1.2.
 *
 * AGLC4 Rule 11.1.2: Unreported decisions are cited as:
 *   Case Name (Parties) (Phase) (Tribunal, Case No X, Date) [Pinpoint].
 *
 * @param data - The state-state arbitration citation data.
 * @returns An array of FormattedRun objects.
 */
export function formatStateArbitration(data: {
  parties: string;
  awardDetails: string;
  tribunal: string;
  caseNumber?: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Party names — italicised per AGLC4 Rule 11.1
  runs.push({ text: data.parties, italic: true });

  // Phase/award details in parentheses — italicised
  runs.push({ text: " " });
  runs.push({ text: `(${data.awardDetails})`, italic: true });

  // Tribunal, case number, and date in parentheses
  const parts: string[] = [data.tribunal];
  if (data.caseNumber) {
    parts.push(`Case No ${data.caseNumber}`);
  }
  parts.push(data.date);
  runs.push({ text: ` (${parts.join(", ")})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-007b: ICSID Cases (Rules 11.2–11.3) ──────────────────────────────

/**
 * Formats an ICSID (International Centre for Settlement of Investment
 * Disputes) case citation.
 *
 * AGLC4 Rules 11.2–11.3: Investor–state arbitrations, including ICSID
 * cases, are cited with the case name (italicised), followed by the ICSID
 * case number, the type of award or decision, and the date.
 *
 * Format:
 *   *Case Name* (ICSID Case No ARB/XX/XX, Award Type, Date)
 *
 * @example
 *   Occidental Petroleum Corporation v Republic of Ecuador
 *   (ICSID Case No ARB/06/11, Award, 5 October 2012)
 */
export function formatIcsidCase(data: {
  caseName: string;
  icsidNumber: string;
  awardType: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rules 11.2–11.3
  runs.push({ text: data.caseName, italic: true });

  // ICSID number, award type, and date in parentheses
  runs.push({
    text: ` (ICSID Case No ${data.icsidNumber}, ${data.awardType}, ${data.date})`,
  });

  return runs;
}
