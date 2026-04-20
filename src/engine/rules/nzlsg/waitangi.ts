/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-004: Waitangi Tribunal Reports
 *
 * NZLSG Rule 3.6: Format: Waitangi Tribunal Title (Wai Number, Year)
 * Title in italics. Treated as primary source in bibliography.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface WaitangiTribunalReportData {
  /** Title of the report (will be italicised). */
  title: string;
  /** Wai claim number (e.g. 262). */
  waiNumber: number;
  /** Year of the report. */
  year: number;
  /** Pinpoint reference (page or chapter). */
  pinpoint?: string;
}

// ─── NZLSG-004: Waitangi Tribunal Reports ──────────────────────────────────

/**
 * Formats a Waitangi Tribunal report citation per NZLSG Rule 3.6.
 *
 * NZLSG Rule 3.6: Waitangi Tribunal reports are cited as:
 * Waitangi Tribunal *Title* (Wai Number, Year) pinpoint.
 *
 * The title is italicised. The Wai number is the tribunal's claim number.
 * Treated as a primary source in bibliography (dedicated section).
 *
 * @example
 *   // Waitangi Tribunal Ko Aotearoa Tenei (Wai 262, 2011) at 23
 *   formatWaitangiTribunalReport({
 *     title: "Ko Aotearoa T\u0113nei",
 *     waiNumber: 262,
 *     year: 2011,
 *     pinpoint: "23",
 *   })
 */
export function formatWaitangiTribunalReport(
  data: WaitangiTribunalReportData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author: Waitangi Tribunal
  runs.push({ text: "Waitangi Tribunal " });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Parenthetical: Wai number and year
  runs.push({ text: ` (Wai ${data.waiNumber}, ${data.year})` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
