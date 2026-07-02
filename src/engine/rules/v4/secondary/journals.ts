/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part III — Journal Articles (Rules 5.1–5.11)
 *
 * Pure formatting functions for journal article citations.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors } from "./authors";
import { formatSecondaryTitle } from "./general";
import { formatPinpoint } from "../general/pinpoints";
import { formatUrl } from "./general";

// ─── Shared data shape ──────────────────────────────────────────────────────

/**
 * Elements common to all journal article citations (Rules 5.1–5.7).
 */
interface JournalCore {
  authors: Author[];
  title: string;
  /** Year of publication; a string admits year spans (eg '1992–93'). */
  year: number | string;
  volume?: number;
  issue?: string;
  journal: string;
  /**
   * Rule 5.3: a journal is organised by year exactly when it lacks a volume
   * number. When true (or when no volume is given), the year is set in
   * square brackets. Explicit value overrides the derived default.
   */
  yearOrganised?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Whether the journal is treated as year-organised (Rule 5.3): explicitly
 * flagged, or — per the rule's note — lacking a volume number.
 */
function isYearOrganised(data: Pick<JournalCore, "volume" | "yearOrganised">): boolean {
  return data.yearOrganised ?? data.volume === undefined;
}

/**
 * Formats the year element (Rule 5.3).
 *
 * Volume-organised journals take the year in parentheses '(Year)';
 * year-organised journals take square brackets '[Year]' (spans per
 * rule 1.11.4, eg '[1992–93]').
 */
function formatJournalYear(year: number | string, yearOrganised: boolean): string {
  return yearOrganised ? `[${year}]` : `(${year})`;
}

/** A purely numeric issue identifier, including combined issues '2–3'. */
const NUMERIC_ISSUE = /^\d+(\s*[–-]\s*\d+)?$/;

/**
 * Builds the volume/issue portion of a journal citation (Rule 5.4).
 *
 * - Numeric issue after a volume: no space — '40(1)', '66(1–2)'.
 * - Non-numeric issue (season/month): preceded by a space — '133 (January)'.
 * - Year-organised journals (no volume): the issue follows the year,
 *   preceded by a space — '[2000] (1)', '[1982] (Summer)'.
 *
 * Leading and trailing spaces are included for seamless concatenation.
 */
function formatVolumeAndIssue(volume?: number, issue?: string): string {
  let result = " ";
  if (volume !== undefined) {
    result += String(volume);
  }
  if (issue) {
    // A space precedes the parenthesis when there is no volume (the issue
    // follows the bracketed year) or the issue is non-numeric.
    if (volume === undefined || !NUMERIC_ISSUE.test(issue)) {
      if (!result.endsWith(" ")) {
        result += " ";
      }
    }
    result += `(${issue})`;
  }
  if (volume !== undefined || issue) {
    result += " ";
  }
  return result;
}

/**
 * Formats the journal title element (Rule 5.5): italicised in full as on the
 * journal's title page, less a leading 'The'.
 *
 * An ampersand in the journal title is preserved as-is per the rule text
 * ('as it appears on the title page') — see DECISION-014; the contrary
 * example 10 ('&' → 'and') is not encoded.
 */
function journalTitleRun(journal: string): FormattedRun {
  return { text: journal.trim().replace(/^The\s+/i, ""), italic: true };
}

/**
 * Pushes the elements shared by every chapter-5 citation form up to and
 * including the journal title: author, quoted title, year, volume/issue,
 * italic journal (Rules 5.1–5.5).
 */
function pushCoreElements(runs: FormattedRun[], data: JournalCore): void {
  // Author (Rule 5.1 via 4.1)
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title — quoted, not italicised (Rule 5.2 / 4.2)
  runs.push(...formatSecondaryTitle(data.title, "journal.article"));

  // Year (Rule 5.3)
  runs.push({ text: ` ${formatJournalYear(data.year, isYearOrganised(data))}` });

  // Volume and issue (Rule 5.4)
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal title — italicised (Rule 5.5)
  runs.push(journalTitleRun(data.journal));
}

/**
 * Strips a part reference from within an article title (Rule 5.8), eg a
 * trailing '— Part I' / ': Part 1' or a leading 'Part One:'.
 */
function stripPartFromTitle(title: string): string {
  return title
    .replace(/\s*[—–:,-]?\s*[([]?\s*Part\s+(\d+|[IVXLC]+|One|Two|Three|Four|Five)\s*[)\]]?\s*$/i, "")
    .replace(/^Part\s+(\d+|[IVXLC]+|One|Two|Three|Four|Five)\s*[:.—–-]\s*/i, "")
    .trim();
}

// ─── JOUR-001: Journal Article (Rules 5.1–5.7) ─────────────────────────────

/**
 * Formats a journal article citation per AGLC4 Rules 5.1–5.7.
 *
 * AGLC4 Rule 5.1: the author is formatted per the general secondary source
 * author rules (Rules 4.1.1–4.1.5). For a symposium cited as a whole,
 * 'Symposium' stands in the author position (Rule 5.9) — enter it as the
 * author surname.
 *
 * AGLC4 Rule 5.2: the title is enclosed in single quotation marks and
 * formatted per Rule 4.2.
 *
 * AGLC4 Rule 5.3: volume-organised journals take the year in parentheses;
 * year-organised journals (those lacking a volume number) take square
 * brackets.
 *
 * AGLC4 Rule 5.4: the issue number follows the volume in parentheses with
 * no space ('40(1)'); non-numeric issues and issues of year-organised
 * journals are preceded by a space.
 *
 * AGLC4 Rule 5.5: the journal title is italicised, unabbreviated, less a
 * leading 'The'.
 *
 * AGLC4 Rules 5.6–5.7: the starting page follows the journal title; a
 * pinpoint follows the starting page after a comma.
 *
 * @param data - The journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 5.1–5.7, 5.9.
 */
export function formatJournalArticle(
  data: JournalCore & {
    startingPage: number;
    pinpoint?: Pinpoint;
  }
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  pushCoreElements(runs, data);

  // Starting page (Rule 5.6)
  runs.push({ text: ` ${data.startingPage}` });

  // Pinpoint (Rule 5.7)
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── JOUR-002: Journal Article — Part (Rule 5.8) ───────────────────────────

/**
 * Formats a multi-part journal article citation per AGLC4 Rule 5.8.
 *
 * AGLC4 Rule 5.8: '(Pt «Number»)' is inserted between the title and the
 * year; any reference to the part within the article title itself is
 * stripped (eg a trailing '— Part I').
 *
 * @param data - The multi-part journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.8.
 */
export function formatJournalArticlePart(
  data: JournalCore & {
    startingPage: number;
    pinpoint?: Pinpoint;
    partNumber: number;
  }
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (quoted), with any in-title part reference stripped (Rule 5.8)
  runs.push(...formatSecondaryTitle(stripPartFromTitle(data.title), "journal.article"));

  // Part indicator between title and year (Rule 5.8)
  runs.push({ text: ` (Pt ${data.partNumber})` });

  // Year (Rule 5.3)
  runs.push({ text: ` ${formatJournalYear(data.year, isYearOrganised(data))}` });

  // Volume and issue (Rule 5.4)
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal title — italicised (Rule 5.5)
  runs.push(journalTitleRun(data.journal));

  // Starting page
  runs.push({ text: ` ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// NOTE (Rule 5.9 — Symposia): a symposium cited as a whole is an ordinary
// journal article citation with 'Symposium' in the author position; there is
// no separate format. The former formatSymposiumArticle (which appended the
// symposium title after the article title, preceded by 'in') encoded a rule
// that does not exist in AGLC4 and has been removed. Use
// formatJournalArticle with `authors: [{ surname: 'Symposium' }]`.

// ─── JOUR-004: Online Journal Article (Rule 5.10) ──────────────────────────

/**
 * Formats an online journal article citation per AGLC4 Rule 5.10.
 *
 * AGLC4 Rule 5.10: articles in online-only journals are cited like printed
 * journal articles as far as possible. An article number or other
 * identifier replaces the starting page; pinpoints follow the identifier
 * after a comma (Rules 1.1.6–1.1.7). A URL is optional per Rule 4.4.
 *
 * @param data - The online journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.10.
 */
export function formatOnlineJournalArticle(
  data: JournalCore & {
    articleNumber?: string;
    startingPage?: number;
    pinpoint?: Pinpoint;
    url?: string;
  }
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  pushCoreElements(runs, data);

  // Article number/identifier in place of the starting page (Rule 5.10)
  if (data.articleNumber) {
    runs.push({ text: ` ${data.articleNumber}` });
  } else if (data.startingPage !== undefined) {
    runs.push({ text: ` ${data.startingPage}` });
  }

  // Pinpoint after the identifier, preceded by a comma (Rule 5.10)
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  // Optional URL in angle brackets (Rule 4.4)
  if (data.url) {
    runs.push({ text: " " });
    runs.push(...formatUrl(data.url));
  }

  return runs;
}

// ─── JOUR-005: Forthcoming and Advance Articles (Rule 5.11) ────────────────

/**
 * Formats a forthcoming or advance journal article citation per AGLC4
 * Rule 5.11.
 *
 * AGLC4 Rule 5.11: '(forthcoming)' — or '(advance)' for an advance
 * version — replaces the starting page; as much of the remaining citation
 * information (year, volume, issue) as is available is included.
 *
 * @param data - The forthcoming/advance article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.11.
 */
export function formatForthcomingArticle(data: {
  authors: Author[];
  title: string;
  journal: string;
  year?: number | string;
  volume?: number;
  issue?: string;
  yearOrganised?: boolean;
  /** Emits '(advance)' instead of '(forthcoming)'. */
  advance?: boolean;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title (quoted)
  runs.push(...formatSecondaryTitle(data.title, "journal.forthcoming"));

  // Year (Rule 5.3), where known
  if (data.year !== undefined && data.year !== "") {
    runs.push({ text: ` ${formatJournalYear(data.year, isYearOrganised(data))}` });
    // Volume and issue (Rule 5.4), where known
    runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });
  } else {
    runs.push({ text: " " });
  }

  // Journal title — italicised (Rule 5.5)
  runs.push(journalTitleRun(data.journal));

  // Status marker in place of the starting page (Rule 5.11)
  runs.push({ text: data.advance ? " (advance)" : " (forthcoming)" });

  return runs;
}
