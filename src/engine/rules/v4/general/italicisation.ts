/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";

/**
 * AGLC4 Rule 1.8.2 — Italicisation of Source Titles
 *
 * Titles of cases, statutes, books, reports, treaties, and films/TV/media
 * should be italicised. Titles of journal articles and book chapters should
 * be enclosed in single quotation marks (not italicised).
 */

/**
 * Source type prefixes whose titles should be italicised per Rule 1.8.2.
 *
 * This includes: case names, statute/legislation titles, book titles,
 * report titles, treaty titles, and film/TV/media titles.
 */
const ITALICISED_PREFIXES: readonly string[] = [
  "case.",
  "legislation.",
  "book",
  "report",
  "treaty",
  "film_tv_media",
];

/**
 * Source types whose titles should be enclosed in single quotation marks
 * per Rule 1.8.2: journal articles and book chapters.
 */
const QUOTED_TYPES: ReadonlySet<SourceType> = new Set<SourceType>([
  "journal.article",
  "journal.online",
  "journal.forthcoming",
  "book.chapter",
]);

/**
 * Returns true if the source type's title should be italicised per Rule 1.8.2.
 *
 * Italicised source types: case names, statute titles, book titles,
 * report titles, treaty titles, film/TV/media titles.
 *
 * @param sourceType - The AGLC4 source type.
 * @returns Whether the title should be italicised.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function shouldItaliciseTitle(sourceType: SourceType): boolean {
  // Quoted types are never italicised even if they match a prefix (e.g. book.chapter).
  if (QUOTED_TYPES.has(sourceType)) return false;

  return ITALICISED_PREFIXES.some(
    (prefix) => sourceType === prefix || sourceType.startsWith(prefix)
  );
}

/**
 * Returns true if the source type's title should be enclosed in single
 * quotation marks per Rule 1.8.2.
 *
 * Quoted source types: journal articles (including online and forthcoming)
 * and book chapters.
 *
 * @param sourceType - The AGLC4 source type.
 * @returns Whether the title should be in single quotes.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function shouldQuoteTitle(sourceType: SourceType): boolean {
  return QUOTED_TYPES.has(sourceType);
}

/**
 * Wraps a title in the appropriate formatting for the given source type
 * per Rule 1.8.2, returning an array of FormattedRun objects.
 *
 * - Italicised types: returns a single run with `italic: true`.
 * - Quoted types: returns three runs — opening single quote, title text,
 *   closing single quote.
 * - Other types: returns a single plain-text run.
 *
 * @param title - The title text to format.
 * @param sourceType - The AGLC4 source type.
 * @returns An array of FormattedRun objects with appropriate formatting.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function wrapTitle(
  title: string,
  sourceType: SourceType
): FormattedRun[] {
  if (shouldItaliciseTitle(sourceType)) {
    return [{ text: title, italic: true }];
  }

  if (shouldQuoteTitle(sourceType)) {
    return [
      { text: "\u2018" },
      { text: title },
      { text: "\u2019" },
    ];
  }

  // Default: plain text (no special formatting).
  return [{ text: title }];
}
