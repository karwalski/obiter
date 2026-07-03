/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { toTitleCase } from "../general/capitalisation";
import { shouldItaliciseTitle, shouldQuoteTitle } from "../general/italicisation";
import { parseTitleMarkup, quoteTitleRuns } from "../general/titleMarkup";

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
 * Embedded italics (words italic in the original source, eg case names)
 * are represented with the asterisk marker convention of parseTitleMarkup
 * (titleMarkup.ts); the markers pass through this normalisation untouched
 * and are resolved into runs by formatSecondaryTitle.
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
 * - Embedded italics use the asterisk convention (parseTitleMarkup):
 *   marked spans render italic inside quoted titles; inside wholly italic
 *   titles they remain italic, as rule 4.2 permits no roman portion.
 *
 * @param title - The raw title text (may contain asterisk markers).
 * @param sourceType - The AGLC4 source type.
 * @returns An array of FormattedRun objects with appropriate formatting.
 *
 * @see AGLC4, Rule 4.2.
 */
export function formatSecondaryTitle(title: string, sourceType: SourceType): FormattedRun[] {
  const capitalised = formatSecondaryTitleText(title);

  if (shouldItaliciseTitle(sourceType)) {
    return parseTitleMarkup(capitalised, true);
  }

  if (shouldQuoteTitle(sourceType)) {
    return quoteTitleRuns(parseTitleMarkup(capitalised, false));
  }

  // Default: plain text (embedded italic markers still honoured).
  return parseTitleMarkup(capitalised, false);
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
 * - Embedded italics use the asterisk convention (parseTitleMarkup), so a
 *   short title such as `*IceTV* Case Note` renders its marked span italic
 *   (rule 4.2 via DECISION-021); inside wholly italic short titles the
 *   markers are consumed and the span stays italic.
 *
 * @param shortTitle - The short title text (may contain asterisk markers).
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
    runs.push({ text: "\u2018" }, ...parseTitleMarkup(shortTitle, true), { text: "\u2019" });
  } else {
    runs.push(...quoteTitleRuns(parseTitleMarkup(shortTitle, false)));
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
