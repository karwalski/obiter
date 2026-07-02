/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — Treaties (Rules 8.1–8.8)
 *
 * Pure formatting functions for treaty citations.
 */

import { Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatPinpoint } from "../general/pinpoints";

// ─── INTL-001: Treaty (Rules 8.1–8.8) ───────────────────────────────────────

/**
 * Formats a treaty citation per AGLC4 Rules 8.1–8.8.
 *
 * AGLC4 Rule 8.1: The general form for a treaty citation is:
 *   *Title*, opened for signature/signed Date, Treaty Series Vol StartPage
 *   (entered into force Date) art X.
 *
 * AGLC4 Rule 8.2: The title of a treaty is italicised.
 *
 * AGLC4 Rule 8.3: For open multilateral treaties, 'opened for signature'
 * followed by the date the treaty was opened for signature is used. For
 * bilateral or closed multilateral treaties, 'signed' followed by the
 * date of signing is used. The names of the parties may be included
 * after the title for bilateral treaties.
 *
 * AGLC4 Rule 8.3.2: Where the date of conclusion and the date of entry
 * into force are identical, the date is never stated twice; the compressed
 * form '«Title», «Series» (signed and entered into force «Date»)' is used
 * instead.
 *
 * AGLC4 Rule 8.4: The treaty series abbreviation (e.g. UNTS, ATS) and
 * volume/page number follow the date.
 *
 * AGLC4 Rule 8.5: The date of entry into force appears in parentheses
 * as '(entered into force Date)'. If the treaty has not yet entered
 * into force, '(not yet in force)' is used instead.
 *
 * AGLC4 Rule 8.6: Pinpoint references to treaties generally refer to
 * articles.
 *
 * AGLC4 Rule 8.7: Where parties are included, they appear after the
 * title separated by a comma.
 *
 * AGLC4 Rule 8.8: Treaty series include UNTS, LNTS, ATS, TIAS,
 * and others.
 *
 * @param data - The treaty citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 8.1–8.8.
 */
export function formatTreaty(data: {
  title: string;
  parties?: string[];
  openedDate?: string;
  signedDate?: string;
  treatySeries: string;
  seriesVolume?: number;
  startingPage?: number;
  entryIntoForceDate?: string;
  notYetInForce?: boolean;
  pinpoint?: Pinpoint;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised (Rule 8.2)
  runs.push({ text: data.title, italic: true });

  // Parties — for bilateral treaties (Rule 8.7)
  if (data.parties && data.parties.length > 0) {
    runs.push({ text: `, ${data.parties.join("–")}` });
  }

  // Same-date compressed form (Rule 8.3.2): where conclusion and entry
  // into force share a date, the date is stated once, after the series.
  const sameDate =
    !data.notYetInForce &&
    data.signedDate !== undefined &&
    data.signedDate === data.entryIntoForceDate;

  // Date element — 'opened for signature' or 'signed' (Rule 8.3)
  if (data.openedDate) {
    runs.push({ text: `, opened for signature ${data.openedDate}` });
  } else if (data.signedDate && !sameDate) {
    runs.push({ text: `, signed ${data.signedDate}` });
  }

  // Treaty series and volume/page (Rule 8.4)
  let seriesText = ", ";
  if (data.seriesVolume !== undefined) {
    seriesText += `${data.seriesVolume} `;
  }
  seriesText += data.treatySeries;
  if (data.startingPage !== undefined) {
    seriesText += ` ${data.startingPage}`;
  }
  runs.push({ text: seriesText });

  // Entry into force (Rules 8.3.2, 8.5)
  if (data.notYetInForce) {
    runs.push({ text: " (not yet in force)" });
  } else if (sameDate) {
    runs.push({ text: ` (signed and entered into force ${data.signedDate})` });
  } else if (data.entryIntoForceDate) {
    runs.push({
      text: ` (entered into force ${data.entryIntoForceDate})`,
    });
  }

  // Pinpoint — typically articles for treaties (Rule 8.6)
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── PARITY: Memorandum of Understanding (Rule 8.6) ─────────────────────────

/**
 * Formats a memorandum of understanding citation per AGLC4 Rule 8.6.
 *
 * AGLC4 Rule 8.6: The form is:
 *   *MOU Title*, Parties' Names, signed Date (Memorandum of Understanding)
 *   Pinpoint.
 *
 * The title follows rule 8.1 (italicised); parties' names follow rule 8.2
 * (joined by en-dashes, roman); pinpoints follow rule 8.7 (designators such
 * as 's 2', space-separated). Where the MOU appears in a treaty series, the
 * series citation follows the date of signature, preceded by a comma
 * (rule 8.4). Where 'Memorandum of Understanding' already appears in the
 * title, the descriptor is omitted and a comma precedes the pinpoint.
 * A URL may follow per rules 4.4–4.5.
 *
 * @param data - The MOU citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 8.6.
 */
export function formatMou(data: {
  title: string;
  parties?: string[] | string;
  signedDate?: string;
  treatySeries?: string;
  pinpoint?: Pinpoint;
  url?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised (Rule 8.1)
  runs.push({ text: data.title, italic: true });

  // Parties — en-dash joined, roman (Rule 8.2)
  const partiesText = Array.isArray(data.parties)
    ? data.parties.join("–")
    : (data.parties ?? "").trim();
  if (partiesText) {
    runs.push({ text: `, ${partiesText}` });
  }

  // Date of signature
  if (data.signedDate) {
    runs.push({ text: `, signed ${data.signedDate}` });
  }

  // Treaty series — after the date of signature, comma-preceded (Rule 8.4)
  if (data.treatySeries) {
    runs.push({ text: `, ${data.treatySeries}` });
  }

  // Descriptor — omitted where the phrase already appears in the title
  const descriptorInTitle = /memorandum of understanding/i.test(data.title);
  if (!descriptorInTitle) {
    runs.push({ text: " (Memorandum of Understanding)" });
  }

  // Pinpoint — per rule 8.7 with designator; comma-preceded only where the
  // descriptor was suppressed (Rule 8.6)
  if (data.pinpoint) {
    runs.push({ text: descriptorInTitle ? ", " : " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  // URL — after the first reference where it aids retrieval (Rules 4.4–4.5)
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}
