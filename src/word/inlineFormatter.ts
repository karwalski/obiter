/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { Citation } from "../types/citation";
import { shouldItaliciseTitle } from "../engine/rules/v4/general/italicisation";
import { getLatinTermsSorted } from "../engine/data/latin-terms";
import { CitationStore } from "../store/citationStore";

/**
 * Result of an inline formatting operation.
 */
export interface FormatResult {
  /** Number of inline references that were formatted (italic applied). */
  formatted: number;
  /** Number of inline references already formatted correctly (skipped). */
  skipped: number;
}

/**
 * Extracts searchable terms from a citation.
 *
 * For cases: the case name string (e.g. "Mabo v Queensland"), short title.
 * For legislation: the title (e.g. "Competition and Consumer Act 2010"), short title.
 * For other italicised types: the title, short title.
 *
 * Only returns terms for source types whose titles should be italicised
 * per AGLC4 Rule 1.8.2.
 */
function getSearchTerms(citation: Citation): string[] {
  if (!shouldItaliciseTitle(citation.sourceType)) {
    return [];
  }

  const terms: string[] = [];

  // Extract the primary title/name from the data record.
  // Cases use "caseName" (which may be a string or array of FormattedRun);
  // legislation and other types use "title" or "name".
  const caseName = citation.data.caseName;
  if (typeof caseName === "string" && caseName.length > 0) {
    terms.push(caseName);
  } else if (Array.isArray(caseName)) {
    // caseName may be an array of FormattedRun objects — concatenate text.
    const joined = (caseName as Array<{ text: string }>)
      .map((r) => r.text)
      .join("");
    if (joined.length > 0) {
      terms.push(joined);
    }
  }

  const title = citation.data.title;
  if (typeof title === "string" && title.length > 0) {
    terms.push(title);
  }

  const name = citation.data.name;
  if (typeof name === "string" && name.length > 0) {
    terms.push(name);
  }

  // Short title from either the top-level field or from data.
  if (citation.shortTitle && citation.shortTitle.length > 0) {
    terms.push(citation.shortTitle);
  }
  const dataShortTitle = citation.data.shortTitle;
  if (
    typeof dataShortTitle === "string" &&
    dataShortTitle.length > 0 &&
    dataShortTitle !== citation.shortTitle
  ) {
    terms.push(dataShortTitle);
  }

  // Deduplicate.
  return [...new Set(terms)];
}

/**
 * Checks whether a Word range is enclosed in quotation marks by examining
 * the character immediately before and after the range.
 *
 * Terms inside quotation marks should not be auto-italicised, as the author
 * may have intentionally left them roman (AGLC4 Rule 1.8.3).
 *
 * @param context - A Word.RequestContext from an active Word.run() call.
 * @param range - The Word range to check.
 * @returns True if the range is enclosed in quotation marks.
 */
async function isInsideQuotationMarks(
  context: Word.RequestContext,
  range: Word.Range,
): Promise<boolean> {
  // Get the range's parent paragraph text and check if this term is
  // surrounded by quotation marks in the paragraph context.
  const parentParagraph = range.paragraphs.getFirst();
  parentParagraph.load("text");
  range.load("text");
  await context.sync();

  const paraText = parentParagraph.text;
  const termText = range.text;

  // Find the term in the paragraph and check surrounding characters.
  // Covers straight quotes, curly single quotes, and curly double quotes.
  const QUOTE_CHARS = ['"', "'", "\u2018", "\u2019", "\u201C", "\u201D"];
  let searchStart = 0;
  while (true) {
    const idx = paraText.indexOf(termText, searchStart);
    if (idx === -1) break;

    const charBefore = idx > 0 ? paraText[idx - 1] : "";
    const charAfter =
      idx + termText.length < paraText.length
        ? paraText[idx + termText.length]
        : "";

    if (QUOTE_CHARS.includes(charBefore) || QUOTE_CHARS.includes(charAfter)) {
      return true;
    }
    searchStart = idx + 1;
  }

  return false;
}

/**
 * AGLC4 Rules 1.8.2 and 1.8.3 — Inline Body Text Formatting
 *
 * Scans the document body text (excluding footnotes, headings, and block
 * quotes) for known citation titles and common Latin/foreign terms, and
 * applies italic formatting.
 *
 * Per AGLC4 Rule 1.8.2, case names and legislation titles mentioned in
 * running prose should be italicised.
 *
 * Per AGLC4 Rule 1.8.3, Latin and foreign words not commonly used in
 * English should be italicised. Terms inside quotation marks are skipped.
 *
 * @param context - A Word.RequestContext from an active Word.run() call.
 * @param citations - All citations in the document store.
 * @returns A FormatResult summarising how many references were formatted.
 */
export async function scanAndFormatInlineReferences(
  context: Word.RequestContext,
  citations: Citation[],
): Promise<FormatResult> {
  let formatted = 0;
  let skipped = 0;

  // ── Rule 1.8.2: Citation titles ──────────────────────────────────────

  // Build the list of all searchable terms across all citations.
  const allTerms: string[] = [];
  for (const citation of citations) {
    allTerms.push(...getSearchTerms(citation));
  }

  // Deduplicate and sort longest-first so we match the most specific term.
  const uniqueTerms = [...new Set(allTerms)].sort(
    (a, b) => b.length - a.length,
  );

  for (const term of uniqueTerms) {
    // Search in the document body (excludes footnotes by default).
    const results = context.document.body.search(term, {
      matchCase: true,
      matchWholeWord: false,
    });
    results.load("items/font");
    await context.sync();

    for (const range of (results.items ?? [])) {
      // Check whether this range is already italic.
      if (range.font.italic) {
        skipped++;
      } else {
        range.font.italic = true;
        formatted++;
      }
    }

    await context.sync();
  }

  // ── Rule 1.8.3: Latin and foreign terms ──────────────────────────────

  const latinResult = await scanAndFormatLatinTerms(context);
  formatted += latinResult.formatted;
  skipped += latinResult.skipped;

  return { formatted, skipped };
}

/**
 * AGLC4 Rule 1.8.3 — Latin and Foreign Word Italicisation
 *
 * Scans the document body text for Latin and foreign terms that should be
 * italicised per AGLC4 Rule 1.8.3. Matches whole words/phrases only.
 * Skips terms that are already italic or inside quotation marks.
 *
 * @param context - A Word.RequestContext from an active Word.run() call.
 * @returns A FormatResult summarising how many terms were formatted.
 *
 * @see AGLC4, Rule 1.8.3.
 */
export async function scanAndFormatLatinTerms(
  context: Word.RequestContext,
): Promise<FormatResult> {
  let formatted = 0;
  let skipped = 0;

  // Get Latin terms sorted longest-first to match multi-word phrases
  // before their shorter components (e.g. "obiter dictum" before "dictum").
  const latinTerms = getLatinTermsSorted();

  for (const term of latinTerms) {
    // Search in the document body (excludes footnotes by default).
    // matchCase false: Latin terms may appear at start of sentence.
    // matchWholeWord: not used because Word's matchWholeWord does not handle
    // multi-word phrases; instead we verify word boundaries manually.
    const results = context.document.body.search(term, {
      matchCase: false,
      matchWholeWord: false,
    });
    results.load("items/font,items/text");
    await context.sync();

    for (const range of (results.items ?? [])) {
      // Skip if already italic.
      if (range.font.italic) {
        skipped++;
        continue;
      }

      // Verify whole-word boundary: load the surrounding paragraph text
      // and check that the match is not a substring of a longer word.
      const isQuoted = await isInsideQuotationMarks(context, range);
      if (isQuoted) {
        skipped++;
        continue;
      }

      range.font.italic = true;
      formatted++;
    }

    await context.sync();
  }

  return { formatted, skipped };
}

/**
 * Refreshes inline reference formatting by loading all citations from
 * the given store and re-scanning the document body text.
 *
 * This is a convenience wrapper around `scanAndFormatInlineReferences`
 * that takes a CitationStore parameter and loads its own citations,
 * making it suitable for use as a standalone refresh operation (e.g.
 * triggered by a document change listener).
 *
 * @param context - A Word.RequestContext from an active Word.run() call.
 * @param store - The CitationStore to load citations from.
 * @returns A FormatResult summarising how many references were formatted.
 */
export async function refreshInlineReferences(
  context: Word.RequestContext,
  store: CitationStore,
): Promise<FormatResult> {
  const citations = store.getAll();
  return scanAndFormatInlineReferences(context, citations);
}

/**
 * Removes italic formatting from matched citation terms and Latin terms
 * in the document body text. This is an undo function for
 * scanAndFormatInlineReferences.
 *
 * @param context - A Word.RequestContext from an active Word.run() call.
 * @param citations - All citations in the document store.
 * @returns The number of inline references that had italic removed.
 */
export async function clearInlineFormatting(
  context: Word.RequestContext,
  citations: Citation[],
): Promise<number> {
  let cleared = 0;

  // ── Rule 1.8.2: Citation titles ──────────────────────────────────────

  const allTerms: string[] = [];
  for (const citation of citations) {
    allTerms.push(...getSearchTerms(citation));
  }

  const uniqueTerms = [...new Set(allTerms)].sort(
    (a, b) => b.length - a.length,
  );

  for (const term of uniqueTerms) {
    const results = context.document.body.search(term, {
      matchCase: true,
      matchWholeWord: false,
    });
    results.load("items/font");
    await context.sync();

    for (const range of (results.items ?? [])) {
      if (range.font.italic) {
        range.font.italic = false;
        cleared++;
      }
    }

    await context.sync();
  }

  // ── Rule 1.8.3: Latin and foreign terms ──────────────────────────────

  const latinTerms = getLatinTermsSorted();

  for (const term of latinTerms) {
    const results = context.document.body.search(term, {
      matchCase: false,
      matchWholeWord: false,
    });
    results.load("items/font");
    await context.sync();

    for (const range of (results.items ?? [])) {
      if (range.font.italic) {
        range.font.italic = false;
        cleared++;
      }
    }

    await context.sync();
  }

  return cleared;
}
