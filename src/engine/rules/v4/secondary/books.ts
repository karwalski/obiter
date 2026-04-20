/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors } from "./authors";
import { formatSecondaryTitle } from "./general";
import { formatPinpoint } from "../general/pinpoints";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ordinal suffix for edition numbers.
 */
function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// ─── BOOK-002 ─────────────────────────────────────────────────────────────────

/**
 * Formats an edition string per AGLC4 Rules 6.3.2–6.3.3.
 *
 * AGLC4 Rule 6.3.2: Where a book has been published in more than one edition,
 * the edition number should be included in the publication details as an
 * ordinal number followed by 'ed' (eg '2nd ed', '3rd ed').
 *
 * AGLC4 Rule 6.3.3: Where a book has been revised without a new edition
 * number, 'rev' should appear before 'ed' (eg '3rd rev ed').
 *
 * OSCOLA uses 'edn' (British English): '2nd edn', '3rd edn'.
 * NZLSG uses 'ed' (same as AGLC4).
 *
 * First editions are omitted (returns empty string).
 *
 * @param edition - The edition number.
 * @param revised - Whether the edition is a revised edition.
 * @param options - Optional configuration.
 * @param options.abbreviation - The edition abbreviation: "ed" (default) or "edn" (OSCOLA).
 * @returns The formatted edition string, or empty string for 1st edition.
 *
 * @see AGLC4, Rules 6.3.2, 6.3.3.
 * @see OSCOLA, Rule 3.1.2.
 * @see NZLSG, Rule 6.1.
 */
export function formatEdition(
  edition: number,
  revised?: boolean,
  options?: { abbreviation?: "ed" | "edn" },
): string {
  if (edition <= 1) return "";
  const suffix = ordinalSuffix(edition);
  const abbr = options?.abbreviation ?? "ed";
  if (revised) {
    return `${edition}${suffix} rev ${abbr}`;
  }
  return `${edition}${suffix} ${abbr}`;
}

// ─── Publication Details ──────────────────────────────────────────────────────

/**
 * Builds the parenthetical publication details string for a book citation.
 * Items are joined by commas within parentheses.
 */
function buildPublicationDetails(parts: string[]): string {
  return "(" + parts.join(", ") + ")";
}

// ─── BOOK-001 ─────────────────────────────────────────────────────────────────

/**
 * Formats a book citation per AGLC4 Rules 6.1–6.4.
 *
 * AGLC4 Rule 6.1: The general format for citing a book is:
 * Author, Title (Publisher, Edition, Year) Pinpoint.
 *
 * AGLC4 Rule 6.2: The title should be italicised and in title case.
 *
 * AGLC4 Rule 6.3: Publication details appear in parentheses and include
 * the publisher, edition (if not the first), and year of publication.
 *
 * AGLC4 Rule 6.4: Pinpoint references follow the closing parenthesis,
 * preceded by a space.
 *
 * @param data - The book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 6.1–6.4.
 */
export function formatBook(data: {
  authors: Author[];
  title: string;
  publisher: string;
  edition?: number;
  year: number;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  const authorRuns = formatAuthors(data.authors);
  runs.push(...authorRuns);

  // Comma + space before title
  runs.push({ text: ", " });

  // Title (italic, via formatSecondaryTitle which handles "book" source type)
  const titleRuns = formatSecondaryTitle(data.title, "book");
  runs.push(...titleRuns);

  // Space before publication details
  runs.push({ text: " " });

  // Publication details
  const pubParts: string[] = [data.publisher];
  if (data.edition && data.edition > 1) {
    pubParts.push(formatEdition(data.edition));
  }
  pubParts.push(String(data.year));
  runs.push({ text: buildPublicationDetails(pubParts) });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── BOOK-003 ─────────────────────────────────────────────────────────────────

/**
 * Formats a multi-volume book citation per AGLC4 Rule 6.5.
 *
 * AGLC4 Rule 6.5: Where a book has been published in multiple volumes,
 * the volume number should appear after the closing parenthesis of the
 * publication details, preceded by a space. The format is 'vol X'.
 * If a pinpoint follows, it appears after the volume, separated by a comma
 * and space: 'vol 2, 145'.
 *
 * @param data - The multi-volume book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.5.
 */
export function formatMultiVolumeBook(data: {
  authors: Author[];
  title: string;
  publisher: string;
  edition?: number;
  year: number;
  volume: number;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book"));
  runs.push({ text: " " });

  // Publication details
  const pubParts: string[] = [data.publisher];
  if (data.edition && data.edition > 1) {
    pubParts.push(formatEdition(data.edition));
  }
  pubParts.push(String(data.year));
  runs.push({ text: buildPublicationDetails(pubParts) });

  // Volume
  runs.push({ text: ` vol ${data.volume}` });

  // Pinpoint (after volume, separated by comma)
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── BOOK-004 ─────────────────────────────────────────────────────────────────

/**
 * Formats a book chapter citation per AGLC4 Rule 6.6.1.
 *
 * AGLC4 Rule 6.6.1: Where a chapter in an edited collection has a
 * distinct author, the citation format is:
 * Author, 'Chapter Title' in Editor (ed), Book Title (Publisher, Year)
 * Starting Page, Pinpoint.
 *
 * The chapter title is enclosed in single curly quotes and is not italic.
 * The book title is italic. The editor is followed by '(ed)' or '(eds)'.
 *
 * @param data - The book chapter citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.6.1.
 */
export function formatBookChapter(data: {
  chapterAuthors: Author[];
  chapterTitle: string;
  editors: Author[];
  bookTitle: string;
  publisher: string;
  year: number;
  startingPage: number;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Chapter author
  runs.push(...formatAuthors(data.chapterAuthors));
  runs.push({ text: ", " });

  // Chapter title (quoted, not italic — use "book.chapter" source type)
  runs.push(...formatSecondaryTitle(data.chapterTitle, "book.chapter"));

  // ' in '
  runs.push({ text: " in " });

  // Editor(s) with (ed)/(eds) suffix
  runs.push(...formatAuthors(data.editors, true));
  runs.push({ text: ", " });

  // Book title (italic)
  runs.push(...formatSecondaryTitle(data.bookTitle, "book"));
  runs.push({ text: " " });

  // Publication details
  const pubParts: string[] = [data.publisher, String(data.year)];
  runs.push({ text: buildPublicationDetails(pubParts) });

  // Starting page
  runs.push({ text: ` ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── BOOK-005 ─────────────────────────────────────────────────────────────────

/**
 * Formats a translated book citation per AGLC4 Rule 6.7.
 *
 * AGLC4 Rule 6.7: Where a book has been translated, the translator's
 * name should appear in the publication details, preceded by 'tr'.
 * The format is: Author, Title (tr Translator Name, Publisher, Edition, Year)
 * Pinpoint.
 *
 * @param data - The translated book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.7.
 */
export function formatTranslatedBook(data: {
  authors: Author[];
  title: string;
  publisher: string;
  edition?: number;
  year: number;
  translator: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book.translated"));
  runs.push({ text: " " });

  // Publication details with translator
  const pubParts: string[] = [`tr ${data.translator}`, data.publisher];
  if (data.edition && data.edition > 1) {
    pubParts.push(formatEdition(data.edition));
  }
  pubParts.push(String(data.year));
  runs.push({ text: buildPublicationDetails(pubParts) });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── BOOK-006 ─────────────────────────────────────────────────────────────────

/**
 * Formats a forthcoming book citation per AGLC4 Rule 6.8.
 *
 * AGLC4 Rule 6.8: Where a book has not yet been published, 'forthcoming'
 * should replace the year in the publication details. The format is:
 * Author, Title (Publisher, forthcoming).
 *
 * @param data - The forthcoming book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.8.
 */
export function formatForthcomingBook(data: {
  authors: Author[];
  title: string;
  publisher: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book"));
  runs.push({ text: " " });

  // Publication details with 'forthcoming' instead of year
  runs.push({ text: buildPublicationDetails([data.publisher, "forthcoming"]) });

  return runs;
}

/**
 * Formats an audiobook citation per AGLC4 Rule 6.9.
 *
 * AGLC4 Rule 6.9: Where a book is cited in audiobook format, '(audiobook)'
 * should appear after the publication details, and the narrator's name
 * should be included in the publication details preceded by 'narrated by'.
 *
 * Format: Author, Title (Publisher, Edition, Year) (audiobook, narrated by
 * Narrator Name) Pinpoint.
 *
 * @param data - The audiobook citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.9.
 */
export function formatAudiobook(data: {
  authors: Author[];
  title: string;
  publisher: string;
  edition?: number;
  year: number;
  narrator: string;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book.audiobook"));
  runs.push({ text: " " });

  // Publication details
  const pubParts: string[] = [data.publisher];
  if (data.edition && data.edition > 1) {
    pubParts.push(formatEdition(data.edition));
  }
  pubParts.push(String(data.year));
  runs.push({ text: buildPublicationDetails(pubParts) });

  // Audiobook details with narrator
  runs.push({ text: ` (audiobook, narrated by ${data.narrator})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}
