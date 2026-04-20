/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-008: General vs Commercial Style
 *
 * NZLSG Rule 2.3: Two subsequent reference styles.
 * General: 'above n X, at pinpoint' with ibid prohibited.
 * Commercial: short-form only, no cross-references.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NZLSGStyle = "general" | "commercial";

export interface GeneralSubsequentData {
  /** Author or short title for the cross-reference. */
  authorOrTitle: string;
  /** Footnote number of the first full citation. */
  footnoteNumber: number;
  /** Pinpoint reference (used with 'at' prefix). */
  pinpoint?: string;
}

export interface CommercialSubsequentData {
  /** Author surname or short title. */
  authorOrTitle: string;
  /** Short title (if different from author). */
  shortTitle?: string;
  /** Pinpoint reference (used with 'at' prefix). */
  pinpoint?: string;
}

// ─── NZLSG-008: General Style Subsequent Reference ─────────────────────────

/**
 * Formats a subsequent reference in NZLSG general style per Rule 2.3.
 *
 * NZLSG Rule 2.3 (General): 'Author, above n X, at pinpoint.'
 * No ibid. All subsequent references use the 'above n' format.
 *
 * @example
 *   // Butler and Butler, above n 12, at 134
 *   formatGeneralSubsequent({
 *     authorOrTitle: "Butler and Butler",
 *     footnoteNumber: 12,
 *     pinpoint: "134",
 *   })
 */
export function formatGeneralSubsequent(
  data: GeneralSubsequentData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author/title, above n X
  runs.push({ text: `${data.authorOrTitle}, above n ${data.footnoteNumber}` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: `, at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-008: Commercial Style Subsequent Reference ──────────────────────

/**
 * Formats a subsequent reference in NZLSG commercial style per Rule 2.3.
 *
 * NZLSG Rule 2.3 (Commercial): Short-form citation only.
 * No cross-reference numbering. No 'above n'. No ibid.
 * Author/short title + pinpoint only.
 *
 * @example
 *   // Butler and Butler at 134
 *   formatCommercialSubsequent({
 *     authorOrTitle: "Butler and Butler",
 *     pinpoint: "134",
 *   })
 */
export function formatCommercialSubsequent(
  data: CommercialSubsequentData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author or short title
  let text = data.authorOrTitle;
  if (data.shortTitle) {
    text = data.shortTitle;
  }
  runs.push({ text });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
