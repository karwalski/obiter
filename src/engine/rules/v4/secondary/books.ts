/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors, normaliseBodyName } from "./authors";
import { formatSecondaryTitle } from "./general";
import { formatPinpoint } from "../general/pinpoints";
import { parseTitleMarkup } from "../general/titleMarkup";

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
 * number, 'rev ed' follows the publisher's name; with an edition number,
 * 'rev' appears between the number and 'ed' (eg '3rd rev ed').
 *
 * OSCOLA uses 'edn' (British English): '2nd edn', '3rd edn'.
 * NZLSG uses 'ed' (same as AGLC4).
 *
 * First editions are omitted (returns empty string) unless revised.
 *
 * Note: rule 6.3.2 sets the ordinal indicator in superscript; this plain
 * string form cannot represent that — use formatEditionRuns wherever the
 * output is a FormattedRun[] citation.
 *
 * @param edition - The edition number.
 * @param revised - Whether the edition is a revised edition.
 * @param options - Optional configuration.
 * @param options.abbreviation - The edition abbreviation: "ed" (default) or "edn" (OSCOLA).
 * @returns The formatted edition string, or empty string for an unrevised 1st edition.
 *
 * @see AGLC4, Rules 6.3.2, 6.3.3.
 * @see OSCOLA, Rule 3.1.2.
 * @see NZLSG, Rule 6.1.
 */
export function formatEdition(
  edition: number,
  revised?: boolean,
  options?: { abbreviation?: "ed" | "edn" }
): string {
  const abbr = options?.abbreviation ?? "ed";
  if (edition <= 1) {
    // Rule 6.3.3: an unnumbered revised edition is flagged with a bare 'rev ed'.
    return revised ? `rev ${abbr}` : "";
  }
  const suffix = ordinalSuffix(edition);
  if (revised) {
    return `${edition}${suffix} rev ${abbr}`;
  }
  return `${edition}${suffix} ${abbr}`;
}

/**
 * Formats an edition as runs per AGLC4 Rules 6.3.2–6.3.3, with the ordinal
 * indicator ('th', 'nd', etc) in superscript as rule 6.3.2 requires.
 *
 * Returns an empty array for an unrevised first edition.
 *
 * @see AGLC4, Rules 6.3.2, 6.3.3.
 */
export function formatEditionRuns(
  edition: number,
  revised?: boolean,
  options?: { abbreviation?: "ed" | "edn" }
): FormattedRun[] {
  const abbr = options?.abbreviation ?? "ed";
  if (edition <= 1) {
    return revised ? [{ text: `rev ${abbr}` }] : [];
  }
  return [
    { text: String(edition) },
    { text: ordinalSuffix(edition), superscript: true },
    { text: ` ${revised ? "rev " : ""}${abbr}` },
  ];
}

// ─── Publication Details ──────────────────────────────────────────────────────

/**
 * A publication-details part: a plain string or pre-formatted runs.
 */
type PubPart = string | FormattedRun[];

/**
 * Pushes the parenthetical publication details onto `runs`, joining parts
 * with commas. Empty parts are skipped; if no part remains, nothing (not
 * even the parentheses) is emitted.
 *
 * @returns True if a parenthetical was emitted.
 */
function pushPublicationDetails(runs: FormattedRun[], parts: PubPart[]): boolean {
  const kept = parts.filter((p) => (typeof p === "string" ? p.trim().length > 0 : p.length > 0));
  if (kept.length === 0) return false;

  runs.push({ text: " (" });
  kept.forEach((part, i) => {
    if (i > 0) runs.push({ text: ", " });
    if (typeof part === "string") {
      runs.push({ text: part });
    } else {
      runs.push(...part);
    }
  });
  runs.push({ text: ")" });
  return true;
}

/**
 * Resolves the publisher element per AGLC4 Rule 6.3.1: normalised (leading
 * 'The' and corporate-status abbreviations dropped), and omitted entirely
 * where absent or the same as the author (ex 12). Geographic designations
 * and subdivisions are left to data entry.
 */
function resolvePublisher(publisher: string | undefined, authors: Author[]): string {
  if (!publisher || !publisher.trim()) return "";
  const normalised = normaliseBodyName(publisher);
  const authorText = formatAuthors(authors)
    .map((r) => r.text)
    .join("")
    .trim();
  if (
    authorText &&
    (normalised.toLowerCase() === authorText.toLowerCase() ||
      publisher.trim().toLowerCase() === authorText.toLowerCase())
  ) {
    // Rule 6.3.1: publisher omitted where publisher and author are the same.
    return "";
  }
  return normalised;
}

/** Formats the year element: skipped when absent/zero (Rule 6.3.4). */
function yearPart(year: number | string | undefined): string {
  if (year === undefined || year === 0 || year === "" || year === "0") return "";
  return String(year);
}

/**
 * Pushes the ', ed «Editors»' segment used where a book has both an author
 * and an editor (Rule 6.6.2). 'ed' here stands for 'edited by' and never
 * becomes 'eds'.
 */
function pushEditedBy(runs: FormattedRun[], editors: Author[] | undefined): void {
  if (!editors || editors.length === 0) return;
  runs.push({ text: ", ed " });
  runs.push(...formatAuthors(editors));
}

// ─── BOOK-001 ─────────────────────────────────────────────────────────────────

/**
 * Formats a book citation per AGLC4 Rules 6.1–6.4 and 6.6.2.
 *
 * AGLC4 Rule 6.1: author per rule 4.1. Rule 6.2: title italicised, per
 * rule 4.2. Rule 6.3: publication details in parentheses — publisher
 * (normalised, omitted where same as author), edition (superscript
 * ordinal; 'rev ed' for revised editions), year (a string admits year
 * spans for multi-volume works). Rule 6.4: the pinpoint follows the
 * closing parenthesis with no comma. Rule 6.6.2: where the book also has
 * editors, ', ed «Editors»' follows the title.
 *
 * @param data - The book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 6.1–6.4, 6.6.2.
 */
export function formatBook(data: {
  authors: Author[];
  title: string;
  /**
   * Rule 26.4 (via 26.1.1): English translation of a non-English title,
   * emitted roman in square brackets after the title (guide ex 21).
   */
  translatedTitle?: string;
  publisher?: string;
  edition?: number;
  revised?: boolean;
  year?: number | string;
  editors?: Author[];
  pinpoint?: Pinpoint;
  editionAbbreviation?: "ed" | "edn";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic, via formatSecondaryTitle which handles "book" source type).
  // Rule 26.4: a stored translation signals a non-English title, which is
  // reproduced as typed — rule 1.7's English minor-word list does not apply
  // to foreign-language titles (guide ex 21 prints 'von Lissabon' lowercase;
  // see DECISION-030).
  if (data.translatedTitle) {
    runs.push(...parseTitleMarkup(data.title, true));
    // Rule 26.4: bracketed element translation — roman even after the italic
    // title (rule 26.1.1: translated titles are never italicised)
    runs.push({ text: ` [${data.translatedTitle}]` });
  } else {
    runs.push(...formatSecondaryTitle(data.title, "book"));
  }

  // Editor of an authored book (Rule 6.6.2)
  pushEditedBy(runs, data.editors);

  // Publication details (Rule 6.3)
  pushPublicationDetails(runs, [
    resolvePublisher(data.publisher, data.authors),
    formatEditionRuns(data.edition ?? 1, data.revised, {
      abbreviation: data.editionAbbreviation ?? "ed",
    }),
    yearPart(data.year),
  ]);

  // Pinpoint (Rule 6.4: no comma after the parenthesis)
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
 * AGLC4 Rule 6.5: the cited volume number follows the publication details,
 * introduced by 'vol' — or 'bk' where the source styles its volumes as
 * books — in Arabic numerals. A comma separates the volume from any
 * pinpoint. The publication details carry the span of years over which the
 * volumes were published (Rule 6.3.4, eg '1984–88' or '1975–').
 *
 * @param data - The multi-volume book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.5.
 */
export function formatMultiVolumeBook(data: {
  authors: Author[];
  title: string;
  publisher?: string;
  edition?: number;
  revised?: boolean;
  year?: number | string;
  volume: number | string;
  /** 'vol' (default) or 'bk' where the source calls its volumes books. */
  volumeLabel?: "vol" | "bk";
  editors?: Author[];
  pinpoint?: Pinpoint;
  editionAbbreviation?: "ed" | "edn";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book"));

  // Editor of an authored book (Rule 6.6.2)
  pushEditedBy(runs, data.editors);

  // Publication details
  pushPublicationDetails(runs, [
    resolvePublisher(data.publisher, data.authors),
    formatEditionRuns(data.edition ?? 1, data.revised, {
      abbreviation: data.editionAbbreviation ?? "ed",
    }),
    yearPart(data.year),
  ]);

  // Volume ('vol' or 'bk', Arabic numerals)
  runs.push({ text: ` ${data.volumeLabel ?? "vol"} ${data.volume}` });

  // Pinpoint (after volume, separated by comma — Rule 6.4 exception)
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
 * AGLC4 Rule 6.6.1: chapter author, quoted chapter title, 'in', editor(s)
 * with '(ed)'/'(eds)', italic book title, publication details, the page on
 * which the chapter begins, and any pinpoint after a comma.
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
  publisher?: string;
  year?: number | string;
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

  // Publication details
  pushPublicationDetails(runs, [
    resolvePublisher(data.publisher, data.editors),
    yearPart(data.year),
  ]);

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
 * AGLC4 Rule 6.7: the translated title is cited, followed by ', tr
 * «Translator»' after the title (outside the publication-details
 * parenthetical); 'tr' never becomes 'trs'. An optional '[trans of:
 * «Original Title» («Year»)]' segment may follow any pinpoint to aid
 * retrieval. An editor segment (Rule 6.6.2) precedes the translator
 * segment (guide ex 35).
 *
 * @param data - The translated book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.7.
 */
export function formatTranslatedBook(data: {
  authors: Author[];
  title: string;
  publisher?: string;
  edition?: number;
  revised?: boolean;
  year?: number | string;
  translator: string;
  editors?: Author[];
  /** Original-language title for the optional '[trans of: …]' segment. */
  originalTitle?: string;
  /** Original year of publication for the '[trans of: …]' segment. */
  originalYear?: number | string;
  pinpoint?: Pinpoint;
  editionAbbreviation?: "ed" | "edn";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Translated title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book.translated"));

  // Editor of an authored book (Rule 6.6.2), before the translator (ex 35)
  pushEditedBy(runs, data.editors);

  // Translator after the title, outside the parenthetical (Rule 6.7)
  runs.push({ text: `, tr ${data.translator}` });

  // Publication details (no translator inside — Rule 6.7 template)
  pushPublicationDetails(runs, [
    resolvePublisher(data.publisher, data.authors),
    formatEditionRuns(data.edition ?? 1, data.revised, {
      abbreviation: data.editionAbbreviation ?? "ed",
    }),
    yearPart(data.year),
  ]);

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  // Optional '[trans of: «Original Title» («Year»)]' after any pinpoint
  if (data.originalTitle) {
    runs.push({ text: " [trans of: " });
    runs.push({ text: data.originalTitle, italic: true });
    if (data.originalYear !== undefined && data.originalYear !== "") {
      runs.push({ text: ` (${data.originalYear})` });
    }
    runs.push({ text: "]" });
  }

  return runs;
}

// ─── BOOK-006 ─────────────────────────────────────────────────────────────────

/**
 * Formats a forthcoming book citation per AGLC4 Rule 6.8.
 *
 * AGLC4 Rule 6.8: 'forthcoming' replaces the publication date; as much of
 * the remaining citation information as is available is included.
 *
 * @param data - The forthcoming book citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.8.
 */
export function formatForthcomingBook(data: {
  authors: Author[];
  title: string;
  publisher?: string;
  edition?: number;
  editionAbbreviation?: "ed" | "edn";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book"));

  // Publication details with 'forthcoming' instead of the year
  pushPublicationDetails(runs, [
    resolvePublisher(data.publisher, data.authors),
    formatEditionRuns(data.edition ?? 1, false, {
      abbreviation: data.editionAbbreviation ?? "ed",
    }),
    "forthcoming",
  ]);

  return runs;
}

/**
 * Formats an audiobook citation per AGLC4 Rule 6.9.
 *
 * AGLC4 Rule 6.9: cited like a book, but 'Audiobook' opens the single
 * parenthetical, followed by the audiobook's publisher and year; the word
 * 'audiobook(s)' is dropped from the publisher's name where it forms part
 * of it. Pinpoints are points or spans of time (Rules 1.11.3–1.11.4).
 * There is no narrator element in AGLC4.
 *
 * @param data - The audiobook citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 6.9.
 */
export function formatAudiobook(data: {
  authors: Author[];
  title: string;
  publisher?: string;
  edition?: number;
  year?: number | string;
  /** @deprecated Not an AGLC4 element (Rule 6.9); accepted but not emitted. */
  narrator?: string;
  pinpoint?: Pinpoint;
  editionAbbreviation?: "ed" | "edn";
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "book.audiobook"));

  // Publisher of the audiobook, minus any 'audiobook(s)' in its name
  const publisher = resolvePublisher(data.publisher, data.authors)
    .split(/\s+/)
    .filter((token) => !/^audiobooks?$/i.test(token))
    .join(" ");

  // Single parenthetical opened by 'Audiobook' (Rule 6.9)
  pushPublicationDetails(runs, [
    "Audiobook",
    publisher,
    formatEditionRuns(data.edition ?? 1, false, {
      abbreviation: data.editionAbbreviation ?? "ed",
    }),
    yearPart(data.year),
  ]);

  // Time pinpoint (Rules 1.11.3–1.11.4)
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}
