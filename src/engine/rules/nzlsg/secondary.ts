/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-007: NZ-Specific Secondary Sources
 *
 * NZLSG Rules 6.1–6.7: Books with 'at' pinpoint and place of publication.
 * Journal abbreviations. NZ Law Commission reports (NZLC R/SP Number).
 * Double quotation marks for titles.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZBookData {
  /** Author name(s). */
  author: string;
  /** Title of the book (will be italicised). */
  title: string;
  /** Edition (omitted for first edition). */
  edition?: string;
  /** Publisher name. */
  publisher: string;
  /** Place of publication. */
  place: string;
  /** Year of publication. */
  year: number;
  /** Pinpoint reference (used with 'at' prefix). */
  pinpoint?: string;
}

export interface NZJournalArticleData {
  /** Author name(s). */
  author: string;
  /** Article title (in double quotation marks). */
  title: string;
  /** Year of the journal. */
  year: number;
  /** Volume number. */
  volume?: number;
  /** Journal abbreviation (e.g. 'VUWLR', 'NZLR'). */
  journal: string;
  /** Starting page. */
  startPage: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZLawCommissionData {
  /** Title of the report (will be italicised). */
  title: string;
  /** Report type: R (Report), SP (Study Paper), IP (Issues Paper), PP (Preliminary Paper). */
  reportType: "R" | "SP" | "IP" | "PP";
  /** Report number. */
  reportNumber: number;
  /** Year of the report. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZThesisData {
  /** Author name. */
  author: string;
  /** Title of the thesis (will be italicised). */
  title: string;
  /** Degree type (e.g. 'LLM', 'PhD'). */
  degree: string;
  /** University name. */
  university: string;
  /** Year of submission. */
  year: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZOnlineLooseleafData {
  /** Editor name(s). */
  editor: string;
  /** Title of the work (will be italicised). */
  title: string;
  /** Publisher name. */
  publisher: string;
  /** Date accessed (formatted for display). */
  accessDate?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── NZLSG-007: Books ──────────────────────────────────────────────────────

/**
 * Formats a book citation per NZLSG Rule 6.1.
 *
 * NZLSG Rule 6.1: Author Title (edition, Publisher, Place, Year) at page.
 * Note the 'at' pinpoint prefix and place of publication.
 *
 * @example
 *   // Andrew Butler and Petra Butler The New Zealand Bill of Rights Act:
 *   // A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 134
 *   formatBook({
 *     author: "Andrew Butler and Petra Butler",
 *     title: "The New Zealand Bill of Rights Act: A Commentary",
 *     edition: "2nd ed",
 *     publisher: "LexisNexis",
 *     place: "Wellington",
 *     year: 2015,
 *     pinpoint: "134",
 *   })
 */
export function formatBook(data: NZBookData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author} ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Publication details in parentheses
  const pubParts: string[] = [];
  if (data.edition) {
    pubParts.push(data.edition);
  }
  pubParts.push(data.publisher);
  pubParts.push(data.place);
  pubParts.push(String(data.year));
  runs.push({ text: ` (${pubParts.join(", ")})` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-007: Journal Articles ───────────────────────────────────────────

/**
 * Formats a journal article citation per NZLSG Rule 6.2.
 *
 * NZLSG Rule 6.2: Double quotation marks for article titles.
 * Journal abbreviations per LCANZ database.
 *
 * @example
 *   // Claudia Geiringer "On a Road to Nowhere: Implied Declaration of
 *   // Inconsistency and the New Zealand Bill of Rights Act" (2009) 40 VUWLR 613
 *   formatJournalArticle({
 *     author: "Claudia Geiringer",
 *     title: "On a Road to Nowhere: Implied Declaration of Inconsistency and the New Zealand Bill of Rights Act",
 *     year: 2009,
 *     volume: 40,
 *     journal: "VUWLR",
 *     startPage: 613,
 *   })
 */
export function formatJournalArticle(
  data: NZJournalArticleData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author} ` });

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Year, volume, journal, start page
  let journalRef = ` (${data.year})`;
  if (data.volume !== undefined) {
    journalRef += ` ${data.volume}`;
  }
  journalRef += ` ${data.journal} ${data.startPage}`;
  runs.push({ text: journalRef });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-007: NZ Law Commission Reports ─────────────────────────────────

/**
 * Formats a NZ Law Commission report per NZLSG Rule 6.7.
 *
 * NZLSG Rule 6.7: Law Commission Title (NZLC R/SP/IP/PP Number, Year).
 *
 * @example
 *   // Law Commission Review of the Privacy Act 1993 (NZLC R123, 2011) at 55
 *   formatLawCommission({
 *     title: "Review of the Privacy Act 1993",
 *     reportType: "R",
 *     reportNumber: 123,
 *     year: 2011,
 *     pinpoint: "55",
 *   })
 */
export function formatLawCommission(
  data: NZLawCommissionData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author: Law Commission
  runs.push({ text: "Law Commission " });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // NZLC reference and year in parentheses
  runs.push({
    text: ` (NZLC ${data.reportType}${data.reportNumber}, ${data.year})`,
  });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-007: Theses ─────────────────────────────────────────────────────

/**
 * Formats a thesis citation per NZLSG Rule 6.5.
 *
 * NZLSG Rule 6.5: Author Title (Degree, University, Year).
 *
 * @example
 *   // John Smith "The Impact of Treaty Settlements" (LLM Thesis,
 *   // Victoria University of Wellington, 2015) at 45
 *   formatThesis({
 *     author: "John Smith",
 *     title: "The Impact of Treaty Settlements",
 *     degree: "LLM",
 *     university: "Victoria University of Wellington",
 *     year: 2015,
 *     pinpoint: "45",
 *   })
 */
export function formatThesis(data: NZThesisData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author} ` });

  // Title in double quotation marks (theses are not italicised in NZLSG)
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Degree, university, year in parentheses
  runs.push({
    text: ` (${data.degree} Thesis, ${data.university}, ${data.year})`,
  });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-007: Online Looseleaf ───────────────────────────────────────────

/**
 * Formats an online looseleaf commentary per NZLSG Rule 6.4.
 *
 * NZLSG Rule 6.4: Editor (ed) Title (online ed, Publisher) at date.
 *
 * @example
 *   // Stephen Todd (ed) The Law of Torts in New Zealand (online ed, Brookers)
 *   formatOnlineLooseleaf({
 *     editor: "Stephen Todd",
 *     title: "The Law of Torts in New Zealand",
 *     publisher: "Brookers",
 *   })
 */
export function formatOnlineLooseleaf(
  data: NZOnlineLooseleafData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Editor with (ed) designation
  runs.push({ text: `${data.editor} (ed) ` });

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Publication details
  runs.push({ text: ` (online ed, ${data.publisher})` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
