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
 * AGLC4 Rule 13.1.2: WTO documents (other than panel/Appellate Body/
 * arbitrator decisions) are cited as:
 *   *Title*, WTO Doc Document Number (Date) (Document Description) Pinpoint.
 *
 * The document description is included only where it appears in the
 * document. Pinpoints follow the description with no separating
 * punctuation (rules 3.1.4 or 1.1.6–1.1.7 as appropriate).
 *
 * @example
 *   Doha Work Programme, WTO Doc WT/MIN(05)/DEC
 *   (22 December 2005, adopted 18 December 2005) (Ministerial Declaration)
 *   para 50(1)
 */
export function formatWtoDocument(data: {
  title: string;
  documentNumber: string;
  date: string;
  documentDescription?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 13.1.2
  runs.push({ text: data.title, italic: true });

  // WTO Doc number and date
  runs.push({ text: `, WTO Doc ${data.documentNumber} (${data.date})` });

  // Document description — only where it appears in the document
  if (data.documentDescription) {
    runs.push({ text: ` (${data.documentDescription})` });
  }

  // Pinpoint — space-separated, no comma
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

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
  dsrReference?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document description (e.g. 'Panel Report', 'Appellate Body Report')
  runs.push({ text: `${data.documentDescription}, ` });

  // Case name — italicised per AGLC4 Rule 13.1.3
  runs.push({ text: data.title, italic: true });

  // WTO Doc number and date
  runs.push({ text: `, WTO Doc ${data.documentNumber} (${data.date})` });

  // Optional DSR reference after the full date (Rule 13.1.3),
  // e.g. 'DSR 1998:IX, 3797'
  if (data.dsrReference) {
    runs.push({ text: ` ${data.dsrReference}` });
  }

  // Pinpoint — in square brackets; no preceding comma unless a DSR
  // citation is included (Rule 13.1.3)
  if (data.pinpoint) {
    runs.push({ text: data.dsrReference ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-009c: GATT Documents (Rule 13.2) ──────────────────────────────────

/**
 * Formats a GATT document citation.
 *
 * AGLC4 Rule 13.2.1: Official GATT documents are cited as:
 *   *Title*, GATT Doc Document Number (Date) (Document Description)
 *   GATT BISD Reference, Pinpoint.
 *
 * The document number is included only if it appears in the document; with
 * no document number, no comma follows the title. The description is
 * included only where it appears in the document. Where the document is
 * reproduced in GATT BISD, the BISD citation follows the date, and a comma
 * then precedes the pinpoint; otherwise the pinpoint follows with no
 * punctuation. (The guide's example 16 omits that comma — an anomaly; the
 * rule text governs per DECISION-012.)
 *
 * @example
 *   Waiver in Respect of the Trust Territory of the Pacific Islands
 *   (8 September 1948) (Decision) GATT BISD II/9, para 2
 */
export function formatGattDocument(data: {
  title: string;
  documentNumber?: string;
  date: string;
  documentDescription?: string;
  bisdReference?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised per AGLC4 Rule 13.2.1
  runs.push({ text: data.title, italic: true });

  // GATT Doc number — no comma after the title where there is none
  if (data.documentNumber) {
    runs.push({ text: `, GATT Doc ${data.documentNumber}` });
  }

  // Date in parentheses
  runs.push({ text: ` (${data.date})` });

  // Document description — only where it appears in the document
  if (data.documentDescription) {
    runs.push({ text: ` (${data.documentDescription})` });
  }

  // GATT BISD reference — after the full date (Rule 13.2.1)
  if (data.bisdReference) {
    runs.push({ text: ` ${data.bisdReference}` });
  }

  // Pinpoint — comma-preceded only where a BISD citation is included
  if (data.pinpoint) {
    runs.push({ text: data.bisdReference ? `, ${data.pinpoint}` : ` ${data.pinpoint}` });
  }

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
