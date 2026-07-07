/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";

// ─── CASE-012: Rule 2.3.1 — Unreported decisions with MNC ───────────────────

/**
 * Format an unreported decision with a medium neutral citation (MNC).
 *
 * @remarks AGLC4 Rule 2.3.1: Unreported decisions with a medium neutral
 * citation are cited as:
 * `Case Name [Year] Court Identifier Number, [Pinpoint] (Judicial Officer)`.
 * The year is always in square brackets. The court identifier is drawn from
 * Appendix B. The case number follows the court identifier without a comma.
 * Paragraph pinpoints appear in square brackets after a comma.
 *
 * @example `Smith v Jones [2023] FCA 456, [23] (Smith J)`
 *
 * @param data - The unreported MNC case data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatUnreportedMnc(data: {
  caseName: FormattedRun[];
  year: number;
  courtIdentifier: string;
  caseNumber: number;
  pinpoint?: Pinpoint;
  judicialOfficer?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // MNC: [Year] CourtId Number
  runs.push({
    text: ` [${data.year}] ${data.courtIdentifier} ${data.caseNumber}`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ", " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  // Judicial officer
  if (data.judicialOfficer) {
    runs.push({ text: ` (${data.judicialOfficer})` });
  }

  return runs;
}

// ─── CASE-013: Rule 2.3.2 — Unreported decisions without MNC ────────────────

/**
 * Format an unreported decision without a medium neutral citation.
 *
 * @remarks AGLC4 Rule 2.3.2: Unreported decisions without a medium neutral
 * citation are cited as:
 * `Case Name («Court», «Judge(s)», «Full Date») «Pinpoint»`.
 * The judge(s) — named per Rule 2.4.1 — are a template element between
 * the court and the full date. Pinpoints are generally to the pages of
 * the judgment as delivered, and no punctuation intervenes between the
 * closing parenthesis and the pinpoint. A proceeding number is NOT part
 * of this template (it belongs to Rules 2.3.3–2.3.4).
 *
 * @example `Ross v Chambers (Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956) 77–8`
 *
 * @param data - The unreported non-MNC case data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatUnreportedNoMnc(data: {
  caseName: FormattedRun[];
  courtIdentifier: string;
  fullDate: string;
  /**
   * Judge(s) formatted per Rule 2.4.1 (eg 'Kriewaldt J' or
   * 'Charles, Callaway JJA and Vincent AJA').
   */
  judges?: string;
  /** Pinpoint following the closing parenthesis, no comma (Rule 2.3.2). */
  pinpoint?: Pinpoint;
  /**
   * @deprecated Not a Rule 2.3.2 element; accepted for backwards
   * compatibility with stored data but never emitted.
   */
  proceedingNumber?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // Parenthetical: (Court, Judge(s), Full Date). Each element is emitted
  // only where data exists; with no court, judges or date there is no
  // parenthetical at all — a bare case name must never render placeholder
  // punctuation such as '(, )' (WEB-007a; same defect class as BUG-005(b)).
  const parts: string[] = [];
  if (data.courtIdentifier && data.courtIdentifier.trim()) {
    parts.push(data.courtIdentifier.trim());
  }
  if (data.judges && data.judges.trim()) {
    parts.push(data.judges.trim());
  }
  if (data.fullDate && data.fullDate.trim()) {
    parts.push(data.fullDate.trim());
  }
  if (parts.length > 0) {
    runs.push({ text: ` (${parts.join(", ")})` });
  }

  // Pinpoint: follows the closing parenthesis with no intervening
  // punctuation (ex 84: '… 5 April 1956) 77–8').
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── CASE-014: Rules 2.3.3, 2.3.4 — Proceedings and court orders ────────────

/**
 * Format a proceeding citation.
 *
 * @remarks AGLC4 Rule 2.3.3: Proceedings are cited as:
 * `Case Name (Court, Proceeding Number, commenced Full Date)`.
 * The word 'commenced' precedes the full date.
 *
 * @param data - The proceeding data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatProceeding(data: {
  caseName: FormattedRun[];
  court: string;
  proceedingNumber: string;
  commencedDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // Parenthetical: (Court, Proceeding Number, commenced Full Date). Each
  // element is emitted only where present so missing data never renders
  // placeholder punctuation like '(, , commenced )' (WEB-007a defect class).
  const parts: string[] = [];
  if (data.court && data.court.trim()) {
    parts.push(data.court.trim());
  }
  if (data.proceedingNumber && data.proceedingNumber.trim()) {
    parts.push(data.proceedingNumber.trim());
  }
  if (data.commencedDate && data.commencedDate.trim()) {
    parts.push(`commenced ${data.commencedDate.trim()}`);
  }
  if (parts.length > 0) {
    runs.push({ text: ` (${parts.join(", ")})` });
  }

  return runs;
}

/**
 * Format a court order citation.
 *
 * @remarks AGLC4 Rule 2.3.4: Court orders not contained within a judgment
 * are cited as:
 * `Order of «Judicial Officer(s)» in «Case Name» («Court», «Proceeding Number», «Full Date of Court Order»)`.
 * Every judicial officer who issued the order is named, per Rule 2.4.1.
 * The proceeding number is included only if it appears on the court
 * order itself.
 *
 * @example `Order of Murphy J in Duffy v Darmanin (Federal Court of Australia, VID1218/2017, 10 November 2017)`
 *
 * @param data - The court order data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatCourtOrder(data: {
  caseName: FormattedRun[];
  court: string;
  orderDate: string;
  /**
   * The issuing judicial officer(s) formatted per Rule 2.4.1
   * (eg 'Burley J'). Required by the Rule 2.3.4 template; optional here
   * only until the engine dispatch passes it through.
   */
  judicialOfficers?: string;
  /** Included only if it appears on the court order (Rule 2.3.4). */
  proceedingNumber?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Template head: 'Order of «Judicial Officer(s)» in ' (roman)
  if (data.judicialOfficers) {
    runs.push({ text: `Order of ${data.judicialOfficers} in ` });
  }

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // Parenthetical: (Court, [Proceeding Number,] Full Date of Court Order).
  // Each element is emitted only where present so missing data never
  // renders placeholder punctuation like '(, )' (WEB-007a defect class).
  const parts: string[] = [];
  if (data.court && data.court.trim()) {
    parts.push(data.court.trim());
  }
  if (data.proceedingNumber && data.proceedingNumber.trim()) {
    parts.push(data.proceedingNumber.trim());
  }
  if (data.orderDate && data.orderDate.trim()) {
    parts.push(data.orderDate.trim());
  }
  if (parts.length > 0) {
    runs.push({ text: ` (${parts.join(", ")})` });
  }

  return runs;
}
