/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA Ireland Profile Overlay (OSC-014)
 *
 * Pure formatting functions for Irish courts, report series,
 * legislation, and Bunreacht na hEireann.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Irish Case Citation ─────────────────────────────────────────────────────

/**
 * Formats an Irish case citation per OSCOLA Ireland conventions.
 *
 * Irish report series hierarchy: IR > ILRM > IEHC/IESC/IECA
 *
 * Format (with neutral citation):
 *   *Case Name* [Year] IESC/IEHC/IECA Number
 *   *Case Name* [Year] IESC/IEHC/IECA Number, [Year] Volume IR Page
 *
 * Format (pre-neutral citation):
 *   *Case Name* [Year] Volume IR Page
 *
 * @example
 *   *Langan v Health Service Executive* [2024] IESC 1
 *
 * @example
 *   *Maguire v Ardagh* [2002] 1 IR 385
 */
export function formatIrishCase(data: {
  caseName: string;
  neutralCitation?: {
    year: number;
    court: IrishCourtIdentifier;
    number: number;
  };
  reportCitation?: {
    year: number;
    volume?: number;
    series: IrishReportSeries;
    page: number;
  };
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italic
  runs.push({ text: data.caseName, italic: true });

  // Neutral citation (preferred for modern cases)
  if (data.neutralCitation) {
    const nc = data.neutralCitation;
    runs.push({ text: ` [${nc.year}] ${nc.court} ${nc.number}` });
  }

  // Report citation (parallel or sole)
  if (data.reportCitation) {
    const rc = data.reportCitation;
    const separator = data.neutralCitation ? ", " : " ";
    let reportText = `[${rc.year}]`;
    if (rc.volume !== undefined) {
      reportText += ` ${rc.volume}`;
    }
    reportText += ` ${rc.series} ${rc.page}`;
    runs.push({ text: `${separator}${reportText}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── Irish Legislation ───────────────────────────────────────────────────────

/**
 * Formats an Irish Act of the Oireachtas per OSCOLA Ireland conventions.
 *
 * Format:
 *   Short Title Year (section reference)
 *
 * Note: Legislation is roman (not italic) per OSCOLA conventions.
 *
 * @example
 *   Planning and Development Act 2000, s 37
 *
 * @example
 *   Criminal Justice Act 1999
 */
export function formatIrishAct(data: {
  shortTitle: string;
  year: number;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title and year — roman
  runs.push({ text: `${data.shortTitle} ${data.year}` });

  // Section pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

/**
 * Formats an Irish Statutory Instrument.
 *
 * Format:
 *   Short Title Year, SI No Number/Year
 *
 * @example
 *   District Court (Small Claims) Rules 1997, SI No 356/1997
 */
export function formatIrishStatutoryInstrument(data: {
  shortTitle: string;
  year: number;
  siNumber: number;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — roman
  runs.push({ text: `${data.shortTitle} ${data.year}` });

  // SI reference
  runs.push({ text: `, SI No ${data.siNumber}/${data.year}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── Bunreacht na hEireann ───────────────────────────────────────────────────

/**
 * Formats a citation to Bunreacht na hEireann (Irish Constitution).
 *
 * Format:
 *   Bunreacht na hEireann, art X.Y.Z
 *
 * Note: The title is italic per convention for constitutional instruments
 * in OSCOLA Ireland.
 *
 * @example
 *   Bunreacht na hEireann, art 40.3.1
 *
 * @example
 *   Bunreacht na hEireann, art 34
 */
export function formatBunreachtNaHEireann(data: {
  article: string;
  subsection?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italic
  runs.push({ text: "Bunreacht na h\u00C9ireann", italic: true });

  // Article reference
  let pinpointText = `, art ${data.article}`;
  if (data.subsection) {
    pinpointText += `.${data.subsection}`;
  }
  runs.push({ text: pinpointText });

  return runs;
}

// ─── Irish Court Identifiers ─────────────────────────────────────────────────

/**
 * Irish court identifiers for neutral citations.
 */
export type IrishCourtIdentifier =
  | "IESC" // Supreme Court
  | "IECA" // Court of Appeal
  | "IEHC" // High Court
  | "IECMC" // Circuit Court (Competition and Market Court)
  | "IECC"; // Circuit Court

/**
 * Irish law report series.
 */
export type IrishReportSeries =
  | "IR" // Irish Reports
  | "ILRM" // Irish Law Reports Monthly
  | "ICLMD"; // Irish Competition Law and Market Decisions
