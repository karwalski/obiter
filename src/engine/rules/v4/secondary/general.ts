/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { toTitleCase } from "../general/capitalisation";
import { shouldItaliciseTitle, shouldQuoteTitle } from "../general/italicisation";

/** Matches a bare span of dates (eg '1937–49', '1901–1950'). */
const DATE_SPAN = /^\d{4}(\s*[–-]\s*\d{2,4})?$/;

/**
 * AGLC4 Rule 4.2 — Secondary Source Titles (text normalisation)
 *
 * Produces the normalised text of a secondary source title:
 * - full stops within the title are removed (Rule 1.6);
 * - a colon replaces whatever punctuation the source uses between title
 *   and subtitle (spaced em/en dashes are converted);
 * - only the first subtitle is kept, except a further subtitle that is
 *   merely a span of dates; and
 * - title-case capitalisation per Rule 1.7 (including the first word of
 *   each subtitle and the word following a hyphen).
 *
 * Limitation: Rule 4.2 also italicises individual words within a title
 * where italic in the original; titles are stored as plain strings with
 * no markup, so embedded italics cannot be represented here.
 *
 * @param title - The raw title text.
 * @returns The normalised, title-cased title text.
 *
 * @see AGLC4, Rule 4.2.
 */
export function formatSecondaryTitleText(title: string): string {
  // Remove full stops from within the title.
  let cleaned = title.replace(/\./g, "");

  // Standardise a colon between title and subtitle (Rule 4.2): the source
  // may use a spaced em/en dash (or nothing) instead.
  cleaned = cleaned.replace(/\s+[—–]\s+/g, ": ");

  // Keep only the first subtitle, except date-span subtitles (Rule 4.2).
  const segments = cleaned.split(": ");
  const kept = segments.slice(0, 2);
  for (const extra of segments.slice(2)) {
    if (DATE_SPAN.test(extra.trim())) {
      kept.push(extra);
    }
  }

  // Title-case per Rule 1.7 (subtitle first words and hyphenated words are
  // handled by toTitleCase itself).
  return toTitleCase(kept.join(": "));
}

/**
 * AGLC4 Rule 4.2 — Secondary Source Titles
 *
 * Formats a secondary source title with correct AGLC4 formatting:
 * - Complete works (books, reports): italic.
 * - Components (articles, chapters): enclosed in single curly quotes, not italic.
 * - Text is normalised per formatSecondaryTitleText (stops removed,
 *   subtitle punctuation standardised, Rule 1.7 title case).
 *
 * @param title - The raw title text.
 * @param sourceType - The AGLC4 source type.
 * @returns An array of FormattedRun objects with appropriate formatting.
 *
 * @see AGLC4, Rule 4.2.
 */
export function formatSecondaryTitle(title: string, sourceType: SourceType): FormattedRun[] {
  const capitalised = formatSecondaryTitleText(title);

  if (shouldItaliciseTitle(sourceType)) {
    return [{ text: capitalised, italic: true }];
  }

  if (shouldQuoteTitle(sourceType)) {
    return [{ text: "\u2018" + capitalised + "\u2019" }];
  }

  // Default: plain text (no special formatting).
  return [{ text: capitalised }];
}

/**
 * AGLC4 Rule 4.3 — Short Titles for Secondary Sources
 *
 * Formats the short title introduction that appears at first citation.
 * - For complete works (books, reports): short title is italic inside
 *   single quotes, wrapped in parentheses.
 * - For components (articles, chapters): short title is in single quotes
 *   (not italic), wrapped in parentheses.
 * - Parentheses are never italic.
 *
 * @param shortTitle - The short title text.
 * @param sourceType - The AGLC4 source type.
 * @returns An array of FormattedRun objects representing the short title introduction.
 *
 * @see AGLC4, Rule 4.3.
 */
export function formatSecondaryShortTitle(
  shortTitle: string,
  sourceType: SourceType
): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: "(" }];

  if (shouldItaliciseTitle(sourceType)) {
    runs.push({ text: "\u2018" }, { text: shortTitle, italic: true }, { text: "\u2019" });
  } else {
    runs.push({ text: "\u2018" + shortTitle + "\u2019" });
  }

  runs.push({ text: ")" });

  return runs;
}

/**
 * AGLC4 Rule 4.4 — URLs
 *
 * Formats a URL in angle brackets as plain (non-italic) text.
 *
 * @param url - The URL string.
 * @returns An array containing a single FormattedRun with the URL in angle brackets.
 *
 * @see AGLC4, Rule 4.4.
 */
export function formatUrl(url: string): FormattedRun[] {
  return [{ text: "<" + url + ">" }];
}

/**
 * AGLC4 Rule 4.4 — URL Inclusion
 *
 * Determines whether a URL should be included in the citation. URLs are
 * included only when the source is primarily available online (i.e. has
 * no print version).
 *
 * @param hasPrintVersion - Whether a print version of the source exists.
 * @returns True if the URL should be included (no print version available).
 *
 * @see AGLC4, Rule 4.4.
 */
export function shouldIncludeUrl(hasPrintVersion: boolean): boolean {
  return !hasPrintVersion;
}

/**
 * AGLC4 Rule 4.5 — Archived Sources
 *
 * Formats an archive reference preceded by a comma and space, with the
 * archive URL enclosed in angle brackets.
 *
 * @param archiveUrl - The archive URL (e.g. a Wayback Machine URL).
 * @returns An array of FormattedRun objects representing the archived source reference.
 *
 * @see AGLC4, Rule 4.5.
 */
export function formatArchivedSource(archiveUrl: string): FormattedRun[] {
  return [{ text: ", archived at <" + archiveUrl + ">" }];
}
