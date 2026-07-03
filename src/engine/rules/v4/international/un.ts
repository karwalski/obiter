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
 * The title is italicised. Pinpoint references (typically to articles) are
 * optional — the Charter may be cited without a pinpoint.
 *
 * @param article - The article number being cited, if any.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.1.
 */
export function formatUnCharter(article?: string): FormattedRun[] {
  const runs: FormattedRun[] = [{ text: "Charter of the United Nations", italic: true }];
  if (article) {
    runs.push({ text: ` art ${article}` });
  }
  return runs;
}

// ─── INTL-003: UN Document (Rules 9.2.1–9.2.14) ────────────────────────────

/**
 * Formats a UN document citation per AGLC4 Rules 9.2.1–9.2.14.
 *
 * AGLC4 Rule 9.2.1: The general form for a UN document citation is:
 *   Author, Title, Resolution No, Official Records, Session,
 *   Meeting No, Agenda Item, Supp No, UN Doc No (Date) Annex, Pinpoint.
 *
 * AGLC4 Rule 9.2.1: An individual or non-principal-organ author is named
 * first.
 *
 * AGLC4 Rule 9.2.2: The title (where the document has one) is italicised.
 * Not every UN document has a title — Security Council resolutions
 * generally do not — so the title is optional and the citation may open
 * with the resolution number or Official Records element in roman type.
 *
 * AGLC4 Rule 9.2.3: Resolution numbers use the prescribed abbreviations
 * (e.g. GA Res, SC Res) and are not italicised.
 *
 * AGLC4 Rule 9.2.4: Official Records abbreviations (e.g. UN GAOR, UN SCOR).
 *
 * AGLC4 Rule 9.2.5: General Assembly committees by ordinal (e.g. '4th Comm').
 *
 * AGLC4 Rule 9.2.6: Session as ordinal + 'sess'; session numbers are not
 * included for Security Council resolutions. (The guide's own example 15
 * under rule 9.2.7 prints one — an anomaly; the rule text governs per
 * DECISION-012.)
 *
 * AGLC4 Rule 9.2.7: The meeting number uses the abbreviation 'mtg'.
 *
 * AGLC4 Rule 9.2.8: 'Agenda Item' before the item number; 'Agenda Items'
 * (plural) where the document carries more than one.
 *
 * AGLC4 Rule 9.2.9: Supplements are indicated by 'Supp No'.
 *
 * AGLC4 Rule 9.2.10: The UN document number is preceded by 'UN Doc'
 * ('UN Docs' where multiple numbers are joined with 'and').
 *
 * AGLC4 Rule 9.2.11: The date appears in parentheses.
 *
 * AGLC4 Rule 9.2.12: Annexes take the designation as it appears on the
 * document (e.g. 'annex I', '2nd annex', bare 'annex').
 *
 * AGLC4 Rule 9.2.13: Pinpoints end the citation; elements after the UN
 * document number take no separating punctuation.
 *
 * AGLC4 Rule 9.2.14: A document considered by more than one organ carries
 * parallel citations to both organs' Official Records, separated by a
 * semicolon, with both document numbers joined by 'and' ('UN Docs').
 *
 * @param data - The UN document citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rules 9.2.1–9.2.14.
 */
export function formatUnDocument(data: {
  author?: string;
  title?: string;
  resolutionNumber?: string;
  officialRecords?: string;
  committeeNumber?: string;
  session?: string;
  meetingNumber?: string;
  agendaItem?: string;
  /**
   * The second organ's Official Records elements for documents of
   * multiple organs (rule 9.2.14), eg 'UN SCOR, 56th sess'. Emitted after
   * the first organ's elements, preceded by a semicolon (guide ex 37).
   */
  parallelOfficialRecords?: string;
  supplement?: string;
  documentNumber: string;
  date: string;
  annex?: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Elements up to and including the UN document number are separated by
  // non-italic commas (Rule 9.2); the first present element opens the
  // citation without one.
  const sep = (): void => {
    if (runs.length > 0) runs.push({ text: ", " });
  };

  // Author — individual or non-principal-organ body (Rule 9.2.1)
  if (data.author) {
    sep();
    runs.push({ text: data.author });
  }

  // Title — italicised, only where the document has one (Rule 9.2.2)
  if (data.title) {
    sep();
    runs.push({ text: data.title, italic: true });
  }

  // Resolution or decision number — roman, never italic (Rule 9.2.3)
  if (data.resolutionNumber) {
    sep();
    runs.push({ text: data.resolutionNumber });
  }

  // Official Records (Rule 9.2.4)
  if (data.officialRecords) {
    sep();
    runs.push({ text: data.officialRecords });
  }

  // Committee number (Rule 9.2.5)
  if (data.committeeNumber) {
    sep();
    runs.push({ text: data.committeeNumber });
  }

  // Session (Rule 9.2.6) — never for Security Council resolutions
  const isScResolution = /^S\/RES\//.test(data.documentNumber);
  if (data.session && !isScResolution) {
    sep();
    runs.push({ text: data.session });
  }

  // Meeting number (Rule 9.2.7)
  if (data.meetingNumber) {
    sep();
    runs.push({ text: data.meetingNumber });
  }

  // Agenda item — plural where several are listed (Rule 9.2.8)
  if (data.agendaItem) {
    sep();
    const label = /\band\b|,/.test(data.agendaItem) ? "Agenda Items" : "Agenda Item";
    runs.push({ text: `${label} ${data.agendaItem}` });
  }

  // Parallel Official Records of a second organ — semicolon-separated
  // (Rule 9.2.14, guide ex 37: '…Agenda Items 42, 88 and 166; UN SCOR,
  // 56th sess, UN Docs…')
  if (data.parallelOfficialRecords) {
    runs.push({ text: `; ${data.parallelOfficialRecords}` });
  }

  // Supplement (Rule 9.2.9)
  if (data.supplement) {
    sep();
    runs.push({ text: `Supp No ${data.supplement}` });
  }

  // UN document number — 'UN Docs' for joined multiple numbers (Rule 9.2.10)
  sep();
  const docLabel = /\band\b/.test(data.documentNumber) ? "UN Docs" : "UN Doc";
  runs.push({ text: `${docLabel} ${data.documentNumber}` });

  // Date in parentheses (Rule 9.2.11)
  runs.push({ text: ` (${data.date})` });

  // Annex — designation as it appears on the document (Rule 9.2.12)
  if (data.annex) {
    const annexText = /annex/i.test(data.annex) ? data.annex : `annex ${data.annex}`;
    runs.push({ text: ` ${annexText}` });
  }

  // Pinpoint — no separating punctuation after the date (Rule 9.2.13)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

// ─── INTL-004: UN Committee Decision (Rule 9.3) ────────────────────────────

/**
 * Formats a UN treaty-committee decision per AGLC4 Rule 9.3.1.
 *
 * AGLC4 Rule 9.3.1: Decisions of UN treaty committees on individual
 * communications are cited in accordance with rule 9.2, so the session
 * precedes the UN document number and the pinpoint follows the date with
 * no separating punctuation:
 *   *Title*, Session, UN Doc No (Date) Pinpoint.
 *
 * @param data - The UN committee decision citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.3.1.
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

  // Session — before the UN document number, per rule 9.2 element order
  if (data.session) {
    runs.push({ text: `, ${data.session}` });
  }

  // UN document number
  runs.push({ text: `, UN Doc ${data.documentNumber}` });

  // Date
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint — no separating punctuation after the date (Rule 9.2.13)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

/**
 * Formats a UN treaty-committee decision on a communication per AGLC4
 * Rule 9.3.1.
 *
 * AGLC4 Rule 9.3.1: These decisions are cited in accordance with rule 9.2:
 *   Committee, *Views: Communication No X*, Session, UN Doc No (Date) Pinpoint.
 *
 * The session precedes the UN document number (rule 9.2 element order) and
 * the pinpoint follows the parenthesised date with no separating
 * punctuation (rule 9.2.13).
 *
 * @param data - The UN communication citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.3.1.
 */
export function formatUnCommunication(data: {
  author: string;
  title: string;
  committee: string;
  session?: string;
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

  // Session — before the UN document number (Rules 9.2.6, 9.3.1)
  if (data.session) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: data.session });
  }

  // UN document number
  if (data.documentNumber) {
    runs.push({ text: `, UN Doc ${data.documentNumber}` });
  }

  // Date
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint — no separating punctuation after the date (Rule 9.2.13)
  if (data.pinpoint) {
    runs.push({ text: ` ${data.pinpoint}` });
  }

  return runs;
}

/**
 * Formats a party's communication or submission to a UN treaty committee
 * per AGLC4 Rule 9.3.2.
 *
 * AGLC4 Rule 9.3.2: The form is:
 *   Author, 'Document Title', Document Type to the Committee in *Case*,
 *   Full Date, Pinpoint.
 *
 * The document title appears in single quotes (roman); the case name is
 * italicised; the date is comma-separated, not parenthesised. The document
 * type is generally 'Submission' or 'Communication'.
 *
 * @param data - The submission citation data.
 * @returns An array of FormattedRun objects representing the formatted citation.
 *
 * @see AGLC4, Rule 9.3.2.
 */
export function formatUnSubmission(data: {
  author: string;
  documentTitle: string;
  documentType: string;
  committee: string;
  caseName: string;
  date: string;
  pinpoint?: string;
}): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push({ text: `${data.author}, ` });

  // Document title — single quotes, roman
  runs.push({ text: `'${data.documentTitle}', ` });

  // Document type, committee and case
  runs.push({ text: `${data.documentType} to the ${data.committee} in ` });
  runs.push({ text: data.caseName, italic: true });

  // Full date — comma-separated, not parenthesised
  runs.push({ text: `, ${data.date}` });

  // Pinpoint — comma-separated
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
