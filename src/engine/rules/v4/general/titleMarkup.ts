/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { FormattedRun } from "../../../../types/formattedRun";

/**
 * AGLC4 Rule 4.2 — Embedded Italics Inside Secondary-Source Titles
 *
 * Titles are stored as plain strings; a minimal inline marker convention
 * represents the italics rule 4.2 preserves from the original source (eg a
 * case name such as IceTV within an article title):
 *
 * - A pair of single asterisks marks an italic span: `Talking to *IceTV*`.
 * - A doubled asterisk `**` renders one literal asterisk (escape).
 * - If, after accounting for `**` escapes, the single asterisks do not pair
 *   up, markup is disabled and the whole title renders exactly as typed
 *   (no characters are ever consumed or invented; parsing never throws).
 * - A title with no asterisks renders identically to the pre-markup engine
 *   (single run, base style — a guaranteed no-op).
 *
 * Style semantics (verified against the PDF, p 113 / printed p 88):
 * - Inside a roman title (quoted article/chapter titles), marked spans
 *   render italic ("italicised … if they are in italics in the original
 *   source").
 * - Inside a title that is wholly italicised by the Guide (eg book titles),
 *   marked spans REMAIN italic — rule 4.2: "no part of the title should
 *   appear in roman font". The markers are consumed but never invert to
 *   roman. (Rule 1.8.2 prescribes no within-italics inversion.)
 *
 * @param title - The title text, already normalised per rule 4.2
 *   (formatSecondaryTitleText); may contain asterisk markers.
 * @param baseItalic - Whether the surrounding title style is italic
 *   (true for complete works such as books; false for quoted components).
 * @returns FormattedRun[] with adjacent same-style runs merged; unmarked
 *   input yields exactly one run in the base style.
 *
 * @see AGLC4, Rule 4.2.
 */
export function parseTitleMarkup(title: string, baseItalic: boolean): FormattedRun[] {
  const segments: Array<{ text: string; marked: boolean }> = [];
  let buffer = "";
  let marked = false;

  for (let i = 0; i < title.length; i++) {
    const char = title.charAt(i);
    if (char !== "*") {
      buffer += char;
      continue;
    }
    // Doubled asterisk: escape for one literal asterisk.
    if (title.charAt(i + 1) === "*") {
      buffer += "*";
      i++;
      continue;
    }
    // Single asterisk: span toggle.
    segments.push({ text: buffer, marked });
    buffer = "";
    marked = !marked;
  }

  // Unbalanced toggles: degrade to the literal title, exactly as typed.
  if (marked) {
    return [makeRun(title, baseItalic)];
  }
  segments.push({ text: buffer, marked });

  const runs: FormattedRun[] = [];
  for (const segment of segments) {
    if (segment.text.length === 0) continue;
    const italic = baseItalic || segment.marked;
    const previous = runs[runs.length - 1];
    if (previous && Boolean(previous.italic) === italic) {
      previous.text += segment.text;
      continue;
    }
    runs.push(makeRun(segment.text, italic));
  }

  // Empty (or markers-only) title: preserve the single-run shape.
  if (runs.length === 0) {
    return [makeRun("", baseItalic)];
  }
  return runs;
}

/**
 * Wraps title runs in single curly quotes for quoted component titles
 * (rule 4.2). Quotation marks are never italic: each quote merges into its
 * adjacent run only when that run is roman, otherwise it becomes its own
 * roman run. A single roman run round-trips byte-for-byte with the
 * pre-markup engine output.
 *
 * @param runs - The parsed title runs (parseTitleMarkup output).
 * @returns The runs enclosed in ‘ ’.
 *
 * @see AGLC4, Rule 4.2.
 */
export function quoteTitleRuns(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) {
    return [{ text: "‘’" }];
  }
  const quoted = runs.map((run) => ({ ...run }));

  const first = quoted[0];
  if (first.italic) {
    quoted.unshift({ text: "‘" });
  } else {
    first.text = "‘" + first.text;
  }

  const last = quoted[quoted.length - 1];
  if (last.italic) {
    quoted.push({ text: "’" });
  } else {
    last.text += "’";
  }

  return quoted;
}

/** Builds a run, omitting the italic property entirely for roman text. */
function makeRun(text: string, italic: boolean): FormattedRun {
  return italic ? { text, italic: true } : { text };
}
