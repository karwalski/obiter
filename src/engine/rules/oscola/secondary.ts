/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 §3.7.6 — Theses and Dissertations (OSC-ENH-006, STD-017)
 *
 * Pure formatting function for thesis/dissertation citations. OSCOLA 5
 * §3.7.6 sets the title in italics; OSCOLA 4 §3.4.7 put it in single quotes,
 * roman (docs/standards-rule-notes.md). The caller chooses through
 * `titleStyle` (default: the OSCOLA 5 italic form). Pinpoint follows
 * directly without 'at' prefix.
 *
 * Format:
 *   Author, Title (Type of thesis, University Year) pinpoint
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interface ──────────────────────────────────────────────────────────

export interface OscolaThesisData {
  /** Author name(s). */
  author: string;
  /** Title of the thesis (italic under OSCOLA 5 §3.7.6, single-quoted roman under OSCOLA 4 §3.4.7). */
  title: string;
  /** Title style: "italic" (OSCOLA 5 §3.7.6, default) or "quoted" (OSCOLA 4 §3.4.7). */
  titleStyle?: "italic" | "quoted";
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
 * Formats a thesis/dissertation citation per OSCOLA 5 §3.7.6.
 *
 * OSCOLA 5 §3.7.6: Author, *Title* (Type of thesis, University Year) pinpoint —
 * the title italic and no comma between university and year:
 * `Javan Herberg, Injunctive Relief for Wrongful Termination of Employment
 * (DPhil thesis, University of Oxford 1989)`. OSCOLA 4 §3.4.7 (`titleStyle:
 * "quoted"`) sets the title in single curly quotes, roman. Pinpoint follows
 * the parenthetical directly without 'at'.
 *
 * @example
 *   // John Smith, The Doctrine of Legitimate Expectations in EU Law
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

  // Title: italic (OSCOLA 5 §3.7.6) or single curly quotes, roman (OSCOLA 4 §3.4.7)
  if (data.titleStyle === "quoted") {
    runs.push({ text: `\u2018${data.title}\u2019` });
  } else {
    runs.push({ text: data.title, italic: true });
  }

  // Thesis type, university, and year in parentheses
  // Note: OSCOLA format has no comma between university and year
  runs.push({ text: ` (${data.thesisType}, ${data.university} ${data.year})` });

  // Pinpoint follows directly (no 'at' prefix in OSCOLA)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
