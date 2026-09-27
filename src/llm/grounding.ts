/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * LCT-001: Grounding check for AI-parsed citations.
 *
 * A model can invent a year, a page or a volume, or copy one from a corpus
 * neighbour shown in its prompt. These pure helpers compare the numbers in
 * the parsed fields with the numbers in the text the user supplied, so the
 * parse-verification loop can report any number that isn't in the input,
 * and any number the model used in more fields than it appears in the text.
 *
 * Idea credited to finnjones/legal-citation-tool (`aglc/validate.py`);
 * reimplemented here, no code copied.
 */

/** A numeric value in the parsed data that the input does not support. */
export interface UngroundedNumber {
  /** Dotted path of the field, eg "year" or "authors.0.surname". */
  field: string;
  /** The field's full value, for the message. */
  value: string;
  /** The numbers in the value that are absent from the input. */
  missing: string[];
}

/** A number the model placed in more fields than it occurs in the input. */
export interface OverusedNumber {
  number: string;
  inputCount: number;
  fields: string[];
}

const DIGITS_RE = /\d+/g;
// A shortened range: "150–5", "150-55", "1992–93". The second number keeps
// only the digits that change (AGLC4 r 1.12 style), so we rebuild it.
const SPAN_RE = /(\d+)\s*[-–—]\s*(\d+)/g;

function stripZeros(n: string): string {
  const s = n.replace(/^0+(?=\d)/, "");
  return s;
}

/**
 * Return a multiset (number -> count) of the numbers in `text`. A shortened
 * span such as `150–5` also yields the expanded end `155`, so a model that
 * writes the full end point is not flagged.
 */
export function numbersIn(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (n: string): void => {
    const k = stripZeros(n);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  for (const m of text.match(DIGITS_RE) ?? []) add(m);
  for (const m of text.matchAll(SPAN_RE)) {
    const [start, end] = [m[1], m[2]];
    if (end.length < start.length) {
      const expanded = start.slice(0, start.length - end.length) + end;
      if (!counts.has(stripZeros(expanded))) add(expanded);
    }
  }
  return counts;
}

/** Flatten a parsed data object into [path, string value] pairs. */
export function flattenFields(data: unknown, prefix = ""): Array<[string, string]> {
  if (data === null || data === undefined) return [];
  if (typeof data === "string" || typeof data === "number") {
    return [[prefix, String(data)]];
  }
  if (Array.isArray(data)) {
    return data.flatMap((v, i) => flattenFields(v, prefix ? `${prefix}.${i}` : String(i)));
  }
  if (typeof data === "object") {
    return Object.entries(data as Record<string, unknown>).flatMap(([k, v]) =>
      flattenFields(v, prefix ? `${prefix}.${k}` : k)
    );
  }
  return [];
}

/**
 * Report every field whose numbers are not all present in `input`.
 *
 * Ordinals ("2nd") and dates ("20 November 1989") are handled naturally: only
 * the digit runs are compared.
 */
export function findUngroundedNumbers(input: string, data: unknown): UngroundedNumber[] {
  const available = numbersIn(input);
  const out: UngroundedNumber[] = [];
  for (const [field, value] of flattenFields(data)) {
    const missing = [...new Set((value.match(DIGITS_RE) ?? []).map(stripZeros))].filter(
      (n) => !available.has(n)
    );
    if (missing.length > 0) out.push({ field, value, missing });
  }
  return out;
}

/**
 * Report numbers the model used in more distinct fields than the input
 * contains them. The usual case is a starting page copied into the pinpoint:
 * AGLC4 r 2.2.5 repeats the page (`24 CLR 21, 21`) only when the text itself
 * repeats it, so a single `21` in the input cannot fill both fields.
 *
 * `ignoreFields` names fields whose numbers legitimately repeat another
 * field's (eg an `mnc` string that restates the year).
 */
export function findOverusedNumbers(
  input: string,
  data: unknown,
  ignoreFields: readonly string[] = []
): OverusedNumber[] {
  const available = numbersIn(input);
  const usage = new Map<string, string[]>();
  for (const [field, value] of flattenFields(data)) {
    if (ignoreFields.includes(field.split(".")[0])) continue;
    for (const n of new Set((value.match(DIGITS_RE) ?? []).map(stripZeros))) {
      usage.set(n, [...(usage.get(n) ?? []), field]);
    }
  }
  const out: OverusedNumber[] = [];
  for (const [n, fields] of usage) {
    const inputCount = available.get(n) ?? 0;
    if (inputCount > 0 && fields.length > inputCount) {
      out.push({ number: n, inputCount, fields });
    }
  }
  return out;
}
