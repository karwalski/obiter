/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { ValidationIssue } from "../../../types/validation";

const WORDS = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
];

/**
 * Converts a number 1–9 to its English word form. Returns the numeral as a
 * string for numbers 10 and above.
 *
 * @remarks AGLC4 Rule 1.10.1: "Numbers from one to nine should be written as
 * words. Numbers of 10 or above should be written as numerals."
 */
export function numberToWords(n: number): string {
  if (n >= 1 && n <= 9) {
    return WORDS[n];
  }
  return String(n);
}

/**
 * Formats a number per AGLC4 — no comma separators.
 *
 * @remarks AGLC4 Rule 1.10.1: Numbers should not use comma separators
 * (e.g. `10000` not `10,000`).
 */
export function formatNumber(n: number): string {
  return String(n);
}

/**
 * Scans body text for number-formatting issues per AGLC4 Rule 1.10.1.
 *
 * Detects:
 * 1. Standalone numerals 1–9 that should be written as words.
 * 2. Comma-separated numbers (e.g. `1,000`) that should omit the comma.
 *
 * @remarks AGLC4 Rule 1.10.1
 */
export function checkNumberFormatting(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Detect comma-separated numbers (e.g. 1,000 or 10,000,000)
  const commaNumberRegex = /\b(\d{1,3}(?:,\d{3})+)\b/g;
  let match: RegExpExecArray | null;

  while ((match = commaNumberRegex.exec(text)) !== null) {
    const raw = match[1];
    const withoutCommas = raw.replace(/,/g, "");
    issues.push({
      ruleNumber: "1.10.1",
      message: `Number "${raw}" should not use comma separators`,
      severity: "warning",
      offset: match.index,
      length: raw.length,
      suggestion: withoutCommas,
    });
  }

  // Detect standalone numerals 1–9 that should be words.
  // Use word boundaries; avoid matching digits inside larger numbers or
  // comma-separated numbers already flagged above.
  const standaloneDigitRegex = /(?<!\d[,.])\b([1-9])\b(?![,.]?\d)/g;

  while ((match = standaloneDigitRegex.exec(text)) !== null) {
    const digit = Number(match[1]);
    issues.push({
      ruleNumber: "1.10.1",
      message: `Numeral "${match[1]}" should be written as a word`,
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: numberToWords(digit),
    });
  }

  return issues;
}
