/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Supranational Materials (Rules 14.2–14.5)
 *
 * INTL-010: EU materials — Official Journal, treaties, CJEU cases
 *           (Rules 14.2.1–14.2.3).
 * INTL-011: European Court of Human Rights cases (Rules 14.3.1–14.3.3).
 * INTL-012: Other supranational decisions and documents (Rules 14.4–14.5).
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-010a: EU Official Journal (Rule 14.2.1) ───────────────────────────

/**
 * Formats a citation to the Official Journal of the European Union.
 *
 * AGLC4 Rule 14.2.1: EU legislative instruments published in the
 * Official Journal are cited with the instrument type and number,
 * the title (italicised), the year, the OJ series, and the page number.
 *
 * Format:
 *   Instrument Type and Number, *Title* [Year] OJ Series Page
 *
 * @example
 *   Regulation (EC) No 139/2004, Council Regulation on the Control of
 *   Concentrations between Undertakings [2004] OJ L 24/1
 */
export function formatEuOfficialJournal(data: {
  instrumentType: string;
  title: string;
  year: number;
  ojSeries: string;
  page: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Instrument type and number
  runs.push({ text: `${data.instrumentType}, ` });

  // Title — italicised per AGLC4 Rule 14.2.1
  runs.push({ text: data.title, italic: true });

  // Year, OJ series, and page
  runs.push({ text: ` [${data.year}] OJ ${data.ojSeries} ${data.page}` });

  return runs;
}

// ─── INTL-010b: EU Treaties (Rule 14.2.2) ───────────────────────────────────

/**
 * Formats a citation to an EU or EC treaty.
 *
 * AGLC4 Rule 14.2.2: EU treaties are cited with the full title
 * (italicised) and the pinpoint (if any). Subsequent references
 * may use a short title.
 *
 * Format:
 *   *Title* art/pinpoint
 *
 * @example
 *   Treaty on European Union, opened for signature 7 February 1992,
 *   [1992] OJ C 191/1 (entered into force 1 November 1993) art 6
 */
export function formatEuTreaty(data: {
  title: string;
  signatureInfo?: string;
  ojReference?: string;
  entryIntoForce?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 14.2.2
  runs.push({ text: data.title, italic: true });

  // Optional signature information
  if (data.signatureInfo) {
    runs.push({ text: `, ${data.signatureInfo}` });
  }

  // Optional OJ reference
  if (data.ojReference) {
    runs.push({ text: `, ${data.ojReference}` });
  }

  // Optional entry into force
  if (data.entryIntoForce) {
    runs.push({ text: ` (entered into force ${data.entryIntoForce})` });
  }

  // Optional pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-010c: CJEU Cases (Rule 14.2.3) ───────────────────────────────────

/**
 * Formats a Court of Justice of the European Union (CJEU) case citation.
 *
 * AGLC4 Rule 14.2.3: CJEU cases are cited with the case name
 * (italicised), the case number, the report series reference (ECR),
 * and the court designation if not the Grand Chamber.
 *
 * Format:
 *   *Case Name* (Case Number) [Year] ECR Page
 *   *Case Name* (Case Number) [Year] ECR Page (Court)
 *
 * @example
 *   Kadi v Council of the European Union (Joined Cases C-402/05 P
 *   and C-415/05 P) [2008] ECR I-6351
 */
export function formatCjeuCase(data: {
  caseName: string;
  caseNumber: string;
  year: number;
  reportSeries: string;
  page: string;
  court?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rule 14.2.3
  runs.push({ text: data.caseName, italic: true });

  // Case number in parentheses
  runs.push({ text: ` (${data.caseNumber})` });

  // Report series reference
  runs.push({ text: ` [${data.year}] ${data.reportSeries} ${data.page}` });

  // Optional court designation
  if (data.court) {
    runs.push({ text: ` (${data.court})` });
  }

  return runs;
}

// ─── INTL-011: European Court of Human Rights (Rules 14.3.1–14.3.3) ─────────

/**
 * Formats a European Court of Human Rights (ECtHR) case citation.
 *
 * AGLC4 Rules 14.3.1–14.3.3: ECtHR cases are cited with the case name
 * (italicised), the application number, the chamber designation (if
 * not the Grand Chamber), the report series (ECHR or unreported), and
 * the date.
 *
 * Format:
 *   *Case Name* (European Court of Human Rights, Chamber,
 *   Application No, Date)
 *   *Case Name* (European Court of Human Rights, Application No,
 *   Report Series, Date)
 *
 * @example
 *   Othman (Abu Qatada) v United Kingdom (European Court of Human
 *   Rights, Fourth Section, Application No 8139/09, 17 January 2012)
 *
 * @example
 *   Al-Adsani v United Kingdom (European Court of Human Rights,
 *   Grand Chamber, Application No 35763/97, ECHR 2001-XI)
 */
/**
 * Formats a reported ECtHR case citation per AGLC4 Rule 14.3.2.
 *
 * Pre-1996 (ser A): Parties (Year) Volume Eur Court HR (ser A) No
 * Post-1996: Parties [Year] Volume Eur Court HR StartingPage, Pinpoint
 *
 * @param data - The ECtHR reported case data.
 * @returns An array of FormattedRun objects.
 */
export function formatEchrReportedCase(data: {
  caseName: string;
  year: number;
  volume?: string;
  reportSeries: string;
  startingPage?: number;
  pinpoint?: string;
  judge?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised (Rule 14.3.2)
  runs.push({ text: data.caseName, italic: true });

  // Year — round brackets for pre-1996 (ser A), square brackets post-1996
  const isSerA = data.reportSeries.includes("(ser A)");
  if (isSerA) {
    runs.push({ text: ` (${data.year})` });
  } else {
    runs.push({ text: ` [${data.year}]` });
  }

  // Volume (Roman numeral for post-1996)
  if (data.volume) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Report series
  runs.push({ text: ` ${data.reportSeries}` });

  // Starting page (post-1996 only)
  if (data.startingPage !== undefined) {
    runs.push({ text: ` ${data.startingPage}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  // Judge
  if (data.judge) {
    runs.push({ text: ` (${data.judge})` });
  }

  return runs;
}

/**
 * Formats an unreported ECtHR case citation per AGLC4 Rule 14.3.2.
 *
 * Format: Parties (European Court of Human Rights, Chamber,
 *         Application No Number, Full Date) Pinpoint.
 *
 * @param data - The ECtHR unreported case data.
 * @returns An array of FormattedRun objects.
 */
export function formatEchrCase(data: {
  caseName: string;
  applicationNumber: string;
  chamber?: string;
  reportSeries?: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rules 14.3.1–14.3.3
  runs.push({ text: data.caseName, italic: true });

  // Build the parenthetical details
  const parts: string[] = ["European Court of Human Rights"];

  if (data.chamber) {
    parts.push(data.chamber);
  }

  parts.push(`Application No ${data.applicationNumber}`);

  if (data.reportSeries) {
    parts.push(data.reportSeries);
  }

  parts.push(data.date);

  runs.push({ text: ` (${parts.join(", ")})` });

  // Pinpoint — outside parentheses (Rule 14.3.2)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-012a: Other Supranational Decisions (Rule 14.4) ────────────────────

/**
 * Formats a decision of a supranational body not covered by specific rules.
 *
 * AGLC4 Rule 14.4: Decisions of other supranational courts and tribunals
 * are cited with the case name (italicised), the case or application
 * number, the court or tribunal name, and the date.
 *
 * Format:
 *   *Case Name* (Court/Tribunal, Case Number, Date)
 *
 * @example
 *   Velásquez Rodríguez v Honduras (Inter-American Court of Human
 *   Rights, Series C, No 4, 29 July 1988)
 */
export function formatSupranationalDecision(data: {
  caseName: string;
  court: string;
  caseNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italicised per AGLC4 Rule 14.4
  runs.push({ text: data.caseName, italic: true });

  // Court, case number, and date in parentheses
  runs.push({
    text: ` (${data.court}, ${data.caseNumber}, ${data.date})`,
  });

  return runs;
}

// ─── INTL-012b: Other Supranational Documents (Rule 14.5) ────────────────────

/**
 * Formats a document of a supranational body not covered by specific rules.
 *
 * AGLC4 Rule 14.5: Documents of other supranational bodies are cited
 * with the body name, the title (italicised), the document number,
 * and the date.
 *
 * Format:
 *   Body, *Title*, Document Number (Date)
 *
 * @example
 *   Inter-American Commission on Human Rights, Report on the Situation
 *   of Human Rights in Haiti, OEA/Ser.L/V/II.77, rev 1, Doc 18
 *   (8 May 1990)
 */
export function formatSupranationalDocument(data: {
  body: string;
  title: string;
  documentNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body name
  runs.push({ text: `${data.body}, ` });

  // Title — italicised per AGLC4 Rule 14.5
  runs.push({ text: data.title, italic: true });

  // Document number and date
  runs.push({ text: `, ${data.documentNumber} (${data.date})` });

  return runs;
}
