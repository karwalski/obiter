/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-006: NZ Parliamentary Materials
 *
 * NZLSG Rules 5.4–5.5: NZPD format, select committee submissions,
 * cabinet documents, NZ Gazette, AJHR.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZPDData {
  /** Date of the debate (formatted as 'D Month Year'). */
  date: string;
  /** Volume number of NZPD. */
  volume: number;
  /** Page number. */
  page: number;
  /** Speaker name (optional). */
  speaker?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface SelectCommitteeSubmissionData {
  /** Name of the submitter. */
  submitter: string;
  /** Name of the select committee. */
  committee: string;
  /** Title of the inquiry or bill. */
  inquiryTitle: string;
  /** Date of the submission (formatted as 'D Month Year'). */
  date?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface CabinetDocumentData {
  /** Document title. */
  title: string;
  /** Cabinet reference number. */
  reference: string;
  /** Date of the document (formatted as 'D Month Year'). */
  date: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZGazetteData {
  /** Title of the notice. */
  title: string;
  /** Year of the Gazette. */
  year: number;
  /** Page number. */
  page: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface AJHRData {
  /** Author or body responsible. */
  author?: string;
  /** Title of the paper (will be italicised). */
  title: string;
  /** AJHR reference (e.g. 'AJHR 1920 H-31'). */
  reference: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── NZLSG-006: NZPD (Parliamentary Debates) ──────────────────────────────

/**
 * Formats a NZ Parliamentary Debates (Hansard) citation per NZLSG Rule 5.4.
 *
 * NZLSG Rule 5.4: Format is (Date) Volume NZPD Page (Speaker).
 *
 * @example
 *   // (21 July 2009) 656 NZPD 5531 (Christopher Finlayson)
 *   formatNZPD({
 *     date: "21 July 2009",
 *     volume: 656,
 *     page: 5531,
 *     speaker: "Christopher Finlayson",
 *   })
 */
export function formatNZPD(data: NZPDData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Date in parentheses
  runs.push({ text: `(${data.date}) ` });

  // Volume NZPD Page
  runs.push({ text: `${data.volume} NZPD ${data.page}` });

  // Speaker in parentheses
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-006: Select Committee Submissions ───────────────────────────────

/**
 * Formats a select committee submission per NZLSG Rule 5.5.
 *
 * @example
 *   // New Zealand Law Society "Submission to the Justice and Electoral
 *   // Committee on the Search and Surveillance Bill" (2009)
 *   formatSelectCommitteeSubmission({
 *     submitter: "New Zealand Law Society",
 *     committee: "Justice and Electoral Committee",
 *     inquiryTitle: "Search and Surveillance Bill",
 *     date: "2009",
 *   })
 */
export function formatSelectCommitteeSubmission(
  data: SelectCommitteeSubmissionData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Submitter
  runs.push({ text: `${data.submitter} ` });

  // Submission title in double quotation marks
  runs.push({
    text: `\u201CSubmission to the ${data.committee} on the ${data.inquiryTitle}\u201D`,
  });

  // Date
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-006: Cabinet Documents ──────────────────────────────────────────

/**
 * Formats a cabinet document citation per NZLSG Rule 5.5.
 *
 * @example
 *   // Cabinet Office "Power to Delay Commencement of the Search and
 *   // Surveillance Act 2012" (CAB Min (12) 14/11, 30 April 2012)
 *   formatCabinetDocument({
 *     title: "Power to Delay Commencement of the Search and Surveillance Act 2012",
 *     reference: "CAB Min (12) 14/11",
 *     date: "30 April 2012",
 *   })
 */
export function formatCabinetDocument(
  data: CabinetDocumentData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Cabinet Office as author
  runs.push({ text: "Cabinet Office " });

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Reference and date in parentheses
  runs.push({ text: ` (${data.reference}, ${data.date})` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-006: NZ Gazette ─────────────────────────────────────────────────

/**
 * Formats a NZ Gazette notice citation per NZLSG Rule 5.5.
 *
 * @example
 *   // "Notice Title" (2018) New Zealand Gazette 1234
 *   formatNZGazette({
 *     title: "Notice Title",
 *     year: 2018,
 *     page: 1234,
 *   })
 */
export function formatNZGazette(data: NZGazetteData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in double quotation marks
  runs.push({ text: `\u201C${data.title}\u201D` });

  // Year and series
  runs.push({ text: ` (${data.year}) New Zealand Gazette ${data.page}` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-006: AJHR ───────────────────────────────────────────────────────

/**
 * Formats an Appendix to the Journals of the House of Representatives citation.
 *
 * @example
 *   // Department of Justice Reform of the Law of Contempt AJHR 1987 I.11
 *   formatAJHR({
 *     author: "Department of Justice",
 *     title: "Reform of the Law of Contempt",
 *     reference: "AJHR 1987 I.11",
 *   })
 */
export function formatAJHR(data: AJHRData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author (if provided)
  if (data.author) {
    runs.push({ text: `${data.author} ` });
  }

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // AJHR reference
  runs.push({ text: ` ${data.reference}` });

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
