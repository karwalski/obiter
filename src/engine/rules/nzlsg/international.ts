/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * NZLSG-010: NZ International Materials
 *
 * NZLSG Rules 10.1–10.4: International materials per NZLSG conventions.
 * Same general format as AGLC4 but with 'at' pinpoint prefix.
 * Adapted from shared international module.
 */

import { FormattedRun } from "../../../types/formattedRun";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface NZTreatyData {
  /** Title of the treaty (will be italicised). */
  title: string;
  /** Parties (for bilateral treaties). */
  parties?: string;
  /** Signing event description (e.g. 'opened for signature 10 December 1982'). */
  signingEvent?: string;
  /** Treaty series reference (e.g. '1155 UNTS 331'). */
  treatySeries?: string;
  /** Entry into force information (e.g. 'entered into force 27 January 1980'). */
  entryIntoForce?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZUNDocumentData {
  /** Body or organ (e.g. 'UN General Assembly'). */
  body: string;
  /** Title or description of the document (will be italicised if a title). */
  title?: string;
  /** Document symbol (e.g. 'A/RES/61/295'). */
  documentSymbol?: string;
  /** Session or meeting information. */
  session?: string;
  /** Date of the document. */
  date?: string;
  /** Pinpoint reference. */
  pinpoint?: string;
}

export interface NZICJCaseData {
  /** Case name (will be italicised). */
  caseName: string;
  /** Phase (e.g. 'Jurisdiction', 'Merits', 'Provisional Measures'). */
  phase?: string;
  /** Year of the report. */
  year: number;
  /** ICJ Reports page. */
  icjReportsPage?: number;
  /** Pinpoint reference. */
  pinpoint?: string;
}

// ─── NZLSG-010: Treaty Citation ────────────────────────────────────────────

/**
 * Formats an international treaty citation per NZLSG Rule 10.1.
 *
 * NZLSG Rule 10.1: Same general format as AGLC4 Rule 8 but with 'at' pinpoint prefix.
 * Title in italics.
 *
 * @example
 *   // Vienna Convention on the Law of Treaties (opened for signature
 *   // 23 May 1969, entered into force 27 January 1980) at art 31
 *   formatTreaty({
 *     title: "Vienna Convention on the Law of Treaties",
 *     signingEvent: "opened for signature 23 May 1969",
 *     entryIntoForce: "entered into force 27 January 1980",
 *     pinpoint: "art 31",
 *   })
 */
export function formatTreaty(data: NZTreatyData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title in italics
  runs.push({ text: data.title, italic: true });

  // Parties (for bilateral treaties)
  if (data.parties) {
    runs.push({ text: `, ${data.parties}` });
  }

  // Signing event and entry into force in parenthetical
  const parenParts: string[] = [];
  if (data.signingEvent) {
    parenParts.push(data.signingEvent);
  }
  if (data.entryIntoForce) {
    parenParts.push(data.entryIntoForce);
  }
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  // Treaty series
  if (data.treatySeries) {
    runs.push({ text: ` ${data.treatySeries}` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-010: UN Document Citation ───────────────────────────────────────

/**
 * Formats a UN document citation per NZLSG Rule 10.2.
 *
 * NZLSG Rule 10.2: Adapted from AGLC4/OSCOLA international module.
 * Uses 'at' pinpoint prefix.
 *
 * @example
 *   // UN General Assembly United Nations Declaration on the Rights of
 *   // Indigenous Peoples A/RES/61/295 (2007) at art 26
 *   formatUNDocument({
 *     body: "UN General Assembly",
 *     title: "United Nations Declaration on the Rights of Indigenous Peoples",
 *     documentSymbol: "A/RES/61/295",
 *     date: "2007",
 *     pinpoint: "art 26",
 *   })
 */
export function formatUNDocument(data: NZUNDocumentData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body
  runs.push({ text: data.body });

  // Title in italics (if provided)
  if (data.title) {
    runs.push({ text: " " });
    runs.push({ text: data.title, italic: true });
  }

  // Document symbol
  if (data.documentSymbol) {
    runs.push({ text: ` ${data.documentSymbol}` });
  }

  // Session
  if (data.session) {
    runs.push({ text: ` ${data.session}` });
  }

  // Date in parentheses
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}

// ─── NZLSG-010: ICJ Case Citation ──────────────────────────────────────────

/**
 * Formats an ICJ case citation per NZLSG Rule 10.3.
 *
 * NZLSG Rule 10.3: Adapted from shared international module.
 * Uses 'at' pinpoint prefix.
 *
 * @example
 *   // Nuclear Tests (New Zealand v France) (Interim Protection) [1973] ICJ Rep 135 at 139
 *   formatICJCase({
 *     caseName: "Nuclear Tests (New Zealand v France)",
 *     phase: "Interim Protection",
 *     year: 1973,
 *     icjReportsPage: 135,
 *     pinpoint: "139",
 *   })
 */
export function formatICJCase(data: NZICJCaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Case name in italics
  runs.push({ text: data.caseName, italic: true });

  // Phase in parentheses
  if (data.phase) {
    runs.push({ text: ` (${data.phase})` });
  }

  // Year and ICJ Reports
  if (data.icjReportsPage !== undefined) {
    runs.push({ text: ` [${data.year}] ICJ Rep ${data.icjReportsPage}` });
  } else {
    runs.push({ text: ` [${data.year}]` });
  }

  // Pinpoint with 'at' prefix
  if (data.pinpoint) {
    runs.push({ text: ` at ${data.pinpoint}` });
  }

  return runs;
}
