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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds the volume/issue portion of a journal citation.
 *
 * Format: ` Volume(Issue) ` or ` Volume ` or ` (Issue) ` or ` `.
 * Leading and trailing spaces are included for seamless concatenation.
 */
function formatVolumeAndIssue(volume?: number, issue?: string): string {
  let result = " ";
  if (volume !== undefined) {
    result += String(volume);
  }
  if (issue) {
    result += `(${issue})`;
  }
  if (volume !== undefined || issue) {
    result += " ";
  }
  return result;
}

// ─── JOUR-001: Journal Article (Rules 5.1–5.7) ─────────────────────────────

/**
 * Formats a journal article citation per AGLC4 Rules 5.1–5.7.
 *
 * AGLC4 Rule 5.1: The general form for a journal article citation is:
 *   Author, 'Title' (Year) Volume(Issue) *Journal* StartingPage, Pinpoint.
 *
 * AGLC4 Rule 5.2: The author is formatted per the general secondary source
 * author rules (Rules 4.1.1–4.1.5).
 *
 * AGLC4 Rule 5.3: The title is enclosed in single curly quotation marks
 * and formatted per Rule 4.2.
 *
 * AGLC4 Rule 5.4: The year of publication appears in round brackets.
 *
 * AGLC4 Rule 5.5: The volume number appears after the year. If an issue
 * number is present, it follows the volume in parentheses.
 *
 * AGLC4 Rule 5.6: The journal name is italicised and should not be
 * abbreviated unless the abbreviation is the journal's conventional name.
 *
 * AGLC4 Rule 5.7: The starting page number follows the journal name.
 * A pinpoint reference, if any, follows the starting page after a comma.
 *
 * @param data - The journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 5.1–5.7.
 */
export function formatJournalArticle(data: {
  authors: Author[];
  title: string;
  year: number;
  volume?: number;
  issue?: string;
  journal: string;
  startingPage: number;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  const authorRuns = formatAuthors(data.authors);
  runs.push(...authorRuns);

  // Separator between author and title
  runs.push({ text: ", " });

  // Title — journal articles are quoted, not italicised (Rule 5.3 / 4.2)
  const titleRuns = formatSecondaryTitle(data.title, "journal.article");
  runs.push(...titleRuns);

  // Year in round brackets (Rule 5.4)
  runs.push({ text: ` (${data.year})` });

  // Volume and issue (Rule 5.5)
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal name — italicised (Rule 5.6)
  runs.push({ text: data.journal, italic: true });

  // Starting page (Rule 5.7)
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
 * AGLC4 Rule 5.8: Where a journal article is published in parts, the part
 * number should be indicated after the title, preceded by '(Part' and
 * followed by ')'. The format is otherwise identical to a standard journal
 * article citation.
 *
 * @param data - The multi-part journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.8.
 */
export function formatJournalArticlePart(data: {
  authors: Author[];
  title: string;
  year: number;
  volume?: number;
  issue?: string;
  journal: string;
  startingPage: number;
  pinpoint?: Pinpoint;
  partNumber: number;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));

  // Separator
  runs.push({ text: ", " });

  // Title (quoted)
  runs.push(...formatSecondaryTitle(data.title, "journal.article"));

  // Part indicator (Rule 5.8)
  runs.push({ text: ` (Part ${data.partNumber})` });

  // Year
  runs.push({ text: ` (${data.year})` });

  // Volume and issue
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal name — italicised
  runs.push({ text: data.journal, italic: true });

  // Starting page
  runs.push({ text: ` ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── JOUR-003: Symposium Article (Rule 5.9) ─────────────────────────────────

/**
 * Formats a symposium article citation per AGLC4 Rule 5.9.
 *
 * AGLC4 Rule 5.9: Where a journal article appears as part of a symposium
 * or special issue, the symposium title should be included after the article
 * title, preceded by 'in'. The symposium title is not enclosed in quotation
 * marks and is not italicised. The rest of the citation follows the standard
 * journal article format.
 *
 * @param data - The symposium article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.9.
 */
export function formatSymposiumArticle(data: {
  authors: Author[];
  title: string;
  year: number;
  volume?: number;
  issue?: string;
  journal: string;
  startingPage: number;
  pinpoint?: Pinpoint;
  symposiumTitle: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));

  // Separator
  runs.push({ text: ", " });

  // Article title (quoted)
  runs.push(...formatSecondaryTitle(data.title, "journal.article"));

  // Symposium title (Rule 5.9)
  runs.push({ text: ` in ${data.symposiumTitle}` });

  // Year
  runs.push({ text: ` (${data.year})` });

  // Volume and issue
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal name — italicised
  runs.push({ text: data.journal, italic: true });

  // Starting page
  runs.push({ text: ` ${data.startingPage}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── JOUR-004: Online Journal Article (Rule 5.10) ──────────────────────────

/**
 * Formats an online journal article citation per AGLC4 Rule 5.10.
 *
 * AGLC4 Rule 5.10: Where a journal article is available only online,
 * the URL should be included in angle brackets at the end of the citation.
 * If the journal uses article numbers instead of page numbers, the article
 * number replaces the starting page. The format is otherwise identical to
 * a standard journal article citation.
 *
 * @param data - The online journal article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.10.
 */
export function formatOnlineJournalArticle(data: {
  authors: Author[];
  title: string;
  year: number;
  volume?: number;
  issue?: string;
  journal: string;
  articleNumber?: string;
  url: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));

  // Separator
  runs.push({ text: ", " });

  // Title (quoted)
  runs.push(...formatSecondaryTitle(data.title, "journal.online"));

  // Year
  runs.push({ text: ` (${data.year})` });

  // Volume and issue
  runs.push({ text: formatVolumeAndIssue(data.volume, data.issue) });

  // Journal name — italicised
  runs.push({ text: data.journal, italic: true });

  // Article number (if applicable)
  if (data.articleNumber) {
    runs.push({ text: ` ${data.articleNumber}` });
  }

  // URL in angle brackets (Rule 5.10 / 4.4)
  runs.push({ text: " " });
  runs.push(...formatUrl(data.url));

  return runs;
}

// ─── JOUR-005: Forthcoming Article (Rule 5.11) ─────────────────────────────

/**
 * Formats a forthcoming journal article citation per AGLC4 Rule 5.11.
 *
 * AGLC4 Rule 5.11: Where a journal article has been accepted for publication
 * but has not yet been published, '(forthcoming)' should appear after the
 * journal name. No volume, issue, or page numbers are included.
 *
 * @param data - The forthcoming article citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 5.11.
 */
export function formatForthcomingArticle(data: {
  authors: Author[];
  title: string;
  journal: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));

  // Separator
  runs.push({ text: ", " });

  // Title (quoted)
  runs.push(...formatSecondaryTitle(data.title, "journal.forthcoming"));

  // Journal name — italicised
  runs.push({ text: " " });
  runs.push({ text: data.journal, italic: true });

  // Forthcoming indicator (Rule 5.11)
  runs.push({ text: " (forthcoming)" });

  return runs;
}
