/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.6 — Theses and Dissertations (OSC-ENH-006)
 *
 * Pure formatting function for thesis/dissertation citations per OSCOLA 5
 * Rule 3.6. Title in single curly quotes (not italic). Pinpoint follows
 * directly without 'at' prefix.
 *
 * Format:
 *   Author, 'Title' (Type of thesis, University Year) pinpoint
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interface ──────────────────────────────────────────────────────────

export interface OscolaThesisData {
  /** Author name(s). */
  author: string;
  /** Title of the thesis (will be in single curly quotes, not italic). */
  title: string;
  /** Type of thesis (e.g. "DPhil thesis", "PhD thesis", "LLM thesis"). */
  thesisType: string;
  /** University name. */
  university: string;
  /** Year of submission. */
  year: number;
  /** Pinpoint reference (follows directly, no 'at' prefix). */
  pinpoint?: string;
}

// ─── OSC-ENH-006: Thesis/Dissertation ────────────────────────────────────────

/**
 * Formats a thesis/dissertation citation per OSCOLA 5 Rule 3.6.
 *
 * OSCOLA 5 Rule 3.6: Author, 'Title' (Type of thesis, University Year) pinpoint.
 * Title is in single curly quotes (not italic — differs from NZLSG which uses
 * double quotes). Pinpoint follows the parenthetical directly without 'at'.
 *
 * @example
 *   // John Smith, 'The Doctrine of Legitimate Expectations in EU Law'
 *   // (DPhil thesis, University of Oxford 2020) 45
 *   formatOscolaThesis({
 *     author: "John Smith",
 *     title: "The Doctrine of Legitimate Expectations in EU Law",
 *     thesisType: "DPhil thesis",
 *     university: "University of Oxford",
 *     year: 2020,
 *     pinpoint: "45",
 *   })
 */
export function formatOscolaThesis(data: OscolaThesisData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author followed by comma
  runs.push({ text: `${data.author}, ` });

  // Title in single curly quotes (not italic per OSCOLA 5 Rule 3.6)
  runs.push({ text: `\u2018${data.title}\u2019` });

  // Thesis type, university, and year in parentheses
  // Note: OSCOLA format has no comma between university and year
  runs.push({ text: ` (${data.thesisType}, ${data.university} ${data.year})` });

  // Pinpoint follows directly (no 'at' prefix in OSCOLA)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
