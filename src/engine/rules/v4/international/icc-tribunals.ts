/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — International Criminal Courts and Tribunals (Rules 12.1–12.4)
 *
 * INTL-008: Pure formatting functions for cases before the ICC, ICTY,
 * ICTR, SCSL, and STL.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-008: ICC and International Criminal Tribunal Cases ─────────────────

/**
 * Formats a case citation for an international criminal court or tribunal.
 *
 * AGLC4 Rules 12.1–12.4: Cases before the ICC, ICTY, ICTR, SCSL, and STL
 * are cited with the case name (italicised), followed by the phase of
 * proceedings, the court abbreviation, the chamber designation, the case
 * number, the date, and an optional pinpoint.
 *
 * Supported courts:
 * - ICC  — International Criminal Court (Rule 12.1)
 * - ICTY — International Criminal Tribunal for the former Yugoslavia (Rule 12.2)
 * - ICTR — International Criminal Tribunal for Rwanda (Rule 12.3)
 * - SCSL — Special Court for Sierra Leone (Rule 12.3)
 * - STL  — Special Tribunal for Lebanon (Rule 12.4)
 *
 * Format:
 *   *Case Name* (Court, Chamber, Case No, Date) pinpoint
 *
 * @example
 *   Prosecutor v Lubanga (Judgment) (ICC, Trial Chamber I,
 *   Case No ICC-01/04-01/06, 14 March 2012)
 *
 * @example
 *   Prosecutor v Tadić (Appeal Judgment) (ICTY, Appeals Chamber,
 *   Case No IT-94-1-A, 15 July 1999) [64]
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

  // Case name — italicised per AGLC4 Rules 12.1–12.4
  runs.push({ text: data.caseName, italic: true });

  // Phase of proceedings in parentheses — italicised (Rule 12.2.2)
  runs.push({ text: " " });
  runs.push({ text: `(${data.phase})`, italic: true });

  // Court, chamber, case number, and date in parentheses
  runs.push({
    text: ` (${data.court}, ${data.chamber}, Case No ${data.caseNumber}, ${data.date})`,
  });

  // Optional pinpoint reference
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
