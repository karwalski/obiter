/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — International Economic Law (Rules 13.1–13.4)
 *
 * INTL-009: Pure formatting functions for WTO documents, WTO decisions,
 * GATT documents, and GATT panel reports.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-009a: WTO Documents (Rule 13.1.2) ─────────────────────────────────

/**
 * Formats a WTO document citation.
 *
 * AGLC4 Rule 13.1.2: WTO documents are cited with the title
 * (italicised), the WTO document number, and the date in parentheses.
 *
 * Format:
 *   *Title*, WTO Doc Document Number (Date)
 *
 * @example
 *   Ministerial Declaration on the TRIPS Agreement and Public Health,
 *   WTO Doc WT/MIN(01)/DEC/2 (20 November 2001)
 */
export function formatWtoDocument(data: {
  title: string;
  documentNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 13.1.2
  runs.push({ text: data.title, italic: true });

  // WTO Doc number and date
  runs.push({ text: `, WTO Doc ${data.documentNumber} (${data.date})` });

  return runs;
}

// ─── INTL-009b: WTO Decisions — Panel and Appellate Body Reports ────────────

/**
 * Formats a WTO dispute settlement decision citation.
 *
 * AGLC4 Rule 13.1.3: WTO panel reports and Appellate Body reports are
 * cited with the full title (italicised), the short title in parentheses
 * (italicised), the WTO document number, the date in parentheses, and
 * the deciding body.
 *
 * Format:
 *   *Full Title* (*Short Title*), WTO Doc Document Number (Date) (Body)
 *
 * @example
 *   European Communities — Measures Affecting Asbestos and Products
 *   Containing Asbestos (Canada v European Communities) (Appellate Body
 *   Report), WTO Doc WT/DS135/AB/R (12 March 2001)
 */
/**
 * Formats a WTO panel report, Appellate Body report, or arbitrator decision.
 *
 * AGLC4 Rule 13.1.3: The format is:
 *   Document Description, *Case Name*, WTO Doc Number (Date) [Pinpoint].
 *
 * The document description is 'Panel Report', 'Appellate Body Report',
 * or 'Decision by the Arbitrator'. The case name is italicised.
 *
 * @param data - The WTO decision citation data.
 * @returns An array of FormattedRun objects.
 */
export function formatWtoDecision(data: {
  documentDescription: string;
  title: string;
  documentNumber: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document description (e.g. 'Panel Report', 'Appellate Body Report')
  runs.push({ text: `${data.documentDescription}, ` });

  // Case name — italicised per AGLC4 Rule 13.1.3
  runs.push({ text: data.title, italic: true });

  // WTO Doc number and date
  runs.push({ text: `, WTO Doc ${data.documentNumber} (${data.date})` });

  // Pinpoint — in square brackets, no preceding comma (Rule 13.1.3)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-009c: GATT Documents (Rule 13.2) ──────────────────────────────────

/**
 * Formats a GATT document citation.
 *
 * AGLC4 Rule 13.2: GATT documents are cited with the title
 * (italicised), the GATT document number, and the date in parentheses.
 *
 * Format:
 *   *Title*, GATT Doc Document Number (Date)
 *
 * @example
 *   Accession of Guatemala, GATT Doc L/6826 (22 December 1990)
 */
export function formatGattDocument(data: {
  title: string;
  documentNumber: string;
  date: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 13.2
  runs.push({ text: data.title, italic: true });

  // GATT Doc number and date
  runs.push({ text: `, GATT Doc ${data.documentNumber} (${data.date})` });

  return runs;
}

// ─── INTL-009d: GATT Panel Reports (Rule 13.2) ─────────────────────────────

/**
 * Formats a GATT panel report citation.
 *
 * AGLC4 Rule 13.2: GATT panel reports are cited with the title
 * (italicised), the GATT document number, the date in parentheses,
 * and the BISD reference if adopted.
 *
 * Format:
 *   *Title*, GATT Doc Document Number (Date) (BISD Reference)
 *   *Title*, GATT Doc Document Number (Date)
 *
 * @example
 *   United States — Restrictions on Imports of Tuna (Mexico v United
 *   States), GATT Doc DS21/R (3 September 1991)
 */
/**
 * Formats a GATT panel report per AGLC4 Rule 13.2.2.
 *
 * AGLC4 Rule 13.2.2: GATT panel reports follow WTO panel report format
 * (Rule 13.1.3), with 'GATT Panel Report' as the description, and GATT BISD
 * references replacing DSR references.
 *
 * Format: GATT Panel Report, *Case Name*, GATT Doc Number (Date) GATT BISD Ref, [Pinpoint].
 */
export function formatGattPanelReport(data: {
  title: string;
  documentNumber: string;
  date: string;
  bisdReference?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document description — 'GATT Panel Report' (Rule 13.2.2)
  runs.push({ text: "GATT Panel Report, " });

  // Case name — italicised per AGLC4 Rule 13.2.2
  runs.push({ text: data.title, italic: true });

  // GATT Doc number and date
  runs.push({ text: `, GATT Doc ${data.documentNumber} (${data.date})` });

  // Optional GATT BISD reference (replaces DSR)
  if (data.bisdReference) {
    runs.push({ text: ` ${data.bisdReference}` });
  }

  // Pinpoint — in square brackets
  if (data.pinpoint) {
    if (data.bisdReference) {
      runs.push({ text: `, ${data.pinpoint}` });
    } else {
      runs.push({ text: ` ${data.pinpoint}` });
    }
  }

  return runs;
}
