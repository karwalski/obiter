/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

/** Punctuation marks that validly close a footnote. */
const CLOSING_PUNCTUATION = [".", "!", "?"];

/**
 * Ensure the last run in a footnote ends with closing punctuation.
 *
 * @remarks AGLC4 Rule 1.1.1: Footnotes must end with a full stop.
 * @remarks AGLC4 Rule 1.1.4: If the footnote already ends with appropriate
 * punctuation (full stop, exclamation mark, or question mark), no additional
 * punctuation is added.
 *
 * @param runs - The formatted runs comprising the footnote content
 * @returns A new array of FormattedRun with closing punctuation ensured
 */
export function ensureClosingPunctuation(
  runs: FormattedRun[]
): FormattedRun[] {
  if (runs.length === 0) {
    return runs;
  }

  const result = runs.map((run) => ({ ...run }));
  const lastRun = result[result.length - 1];
  const trimmedText = lastRun.text.trimEnd();

  if (trimmedText.length === 0) {
    return result;
  }

  const lastChar = trimmedText[trimmedText.length - 1];

  if (!CLOSING_PUNCTUATION.includes(lastChar)) {
    lastRun.text = trimmedText + ".";
  }

  return result;
}

/**
 * Join multiple citation run arrays into a single footnote.
 *
 * @remarks AGLC4 Rule 1.1.3: Where multiple sources are cited in a single
 * footnote, they are separated by semicolons. When a subsequent citation uses
 * a different introductory signal, a new sentence is started instead.
 * Sources are never joined with 'and'.
 *
 * @param citations - An array of citation run arrays to join
 * @param signals - Optional introductory signals corresponding to each
 *   citation (e.g. "See", "See also", "Cf"). When a signal differs from the
 *   previous citation's signal, a new sentence begins (full stop + space)
 *   rather than a semicolon separator.
 * @returns A single array of FormattedRun representing the combined footnote
 */
export function joinMultipleCitations(
  citations: FormattedRun[][],
  signals?: (string | undefined)[]
): FormattedRun[] {
  if (citations.length === 0) {
    return [];
  }

  const runs: FormattedRun[] = [...citations[0]];

  for (let i = 1; i < citations.length; i++) {
    const prevSignal = signals?.[i - 1];
    const currSignal = signals?.[i];

    const signalChanged =
      currSignal !== undefined && currSignal !== prevSignal;

    if (signalChanged) {
      // Different introductory signal: start a new sentence.
      runs.push({ text: ". " });
    } else {
      // Same signal or no signals: separate with semicolon.
      runs.push({ text: "; " });
    }

    runs.push(...citations[i]);
  }

  return runs;
}
