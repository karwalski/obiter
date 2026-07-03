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
import { formatLegislationPinpoint } from "./rules/v4/domestic/legislation";
import { shouldItaliciseTitle } from "./rules/v4/general/italicisation";
import { parseTitleMarkup, quoteTitleRuns } from "./rules/v4/general/titleMarkup";
import {
  formatInternationalShortReference,
  internationalLeadsWithShortTitle,
  internationalShortTitleStyle,
  styleInternationalShortTitle,
} from "./rules/v4/international/subsequent";
import { formatSecondaryShortTitle } from "./rules/v4/secondary/general";

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
function pinpointsEqual(a: Pinpoint | undefined, b: Pinpoint | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  if (a.type !== b.type || a.value !== b.value) return false;
  return pinpointsEqual(a.subPinpoint, b.subPinpoint);
}

// ─── Author Helpers ──────────────────────────────────────────────────────────

/** Matches CJK ideographs (Chinese-script names, Rule 16.4.2). */
const CJK_CHAR = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Returns the full name for a Chinese-script structured author, in source
 * order (surname first — AGLC4 Rule 16.4.2 note band), or undefined when
 * the name is not in Chinese characters.
 *
 * AGLC4 Rule 16.4.2: subsequent references to Chinese language sources
 * always carry the author's full name (characters plus any pinyin
 * transliteration), never the surname alone.
 */
function chineseScriptFullName(author: {
  surname?: string;
  givenNames?: string;
}): string | undefined {
  const surname = author.surname ?? "";
  const givenNames = author.givenNames ?? "";
  if (!CJK_CHAR.test(surname) && !CJK_CHAR.test(givenNames)) {
    return undefined;
  }
  if (!givenNames) return surname || undefined;
  if (!surname) return givenNames;
  // Characters run together without a space; a pinyin element keeps one.
  const joiner = CJK_CHAR.test(surname.slice(-1)) && CJK_CHAR.test(givenNames.charAt(0)) ? "" : " ";
  return `${surname}${joiner}${givenNames}`;
}

/**
 * Extracts the author surname from a Citation's data for use in short
 * references. Falls back to an empty string if no author is available.
 *
 * AGLC4 Rule 16.4.2: authors named in Chinese characters keep their full
 * name (with any pinyin transliteration) in subsequent references.
 */
function getAuthorSurname(citation: Citation): string {
  const data = citation.data;
  // Structured authors array (journal articles, books)
  if (data.authors && Array.isArray(data.authors) && data.authors.length > 0) {
    const first = data.authors[0] as { surname?: string; givenNames?: string };
    return chineseScriptFullName(first) ?? first.surname ?? "";
  }
  // Structured author object
  if (data.author && typeof data.author === "object") {
    const author = data.author as { surname?: string; givenNames?: string };
    return chineseScriptFullName(author) ?? author.surname ?? "";
  }
  // Plain string author (reports, speeches, press releases, etc.)
  if (typeof data.author === "string" && data.author) {
    return data.author;
  }
  // Institutional author
  if (typeof data.institutionalAuthor === "string" && data.institutionalAuthor) {
    return data.institutionalAuthor;
  }
  if (typeof data.authorSurname === "string") {
    return data.authorSurname;
  }
  return "";
}

/**
 * Formats the leading element of a short reference to a secondary source:
 * the author surname, or — for authorless/body-authored sources — the short
 * title styled per Rule 1.4.1.
 *
 * AGLC4 Rule 1.4.1 (guide ex 55): a report short title standing in for a
 * body author is italicised: *Traditional Rights and Freedoms* (n 52).
 */
function formatSecondaryLead(citation: Citation): FormattedRun[] {
  const surname = getAuthorSurname(citation);
  if (surname) {
    return [{ text: surname }];
  }
  // Fall back to the (styled) short title for body-authored sources
  const title = getTitle(citation);
  if (title) {
    return formatStyledShortTitle(title, citation.sourceType);
  }
  return [];
}

/**
 * Extracts a title or short title from the citation, for disambiguation or
 * use in short references.
 */
function getTitle(citation: Citation): string {
  if (citation.shortTitle) return citation.shortTitle;
  if (typeof citation.data.shortTitle === "string") return citation.data.shortTitle;
  // Document-led sources (ICJ pleadings, rule 10.5 ex 42) shorten to the
  // document title, not the case name.
  if (typeof citation.data.documentTitle === "string") return citation.data.documentTitle;
  // Case-like sources store their name under caseTitle/caseName/parties
  // (mirroring the dispatch layer's field fallbacks).
  if (typeof citation.data.caseTitle === "string") return citation.data.caseTitle;
  if (typeof citation.data.caseName === "string") return citation.data.caseName;
  if (typeof citation.data.title === "string") return citation.data.title;
  if (typeof citation.data.name === "string") return citation.data.name;
  if (typeof citation.data.parties === "string") return citation.data.parties;
  return "";
}

/**
 * Styles a title or short title used in a subsequent reference the same way
 * the title appeared in the first citation.
 *
 * AGLC4 Rule 1.4.1: the disambiguating title/short title is "styled the same
 * way" as in the first citation — italics for italic-titled sources (books,
 * reports, cases, Acts; guide ex 61: Rubenstein, *Australian Citizenship Law
 * in Context* (n 59)), single inverted commas for articles/chapters.
 *
 * AGLC4 Rules 3.2/3.5: Bill titles are not italicised, so a Bill short title
 * is roman in subsequent references.
 *
 * AGLC4 Rules 8.8/9.5/10.5/11.3/12.4/13.4/14.6: Part IV short titles are
 * italic (treaties, UN/WTO/GATT documents, decisions of international
 * courts and tribunals) or quoted (ICJ pleadings, UN yearbook material).
 */
function formatStyledShortTitle(title: string, sourceType: SourceType): FormattedRun[] {
  const international = styleInternationalShortTitle(title, sourceType);
  if (international !== null) {
    return international;
  }
  // Rule 4.2 via DECISION-021: embedded-italic markers in stored short
  // titles are honoured — italic spans inside roman short titles; markers
  // consumed (span stays italic) inside wholly italic short titles.
  if (sourceType === "legislation.bill") {
    return parseTitleMarkup(title, false);
  }
  if (shouldItaliciseTitle(sourceType)) {
    return parseTitleMarkup(title, true);
  }
  return quoteTitleRuns(parseTitleMarkup(title, false));
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
  config?: CitationConfig
): FormattedRun[] {
  const format = config?.subsequentReferenceFormat ?? "n";
  const pinpointPrefix = config?.pinpointPrefix ?? "";

  // MULTI-014: Court mode — short name only, no (n X) cross-reference
  if (config?.writingMode === "court") {
    return formatCourtShortReference(citation, pinpoint, disambiguate);
  }

  // NZLSG "above n" format: Author, above n X, at pinpoint
  if (format === "above n") {
    return formatAboveNReference(
      citation,
      firstFootnoteNumber,
      pinpoint,
      disambiguate,
      pinpointPrefix
    );
  }

  // AGLC4 / OSCOLA "n" format: Author (n X) pinpoint
  const runs: FormattedRun[] = [];

  // Part IV international materials lead with the styled short title plus
  // any chapter-specific elements (Rules 8.8/9.5/10.5/11.3/12.4/13.4/14.6);
  // authored rule 9.3.2 submissions fall through to the secondary form.
  const internationalLead = formatInternationalShortReference(
    citation,
    firstFootnoteNumber,
    getTitle(citation)
  );
  if (internationalLead !== null) {
    runs.push(...internationalLead);
  } else if (isSecondarySource(citation.sourceType)) {
    // Secondary sources: Author Surname (n X) pinpoint.
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));

    // Rule 1.4.1: multiple works by the same author — append the title,
    // styled the same way it appeared in the first citation (guide ex 61:
    // Rubenstein, *Australian Citizenship Law in Context* (n 59)).
    if (disambiguate && surname) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
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
    // Legislation: Short Title (n X) pinpoint. Rules 3.2/3.5: italic for
    // Acts/delegated legislation, roman for Bills.
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
    runs.push({ text: ` (n ${firstFootnoteNumber})` });
  }

  if (pinpoint) {
    runs.push({ text: " " });
    if (pinpointPrefix) {
      runs.push({ text: pinpointPrefix });
    }
    // AUDIT2-020: Use legislation-specific pinpoint formatting (singular/plural
    // abbreviations like s/ss, reg/regs, cl/cll) for legislation citations
    // instead of the general pinpoint formatter (Rule 3.5).
    if (isLegislation(citation.sourceType)) {
      runs.push(...formatLegislationPinpoint(pinpoint));
    } else {
      runs.push(...formatPinpoint(pinpoint));
    }
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
  pinpointPrefix: string = ""
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (internationalLeadsWithShortTitle(citation)) {
    // Part IV materials lead with the styled short title (Rules 8.8–14.6)
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
  } else if (isSecondarySource(citation.sourceType)) {
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));

    if (disambiguate && surname) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }
  } else if (isCase(citation.sourceType)) {
    const title = getTitle(citation);
    if (title) {
      runs.push({ text: title, italic: true });
    }
  } else if (isLegislation(citation.sourceType)) {
    // Rules 3.2/3.5: italic for Acts/delegated legislation, roman for Bills.
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
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
 * Formats a court-mode short reference: short case name or author surname
 * followed by an optional pinpoint. No footnote cross-reference `(n X)`.
 *
 * MULTI-014: In court submissions, every subsequent reference uses the short
 * case name (or author surname for secondary sources) without ibid and
 * without footnote cross-references.
 */
function formatCourtShortReference(
  citation: Citation,
  pinpoint?: Pinpoint,
  disambiguate?: boolean
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (isSecondarySource(citation.sourceType) && !internationalLeadsWithShortTitle(citation)) {
    const surname = getAuthorSurname(citation);
    runs.push(...formatSecondaryLead(citation));
    if (disambiguate && surname) {
      const title = getTitle(citation);
      if (title) {
        runs.push({ text: ", " });
        runs.push(...formatStyledShortTitle(title, citation.sourceType));
      }
    }
  } else {
    // Cases and legislation: use short title, italic per Rule 1.8.2
    // (roman for Bills per Rules 3.2/3.5)
    const title = getTitle(citation);
    if (title) {
      runs.push(...formatStyledShortTitle(title, citation.sourceType));
    }
  }

  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(pinpoint));
  }

  return runs;
}

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
  precedingPinpoint?: Pinpoint
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

/**
 * Wraps title runs in roman parentheses, merging each parenthesis into its
 * adjacent run when that run is roman — so an unmarked (single-roman-run)
 * short title round-trips byte-for-byte with the pre-markup output.
 */
function wrapRunsInParens(runs: FormattedRun[]): FormattedRun[] {
  if (runs.length === 0) {
    return [{ text: "()" }];
  }
  const wrapped = runs.map((run) => ({ ...run }));
  const first = wrapped[0];
  if (first.italic) {
    wrapped.unshift({ text: "(" });
  } else {
    first.text = "(" + first.text;
  }
  const last = wrapped[wrapped.length - 1];
  if (last.italic) {
    wrapped.push({ text: ")" });
  } else {
    last.text += ")";
  }
  return wrapped;
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
 * - Legislation: `('short title')` — short title in italics for Acts and
 *   delegated legislation; roman for Bills (Rules 3.2/3.5)
 * - Secondary sources: `('short title')` — italic iff the source's title is
 *   italic (Rule 4.3: books/reports italic, articles/chapters roman)
 *
 * @param shortTitle - The short title to introduce
 * @param sourceType - The source type (determines formatting)
 */
export function formatShortTitleIntroduction(
  shortTitle: string,
  sourceType: SourceType
): FormattedRun[] {
  // Part IV international materials: the introduced short title carries the
  // styling its chapter's subsequent-reference rule prescribes — italic for
  // treaties/UN docs/decisions (rule 8.8 ex 20: ('Timor Gap Treaty') with
  // the title italic; rule 10.5 ex 36: ('Reparations')), quoted roman for
  // ICJ pleadings and UN yearbook material (via the fallthrough below).
  // Rule 4.2 via DECISION-021: embedded-italic markers in the stored short
  // title are consumed here exactly as in the subsequent-reference path
  // (formatStyledShortTitle), keeping the two renderings consistent.
  if (internationalShortTitleStyle(sourceType) === "italic") {
    return [{ text: "(‘" }, ...parseTitleMarkup(shortTitle, true), { text: "’)" }];
  }

  if (isCase(sourceType)) {
    // Cases: ('Short Title') — title italic inside curly quotes, parens not italic
    return [{ text: "(\u2018" }, ...parseTitleMarkup(shortTitle, true), { text: "\u2019)" }];
  }

  if (isLegislation(sourceType)) {
    // Rule 3.5: Bill short titles are roman (Rule 3.2); Acts and delegated
    // legislation short titles are italic
    if (sourceType === "legislation.bill") {
      return wrapRunsInParens(quoteTitleRuns(parseTitleMarkup(shortTitle, false)));
    }
    return [{ text: "(\u2018" }, ...parseTitleMarkup(shortTitle, true), { text: "\u2019)" }];
  }

  // Secondary sources: Rule 4.3 (via Rule 1.4.4) — the short title is italic
  // iff the source's title is italic (AGLC4 ch 4 ex 27: ('ISDS 2016 Review'
  // with the title italic, for a report); articles/chapters stay roman
  return formatSecondaryShortTitle(shortTitle, sourceType);
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
export function formatWithinFootnoteReference(pinpoint: Pinpoint): FormattedRun[] {
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
export function formatAbbreviationDefinition(abbreviation: string): FormattedRun[] {
  return [{ text: `(\u2018${abbreviation}\u2019)` }];
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
export function formatAboveReference(footnoteNumber: number, pinpoint?: Pinpoint): FormattedRun[] {
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
export function formatBelowReference(footnoteNumber: number, pinpoint?: Pinpoint): FormattedRun[] {
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
  /**
   * Whether the IMMEDIATELY preceding citation in the same footnote is the
   * same source (Rule 1.4.6: 'at' may only refer to the immediately
   * preceding source — an earlier, non-adjacent source in the footnote is
   * cited via the Rule 1.4.1 `(n X)` form instead).
   */
  isWithinSameFootnote: boolean;
  /** Explicit format preference. `"auto"` uses the priority logic. */
  formatPreference: "full" | "short" | "ibid" | "auto";
  /** Whether multiple works by the same author exist, requiring disambiguation. */
  disambiguate?: boolean;
  /** The current footnote number (needed for cross-reference direction). */
  footnoteNumber?: number;
  /**
   * Direction for cross-references (Rule 1.4.2).
   *
   * - `"auto"`: The resolver determines direction by comparing
   *   `firstFootnoteNumber` to `footnoteNumber`.
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
  context: SubsequentReferenceContext
): FormattedRun[] | null {
  // Explanatory notes always render in full — no ibid or short ref
  if (citation.sourceType === "explanatory_note") {
    return null;
  }

  // 1. First citation — caller renders full
  if (context.isFirstCitation) {
    return null;
  }

  const config = context.config;
  // COURT-FIX-004: ibidSuppressionMode toggle controls ibid instead of hardcoded court check
  const ibidEnabled = config?.ibidSuppressionMode === "on" ? false : (config?.ibidEnabled ?? true);

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
            config
          );
        }
        return resolveIbid(context.currentPinpoint, context.precedingPinpoint);
      case "short":
        return formatShortReference(
          citation,
          context.firstFootnoteNumber,
          context.currentPinpoint,
          context.disambiguate,
          config
        );
    }
  }

  // 2. Immediately preceding source in the same footnote — use `at` format
  //    (Rule 1.4.6). The caller sets isWithinSameFootnote only when the
  //    immediately preceding citation in the footnote is the same source;
  //    a pinpoint to an earlier, non-adjacent source falls through to the
  //    Rule 1.4.1 short form below (eg 'Brennan Jr (n 94) 430').
  //    Repeating `at` for an identical consecutive pinpoint is permitted:
  //    Rule 1.4.6 says the repetition "is not necessary", not prohibited.
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

  // 4. Cross-reference direction (Rule 1.4.2)
  //    When crossReferenceDirection is explicitly "above" or "below", or "auto"
  //    with a known footnoteNumber, render the directional cross-reference
  //    instead of the standard short reference.
  const direction = context.crossReferenceDirection;
  if (direction === "above") {
    return formatAboveReference(context.firstFootnoteNumber, context.currentPinpoint);
  }
  if (direction === "below") {
    return formatBelowReference(context.firstFootnoteNumber, context.currentPinpoint);
  }
  if (direction === "auto" && context.footnoteNumber !== undefined) {
    if (context.firstFootnoteNumber < context.footnoteNumber) {
      return formatAboveReference(context.firstFootnoteNumber, context.currentPinpoint);
    }
    if (context.firstFootnoteNumber > context.footnoteNumber) {
      return formatBelowReference(context.firstFootnoteNumber, context.currentPinpoint);
    }
    // firstFootnoteNumber === footnoteNumber: same footnote, fall through to short reference
  }

  // 5. Short reference (Rule 1.4.1)
  return formatShortReference(
    citation,
    context.firstFootnoteNumber,
    context.currentPinpoint,
    context.disambiguate,
    config
  );
}
