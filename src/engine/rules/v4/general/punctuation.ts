/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Shared validation result type for punctuation rule checks.
 */
export interface ValidationIssue {
  ruleNumber: string;
  message: string;
  severity: "error" | "warning" | "info";
  offset: number;
  length: number;
  suggestion?: string;
}

/**
 * Abbreviations that should not contain full stops per AGLC4 Rule 1.6.1.
 * Maps the dotted form (regex-safe) to the corrected form.
 */
const DOTTED_ABBREVIATIONS: ReadonlyArray<{ pattern: RegExp; dotted: string; clean: string }> = [
  { pattern: /\be\.g\./g, dotted: "e.g.", clean: "eg" },
  { pattern: /\bi\.e\./g, dotted: "i.e.", clean: "ie" },
  { pattern: /\bv\./g, dotted: "v.", clean: "v" },
  { pattern: /\bPty\./g, dotted: "Pty.", clean: "Pty" },
  { pattern: /\bLtd\./g, dotted: "Ltd.", clean: "Ltd" },
  { pattern: /\bCo\./g, dotted: "Co.", clean: "Co" },
  { pattern: /\bInc\./g, dotted: "Inc.", clean: "Inc" },
  { pattern: /\bDr\./g, dotted: "Dr.", clean: "Dr" },
  { pattern: /\bMr\./g, dotted: "Mr.", clean: "Mr" },
  { pattern: /\bMrs\./g, dotted: "Mrs.", clean: "Mrs" },
  { pattern: /\bMs\./g, dotted: "Ms.", clean: "Ms" },
  { pattern: /\bNo\./g, dotted: "No.", clean: "No" },
  { pattern: /\bVol\./g, dotted: "Vol.", clean: "Vol" },
  { pattern: /\bEd\./g, dotted: "Ed.", clean: "Ed" },
];

/**
 * Scans text for abbreviations that incorrectly contain full stops.
 *
 * @remarks AGLC4 Rule 1.6.1 — Full stops should not be used in abbreviations.
 */
export function checkAbbreviationFullStops(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const abbr of DOTTED_ABBREVIATIONS) {
    // Reset lastIndex for each call since the regex has the global flag
    const regex = new RegExp(abbr.pattern.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "1.6.1",
        message: `Abbreviation '${abbr.dotted}' should not contain full stops`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
        suggestion: abbr.clean,
      });
    }
  }

  return issues;
}

/**
 * Auto-corrects abbreviations by removing full stops per AGLC4 Rule 1.6.1.
 *
 * @remarks AGLC4 Rule 1.6.1 — Full stops should not be used in abbreviations.
 */
export function fixAbbreviationFullStops(text: string): string {
  let result = text;
  for (const abbr of DOTTED_ABBREVIATIONS) {
    result = result.replace(new RegExp(abbr.pattern.source, "g"), abbr.clean);
  }
  return result;
}

/**
 * Returns true when a digit-hyphen-digit sequence at `hyphenIndex` is a
 * plausible numeric span (rather than an identifier such as a CCH looseleaf
 * pinpoint, session-law number, docket number, ISBN or phone number).
 *
 * A span is plausible only when:
 * - the second number has no leading zero (leading zeros mark identifiers,
 *   eg the guide's own CCH pinpoint `¶82-091` under Rule 1.10.1);
 * - the sequence is not preceded by `¶`, `§`, or a `No`/`Pub L No`-style
 *   identifier marker;
 * - the sequence is not part of a longer hyphenated chain (eg ISBNs,
 *   phone numbers);
 * - the second number, expanded per the Rule 1.10.1 span-shortening
 *   convention where it has fewer digits (eg `42-5` → 45; `1986-87` →
 *   1987), is greater than the first.
 *
 * @remarks AGLC4 Rules 1.6.3, 1.1.7 — en-dashes join spans between two
 * numbers; document identifiers keep their printed form (cf Rule 1.6.1).
 */
function isPlausibleNumberSpan(text: string, hyphenIndex: number): boolean {
  // Extract the full number on each side of the hyphen.
  let start = hyphenIndex;
  while (start > 0 && /\d/.test(text[start - 1])) start--;
  let end = hyphenIndex + 1;
  while (end < text.length && /\d/.test(text[end])) end++;

  const first = text.slice(start, hyphenIndex);
  const second = text.slice(hyphenIndex + 1, end);
  if (first.length === 0 || second.length === 0) return false;

  // Part of a longer hyphenated chain (ISBN, phone number, docket number).
  if (text[start - 1] === "-" || text[end] === "-") return false;

  // Leading zero in the second number marks an identifier, not a span.
  if (second.length > 1 && second.startsWith("0")) return false;

  // Identifier markers before the first number: ¶, §, 'No'/'Nos'.
  const before = text.slice(0, start);
  if (/[¶§]\s*$/.test(before)) return false;
  if (/\bNos?\s*$/.test(before)) return false;

  // Expand a shortened second number (Rule 1.10.1) and require an
  // ascending range.
  const firstNum = Number(first);
  const expandedSecond =
    second.length < first.length
      ? Number(first.slice(0, first.length - second.length) + second)
      : Number(second);
  return expandedSecond > firstNum;
}

/**
 * Scans text for dash and hyphen issues.
 *
 * Checks for:
 * 1. Double hyphens (`--`) that should be em-dashes (or en-dashes between
 *    digits)
 * 2. Hyphens used in plausible number/date spans that should be en-dashes
 *
 * Em-dash spacing is NOT checked: Rule 1.6.3 says nothing about spacing,
 * and the guide's own Rule 1.8.2 example uses spaced em-dashes
 * ('provision — s 39(1) — of'). See docs/decisions.md DECISION-013.
 *
 * Identifier patterns (CCH `¶82-091` pinpoints, `Pub L No 108-201`,
 * docket numbers, ISBNs) are not flagged — see `isPlausibleNumberSpan`.
 *
 * @remarks AGLC4 Rule 1.6.3 — em-dashes, en-dashes, hyphens and slashes.
 */
export function checkDashes(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Double hyphens → suggest en-dash between digits, em-dash otherwise
  const doubleHyphenRegex = /--/g;
  let match: RegExpExecArray | null;
  while ((match = doubleHyphenRegex.exec(text)) !== null) {
    const betweenDigits =
      /\d/.test(text[match.index - 1] ?? "") && /\d/.test(text[match.index + 2] ?? "");
    issues.push({
      ruleNumber: "1.6.3",
      message: betweenDigits
        ? "Double hyphen in a number span should be an en-dash (–)"
        : "Double hyphen should be an em-dash (—) or en-dash (–)",
      severity: "warning",
      offset: match.index,
      length: 2,
      suggestion: betweenDigits ? "–" : "—",
    });
  }

  // 2. Hyphens in plausible number/date spans → suggest en-dash
  // Matches patterns like 42-5, 1986-87, pp 1-10, 100-200; skips
  // identifiers like ¶82-091 or Pub L No 108-201.
  const numberSpanRegex = /(?<=\d)-(?=\d)/g;
  while ((match = numberSpanRegex.exec(text)) !== null) {
    if (!isPlausibleNumberSpan(text, match.index)) continue;
    issues.push({
      ruleNumber: "1.6.3",
      message: "Hyphens in number or date spans should be en-dashes (–)",
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: "–",
    });
  }

  return issues;
}

/**
 * Auto-corrects dash and hyphen issues.
 *
 * - Replaces `--` with an em-dash (`—`), or an en-dash (`–`)
 *   between digits
 * - Replaces hyphens in plausible number spans with en-dashes (`–`);
 *   identifiers (CCH `¶82-091`, `Pub L No 108-201`, ISBNs, docket and
 *   phone numbers) keep their printed hyphens
 *
 * Em-dash spacing is left untouched (DECISION-013): the rule band says
 * nothing about spacing and the guide's own examples use spaced em-dashes.
 *
 * @remarks AGLC4 Rule 1.6.3 — em-dashes, en-dashes, hyphens and slashes.
 */
export function fixDashes(text: string): string {
  let result = text;

  // 1. Replace double hyphens: en-dash between digits, em-dash otherwise
  result = result.replace(/(?<=\d)--(?=\d)/g, "–");
  result = result.replace(/--/g, "—");

  // 2. Replace hyphens in plausible number spans with en-dashes
  result = result.replace(/(?<=\d)-(?=\d)/g, (hyphen: string, offset: number, whole: string) =>
    isPlausibleNumberSpan(whole, offset) ? "–" : hyphen
  );

  return result;
}
