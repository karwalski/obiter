/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { SourceType } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import type { CitationConfig } from "../../../standards/types";
import { secondaryStyleFor } from "../secondary/style";

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
 * MULTI-006: When `config.italiciseLegislation === false` (OSCOLA/NZLSG),
 * legislation source types return false (roman, not italic).
 *
 * @param sourceType - The AGLC4 source type.
 * @param config - Optional citation config for multi-standard support.
 * @returns Whether the title should be italicised.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function shouldItaliciseTitle(sourceType: SourceType, config?: CitationConfig): boolean {
  // Quoted types are never italicised even if they match a prefix (e.g. book.chapter).
  if (QUOTED_TYPES.has(sourceType)) return false;

  // MULTI-006: Legislation italicisation toggle
  if (config && config.italiciseLegislation === false && sourceType.startsWith("legislation.")) {
    return false;
  }

  // STD-016: thesis titles are italic under OSCOLA 5 §3.7.6 alone (quoted
  // under AGLC4 7.2.5, OSCOLA 4 §3.4.7 and NZLSG 3 §6.7.1).
  if (config && sourceType === "thesis") {
    return secondaryStyleFor(config).thesisTitleStyle === "italic";
  }

  return ITALICISED_PREFIXES.some(
    (prefix) => sourceType === prefix || sourceType.startsWith(prefix)
  );
}

/**
 * Returns true if the source type's title should be enclosed in quotation
 * marks per Rule 1.8.2 (single under AGLC4; the standard's marks when a
 * config is given).
 *
 * Quoted source types: journal articles (including online and forthcoming)
 * and book chapters. STD-016: with a config, a thesis title is quoted where
 * the standard quotes it (AGLC4 7.2.5, OSCOLA 4 §3.4.7, NZLSG 3 §6.7.1) —
 * the AGLC thesis formatter quotes its own title, so without a config the
 * answer stays false.
 *
 * @param sourceType - The AGLC4 source type.
 * @param config - Optional citation config for multi-standard support.
 * @returns Whether the title should be in quotation marks.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function shouldQuoteTitle(sourceType: SourceType, config?: CitationConfig): boolean {
  if (QUOTED_TYPES.has(sourceType)) return true;
  if (config && sourceType === "thesis") {
    return secondaryStyleFor(config).thesisTitleStyle === "quoted";
  }
  return false;
}

/**
 * Wraps a title in the appropriate formatting for the given source type
 * per Rule 1.8.2, returning an array of FormattedRun objects.
 *
 * - Italicised types: returns a single run with `italic: true`.
 * - Quoted types: returns three runs — opening quote, title text,
 *   closing quote.
 * - Other types: returns a single plain-text run.
 *
 * MULTI-007: When `quotationMarkStyle` is `"double"`, uses Unicode
 * double curly quotes (\u201C / \u201D) instead of single (\u2018 / \u2019).
 * STD-016: a `CitationConfig` may be passed instead of the bare style; the
 * marks then come from `config.quotationMarkStyle` and the italic/quoted
 * decision honours the standard (legislation roman, thesis titles).
 *
 * @param title - The title text to format.
 * @param sourceType - The AGLC4 source type.
 * @param styleOrConfig - Optional quotation mark style override or the
 *   citation config. Defaults to `"single"` (AGLC4/OSCOLA). NZLSG uses
 *   `"double"`.
 * @returns An array of FormattedRun objects with appropriate formatting.
 *
 * @see AGLC4, Rule 1.8.2.
 */
export function wrapTitle(
  title: string,
  sourceType: SourceType,
  styleOrConfig?: "single" | "double" | CitationConfig
): FormattedRun[] {
  const config = typeof styleOrConfig === "object" ? styleOrConfig : undefined;
  const quotationMarkStyle =
    typeof styleOrConfig === "string" ? styleOrConfig : config?.quotationMarkStyle;

  if (shouldItaliciseTitle(sourceType, config)) {
    return [{ text: title, italic: true }];
  }

  if (shouldQuoteTitle(sourceType, config)) {
    const style = quotationMarkStyle ?? "single";
    const openQuote = style === "double" ? "\u201C" : "\u2018";
    const closeQuote = style === "double" ? "\u201D" : "\u2019";
    return [{ text: openQuote }, { text: title }, { text: closeQuote }];
  }

  // Default: plain text (no special formatting).
  return [{ text: title }];
}
