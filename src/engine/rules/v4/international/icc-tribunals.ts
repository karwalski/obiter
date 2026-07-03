/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — International Criminal Courts and Tribunals (Rules 12.1–12.4)
 *
 * INTL-008: Pure formatting functions for cases before the ICC, ICTY,
 * ICTR, SCSL, and STL.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-008: ICC and International Criminal Tribunal Cases ─────────────────

/**
 * Formats a case citation for an international criminal court or tribunal.
 *
 * AGLC4 Rules 12.1–12.4: Cases before the ICC, ICTY, ICTR, SCSL, and STL
 * are cited with the case name (italicised), followed by the phase of
 * proceedings, the court abbreviation, the chamber designation, the case
 * number, the date, and an optional pinpoint.
 *
 * Supported courts:
 * - ICC  — International Criminal Court (Rule 12.1)
 * - ICTY — International Criminal Tribunal for the former Yugoslavia (Rule 12.2)
 * - ICTR — International Criminal Tribunal for Rwanda (Rule 12.3)
 * - SCSL — Special Court for Sierra Leone (Rule 12.3)
 * - STL  — Special Tribunal for Lebanon (Rule 12.4)
 *
 * Format:
 *   *Case Name* (Court, Chamber, Case No, Date) pinpoint
 *
 * @example
 *   Prosecutor v Lubanga (Judgment) (ICC, Trial Chamber I,
 *   Case No ICC-01/04-01/06, 14 March 2012)
 *
 * @example
 *   Prosecutor v Tadić (Appeal Judgment) (ICTY, Appeals Chamber,
 *   Case No IT-94-1-A, 15 July 1999) [64]
 */
export function formatIccCase(data: {
  caseName: string;
  phase: string;
  court: string;
  chamber: string;
  caseNumber: string;
  date: string;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rules 12.1–12.4
  runs.push({ text: data.caseName, italic: true });

  // Phase of proceedings in parentheses — italicised (Rule 12.2.2)
  runs.push({ text: " " });
  runs.push({ text: `(${data.phase})`, italic: true });

  // Court, chamber, case number, and date in parentheses.
  // 'Case Nos' where multiple case numbers are joined with 'and' (Rule 12.2.5).
  const caseNoLabel = /\band\b/.test(data.caseNumber) ? "Case Nos" : "Case No";
  runs.push({
    text: ` (${data.court}, ${data.chamber}, ${caseNoLabel} ${data.caseNumber}, ${data.date})`,
  });

  // Optional pinpoint reference (Rule 12.2.7)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  // Judge — after pinpoints, for separate/dissenting opinions only
  // (Rules 12.2.8, 10.2.8)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

// ─── PARITY: Reports of Cases (Rule 12.3) ────────────────────────────────────

/**
 * Formats a reported international criminal tribunal decision per AGLC4
 * Rule 12.3.
 *
 * AGLC4 Rule 12.3: Judgments appearing in report series (e.g. ILR, ILM)
 * are cited as:
 *   *Parties' Names* (*Phase*) (Year) Volume Series StartingPage, Pinpoint
 *   (Tribunal, Chamber).
 *
 * Parties' names and phase follow rules 12.2.1–12.2.2 (both italicised);
 * year, volume, report series and starting page follow rules 2.2.1–2.2.4;
 * the conventional shortened tribunal name and chamber may optionally close
 * the citation in parentheses after any pinpoint or judges' names.
 *
 * @param data - The reported tribunal case citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 12.3.
 */
export function formatIccCaseReported(data: {
  caseName: string;
  phase?: string;
  year: number;
  volume?: number;
  reportSeries: string;
  startingPage: number;
  pinpoint?: string;
  judge?: string;
  tribunal?: string;
  chamber?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Parties' names — italicised (Rule 12.2.1)
  runs.push({ text: data.caseName, italic: true });

  // Phase — italicised in parentheses (Rule 12.2.2)
  if (data.phase) {
    runs.push({ text: " " });
    runs.push({ text: `(${data.phase})`, italic: true });
  }

  // Year, volume, report series, starting page (Rules 2.2.1–2.2.4)
  runs.push({ text: ` (${data.year})` });
  if (data.volume !== undefined) {
    runs.push({ text: ` ${data.volume}` });
  }
  runs.push({ text: ` ${data.reportSeries} ${data.startingPage}` });

  // Pinpoint — comma-preceded (Rule 10.2.7)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Judge — separate/dissenting opinions only (Rule 12.2.8)
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  // Optional tribunal and chamber parenthetical (Rules 12.3, 2.2.6)
  if (data.tribunal) {
    const tail = data.chamber ? `${data.tribunal}, ${data.chamber}` : data.tribunal;
    runs.push({ text: ` (${tail})` });
  }

  return runs;
}

// ─── PARITY: Rules of Tribunals and Courts (Rule 12.1.2) ────────────────────

/**
 * Formats the procedural or internal rules of an international criminal
 * tribunal or court per AGLC4 Rule 12.1.2.
 *
 * AGLC4 Rule 12.1.2: the form is
 *   «Name of Tribunal or Court», *Title of Rules*, Doc No «Document
 *   Number» (adopted «Full Date») «Pinpoint».
 * A document number is included only where one appears on the rules
 * themselves (labelled 'Doc No', rule 9.2.10); where the rules have been
 * revised, the date is the adoption date of the revision. Pinpoints follow
 * rule 8.7 and are generally to rules and sub-rules.
 *
 * @example
 *   // International Criminal Court, Rules of Procedure and Evidence,
 *   //   Doc No ICC-ASP/1/3 (adopted 9 September 2002) r 74  — AGLC4 ex 6
 *   formatTribunalRules({
 *     tribunal: "International Criminal Court",
 *     title: "Rules of Procedure and Evidence",
 *     documentNumber: "ICC-ASP/1/3",
 *     adoptedDate: "9 September 2002",
 *     pinpoint: "r 74",
 *   })
 *
 * @param data - The tribunal rules citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 12.1.2.
 */
export function formatTribunalRules(data: {
  tribunal: string;
  title: string;
  documentNumber?: string;
  adoptedDate: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Name of the tribunal or court (roman)
  runs.push({ text: `${data.tribunal}, ` });

  // Title of the rules — italicised
  runs.push({ text: data.title, italic: true });

  // Document number — only where it appears on the rules (Rule 9.2.10)
  if (data.documentNumber) {
    const docNo = /^Doc No\b/i.test(data.documentNumber)
      ? data.documentNumber
      : `Doc No ${data.documentNumber}`;
    runs.push({ text: `, ${docNo}` });
  }

  // Adoption date — of the revision, where revised
  runs.push({ text: ` (adopted ${data.adoptedDate})` });

  // Pinpoint — generally rules and sub-rules (Rule 8.7)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}
