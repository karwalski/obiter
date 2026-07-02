/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — International Court of Justice (Rules 10.1–10.5)
 *
 * Pure formatting functions for ICJ/PCIJ decisions and pleadings.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-006: ICJ Decision (Rules 10.1–10.5) ──────────────────────────────

/**
 * Formats an ICJ or PCIJ decision citation per AGLC4 Rules 10.1–10.5.
 *
 * AGLC4 Rule 10.1: The general form for an ICJ decision is:
 *   *Case Name* (*Phase*) [Year] Report Series Page (Judge Opinion Type).
 *
 * AGLC4 Rule 10.2: The case name is italicised. Where the case involves
 * two parties, their names are separated by a solidus (/).
 *
 * AGLC4 Rule 10.3: The phase of the case (e.g. 'Jurisdiction',
 * 'Merits', 'Preliminary Objections') is included in parentheses
 * after the case name where the case has multiple phases.
 *
 * AGLC4 Rule 10.4: The report series is either 'ICJ Reports' for the
 * International Court of Justice or the relevant PCIJ Series (e.g.
 * 'PCIJ (ser A)', 'PCIJ (ser A/B)', 'PCIJ (ser B)', 'PCIJ (ser C)',
 * 'PCIJ (ser D)', 'PCIJ (ser E)'). The year appears in square brackets
 * before the report series.
 *
 * AGLC4 Rule 10.5: Separate and dissenting opinions are indicated in
 * parentheses after the page number, with the judge's name and the
 * type of opinion (e.g. 'Judge Higgins dissenting opinion',
 * 'Judge Weeramantry separate opinion').
 *
 * @param data - The ICJ decision citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 10.1–10.5.
 */
export function formatIcjDecision(data: {
  caseName: string;
  parties?: string;
  phase?: string;
  year: number;
  reportSeries: string;
  seriesLetter?: string;
  page?: number;
  caseNumber?: number;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised (Rule 10.2.1)
  runs.push({ text: data.caseName, italic: true });

  // Parties or '(Advisory Opinion)' — italicised (Rule 10.2.2)
  if (data.parties) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.parties})`, italic: true });
  }

  // Phase in parentheses — italicised (Rule 10.2.3)
  if (data.phase) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.phase})`, italic: true });
  }

  // Year in square brackets (Rule 10.2.4)
  runs.push({ text: ` [${data.year}]` });

  // Report series and optional series letter for PCIJ (Rule 10.2.5)
  if (data.seriesLetter) {
    runs.push({ text: ` PCIJ (ser ${data.seriesLetter})` });
  } else {
    runs.push({ text: ` ${data.reportSeries}` });
  }

  // Starting page for ICJ or case number for PCIJ (Rule 10.2.6)
  if (data.caseNumber !== undefined) {
    runs.push({ text: ` No ${data.caseNumber}` });
  } else if (data.page !== undefined) {
    runs.push({ text: ` ${data.page}` });
  }

  // Pinpoint references (Rule 10.2.7)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Identifying judges — only for separate/dissenting opinions (Rule 10.2.8)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

// ─── INTL-006: ICJ Pleading (Rule 10.3) ─────────────────────────────────────

/**
 * Formats an ICJ pleading citation per AGLC4 Rule 10.3.
 *
 * AGLC4 Rule 10.3: Pleadings before the ICJ are cited with the
 * document title, case name, and the relevant volume of the
 * ICJ Pleadings series.
 *
 * The format is:
 *   Document Title, *Case Name* (Year) [Vol] ICJ Pleadings Page.
 *
 * @param data - The ICJ pleading citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 10.3.
 */
export function formatIcjPleading(data: {
  documentTitle: string;
  caseName: string;
  parties?: string;
  year: number;
  volume?: string;
  page?: number;
  pinpoint?: string;
  speaker?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document title — in single quotes (Rule 10.3)
  runs.push({ text: `'${data.documentTitle}'` });

  // Separator
  runs.push({ text: ", " });

  // Case name — italicised (Rule 10.2.1)
  runs.push({ text: data.caseName, italic: true });

  // Parties or advisory opinion — italicised (Rule 10.2.2)
  if (data.parties) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.parties})`, italic: true });
  }

  // Year in square brackets (Rule 10.3)
  runs.push({ text: ` [${data.year}]` });

  // Volume in Roman numerals before ICJ Pleadings (Rule 10.3)
  if (data.volume) {
    runs.push({ text: ` ${data.volume}` });
  }

  // ICJ Pleadings series
  runs.push({ text: " ICJ Pleadings" });

  // Starting page
  if (data.page !== undefined) {
    runs.push({ text: ` ${data.page}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Speaker's name
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  return runs;
}

// ─── PARITY: Unreported ICJ Materials (Rules 10.4.1–10.4.2) ──────────────────

/**
 * Formats an unreported ICJ decision, pleading or other document per AGLC4
 * Rules 10.4.1–10.4.2.
 *
 * AGLC4 Rule 10.4.1 (decisions):
 *   *Case Name* (*Parties*) (*Phase*) (International Court of Justice,
 *   General List No N, Full Date) Pinpoint (Judge).
 *
 * AGLC4 Rule 10.4.2 (pleadings and other documents):
 *   'Document Title', *Case Name* (*Parties*) (International Court of
 *   Justice, General List No N, Full Date) Pinpoint (Speaker).
 *
 * The general list number appears as on the page where the judgment
 * commences; pinpoints should be to paragraphs; judges'/speakers' names may
 * follow pinpoints.
 *
 * @param data - The unreported ICJ citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 10.4.1–10.4.2.
 */
export function formatIcjUnreported(data: {
  caseName: string;
  parties?: string;
  phase?: string;
  generalListNumber: string;
  date: string;
  documentTitle?: string;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document title — pleadings and other documents only (Rule 10.4.2)
  if (data.documentTitle) {
    runs.push({ text: `'${data.documentTitle}', ` });
  }

  // Case name — italicised (Rule 10.2.1)
  runs.push({ text: data.caseName, italic: true });

  // Parties — italicised in parentheses (Rule 10.2.2)
  if (data.parties) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.parties})`, italic: true });
  }

  // Phase — italicised in parentheses (Rules 10.4.1, 10.2.3)
  if (data.phase) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.phase})`, italic: true });
  }

  // Court, general list number and full date (Rule 10.4.1)
  runs.push({
    text: ` (International Court of Justice, General List No ${data.generalListNumber}, ${data.date})`,
  });

  // Pinpoint — space-separated, to paragraphs (Rules 1.1.6–1.1.7)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  // Judge or speaker — after pinpoints (Rules 10.2.8, 2.4.4)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}
