/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { ValidationIssue } from "./types/validation";
import { Citation } from "../types/citation";
import { checkAbbreviationFullStops, checkDashes } from "./rules/v4/general/punctuation";
import { checkDateFormatting } from "./rules/v4/general/dates";
import { checkNumberFormatting } from "./rules/v4/general/numbers";

// Re-export for consumers
export type { ValidationIssue } from "./types/validation";

/**
 * Aggregated validation result for an entire document.
 */
export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
}

// ─── VALID-001: Document-wide orchestration ──────────────────────────────────

/**
 * Validates an entire document by running all AGLC4 checks across footnotes
 * and citations, then categorises issues by severity.
 *
 * @remarks Orchestrates Rules 1.1.3, 1.1.4, 1.4.3, 1.6.1, 1.6.3, 1.10.1,
 * 1.11.1, and completeness checks for major source types.
 */
export function validateDocument(
  footnoteTexts: string[],
  citations: Citation[],
  bodyText?: string,
): ValidationResult {
  const allIssues: ValidationIssue[] = [];

  // Footnote-level checks
  for (let i = 0; i < footnoteTexts.length; i++) {
    allIssues.push(...checkFootnoteFormat(footnoteTexts[i], i));
    allIssues.push(...checkTypography(footnoteTexts[i]));
    allIssues.push(...checkDatesAndNumbers(footnoteTexts[i]));
  }

  // Cross-footnote checks
  allIssues.push(...checkIbidCorrectness(footnoteTexts));
  allIssues.push(...checkCrossReferences(footnoteTexts));

  // Body text checks (Rule 1.1.2: footnote number position)
  if (bodyText) {
    allIssues.push(...checkFootnoteNumberPosition(bodyText));
  }

  // Citation completeness checks
  for (const citation of citations) {
    allIssues.push(...checkCitationCompleteness(citation));
  }

  // Categorise by severity
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];

  for (const issue of allIssues) {
    switch (issue.severity) {
      case "error":
        errors.push(issue);
        break;
      case "warning":
        warnings.push(issue);
        break;
      case "info":
        info.push(issue);
        break;
    }
  }

  return { errors, warnings, info };
}

// ─── VALID-006: Footnote number position checks ──────────────────────────────

/**
 * Checks body text for footnote reference numbers placed before punctuation.
 *
 * Per AGLC4 Rule 1.1.2, footnote reference numbers should appear AFTER
 * punctuation at the end of a sentence. This is a heuristic check that
 * scans body text for patterns where a digit (likely a footnote marker)
 * immediately precedes sentence-ending punctuation.
 *
 * The pattern flags sequences like `held1.` or `court2,` where a word
 * character is followed by a number (1-999) and then punctuation, which
 * suggests a misplaced footnote marker. Results are reported as "info"
 * severity since this is inherently heuristic — we cannot distinguish
 * footnote markers from regular numbers in plain text.
 *
 * @remarks AGLC4 Rule 1.1.2 — "Footnote reference numbers are placed
 * after punctuation."
 */
export function checkFootnoteNumberPosition(bodyText: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!bodyText || bodyText.trim().length === 0) {
    return issues;
  }

  // Match a word character followed by a number (1-999) immediately followed
  // by sentence-ending punctuation (. , ; :). This heuristic catches patterns
  // like "held1." which should be "held.1"
  const pattern = /([a-zA-Z])(\d{1,3})([.,;:])/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(bodyText)) !== null) {
    const num = Number(match[2]);
    // Only flag numbers in the typical footnote range (1-999)
    if (num < 1 || num > 999) {
      continue;
    }

    // The offset points to the start of the digit(s) before the punctuation
    const digitOffset = match.index + match[1].length;

    issues.push({
      ruleNumber: "1.1.2",
      message: `Possible footnote number ${match[2]} placed before '${match[3]}' — footnote markers should appear after punctuation`,
      severity: "info",
      offset: digitOffset,
      length: match[2].length + match[3].length,
      suggestion: `${match[3]}${match[2]}`,
    });
  }

  return issues;
}

// ─── VALID-002: Footnote structure checks ────────────────────────────────────

/**
 * Checks a single footnote for structural formatting issues.
 *
 * Flags:
 * 1. Missing closing punctuation — every footnote must end with a full stop
 *    (Rule 1.1.4).
 * 2. Use of `and` between sources instead of `;` — multiple sources in a
 *    single footnote are separated by semicolons (Rule 1.1.3).
 *
 * @remarks AGLC4 Rule 1.1.3 — "Where more than one source is cited in a
 * single footnote, each source should be separated by a semicolon."
 * @remarks AGLC4 Rule 1.1.4 — "Each footnote should end with a full stop."
 */
export function checkFootnoteFormat(
  footnoteText: string,
  footnoteIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  // Rule 1.1.4: Missing closing punctuation (full stop)
  if (!trimmed.endsWith(".")) {
    issues.push({
      ruleNumber: "1.1.4",
      message: `Footnote ${footnoteIndex + 1} does not end with a full stop`,
      severity: "error",
      offset: trimmed.length - 1,
      length: 1,
      suggestion: trimmed + ".",
    });
  }

  // Rule 1.1.3: "and" between sources instead of ";"
  // Look for patterns like ". See also X and Y." or source-like text joined by " and "
  // We detect " and " that appears between what look like separate citation references,
  // specifically after a semicolon-like boundary or between italic titles.
  // A pragmatic heuristic: flag standalone " and " surrounded by citation-like context.
  const andBetweenSourcesRegex = /;\s*[^;]+\band\b\s+[^;.]+(?=[.;])/gi;
  let match: RegExpExecArray | null;

  while ((match = andBetweenSourcesRegex.exec(trimmed)) !== null) {
    // Find the position of "and" within the match
    const andIdx = match[0].search(/\band\b/i);
    const absoluteOffset = match.index + andIdx;
    issues.push({
      ruleNumber: "1.1.3",
      message: `Footnote ${footnoteIndex + 1}: use ';' to separate sources, not 'and'`,
      severity: "warning",
      offset: absoluteOffset,
      length: 3,
      suggestion: ";",
    });
  }

  return issues;
}

/**
 * Checks for incorrect use of 'Ibid' across footnotes.
 *
 * 'Ibid' refers to the immediately preceding footnote. It must not be used
 * when the preceding footnote contains multiple sources (separated by ';'),
 * as the reference would be ambiguous.
 *
 * @remarks AGLC4 Rule 1.4.3 — "'Ibid' should not be used where the
 * preceding footnote contains more than one source."
 */
export function checkIbidCorrectness(footnoteTexts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 1; i < footnoteTexts.length; i++) {
    const current = footnoteTexts[i].trim();
    const previous = footnoteTexts[i - 1].trim();

    // Check if current footnote uses Ibid
    const ibidRegex = /\bIbid\b/gi;
    let match: RegExpExecArray | null;

    while ((match = ibidRegex.exec(current)) !== null) {
      // Check if the preceding footnote has multiple sources (contains ';')
      const hasSemicolon = previous.includes(";");
      if (hasSemicolon) {
        issues.push({
          ruleNumber: "1.4.3",
          message: `Footnote ${i + 1}: 'Ibid' should not be used when the preceding footnote contains multiple sources`,
          severity: "error",
          offset: match.index,
          length: match[0].length,
        });
      }
    }
  }

  return issues;
}

/**
 * Checks cross-references of the form `(n X)` to ensure footnote X exists.
 *
 * AGLC4 uses the notation `(n X)` to cross-reference footnote number X. This
 * function flags references where X exceeds the total footnote count.
 *
 * @remarks AGLC4 Rule 1.4 — Cross-referencing footnotes.
 */
export function checkCrossReferences(footnoteTexts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalFootnotes = footnoteTexts.length;

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    // Match (n X) where X is a number
    const crossRefRegex = /\(n\s+(\d+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = crossRefRegex.exec(text)) !== null) {
      const referencedFootnote = Number(match[1]);
      if (referencedFootnote > totalFootnotes || referencedFootnote < 1) {
        issues.push({
          ruleNumber: "1.4",
          message: `Footnote ${i + 1}: cross-reference '(n ${match[1]})' refers to non-existent footnote`,
          severity: "error",
          offset: match.index,
          length: match[0].length,
        });
      }
    }
  }

  return issues;
}

// ─── VALID-003: Typography checks ────────────────────────────────────────────

/**
 * Checks text for typographic issues per AGLC4.
 *
 * Delegates to existing abbreviation full-stop and dash checks, and
 * additionally flags straight quotes (`"` and `'`) that should be replaced
 * with curly equivalents (\u2018\u2019 / \u201C\u201D).
 *
 * @remarks AGLC4 Rules 1.6.1, 1.6.3, and general typographic conventions.
 */
export function checkTypography(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Delegate to existing punctuation checks
  issues.push(...checkAbbreviationFullStops(text));
  issues.push(...checkDashes(text));

  // Flag straight double quotes
  const straightDoubleQuoteRegex = /"/g;
  let match: RegExpExecArray | null;

  while ((match = straightDoubleQuoteRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.6",
      message: "Straight double quote should be replaced with a curly quote (\u201C or \u201D)",
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: "\u201C",
    });
  }

  // Flag straight single quotes (apostrophes)
  // Avoid matching within contractions that are already correct
  const straightSingleQuoteRegex = /'/g;

  while ((match = straightSingleQuoteRegex.exec(text)) !== null) {
    issues.push({
      ruleNumber: "1.6",
      message: "Straight single quote should be replaced with a curly quote (\u2018 or \u2019)",
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: "\u2018",
    });
  }

  return issues;
}

// ─── VALID-004: Date and number checks ───────────────────────────────────────

/**
 * Checks text for date and number formatting issues per AGLC4.
 *
 * Delegates to existing `checkDateFormatting` (Rule 1.11.1) and
 * `checkNumberFormatting` (Rule 1.10.1).
 *
 * @remarks AGLC4 Rules 1.10.1, 1.11.1
 */
export function checkDatesAndNumbers(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...checkDateFormatting(text));
  issues.push(...checkNumberFormatting(text));

  return issues;
}

// ─── VALID-005: Citation completeness checks ─────────────────────────────────

/**
 * Required fields per major source type category.
 *
 * Each entry maps a source type prefix (or exact type) to the data fields
 * that must be present for the citation to be considered complete.
 */
const REQUIRED_FIELDS: ReadonlyArray<{
  match: (sourceType: string) => boolean;
  label: string;
  fields: string[];
}> = [
  {
    match: (st) => st.startsWith("case."),
    label: "Case",
    fields: ["party1", "year", "reportSeries"],
  },
  {
    match: (st) => st.startsWith("legislation."),
    label: "Legislation",
    fields: ["title", "year", "jurisdiction"],
  },
  {
    match: (st) => st.startsWith("journal."),
    label: "Journal article",
    fields: ["author", "title", "year", "journal"],
  },
  {
    match: (st) => st.startsWith("book"),
    label: "Book",
    fields: ["author", "title", "publisher", "year"],
  },
  {
    match: (st) => st === "treaty",
    label: "Treaty",
    fields: ["title", "treatySeries"],
  },
];

/**
 * Checks that a citation record has all mandatory fields for its source type.
 *
 * Required fields per major source type category:
 * - **Case** (`case.*`): party1, year, reportSeries (Rules 2.2–2.3)
 * - **Legislation** (`legislation.*`): title, year, jurisdiction (Rule 3.1)
 * - **Journal** (`journal.*`): author, title, year, journal (Rule 5)
 * - **Book** (`book*`): author, title, publisher, year (Rule 6)
 * - **Treaty** (`treaty`): title, treatySeries (Rule 8)
 *
 * @remarks AGLC4 Rules 2.2, 3.1, 5, 6, 8 — mandatory citation elements.
 */
export function checkCitationCompleteness(citation: Citation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const rule = REQUIRED_FIELDS.find((r) => r.match(citation.sourceType));
  if (!rule) {
    return issues;
  }

  for (const field of rule.fields) {
    const value = citation.data[field];
    const isMissing =
      value === undefined ||
      value === null ||
      value === "" ||
      (typeof value === "string" && value.trim() === "");

    if (isMissing) {
      issues.push({
        ruleNumber: getRuleForSourceType(citation.sourceType),
        message: `${rule.label} citation '${citation.shortTitle || citation.id}' is missing required field '${field}'`,
        severity: "error",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}

/**
 * Returns the primary AGLC4 rule number for a given source type.
 */
function getRuleForSourceType(sourceType: string): string {
  if (sourceType.startsWith("case.")) return "2.2";
  if (sourceType.startsWith("legislation.")) return "3.1";
  if (sourceType.startsWith("journal.")) return "5";
  if (sourceType.startsWith("book")) return "6";
  if (sourceType === "treaty") return "8";
  return "1";
}
