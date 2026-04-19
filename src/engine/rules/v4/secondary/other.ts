/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors, formatBodyAuthor } from "./authors";
import { formatSecondaryTitle } from "./general";
import { formatPinpoint } from "../general/pinpoints";
import { toTitleCase } from "../general/capitalisation";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formats a title in single curly quotes with title-case capitalisation.
 * Used for source types whose titles should be quoted but are not in
 * the centralised QUOTED_TYPES set in italicisation.ts.
 */
function formatQuotedTitle(title: string): FormattedRun[] {
  const cleaned = title.replace(/\./g, "");
  const capitalised = toTitleCase(cleaned);
  return [{ text: `\u2018${capitalised}\u2019` }];
}

/**
 * Formats a title in italic with title-case capitalisation.
 * Used for source types whose titles should be italic but are not in
 * the centralised ITALICISED_PREFIXES in italicisation.ts.
 */
function formatItalicTitle(title: string): FormattedRun[] {
  const cleaned = title.replace(/\./g, "");
  const capitalised = toTitleCase(cleaned);
  return [{ text: capitalised, italic: true }];
}

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface ReportData {
  authors?: Author[];
  body?: string;
  bodyJurisdiction?: string;
  bodySubdivision?: string;
  title: string;
  reportType?: string;        // e.g. "Report", "Final Report"
  reportNumber?: string;      // e.g. "123"
  date: string;               // Pre-formatted date string
  pinpoint?: Pinpoint;
}

export interface ParliamentaryReportData {
  jurisdiction: string;       // e.g. "Commonwealth"
  committee: string;
  title: string;
  documentType?: string;      // e.g. "Report"
  number?: string;
  date: string;
}

export interface RoyalCommissionReportData {
  commissionName: string;     // Acts as author
  title: string;
  year: number;
  volume?: number;
}

export interface LawReformReportData {
  commissionName: string;     // e.g. "Australian Law Reform Commission"
  title: string;
  documentType: string;       // e.g. "Report"
  number: string;             // e.g. "133"
  date: string;
}

export interface AbsMaterialData {
  title: string;
  catalogueNumber: string;    // e.g. "6302.0"
  date: string;
}

export interface ResearchPaperData {
  authors: Author[];
  title: string;
  documentType: string;       // e.g. "Working Paper"
  number: string;
  institution: string;
  year: number;
}

export interface ParliamentaryResearchPaperData {
  body: string;               // e.g. "Parliamentary Library"
  jurisdiction?: string;
  title: string;
  documentType: string;       // e.g. "Research Paper"
  number: string;
  year: number;
}

export interface ConferencePaperData {
  authors: Author[];
  title: string;
  conferenceName: string;
  date: string;
}

export interface ThesisData {
  author: Author;
  title: string;
  thesisType: string;         // e.g. "PhD Thesis", "LLM Thesis"
  university: string;
  year: number;
}

export interface SpeechData {
  speaker: string;
  title: string;
  event: string;
  date: string;
}

export interface PressReleaseData {
  authors?: Author[];
  body?: string;
  title: string;
  date: string;
}

export interface HansardData {
  jurisdiction: string;       // e.g. "Commonwealth"
  chamber: string;            // e.g. "House of Representatives", "Senate"
  date: string;
  page: string;
  speaker?: string;
}

export interface SubmissionToInquiryData {
  authors?: Author[];
  body?: string;
  documentType: string;       // e.g. "Submission"
  number?: string;
  committee: string;
  inquiry: string;
  date?: string;
}

// ─── OTHER-001: Rule 7.1.1 — Reports ────────────────────────────────────────

/**
 * Formats a report citation per AGLC4 Rule 7.1.1.
 *
 * Format: `Author, Title (Report/Report No X, Date) Pinpoint.`
 * The title is italic. If a report number is provided, include it
 * as "Report No X". If only a report type is given (e.g. "Final Report"),
 * use that without a number.
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
    runs.push(...formatBodyAuthor({
      body: data.body,
      jurisdiction: data.bodyJurisdiction,
      subdivision: data.bodySubdivision,
    }));
    runs.push({ text: ", " });
  }

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report"));

  // Parenthetical: (Report Type/Report No X, Date)
  const parenParts: string[] = [];
  if (data.reportNumber) {
    const type = data.reportType ?? "Report";
    parenParts.push(`${type} No ${data.reportNumber}`);
  } else if (data.reportType) {
    parenParts.push(data.reportType);
  }
  parenParts.push(data.date);

  runs.push({ text: ` (${parenParts.join(", ")})` });

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
 * Format: `Jurisdiction, Committee, Title (Document Type No, Date).`
 * The title is italic. The jurisdiction and committee precede the title.
 *
 * @param data - Parliamentary report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.2.
 */
export function formatParliamentaryReport(data: ParliamentaryReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: `${data.jurisdiction}, ${data.committee}, ` });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report.parliamentary"));

  // Parenthetical
  const parenParts: string[] = [];
  if (data.documentType && data.number) {
    parenParts.push(`${data.documentType} No ${data.number}`);
  } else if (data.documentType) {
    parenParts.push(data.documentType);
  }
  parenParts.push(data.date);

  runs.push({ text: ` (${parenParts.join(", ")})` });

  return runs;
}

// ─── OTHER-003: Rule 7.1.3 — Royal Commission Reports ──────────────────────

/**
 * Formats a royal commission report citation per AGLC4 Rule 7.1.3.
 *
 * Format: `Royal Commission Name, Title (Year) vol Volume.`
 * The commission name acts as the author. The title is italic.
 *
 * @param data - Royal commission report citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.1.3.
 */
export function formatRoyalCommissionReport(data: RoyalCommissionReportData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Commission name as author
  runs.push({ text: `${data.commissionName}, ` });

  // Title (italic)
  runs.push(...formatSecondaryTitle(data.title, "report.royal_commission"));

  // Year in parentheses
  runs.push({ text: ` (${data.year})` });

  // Volume
  if (data.volume !== undefined) {
    runs.push({ text: ` vol ${data.volume}` });
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
 * Format: `Author, 'Title' (Document Type No Number, Institution, Year).`
 * The title is in single quotation marks (not italic).
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

  // Parenthetical: (Doc Type No Number, Institution, Year)
  runs.push({ text: ` (${data.documentType} No ${data.number}, ${data.institution}, ${data.year})` });

  return runs;
}

// ─── OTHER-007: Rule 7.2.3 — Parliamentary Research Papers ─────────────────

/**
 * Formats a parliamentary research paper citation per AGLC4 Rule 7.2.3.
 *
 * Format: `Body, 'Title' (Document Type No Number, Year).`
 * The parliamentary library acts as the body author. The title is in
 * single quotation marks (not italic).
 *
 * @param data - Parliamentary research paper citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.2.3.
 */
export function formatParliamentaryResearchPaper(data: ParliamentaryResearchPaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Body author
  runs.push(...formatBodyAuthor({
    body: data.body,
    jurisdiction: data.jurisdiction,
  }));
  runs.push({ text: ", " });

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Doc Type No Number, Year)
  runs.push({ text: ` (${data.documentType} No ${data.number}, ${data.year})` });

  return runs;
}

// ─── OTHER-008: Rule 7.2.4 — Conference Papers ─────────────────────────────

/**
 * Formats a conference paper citation per AGLC4 Rule 7.2.4.
 *
 * Format: `Author, 'Title' (Conference Paper, Conference Name, Date).`
 * The title is in single quotation marks (not italic).
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

  // Parenthetical: (Conference Paper, Conference Name, Date)
  runs.push({ text: ` (Conference Paper, ${data.conferenceName}, ${data.date})` });

  return runs;
}

// ─── OTHER-009: Rule 7.2.5 — Theses ────────────────────────────────────────

/**
 * Formats a thesis citation per AGLC4 Rule 7.2.5.
 *
 * Format: `Author, Title (Thesis Type, University, Year).`
 * The title is italic.
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

  // Title (italic)
  runs.push(...formatItalicTitle(data.title));

  // Parenthetical: (Thesis Type, University, Year)
  runs.push({ text: ` (${data.thesisType}, ${data.university}, ${data.year})` });

  return runs;
}

// ─── OTHER-010: Rule 7.3 — Speeches ────────────────────────────────────────

/**
 * Formats a speech citation per AGLC4 Rule 7.3.
 *
 * Format: `Speaker, 'Title' (Speech, Event, Date).`
 * The title is in single quotation marks (not italic).
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

  // Parenthetical: (Speech, Event, Date)
  runs.push({ text: ` (Speech, ${data.event}, ${data.date})` });

  return runs;
}

// ─── OTHER-011: Rule 7.4 — Press Releases ──────────────────────────────────

/**
 * Formats a press release citation per AGLC4 Rule 7.4.
 *
 * Format: `Author/Body, 'Title' (Media Release, Date).`
 * The title is in single quotation marks (not italic).
 *
 * @param data - Press release citation data.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.4.
 */
export function formatPressRelease(data: PressReleaseData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Author or body
  if (data.authors && data.authors.length > 0) {
    runs.push(...formatAuthors(data.authors));
  } else if (data.body) {
    runs.push({ text: data.body });
  }
  runs.push({ text: ", " });

  // Title in single quotes
  runs.push(...formatQuotedTitle(data.title));

  // Parenthetical: (Media Release, Date)
  runs.push({ text: ` (Media Release, ${data.date})` });

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
 * Formats a submission to a government inquiry per AGLC4 Rule 7.5.2.
 *
 * Format: `Author, Document Type No Number to Committee, Inquiry (Date).`
 * Or if no number: `Author, Document Type to Committee, Inquiry (Date).`
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
  } else if (data.body) {
    runs.push({ text: data.body });
  }
  runs.push({ text: ", " });

  // Document type and number
  let docRef = data.documentType;
  if (data.number) {
    docRef += ` No ${data.number}`;
  }

  // Committee and inquiry
  runs.push({ text: `${docRef} to ${data.committee}, ${data.inquiry}` });

  // Date (optional, in parentheses)
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }

  return runs;
}
