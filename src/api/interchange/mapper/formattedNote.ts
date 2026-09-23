/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * formattedNote.ts — the "<standard> footnote: …" and
 * "<standard> bibliography: …" note lines that carry the rendered citation
 * through an export so other tools can display it (STD-025).
 *
 * The label is the active standard's `standardLabel` ("AGLC4", "OSCOLA 5",
 * "NZLSG 3"). Every codec writes the line through `formattedNoteLine` and
 * every reader recognises it through `parseFormattedNoteLine`, whatever
 * the label, so a note exported under one standard is never mistaken for
 * a user note or parsed as citation data on re-import.
 */

import type { InterchangeRecord } from "../model";
import { addPassthrough } from "../model";

/** The label written when the export options name no standard. */
export const DEFAULT_STANDARD_LABEL = "AGLC4";

export type FormattedNoteKey = "footnote" | "bibliography";

/**
 * A standard label: an upper-case acronym ("AGLC4", "OSCOLA", "NZLSG")
 * followed by up to two short tokens ("5", "3", "4th ed"). Bounded so a
 * user note that happens to contain "footnote:" mid-sentence is not taken
 * for a formatted line.
 */
const LABEL = "[A-Z][A-Z0-9]*(?: [A-Za-z0-9.-]+){0,2}";

/** Lookahead fragment for splitting notes a codec joined into one field. */
export const FORMATTED_NOTE_LOOKAHEAD = `${LABEL} (?:footnote|bibliography):`;

const LINE_RE = new RegExp(`^(${LABEL}) (footnote|bibliography):\\s*([\\s\\S]*?)\\s*$`);

export interface FormattedNoteLine {
  standard: string;
  key: FormattedNoteKey;
  text: string;
}

/** Reads "<label> footnote: text"; undefined for any other note. */
export function parseFormattedNoteLine(line: string): FormattedNoteLine | undefined {
  const m = LINE_RE.exec(line.trim());
  if (!m) return undefined;
  return { standard: m[1], key: m[2] as FormattedNoteKey, text: m[3] };
}

export function isFormattedNoteLine(line: string): boolean {
  return parseFormattedNoteLine(line) !== undefined;
}

/** "<label> footnote: text", with the default label when none is given. */
export function formattedNoteLine(
  standard: string | undefined,
  key: FormattedNoteKey,
  text: string
): string {
  return `${standard?.trim() || DEFAULT_STANDARD_LABEL} ${key}: ${text}`;
}

/** The passthrough key a lifted line lands under ("formatted-footnote"). */
export function formattedPassthroughKey(key: FormattedNoteKey): string {
  return `formatted-${key}`;
}

/**
 * Moves every formatted line out of `record.notes` into the passthrough
 * bag ("formatted-footnote" / "formatted-bibliography"), the shape the
 * CSL-JSON and EndNote readers already produce. Idempotent.
 */
export function liftFormattedNotes(record: InterchangeRecord): void {
  const kept: string[] = [];
  for (const note of record.notes) {
    const parsed = parseFormattedNoteLine(note);
    if (parsed) addPassthrough(record, formattedPassthroughKey(parsed.key), parsed.text);
    else kept.push(note);
  }
  if (kept.length !== record.notes.length) record.notes = kept;
}
