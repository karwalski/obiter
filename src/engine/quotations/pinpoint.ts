/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * ENP-010: paragraph-marker detection in pasted judgment text.
 *
 * AGLC4 Rule 1.1.6 (pinpoint references): a pinpoint directs the reader to
 * the page, paragraph or other subdivision quoted from; paragraph numbers
 * appear in square brackets. Rule 1.1.7 (spans): a span of pinpoints takes
 * an en dash. Rule 1.7.1 (quotations) requires the pinpoint of the quoted
 * passage, so a quotation pasted with its paragraph numbers can supply its
 * own pinpoint — the markers are stripped from the quotation text and
 * carried into the footnote instead.
 *
 * This module is pure (no Office.js) so it can be unit-tested directly.
 */

/** A paragraph pinpoint detected in a pasted passage. */
export interface DetectedParagraphPinpoint {
  type: "paragraph";
  /** Plain value: "42" or a span "42–44" (en dash). Brackets are added by `bracketParagraphValue`. */
  value: string;
}

export interface PassagePinpointResult {
  /** The passage with markers removed and whitespace normalised. */
  cleaned: string;
  /** The pinpoint derived from the first marker (and any consecutive run). */
  pinpoint?: DetectedParagraphPinpoint;
  /** The raw marker strings found, in document order (e.g. ["[42]", "[43]"]). */
  markers: string[];
}

/**
 * A bracketed four-digit number in the year range is a citation year
 * (`[2020] HCA 1`), never a paragraph marker. Judgments rarely run past a
 * few hundred paragraphs, so this range is a safe exclusion.
 */
function looksLikeYear(value: string): boolean {
  if (value.length !== 4) return false;
  const n = Number(value);
  return n >= 1500 && n <= 2100;
}

/** Word count of a line fragment. */
function wordCount(fragment: string): number {
  return fragment.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * True when a fragment reads as the start of a prose sentence: it opens with
 * a capital letter, an opening quotation mark or a bracket, and carries at
 * least three words. Used to keep the bare-number forms ("42." / "42")
 * conservative — a lone number followed by a table cell or a citation is
 * not a paragraph marker.
 */
function looksLikeProse(fragment: string): boolean {
  const trimmed = fragment.trim();
  if (!/^[‘“"'(]?[A-Z]/.test(trimmed)) return false;
  return wordCount(trimmed) >= 3;
}

/** `[42]` at a line start or after whitespace, optionally preceded by `at `. */
const BRACKETED_RE = /(^|\s)(at\s+)?\[(\d{1,4})\](?=$|[\s.,;:)\]])/g;
/** `42.` or `42` opening a line, followed by prose on the same line. */
const LEADING_NUMBER_RE = /^(\d{1,4})\.?\s+(.+)$/;
/** A number (with or without a full stop) alone on a line. */
const LONE_NUMBER_RE = /^(\d{1,4})\.?$/;

/**
 * Detects paragraph markers in pasted judgment text and strips them.
 *
 * Recognised forms (conservative by design):
 *  - `[42]` at a line start or after whitespace, and `at [42]`;
 *  - `42.` or `42` opening a line when the rest of the line reads as prose;
 *  - `42` alone on a line when the next non-empty line reads as prose.
 *
 * The first marker supplies the pinpoint; a run of consecutive markers
 * starting from it becomes a span ("42–44", Rule 1.1.7). Whitespace is
 * normalised: runs of spaces collapse, every line break is kept as a single
 * paragraph break, and the result is trimmed. Curly quotation marks are
 * left untouched.
 */
export function detectPinpointsInPassage(text: string): PassagePinpointResult {
  const markers: string[] = [];
  const numbers: number[] = [];
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n");
  const outLines: string[] = [];

  const record = (marker: string, value: string): void => {
    markers.push(marker);
    numbers.push(Number(value));
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].replace(/[ \t\u00a0]+/g, " ").trim();
    if (line.length === 0) continue;

    // A number alone on its line, followed by a prose line.
    const lone = LONE_NUMBER_RE.exec(line);
    if (lone && !looksLikeYear(lone[1])) {
      const next = rawLines.slice(i + 1).find((l) => l.trim().length > 0);
      if (next !== undefined && looksLikeProse(next)) {
        record(line, lone[1]);
        continue;
      }
    }

    // A number opening the line with prose after it.
    const leading = LEADING_NUMBER_RE.exec(line);
    if (leading && !looksLikeYear(leading[1]) && looksLikeProse(leading[2])) {
      record(line.slice(0, line.length - leading[2].length).trim(), leading[1]);
      line = leading[2].trim();
    }

    // Bracketed markers anywhere in the line, including `at [42]`.
    line = line.replace(
      BRACKETED_RE,
      (match, lead: string, at: string | undefined, value: string) => {
        if (looksLikeYear(value)) return match;
        record(`${at ? "at " : ""}[${value}]`, value);
        return lead;
      }
    );

    line = line
      .replace(/[ \t]+/g, " ")
      .replace(/\s+([.,;:])/g, "$1")
      .trim();
    if (line.length > 0) outLines.push(line);
  }

  const cleaned = outLines.join("\n");
  if (numbers.length === 0) return { cleaned, markers };

  // Consecutive run starting at the first marker (duplicates of the same
  // number, e.g. "[42]" then "at [42]", do not break the run).
  let last = numbers[0];
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === last) continue;
    if (numbers[i] === last + 1) {
      last = numbers[i];
      continue;
    }
    break;
  }
  const value = last === numbers[0] ? String(numbers[0]) : `${numbers[0]}–${last}`;
  return { cleaned, pinpoint: { type: "paragraph", value }, markers };
}

/**
 * Estimated number of typeset lines a passage will occupy: the sum over
 * paragraphs of ceil(length / charsPerLine), each paragraph counting at
 * least one line. Used for the Rule 1.5.1 three-line decision.
 */
export function quotationLineCount(text: string, charsPerLine = 90): number {
  const perLine = Math.max(1, Math.floor(charsPerLine));
  return text
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .reduce((sum, p) => sum + Math.max(1, Math.ceil(p.length / perLine)), 0);
}

/**
 * Renders a paragraph pinpoint value with the square brackets AGLC4
 * Rule 1.1.6 requires, bracketing each end of a span separately
 * ("42–44" → "[42]–[44]", cf Rule 1.1.7). Values already bracketed are
 * returned unchanged.
 */
export function bracketParagraphValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.includes("[")) return trimmed;
  return trimmed
    .split(/\s*[–-]\s*/)
    .map((part) => `[${part}]`)
    .join("–");
}
