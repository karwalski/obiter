/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { ValidationIssue } from "./types/validation";
import { Citation } from "../types/citation";
import type { ParallelCitation, SourceType } from "../types/citation";
import { checkAbbreviationFullStops, checkDashes } from "./rules/v4/general/punctuation";
import { checkDateFormatting } from "./rules/v4/general/dates";
import { checkNumberFormatting } from "./rules/v4/general/numbers";
import { shouldItaliciseTitle } from "./rules/v4/general/italicisation";
import { COURT_IDENTIFIERS } from "./data/court-identifiers";
import { LATIN_TERMS_ITALICISED } from "./data/latin-terms";
import type { WritingMode, ParallelCitationMode as ConfigParallelCitationMode, IbidSuppressionMode } from "./standards/types";
import {
  type CourtJurisdiction as PresetCourtJurisdiction,
  QLD_JURISDICTIONS,
  isCourtJurisdiction as isCourtJurisdictionPreset,
} from "./court/presets";

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

// ─── Court mode types ─────────────────────────────────────────────────────────

/**
 * COURT-003: Parallel citation mode — determines whether parallel citations
 * are required, preferred, or not expected.
 */
export type ParallelCitationMode = "mandatory" | "preferred" | "off";

/**
 * COURT-007: Unreported judgment gate — determines whether unreported
 * judgments require a material-principle confirmation.
 */
export type UnreportedGate = "off" | "warn";

/**
 * Court jurisdictional preset identifier used by court mode validation.
 */
export type CourtJurisdiction =
  | "HCA" | "FCA" | "FCFCOA"
  | "NSWCA" | "NSWSC" | "NSW_DISTRICT"
  | "VSCA" | "VSC" | "VIC_COUNTY"
  | "QCA" | "QSC" | "QLD_DISTRICT"
  | "WASC" | "SASC" | "TASCSC" | "ACTSC" | "NTSC"
  | "ART" | "FWC" | "STATE_TRIBUNAL";

/**
 * Configuration for court mode validation, derived from the jurisdictional
 * preset (COURT-003).
 */
export interface CourtModeConfig {
  jurisdiction: CourtJurisdiction;
  parallelCitationMode: ParallelCitationMode;
  unreportedGate: UnreportedGate;
  /** Page limit for submissions (FCA / HCA). */
  pageLimit?: number;
  /** Minimum font size in pt (FCA). */
  minFontSizePt?: number;
  /** Minimum line spacing multiplier (FCA). */
  minLineSpacing?: number;
}

/**
 * Heuristic document formatting metrics passed to submission formatting
 * checks (COURT-VALID-003).
 */
export interface DocumentFormattingMetrics {
  /** Estimated page count of the submission. */
  pageCount?: number;
  /** Whether this is a reply submission (lower page limit in FCA). */
  isReply?: boolean;
  /** Minimum font size detected in the document, in pt. */
  minFontSizePt?: number;
  /** Minimum line spacing detected in the document. */
  minLineSpacing?: number;
}

// ─── VALID-001: Document-wide orchestration ──────────────────────────────────

/**
 * Validates an entire document by running all AGLC4 checks across footnotes
 * and citations, then categorises issues by severity.
 *
 * @remarks Orchestrates Rules 1.1.3, 1.1.4, 1.4.3, 1.6.1, 1.6.3, 1.10.1,
 * 1.11.1, and completeness checks for major source types.
 */
/**
 * Heading entry passed from the UI layer for heading format validation.
 */
export interface HeadingEntry {
  level: number;
  text: string;
}

export function validateDocument(
  footnoteTexts: string[],
  citations: Citation[],
  bodyText?: string,
  writingMode?: WritingMode,
  courtJurisdiction?: string,
  parallelCitationMode?: ConfigParallelCitationMode,
  ibidSuppressionMode?: IbidSuppressionMode,
  headings?: HeadingEntry[],
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  const isCourtMode = writingMode === "court";
  // COURT-FIX-004: Use ibidSuppressionMode toggle instead of hardcoded court check.
  // Falls back to court mode check for backward compatibility when toggle not provided.
  const ibidSuppressed = ibidSuppressionMode ? ibidSuppressionMode === "on" : isCourtMode;

  // Footnote-level checks — stamp footnoteIndex on each issue for navigation
  for (let i = 0; i < footnoteTexts.length; i++) {
    const fnIssues: ValidationIssue[] = [
      ...checkFootnoteFormat(footnoteTexts[i], i),
      ...checkTypography(footnoteTexts[i]),
      ...checkDatesAndNumbers(footnoteTexts[i]),
      ...checkEllipsisFormat(footnoteTexts[i], i),
      ...checkLongQuotation(footnoteTexts[i], i),
      ...checkLatinTermsItalicised(footnoteTexts[i], i),
    ];
    const fnText = footnoteTexts[i];
    for (const issue of fnIssues) {
      issue.footnoteIndex = i + 1; // 1-based for Word API
      // Extract a short searchable snippet from the footnote text at the issue offset
      if (!issue.searchText && issue.offset >= 0 && issue.length > 0) {
        const start = Math.max(0, issue.offset);
        const end = Math.min(fnText.length, start + Math.max(issue.length, 20));
        const snippet = fnText.slice(start, end).trim();
        if (snippet.length > 0) {
          issue.searchText = snippet;
        }
      }
    }
    allIssues.push(...fnIssues);
  }

  // Cross-footnote checks
  // COURT-FIX-004: Skip ibid correctness when ibid is suppressed (toggle-driven)
  if (!ibidSuppressed) {
    allIssues.push(...checkIbidCorrectness(footnoteTexts));
  }
  allIssues.push(...checkCrossReferences(footnoteTexts));

  // Body text checks (Rule 1.1.2: footnote number position)
  if (bodyText) {
    allIssues.push(...checkFootnoteNumberPosition(bodyText));
  }

  // Citation completeness checks
  for (const citation of citations) {
    allIssues.push(...checkCitationCompleteness(citation));
    allIssues.push(...checkCitationCapitalisation(citation));
    allIssues.push(...checkTitlePresence(citation));
  }

  // Heading format checks (VALID-011, Rule 1.12.2)
  if (headings && headings.length > 0) {
    allIssues.push(...checkHeadingFormat(headings));
  }

  // Parallel citation checks (Rule 2.2.7 / court practice directions)
  // MULTI-014: Court mode skips parallel citation warnings (parallels are
  // emitted by default and are expected in court submissions)
  if (!isCourtMode) {
    allIssues.push(...checkParallelCitations(citations));
  }

  // COURT-FIX-003: Parallel citation enforcement based on config
  if (parallelCitationMode && parallelCitationMode !== "off") {
    allIssues.push(
      ...checkParallelCitationEnforcement(citations, parallelCitationMode),
    );
  }

  // COURT-010: Queensland subsequent-treatment validation
  // Flags case citations where subsequent treatment is blank in Qld mode
  if (
    isCourtMode &&
    courtJurisdiction &&
    isCourtJurisdictionPreset(courtJurisdiction) &&
    QLD_JURISDICTIONS.has(courtJurisdiction as PresetCourtJurisdiction)
  ) {
    allIssues.push(...checkSubsequentTreatment(citations));
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

// ─── VALID-008: Ellipsis format check ─────────────────────────────────────────

/**
 * Checks footnote text for incorrect ellipsis formatting.
 *
 * AGLC4 requires ellipses as `. . .` (three spaced dots). This function flags:
 * 1. `...` (three or more consecutive dots) — should be `. . .`
 * 2. `\u2026` (Unicode ellipsis character U+2026) — should be `. . .`
 *
 * Already-correct `. . .` patterns are not flagged.
 *
 * @remarks AGLC4 Rule 1.5.3 — "An ellipsis should be indicated by three
 * full stops separated by spaces (. . .)."
 */
export function checkEllipsisFormat(
  footnoteText: string,
  footnoteIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  // Flag three or more consecutive dots (not spaced)
  const consecutiveDotsRegex = /\.{3,}/g;
  let match: RegExpExecArray | null;

  while ((match = consecutiveDotsRegex.exec(trimmed)) !== null) {
    issues.push({
      ruleNumber: "1.5.3",
      message: `Footnote ${footnoteIndex + 1}: ellipsis should be formatted as '. . .' (spaced dots), not '${match[0]}'`,
      severity: "warning",
      offset: match.index,
      length: match[0].length,
      suggestion: ". . .",
    });
  }

  // Flag Unicode ellipsis character (U+2026)
  const unicodeEllipsisRegex = /\u2026/g;

  while ((match = unicodeEllipsisRegex.exec(trimmed)) !== null) {
    issues.push({
      ruleNumber: "1.5.3",
      message: `Footnote ${footnoteIndex + 1}: Unicode ellipsis '\u2026' should be replaced with '. . .' (spaced dots)`,
      severity: "warning",
      offset: match.index,
      length: 1,
      suggestion: ". . .",
    });
  }

  return issues;
}

// ─── VALID-009: Long quotation not block-quoted ───────────────────────────────

/**
 * Checks footnote text for long quotations that may need block quote
 * formatting.
 *
 * AGLC4 Rule 1.5.1 requires quotations of three or more lines to be
 * formatted as block quotes (indented, smaller font, no quotation marks).
 * This is a heuristic check: if text enclosed in matching quotation marks
 * exceeds 250 characters, it flags a suggestion.
 *
 * Scans for text enclosed in single quotes (`\u2018...\u2019`) that exceeds
 * 250 characters.
 *
 * @remarks AGLC4 Rule 1.5.1 — "Quotations of three or more lines should
 * be set apart from the text by indentation."
 */
export function checkLongQuotation(
  footnoteText: string,
  footnoteIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  // Match text enclosed in curly single quotes (AGLC4 convention)
  const curlyQuoteRegex = /\u2018([^'\u2018\u2019]*)\u2019/g;
  let match: RegExpExecArray | null;

  while ((match = curlyQuoteRegex.exec(trimmed)) !== null) {
    const quotedContent = match[1];
    if (quotedContent.length > 250) {
      issues.push({
        ruleNumber: "1.5.1",
        message: `Footnote ${footnoteIndex + 1} contains a long quotation (>${quotedContent.length} chars) that may need block quote formatting per Rule 1.5.1`,
        severity: "info",
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  // Also match straight single quotes as a fallback
  const straightQuoteRegex = /'([^']*?)'/g;

  while ((match = straightQuoteRegex.exec(trimmed)) !== null) {
    const quotedContent = match[1];
    if (quotedContent.length > 250) {
      issues.push({
        ruleNumber: "1.5.1",
        message: `Footnote ${footnoteIndex + 1} contains a long quotation (>${quotedContent.length} chars) that may need block quote formatting per Rule 1.5.1`,
        severity: "info",
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  return issues;
}

// ─── VALID-010: Latin terms not italicised ────────────────────────────────────

/**
 * Sorted Latin terms array for matching, longest-first to prefer multi-word
 * phrases over shorter substrings (e.g. "obiter dictum" before "dictum").
 */
const LATIN_TERMS_SORTED: readonly string[] = [...LATIN_TERMS_ITALICISED].sort(
  (a, b) => b.length - a.length,
);

/**
 * Checks footnote text for Latin/foreign terms from the AGLC4 Rule 1.8.3
 * italicisation list that appear in the text.
 *
 * Since the validator receives plain text (no formatting information), this
 * is a **presence check only** — it flags that the term appears and reminds
 * the user to verify it is italicised.
 *
 * - Case-insensitive, whole-word matching
 * - Skips terms inside square brackets (may be editorial)
 * - Limited to first 5 matches per footnote to avoid flooding
 *
 * @remarks AGLC4 Rule 1.8.3 — "Latin and foreign words that are not
 * commonly used in English should be italicised."
 */
export function checkLatinTermsItalicised(
  footnoteText: string,
  footnoteIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  // Build a set of character ranges that fall inside square brackets
  const bracketRanges: Array<{ start: number; end: number }> = [];
  const bracketRegex = /\[[^\]]*\]/g;
  let bracketMatch: RegExpExecArray | null;

  while ((bracketMatch = bracketRegex.exec(trimmed)) !== null) {
    bracketRanges.push({
      start: bracketMatch.index,
      end: bracketMatch.index + bracketMatch[0].length,
    });
  }

  const isInsideBrackets = (offset: number): boolean =>
    bracketRanges.some((r) => offset >= r.start && offset < r.end);

  const maxMatchesPerFootnote = 5;

  for (const term of LATIN_TERMS_SORTED) {
    if (issues.length >= maxMatchesPerFootnote) {
      break;
    }

    // Whole-word, case-insensitive match
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const termRegex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match: RegExpExecArray | null;

    while ((match = termRegex.exec(trimmed)) !== null) {
      if (issues.length >= maxMatchesPerFootnote) {
        break;
      }

      // Skip matches inside square brackets
      if (isInsideBrackets(match.index)) {
        continue;
      }

      issues.push({
        ruleNumber: "1.8.3",
        message: `'${match[0]}' should be italicised per Rule 1.8.3 \u2014 verify formatting`,
        severity: "info",
        offset: match.index,
        length: match[0].length,
      });
    }
  }

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

// ─── VALID-011: Heading format validation ──────────────────────────────────────

/**
 * Roman numeral pattern that validates the prefix is actually a valid Roman numeral,
 * not just any combination of IVXLCDM characters.
 */
const ROMAN_NUMERAL_REGEX = /^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{1,3})$/;

/**
 * Validates heading format per AGLC4 Rule 1.12.2.
 *
 * Checks:
 * - Level I headings should be uppercase or small caps
 * - Level II headings should be capitalised
 * - Numbering consistency: Level I uses Roman numerals, Level II uses A/B/C,
 *   Level III uses 1/2/3, Level IV uses a/b/c
 * - Flags if heading text starts with wrong numbering prefix for its level
 *
 * @param headings - Array of heading entries with level and text.
 * @returns Array of validation issues found.
 *
 * @remarks AGLC4 Rule 1.12.2 — Headings and sub-headings.
 */
export function checkHeadingFormat(headings: HeadingEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const heading of headings) {
    const text = heading.text.trim();

    if (text.length === 0) continue;

    // Level I: should be uppercase or small caps
    if (heading.level === 1) {
      // Extract the text portion after any numbering prefix
      const textAfterPrefix = text.replace(/^[IVXLCDM]+\s+/i, "").replace(/^\d+\s+/, "");
      const letterContent = textAfterPrefix.replace(/[^a-zA-Z]/g, "");

      if (letterContent.length > 0 && letterContent !== letterContent.toUpperCase()) {
        issues.push({
          ruleNumber: "1.12.2",
          message: `Heading '${text}': Level I headings should be uppercase or small caps`,
          severity: "warning",
          offset: 0,
          length: text.length,
        });
      }
    }

    // Level II: should be capitalised (title-case — first letter of major words capitalised)
    if (heading.level === 2) {
      const textAfterPrefix = text.replace(/^[A-Z]\s+/, "");
      const words = textAfterPrefix.split(/\s+/).filter((w) => w.length > 0);

      if (words.length > 0) {
        const firstWord = words[0];
        // Only flag if the first letter is clearly lowercase
        if (/^[a-z]/.test(firstWord)) {
          issues.push({
            ruleNumber: "1.12.2",
            message: `Heading '${text}': Level II headings should be capitalised`,
            severity: "warning",
            offset: 0,
            length: text.length,
          });
        }
      }
    }

    // Numbering prefix validation for levels 1–4
    if (heading.level >= 1 && heading.level <= 4) {
      // Extract the first "word" from the heading text
      const firstToken = text.split(/\s+/)[0];

      // Check if the heading starts with a numbering prefix at all
      const hasAnyPrefix =
        /^[IVXLCDM]+$/i.test(firstToken) ||
        /^[A-Z]$/.test(firstToken) ||
        /^\d+$/.test(firstToken) ||
        /^[a-z]$/.test(firstToken);

      if (hasAnyPrefix) {
        // Validate the prefix matches the expected pattern for this level
        let isCorrectPrefix = false;
        let expectedLabel = "";

        if (heading.level === 1) {
          // Level I expects Roman numerals
          isCorrectPrefix = ROMAN_NUMERAL_REGEX.test(firstToken.toUpperCase());
          expectedLabel = "Roman numerals";
        } else if (heading.level === 2) {
          // Level II expects single uppercase letter
          isCorrectPrefix = /^[A-Z]$/.test(firstToken);
          expectedLabel = "Uppercase letters (A, B, C)";
        } else if (heading.level === 3) {
          // Level III expects Arabic numeral
          isCorrectPrefix = /^\d+$/.test(firstToken);
          expectedLabel = "Arabic numerals (1, 2, 3)";
        } else if (heading.level === 4) {
          // Level IV expects single lowercase letter
          isCorrectPrefix = /^[a-z]$/.test(firstToken);
          expectedLabel = "Lowercase letters (a, b, c)";
        }

        if (!isCorrectPrefix) {
          issues.push({
            ruleNumber: "1.12.2",
            message: `Heading '${text}': Level ${heading.level} headings should use ${expectedLabel} numbering`,
            severity: "warning",
            offset: 0,
            length: firstToken.length,
          });
        }
      }
    }
  }

  return issues;
}

// ─── VALID-012: Citation capitalisation check ─────────────────────────────────

/**
 * Checks citation data for obvious capitalisation issues per Rule 1.7.
 *
 * Flags:
 * - All-lowercase party names in case citations (e.g. "smith" -> "Smith")
 * - ALL-CAPS party names in case citations (e.g. "SMITH" -> "Smith")
 * - All-lowercase legislation titles
 * - ALL-CAPS legislation titles
 *
 * Does NOT flag lowercase "v" in case names (correct per AGLC4).
 *
 * @param citation - The citation record to check.
 * @returns Array of validation issues found.
 *
 * @remarks AGLC4 Rule 1.7 — Capitalisation.
 */
export function checkCitationCapitalisation(citation: Citation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const label = citation.shortTitle || citation.id;

  if (citation.sourceType.startsWith("case.")) {
    // Check party1 and party2
    const parties = ["party1", "party2"] as const;
    for (const field of parties) {
      const value = citation.data[field] as string | undefined;
      if (!value || typeof value !== "string" || value.trim().length === 0) continue;

      const trimmed = value.trim();
      // Skip single-character values and "v" (correct lowercase)
      if (trimmed === "v") continue;

      const letterContent = trimmed.replace(/[^a-zA-Z]/g, "");
      if (letterContent.length === 0) continue;

      if (letterContent === letterContent.toLowerCase()) {
        issues.push({
          ruleNumber: "1.7",
          message: `Case '${label}': party name '${trimmed}' appears to be all-lowercase — should have initial capitals`,
          severity: "warning",
          offset: 0,
          length: 0,
        });
      } else if (letterContent === letterContent.toUpperCase() && letterContent.length > 1) {
        issues.push({
          ruleNumber: "1.7",
          message: `Case '${label}': party name '${trimmed}' appears to be ALL-CAPS — should have initial capitals (e.g. title-case)`,
          severity: "warning",
          offset: 0,
          length: 0,
        });
      }
    }
  }

  if (citation.sourceType.startsWith("legislation.")) {
    const title = citation.data.title as string | undefined;
    if (title && typeof title === "string" && title.trim().length > 0) {
      const trimmed = title.trim();
      const letterContent = trimmed.replace(/[^a-zA-Z]/g, "");
      if (letterContent.length > 0) {
        if (letterContent === letterContent.toLowerCase()) {
          issues.push({
            ruleNumber: "1.7",
            message: `Legislation '${label}': title '${trimmed}' appears to be all-lowercase — major words should have initial capitals`,
            severity: "warning",
            offset: 0,
            length: 0,
          });
        } else if (letterContent === letterContent.toUpperCase() && letterContent.length > 1) {
          issues.push({
            ruleNumber: "1.7",
            message: `Legislation '${label}': title '${trimmed}' appears to be ALL-CAPS — major words should have initial capitals`,
            severity: "warning",
            offset: 0,
            length: 0,
          });
        }
      }
    }
  }

  return issues;
}

// ─── VALID-013: Title presence check ──────────────────────────────────────────

/**
 * Checks that citations with source types requiring a title actually have one.
 *
 * Uses `shouldItaliciseTitle()` from the italicisation module to determine
 * which source types require titles. For cases, checks `party1`; for all
 * other italicised types, checks `title`.
 *
 * Severity:
 * - Warning for cases (party1 missing)
 * - Error for legislation/books and other title-requiring types (title missing)
 *
 * @param citation - The citation record to check.
 * @returns Array of validation issues found.
 *
 * @remarks AGLC4 Rule 1.8.2 — Source types that need titles have them.
 */
export function checkTitlePresence(citation: Citation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const label = citation.shortTitle || citation.id;

  if (!shouldItaliciseTitle(citation.sourceType as SourceType)) {
    return issues;
  }

  if (citation.sourceType.startsWith("case.")) {
    // Cases use party1 as the primary identifier
    const party1 = citation.data.party1 as string | undefined;
    const isEmpty = !party1 || (typeof party1 === "string" && party1.trim() === "");

    if (isEmpty) {
      issues.push({
        ruleNumber: "1.8.2",
        message: `Case '${label}': party name (party1) is missing — cases require at least one party name`,
        severity: "warning",
        offset: 0,
        length: 0,
      });
    }
  } else {
    // All other italicised source types use title
    const title = citation.data.title as string | undefined;
    const isEmpty = !title || (typeof title === "string" && title.trim() === "");

    if (isEmpty) {
      issues.push({
        ruleNumber: "1.8.2",
        message: `${getSourceTypeLabel(citation.sourceType)} '${label}': title is missing — this source type requires a title`,
        severity: "error",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}

/**
 * Returns a human-readable label for a source type prefix.
 */
function getSourceTypeLabel(sourceType: string): string {
  if (sourceType.startsWith("legislation.")) return "Legislation";
  if (sourceType.startsWith("book")) return "Book";
  if (sourceType.startsWith("report")) return "Report";
  if (sourceType.startsWith("treaty")) return "Treaty";
  if (sourceType.startsWith("film_tv_media")) return "Film/TV/Media";
  return "Source";
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

// ─── COURT-010: Subsequent treatment check (Qld) ──────────────────────────────

/**
 * Checks that all case citations have the subsequentTreatment field populated
 * when in Queensland court mode.
 *
 * @remarks Qld SC PD 1/2024 cl 4(c) requires practitioners to confirm whether
 * cited authorities have been subsequently doubted or not followed.
 */
export function checkSubsequentTreatment(citations: Citation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const citation of citations) {
    if (!citation.sourceType.startsWith("case.")) continue;

    const label = citation.shortTitle || citation.id;
    const treatment = citation.data.subsequentTreatment as string | undefined;

    if (!treatment || treatment.trim() === "") {
      issues.push({
        ruleNumber: "Qld SC PD 1/2024 cl 4(c)",
        message:
          `Case '${label}': Subsequent treatment not recorded. Queensland practice ` +
          `directions require confirmation of whether cited authorities have been ` +
          `subsequently doubted or not followed.`,
        severity: "info",
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

// ─── COURT-FIX-003: Parallel citation enforcement ─────────────────────────

/**
 * Checks that `case.reported` citations include parallel citations when the
 * configured parallel citation mode requires or prefers them.
 *
 * - `"mandatory"`: emits an **error** for each reported case missing parallel
 *   citation data.
 * - `"preferred"`: emits a **warning** for the same condition.
 * - `"off"`: caller should not invoke this function (no-op guard included).
 *
 * @remarks AGLC4 Rule 2.2.7 — Parallel citations; court practice directions.
 */
export function checkParallelCitationEnforcement(
  citations: Citation[],
  mode: ConfigParallelCitationMode,
): ValidationIssue[] {
  if (mode === "off") {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const severity = mode === "mandatory" ? "error" : "warning";

  for (const citation of citations) {
    if (citation.sourceType !== "case.reported") {
      continue;
    }

    const label = citation.shortTitle || citation.id;
    const parallels = citation.data.parallelCitations as ParallelCitation[] | undefined;
    const hasParallels = Array.isArray(parallels) && parallels.length > 0;

    if (!hasParallels) {
      issues.push({
        ruleNumber: "2.2.7",
        message:
          `Case '${label}': Parallel citations ${mode === "mandatory" ? "required" : "recommended"} ` +
          `for reported cases but none are recorded`,
        severity,
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}

// ─── COURT-VALID-001 / COURT-VALID-003: Court mode validation ──────────────

/**
 * @deprecated COURT-FIX-006: Unreported gate is now driven by
 * CourtModeConfig.unreportedGate (from court toggles / user override).
 * Retained for reference only — not used in validation logic.
 */
const _UNREPORTED_GATE_JURISDICTIONS_DEPRECATED: ReadonlySet<CourtJurisdiction> = new Set([
  "NSWCA", "NSWSC", "NSW_DISTRICT",
  "QCA", "QSC", "QLD_DISTRICT",
  "TASCSC",
]);

/**
 * Jurisdictions where subsequent treatment recording is required.
 * Source: Qld SC PD 1/2024 cl 4(c).
 */
const SUBSEQUENT_TREATMENT_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set([
  "QCA", "QSC", "QLD_DISTRICT",
]);

/**
 * Returns the practice direction source string for a court jurisdiction.
 * Each court-mode validation result references the source practice direction,
 * not an AGLC4 rule number.
 */
function getPracticeDirectionSource(jurisdiction: CourtJurisdiction): string {
  switch (jurisdiction) {
    case "HCA":
      return "HCA PD 2 of 2024";
    case "FCA":
    case "FCFCOA":
      return "FCA GPN-AUTH (Dec 2024)";
    case "NSWCA":
    case "NSWSC":
    case "NSW_DISTRICT":
      return "NSW SC PN Gen 20 (Oct 2023)";
    case "VSCA":
    case "VSC":
    case "VIC_COUNTY":
      return "Vic SC PN Gen 3 (Jan 2017)";
    case "QCA":
    case "QSC":
    case "QLD_DISTRICT":
      return "Qld SC PD 1 of 2024";
    case "WASC":
      return "WASC Practice Direction";
    case "SASC":
      return "SASC Practice Direction";
    case "TASCSC":
      return "Tas SC PD 3/2014";
    case "ACTSC":
      return "ACTSC Practice Direction";
    case "NTSC":
      return "NT SC PD 2 of 2007";
    case "ART":
      return "ART Practice Direction";
    case "FWC":
      return "FWC Practice Note";
    case "STATE_TRIBUNAL":
      return "State Tribunal Practice Direction";
  }
}

/**
 * COURT-VALID-001: Court mode validation ruleset.
 *
 * When court mode is active, validates citations and footnotes against
 * court-specific practice direction requirements instead of (or in
 * addition to) academic AGLC4 rules.
 *
 * Checks:
 * - **Error:** parallel citation missing when mode is "mandatory" and
 *   both report + MNC are available
 * - **Warning:** ibid or `(n X)` pattern detected in footnotes
 * - **Warning:** unreported judgment cited without confirmation
 *   (NSW/Qld/Tas)
 * - **Info:** subsequent treatment not recorded (Qld only)
 * - **Info:** more than 30 authorities cited (proportionality)
 * - **Info:** legislation cited without jurisdiction identifier
 *
 * Each result references the source practice direction, not an AGLC4
 * rule number.
 *
 * COURT-VALID-003 checks are included when FCA or HCA config is provided.
 *
 * @param footnoteTexts - Array of footnote text strings.
 * @param citations - Array of citation records in the document.
 * @param config - Court mode configuration from the jurisdictional preset.
 * @param formatting - Optional heuristic document formatting metrics.
 * @returns A categorised validation result.
 */
export function validateCourtMode(
  footnoteTexts: string[],
  citations: Citation[],
  config: CourtModeConfig,
  formatting?: DocumentFormattingMetrics,
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  const pdSource = getPracticeDirectionSource(config.jurisdiction);

  // ── Error: parallel citation missing (mandatory mode) ──────────────
  if (config.parallelCitationMode === "mandatory") {
    for (const citation of citations) {
      if (citation.sourceType !== "case.reported") {
        continue;
      }

      const d = citation.data;
      const label = citation.shortTitle || citation.id;
      const reportSeries = d.reportSeries as string | undefined;
      const mncValue = d.mnc as string | undefined;
      const parallels = d.parallelCitations as ParallelCitation[] | undefined;
      const hasParallels = Array.isArray(parallels) && parallels.length > 0;

      const hasReport =
        typeof reportSeries === "string" && reportSeries.trim().length > 0;
      const hasMnc =
        typeof mncValue === "string" && mncValue.trim().length > 0;

      // Both are available but no parallel citation structure recorded
      if (hasReport && hasMnc && !hasParallels) {
        allIssues.push({
          ruleNumber: pdSource,
          message:
            `Case '${label}': Parallel citation required — both authorised report and MNC ` +
            `are available but parallel citations are not recorded`,
          severity: "error",
          offset: 0,
          length: 0,
        });
      }
    }
  }

  // ── Warning: ibid or (n X) pattern in footnotes ────────────────────
  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];

    // Check for ibid
    const ibidRegex = /\bIbid\b/gi;
    let match: RegExpExecArray | null;
    while ((match = ibidRegex.exec(text)) !== null) {
      allIssues.push({
        ruleNumber: pdSource,
        message:
          `Footnote ${i + 1}: 'Ibid' detected — court submissions should use ` +
          `short-form subsequent references instead`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }

    // Check for (n X) cross-references
    const crossRefRegex = /\(n\s+\d+\)/g;
    while ((match = crossRefRegex.exec(text)) !== null) {
      allIssues.push({
        ruleNumber: pdSource,
        message:
          `Footnote ${i + 1}: '${match[0]}' cross-reference detected — court ` +
          `submissions should use short-form subsequent references instead`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  // ── Warning: unreported judgment without confirmation ─────────────
  // COURT-FIX-006: Gate is now driven solely by config.unreportedGate
  // (which reflects the court toggle, including any user override).
  if (config.unreportedGate === "warn") {
    for (const citation of citations) {
      if (citation.sourceType !== "case.unreported.mnc") {
        continue;
      }

      const label = citation.shortTitle || citation.id;
      const confirmed = citation.data.unreportedConfirmed as boolean | undefined;

      if (!confirmed) {
        allIssues.push({
          ruleNumber: pdSource,
          message:
            `Case '${label}': Unreported judgment cited without confirmation ` +
            `that it contains a material statement of legal principle not found ` +
            `in reported authority`,
          severity: "warning",
          offset: 0,
          length: 0,
        });
      }
    }
  }

  // ── Info: subsequent treatment not recorded (Qld only) ─────────────
  if (SUBSEQUENT_TREATMENT_JURISDICTIONS.has(config.jurisdiction)) {
    for (const citation of citations) {
      if (!citation.sourceType.startsWith("case.")) {
        continue;
      }

      const label = citation.shortTitle || citation.id;
      const treatment = citation.data.subsequentTreatment as string | undefined;

      if (!treatment || treatment.trim() === "") {
        allIssues.push({
          ruleNumber: "Qld SC PD 1 of 2024 cl 4(c)",
          message:
            `Case '${label}': Subsequent treatment not recorded — Qld practice ` +
            `directions require confirmation of whether cited authorities have ` +
            `been subsequently doubted or not followed`,
          severity: "info",
          offset: 0,
          length: 0,
        });
      }
    }
  }

  // ── Info: more than 30 authorities cited (proportionality) ─────────
  const authorityCount = citations.filter(
    (c) => c.sourceType.startsWith("case.") || c.sourceType.startsWith("legislation."),
  ).length;

  if (authorityCount > 30) {
    allIssues.push({
      ruleNumber: pdSource,
      message:
        `${authorityCount} authorities cited — consider whether all are ` +
        `necessary (proportionality). Practice directions encourage citation ` +
        `of only those authorities necessary to establish principles`,
      severity: "info",
      offset: 0,
      length: 0,
    });
  }

  // ── Info: legislation without jurisdiction identifier ───────────────
  for (const citation of citations) {
    if (!citation.sourceType.startsWith("legislation.")) {
      continue;
    }

    const label = citation.shortTitle || citation.id;
    const jurisdiction = citation.data.jurisdiction as string | undefined;

    if (!jurisdiction || jurisdiction.trim() === "") {
      allIssues.push({
        ruleNumber: pdSource,
        message:
          `Legislation '${label}': No jurisdiction identifier specified — ` +
          `court submissions should identify the enacting jurisdiction`,
        severity: "info",
        offset: 0,
        length: 0,
      });
    }
  }

  // ── COURT-VALID-003: Submission formatting checks ──────────────────
  if (formatting) {
    allIssues.push(...checkSubmissionFormatting(config, formatting));
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

/**
 * COURT-VALID-003: Submission formatting checks.
 *
 * Heuristic checks for FCA and HCA submission formatting requirements.
 * All results are info-level since these are best-effort estimates based
 * on Word document properties.
 *
 * FCA checks (FCA Practice Note APP 2, Dec 2025):
 * - Warn if submissions exceed 10 pages (5 pages for reply)
 * - Warn if font size is below 12pt
 * - Warn if line spacing is below 1.5
 *
 * HCA checks (HCA PD 2 of 2024, Part 44):
 * - Warn if page limit exceeded (20 pages for written submissions)
 *
 * @param config - Court mode configuration.
 * @param formatting - Heuristic document formatting metrics.
 * @returns Array of info-level validation issues.
 */
export function checkSubmissionFormatting(
  config: CourtModeConfig,
  formatting: DocumentFormattingMetrics,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pdSource = getPracticeDirectionSource(config.jurisdiction);

  if (config.jurisdiction === "FCA" || config.jurisdiction === "FCFCOA") {
    // Page limit check
    if (formatting.pageCount !== undefined) {
      const limit = formatting.isReply ? 5 : 10;
      if (formatting.pageCount > limit) {
        issues.push({
          ruleNumber: "FCA Practice Note APP 2 (Dec 2025)",
          message:
            `Submission is ${formatting.pageCount} pages — FCA ` +
            `${formatting.isReply ? "reply" : "submission"} limit is ${limit} pages`,
          severity: "info",
          offset: 0,
          length: 0,
        });
      }
    }

    // Font size check
    if (
      formatting.minFontSizePt !== undefined &&
      formatting.minFontSizePt < 12
    ) {
      issues.push({
        ruleNumber: "FCA Practice Note APP 2 (Dec 2025)",
        message:
          `Minimum font size detected is ${formatting.minFontSizePt}pt — ` +
          `FCA requires at least 12pt`,
        severity: "info",
        offset: 0,
        length: 0,
      });
    }

    // Line spacing check
    if (
      formatting.minLineSpacing !== undefined &&
      formatting.minLineSpacing < 1.5
    ) {
      issues.push({
        ruleNumber: "FCA Practice Note APP 2 (Dec 2025)",
        message:
          `Line spacing detected is ${formatting.minLineSpacing} — ` +
          `FCA requires at least 1.5 line spacing`,
        severity: "info",
        offset: 0,
        length: 0,
      });
    }
  }

  if (config.jurisdiction === "HCA") {
    // HCA Part 44 page limit (20 pages for written submissions)
    const hcaPageLimit = config.pageLimit ?? 20;
    if (
      formatting.pageCount !== undefined &&
      formatting.pageCount > hcaPageLimit
    ) {
      issues.push({
        ruleNumber: "HCA PD 2 of 2024, Part 44",
        message:
          `Submission is ${formatting.pageCount} pages — HCA Part 44 ` +
          `limit is ${hcaPageLimit} pages`,
        severity: "info",
        offset: 0,
        length: 0,
      });
    }
  }

  return issues;
}
