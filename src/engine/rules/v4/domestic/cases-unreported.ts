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
 * `Case Name (Court Identifier, Proceeding Number, Full Date)`.
 * The court identifier and full date appear in parentheses. The proceeding
 * number is included if available.
 *
 * @example `Smith v Jones (Supreme Court of New South Wales, 12345/2020, 15 March 2021)`
 *
 * @param data - The unreported non-MNC case data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatUnreportedNoMnc(data: {
  caseName: FormattedRun[];
  courtIdentifier: string;
  fullDate: string;
  proceedingNumber?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // Parenthetical: (Court Identifier, [Proceeding Number,] Full Date)
  const parts: string[] = [data.courtIdentifier];

  if (data.proceedingNumber) {
    parts.push(data.proceedingNumber);
  }

  parts.push(data.fullDate);

  runs.push({ text: ` (${parts.join(", ")})` });

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

  // Parenthetical: (Court, Proceeding Number, commenced Full Date)
  runs.push({
    text: ` (${data.court}, ${data.proceedingNumber}, commenced ${data.commencedDate})`,
  });

  return runs;
}

/**
 * Format a court order citation.
 *
 * @remarks AGLC4 Rule 2.3.4: Court orders are cited as:
 * `Case Name (Court, Full Date of Order)`.
 * The court and the full date of the order appear in parentheses.
 *
 * @param data - The court order data
 * @returns An array of FormattedRun representing the formatted citation
 */
export function formatCourtOrder(data: {
  caseName: FormattedRun[];
  court: string;
  orderDate: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push(...data.caseName.map((r) => ({ ...r, italic: true })));

  // Parenthetical: (Court, Full Date of Order)
  runs.push({ text: ` (${data.court}, ${data.orderDate})` });

  return runs;
}
