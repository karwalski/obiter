/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 Section 2.4 — EU and Assimilated Law (OSC-008)
 *
 * Pure formatting functions for EU regulations, directives, CJEU cases
 * with ECLI, and assimilated EU law post-Brexit.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── EU Regulations and Directives (OSCOLA 5 §2.4.1–2.4.4) ─────────────────

/**
 * Formats an EU regulation or directive with OJ reference per OSCOLA 5 §2.4.
 *
 * OSCOLA format:
 *   Type Number Title [Year] OJ Series/Page
 *
 * Note: In OSCOLA, legislation titles are roman (not italic), including EU
 * legislative instruments.
 *
 * @example
 *   Council Regulation (EC) 139/2004 on the control of concentrations
 *   between undertakings [2004] OJ L24/1
 */
export function formatEuLegislation(data: {
  instrumentType: string;
  number: string;
  title: string;
  year: number;
  ojSeries: string;
  ojPage: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Instrument type and number — roman per OSCOLA
  runs.push({ text: `${data.instrumentType} ${data.number} ` });

  // Title — roman (OSCOLA does not italicise legislation)
  runs.push({ text: data.title });

  // OJ reference
  runs.push({ text: ` [${data.year}] OJ ${data.ojSeries}/${data.ojPage}` });

  return runs;
}

// ─── CJEU Cases with ECLI (OSCOLA 5 §2.4.5–2.4.7) ──────────────────────────

/**
 * Formats a Court of Justice of the European Union case citation per OSCOLA 5.
 *
 * OSCOLA format (post-ECLI):
 *   Case C-X/YY *Party v Party* ECLI
 *
 * OSCOLA format (pre-ECLI with ECR):
 *   Case C-X/YY *Party v Party* [Year] ECR Page
 *
 * @example
 *   Case C-402/05 P Kadi v Council of the European Union
 *   ECLI:EU:C:2008:461
 *
 * @example
 *   Case C-6/64 Costa v ENEL [1964] ECR 585
 */
export function formatCjeuCase(data: {
  caseNumber: string;
  caseName: string;
  ecli?: string;
  year?: number;
  reportSeries?: string;
  page?: string;
  court?: "CJEU" | "General Court" | "Civil Service Tribunal";
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case number prefix
  runs.push({ text: `Case ${data.caseNumber} ` });

  // Case name — italic per OSCOLA
  runs.push({ text: data.caseName, italic: true });

  // ECLI (preferred for modern cases) or ECR reference
  if (data.ecli) {
    runs.push({ text: ` ${data.ecli}` });
  } else if (data.year !== undefined && data.reportSeries && data.page) {
    runs.push({
      text: ` [${data.year}] ${data.reportSeries} ${data.page}`,
    });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── General Court (OSCOLA 5 §2.4.6) ────────────────────────────────────────

/**
 * Formats a General Court (formerly Court of First Instance) case.
 * Uses Case T- prefix. Delegates to formatCjeuCase with appropriate defaults.
 *
 * @example
 *   Case T-315/01 Kadi v Council of the European Union [2005] ECR II-3649
 */
export function formatGeneralCourtCase(data: {
  caseNumber: string;
  caseName: string;
  ecli?: string;
  year?: number;
  reportSeries?: string;
  page?: string;
  pinpoint?: string;
}): FormattedRun[] {
  return formatCjeuCase({
    ...data,
    court: "General Court",
  });
}

// ─── Assimilated EU Law post-Brexit (OSCOLA 5 §2.4.9) ───────────────────────

/**
 * Formats assimilated (retained) EU law as UK domestic law with note of EU origin.
 *
 * OSCOLA 5 §2.4.9: After the end of the transition period (31 December 2020),
 * EU legislation retained in UK law is cited as UK domestic legislation with
 * a note indicating EU origin.
 *
 * Format:
 *   Short Title, SI Year/Number (as amended)
 *   [note: originally EU Instrument Type Number]
 *
 * @example
 *   General Food Regulations 2004, SI 2004/3279 (originally Council
 *   Regulation (EC) 178/2002)
 */
export function formatAssimilatedEuLaw(data: {
  shortTitle: string;
  siYear: number;
  siNumber: number;
  originalInstrument: string;
  amended?: boolean;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Short title — roman (UK domestic legislation)
  runs.push({ text: data.shortTitle });

  // SI reference
  runs.push({ text: `, SI ${data.siYear}/${data.siNumber}` });

  // Amendment note
  if (data.amended) {
    runs.push({ text: " (as amended)" });
  }

  // EU origin note
  runs.push({ text: ` (originally ${data.originalInstrument})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── EU Treaty citation (OSCOLA 5 §2.4.8) ───────────────────────────────────

/**
 * Formats an EU treaty citation per OSCOLA conventions.
 *
 * Format:
 *   Consolidated Version of the Treaty on European Union [2012] OJ C326/1, art 6
 *
 * @example
 *   Treaty on the Functioning of the European Union [2012] OJ C326/47, art 267
 */
export function formatEuTreaty(data: {
  title: string;
  year?: number;
  ojReference?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — roman for EU treaties in OSCOLA
  runs.push({ text: data.title });

  // OJ reference
  if (data.year !== undefined && data.ojReference) {
    runs.push({ text: ` [${data.year}] OJ ${data.ojReference}` });
  }

  // Pinpoint (typically article)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
