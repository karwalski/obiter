/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Subsequent Reference Resolution (AGLC4 Rules 1.4.1–1.4.6)
 *
 * Pure functions for resolving subsequent references to citations that have
 * already appeared in the document. Handles ibid, short titles, within-footnote
 * references, and abbreviation definitions.
 */

import type { Citation, Pinpoint, SourceType } from "../types/citation";
import type { FormattedRun } from "../types/formattedRun";
import type { CitationConfig } from "./standards/types";

// ─── Source Type Classification ──────────────────────────────────────────────

/**
 * Returns true if the source type is a case (Part II, Chapter 2).
 */
function isCase(sourceType: SourceType): boolean {
  return sourceType.startsWith("case.");
}

/**
 * Returns true if the source type is legislation (Part II, Chapter 3).
 */
function isLegislation(sourceType: SourceType): boolean {
  return sourceType.startsWith("legislation.");
}

/**
 * Returns true if the source type is a secondary source (Part III+).
 * Any source that is neither a case nor legislation is treated as secondary.
 */
function isSecondarySource(sourceType: SourceType): boolean {
  return !isCase(sourceType) && !isLegislation(sourceType);
}

// ─── Pinpoint Formatting ─────────────────────────────────────────────────────

/** Pinpoint type prefixes per AGLC4 Rule 1.3. */
const PINPOINT_PREFIX: Record<Pinpoint["type"], string> = {
  page: "",
  paragraph: "",
  section: "s ",
  chapter: "ch ",
  part: "pt ",
  clause: "cl ",
  schedule: "sch ",
  article: "art ",
  regulation: "reg ",
  rule: "r ",
  footnote: "n ",
  column: "col ",
  line: "line ",
  division: "div ",
  appendix: "app ",
  subdivision: "sub-div ",
  subsection: "sub-s ",
  subclause: "sub-cl ",
  subparagraph: "sub-para ",
  subregulation: "sub-reg ",
  subrule: "sub-r ",
  order: "ord ",
  item: "item ",
};

/**
 * Formats a pinpoint reference into FormattedRun[].
 *
 * AGLC4 Rule 1.3: Pinpoint references use abbreviated labels followed by the
 * value. Pages and paragraphs have no prefix — paragraph values are wrapped
 * in square brackets by convention (stored in `value`).
 */
function formatPinpoint(pinpoint: Pinpoint): FormattedRun[] {
  const prefix = PINPOINT_PREFIX[pinpoint.type];
  const runs: FormattedRun[] = [{ text: `${prefix}${pinpoint.value}` }];

  if (pinpoint.subPinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(pinpoint.subPinpoint));
  }

  return runs;
}

/**
 * Returns true if two pinpoints are semantically equal.
 */
function pinpointsEqual(
  a: Pinpoint | undefined,
  b: Pinpoint | undefined,
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.type !== b.type || a.value !== b.value) return false;
  return pinpointsEqual(a.subPinpoint, b.subPinpoint);
}

// ─── Author Helpers ──────────────────────────────────────────────────────────

/**
 * Extracts the author surname from a Citation's data for use in short
 * references. Falls back to an empty string if no author is available.
 */
function getAuthorSurname(citation: Citation): string {
  const data = citation.data;
  if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
    const first = data.authors[0] as { surname?: string };
    return first.surname ?? "";
  }
  if (data.author && typeof data.author === "object") {
    const author = data.author as { surname?: string };
    return author.surname ?? "";
  }
  if (typeof data.authorSurname === "string") {
    return data.authorSurname;
  }
  return "";
}

/**
 * Extracts a title or short title from the citation, for disambiguation or
 * use in short references.
 */
function getTitle(citation: Citation): string {
  if (citation.shortTitle) return citation.shortTitle;
  if (typeof citation.data.shortTitle === "string") return citation.data.shortTitle;
  if (typeof citation.data.title === "string") return citation.data.title;
  if (typeof citation.data.name === "string") return citation.data.name;
  return "";
}

// ─── GEN-007: Short References (Rule 1.4.1) ─────────────────────────────────

/**
 * Formats a short (subsequent) reference to a citation.
 *
 * AGLC4 Rule 1.4.1: After the first full citation, subsequent references use
 * a shortened form with a cross-reference back to the first footnote.
 *
 * - Secondary sources: `Author Surname (n X) pinpoint.`
 * - Cases: `Short Title (n X) pinpoint.`
 * - Legislation: `Short Title (n X) pinpoint.`
 *
 * NZLSG Rule 2.3: Uses "above n X, at pinpoint" format when
 * `config.subsequentReferenceFormat === "above n"`.
 *
 * When multiple works by the same author exist (indicated by
 * `disambiguate = true`), the title/short title is included after the
 * surname to distinguish between works.
 *
 * @param citation - The citation being referenced
 * @param firstFootnoteNumber - The footnote number where the citation first appeared
 * @param pinpoint - Optional pinpoint for the subsequent reference
 * @param disambiguate - Whether to include the title for disambiguation
 * @param config - Optional citation config for multi-standard support
 */
export function formatShortReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint?: Pinpoint,
  disambiguate?: boolean,
  config?: CitationConfig,
): FormattedRun[] {
  const format = config?.subsequentReferenceFormat ?? "n";
  const pinpointPrefix = config?.pinpointPrefix ?? "";

  // NZLSG "above n" format: Author, above n X, at pinpoint
  if (format === "above n") {
    return formatAboveNReference(
      citation,
      firstFootnoteNumber,
      pinpoint,
      disambiguate,
      pinpointPrefix,
    );
  }

  // AGLC4 / OSCOLA "n" format: Author (n X) pinpoint
  const runs: FormattedRun[] = [];

  if (isSecondarySource(citation.sourceType)) {
    // Secondary sources: Author Surname (n X) pinpoint.
    const surname = getAuthorSurname(citation);
    if (surname) {
      runs.push({ text: surname });
    }

    if (disambiguate) {
      const title = getTitle(citation);
      if (title) {
        // Include short title in single quotes after surname
        runs.push({ text: ", " });
        runs.push({ text: `'${title}'` });
      }
    }

    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else if (isCase(citation.sourceType)) {
    // Cases: Short Title (n X) pinpoint.
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  } else if (isLegislation(citation.sourceType)) {
    // Legislation: Short Title (n X) pinpoint.
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  }

  if (pinpoint) {
    runs.push({ text: " " });
    if (pinpointPrefix) {
      runs.push({ text: pinpointPrefix });
    }
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Formats a short reference in NZLSG "above n" style.
 *
 * NZLSG Rule 2.3: `Author, above n X, at pinpoint` — note comma after
 * author/title, `above` keyword before footnote number, `at` before pinpoint.
 */
function formatAboveNReference(
  citation: Citation,
  firstFootnoteNumber: number,
  pinpoint?: Pinpoint,
  disambiguate?: boolean,
  pinpointPrefix: string = "",
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (isSecondarySource(citation.sourceType)) {
    const surname = getAuthorSurname(citation);
    if (surname) {
      runs.push({ text: surname });
    }

    if (disambiguate) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push({ text: `'${title}'` });
      }
    }
  } else if (isCase(citation.sourceType)) {
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
  } else if (isLegislation(citation.sourceType)) {
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
  }

  runs.push({ text: `, above n ${firstFootnoteNumber}` });

  if (pinpoint) {
    runs.push({ text: ", " });
    if (pinpointPrefix) {
      runs.push({ text: pinpointPrefix });
    }
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

// ─── GEN-008: Ibid (Rule 1.4.3) ─────────────────────────────────────────────

/**
 * Resolves an ibid reference.
 *
 * AGLC4 Rule 1.4.3: 'Ibid' refers to the immediately preceding source.
 *
 * - If pinpoints match (or both absent): returns `Ibid`
 * - If pinpoints differ: returns `Ibid pinpoint`
 *
 * Ibid is NOT used when:
 * - The preceding footnote has multiple sources
 * - The current citation has no pinpoint but the preceding had one
 *
 * These guards are enforced by the caller (`resolveSubsequentReference`).
 *
 * @param currentPinpoint - Pinpoint for the current reference
 * @param precedingPinpoint - Pinpoint from the preceding reference
 */
export function resolveIbid(
  currentPinpoint?: Pinpoint,
  precedingPinpoint?: Pinpoint,
): FormattedRun[] {
  if (pinpointsEqual(currentPinpoint, precedingPinpoint)) {
    return [{ text: "Ibid" }];
  }

  if (currentPinpoint) {
    return [{ text: "Ibid " }, ...formatPinpoint(currentPinpoint)];
  }

  // Current has no pinpoint but preceding did — should not reach here
  // if caller enforces ibid eligibility correctly, but handle defensively.
  return [{ text: "Ibid" }];
}

// ─── GEN-009: Short Title Introduction (Rule 1.4.4) ─────────────────────────

/**
 * Formats the short title introduction appended after the first full citation.
 *
 * AGLC4 Rule 1.4.4: A short title is introduced in parentheses after the
 * first citation so readers can recognise it in subsequent references.
 *
 * - Cases: `('short title')` — short title in italics inside single quotes,
 *   parentheses not italic
 * - Legislation: `('short title')` — short title in italics
 * - Secondary sources: `('short title')` — single quotes, not italic
 *
 * @param shortTitle - The short title to introduce
 * @param sourceType - The source type (determines formatting)
 */
export function formatShortTitleIntroduction(
  shortTitle: string,
  sourceType: SourceType,
): FormattedRun[] {
  if (isCase(sourceType)) {
    // Cases: ('Short Title') — title italic inside quotes, parens not italic
    return [
      { text: "('" },
      { text: shortTitle, italic: true },
      { text: "')" },
    ];
  }

  if (isLegislation(sourceType)) {
    // Legislation: ('Short Title') — title italic
    return [
      { text: "('" },
      { text: shortTitle, italic: true },
      { text: "')" },
    ];
  }

  // Secondary sources: ('Short Title') — not italic
  return [{ text: `('${shortTitle}')` }];
}

// ─── GEN-010: Within-Footnote Subsequent References (Rule 1.4.6) ─────────────

/**
 * Formats a within-footnote subsequent reference using `at` format.
 *
 * AGLC4 Rule 1.4.6: When referring to the same source again within the same
 * footnote, use `at [pinpoint]` rather than a full or short reference.
 *
 * @param pinpoint - The pinpoint for the within-footnote reference
 */
export function formatWithinFootnoteReference(
  pinpoint: Pinpoint,
): FormattedRun[] {
  const pinpointRuns = formatPinpoint(pinpoint);
  return [{ text: "at " }, ...pinpointRuns];
}

// ─── GEN-011: Abbreviation Definitions (Rule 1.4.5) ─────────────────────────

/**
 * Formats an abbreviation definition in parentheses.
 *
 * AGLC4 Rule 1.4.5: When defining an abbreviation for subsequent use,
 * it appears in parentheses after the full citation, e.g., `('ADJR Act')`.
 *
 * @param abbreviation - The abbreviation to define
 */
export function formatAbbreviationDefinition(
  abbreviation: string,
): FormattedRun[] {
  return [{ text: `('${abbreviation}')` }];
}

// ─── RESEARCH-002: Cross-Reference Formatting (Rule 1.4.2) ───────────────────

/**
 * Formats an "above n" cross-reference.
 *
 * AGLC4 Rule 1.4.2: When referring to a source cited in an earlier footnote,
 * the cross-reference takes the form `above n X` or `above n X, pinpoint`.
 *
 * @param footnoteNumber - The footnote number being referred to
 * @param pinpoint - Optional pinpoint for the cross-reference
 */
export function formatAboveReference(
  footnoteNumber: number,
  pinpoint?: Pinpoint,
): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: `above n ${footnoteNumber}` }];

  if (pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

/**
 * Formats a "below n" cross-reference.
 *
 * AGLC4 Rule 1.4.2: When referring to a source cited in a later footnote,
 * the cross-reference takes the form `below n X` or `below n X, pinpoint`.
 * This is architecturally impossible in forward-only processors like CSL,
 * but Obiter processes the whole document so it can support forward references.
 *
 * @param footnoteNumber - The footnote number being referred to
 * @param pinpoint - Optional pinpoint for the cross-reference
 */
export function formatBelowReference(
  footnoteNumber: number,
  pinpoint?: Pinpoint,
): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: `below n ${footnoteNumber}` }];

  if (pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

// ─── Subsequent Reference Context ────────────────────────────────────────────

/**
 * Context required to determine how a subsequent reference should be rendered.
 */
export interface SubsequentReferenceContext {
  /** Whether this is the first citation of this source in the document. */
  isFirstCitation: boolean;
  /** Whether this citation refers to the same source as the preceding footnote. */
  isSameAsPreceding: boolean;
  /** Number of citations in the preceding footnote. */
  precedingFootnoteCitationCount: number;
  /** Pinpoint from the preceding reference to this source. */
  precedingPinpoint?: Pinpoint;
  /** Pinpoint for the current reference. */
  currentPinpoint?: Pinpoint;
  /** The footnote number where this source was first cited. */
  firstFootnoteNumber: number;
  /** Whether this is a second (or later) reference within the same footnote. */
  isWithinSameFootnote: boolean;
  /** Explicit format preference. `"auto"` uses the priority logic. */
  formatPreference: "full" | "short" | "ibid" | "auto";
  /** Whether multiple works by the same author exist, requiring disambiguation. */
  disambiguate?: boolean;
  /**
   * Direction for cross-references (Rule 1.4.2).
   *
   * - `"auto"`: The resolver determines direction based on footnote ordering
   *   (not yet implemented — defaults to standard short reference behaviour).
   * - `"above"`: Force an "above n X" cross-reference.
   * - `"below"`: Force a "below n X" cross-reference.
   */
  crossReferenceDirection?: "auto" | "above" | "below";
  /**
   * Optional citation config for multi-standard support (MULTI-004/005).
   * When provided, controls subsequent reference format and ibid behaviour.
   */
  config?: CitationConfig;
}

// ─── Main Resolver ───────────────────────────────────────────────────────────

/**
 * Resolves how a subsequent reference should be formatted.
 *
 * AGLC4 Rules 1.4.1–1.4.6: The resolver follows this priority:
 * 1. If first citation → return `null` (caller renders the full citation)
 * 2. If within same footnote → use `at` format (Rule 1.4.6)
 * 3. If ibid eligible → use ibid (Rule 1.4.3)
 * 4. Otherwise → use short reference (Rule 1.4.1)
 *
 * When `formatPreference` is not `"auto"`, the specified format is used
 * directly, bypassing the priority logic (except for first citations, which
 * always return `null`).
 *
 * @param citation - The citation being referenced
 * @param context - Resolution context with document-level state
 * @returns Formatted runs for the subsequent reference, or `null` if this is
 *   the first citation (caller should render the full citation instead)
 */
export function resolveSubsequentReference(
  citation: Citation,
  context: SubsequentReferenceContext,
): FormattedRun[] | null {
  // 1. First citation — caller renders full
  if (context.isFirstCitation) {
    return null;
  }

  const config = context.config;
  const ibidEnabled = config?.ibidEnabled ?? true;

  // Explicit format preferences override auto logic
  if (context.formatPreference !== "auto") {
    switch (context.formatPreference) {
      case "full":
        return null;
      case "ibid":
        // If ibid is disabled by config, fall through to short reference
        if (!ibidEnabled) {
          return formatShortReference(
            citation,
            context.firstFootnoteNumber,
            context.currentPinpoint,
            context.disambiguate,
            config,
          );
        }
        return resolveIbid(context.currentPinpoint, context.precedingPinpoint);
      case "short":
        return formatShortReference(
          citation,
          context.firstFootnoteNumber,
          context.currentPinpoint,
          context.disambiguate,
          config,
        );
    }
  }

  // 2. Within same footnote — use `at` format (Rule 1.4.6)
  if (context.isWithinSameFootnote && context.currentPinpoint) {
    return formatWithinFootnoteReference(context.currentPinpoint);
  }

  // 3. Ibid eligible (Rule 1.4.3)
  //    - Same source as preceding footnote
  //    - Preceding footnote had exactly 1 citation
  //    - If preceding had a pinpoint but current doesn't, ibid is not used
  //    - Ibid must be enabled by config (MULTI-005)
  const ibidEligible =
    ibidEnabled &&
    context.isSameAsPreceding &&
    context.precedingFootnoteCitationCount === 1 &&
    !(context.precedingPinpoint !== undefined && context.currentPinpoint === undefined);

  if (ibidEligible) {
    return resolveIbid(context.currentPinpoint, context.precedingPinpoint);
  }

  // 4. Short reference (Rule 1.4.1)
  return formatShortReference(
    citation,
    context.firstFootnoteNumber,
    context.currentPinpoint,
    context.disambiguate,
    config,
  );
}
