/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { quotationLineCount } from "./pinpoint";

/**
 * ENP-010 / QUOTE-001: the one place that decides how a quotation's
 * boundary marks are treated.
 *
 * AGLC4 Rule 1.5.1: short quotations (of three lines or fewer) are
 * incorporated in the text within single quotation marks; long quotations
 * (of three or more full lines) appear indented from the left margin, in a
 * smaller font, without quotation marks. The block form is therefore chosen
 * when the estimated line count reaches three, or when the caller forces it
 * (a multi-paragraph selection).
 */

export type QuotationMode = "block" | "inline";

export interface ApplyQuotationOptions {
  /** Treat the passage as a long quotation regardless of its length. */
  forceBlock?: boolean;
  /** Characters per typeset line used for the line estimate (default 90). */
  charsPerLine?: number;
}

export interface QuotationDecision {
  mode: QuotationMode;
  text: string;
}

const OPENING_MARKS = "‘“'\"";
const CLOSING_MARKS = "’”'\"";

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

/**
 * Decides block versus inline for a passage and returns the text with its
 * boundary marks adjusted: a block quotation loses a single pair of
 * boundary quotation marks; an inline quotation is wrapped in ‘ ’ (any
 * existing boundary marks — straight or double — are normalised to the
 * single curly pair).
 */
export function applyQuotationToText(
  text: string,
  opts: ApplyQuotationOptions = {}
): QuotationDecision {
  const stripped = stripBoundaryQuotes(text);
  const isBlock = opts.forceBlock === true || quotationLineCount(text, opts.charsPerLine) >= 3;
  if (isBlock) return { mode: "block", text: stripped };
  return { mode: "inline", text: `‘${stripped}’` };
}
