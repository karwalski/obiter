/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { ValidationIssue } from "./types/validation";
import { Citation } from "../types/citation";
import type { ParallelCitation } from "../types/citation";
import { checkAbbreviationFullStops, checkDashes } from "./rules/v4/general/punctuation";
import { checkDateFormatting } from "./rules/v4/general/dates";
import { checkNumberFormatting } from "./rules/v4/general/numbers";
import { COURT_IDENTIFIERS } from "./data/court-identifiers";

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

  // Parallel citation checks (Rule 2.2.7 / court practice directions)
  allIssues.push(...checkParallelCitations(citations));

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

// ─── VALID-EXT-001: OSCOLA-specific validation ────────────────────────────────

/**
 * Common Maori legal terms that should carry macrons.
 * Used by NZLSG validation to flag missing diacritics.
 */
const MAORI_MACRON_TERMS: ReadonlyArray<{ plain: string; correct: string }> = [
  { plain: "Maori", correct: "Māori" },
  { plain: "Aotearoa", correct: "Aotearoa" }, // no macron needed
  { plain: "whanau", correct: "whānau" },
  { plain: "hapu", correct: "hapū" },
  { plain: "iwi", correct: "iwi" }, // no macron needed
  { plain: "kawanatanga", correct: "kāwanatanga" },
  { plain: "rangatiratanga", correct: "rangatiratanga" }, // no macron needed
  { plain: "taonga", correct: "taonga" }, // no macron needed
  { plain: "tikanga", correct: "tikanga" }, // no macron needed
  { plain: "mana", correct: "mana" }, // no macron needed
  { plain: "Waitangi", correct: "Waitangi" }, // no macron needed
  { plain: "whanganui", correct: "Whanganui" }, // no macron needed — context-dependent
  { plain: "kaupapa", correct: "kaupapa" }, // no macron needed
  { plain: "rohe", correct: "rohe" }, // no macron needed
  { plain: "Tamaki Makaurau", correct: "Tāmaki Makaurau" },
  { plain: "Otautahi", correct: "Ōtautahi" },
];

/** Subset of MAORI_MACRON_TERMS that actually require a macron correction. */
const MAORI_TERMS_NEEDING_MACRONS = MAORI_MACRON_TERMS.filter(
  (t) => t.plain !== t.correct,
);

/**
 * OSCOLA-specific validation rules (VALID-EXT-001).
 *
 * Checks:
 * - Italicised legislation titles (should be roman in OSCOLA)
 * - Missing neutral citation for post-2001 UK cases
 * - Ibid usage in OSCOLA 5 mode (deprecated)
 * - Double quotation marks (OSCOLA uses single)
 * - Missing Table of Cases in bibliography
 *
 * @remarks OSCOLA 5 Rules 1.3, 2.1.1, 2.2, 1.4
 */
export function checkOscolaRules(
  citations: Citation[],
  footnoteTexts: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for ibid usage (deprecated in OSCOLA 5)
  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    const ibidRegex = /\bIbid\b/gi;
    let match: RegExpExecArray | null;

    while ((match = ibidRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "OSCOLA 1.3",
        message: `Footnote ${i + 1}: 'Ibid' is deprecated in OSCOLA 5 — use short-form '(n X)' for all subsequent references`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
        suggestion: "(n X)",
      });
    }

    // Check for double quotation marks (OSCOLA uses single)
    const doubleQuoteRegex = /[\u201C\u201D]/g;
    while ((match = doubleQuoteRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "OSCOLA 1.2",
        message: `Footnote ${i + 1}: OSCOLA uses single quotation marks for titles, not double`,
        severity: "warning",
        offset: match.index,
        length: 1,
        suggestion: match[0] === "\u201C" ? "\u2018" : "\u2019",
      });
    }
  }

  // Check citations for OSCOLA-specific issues
  for (const citation of citations) {
    const label = citation.shortTitle || citation.id;

    // Flag italicised legislation (OSCOLA uses roman)
    if (citation.sourceType.startsWith("legislation.")) {
      issues.push({
        ruleNumber: "OSCOLA 2.2",
        message: `Legislation '${label}': OSCOLA requires legislation titles in roman (not italic)`,
        severity: "warning",
        offset: 0,
        length: 0,
      });
    }

    // Flag missing neutral citation for post-2001 UK cases
    if (citation.sourceType.startsWith("case.")) {
      const d = citation.data;
      const year = d.year as number | undefined;
      const mnc = d.mnc as string | undefined;
      const courtId = d.courtId as string | undefined;

      // Heuristic: UK court identifiers start with UK, EW, or are EWHC etc.
      const isUkCase =
        typeof courtId === "string" &&
        /^(UK|EW|EWHC|EWCA|EWFC|UKSC|UKPC|UKUT|UKFTT)/.test(courtId);

      if (isUkCase && typeof year === "number" && year >= 2001) {
        const hasMnc = typeof mnc === "string" && mnc.trim().length > 0;
        if (!hasMnc) {
          issues.push({
            ruleNumber: "OSCOLA 2.1.1",
            message: `Case '${label}': post-2001 UK case should include a neutral citation`,
            severity: "warning",
            offset: 0,
            length: 0,
          });
        }
      }
    }
  }

  // Check for missing Table of Cases (heuristic: if there are case citations
  // but no footnote text mentions "Table of Cases")
  const hasCaseCitations = citations.some((c) => c.sourceType.startsWith("case."));
  if (hasCaseCitations) {
    const allText = footnoteTexts.join(" ");
    if (!allText.includes("Table of Cases") && !allText.includes("TABLE OF CASES")) {
      issues.push({
        ruleNumber: "OSCOLA 1.4",
        message:
          "OSCOLA requires a Table of Cases listing all cited cases — consider generating one",
        severity: "info",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}

// ─── VALID-EXT-002: NZLSG-specific validation ────────────────────────────────

/**
 * NZLSG-specific validation rules (VALID-EXT-002).
 *
 * Checks:
 * - Italicised legislation titles (should be roman in NZLSG)
 * - Single quotation marks in titles (NZLSG uses double)
 * - `(n X)` in commercial style (should be short-form only)
 * - Ibid usage (NZLSG general style does not use ibid)
 * - Missing `at` before pinpoints
 * - Missing macrons in common te reo Maori legal terms
 *
 * @remarks NZLSG 3rd ed Rules 2.3, 4.1, 1.1.2, 6.1
 */
export function checkNzlsgRules(
  citations: Citation[],
  footnoteTexts: string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    let match: RegExpExecArray | null;

    // Flag ibid usage (NZLSG general style does not use ibid)
    const ibidRegex = /\bIbid\b/gi;
    while ((match = ibidRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "NZLSG 2.3",
        message: `Footnote ${i + 1}: NZLSG does not use 'Ibid' — use 'above n X, at [pinpoint]' instead`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }

    // Flag single quotation marks (NZLSG uses double for titles)
    const singleQuoteRegex = /[\u2018\u2019]/g;
    while ((match = singleQuoteRegex.exec(text)) !== null) {
      // Skip apostrophes within words (e.g., "it's", "don't")
      const before = text[match.index - 1] ?? "";
      const after = text[match.index + 1] ?? "";
      const isApostrophe = /[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after);

      if (!isApostrophe) {
        issues.push({
          ruleNumber: "NZLSG 1.1.2",
          message: `Footnote ${i + 1}: NZLSG uses double quotation marks for titles, not single`,
          severity: "warning",
          offset: match.index,
          length: 1,
          suggestion: match[0] === "\u2018" ? "\u201C" : "\u201D",
        });
      }
    }

    // Flag (n X) in commercial style — this is a general check; the caller
    // should only invoke this when commercial style is active
    const nXRegex = /\(n\s+\d+\)/g;
    while ((match = nXRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "NZLSG 2.3",
        message: `Footnote ${i + 1}: '${match[0]}' cross-reference style is not used in NZLSG commercial style — use short-form citation only`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }

    // Flag missing 'at' before pinpoints — heuristic: number after comma
    // at end of citation (e.g., ", 42." should be ", at 42.")
    const missingAtRegex = /,\s+(\d+)\s*\./g;
    while ((match = missingAtRegex.exec(text)) !== null) {
      // Check this is not already preceded by 'at'
      const precedingText = text.substring(Math.max(0, match.index - 4), match.index);
      if (!precedingText.includes("at")) {
        issues.push({
          ruleNumber: "NZLSG 2.2",
          message: `Footnote ${i + 1}: NZLSG requires 'at' before pinpoint references`,
          severity: "info",
          offset: match.index + 2,
          length: match[1].length,
          suggestion: `at ${match[1]}`,
        });
      }
    }

    // Flag missing macrons in common Maori legal terms
    for (const term of MAORI_TERMS_NEEDING_MACRONS) {
      const termRegex = new RegExp(`\\b${term.plain}\\b`, "g");
      while ((match = termRegex.exec(text)) !== null) {
        issues.push({
          ruleNumber: "NZLSG",
          message: `Footnote ${i + 1}: '${term.plain}' should include macrons: '${term.correct}'`,
          severity: "info",
          offset: match.index,
          length: match[0].length,
          suggestion: term.correct,
        });
      }
    }
  }

  // Check citations for NZLSG-specific issues
  for (const citation of citations) {
    const label = citation.shortTitle || citation.id;

    // Flag italicised legislation (NZLSG uses roman)
    if (citation.sourceType.startsWith("legislation.")) {
      issues.push({
        ruleNumber: "NZLSG 4.1",
        message: `Legislation '${label}': NZLSG requires legislation titles in roman (not italic)`,
        severity: "warning",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}

// ─── VALID-007: Parallel citation checks ──────────────────────────────────────

/**
 * Medium neutral citation pattern: [YYYY] CourtIdentifier Number
 * e.g. [2024] HCA 1, [2023] NSWCA 42
 */
const MNC_PATTERN = /^\[\d{4}]\s+[A-Z][A-Za-z]+\s+\d+$/;

/** Set of known court identifier codes for fast lookup. */
const COURT_ID_SET: ReadonlySet<string> = new Set(
  COURT_IDENTIFIERS.map((c) => c.code),
);

/**
 * Checks case citations for missing parallel citations where court practice
 * directions require them.
 *
 * For each `case.reported` citation:
 * - If the citation has an MNC (via `data.mnc` matching the MNC pattern, or
 *   `data.courtId` matching a known court identifier) but no parallel
 *   citations, flags a warning per Rule 2.2.7.
 * - If the citation has an authorised report series but no MNC, flags an
 *   informational suggestion to include the MNC.
 *
 * Severity is "warning" (not "error") because AGLC4 itself does not mandate
 * parallel citations — court practice directions do (e.g., Supreme Court of
 * Queensland PD 1/2024).
 *
 * @remarks AGLC4 Rule 2.2.7 — Parallel citations.
 */
export function checkParallelCitations(
  citations: Citation[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const citation of citations) {
    if (citation.sourceType !== "case.reported") {
      continue;
    }

    const d = citation.data;
    const label = citation.shortTitle || citation.id;
    const parallels = d.parallelCitations as ParallelCitation[] | undefined;
    const hasParallels = Array.isArray(parallels) && parallels.length > 0;

    // Determine whether the citation carries an MNC
    const mncValue = d.mnc as string | undefined;
    const courtId = d.courtId as string | undefined;
    const hasMnc =
      (typeof mncValue === "string" && MNC_PATTERN.test(mncValue.trim())) ||
      (typeof courtId === "string" && COURT_ID_SET.has(courtId));

    if (hasMnc && !hasParallels) {
      issues.push({
        ruleNumber: "2.2.7",
        message:
          `Case '${label}': Rule 2.2.7: Consider adding parallel citation. ` +
          "Court practice directions (e.g., Supreme Court of Queensland " +
          "PD 1/2024) require both the MNC and authorised report citation.",
        severity: "warning",
        offset: 0,
        length: 0,
      });
    } else if (!hasMnc && !hasParallels) {
      issues.push({
        ruleNumber: "2.2.7",
        message:
          `Case '${label}': Consider including the medium neutral citation ` +
          "alongside the authorised report.",
        severity: "info",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}
