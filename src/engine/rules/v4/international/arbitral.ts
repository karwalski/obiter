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

// ─── INTL-007b: Individual–State Decisions (Rule 11.2.2) ───────────────────

/**
 * Formats an unreported individual–state (investor–state) arbitral decision
 * per AGLC4 Rule 11.2.2.
 *
 * AGLC4 Rule 11.2.2: The form is:
 *   *Parties' Names* (*Phase*) (Name of Arbitral Body or Tribunal,
 *   Case No Number, Full Date) Pinpoint.
 *
 * The phase (award type) is italicised in its own parentheses after the
 * parties' names, and is included only where one appears in the decision.
 * The tribunal name appears as on the decision (default 'ICSID Arbitral
 * Tribunal'); the case number is included only where one appears; pinpoints
 * follow rules 1.1.6–1.1.7, space-separated.
 *
 * @param data - The individual–state arbitration citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 11.2.2.
 */
export function formatIcsidCase(data: {
  caseName: string;
  icsidNumber: string;
  awardType?: string;
  date: string;
  tribunal?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Parties' names — italicised (Rules 2.1, 11.2.2)
  runs.push({ text: data.caseName, italic: true });

  // Phase — italicised in parentheses, only where present (Rule 11.2.2)
  if (data.awardType) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.awardType})`, italic: true });
  }

  // Tribunal, case number and full date in parentheses (Rules 11.1.2, 11.2.2)
  const parts: string[] = [data.tribunal || "ICSID Arbitral Tribunal"];
  if (data.icsidNumber) {
    parts.push(`Case No ${data.icsidNumber}`);
  }
  parts.push(data.date);
  runs.push({ text: ` (${parts.join(", ")})` });

  // Pinpoint — space-separated (Rules 1.1.6–1.1.7)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
