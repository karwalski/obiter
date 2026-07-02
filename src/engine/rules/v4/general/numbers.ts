/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { ValidationIssue } from "../../../types/validation";

const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/**
 * Converts a number 1–9 to its English word form. Returns the numeral as a
 * string for numbers 10 and above.
 *
 * @remarks AGLC4 Rule 1.10.1: "Numbers under 10 should be written in words.
 * Numerals should be used for … numbers over nine."
 */
export function numberToWords(n: number): string {
  if (n >= 1 && n <= 9) {
    return WORDS[n];
  }
  return String(n);
}

/**
 * Formats a number per AGLC4 Rule 1.10.1 — numbers of four or more digits
 * take a comma separating each group of three digits (eg `4,150`).
 *
 * @remarks AGLC4 Rule 1.10.1: "In numbers of four digits or more, a comma
 * should be used to separate each group of three digits." The rule's
 * exceptions (years, page numbers, paragraph numbers, and identification
 * numbers) are citation elements formatted by their own rule modules, which
 * emit plain digit strings and do not call this function.
 */
export function formatNumber(n: number): string {
  const negative = n < 0;
  const digits = String(Math.abs(n));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `-${grouped}` : grouped;
}

/**
 * Formats a span of numbers with the second number shortened to the
 * minimum digits necessary, joined by an en-dash.
 *
 * @remarks AGLC4 Rule 1.10.1: in a span, "only the minimum number of
 * digits necessary should be included in the second number (eg '87–8',
 * '436–62')", but where the second number's last two digits are between
 * 10 and 19, both digits are always kept (eg '11–14', '215–19'). Also
 * used for pinpoint spans under Rule 1.1.7 (paragraph spans excepted —
 * those keep both numbers in full).
 */
export function formatNumberSpan(start: number, end: number): string {
  const EN_DASH = "–";
  const startStr = String(start);
  const endStr = String(end);

  // Only shorten when both are positive, the end is larger, and the two
  // numbers have the same digit count.
  if (start <= 0 || end <= start || startStr.length !== endStr.length) {
    return `${startStr}${EN_DASH}${endStr}`;
  }

  // Find the shared prefix length.
  let shared = 0;
  while (shared < startStr.length - 1 && startStr[shared] === endStr[shared]) {
    shared++;
  }

  let suffix = endStr.slice(shared);

  // Keep both of the last two digits where they fall between 10 and 19.
  const lastTwo = Number(endStr.slice(-2));
  if (lastTwo >= 10 && lastTwo <= 19 && suffix.length < 2) {
    suffix = endStr.slice(-2);
  }

  return `${startStr}${EN_DASH}${suffix}`;
}

/**
 * Pinpoint/citation-element markers preceding a number, per Rule 1.10.1's
 * numeral contexts ("numbers of sections, pages, paragraphs, clauses,
 * editions and other elements of citations").
 */
const CITATION_MARKER_BEFORE =
  /(?:\b(?:s|ss|pt|pts|ch|chs|cl|cls|div|divs|sch|schs|art|arts|reg|regs|r|rr|ord|n|nn|no|nos|para|paras|p|pp|pg|vol|ed|at|item|items|sub-s|sub-ss|sub-cl|sub-cls|sub-div|sub-divs|sub-para|sub-paras)\s|[[¶§(])$/i;

/**
 * Scans body text for number-formatting issues per AGLC4 Rule 1.10.1.
 *
 * Detects:
 * 1. Numbers of four or more digits missing their comma grouping
 *    (eg `10000` → `10,000`). The rule's exception classes are skipped:
 *    years (four-digit values 1000–2999, including citation years), page,
 *    paragraph and other pinpoint numbers (bracketed values or values after
 *    a pinpoint marker such as `s`, `pt`, `at`), and identification/serial
 *    numbers (values after `No`, `ACN`, `ABN`, `¶`, or adjacent to
 *    hyphens/slashes).
 * 2. Standalone numerals 1–9 that should be written as words — except in
 *    the rule's numeral contexts: citation elements, ratios, percentages,
 *    decimals, and series/spans of numbers.
 *
 * @remarks AGLC4 Rule 1.10.1 (PDF pp 54–5); the rule's own example is
 * `4,150`.
 */
export function checkNumberFormatting(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Detect 4+-digit numbers missing comma grouping (eg 10000).
  const ungroupedRegex = /\d+/g;
  let match: RegExpExecArray | null;

  while ((match = ungroupedRegex.exec(text)) !== null) {
    const raw = match[0];
    if (raw.length < 4) continue;

    const before = text.slice(0, match.index);
    const prevChar = text[match.index - 1] ?? "";
    const nextChar = text[match.index + raw.length] ?? "";

    // Part of a larger token (identifier, decimal, comma-grouped number,
    // span): skip when adjacent to digits, commas, hyphens, en-dashes,
    // slashes, colons, or decimal points.
    if (/[\d,.\-–/:]/.test(prevChar) || /[\d,.\-–/:]/.test(nextChar)) continue;

    // Years (Rule 1.10.1 exception): four-digit numbers 1000–2999.
    const value = Number(raw);
    if (raw.length === 4 && value >= 1000 && value <= 2999) continue;

    // Paragraph pinpoints and identification numbers: inside [ ], or after
    // ¶ / § / No / ACN / ABN / ISBN / ISSN (Rule 1.10.1 exceptions).
    if (/[[¶§]\s*$/.test(before)) continue;
    if (/\b(?:no|nos|acn|abn|isbn|issn)\s*:?\s*$/i.test(before)) continue;

    // Page and other pinpoint numbers: after a citation-element marker.
    if (CITATION_MARKER_BEFORE.test(before)) continue;

    issues.push({
      ruleNumber: "1.10.1",
      message: `Number "${raw}" of four or more digits should use comma separators (eg "${formatNumber(value)}")`,
      severity: "warning",
      offset: match.index,
      length: raw.length,
      suggestion: formatNumber(value),
    });
  }

  // 2. Detect standalone numerals 1–9 that should be words.
  const standaloneDigitRegex = /\b[1-9]\b/g;

  while ((match = standaloneDigitRegex.exec(text)) !== null) {
    const digit = Number(match[0]);
    const before = text.slice(0, match.index);
    const prevChar = text[match.index - 1] ?? "";
    const nextChar = text[match.index + 1] ?? "";
    const nextTwo = text.slice(match.index + 1, match.index + 3);

    // Part of a larger number, decimal, ratio, percentage, span, currency
    // amount, or identifier (Rule 1.10.1 numeral contexts).
    if (/[\d,.\-–/:%$€£¥#([]/.test(prevChar)) continue;
    if (/[\d,.\-–/:%]/.test(nextChar)) continue;

    // Ordinal suffixes ("2nd") — ordinals follow the same word/numeral rules.
    if (/^(?:st|nd|rd|th)/i.test(nextTwo)) continue;

    // Citation elements: preceded by a pinpoint/element marker or ¶/§/[/(.
    if (CITATION_MARKER_BEFORE.test(before)) continue;

    // Citation elements: judgment/report numbers after an all-caps
    // identifier (eg '[2019] HCA 3', '238 CLR 1').
    if (/\b[A-Z]{2,}\S*\s$/.test(before)) continue;

    // Series of related numbers (Rule 1.10.1: numerals for a series), eg
    // "3, 5 and 7": keep numerals when this digit continues a number list.
    if (/\d\s*(?:,|and|or|to)\s*$/i.test(before)) continue;

    issues.push({
      ruleNumber: "1.10.1",
      message: `Numeral "${match[0]}" should be written as a word`,
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: numberToWords(digit),
    });
  }

  return issues;
}
