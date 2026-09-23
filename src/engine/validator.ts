/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import type { ValidationIssue } from "./types/validation";
import { getFieldAliases } from "./fieldAliases";
import { Citation } from "../types/citation";
import type { ParallelCitation, SourceType } from "../types/citation";
import { checkAbbreviationFullStops, checkDashes } from "./rules/v4/general/punctuation";
import { checkDateFormatting, checkDateSpans } from "./rules/v4/general/dates";
import { checkNumberFormatting } from "./rules/v4/general/numbers";
import { shouldItaliciseTitle } from "./rules/v4/general/italicisation";
import { LATIN_TERMS_ITALICISED } from "./data/latin-terms";
import type {
  CitationStandardId,
  WritingMode,
  ParallelCitationMode as ConfigParallelCitationMode,
  IbidSuppressionMode,
  UnreportedGateMode,
} from "./standards/types";
import {
  type CourtJurisdiction as PresetCourtJurisdiction,
  QLD_JURISDICTIONS,
  isCourtJurisdiction as isCourtJurisdictionPreset,
} from "./court/presets";
import { getByCode as getCourtIdentifierByCode } from "./data/court-identifiers";
import { trimIssuingBodyName } from "./rules/v4/domestic/legislation-supplementary";
import { parseTitleMarkup } from "./rules/v4/general/titleMarkup";
import { exportRuleReference } from "./ruleExporter";

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
  | "HCA"
  | "FCA"
  | "FCFCOA"
  | "NSWCA"
  | "NSWSC"
  | "NSW_DISTRICT"
  | "VSCA"
  | "VSC"
  | "VIC_COUNTY"
  | "QCA"
  | "QSC"
  | "QLD_DISTRICT"
  | "WASC"
  | "SASC"
  | "TASSC"
  | "ACTSC"
  | "NTSC"
  | "ART"
  | "FWC"
  | "STATE_TRIBUNAL";

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
 * Heading entry passed from the UI layer for heading format validation.
 */
export interface HeadingEntry {
  level: number;
  text: string;
}

/**
 * STD-019: the standard family a check set is selected for. `aglc` covers
 * `aglc4`/`aglc5`, `oscola` covers `oscola4`/`oscola5`, `nzlsg` covers
 * `nzlsg3`/`nzlsg4`. An unknown or absent standard id is treated as AGLC
 * (the historical behaviour of every positional caller).
 */
export type StandardFamily = "aglc" | "oscola" | "nzlsg";

/**
 * Resolves the standard family from a store `standardId`.
 */
export function standardFamilyOf(standardId?: CitationStandardId | string): StandardFamily {
  if (typeof standardId === "string") {
    if (standardId.startsWith("oscola")) return "oscola";
    if (standardId.startsWith("nzlsg")) return "nzlsg";
  }
  return "aglc";
}

/**
 * STD-019: options for `validateDocument`. Carries the document's standard
 * and the court configuration the Validation view builds
 * (`buildCourtConfig({ ...getStandardConfig(id), writingMode }, toggles)`).
 */
export interface ValidateDocumentOptions {
  /** The store's standard id; selects the check set. Absent = AGLC. */
  standardId?: CitationStandardId;
  /** MULTI-014 writing mode; "court" enables the practice-direction checks. */
  writingMode?: WritingMode;
  /** Court preset identifier (COURT-003); names the practice direction. */
  courtJurisdiction?: string;
  /** COURT-FIX-003 parallel-citation enforcement mode. */
  parallelCitationMode?: ConfigParallelCitationMode;
  /** COURT-FIX-004 ibid suppression toggle. */
  ibidSuppressionMode?: IbidSuppressionMode;
  /** COURT-007 unreported-judgment gate toggle. */
  unreportedGateMode?: UnreportedGateMode;
  /** Built-in heading entries for the AGLC r 1.12.2 heading check. */
  headings?: HeadingEntry[];
}

/**
 * Validates an entire document by running the check set for the document's
 * standard across footnotes and citations, then categorises issues by
 * severity.
 *
 * Check-set selection (STD-019):
 * - Universal (every standard): footnote closing punctuation, dangling
 *   cross-references, long quotations and ellipsis spacing (each with the
 *   standard's own rule id and quotation convention), citation completeness,
 *   capitalisation and title presence, plus the court-mode checks.
 * - AGLC only: r 1.1.3 'and' between sources (OSCOLA §1.1.4 shares it;
 *   NZLSG §2.2.4(a) requires 'and'), r 1.1.2 footnote-number position
 *   (OSCOLA §1.1 shares it), r 1.4.3 ibid correctness, r 1.5.7 quotation
 *   clauses, r 1.6 typography, r 1.10/1.11 numbers and dates, r 1.8.3 Latin
 *   terms (OSCOLA §1.3.3 and NZLSG r 1.1.3 leave common Latin in roman),
 *   r 1.12.2 headings, r 2.2.7 parallel-citation prohibition (OSCOLA §2.1.3
 *   and NZLSG r 3.1(a) require neutral citation plus report), r 2.3.1 MNC
 *   adoption years, r 2.3.4 court-order officers, r 3.1.2 legislative
 *   history hint and r 3.9.3 issuing-body names.
 *
 * The positional signature is kept for existing callers; new callers pass a
 * `ValidateDocumentOptions` object as the fourth argument.
 *
 * @remarks Orchestrates AGLC4 Rules 1.1.3, 1.1.4, 1.4.3, 1.6.1, 1.6.3,
 * 1.10.1, 1.11.1, and completeness checks for major source types; OSCOLA 5
 * §1.1, §1.2.2, §1.5; NZLSG 3 rr 1.2.2, 2.2.4(a), 2.3.1.
 */
export function validateDocument(
  footnoteTexts: string[],
  citations: Citation[],
  bodyText?: string,
  writingModeOrOptions?: WritingMode | ValidateDocumentOptions,
  courtJurisdiction?: string,
  parallelCitationMode?: ConfigParallelCitationMode,
  ibidSuppressionMode?: IbidSuppressionMode,
  headings?: HeadingEntry[]
): ValidationResult {
  const options: ValidateDocumentOptions =
    typeof writingModeOrOptions === "object" && writingModeOrOptions !== null
      ? writingModeOrOptions
      : {
          writingMode: writingModeOrOptions,
          courtJurisdiction,
          parallelCitationMode,
          ibidSuppressionMode,
          headings,
        };
  return validateDocumentWithOptions(footnoteTexts, citations, bodyText, options);
}

function validateDocumentWithOptions(
  footnoteTexts: string[],
  citations: Citation[],
  bodyText: string | undefined,
  options: ValidateDocumentOptions
): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  const family = standardFamilyOf(options.standardId);
  const isAglc = family === "aglc";
  const isCourtMode = options.writingMode === "court";
  // COURT-FIX-004: Use ibidSuppressionMode toggle instead of hardcoded court check.
  // Falls back to court mode check for backward compatibility when toggle not provided.
  const ibidSuppressed = options.ibidSuppressionMode
    ? options.ibidSuppressionMode === "on"
    : isCourtMode;
  const pdSource = practiceDirectionFor(options.courtJurisdiction);

  // Footnote-level checks — stamp footnoteIndex on each issue for navigation
  for (let i = 0; i < footnoteTexts.length; i++) {
    const fnIssues: ValidationIssue[] = dedupeDashIssues([
      ...checkFootnoteFormat(footnoteTexts[i], i, family),
      ...(isAglc ? checkTypography(footnoteTexts[i]) : []),
      ...(isAglc ? checkDatesAndNumbers(footnoteTexts[i]) : []),
      ...checkEllipsisFormat(footnoteTexts[i], i, family),
      ...checkLongQuotation(footnoteTexts[i], i, family),
      ...(isAglc ? checkLatinTermsItalicised(footnoteTexts[i], i) : []),
      ...(isAglc ? checkQuotationClauses(footnoteTexts[i], i) : []),
    ]);
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
  // COURT-FIX-004: Skip ibid correctness when ibid is suppressed (toggle-driven).
  // STD-019: AGLC r 1.4.3 only — OSCOLA 5 §1.2.1 rejects ibid outright (the
  // OSCOLA rule set warns), OSCOLA 4 §1.2.3 lets ibid follow a multi-source
  // footnote, and NZLSG r 2.3.1 replaces ibid with 'above n x'.
  if (isAglc && !ibidSuppressed) {
    allIssues.push(...checkIbidCorrectness(footnoteTexts));
  }
  allIssues.push(...checkCrossReferences(footnoteTexts, family));

  // Body text checks (Rule 1.1.2 / OSCOLA §1.1: footnote number position)
  if (bodyText && family !== "nzlsg") {
    allIssues.push(...checkFootnoteNumberPosition(bodyText, family));
  }

  // Citation completeness checks
  for (const citation of citations) {
    allIssues.push(...checkCitationCompleteness(citation));
    allIssues.push(...checkCitationCapitalisation(citation));
    allIssues.push(...checkTitlePresence(citation));
    if (isAglc) {
      allIssues.push(...checkLegislativeHistoryHint(citation));
      allIssues.push(...checkCourtOrderOfficers(citation));
      allIssues.push(...checkIssuingBodyName(citation));
    }
  }

  // Rule 2.3.1: medium neutral citations must not predate the year the
  // court began allocating its own judgment numbers (AGLC's adoption table).
  if (isAglc) {
    allIssues.push(...checkMncYearValidity(citations));
  }

  // Heading format checks (VALID-011, Rule 1.12.2) — AGLC only; OSCOLA and
  // NZLSG prescribe no heading case or numbering scheme.
  if (isAglc && options.headings && options.headings.length > 0) {
    allIssues.push(...checkHeadingFormat(options.headings));
  }

  // Parallel citation checks (Rule 2.2.7: prohibited for Australian cases
  // in academic AGLC style). MULTI-014: Court mode skips this check —
  // parallels are emitted by default and expected in court submissions.
  // STD-019: OSCOLA 5 §2.1.3 and NZLSG 3 r 3.1(a) require the neutral
  // citation followed by the report, so the prohibition never fires there.
  if (isAglc && !isCourtMode) {
    allIssues.push(...checkParallelCitations(citations));
  }

  // COURT-FIX-003: Parallel citation enforcement based on config. The issue
  // cites the practice direction, not AGLC r 2.2.7 (which prohibits them).
  if (options.parallelCitationMode && options.parallelCitationMode !== "off") {
    allIssues.push(
      ...checkParallelCitationEnforcement(citations, options.parallelCitationMode, pdSource)
    );
  }

  if (isCourtMode) {
    // COURT-FIX-004: with ibid suppressed, 'Ibid' and '(n X)' in a footnote
    // are the court-submission warnings validateCourtMode raises.
    if (ibidSuppressed) {
      allIssues.push(...checkCourtSubsequentReferences(footnoteTexts, pdSource));
    }

    // COURT-007 / COURT-FIX-006: unreported-judgment gate from the toggle.
    if (options.unreportedGateMode === "warn") {
      allIssues.push(...checkUnreportedJudgments(citations, pdSource));
    }

    // COURT-010: Queensland subsequent-treatment validation
    // Flags case citations where subsequent treatment is blank in Qld mode
    if (
      options.courtJurisdiction &&
      isCourtJurisdictionPreset(options.courtJurisdiction) &&
      QLD_JURISDICTIONS.has(options.courtJurisdiction as PresetCourtJurisdiction)
    ) {
      allIssues.push(...checkSubsequentTreatment(citations));
    }
  }

  return categoriseBySeverity(allIssues);
}

/**
 * Splits issues into the three severity buckets of a `ValidationResult`.
 */
function categoriseBySeverity(allIssues: ValidationIssue[]): ValidationResult {
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
 * The rule label court-mode issues carry: the jurisdiction's practice
 * direction when the preset is known, else a generic label.
 */
function practiceDirectionFor(courtJurisdiction?: string): string {
  if (courtJurisdiction && isCourtJurisdictionPreset(courtJurisdiction)) {
    return getPracticeDirectionSource(courtJurisdiction as CourtJurisdiction);
  }
  return "Court practice direction";
}

// ─── STD-019: Quotation spans ────────────────────────────────────────────────

/** A half-open character range `[start, end)` of a footnote's text. */
interface TextSpan {
  start: number;
  end: number;
}

/**
 * Returns true when the single closing mark at `index` is an apostrophe
 * (a letter on both sides, eg "Crown’s") rather than a closing quotation
 * mark.
 */
function isApostropheAt(text: string, index: number): boolean {
  const before = text[index - 1] ?? "";
  const after = text[index + 1] ?? "";
  return /[A-Za-z]/.test(before) && /[A-Za-z]/.test(after);
}

/**
 * Finds the spans enclosed by a pair of quotation marks, inclusive of the
 * marks themselves. For the single pair (‘ ’) a closing mark that reads as
 * an apostrophe does not close the span.
 */
function quotedSpans(text: string, open: string, close: string): TextSpan[] {
  const spans: TextSpan[] = [];
  const single = open === "‘";
  let from = 0;
  while (from < text.length) {
    const start = text.indexOf(open, from);
    if (start === -1) break;
    let end = -1;
    let cursor = start + 1;
    while (cursor < text.length) {
      const candidate = text.indexOf(close, cursor);
      if (candidate === -1) break;
      if (single && isApostropheAt(text, candidate)) {
        cursor = candidate + 1;
        continue;
      }
      end = candidate;
      break;
    }
    if (end === -1) break;
    spans.push({ start, end: end + 1 });
    from = end + 1;
  }
  return spans;
}

/** True when `offset` lies inside any of `spans`. */
function insideSpans(spans: TextSpan[], offset: number): boolean {
  return spans.some((span) => offset > span.start && offset < span.end - 1);
}

/**
 * Spans of quoted text under either mark style, for checks that must leave
 * quotations alone (NZLSG r 1.1.1(c): quotations follow the original).
 */
function allQuotedSpans(text: string): TextSpan[] {
  return [
    ...quotedSpans(text, "“", "”"),
    ...quotedSpans(text, "‘", "’"),
    ...quotedSpans(text, '"', '"'),
  ];
}

/**
 * Drops rule 1.6.3 dash warnings that duplicate a rule 1.11.4 date-span
 * warning on the same text range.
 *
 * @remarks A hyphenated year or day span (eg '1986-87', '21-22 September')
 * is flagged by both the generic dash check (Rule 1.6.3) and the specific
 * date-span check (Rule 1.11.4); the 1.11.4 issue carries the better
 * message and suggestion, so the overlapping 1.6.3 issue is removed.
 */
function dedupeDashIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const dateSpans = issues.filter((issue) => issue.ruleNumber === "1.11.4");
  if (dateSpans.length === 0) {
    return issues;
  }
  return issues.filter((issue) => {
    if (issue.ruleNumber !== "1.6.3") {
      return true;
    }
    return !dateSpans.some(
      (span) =>
        issue.offset >= span.offset && issue.offset + issue.length <= span.offset + span.length
    );
  });
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
 * @remarks OSCOLA 5 §1.1 (p 3) — the footnote marker follows the
 * punctuation (STD-019: the same heuristic under the OSCOLA id).
 */
export function checkFootnoteNumberPosition(
  bodyText: string,
  family: StandardFamily = "aglc"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!bodyText || bodyText.trim().length === 0) {
    return issues;
  }

  const ruleNumber = family === "oscola" ? "OSCOLA 1.1" : "1.1.2";

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
      ruleNumber,
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
 *    or other appropriate closing punctuation (`?`/`!`) (Rule 1.1.4).
 * 2. Use of `and` between sources instead of `;` — multiple sources in a
 *    single footnote are separated by semicolons (Rule 1.1.3).
 *
 * @remarks AGLC4 Rule 1.1.3 — "Where more than one source is cited in a
 * single footnote, each source should be separated by a semicolon."
 * @remarks AGLC4 Rule 1.1.4 — footnotes end with a full stop or other
 * appropriate closing punctuation (the guide's own example ends a discursive
 * footnote with a question mark).
 * @remarks OSCOLA 5 §1.1 (p 3) — footnotes close with a full stop and
 * several citations are separated by semicolons; §1.1.4 — no 'and' before
 * the last source. NZLSG 3 r 2.2.4(a) — footnotes conclude with a full stop
 * and 'and' precedes the last source, so the 'and' check is silent there.
 */
export function checkFootnoteFormat(
  footnoteText: string,
  footnoteIndex: number,
  family: StandardFamily = "aglc"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  const closingRule =
    family === "oscola" ? "OSCOLA 1.1" : family === "nzlsg" ? "NZLSG 2.2.4" : "1.1.4";

  // Rule 1.1.4: Missing closing punctuation (full stop, ? or !)
  if (!/[.?!]$/.test(trimmed)) {
    issues.push({
      ruleNumber: closingRule,
      message: `Footnote ${footnoteIndex + 1} does not end with closing punctuation (full stop, question mark or exclamation mark)`,
      severity: "error",
      offset: trimmed.length - 1,
      length: 1,
      suggestion: trimmed + ".",
    });
  }

  if (family === "nzlsg") {
    return issues;
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
      ruleNumber: family === "oscola" ? "OSCOLA 1.1.4" : "1.1.3",
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
 * @remarks OSCOLA 5 §1.2.2 (p 7) — cross-references name the footnote
 * ('(n 109)', 'See n 109'). NZLSG 3 r 2.3.1 — 'above n x'; under NZLSG a
 * dangling 'above n X' is flagged as well (STD-019).
 */
export function checkCrossReferences(
  footnoteTexts: string[],
  family: StandardFamily = "aglc"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalFootnotes = footnoteTexts.length;
  const ruleNumber =
    family === "oscola" ? "OSCOLA 1.2.2" : family === "nzlsg" ? "NZLSG 2.3.1" : "1.4";

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    // Match (n X) where X is a number; under NZLSG also 'above n X'
    const crossRefRegex =
      family === "nzlsg" ? /\(n\s+(\d+)\)|\babove n\s+(\d+)\b/g : /\(n\s+(\d+)\)/g;
    let match: RegExpExecArray | null;

    while ((match = crossRefRegex.exec(text)) !== null) {
      const referenced = match[1] ?? match[2];
      const referencedFootnote = Number(referenced);
      if (referencedFootnote > totalFootnotes || referencedFootnote < 1) {
        const form = match[1] !== undefined ? `(n ${referenced})` : `above n ${referenced}`;
        issues.push({
          ruleNumber,
          message: `Footnote ${i + 1}: cross-reference '${form}' refers to non-existent footnote`,
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
 * Delegates to existing `checkDateFormatting` (Rule 1.11.1),
 * `checkDateSpans` (Rule 1.11.4) and `checkNumberFormatting` (Rule 1.10.1).
 *
 * @remarks AGLC4 Rules 1.10.1, 1.11.1, 1.11.4
 */
export function checkDatesAndNumbers(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  issues.push(...checkDateFormatting(text));
  issues.push(...checkDateSpans(text));
  issues.push(...checkNumberFormatting(text));

  return issues;
}

// ─── VALID-008: Ellipsis format check ─────────────────────────────────────────

/**
 * Checks footnote text for incorrect ellipsis formatting.
 *
 * AGLC4 marks omissions with the ellipsis character `…`, preceded and
 * followed by a space (but no space between an ellipsis and a following
 * footnote number, per Rule 1.1.2). This function flags:
 * 1. `...` (three or more consecutive full stops) — should be `…`
 * 2. `. . .` (three spaced full stops, Bluebook style) — should be `…`
 * 3. `…` run directly against a letter (missing its surrounding space)
 *
 * Already-correct ` … ` patterns are not flagged.
 *
 * @remarks AGLC4 Rule 1.5.3 (PDF p 43) — omissions are indicated by an
 * ellipsis ('…') with a space before and after.
 * @remarks OSCOLA 5 §1.5 (p 9) and NZLSG 3 r 1.2.2(b)(v) — the ellipsis
 * symbol, spaced from the adjacent text (same check, the standard's own id).
 */
export function checkEllipsisFormat(
  footnoteText: string,
  footnoteIndex: number,
  family: StandardFamily = "aglc"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  const ruleNumber =
    family === "oscola" ? "OSCOLA 1.5" : family === "nzlsg" ? "NZLSG 1.2.2" : "1.5.3";

  // Flag three or more consecutive full stops
  const consecutiveDotsRegex = /\.{3,}/g;
  let match: RegExpExecArray | null;

  while ((match = consecutiveDotsRegex.exec(trimmed)) !== null) {
    issues.push({
      ruleNumber,
      message: `Footnote ${footnoteIndex + 1}: ellipsis should be the '…' character with a space either side, not '${match[0]}'`,
      severity: "warning",
      offset: match.index,
      length: match[0].length,
      suggestion: "…",
    });
  }

  // Flag three spaced full stops '. . .' (Bluebook style, not AGLC4)
  const spacedDotsRegex = /\. \. \./g;

  while ((match = spacedDotsRegex.exec(trimmed)) !== null) {
    issues.push({
      ruleNumber,
      message: `Footnote ${footnoteIndex + 1}: ellipsis should be the '…' character with a space either side, not spaced full stops '. . .'`,
      severity: "warning",
      offset: match.index,
      length: match[0].length,
      suggestion: "…",
    });
  }

  // Flag '…' missing its surrounding space (letter directly adjacent).
  // A space is not required between an ellipsis and a footnote number
  // (Rule 1.1.2), so trailing digits are not flagged.
  const unspacedEllipsisRegex = /[A-Za-z]…|…[A-Za-z]/g;

  while ((match = unspacedEllipsisRegex.exec(trimmed)) !== null) {
    issues.push({
      ruleNumber,
      message: `Footnote ${footnoteIndex + 1}: an ellipsis should be preceded and followed by a space`,
      severity: "warning",
      offset: match.index,
      length: match[0].length,
      suggestion: match[0].replace("…", " … ").replace(/ {2,}/g, " "),
    });
  }

  return issues;
}

// ─── Rule 1.5.7: Quotation parenthetical clauses ──────────────────────────────

/**
 * The five fixed parenthetical clauses of AGLC4 Rule 1.5.7, in table order.
 */
const QUOTATION_CLAUSES: readonly string[] = [
  "(emphasis in original)",
  "(emphasis added)",
  "(emphasis altered)",
  "(emphasis omitted)",
  "(citations omitted)",
];

/**
 * Non-AGLC4 variants of the Rule 1.5.7 parenthetical clauses, mapped to the
 * clause from the rule's closed table (or to no suggestion where the rule
 * has no equivalent clause).
 */
const QUOTATION_CLAUSE_VARIANTS: ReadonlyArray<{ wrong: string; right?: string }> = [
  { wrong: "(citation omitted)", right: "(citations omitted)" },
  { wrong: "(internal citations omitted)", right: "(citations omitted)" },
  { wrong: "(emphases added)", right: "(emphasis added)" },
  { wrong: "(emphases in original)", right: "(emphasis in original)" },
  { wrong: "(emphasis original)", right: "(emphasis in original)" },
  { wrong: "(emphasis supplied)", right: "(emphasis added)" },
  { wrong: "(footnotes omitted)" },
  { wrong: "(footnote omitted)" },
  { wrong: "(translation modified)" },
];

/**
 * Checks footnote text for parenthetical clauses that deviate from the five
 * fixed clauses of AGLC4 Rule 1.5.7 — '(emphasis in original)', '(emphasis
 * added)', '(emphasis altered)', '(emphasis omitted)', '(citations
 * omitted)' — and for multiple clauses given out of the table's order.
 *
 * @remarks AGLC4 Rule 1.5.7 (PDF p 46) — always the table's exact clause
 * (eg never '(emphases added)' or '(citation omitted)'); multiple applicable
 * clauses appear in the table's order, each in its own parentheses.
 */
export function checkQuotationClauses(
  footnoteText: string,
  footnoteIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  const lower = trimmed.toLowerCase();

  // Flag non-AGLC4 clause variants.
  for (const variant of QUOTATION_CLAUSE_VARIANTS) {
    let from = 0;
    let idx: number;
    while ((idx = lower.indexOf(variant.wrong, from)) !== -1) {
      issues.push({
        ruleNumber: "1.5.7",
        message: variant.right
          ? `Footnote ${footnoteIndex + 1}: '${variant.wrong}' is not an AGLC4 clause — use '${variant.right}'`
          : `Footnote ${footnoteIndex + 1}: '${variant.wrong}' is not one of the five parenthetical clauses of Rule 1.5.7`,
        severity: "warning",
        offset: idx,
        length: variant.wrong.length,
        suggestion: variant.right,
      });
      from = idx + variant.wrong.length;
    }
  }

  // Flag adjacent Rule 1.5.7 clauses given out of the table's order.
  const found: Array<{ order: number; offset: number }> = [];
  for (let order = 0; order < QUOTATION_CLAUSES.length; order++) {
    let from = 0;
    let idx: number;
    while ((idx = lower.indexOf(QUOTATION_CLAUSES[order], from)) !== -1) {
      found.push({ order, offset: idx });
      from = idx + QUOTATION_CLAUSES[order].length;
    }
  }
  found.sort((a, b) => a.offset - b.offset);
  for (let i = 1; i < found.length; i++) {
    // Only compare clauses adjacent in the text (applied to the same source).
    const gap = trimmed.slice(
      found[i - 1].offset + QUOTATION_CLAUSES[found[i - 1].order].length,
      found[i].offset
    );
    if (found[i].order < found[i - 1].order && /^\s*$/.test(gap)) {
      issues.push({
        ruleNumber: "1.5.7",
        message: `Footnote ${footnoteIndex + 1}: parenthetical clauses should appear in the order of the Rule 1.5.7 table (eg '(emphasis in original) (citations omitted)')`,
        severity: "warning",
        offset: found[i].offset,
        length: QUOTATION_CLAUSES[found[i].order].length,
      });
    }
  }

  return issues;
}

// ─── VALID-009: Long quotation not block-quoted ───────────────────────────────

/**
 * Checks footnote text for long quotations that may need block quote
 * formatting.
 *
 * AGLC4 Rule 1.5.1: short quotations (three lines or less) are run into
 * the text in single quotation marks; long quotations (four lines or more)
 * are formatted as block quotes (indented, smaller font, no quotation
 * marks). This is a heuristic check: if text enclosed in matching quotation
 * marks exceeds ~4 lines (360 characters at roughly 90 characters a line),
 * it flags a suggestion.
 *
 * Scans for text enclosed in single quotes (`\u2018...\u2019`) that exceeds
 * 360 characters.
 *
 * @remarks AGLC4 Rule 1.5.1 — long quotations (four lines or more) are
 * indented, in a smaller font, without quotation marks.
 * @remarks OSCOLA 5 §1.5 (p 9) — quotations longer than three lines are
 * indented without quotation marks (same length heuristic, single marks).
 * @remarks NZLSG 3 r 1.2.2(a)(ii) — quotations of 30 words or more are
 * indented without quotation marks; short quotations take double marks, so
 * the NZLSG scan counts the words inside double quotation marks.
 */
export function checkLongQuotation(
  footnoteText: string,
  footnoteIndex: number,
  family: StandardFamily = "aglc"
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const trimmed = footnoteText.trim();

  if (trimmed.length === 0) {
    return issues;
  }

  if (family === "nzlsg") {
    return checkNzlsgLongQuotation(trimmed, footnoteIndex);
  }

  const ruleNumber = family === "oscola" ? "OSCOLA 1.5" : "1.5.1";
  const ruleLabel = family === "oscola" ? "OSCOLA §1.5" : "Rule 1.5.1";

  // Match text enclosed in curly single quotes (AGLC4 convention)
  const curlyQuoteRegex = /‘([^'‘’]*)’/g;
  let match: RegExpExecArray | null;

  while ((match = curlyQuoteRegex.exec(trimmed)) !== null) {
    const quotedContent = match[1];
    if (quotedContent.length > 360) {
      issues.push({
        ruleNumber,
        message: `Footnote ${footnoteIndex + 1} contains a long quotation (>${quotedContent.length} chars) that may need block quote formatting per ${ruleLabel}`,
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
    if (quotedContent.length > 360) {
      issues.push({
        ruleNumber,
        message: `Footnote ${footnoteIndex + 1} contains a long quotation (>${quotedContent.length} chars) that may need block quote formatting per ${ruleLabel}`,
        severity: "info",
        offset: match.index,
        length: match[0].length,
      });
    }
  }

  return issues;
}

/** NZLSG 3 r 1.2.2(a)(ii): the long-quotation threshold, in words. */
const NZLSG_LONG_QUOTATION_WORDS = 30;

/**
 * NZLSG scan for `checkLongQuotation`: double-quoted (curly or straight)
 * text of 30 words or more that is still run into the footnote.
 *
 * @remarks NZLSG 3 r 1.2.2(a)(i)–(ii) — short quotations (fewer than 30
 * words) run in the text in double quotation marks; 30 words or more are
 * indented without quotation marks.
 */
function checkNzlsgLongQuotation(trimmed: string, footnoteIndex: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const patterns = [/“([^“”]*)”/g, /"([^"]*?)"/g];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(trimmed)) !== null) {
      const tokens = match[1].trim().split(/\s+/);
      const words = tokens.filter((word) => word.length > 0).length;
      if (words >= NZLSG_LONG_QUOTATION_WORDS) {
        issues.push({
          ruleNumber: "NZLSG 1.2.2",
          message: `Footnote ${footnoteIndex + 1} contains a long quotation (${words} words) that should be indented without quotation marks per NZLSG r 1.2.2(a)(ii)`,
          severity: "info",
          offset: match.index,
          length: match[0].length,
        });
      }
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
  (a, b) => b.length - a.length
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
 * @remarks AGLC4 Rule 1.8.3 — foreign words and phrases are italicised
 * unless they appear in the Macquarie Dictionary.
 */
export function checkLatinTermsItalicised(
  footnoteText: string,
  _footnoteIndex: number
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
 * A single required citation element.
 *
 * `field` is the canonical element name used in the finding message;
 * `keys` are the data keys — canonical structured shape first, then
 * legacy/alias shapes — any one of which satisfies the element.
 */
interface RequiredFieldSpec {
  field: string;
  keys: string[];
}

/**
 * Data keys that can carry a book's author element. The canonical shape is
 * the structured `authors: [{givenNames, surname}]` array; `author` is the
 * legacy flat string; `editors` satisfies the element for editor-only books
 * (rule 6.6.3: '«Editor(s)» (ed/eds)' replaces the author); `chapterAuthors`
 * is the book-chapter shape (rule 6.6.1); `institutionalAuthor`/`body`
 * cover body authors (rule 4.1.6).
 */
const BOOK_AUTHOR_KEYS = [
  "authors",
  "author",
  "editors",
  "chapterAuthors",
  "institutionalAuthor",
  "body",
];

/** Data keys that can carry a journal article's author element (rule 4.1). */
const JOURNAL_AUTHOR_KEYS = ["authors", "author", "institutionalAuthor", "body"];

/** Data keys that can carry a case name (rule 2.1.1). */
const CASE_NAME_KEYS = ["party1", "caseName", "caseTitle", "title"];

/**
 * Required fields per major source type category.
 *
 * Each entry maps a source type prefix (or exact type) to the elements
 * that must be present for the citation to be considered complete. The
 * first matching entry wins, so exact types precede prefix matches.
 */
const REQUIRED_FIELDS: ReadonlyArray<{
  match: (sourceType: string) => boolean;
  label: string;
  fields: RequiredFieldSpec[];
}> = [
  {
    // Rule 2.2: only reported cases require a report series; unreported
    // cases (rules 2.3.1–2.3.2) and other case forms have no such element.
    match: (st) => st === "case.reported",
    label: "Case",
    fields: [
      { field: "case name", keys: CASE_NAME_KEYS },
      { field: "year", keys: ["year"] },
      { field: "reportSeries", keys: ["reportSeries"] },
    ],
  },
  {
    match: (st) => st.startsWith("case."),
    label: "Case",
    fields: [
      { field: "case name", keys: CASE_NAME_KEYS },
      { field: "year", keys: ["year"] },
    ],
  },
  {
    // Rule 3.6: the Commonwealth Constitution is cited without year or
    // jurisdiction ('Australian Constitution'), so nothing is mandatory.
    match: (st) => st === "legislation.constitution",
    label: "Legislation",
    fields: [],
  },
  {
    // Rule 3.9 quasi-legislative materials (gazettes, rulings, practice
    // directions) have per-form templates with no common mandatory field.
    match: (st) => st === "legislation.quasi",
    label: "Legislation",
    fields: [],
  },
  {
    // Rule 3.7: explanatory memoranda carry the bill's title and year.
    match: (st) => st === "legislation.explanatory",
    label: "Legislation",
    fields: [
      { field: "title", keys: ["billTitle", "title"] },
      { field: "year", keys: ["billYear", "year"] },
      { field: "jurisdiction", keys: ["jurisdiction"] },
    ],
  },
  {
    match: (st) => st.startsWith("legislation."),
    label: "Legislation",
    fields: [
      { field: "title", keys: ["title"] },
      { field: "year", keys: ["year"] },
      { field: "jurisdiction", keys: ["jurisdiction"] },
    ],
  },
  {
    match: (st) => st.startsWith("journal."),
    label: "Journal article",
    fields: [
      { field: "author", keys: JOURNAL_AUTHOR_KEYS },
      { field: "title", keys: ["title"] },
      { field: "year", keys: ["year"] },
      { field: "journal", keys: ["journal", "journalName"] },
    ],
  },
  {
    match: (st) => st.startsWith("book"),
    label: "Book",
    fields: [
      { field: "author", keys: BOOK_AUTHOR_KEYS },
      { field: "title", keys: ["title", "chapterTitle", "bookTitle"] },
      { field: "publisher", keys: ["publisher"] },
      { field: "year", keys: ["year"] },
    ],
  },
  {
    match: (st) => st === "treaty",
    label: "Treaty",
    fields: [
      { field: "title", keys: ["title"] },
      { field: "treatySeries", keys: ["treatySeries"] },
    ],
  },
];

/**
 * Returns true if a data value counts as a populated citation field.
 *
 * Understands the structured shapes the engine actually stores: non-blank
 * strings, numbers, non-empty arrays (eg `authors: [{givenNames, surname}]`
 * — at least one element must itself be populated), and objects with at
 * least one non-blank string property (eg a single Author record).
 */
function isFieldValuePresent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.some((element) => isFieldValuePresent(element));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(
      (v) => typeof v === "string" && v.trim() !== ""
    );
  }
  return Boolean(value);
}

/**
 * Returns a human-readable label for a citation, for use in validation
 * finding messages: the user's short title, else the case name
 * ('«Party 1» v «Party 2»'), else the first available title, else the raw
 * citation id as a last resort. Rule 4.2 asterisk markers (titleMarkup.ts)
 * are stripped so labels read as plain text. The machine-usable id travels
 * separately in `ValidationIssue.citationId`.
 */
export function getCitationLabel(citation: Citation): string {
  const stripMarkers = (value: string): string =>
    parseTitleMarkup(value, false)
      .map((run) => run.text)
      .join("");

  if (typeof citation.shortTitle === "string" && citation.shortTitle.trim() !== "") {
    return stripMarkers(citation.shortTitle.trim());
  }

  const d = citation.data;
  const str = (key: string): string => {
    const v = d[key];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : "";
  };

  const party1 = str("party1");
  if (party1) {
    const party2 = str("party2");
    return party2 ? `${party1} v ${party2}` : party1;
  }

  const title =
    str("caseName") || str("caseTitle") || str("title") || str("chapterTitle") || str("bookTitle");
  if (title) {
    return stripMarkers(title);
  }

  return citation.id;
}

/**
 * Checks that a citation record has all mandatory fields for its source type.
 *
 * Required fields per major source type category:
 * - **Reported case** (`case.reported`): case name, year, reportSeries
 *   (Rule 2.2); other `case.*` forms: case name, year (Rule 2.3)
 * - **Legislation** (`legislation.*`): title, year, jurisdiction (Rule 3.1);
 *   the Constitution (Rule 3.6) and quasi-legislative materials (Rule 3.9)
 *   have no common mandatory fields
 * - **Journal** (`journal.*`): author, title, year, journal (Rule 5)
 * - **Book** (`book*`): author, title, publisher, year (Rule 6)
 * - **Treaty** (`treaty`): title, treatySeries (Rule 8)
 *
 * Each element accepts every data shape the engine stores — eg the author
 * element is satisfied by the structured `authors` array, the legacy flat
 * `author` string, or (for books) an `editors`-only record (rule 6.6.3).
 *
 * @remarks AGLC4 Rules 2.2, 3.1, 5, 6, 8 — mandatory citation elements.
 */
export function checkCitationCompleteness(citation: Citation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const rule = REQUIRED_FIELDS.find((r) => r.match(citation.sourceType));
  if (!rule) {
    return issues;
  }

  for (const spec of rule.fields) {
    const present = spec.keys.some((key) => isFieldValuePresent(citation.data[key]));

    if (!present) {
      issues.push({
        ruleNumber: getRuleForSourceType(citation.sourceType),
        message: `${rule.label} citation '${getCitationLabel(citation)}' is missing required field '${spec.field}'`,
        severity: "error",
        offset: 0,
        length: 0,
        citationId: citation.id,
      });
    }
  }

  return issues;
}

// ─── BUG-005 (c): Insert-path required-field check ───────────────────────────

// Alias table shared with the Edit form and the interchange layer
// (src/engine/fieldAliases.ts, INTEROP-001).

/** Lazily-built lookup of the dispatch contract's required fields per type. */
let requiredFieldsByType: Map<string, readonly string[]> | null = null;

/**
 * Lists the engine-required fields missing from a citation's data, keyed by
 * the dispatch contract's field names (BUG-005 (c)).
 *
 * The source of truth is the per-source-type dispatch contract exported by
 * ruleExporter (SOURCE_TYPE_METADATA.requiredFields — eg a reported case
 * requires party1, party2, year, reportSeries and startingPage per Rule 2.2).
 * A field counts as present when its primary key or any dispatcher-accepted
 * alias holds a populated value. The insert paths (task pane and the headless
 * citation service) call this before inserting so an incomplete citation is
 * refused (or expressly confirmed) rather than silently rendered partial.
 */
export function listMissingRequiredFields(
  sourceType: string,
  data: Record<string, unknown>
): string[] {
  if (!requiredFieldsByType) {
    requiredFieldsByType = new Map(
      exportRuleReference().sourceTypes.map((st) => [st.type, st.requiredFields])
    );
  }
  const required = requiredFieldsByType.get(sourceType);
  if (!required || required.length === 0) {
    return [];
  }
  return required.filter((field) => {
    const keys = [field, ...getFieldAliases(field)];
    return !keys.some((key) => isFieldValuePresent(data[key]));
  });
}

/**
 * Warns when a court-order citation names no judicial officer.
 *
 * @remarks AGLC4 Rule 2.3.4 — a court order is cited as 'Order of
 * «Judicial Officer(s)» in «Case Name» …'; every officer who issued the
 * order must be named (per rule 2.4.1), so the element is mandatory.
 */
export function checkCourtOrderOfficers(citation: Citation): ValidationIssue[] {
  if (citation.sourceType !== "case.court_order") {
    return [];
  }
  const d = citation.data;
  const officers =
    (typeof d.judicialOfficers === "string" && d.judicialOfficers.trim()) ||
    (typeof d.judges === "string" && d.judges.trim()) ||
    (Array.isArray(d.judicialOfficers) && d.judicialOfficers.length > 0);
  if (officers) {
    return [];
  }
  return [
    {
      ruleNumber: "2.3.4",
      message: `Court order citation '${getCitationLabel(citation)}' names no judicial officer — rule 2.3.4 requires 'Order of «Judicial Officer(s)» in «Case Name» …', naming every officer who issued the order`,
      severity: "warning",
      offset: 0,
      length: 0,
      citationId: citation.id,
    },
  ];
}

/**
 * Hints that a quasi-legislative issuing body's name likely needs
 * rule 3.9.3 trimming.
 *
 * @remarks AGLC4 Rule 3.9.3 — company-status designators ('Pty', 'Ltd',
 * 'Co', 'Inc') and a leading 'The' are omitted from a non-government
 * issuing body's name (ex 77: 'Victorian Bar', not 'The Victorian Bar
 * Inc'). The formatter applies the trim automatically on the
 * `(at «Full Date»)` form; on the numbered form it cannot tell a
 * government instrumentality (rule 3.9.2, no trim) from a non-government
 * body, so a name carrying company designators is flagged for the user
 * instead.
 */
export function checkIssuingBodyName(citation: Citation): ValidationIssue[] {
  if (citation.sourceType !== "legislation.quasi") {
    return [];
  }
  const d = citation.data;
  // The (at date) form trims automatically — only the numbered form needs a hint
  if (typeof d.atDate === "string" && d.atDate.trim() !== "") {
    return [];
  }
  const issuingBody = typeof d.issuingBody === "string" ? d.issuingBody.trim() : "";
  if (!issuingBody) {
    return [];
  }
  const hasCompanyMarker =
    /^[Tt]he\s+/.test(issuingBody) || /\s(Pty|Ltd|Co|Inc|NL)\b\.?/.test(issuingBody);
  if (!hasCompanyMarker) {
    return [];
  }
  const trimmed = trimIssuingBodyName(issuingBody);
  return [
    {
      ruleNumber: "3.9.3",
      message: `Issuing body '${issuingBody}' looks like a non-government entity — rule 3.9.3 omits company-status designators and a leading 'The' from its name`,
      severity: "info",
      offset: 0,
      length: 0,
      suggestion: trimmed,
      citationId: citation.id,
    },
  ];
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
  const label = getCitationLabel(citation);

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
          citationId: citation.id,
        });
      } else if (letterContent === letterContent.toUpperCase() && letterContent.length > 1) {
        issues.push({
          ruleNumber: "1.7",
          message: `Case '${label}': party name '${trimmed}' appears to be ALL-CAPS — should have initial capitals (e.g. title-case)`,
          severity: "warning",
          offset: 0,
          length: 0,
          citationId: citation.id,
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
            citationId: citation.id,
          });
        } else if (letterContent === letterContent.toUpperCase() && letterContent.length > 1) {
          issues.push({
            ruleNumber: "1.7",
            message: `Legislation '${label}': title '${trimmed}' appears to be ALL-CAPS — major words should have initial capitals`,
            severity: "warning",
            offset: 0,
            length: 0,
            citationId: citation.id,
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
  const label = getCitationLabel(citation);

  if (!shouldItaliciseTitle(citation.sourceType as SourceType)) {
    return issues;
  }

  if (citation.sourceType.startsWith("case.")) {
    // Cases use party1 as the primary identifier; a stored caseName (the
    // single-field shape some case forms use) also satisfies the element.
    const party1 = citation.data.party1 as string | undefined;
    const caseName = citation.data.caseName as string | undefined;
    const isEmpty =
      (!party1 || (typeof party1 === "string" && party1.trim() === "")) &&
      (!caseName || (typeof caseName === "string" && caseName.trim() === ""));

    if (isEmpty) {
      issues.push({
        ruleNumber: "1.8.2",
        message: `Case '${label}': party name (party1) is missing — cases require at least one party name`,
        severity: "warning",
        offset: 0,
        length: 0,
        citationId: citation.id,
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
        citationId: citation.id,
      });
    }
  }

  return issues;
}

/**
 * Nudge toward the principal-Act default for amending legislation.
 *
 * @remarks AGLC4 Note to Rule 3.1.2 (p 68): a citation to an Act "refer[s] to
 * the Act as amended (and consolidated)", and "[g]enerally, a principal Act
 * rather than an amending Act should be cited (but see rule 3.8)". When a
 * legislation citation carries an opt-in Rule 3.8 hybrid with a passive
 * amendment connector, the principal Act alone already imports "as amended" —
 * so the hybrid should be reserved for footnotes where the amendment itself is
 * the point. Info severity only: the hybrid is a legitimate Rule 3.8 form, not
 * an error. See docs/decisions.md DECISION-008.
 */
export function checkLegislativeHistoryHint(citation: Citation): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!citation.sourceType.startsWith("legislation.")) {
    return issues;
  }

  const history = citation.data.legislativeHistory as { connector?: string } | undefined;
  const connector = history?.connector;
  const PASSIVE_AMENDMENT = new Set(["as amended by", "amended by", "later amended by"]);

  if (connector && PASSIVE_AMENDMENT.has(connector)) {
    const label = getCitationLabel(citation);
    issues.push({
      ruleNumber: "3.1.2",
      message:
        `Legislation '${label}': citing the principal Act already refers to ` +
        `it as amended and consolidated (Note to Rule 3.1.2). Use the ` +
        `'${connector}' form only where the amendment itself is the point ` +
        `(Rule 3.8).`,
      severity: "info",
      offset: 0,
      length: 0,
      citationId: citation.id,
    });
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
const MAORI_TERMS_NEEDING_MACRONS = MAORI_MACRON_TERMS.filter((t) => t.plain !== t.correct);

/**
 * Options for the standard-specific rule sets (STD-019).
 */
export interface StandardRuleOptions {
  /**
   * The store's standard id. `checkOscolaRules` raises the ibid warning
   * for OSCOLA 5 only (OSCOLA 4 §1.2.1 permits ibid for the immediately
   * preceding footnote); absent = OSCOLA 5.
   */
  standardId?: CitationStandardId;
}

/**
 * True when a citation record expressly flags its title as italicised.
 *
 * STD-019: the validator receives plain footnote text, so an italic Act
 * title cannot be detected from the inputs available; the OSCOLA §2.4.1 and
 * NZLSG r 4.1.1(a) warnings therefore fire only when the citation data
 * carries an explicit `titleItalic: true` flag (no form writes it yet —
 * see the STD-019 todo in tests/standards/validator.test.ts).
 */
function hasExplicitItalicTitle(citation: Citation): boolean {
  const flag = citation.data.titleItalic;
  return flag === true || flag === "true";
}

/**
 * OSCOLA-specific validation rules (VALID-EXT-001).
 *
 * Checks:
 * - 'ibid' in OSCOLA 5 (§1.2.1: "'ibid' should not be used"); silent for
 *   OSCOLA 4, whose §1.2.1/§1.2.3 permit it for the preceding footnote
 * - Double quotation marks outside a single-quoted span (§1.5: single
 *   inverted commas; double only for a quotation within a quotation)
 * - Legislation title expressly flagged italic (§2.4.1: roman)
 * - Missing neutral citation for a post-2001 UK case (§2.1.3)
 * - Table of Cases reminder when cases are cited (§1.6.2)
 *
 * @remarks OSCOLA 5 §1.2.1 p 6, §1.5 p 9, §1.6.2 p 11, §2.1.3 p 18,
 * §2.4.1 p 25; OSCOLA 4 §1.2.1 and §1.2.3.
 */
export function checkOscolaRules(
  citations: Citation[],
  footnoteTexts: string[],
  options: StandardRuleOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ibidDeprecated = options.standardId !== "oscola4";

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    let match: RegExpExecArray | null;

    // OSCOLA 5 §1.2.1: ibid is not used (OSCOLA 4 §1.2.1 permits it)
    if (ibidDeprecated) {
      const ibidRegex = /\bIbid\b/gi;
      while ((match = ibidRegex.exec(text)) !== null) {
        issues.push({
          ruleNumber: "OSCOLA 1.2.1",
          message: `Footnote ${i + 1}: 'Ibid' is deprecated in OSCOLA 5 — use short-form '(n X)' for all subsequent references`,
          severity: "warning",
          offset: match.index,
          length: match[0].length,
          suggestion: "(n X)",
        });
      }
    }

    // §1.5: single inverted commas; double marks are correct only for a
    // quotation within a (single-quoted) quotation.
    const singleQuoted = quotedSpans(text, "‘", "’");
    const doubleQuoteRegex = /[“”]/g;
    while ((match = doubleQuoteRegex.exec(text)) !== null) {
      if (insideSpans(singleQuoted, match.index)) {
        continue;
      }
      issues.push({
        ruleNumber: "OSCOLA 1.5",
        message: `Footnote ${i + 1}: OSCOLA uses single quotation marks for titles, not double`,
        severity: "warning",
        offset: match.index,
        length: 1,
        suggestion: match[0] === "“" ? "‘" : "’",
      });
    }
  }

  // Check citations for OSCOLA-specific issues
  for (const citation of citations) {
    const label = getCitationLabel(citation);

    // §2.4.1: statute titles are roman — only an explicit italic flag can
    // show a breach from the validator's plain-text inputs.
    if (citation.sourceType.startsWith("legislation.") && hasExplicitItalicTitle(citation)) {
      issues.push({
        ruleNumber: "OSCOLA 2.4.1",
        message: `Legislation '${label}': OSCOLA requires legislation titles in roman (not italic)`,
        severity: "warning",
        offset: 0,
        length: 0,
        citationId: citation.id,
      });
    }

    // §2.1.3: neutral citation for UK cases from 2001
    if (citation.sourceType.startsWith("case.")) {
      const d = citation.data;
      const year = d.year as number | undefined;
      const mnc = d.mnc as string | undefined;
      const courtId = d.courtId as string | undefined;

      // Heuristic: UK court identifiers start with UK, EW, or are EWHC etc.
      const isUkCase =
        typeof courtId === "string" && /^(UK|EW|EWHC|EWCA|EWFC|UKSC|UKPC|UKUT|UKFTT)/.test(courtId);

      if (isUkCase && typeof year === "number" && year >= 2001) {
        const hasMnc = typeof mnc === "string" && mnc.trim().length > 0;
        if (!hasMnc) {
          issues.push({
            ruleNumber: "OSCOLA 2.1.3",
            message: `Case '${label}': post-2001 UK case should include a neutral citation`,
            severity: "warning",
            offset: 0,
            length: 0,
            citationId: citation.id,
          });
        }
      }
    }
  }

  // §1.6.2: Table of Cases (heuristic: if there are case citations but no
  // footnote text mentions "Table of Cases")
  const hasCaseCitations = citations.some((c) => c.sourceType.startsWith("case."));
  if (hasCaseCitations) {
    const allText = footnoteTexts.join(" ");
    if (!allText.includes("Table of Cases") && !allText.includes("TABLE OF CASES")) {
      issues.push({
        ruleNumber: "OSCOLA 1.6.2",
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
 * - 'Ibid' (r 2.3.1: 'above n x' replaces ibid)
 * - Single quotation marks outside a double-quoted span (r 1.2.2: double
 *   marks; single only for a quotation within a quotation)
 * - `(n X)` cross-references (r 2.3.1: not the NZLSG form)
 * - Missing 'at' before a pinpoint (r 3.1)
 * - Missing macrons in common te reo Māori legal terms, outside quotations
 *   (r 1.1.1(c): macrons are used; quotations follow the original)
 * - Legislation title expressly flagged italic (r 4.1.1(a): roman)
 *
 * @remarks NZLSG 3 rr 1.1.1(c), 1.2.2, 2.3.1, 3.1, 4.1.1(a). The single
 * quotation-mark issue keeps the id 'NZLSG 1.1.2' pending the STD-019
 * decision recorded in tests/standards/validator.test.ts.
 */
export function checkNzlsgRules(citations: Citation[], footnoteTexts: string[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];
    let match: RegExpExecArray | null;

    // r 2.3.1: 'above n x' instead of ibid
    const ibidRegex = /\bIbid\b/gi;
    while ((match = ibidRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "NZLSG 2.3.1",
        message: `Footnote ${i + 1}: NZLSG does not use 'Ibid' — use 'above n X, at [pinpoint]' instead`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }

    // r 1.2.2: double quotation marks; single marks are correct only for a
    // quotation within a (double-quoted) quotation.
    const doubleQuoted = quotedSpans(text, "“", "”");
    const singleQuoteRegex = /[‘’]/g;
    while ((match = singleQuoteRegex.exec(text)) !== null) {
      // Skip apostrophes within words (e.g., "it's", "don't")
      if (isApostropheAt(text, match.index) || insideSpans(doubleQuoted, match.index)) {
        continue;
      }
      issues.push({
        ruleNumber: "NZLSG 1.1.2",
        message: `Footnote ${i + 1}: NZLSG uses double quotation marks for titles, not single`,
        severity: "warning",
        offset: match.index,
        length: 1,
        suggestion: match[0] === "‘" ? "“" : "”",
      });
    }

    // r 2.3.1: '(n X)' is not the NZLSG cross-reference form
    const nXRegex = /\(n\s+\d+\)/g;
    while ((match = nXRegex.exec(text)) !== null) {
      issues.push({
        ruleNumber: "NZLSG 2.3.1",
        message: `Footnote ${i + 1}: '${match[0]}' cross-reference style is not used in NZLSG commercial style — use short-form citation only`,
        severity: "warning",
        offset: match.index,
        length: match[0].length,
      });
    }

    // r 3.1: 'at' before pinpoints — heuristic: number after comma at the
    // end of a citation (e.g., ", 42." should be ", at 42.")
    const missingAtRegex = /,\s+(\d+)\s*\./g;
    while ((match = missingAtRegex.exec(text)) !== null) {
      // Check this is not already preceded by 'at'
      const precedingText = text.substring(Math.max(0, match.index - 4), match.index);
      if (!precedingText.includes("at")) {
        issues.push({
          ruleNumber: "NZLSG 3.1",
          message: `Footnote ${i + 1}: NZLSG requires 'at' before pinpoint references`,
          severity: "info",
          offset: match.index + 2,
          length: match[1].length,
          suggestion: `at ${match[1]}`,
        });
      }
    }

    // r 1.1.1(c): macrons in common te reo Māori terms; quoted text follows
    // the original and is left alone.
    const quoted = allQuotedSpans(text);
    for (const term of MAORI_TERMS_NEEDING_MACRONS) {
      const termRegex = new RegExp(`\\b${term.plain}\\b`, "g");
      while ((match = termRegex.exec(text)) !== null) {
        if (insideSpans(quoted, match.index)) {
          continue;
        }
        issues.push({
          ruleNumber: "NZLSG 1.1.1",
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
    const label = getCitationLabel(citation);

    // r 4.1.1(a): the short title is roman — only an explicit italic flag
    // can show a breach from the validator's plain-text inputs.
    if (citation.sourceType.startsWith("legislation.") && hasExplicitItalicTitle(citation)) {
      issues.push({
        ruleNumber: "NZLSG 4.1.1",
        message: `Legislation '${label}': NZLSG requires legislation titles in roman (not italic)`,
        severity: "warning",
        offset: 0,
        length: 0,
        citationId: citation.id,
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

    const label = getCitationLabel(citation);
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
 * Checks case citations for parallel citations, which AGLC4 prohibits for
 * Australian cases.
 *
 * For each `case.reported` citation that has parallel citations recorded,
 * flags a warning: only the most authoritative version of the case (chosen
 * under Rule 2.2.2) should be cited.
 *
 * This check applies to academic (AGLC) mode only — court practice
 * directions expect parallel citations, and court mode skips this check
 * (see `validateDocument` / `checkParallelCitationEnforcement`).
 *
 * @remarks AGLC4 Rule 2.2.7 (PDF p 79) — "Parallel citations should never
 * be given" for Australian cases; the guide's own example 80 rejects
 * '(1999) 198 CLR 180; 164 ALR 606; [1999] HCA 36'.
 */
export function checkParallelCitations(citations: Citation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const citation of citations) {
    if (citation.sourceType !== "case.reported") {
      continue;
    }

    const label = getCitationLabel(citation);
    const parallels = citation.data.parallelCitations as ParallelCitation[] | undefined;
    const hasParallels = Array.isArray(parallels) && parallels.length > 0;

    if (hasParallels) {
      issues.push({
        ruleNumber: "2.2.7",
        message:
          `Case '${label}': Rule 2.2.7 prohibits parallel citations for ` +
          "Australian cases — cite only the most authoritative report " +
          "(Rule 2.2.2). Remove the parallel citation(s), or switch to " +
          "court mode if a court practice direction requires them.",
        severity: "warning",
        offset: 0,
        length: 0,
        citationId: citation.id,
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
 * @remarks Court practice directions (eg Qld SC PD 1/2024). Note academic
 * AGLC4 style prohibits parallel citations for Australian cases (Rule
 * 2.2.7) — this enforcement applies to court-mode configurations only.
 */
export function checkParallelCitationEnforcement(
  citations: Citation[],
  mode: ConfigParallelCitationMode,
  ruleNumber: string = "Court practice direction"
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

    const label = getCitationLabel(citation);
    const parallels = citation.data.parallelCitations as ParallelCitation[] | undefined;
    const hasParallels = Array.isArray(parallels) && parallels.length > 0;

    if (!hasParallels) {
      issues.push({
        ruleNumber,
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

// ─── Rule 2.3.1: Medium neutral citation adoption-year check ────────────────

/**
 * Checks that medium neutral citations do not predate the year the court
 * began allocating its own judgment numbers.
 *
 * Rule 2.3.1 (PDF pp 79–81) tables the year each court adopted medium
 * neutral citation (eg HCA 1998, NSWSC 1999). The rule's note directs that
 * decisions before that year should not be given a medium neutral citation
 * — they are cited as unreported decisions under rule 2.3.2.
 *
 * Identifiers without a tabled adoption year (Appendix B entries) are not
 * checked.
 */
export function checkMncYearValidity(citations: Citation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const citation of citations) {
    if (citation.sourceType !== "case.unreported.mnc") {
      continue;
    }

    const d = citation.data;
    // Accept the same court-identifier aliases as the engine dispatcher.
    const code =
      (d.court as string) ?? (d.courtIdentifier as string) ?? (d.courtId as string) ?? "";
    const year = Number(d.year);

    if (code === "" || !Number.isInteger(year) || year <= 0) {
      continue;
    }

    const identifier = getCourtIdentifierByCode(code);
    if (identifier?.mncFrom === undefined || year >= identifier.mncFrom) {
      continue;
    }

    const label = getCitationLabel(citation);
    const num = d.caseNumber ?? d.mnc ?? d.judgmentNumber;
    const mnc = `[${year}] ${code}${num !== undefined && num !== "" ? ` ${num}` : ""}`;
    issues.push({
      ruleNumber: "2.3.1",
      message:
        `Case '${label}': '${mnc}' — the ${identifier.fullName} did not ` +
        `allocate medium neutral citations before ${identifier.mncFrom} ` +
        `(rule 2.3.1 table); cite the decision as unreported per rule 2.3.2`,
      severity: "warning",
      offset: 0,
      length: 0,
      citationId: citation.id,
    });
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
  "NSWCA",
  "NSWSC",
  "NSW_DISTRICT",
  "QCA",
  "QSC",
  "QLD_DISTRICT",
  "TASSC",
]);

/**
 * Jurisdictions where subsequent treatment recording is required.
 * Source: Qld SC PD 1/2024 cl 4(c).
 */
const SUBSEQUENT_TREATMENT_JURISDICTIONS: ReadonlySet<CourtJurisdiction> = new Set([
  "QCA",
  "QSC",
  "QLD_DISTRICT",
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
      // GPN-AUTH reissued 7 May 2025 (replaces Dec 2024)
      return "FCA GPN-AUTH (7 May 2025)";
    case "FCFCOA":
      // FAM-APPEALS practice direction, updated 10 Jun 2025
      return "FCFCOA FAM-APPEALS (10 Jun 2025)";
    case "NSWCA":
    case "NSWSC":
    case "NSW_DISTRICT":
      return "NSW SC PN Gen 20 (Oct 2023)";
    case "VSCA":
    case "VSC":
    case "VIC_COUNTY":
      // SC Gen 3 reissued 1 Dec 2025 (replaces 30 Jan 2017)
      return "Vic SC PN Gen 3 (1 Dec 2025)";
    case "QCA":
    case "QSC":
    case "QLD_DISTRICT":
      return "Qld SC PD 1 of 2024";
    case "WASC":
      // Consolidated Practice Directions updated 20 Jun 2025
      return "WA SC Consolidated PD 8.2.2 (20 Jun 2025)";
    case "SASC":
      // Uniform Civil Rules 2020 r 217.8, current to 15 Mar 2026
      return "SA Uniform Civil Rules 2020 r 217.8";
    case "TASSC":
      return "Tas SC PD 3/2014";
    case "ACTSC":
      // PD 2 of 2022 (26 May 2022)
      return "ACT SC PD 2 of 2022";
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
  formatting?: DocumentFormattingMetrics
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
      const label = getCitationLabel(citation);
      const reportSeries = d.reportSeries as string | undefined;
      const mncValue = d.mnc as string | undefined;
      const parallels = d.parallelCitations as ParallelCitation[] | undefined;
      const hasParallels = Array.isArray(parallels) && parallels.length > 0;

      const hasReport = typeof reportSeries === "string" && reportSeries.trim().length > 0;
      const hasMnc = typeof mncValue === "string" && mncValue.trim().length > 0;

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
  allIssues.push(...checkCourtSubsequentReferences(footnoteTexts, pdSource));

  // ── Warning: unreported judgment without confirmation ─────────────
  // COURT-FIX-006: Gate is now driven solely by config.unreportedGate
  // (which reflects the court toggle, including any user override).
  if (config.unreportedGate === "warn") {
    allIssues.push(...checkUnreportedJudgments(citations, pdSource));
  }

  // ── Info: subsequent treatment not recorded (Qld only) ─────────────
  if (SUBSEQUENT_TREATMENT_JURISDICTIONS.has(config.jurisdiction)) {
    for (const citation of citations) {
      if (!citation.sourceType.startsWith("case.")) {
        continue;
      }

      const label = getCitationLabel(citation);
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
    (c) => c.sourceType.startsWith("case.") || c.sourceType.startsWith("legislation.")
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

    const label = getCitationLabel(citation);
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

  return categoriseBySeverity(allIssues);
}

/**
 * Court-submission warnings for 'Ibid' and '(n X)' in footnotes: court
 * mode renders short-form subsequent references without either
 * (COURT-VALID-001; COURT-FIX-004 ibid suppression).
 *
 * @param pdSource - The practice direction the issues cite.
 */
export function checkCourtSubsequentReferences(
  footnoteTexts: string[],
  pdSource: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < footnoteTexts.length; i++) {
    const text = footnoteTexts[i];

    // Check for ibid
    const ibidRegex = /\bIbid\b/gi;
    let match: RegExpExecArray | null;
    while ((match = ibidRegex.exec(text)) !== null) {
      issues.push({
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
      issues.push({
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

  return issues;
}

/**
 * COURT-007 unreported-judgment gate: warns for each unreported (MNC)
 * judgment cited without the material-principle confirmation.
 *
 * @param pdSource - The practice direction the issues cite.
 */
export function checkUnreportedJudgments(
  citations: Citation[],
  pdSource: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const citation of citations) {
    if (citation.sourceType !== "case.unreported.mnc") {
      continue;
    }

    const label = getCitationLabel(citation);
    const confirmed =
      citation.data.unreportedConfirmed === true || citation.data.unreportedConfirmed === "true";

    if (!confirmed) {
      issues.push({
        ruleNumber: pdSource,
        message:
          `Case '${label}': Unreported judgment cited without confirmation ` +
          `that it contains a material statement of legal principle not found ` +
          `in reported authority`,
        severity: "warning",
        offset: 0,
        length: 0,
        citationId: citation.id,
      });
    }
  }

  return issues;
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
  formatting: DocumentFormattingMetrics
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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
    if (formatting.minFontSizePt !== undefined && formatting.minFontSizePt < 12) {
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
    if (formatting.minLineSpacing !== undefined && formatting.minLineSpacing < 1.5) {
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
    if (formatting.pageCount !== undefined && formatting.pageCount > hcaPageLimit) {
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
