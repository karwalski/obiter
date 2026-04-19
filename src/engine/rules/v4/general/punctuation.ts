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
 * Scans text for dash and hyphen issues.
 *
 * Checks for:
 * 1. Double hyphens (`--`) that should be em-dashes or en-dashes
 * 2. Spaces around em-dashes (em-dashes should have no surrounding spaces)
 * 3. Hyphens used in number/date spans that should be en-dashes
 *
 * @remarks AGLC4 Rule 1.6.3 — Dashes and hyphens.
 */
export function checkDashes(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Double hyphens → suggest em-dash or en-dash
  const doubleHyphenRegex = /--/g;
  let match: RegExpExecArray | null;
  while ((match = doubleHyphenRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.6.3",
      message: "Double hyphen should be an em-dash (\u2014) or en-dash (\u2013)",
      severity: "warning",
      offset: match.index,
      length: 2,
      suggestion: "\u2014",
    });
  }

  // 2. Spaces around em-dashes
  // Match: space(s) before em-dash, space(s) after em-dash, or both
  const spacedEmDashRegex = /\s+\u2014\s+|\s+\u2014|\u2014\s+/g;
  while ((match = spacedEmDashRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.6.3",
      message: "Em-dashes should not have surrounding spaces",
      severity: "warning",
      offset: match.index,
      length: match[0].length,
      suggestion: "\u2014",
    });
  }

  // 3. Hyphens in number/date spans → suggest en-dash
  // Matches patterns like 42-5, 1986-87, pp 1-10, 100-200
  const numberSpanRegex = /(?<=\d)-(?=\d)/g;
  while ((match = numberSpanRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.6.3",
      message: "Hyphens in number or date spans should be en-dashes (\u2013)",
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: "\u2013",
    });
  }

  return issues;
}

/**
 * Auto-corrects dash and hyphen issues.
 *
 * - Replaces `--` with em-dash (`\u2014`)
 * - Removes spaces around em-dashes
 * - Replaces hyphens in number spans with en-dashes (`\u2013`)
 *
 * @remarks AGLC4 Rule 1.6.3 — Dashes and hyphens.
 */
export function fixDashes(text: string): string {
  let result = text;

  // 1. Replace double hyphens with em-dash
  result = result.replace(/--/g, "\u2014");

  // 2. Remove spaces around em-dashes
  result = result.replace(/\s*\u2014\s*/g, "\u2014");

  // 3. Replace hyphens in number spans with en-dashes
  result = result.replace(/(?<=\d)-(?=\d)/g, "\u2013");

  return result;
}
