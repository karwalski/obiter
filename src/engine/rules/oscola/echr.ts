/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * OSCOLA 5 Section 4.3 — ECHR and Council of Europe (OSC-009)
 *
 * Pure formatting functions for ECtHR judgments, decisions,
 * and Council of Europe documents.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── ECtHR Case (OSCOLA 5 §4.3.1) ───────────────────────────────────────────

/**
 * Formats a European Court of Human Rights case citation per OSCOLA 5.
 *
 * OSCOLA format:
 *   *Case Name v State* App no XXXXX/YY (Court, Date)
 *
 * Grand Chamber cases are designated in the parenthetical.
 * Section/Chamber designation included where relevant.
 *
 * @example
 *   *Othman (Abu Qatada) v United Kingdom* App no 8139/09
 *   (ECtHR, 17 January 2012)
 *
 * @example
 *   *Al-Adsani v United Kingdom* App no 35763/97
 *   (ECtHR [GC], 21 November 2001)
 */
export function formatEcthrCase(data: {
  caseName: string;
  respondentState: string;
  applicationNumber: string;
  chamber?: "Grand Chamber" | "Section" | string;
  date: string;
  reportReference?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name (including v State) — italic
  const fullName = data.caseName.includes(" v ")
    ? data.caseName
    : `${data.caseName} v ${data.respondentState}`;
  runs.push({ text: fullName, italic: true });

  // Application number
  runs.push({ text: ` App no ${data.applicationNumber}` });

  // Parenthetical: court designation and date
  let courtDesignation = "ECtHR";
  if (data.chamber === "Grand Chamber") {
    courtDesignation = "ECtHR [GC]";
  } else if (data.chamber && data.chamber !== "Section") {
    courtDesignation = `ECtHR, ${data.chamber}`;
  }

  runs.push({ text: ` (${courtDesignation}, ${data.date})` });

  // Optional report reference (Reports of Judgments and Decisions)
  if (data.reportReference) {
    runs.push({ text: ` ${data.reportReference}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── ECtHR Decision (admissibility) ──────────────────────────────────────────

/**
 * Formats an ECtHR admissibility decision per OSCOLA 5.
 *
 * Format:
 *   *Case Name v State* (dec) App no XXXXX/YY (ECtHR, Date)
 *
 * @example
 *   *Bosphorus Hava Yollari Turizm ve Ticaret AS v Ireland* (dec)
 *   App no 45036/98 (ECtHR, 13 September 2001)
 */
export function formatEcthrDecision(data: {
  caseName: string;
  respondentState: string;
  applicationNumber: string;
  date: string;
  chamber?: "Grand Chamber" | string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name — italic
  const fullName = data.caseName.includes(" v ")
    ? data.caseName
    : `${data.caseName} v ${data.respondentState}`;
  runs.push({ text: fullName, italic: true });

  // Decision marker
  runs.push({ text: " (dec)" });

  // Application number
  runs.push({ text: ` App no ${data.applicationNumber}` });

  // Parenthetical
  let courtDesignation = "ECtHR";
  if (data.chamber === "Grand Chamber") {
    courtDesignation = "ECtHR [GC]";
  }
  runs.push({ text: ` (${courtDesignation}, ${data.date})` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── European Commission of Human Rights ─────────────────────────────────────

/**
 * Formats a European Commission of Human Rights decision (historical).
 *
 * Format:
 *   *Case Name v State* App no XXXXX/YY (Commission decision, Date)
 *
 * @example
 *   *X v United Kingdom* App no 7215/75 (Commission decision,
 *   12 July 1978)
 */
export function formatEcommhrDecision(data: {
  caseName: string;
  respondentState: string;
  applicationNumber: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const fullName = data.caseName.includes(" v ")
    ? data.caseName
    : `${data.caseName} v ${data.respondentState}`;
  runs.push({ text: fullName, italic: true });

  runs.push({ text: ` App no ${data.applicationNumber}` });
  runs.push({ text: ` (Commission decision, ${data.date})` });

  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── Council of Europe Treaty ────────────────────────────────────────────────

/**
 * Formats a Council of Europe treaty citation per OSCOLA 5.
 *
 * Format:
 *   Convention/Treaty Title (adopted Date) ETS/CETS No
 *
 * @example
 *   Convention for the Protection of Human Rights and Fundamental
 *   Freedoms (European Convention on Human Rights, as amended)
 *   (CETS No 005)
 */
export function formatCouncilOfEuropeTreaty(data: {
  title: string;
  shortTitle?: string;
  adoptedDate?: string;
  etsNumber?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italic for treaties
  runs.push({ text: data.title, italic: true });

  // Short title in parentheses if provided
  if (data.shortTitle) {
    runs.push({ text: ` (${data.shortTitle})` });
  }

  // Adopted date
  if (data.adoptedDate) {
    runs.push({ text: ` (adopted ${data.adoptedDate})` });
  }

  // ETS/CETS number
  if (data.etsNumber) {
    runs.push({ text: ` (${data.etsNumber})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── Council of Europe Document ──────────────────────────────────────────────

/**
 * Formats a Council of Europe document citation.
 *
 * Format:
 *   Body, *Title* (Document Number, Date)
 *
 * @example
 *   Committee of Ministers, Recommendation Rec(2004)6 of the Committee
 *   of Ministers to Member States on the Improvement of Domestic
 *   Remedies (12 May 2004)
 */
export function formatCouncilOfEuropeDocument(data: {
  body: string;
  title: string;
  documentNumber?: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body
  runs.push({ text: `${data.body}, ` });

  // Title — italic
  runs.push({ text: data.title, italic: true });

  // Document number and date
  if (data.documentNumber) {
    runs.push({ text: ` (${data.documentNumber}, ${data.date})` });
  } else {
    runs.push({ text: ` (${data.date})` });
  }

  return runs;
}
