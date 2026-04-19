/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/* global Word */

import { Citation } from "../types/citation";
import { shouldItaliciseTitle } from "../engine/rules/v4/general/italicisation";
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
 * AGLC4 Rule 1.8.2 — Inline Body Text Formatting
 *
 * Scans the document body text (excluding footnotes, headings, and block
 * quotes) for known citation titles and applies italic formatting.
 *
 * Per AGLC4, case names and legislation titles mentioned in running prose
 * should be italicised.
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

    for (const range of results.items) {
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
 * Removes italic formatting from matched citation terms in the document
 * body text. This is an undo function for scanAndFormatInlineReferences.
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

    for (const range of results.items) {
      if (range.font.italic) {
        range.font.italic = false;
        cleared++;
      }
    }

    await context.sync();
  }

  return cleared;
}
