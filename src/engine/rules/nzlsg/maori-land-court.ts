/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-003: Maori Land Court and Maori Appellate Court
 *
 * NZLSG Rule 3.5: Decisions cited using block/minute book format.
 * Full stop after 'v.' in MLC case names (departing from general rule).
 * Te reo Maori diacritics (macrons) preserved in all names and place names.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface MaoriLandCourtData {
  /**
   * Case name. Note: full stop after 'v.' is expected in MLC cases
   * (departing from the general rule that omits the full stop).
   */
  caseName: string;
  /** Year of decision. */
  year: number;
  /** Block number (e.g. 103). */
  blockNumber: number;
  /** District or place name for the minute book (e.g. 'Taitokerau'). */
  minuteBookDistrict: string;
  /** Minute book abbreviation (e.g. 'MB' for minute book). */
  minuteBookAbbrev: string;
  /** Page number within the minute book. */
  page: number;
  /** Short-form block number (for parenthetical). */
  shortBlockNumber?: number;
  /** Short-form court abbreviation (e.g. 'TTK'). */
  shortCourtAbbrev?: string;
  /** Short-form page (for parenthetical). */
  shortPage?: number;
  /** Pinpoint reference. */
  pinpoint?: string;
  /** Whether the case is from the Maori Appellate Court rather than MLC. */
  isAppellateCourt?: boolean;
}

// ─── NZLSG-003: Maori Land Court Citation ──────────────────────────────────

/**
 * Formats a Maori Land Court or Maori Appellate Court decision per NZLSG Rule 3.5.
 *
 * NZLSG Rule 3.5: Block/minute book format:
 * Name (Year) BlockNumber District MB Page (BlockNumber ShortAbbrev Page)
 *
 * Full stop after 'v.' in MLC case names (departing from general rule).
 * Te reo Maori diacritics (macrons) preserved in all names and place names.
 *
 * @example
 *   // Pomare – Peter Here Pomare (2015) 103 Taitokerau MB 95 (103 TTK 95)
 *   formatMaoriLandCourt({
 *     caseName: "Pomare \u2013 Peter Here Pomare",
 *     year: 2015,
 *     blockNumber: 103,
 *     minuteBookDistrict: "Taitokerau",
 *     minuteBookAbbrev: "MB",
 *     page: 95,
 *     shortBlockNumber: 103,
 *     shortCourtAbbrev: "TTK",
 *     shortPage: 95,
 *   })
 */
export function formatMaoriLandCourt(
  data: MaoriLandCourtData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Year in round brackets
  runs.push({ text: ` (${data.year})` });

  // Block number, district, minute book abbreviation, and page
  runs.push({
    text: ` ${data.blockNumber} ${data.minuteBookDistrict} ${data.minuteBookAbbrev} ${data.page}`,
  });

  // Short-form parenthetical (if provided)
  if (
    data.shortBlockNumber !== undefined &&
    data.shortCourtAbbrev &&
    data.shortPage !== undefined
  ) {
    runs.push({
      text: ` (${data.shortBlockNumber} ${data.shortCourtAbbrev} ${data.shortPage})`,
    });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
