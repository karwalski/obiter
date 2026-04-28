/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * AGLC4 Part IV — United Nations Materials (Rules 9.1–9.4)
 *
 * Pure formatting functions for UN Charter, UN documents, UN committee
 * decisions, UN communications, and UN yearbook citations.
 */

import { FormattedRun } from "../../../../types/formattedRun";

// ─── INTL-002: UN Charter (Rule 9.1) ────────────────────────────────────────

/**
 * Formats a UN Charter citation per AGLC4 Rule 9.1.
 *
 * AGLC4 Rule 9.1: The UN Charter is cited as:
 *   *Charter of the United Nations* art X.
 *
 * The title is italicised. Pinpoint references are to articles.
 *
 * @param article - The article number being cited.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.1.
 */
export function formatUnCharter(article: string): FormattedRun[] {
  return [
    { text: "Charter of the United Nations", italic: true },
    { text: ` art ${article}` },
  ];
}

// ─── INTL-003: UN Document (Rules 9.2.1–9.2.14) ────────────────────────────

/**
 * Formats a UN document citation per AGLC4 Rules 9.2.1–9.2.14.
 *
 * AGLC4 Rule 9.2.1: The general form for a UN document citation is:
 *   Author, Title, Resolution No, Official Records, Session,
 *   Meeting No, Agenda Item, Supp No, UN Doc No (Date) Annex, Pinpoint.
 *
 * AGLC4 Rule 9.2.2: The author is the body that produced the document
 * (e.g. 'General Assembly', 'Security Council').
 *
 * AGLC4 Rule 9.2.3: The title of the document is italicised.
 *
 * AGLC4 Rule 9.2.4: Resolution numbers are preceded by the relevant
 * abbreviation (e.g. GA Res, SC Res).
 *
 * AGLC4 Rule 9.2.5: Official Records are abbreviated
 * (e.g. GAOR, SCOR).
 *
 * AGLC4 Rule 9.2.6: The session is indicated by its number and
 * the abbreviation 'sess'.
 *
 * AGLC4 Rule 9.2.7: The meeting number uses the abbreviation 'mtg'.
 *
 * AGLC4 Rule 9.2.8: The agenda item uses the abbreviation 'Agenda Item'.
 *
 * AGLC4 Rule 9.2.9: Supplements are indicated by 'Supp No'.
 *
 * AGLC4 Rule 9.2.10: The UN document number is preceded by 'UN Doc'.
 *
 * AGLC4 Rule 9.2.11: The date appears in parentheses.
 *
 * AGLC4 Rule 9.2.12: Annexes are referred to as 'annex'.
 *
 * AGLC4 Rule 9.2.13: Pinpoint references follow the annex (if any).
 *
 * AGLC4 Rule 9.2.14: Not all elements will be present in every citation.
 * Only include elements that are applicable.
 *
 * @param data - The UN document citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 9.2.1–9.2.14.
 */
export function formatUnDocument(data: {
  author?: string;
  title: string;
  resolutionNumber?: string;
  officialRecords?: string;
  session?: string;
  meetingNumber?: string;
  agendaItem?: string;
  supplement?: string;
  documentNumber: string;
  date: string;
  annex?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author — the producing body (Rule 9.2.2)
  if (data.author) {
    runs.push({ text: data.author });
    runs.push({ text: ", " });
  }

  // Title — italicised (Rule 9.2.3)
  runs.push({ text: data.title, italic: true });

  // Resolution number (Rule 9.2.4)
  if (data.resolutionNumber) {
    runs.push({ text: `, ${data.resolutionNumber}` });
  }

  // Official Records (Rule 9.2.5)
  if (data.officialRecords) {
    runs.push({ text: `, ${data.officialRecords}` });
  }

  // Session (Rule 9.2.6)
  if (data.session) {
    runs.push({ text: `, ${data.session}` });
  }

  // Meeting number (Rule 9.2.7)
  if (data.meetingNumber) {
    runs.push({ text: `, ${data.meetingNumber}` });
  }

  // Agenda item (Rule 9.2.8)
  if (data.agendaItem) {
    runs.push({ text: `, Agenda Item ${data.agendaItem}` });
  }

  // Supplement (Rule 9.2.9)
  if (data.supplement) {
    runs.push({ text: `, Supp No ${data.supplement}` });
  }

  // UN document number (Rule 9.2.10)
  runs.push({ text: `, UN Doc ${data.documentNumber}` });

  // Date in parentheses (Rule 9.2.11)
  runs.push({ text: ` (${data.date})` });

  // Annex (Rule 9.2.12)
  if (data.annex) {
    runs.push({ text: ` annex ${data.annex}` });
  }

  // Pinpoint (Rule 9.2.13)
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-004: UN Committee Decision (Rule 9.3) ────────────────────────────

/**
 * Formats a UN human rights committee decision per AGLC4 Rule 9.3.
 *
 * AGLC4 Rule 9.3: Decisions of UN human rights committees are cited as:
 *   *Title*, UN Doc No, Session, Date, Pinpoint.
 *
 * The title (including the communication number) is italicised.
 * The UN document number follows. The session and date are included
 * where available.
 *
 * @param data - The UN committee decision citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.3.
 */
export function formatUnCommitteeDecision(data: {
  title: string;
  documentNumber: string;
  session?: string;
  date?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — italicised (includes communication number)
  runs.push({ text: data.title, italic: true });

  // UN document number
  runs.push({ text: `, UN Doc ${data.documentNumber}` });

  // Session
  if (data.session) {
    runs.push({ text: `, ${data.session}` });
  }

  // Date
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

/**
 * Formats a UN human rights committee communication per AGLC4 Rule 9.3.
 *
 * AGLC4 Rule 9.3: Communications to UN human rights committees are cited
 * with the author, the committee name, and the communication/document
 * number. The title is italicised.
 *
 * @param data - The UN communication citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.3.
 */
export function formatUnCommunication(data: {
  author: string;
  title: string;
  committee: string;
  documentNumber: string;
  date?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author (may be empty for committee-authored communications)
  if (data.author) {
    runs.push({ text: data.author });
  }

  // Title — italicised
  if (data.title) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: data.title, italic: true });
  }

  // Committee
  if (data.committee) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: data.committee });
  }

  // UN document number
  if (data.documentNumber) {
    runs.push({ text: `, UN Doc ${data.documentNumber}` });
  }

  // Date
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-005: UN Yearbook (Rule 9.4) ───────────────────────────────────────

/**
 * Formats a UN yearbook citation per AGLC4 Rule 9.4.
 *
 * AGLC4 Rule 9.4: UN yearbooks are cited as:
 *   *Yearbook Name* (Year) vol Volume Page.
 *
 * The yearbook name is italicised. The year appears in parentheses.
 * Volume and page numbers follow where applicable.
 *
 * @param data - The UN yearbook citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.4.
 */
/**
 * Formats a UN yearbook citation per AGLC4 Rule 9.4.
 *
 * AGLC4 Rule 9.4: UN yearbooks are cited as:
 *   'Title' (Year) Volume Yearbook Title Starting Page, Pinpoint.
 *
 * The title is in single quotes. The year appears in parentheses or
 * square brackets. The volume number follows directly (no 'vol' prefix).
 * Where the yearbook is organised by year, the year is in square brackets.
 *
 * @param data - The UN yearbook citation data.
 * @returns An array of FormattedRun objects.
 */
export function formatUnYearbook(data: {
  title?: string;
  yearbook: string;
  year: number;
  yearType?: "round" | "square";
  volume?: string;
  startingPage?: number;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title — in single quotes (Rule 9.4)
  if (data.title) {
    runs.push({ text: `'${data.title}' ` });
  }

  // Year in brackets
  if (data.yearType === "square") {
    runs.push({ text: `[${data.year}]` });
  } else {
    runs.push({ text: `(${data.year})` });
  }

  // Volume number (no 'vol' prefix per Rule 9.4)
  if (data.volume) {
    runs.push({ text: ` ${data.volume}` });
  }

  // Yearbook title — italicised
  runs.push({ text: " " });
  runs.push({ text: data.yearbook, italic: true });

  // Starting page
  if (data.startingPage !== undefined) {
    runs.push({ text: ` ${data.startingPage}` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: `, ${data.pinpoint}` });
  }

  return runs;
}
