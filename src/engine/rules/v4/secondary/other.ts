/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors, formatBodyAuthor } from "./authors";
import { formatSecondaryTitle, formatSecondaryTitleText } from "./general";
import { formatPinpoint } from "../general/pinpoints";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formats a title in single curly quotes with Rule 4.2 normalisation.
 * Used for source types whose titles should be quoted but are not in
 * the centralised QUOTED_TYPES set in italicisation.ts.
 */
function formatQuotedTitle(title: string): FormattedRun[] {
  return [{ text: `‘${formatSecondaryTitleText(title)}’` }];
}

/**
 * Joins parenthetical parts with commas, skipping empties.
 */
function parenthetical(parts: Array<string | undefined>): string {
  return `(${parts.filter((p) => p && p.trim().length > 0).join(", ")})`;
}

/**
 * The '«Document Type» No «Number»' element used across rules 7.1–7.2:
 * the number is included only where one exists (Rules 7.1.1, 7.2.1).
 */
function docTypeWithNumber(documentType: string | undefined, number: string | undefined): string {
  const type = documentType?.trim() ?? "";
  const num = number?.trim() ?? "";
  if (type && num) return `${type} No ${num}`;
  if (type) return type;
  if (num) return `No ${num}`;
  return "";
}

/** A date element: prefers a full-date string over a bare year (0 = absent). */
function dateOrYear(date: string | undefined, year: number | string | undefined): string {
  if (date && date.trim()) return date.trim();
  if (year === undefined || year === 0 || year === "" || year === "0") return "";
  return String(year);
}

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface ReportData {
  authors?: Author[];
  body?: string;
  bodyJurisdiction?: string;
  bodySubdivision?: string;
  title: string;
  reportType?: string; // e.g. "Report", "Final Report"
  reportNumber?: string; // e.g. "123"
  date: string; // Pre-formatted date string
  pinpoint?: Pinpoint;
}

export interface ParliamentaryReportData {
  /** The legislature (eg 'Parliament of Australia'), following the committee. */
  legislature?: string;
  /** @deprecated Legacy alias for `legislature`. */
  jurisdiction?: string;
  committee: string;
  title: string;
  documentType?: string; // e.g. "Report", "Digest"
  number?: string; // e.g. "9 of 2007"
  date: string;
  pinpoint?: Pinpoint;
}

export interface RoyalCommissionReportData {
  /**
   * @deprecated Rule 7.1.3 cites royal commission reports with no author;
   * used only as a title fallback when `title` is empty.
   */
  commissionName?: string;
  title: string;
  /** Document type for the parenthetical (eg 'Final Report'). */
  documentType?: string;
  /** Full date (eg 'December 2015'); preferred over `year`. */
  date?: string;
  year?: number | string;
  volume?: number | string;
  pinpoint?: Pinpoint;
}

export interface LawReformReportData {
  commissionName: string; // e.g. "Australian Law Reform Commission"
  title: string;
  documentType: string; // e.g. "Report"
  number: string; // e.g. "133"
  date: string;
}

export interface AbsMaterialData {
  title: string;
  catalogueNumber: string; // e.g. "6302.0"
  date: string;
}

export interface ResearchPaperData {
  authors: Author[];
  title: string;
  documentType: string; // e.g. "Working Paper", reproduced from the source
  /** Unique identifier as printed (eg '9/2017'); omitted when unnumbered. */
  number?: string;
  institution: string;
  /** Full date (eg 'January 2017'); preferred over `year`. */
  date?: string;
  year?: number | string;
  pinpoint?: Pinpoint;
  url?: string;
}

export interface ParliamentaryResearchPaperData {
  /** Individual author(s) prominently indicated on the paper (Rule 7.2.1). */
  authors?: Author[];
  /** Research service provider (eg 'Parliamentary Library'). */
  body?: string;
  /** The legislature (eg 'Parliament of Australia'). */
  legislature?: string;
  /** @deprecated Legacy alias for `legislature`. */
  jurisdiction?: string;
  title: string;
  documentType: string; // e.g. "Research Paper"
  number?: string;
  /** Full date (eg '12 July 2016'); preferred over `year`. */
  date?: string;
  year?: number | string;
}

export interface ConferencePaperData {
  authors: Author[];
  title: string;
  /** Document type as it appears on the source (default 'Conference Paper'). */
  documentType?: string;
  conferenceName: string;
  date: string;
}

export interface ThesisData {
  author: Author;
  title: string;
  thesisType: string; // e.g. "PhD Thesis", "LLM Thesis"
  university: string;
  /** Full date; preferred over `year`. */
  date?: string;
  year?: number | string;
}

export interface SpeechData {
  speaker: string;
  title: string;
  /**
   * Document type: 'Speech' by default; the name of a named lecture
   * replaces 'Speech' (Rule 7.3, eg 'Lucinda Lecture').
   */
  speechType?: string;
  event: string;
  date: string;
}

export interface PressReleaseData {
  authors?: Author[];
  body?: string;
  title: string;
  /** Release type as it appears on the source (default 'Media Release'). */
  releaseType?: string;
  /** Document number as printed on the release (eg 'MSPA 172/09'). */
  documentNumber?: string;
  /** Issuing body, included only where it differs from the author. */
  issuingBody?: string;
  date: string;
  pinpoint?: Pinpoint;
}

export interface HansardData {
  jurisdiction: string; // e.g. "Commonwealth"
  chamber: string; // e.g. "House of Representatives", "Senate"
  date: string;
  page: string;
  speaker?: string;
}

export interface SubmissionToInquiryData {
  authors?: Author[];
  body?: string;
  documentType: string; // e.g. "Submission"
  number?: string;
  committee: string;
  /** Name of the inquiry (italicised); omitted where unstated (Rule 7.5.2). */
  inquiry?: string;
  date?: string;
  pinpoint?: Pinpoint;
}

// ─── OTHER-001: Rule 7.1.1 — Reports ────────────────────────────────────────

/**
 * Formats a report citation per AGLC4 Rule 7.1.1.
 *
 * Format: `Author, Title (Document Type No Number, Full Date) Pinpoint.`
 * The title is italic. The document number is included only where the
 * report prominently indicates one; where no author is prominently
 * indicated the citation carries no author.
 *
 * @param data - Report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.1.
 */
export function formatReport(data: ReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author (individual or body)
  if (data.authors && data.authors.length > 0) {
    runs.push(...formatAuthors(data.authors));
    runs.push({ text: ", " });
  } else if (data.body) {
    runs.push(
      ...formatBodyAuthor({
        body: data.body,
        jurisdiction: data.bodyJurisdiction,
        subdivision: data.bodySubdivision,
      })
    );
    runs.push({ text: ", " });
  }

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report"));

  // Parenthetical: (Report Type No X, Date)
  runs.push({
    text: ` ${parenthetical([
      docTypeWithNumber(data.reportType ?? (data.reportNumber ? "Report" : undefined), data.reportNumber),
      data.date,
    ])}`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── OTHER-002: Rule 7.1.2 — Parliamentary Committee Reports ────────────────

/**
 * Formats a parliamentary committee report citation per AGLC4 Rule 7.1.2.
 *
 * The author slot is `«Committee», «Legislature»` — the committee comes
 * first (guide ex 8). For digest-type documents the document number takes
 * the form 'No «Number» of «Year»' — supply it via `number`.
 *
 * @param data - Parliamentary report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.2.
 */
export function formatParliamentaryReport(data: ParliamentaryReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author slot: Committee, Legislature (Rule 7.1.2)
  const legislature = data.legislature ?? data.jurisdiction ?? "";
  runs.push({ text: `${[data.committee, legislature].filter(Boolean).join(", ")}, ` });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report.parliamentary"));

  // Parenthetical
  runs.push({
    text: ` ${parenthetical([docTypeWithNumber(data.documentType, data.number), data.date])}`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── OTHER-003: Rule 7.1.3 — Royal Commission Reports ──────────────────────

/**
 * Formats a royal commission report citation per AGLC4 Rule 7.1.3.
 *
 * Royal commission reports that do not prominently indicate an author are
 * cited with NO author (the Commissioner's name is not substituted) and no
 * jurisdiction: `*Title* (Document Type, Full Date) vol N` (guide ex 13).
 *
 * @param data - Royal commission report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.3.
 */
export function formatRoyalCommissionReport(data: RoyalCommissionReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // No author element (Rule 7.1.3); the commission's name is normally the
  // italic title itself. `commissionName` survives only as a title fallback.
  const title = data.title && data.title.trim() ? data.title : (data.commissionName ?? "");
  runs.push(...formatSecondaryTitle(title, "report.royal_commission"));

  // Parenthetical: (Document Type, Full Date)
  const parenParts = [data.documentType, dateOrYear(data.date, data.year)].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  if (parenParts.length > 0) {
    runs.push({ text: ` (${parenParts.join(", ")})` });
  }

  // Volume (per Rule 6.5)
  if (data.volume !== undefined && data.volume !== "") {
    runs.push({ text: ` vol ${data.volume}` });
  }

  // Pinpoint (comma-separated from the volume per Rule 6.5)
  if (data.pinpoint) {
    runs.push({ text: data.volume !== undefined && data.volume !== "" ? ", " : " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── OTHER-004: Rule 7.1.4 — Law Reform Commission Reports ─────────────────

/**
 * Formats a law reform commission report citation per AGLC4 Rule 7.1.4.
 *
 * Format: `Commission Name, Title (Document Type No Number, Date).`
 * The commission name acts as the author. The title is italic.
 *
 * @param data - Law reform report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.4.
 */
export function formatLawReformReport(data: LawReformReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Commission name as author
  runs.push({ text: `${data.commissionName}, ` });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report.law_reform"));

  // Parenthetical: (Document Type No Number, Date)
  runs.push({ text: ` (${data.documentType} No ${data.number}, ${data.date})` });

  return runs;
}

// ─── OTHER-005: Rule 7.1.5 — ABS Material ──────────────────────────────────

/**
 * Formats an Australian Bureau of Statistics material citation per AGLC4 Rule 7.1.5.
 *
 * Format: `Australian Bureau of Statistics, Title (Catalogue No Catalogue, Date).`
 * The title is italic. The ABS is always the author.
 *
 * @param data - ABS material citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.5.
 */
export function formatAbsMaterial(data: AbsMaterialData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // ABS as author
  runs.push({ text: "Australian Bureau of Statistics, " });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report.abs"));

  // Parenthetical: (Catalogue No X, Date)
  runs.push({ text: ` (Catalogue No ${data.catalogueNumber}, ${data.date})` });

  return runs;
}

// ─── OTHER-006: Rules 7.2.1–7.2.2 — Research Papers ────────────────────────

/**
 * Formats a research paper citation per AGLC4 Rules 7.2.1–7.2.2.
 *
 * Format: `Author, 'Title' (Document Type No Number, Institution, Full Date)
 * Pinpoint <URL>.` The title is in single quotation marks (not italic); a
 * document number appears only where the paper carries one; the date is a
 * full date where available (guide exx 28, 30).
 *
 * @param data - Research paper citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.2.1–7.2.2.
 */
export function formatResearchPaper(data: ResearchPaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Doc Type No Number, Institution, Full Date)
  runs.push({
    text: ` ${parenthetical([
      docTypeWithNumber(data.documentType, data.number),
      data.institution,
      dateOrYear(data.date, data.year),
    ])}`,
  });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  // Optional URL (Rule 4.4)
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}

// ─── OTHER-007: Rule 7.2.3 — Parliamentary Research Papers ─────────────────

/**
 * Formats a parliamentary research paper citation per AGLC4 Rule 7.2.3.
 *
 * Follows the rule 7.2.1 template with the institution/forum slot filled by
 * the research service provider and the legislature: `Author, 'Title'
 * (Document Type No Number, Parliamentary Library, Legislature, Full
 * Date)` (guide ex 33). The individual author leads where one is
 * prominently indicated.
 *
 * @param data - Parliamentary research paper citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.2.3.
 */
export function formatParliamentaryResearchPaper(
  data: ParliamentaryResearchPaperData
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Individual author, where prominently indicated (Rule 7.2.1)
  if (data.authors && data.authors.length > 0) {
    runs.push(...formatAuthors(data.authors));
    runs.push({ text: ", " });
  }

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Doc Type No Number, Provider, Legislature, Full Date)
  runs.push({
    text: ` ${parenthetical([
      docTypeWithNumber(data.documentType, data.number),
      data.body,
      data.legislature ?? data.jurisdiction,
      dateOrYear(data.date, data.year),
    ])}`,
  });

  return runs;
}

// ─── OTHER-008: Rule 7.2.4 — Conference Papers ─────────────────────────────

/**
 * Formats a conference paper citation per AGLC4 Rule 7.2.4.
 *
 * Format: `Author, 'Title' (Document Type, Conference Name, Date).`
 * The document type is reproduced from the source (eg 'Seminar Paper',
 * guide ex 38), defaulting to 'Conference Paper'. Conference ordinal
 * numbers and locations are not included.
 *
 * @param data - Conference paper citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.2.4.
 */
export function formatConferencePaper(data: ConferencePaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors(data.authors));
  runs.push({ text: ", " });

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Document Type, Conference Name, Date)
  runs.push({
    text: ` ${parenthetical([
      data.documentType ?? "Conference Paper",
      data.conferenceName,
      data.date,
    ])}`,
  });

  return runs;
}

// ─── OTHER-009: Rule 7.2.5 — Theses ────────────────────────────────────────

/**
 * Formats a thesis citation per AGLC4 Rule 7.2.5.
 *
 * Theses follow the rule 7.2.1 template: the title is in single quotation
 * marks (NOT italic, guide ex 39), the document type is the degree (eg
 * 'LLM Thesis'), and the institution is the university's full name.
 *
 * @param data - Thesis citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.2.5.
 */
export function formatThesis(data: ThesisData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author
  runs.push(...formatAuthors([data.author]));
  runs.push({ text: ", " });

  // Title in single quotation marks (Rule 7.2.1 via 7.2.5)
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Thesis Type, University, Date)
  runs.push({
    text: ` ${parenthetical([data.thesisType, data.university, dateOrYear(data.date, data.year)])}`,
  });

  return runs;
}

// ─── OTHER-010: Rule 7.3 — Speeches ────────────────────────────────────────

/**
 * Formats a speech citation per AGLC4 Rule 7.3.
 *
 * Format: `Speaker, 'Title' (Speech, Institution/Forum, Full Date).`
 * The name of a named lecture replaces 'Speech' (guide ex 42), less any
 * leading 'The'; a lecture series' ordinal number is never included.
 *
 * @param data - Speech citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.3.
 */
export function formatSpeech(data: SpeechData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Speaker
  runs.push({ text: `${data.speaker}, ` });

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Document type: named lecture replaces 'Speech'; a leading 'The' is
  // dropped from the lecture name (Rule 7.3).
  const speechType = (data.speechType ?? "Speech").trim().replace(/^The\s+/i, "");

  // Parenthetical: (Speech/Lecture Name, Forum, Date)
  runs.push({ text: ` ${parenthetical([speechType, data.event, data.date])}` });

  return runs;
}

// ─── OTHER-011: Rule 7.4 — Press Releases ──────────────────────────────────

/**
 * Formats a press or media release citation per AGLC4 Rule 7.4.
 *
 * Format: `Author, 'Title' (Release Type Document Number, Body, Full Date)
 * Pinpoint.` The release type is reproduced from the source ('Media
 * Release' where none is shown); the document number appears only where
 * printed (guide ex 45); the issuing body is dropped where identical to
 * the author.
 *
 * @param data - Press release citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.4.
 */
export function formatPressRelease(data: PressReleaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author or body
  let authorText = "";
  if (data.authors && data.authors.length > 0) {
    const authorRuns = formatAuthors(data.authors);
    authorText = authorRuns.map((r) => r.text).join("");
    runs.push(...authorRuns);
    runs.push({ text: ", " });
  } else if (data.body) {
    authorText = data.body;
    runs.push({ text: data.body });
    runs.push({ text: ", " });
  }

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Release type + document number (no comma between them, guide ex 45)
  const releaseType = (data.releaseType ?? "Media Release").trim();
  const typeAndNumber = data.documentNumber
    ? `${releaseType} ${data.documentNumber.trim()}`
    : releaseType;

  // Issuing body: dropped where identical to the author (Rule 7.4)
  const issuingBody =
    data.issuingBody && data.issuingBody.trim().toLowerCase() !== authorText.trim().toLowerCase()
      ? data.issuingBody
      : undefined;

  // Parenthetical: (Release Type Number, Body, Full Date)
  runs.push({ text: ` ${parenthetical([typeAndNumber, issuingBody, data.date])}` });

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}

// ─── OTHER-012: Rule 7.5.1 — Hansard ───────────────────────────────────────

/**
 * Formats a Hansard citation per AGLC4 Rule 7.5.1.
 *
 * Format: `Jurisdiction, Parliamentary Debates, Chamber, Date, Page (Speaker).`
 * "Parliamentary Debates" is italic. Speaker is optional.
 *
 * @param data - Hansard citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.1.
 */
export function formatHansard(data: HansardData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Jurisdiction
  runs.push({ text: `${data.jurisdiction}, ` });

  // "Parliamentary Debates" (italic)
  runs.push({ text: "Parliamentary Debates", italic: true });

  // Chamber, Date, Page
  runs.push({ text: `, ${data.chamber}, ${data.date}, ${data.page}` });

  // Speaker (optional, in parentheses)
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  return runs;
}

// ─── OTHER-013: Rule 7.5.2 — Submissions to Government Inquiries ───────────

/**
 * Formats a submission to a government or parliamentary inquiry per AGLC4
 * Rule 7.5.2.
 *
 * Format: `Author, Submission No Number to Body, *Name of Inquiry* (Full
 * Date) Pinpoint.` The inquiry name is italicised; it is omitted where the
 * submission does not state it and for submissions to royal commissions
 * (guide ex 54). The submission number is dropped where the receiving body
 * allocates none.
 *
 * @param data - Submission to inquiry citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.2.
 */
export function formatSubmissionToInquiry(data: SubmissionToInquiryData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author or body
  if (data.authors && data.authors.length > 0) {
    runs.push(...formatAuthors(data.authors));
    runs.push({ text: ", " });
  } else if (data.body) {
    runs.push({ text: data.body });
    runs.push({ text: ", " });
  }

  // Document type and number
  let docRef = data.documentType;
  if (data.number) {
    docRef += ` No ${data.number}`;
  }

  // Committee/body receiving the submission
  runs.push({ text: `${docRef} to ${data.committee}` });

  // Name of inquiry — italic, omitted where unstated (Rule 7.5.2)
  if (data.inquiry && data.inquiry.trim()) {
    runs.push({ text: ", " });
    runs.push({ text: data.inquiry, italic: true });
  }

  // Date (optional, in parentheses)
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  // Pinpoint
  if (data.pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatPinpoint(data.pinpoint));
  }

  return runs;
}
