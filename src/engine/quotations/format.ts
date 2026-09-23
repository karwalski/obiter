/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { CitationConfig } from "../standards/types";
import { quotationLineCount } from "./pinpoint";

/**
 * ENP-010 / QUOTE-001 / STD-016: the one place that decides how a
 * quotation's boundary marks are treated.
 *
 * AGLC4 Rule 1.5.1: short quotations (of three lines or less) are
 * incorporated in the text within single quotation marks; long quotations
 * (of four lines or more) appear indented from the left margin, in a
 * smaller font, without quotation marks. A quotation within a short
 * quotation takes double marks; within a long quotation, single marks.
 *
 * OSCOLA 5 §1.5 (docs/standards-rule-notes.md): single inverted commas,
 * double for quotations within quotations; up to three lines run in the
 * text; longer than three lines indented without marks, inner quotations
 * then single.
 *
 * NZLSG 3 §1.2.2(a)–(b): fewer than 30 words run in the text in double
 * quotation marks; 30 words or more indented without marks; a short
 * quotation inside a short one takes single marks, inside a long
 * (unmarked) one double marks.
 *
 * The block form is therefore chosen when the standard's threshold is
 * reached (`config.blockQuoteThreshold`: lines for AGLC and OSCOLA, words
 * for NZLSG; four lines with no config), or when the caller forces it (a
 * multi-paragraph selection).
 */

export type QuotationMode = "block" | "inline";

export interface ApplyQuotationOptions {
  /** Treat the passage as a long quotation regardless of its length. */
  forceBlock?: boolean;
  /** Characters per typeset line used for the line estimate (default 90). */
  charsPerLine?: number;
  /**
   * STD-016: the document config. Supplies the outer marks
   * (`quotationMarkStyle`) and the block threshold (`blockQuoteThreshold`).
   * Absent means AGLC4: single marks, four or more lines.
   */
  config?: CitationConfig;
}

export interface QuotationDecision {
  mode: QuotationMode;
  text: string;
}

const OPENING_MARKS = "‘“'\"";
const CLOSING_MARKS = "’”'\"";

/** AGLC4 r 1.5.1 / OSCOLA 5 §1.5: four or more lines is a long quotation. */
const DEFAULT_BLOCK_LINES = 4;

/**
 * Removes at most one boundary quotation mark from each requested end of
 * the text (‘ ’ ' " “ ”). Whitespace inside the marks is trimmed away.
 */
export function stripBoundaryQuotes(
  text: string,
  edges: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: true }
): string {
  let result = text.trim();
  if (edges.leading !== false && result.length > 0 && OPENING_MARKS.includes(result[0])) {
    result = result.slice(1).trimStart();
  }
  if (
    edges.trailing !== false &&
    result.length > 0 &&
    CLOSING_MARKS.includes(result[result.length - 1])
  ) {
    result = result.slice(0, -1).trimEnd();
  }
  return result;
}

/** Words in a passage (whitespace-separated tokens). */
function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Whether the passage is a long quotation under the config's threshold:
 * the word count where the standard counts words (NZLSG 3 §1.2.2), else
 * the estimated line count (AGLC4 r 1.5.1, OSCOLA 5 §1.5).
 */
function isLongQuotation(text: string, opts: ApplyQuotationOptions): boolean {
  const threshold = opts.config?.blockQuoteThreshold;
  if (threshold?.words !== undefined) {
    return wordCount(text) >= threshold.words;
  }
  return quotationLineCount(text, opts.charsPerLine) >= (threshold?.lines ?? DEFAULT_BLOCK_LINES);
}

/**
 * Converts the curly quotation marks within a passage to the style nested
 * inside `outer` (AGLC4 r 1.5.1, OSCOLA 5 §1.5, NZLSG 3 §1.2.2(b)): inside
 * single outer marks inner quotations take double marks; inside double
 * outer marks (or an unmarked long quotation under AGLC/OSCOLA) they take
 * single marks. Only paired ‘ ’ are converted — a ’ with no open ‘ before
 * it is an apostrophe and stays. Straight marks are left alone.
 */
export function nestQuotationMarks(text: string, outer: "single" | "double"): string {
  if (outer === "single") {
    let depth = 0;
    let out = "";
    for (const ch of text) {
      if (ch === "‘") {
        depth += 1;
        out += "“";
      } else if (ch === "’" && depth > 0) {
        depth -= 1;
        out += "”";
      } else {
        out += ch;
      }
    }
    return out;
  }
  return text.replace(/“/g, "‘").replace(/”/g, "’");
}

/**
 * True when one pair of curly marks encloses the whole passage (`‘Nested’`
 * after a boundary pair has been stripped). Such a pair is a further
 * boundary pair, not a quotation within the quotation: the contract is
 * that only one boundary pair is removed and the rest is left as typed.
 */
function isWhollyQuoted(text: string): boolean {
  if (text.length < 2 || !"‘“".includes(text[0])) return false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "‘" || ch === "“") depth += 1;
    else if ((ch === "’" || ch === "”") && depth > 0) {
      depth -= 1;
      if (depth === 0) return i === text.length - 1;
    }
  }
  return false;
}

/**
 * Decides block versus inline for a passage and returns the text with its
 * boundary marks adjusted: a block quotation loses a single pair of
 * boundary quotation marks and its inner quotations take the marks the
 * standard nests inside an unmarked passage; an inline quotation is
 * wrapped in the standard's marks (‘ ’ under AGLC4 and OSCOLA, “ ” under
 * NZLSG — any existing boundary marks, straight or otherwise, are
 * normalised to that pair) with its inner quotations in the other style.
 */
export function applyQuotationToText(
  text: string,
  opts: ApplyQuotationOptions = {}
): QuotationDecision {
  const stripped = stripBoundaryQuotes(text);
  const outer = opts.config?.quotationMarkStyle ?? "single";
  const isBlock = opts.forceBlock === true || isLongQuotation(text, opts);
  const nest = (passage: string, style: "single" | "double"): string =>
    isWhollyQuoted(passage) ? passage : nestQuotationMarks(passage, style);
  if (isBlock) {
    // Long quotation: no outer marks; AGLC4/OSCOLA inner marks single,
    // NZLSG inner marks double — the opposite of the inline nesting.
    return { mode: "block", text: nest(stripped, outer === "single" ? "double" : "single") };
  }
  const inner = nest(stripped, outer);
  return outer === "double"
    ? { mode: "inline", text: `“${inner}”` }
    : { mode: "inline", text: `‘${inner}’` };
}
