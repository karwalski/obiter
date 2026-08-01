/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors, normaliseBodyName } from "./authors";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface ParliamentaryEvidenceData {
  title: string;
  committee: string;
  parliament: string;
  /** Location of the hearing (eg 'Canberra'). */
  location?: string;
  /** @deprecated Legacy alias for `location` (the slot never held a jurisdiction). */
  jurisdiction?: string;
  date: string;
  page?: string;
  witness?: string;
}

export interface ConstitutionalConventionData {
  conventionName: string;
  location: string;
  date: string;
  /** @deprecated Not an AGLC4 element (Rule 7.5.4); accepted but not emitted. */
  volume?: string;
  page?: string;
  /** Name of the speaker, in trailing parentheses (Rule 7.5.4). */
  speaker?: string;
}

export interface DictionaryData {
  title: string;
  /** @deprecated Not an AGLC4 element (Rule 7.6); accepted but not emitted. */
  publisher?: string;
  edition?: string;
  year: string;
  /** Date of retrieval — presence selects the online form (Rule 7.6). */
  retrievedDate?: string;
  entry: string;
  /**
   * The dictionary's own entry marker distinguishing homographs (eg 'v²',
   * 'adj'), emitted before the definition number (Rule 7.6).
   */
  entryType?: string;
  definitionNumber?: string;
}

export interface LegalEncyclopediaData {
  /** Publisher of the encyclopedia (Rule 7.7, eg 'LexisNexis'). */
  publisher?: string;
  title: string;
  date: string;
  /** Date of retrieval — presence selects the online form (Rule 7.7). */
  retrievedDate?: string;
  volume?: string;
  titleNumber?: string;
  /** Name of the title (eg 'Insurance'), following the title number. */
  titleName?: string;
  topic: string;
  paragraph: string;
}

export interface LooseleafData {
  authors: Author[];
  title: string;
  publisher: string;
  /** Most recent service number or full date for the '(at …)' element. */
  date: string;
  /** Date of retrieval — presence selects the online form (Rule 7.8). */
  retrievedDate?: string;
  volume?: string;
  paragraph?: string;
}

export interface IpMaterialData {
  /** WIPO ST.3 jurisdiction code (eg 'US', 'AU'). */
  jurisdictionCode?: string;
  ipType: string;
  /** Word(s) qualifying the number (eg 'Registration', 'Application'). */
  numberQualifier?: string;
  number: string;
  /** 'filed' (default) or 'lodged'. */
  filedTerm?: "filed" | "lodged";
  /** Full date of filing/lodging. */
  filingDate?: string;
  /** Latest registration status change (eg 'Registered', 'Granted'). */
  status?: string;
  /** Full date of the latest status change. */
  statusDate?: string;
  /** @deprecated Not an AGLC4 element (Rule 7.9); accepted but not emitted. */
  title?: string;
  /** @deprecated Not an AGLC4 element (Rule 7.9); accepted but not emitted. */
  applicant?: string;
  /** @deprecated Legacy alias for `filingDate`. */
  date?: string;
}

export interface ConstitutiveDocumentData {
  companyName: string;
  documentType: string;
  /** Date of last update, or of retrieval, for the '(at …)' element. */
  date?: string;
  pinpoint?: Pinpoint;
}

export interface NewspaperData {
  authors?: Author[];
  title: string;
  /**
   * Rule 26.4 (via 26.1.1): English translation of a non-English article
   * title, emitted roman in square brackets after the quoted title.
   */
  translatedTitle?: string;
  /**
   * When true, `title` is a description of an untitled piece (eg 'Letter
   * to the Editor') and is not placed in quotation marks (Rule 7.11.4).
   */
  titleIsDescription?: boolean;
  newspaper: string;
  place: string;
  date: string;
  page?: string;
  isElectronic?: boolean;
  url?: string;
}

export interface EditorialData {
  title?: string;
  newspaper: string;
  place: string;
  date: string;
  page?: string;
  isElectronic?: boolean;
  url?: string;
}

export interface CorrespondenceData {
  type: string;
  sender: string;
  recipient: string;
  date: string;
}

export interface InterviewData {
  interviewee: string;
  /** Format of the exchange: 'Interview' (default) or eg 'Conversation'. */
  interviewType?: string;
  interviewer?: string;
  location?: string;
  date: string;
}

export interface FilmData {
  title: string;
  /** First-listed studio/production company/producer (Rule 7.14.1). */
  productionCompany?: string;
  /** Version details (eg "Director's Cut"), only for non-standard versions. */
  versionDetails?: string;
  /** @deprecated AGLC4 has no director element (Rule 7.14.2); used only as
   * a fallback for the production-company slot for legacy data. */
  director?: string;
  year: string;
  /** Point or span of time in the recording (Rules 1.11.3–1.11.4). */
  timePinpoint?: string;
}

export interface TvSeriesData {
  /** Episode title; built from season/episode numbers when untitled. */
  episodeTitle?: string;
  seriesTitle: string;
  /** Untitled episodes: season number for 'Season X, Episode Y' (Rule 7.14.3). */
  seasonNumber?: string;
  /** Untitled episodes: episode number. */
  episodeNumber?: string;
  /** Version details (eg 'Extended Version'), non-standard versions only. */
  versionDetails?: string;
  network: string;
  date: string;
  /** Point or span of time in the recording (Rules 1.11.3–1.11.4). */
  timePinpoint?: string;
  url?: string;
}

export interface PodcastData {
  episodeTitle?: string;
  seriesTitle: string;
  /** Studio, production company or producer (Rule 7.14.4). */
  producer?: string;
  /** @deprecated Legacy alias for `producer`. */
  host?: string;
  date: string;
  /** Point or span of time in the recording (Rules 1.11.3–1.11.4). */
  timePinpoint?: string;
  url?: string;
}

export interface InternetMaterialData {
  authors?: Author[];
  title: string;
  /**
   * Rule 26.4 (via 26.1.1): English translation of a non-English document
   * title, emitted roman in square brackets after the quoted title (ex 22).
   */
  translatedTitle?: string;
  website: string;
  /**
   * Rule 26.4: English translation of a non-English web page title,
   * emitted roman in square brackets after the italic website name (ex 22).
   */
  translatedWebsiteName?: string;
  /** Document type (eg 'Web Page', 'Blog Post') opening the parenthetical. */
  documentType?: string;
  date: string;
  /**
   * Rule 7.15: pinpoint before the URL — usually a paragraph number in
   * square brackets (the value carries its own brackets per rule 1.1.6).
   */
  pinpoint?: Pinpoint;
  url: string;
  /**
   * A5-EXP-4 (experimental, pending AGLC5): archive service name (eg
   * "Wayback Machine", "Perma.cc"). AGLC4 has no archived-web form; these
   * fields render "(archived at [service] [date])" after the URL and are
   * badged experimental in the form. See docs/obiter-extensions.md §3/§4.
   */
  archiveService?: string;
  /** A5-EXP-4 (experimental): stable archived-snapshot URL. */
  archivedUrl?: string;
  /** A5-EXP-4 (experimental): date the snapshot was archived/captured. */
  archiveDate?: string;
}

export interface SocialMediaData {
  author: string;
  platform: string;
  title?: string;
  date: string;
  time?: string;
  /** For videos: point or span of time (Rules 1.11.3–1.11.4). */
  timePinpoint?: string;
  url: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Formats a pinpoint value with its label prefix.
 */
function formatPinpointValue(pinpoint: Pinpoint): string {
  const labels: Record<string, string> = {
    page: "",
    paragraph: "",
    section: "s ",
    chapter: "ch ",
    part: "pt ",
    clause: "cl ",
    schedule: "sch ",
    article: "art ",
    regulation: "reg ",
    rule: "r ",
    footnote: "n ",
    column: "col ",
    line: "line ",
  };
  const prefix = labels[pinpoint.type] ?? "";
  let result = prefix + pinpoint.value;
  if (pinpoint.subPinpoint) {
    result += " " + formatPinpointValue(pinpoint.subPinpoint);
  }
  return result;
}

/** Joins parenthetical parts with commas, skipping empties. */
function joinParen(parts: Array<string | undefined>): string {
  return parts.filter((p) => p && p.trim().length > 0).join(", ");
}

/**
 * Wraps a paragraph pinpoint in square brackets unless it already carries
 * them or uses the service's own paragraph symbol '¶' (Rules 7.7–7.8).
 */
function bracketParagraph(paragraph: string): string {
  const trimmed = paragraph.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("¶")) return trimmed;
  return `[${trimmed}]`;
}

// ─── OTHER-014 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.5.3 — Evidence to Parliamentary Committees
 *
 * Format: `Evidence to «Committee», «Legislature», «Location», «Full Date»,
 * «Pinpoint» («Name of Speaker»)`. The third element is the location of
 * the hearing (eg 'Canberra'), not a jurisdiction.
 *
 * @param data - Parliamentary evidence metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.3.
 */
export function formatParliamentaryEvidence(data: ParliamentaryEvidenceData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const location = data.location ?? data.jurisdiction ?? "";
  runs.push({
    text: `Evidence to ${joinParen([data.committee, data.parliament, location, data.date])}`,
  });

  if (data.page) {
    runs.push({ text: ", " + data.page });
  }

  if (data.witness) {
    runs.push({ text: " (" + data.witness + ")" });
  }

  return runs;
}

// ─── OTHER-015 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.5.4 — Australian Constitutional Convention Debates
 *
 * Format: `«*Title*», «Location», «Full Date», «Page» («Name of Speaker»)`.
 * The convention record's title is italic; the speaker (first and last
 * names, titles omitted except 'Sir'/'Dame'/peerages) follows in
 * parentheses.
 *
 * @param data - Constitutional convention metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.4.
 */
export function formatConstitutionalConvention(data: ConstitutionalConventionData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Title of the convention record — italic (Rule 7.5.4)
  runs.push({ text: data.conventionName, italic: true });

  const tail = joinParen([data.location, data.date, data.page]);
  if (tail) {
    runs.push({ text: `, ${tail}` });
  }

  // Speaker in trailing parentheses
  if (data.speaker) {
    runs.push({ text: ` (${data.speaker})` });
  }

  return runs;
}

// ─── OTHER-016 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.6 — Dictionaries
 *
 * Hard copy: `«*Title*» («Edition» ed, «Year») '«Entry»' («Marker», def «N»)`.
 * Online: `«*Title*» (online at «Date of Retrieval») '«Entry»' …`.
 * There is no publisher element. The dictionary's own homograph marker
 * (eg 'v²') precedes the definition number.
 *
 * @param data - Dictionary citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.6.
 */
export function formatDictionary(data: DictionaryData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: data.title, italic: true });

  // Parenthetical: online form takes precedence (Rule 7.6)
  if (data.retrievedDate) {
    runs.push({ text: ` (online at ${data.retrievedDate})` });
  } else {
    runs.push({ text: ` (${joinParen([data.edition, data.year])})` });
  }

  runs.push({ text: " ‘" + data.entry + "’" });

  // Entry marker and definition number
  const defPart = data.definitionNumber ? `def ${data.definitionNumber}` : undefined;
  const marker = joinParen([data.entryType, defPart]);
  if (marker) {
    runs.push({ text: ` (${marker})` });
  }

  return runs;
}

// ─── OTHER-017 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.7 — Legal Encyclopedias
 *
 * Hard copy: `«Publisher», «*Title*», vol «N» (at «Full Date») «Title No»
 * «Title Name», '«Chapter»' [«Paragraph»]` (guide ex 64).
 * Online: `«Publisher», «*Title*» (online at «Date of Retrieval») …`.
 *
 * @param data - Legal encyclopedia citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.7.
 */
export function formatLegalEncyclopedia(data: LegalEncyclopediaData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Publisher first (Rule 7.7, per rule 6.3.1)
  if (data.publisher) {
    runs.push({ text: `${data.publisher}, ` });
  }

  runs.push({ text: data.title, italic: true });

  if (data.retrievedDate) {
    // Online form: no volume element (Rule 7.7)
    runs.push({ text: ` (online at ${data.retrievedDate})` });
  } else {
    // Volume precedes the '(at Date)' parenthetical (Rule 7.7)
    if (data.volume) {
      runs.push({ text: `, vol ${data.volume}` });
    }
    runs.push({ text: ` (at ${data.date})` });
  }

  // Title number and name
  const titleRef = [data.titleNumber, data.titleName]
    .filter((p) => p && p.trim().length > 0)
    .join(" ");
  if (titleRef) {
    runs.push({ text: ` ${titleRef}` });
  }

  // Chapter number and name, quoted
  if (data.topic) {
    runs.push({ text: `, ‘${data.topic}’` });
  }

  // Paragraph pinpoint in square brackets
  if (data.paragraph) {
    runs.push({ text: ` ${bracketParagraph(data.paragraph)}` });
  }

  return runs;
}

// ─── OTHER-018 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.8 — Looseleaf Services
 *
 * Print: `«Author», «Publisher», «*Title*», vol «N» (at «Service No or Full
 * Date») «[Paragraph]»` (guide ex 67). Online: `«Publisher», «*Title*»
 * (online at «Date of Retrieval») «Pinpoint»`. A paragraph identified with
 * the service's own '¶' symbol is not bracketed.
 *
 * @param data - Looseleaf service citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.8.
 */
export function formatLooseleaf(data: LooseleafData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Clearly identified author precedes the publisher (Rule 7.8)
  const authorRuns = formatAuthors(data.authors);
  if (authorRuns.length > 0) {
    runs.push(...authorRuns);
    runs.push({ text: ", " });
  }

  // Publisher before the italic title
  if (data.publisher) {
    runs.push({ text: `${data.publisher}, ` });
  }

  runs.push({ text: data.title, italic: true });

  if (data.retrievedDate) {
    // Online form: no volume element (Rule 7.8)
    runs.push({ text: ` (online at ${data.retrievedDate})` });
  } else {
    if (data.volume) {
      runs.push({ text: `, vol ${data.volume}` });
    }
    if (data.date) {
      runs.push({ text: ` (at ${data.date})` });
    }
  }

  // Paragraph pinpoint
  if (data.paragraph) {
    runs.push({ text: ` ${bracketParagraph(data.paragraph)}` });
  }

  return runs;
}

// ─── OTHER-019 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.9 — Intellectual Property Materials
 *
 * Format: `«*Jurisdiction Code*» «*IP Type*» «*Qualifier*» *No* «*Number*»,
 * filed/lodged on «Full Date» («Status Change» on «Full Date»)` — the
 * identifier segment is italicised (guide ex 71: *US Trademark
 * Registration No 4938522*, filed on 6 December 2013 (Registered on 12
 * April 2016)). The status parenthetical is omitted where nothing has
 * happened since filing.
 *
 * @param data - IP material citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.9.
 */
export function formatIpMaterial(data: IpMaterialData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Italic identifier: Jurisdiction Code + IP Type + Qualifier + No + Number
  const identifier = [data.jurisdictionCode, data.ipType, data.numberQualifier, "No", data.number]
    .filter((p) => p && p.trim().length > 0)
    .join(" ");
  runs.push({ text: identifier, italic: true });

  // ', filed on «date»' (or 'lodged')
  const filingDate = data.filingDate ?? data.date;
  if (filingDate) {
    runs.push({ text: `, ${data.filedTerm ?? "filed"} on ${filingDate}` });
  }

  // Latest status change parenthetical
  if (data.status && data.statusDate) {
    runs.push({ text: ` (${data.status} on ${data.statusDate})` });
  }

  return runs;
}

// ─── OTHER-020 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.10 — Constitutive Documents of a Corporation
 *
 * Format: `«*Document Type*», «Company Name» (at «Full Date») «Pinpoint»`
 * (guide ex 78: *Constitution*, ASX (at 5 October 2012) cl 1.1). The
 * document type is italic; the company name loses corporate-status
 * designators and a leading 'The'; pinpoints follow rule 3.1.4 (never
 * pages).
 *
 * @param data - Constitutive document citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.10.
 */
export function formatConstitutiveDocument(data: ConstitutiveDocumentData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Document type — italic, first (Rule 7.10)
  runs.push({ text: data.documentType, italic: true });

  // Company name, stripped of corporate designators and a leading 'The'
  runs.push({ text: `, ${normaliseBodyName(data.companyName)}` });

  // Date of last update or retrieval
  if (data.date) {
    runs.push({ text: ` (at ${data.date})` });
  }

  // Pinpoint (Rule 3.1.4 forms, eg 'cl 1.1'; never pages)
  if (data.pinpoint) {
    runs.push({ text: ` ${formatPinpointValue(data.pinpoint)}` });
  }

  return runs;
}

// ─── OTHER-021 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rules 7.11.1–7.11.4 — Newspaper Articles
 *
 * Printed format: `Author, '«Title»', «*Newspaper*» («Place», «Full Date»)
 * «Pinpoint»`. Electronic format: `(online, «Full Date») «Pinpoint» <URL>`.
 * An untitled piece takes an unquoted description in the title slot
 * (Rule 7.11.4, `titleIsDescription`); unsigned articles simply omit the
 * author.
 *
 * @param data - Newspaper article citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.11.1–7.11.4.
 */
export function formatNewspaper(data: NewspaperData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.authors && data.authors.length > 0) {
    const authorRuns = formatAuthors(data.authors);
    runs.push(...authorRuns);
    runs.push({ text: ", " });
  }

  // Title: quoted, or an unquoted description for untitled pieces (7.11.4)
  if (data.titleIsDescription) {
    runs.push({ text: data.title });
  } else {
    runs.push({ text: "‘" + data.title + "’" });
  }
  // Rule 26.4: bracketed element translation follows the title (roman)
  if (data.translatedTitle) {
    runs.push({ text: ` [${data.translatedTitle}]` });
  }
  runs.push({ text: ", " });
  runs.push({ text: data.newspaper, italic: true });

  if (data.isElectronic) {
    // AGLC4 Rule 7.11.2: Electronic format uses (online, Full Date)
    runs.push({ text: " (online, " + data.date + ")" });

    if (data.page) {
      runs.push({ text: " " + data.page });
    }

    if (data.url) {
      runs.push({ text: " <" + data.url + ">" });
    }
  } else {
    // AGLC4 Rule 7.11.1: Printed format uses (Place, Full Date)
    runs.push({ text: " (" + data.place + ", " + data.date + ")" });

    if (data.page) {
      runs.push({ text: " " + data.page });
    }
  }

  return runs;
}

/**
 * AGLC4 Rule 7.11.4 — Editorials
 *
 * 'Editorial' replaces the author's name while the quoted title (where the
 * editorial has one) is retained: `Editorial, '«Title»', «*Newspaper*» …`
 * (guide ex 91).
 *
 * @param data - Editorial citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.11.4.
 */
export function formatEditorial(data: EditorialData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // 'Editorial' stands in the author position (Rule 7.11.4)
  runs.push({ text: "Editorial, " });

  if (data.title) {
    runs.push({ text: "‘" + data.title + "’" });
    runs.push({ text: ", " });
  }

  runs.push({ text: data.newspaper, italic: true });

  if (data.isElectronic) {
    // AGLC4 Rule 7.11.2: Electronic format uses (online, Full Date)
    runs.push({ text: " (online, " + data.date + ")" });

    if (data.page) {
      runs.push({ text: " " + data.page });
    }

    if (data.url) {
      runs.push({ text: " <" + data.url + ">" });
    }
  } else {
    // AGLC4 Rule 7.11.1: Printed format uses (Place, Full Date)
    runs.push({ text: " (" + data.place + ", " + data.date + ")" });

    if (data.page) {
      runs.push({ text: " " + data.page });
    }
  }

  return runs;
}

// ─── OTHER-022 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.12 — Correspondence
 *
 * Format: Type from Sender to Recipient, Date.
 *
 * @param data - Correspondence citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.12.
 */
export function formatCorrespondence(data: CorrespondenceData): FormattedRun[] {
  return [
    {
      text: data.type + " from " + data.sender + " to " + data.recipient + ", " + data.date,
    },
  ];
}

// ─── OTHER-023 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.13 — Interviews and Similar Formats
 *
 * Format: `Interview with «Interviewee» («Interviewer», «Forum», «Full
 * Date»)`. 'Interview' may be swapped for the format actually used (eg
 * 'Conversation') via `interviewType`.
 *
 * @param data - Interview citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.13.
 */
export function formatInterview(data: InterviewData): FormattedRun[] {
  const parentheticalParts: string[] = [];

  if (data.interviewer) {
    parentheticalParts.push(data.interviewer);
  }

  if (data.location) {
    parentheticalParts.push(data.location);
  }

  parentheticalParts.push(data.date);

  const label = data.interviewType ?? "Interview";
  return [
    {
      text: `${label} with ${data.interviewee} (${parentheticalParts.join(", ")})`,
    },
  ];
}

// ─── OTHER-024 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rules 7.14.1–7.14.2 — Films and Audiovisual Recordings
 *
 * Format: `«*Title*» («Version Details», «Studio/Production Company»,
 * «Year») «Time Pinpoint»` (guide ex 100: *The Dark Knight* (Warner
 * Brothers Pictures, 2008) 0:54:58–0:55:11). AGLC4 has no director
 * element; version details appear only for non-standard versions.
 *
 * @param data - Film citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.14.1–7.14.2.
 */
export function formatFilm(data: FilmData): FormattedRun[] {
  const runs: FormattedRun[] = [
    { text: data.title, italic: true },
    {
      // The production-company slot falls back to legacy `director` data.
      text: ` (${joinParen([data.versionDetails, data.productionCompany ?? data.director, data.year])})`,
    },
  ];

  if (data.timePinpoint) {
    runs.push({ text: ` ${data.timePinpoint}` });
  }

  return runs;
}

/**
 * AGLC4 Rule 7.14.3 — Television Series
 *
 * Format: `'«Episode Title»', «*Series Title*» («Version Details»,
 * «Studio/Network», «Year/Date») «Time Pinpoint» <URL>`. Untitled episodes
 * are identified in the episode-title slot as 'Episode «N»' or 'Season
 * «X», Episode «Y»' (guide ex 103); a series cited as a whole has no
 * episode element (ex 105).
 *
 * @param data - Television series citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.14.3.
 */
export function formatTvSeries(data: TvSeriesData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Episode title slot: explicit title, or 'Season X, Episode Y' built from
  // numbers for untitled episodes (Rule 7.14.3).
  let episodeTitle = data.episodeTitle ?? "";
  if (!episodeTitle) {
    const parts: string[] = [];
    if (data.seasonNumber) parts.push(`Season ${data.seasonNumber}`);
    if (data.episodeNumber) parts.push(`Episode ${data.episodeNumber}`);
    episodeTitle = parts.join(", ");
  }
  if (episodeTitle) {
    runs.push({ text: "‘" + episodeTitle + "’" });
    runs.push({ text: ", " });
  }

  runs.push({ text: data.seriesTitle, italic: true });

  // Production parenthetical — empty elements are skipped (no dangling comma)
  const paren = joinParen([data.versionDetails, data.network, data.date]);
  if (paren) {
    runs.push({ text: ` (${paren})` });
  }

  if (data.timePinpoint) {
    runs.push({ text: ` ${data.timePinpoint}` });
  }

  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}

/**
 * AGLC4 Rule 7.14.4 — Radio Segments and Podcasts
 *
 * Format: `'«Episode Title»', «*Series Title*» («Producer», «Full Date»)
 * «Time Pinpoint» <URL>` (guide ex 108). The episode title is reproduced
 * exactly as on the source; the producer/production company is omitted
 * where it is the same as the series title.
 *
 * @param data - Podcast/radio segment citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.14.4.
 */
export function formatPodcast(data: PodcastData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.episodeTitle) {
    runs.push({ text: "‘" + data.episodeTitle + "’" });
    runs.push({ text: ", " });
  }

  runs.push({ text: data.seriesTitle, italic: true });

  // Producer, omitted where the same as the series title (Rule 7.14.4)
  let producer = data.producer ?? data.host;
  if (producer && producer.trim().toLowerCase() === data.seriesTitle.trim().toLowerCase()) {
    producer = undefined;
  }

  const paren = joinParen([producer, data.date]);
  if (paren) {
    runs.push({ text: ` (${paren})` });
  }

  if (data.timePinpoint) {
    runs.push({ text: ` ${data.timePinpoint}` });
  }

  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}

// ─── OTHER-025 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.15 — Internet Materials
 *
 * Format: `«Author», '«Document Title»', «*Web Page Title*» («Document
 * Type», «Full Date») «Pinpoint» <«URL»>`. The parenthetical carries the
 * document type (eg 'Web Page', 'Blog Post') and as much of the date as
 * the page shows — `(Web Page)` alone where no date appears (guide ex
 * 112). The author is omitted where identical to the web page title.
 *
 * @param data - Internet material citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.15.
 */
export function formatInternetMaterial(data: InternetMaterialData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.authors && data.authors.length > 0) {
    const authorRuns = formatAuthors(data.authors);
    const authorText = authorRuns
      .map((r) => r.text)
      .join("")
      .trim();
    // Rule 7.15: omit the author where identical to the web page title.
    if (authorText.toLowerCase() !== data.website.trim().toLowerCase()) {
      runs.push(...authorRuns);
      runs.push({ text: ", " });
    }
  }

  if (data.title) {
    runs.push({ text: `‘${data.title}’` });
    // Rule 26.4: bracketed element translation follows the quoted title
    if (data.translatedTitle) {
      runs.push({ text: ` [${data.translatedTitle}]` });
    }
  }
  if (data.website) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: data.website, italic: true });
    // Rule 26.4: roman translation after the italic web page title (ex 22)
    if (data.translatedWebsiteName) {
      runs.push({ text: ` [${data.translatedWebsiteName}]` });
    }
  }

  // Parenthetical: (Document Type, Full Date) / (Document Type) / (Date).
  // A bare date without a type is legacy data entered before the
  // documentType field existed.
  const paren = joinParen([data.documentType, data.date]);
  if (paren) {
    runs.push({ text: ` (${paren})` });
  }

  // Rule 7.15: pinpoint before the URL — usually paragraph numbers, cited
  // in square brackets
  if (data.pinpoint) {
    const value = formatPinpointValue(data.pinpoint);
    runs.push({
      text: ` ${data.pinpoint.type === "paragraph" ? bracketParagraph(value) : value}`,
    });
  }

  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  // A5-EXP-4 (experimental, pending AGLC5): archived-web note after the URL.
  // AGLC4 has no archive form; rendered "(archived at [service] [date])" when
  // an archive URL is recorded. Service and date are optional refinements.
  const archivedUrl = (data.archivedUrl ?? "").trim();
  if (archivedUrl) {
    const parts = [data.archiveService, data.archiveDate].map((p) => (p ?? "").trim());
    const suffix = parts.filter(Boolean).join(" ");
    runs.push({ text: ` (archived at ${suffix ? `${suffix} ` : ""}${archivedUrl})` });
  }

  return runs;
}

// ─── OTHER-026 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.16 — Social Media
 *
 * Format: `«Username», '«Title»' («Platform», «Full Date», «Time») «Time
 * Pinpoint» <«URL»>`. The title is omitted where the post has none; a time
 * disambiguates multiple same-day posts; video pinpoints are points or
 * spans of time (Rules 1.11.3–1.11.4).
 *
 * @param data - Social media citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.16.
 */
export function formatSocialMedia(data: SocialMediaData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  // Username
  runs.push({ text: data.author });

  // Title (optional, in single quotes)
  if (data.title) {
    runs.push({ text: ", ‘" + data.title + "’" });
  }

  // Parenthetical: (Platform, Date[, Time])
  const parenParts: string[] = [data.platform, data.date];
  if (data.time) {
    parenParts.push(data.time);
  }
  runs.push({ text: " (" + parenParts.join(", ") + ")" });

  // Video time pinpoint (Rules 1.11.3–1.11.4)
  if (data.timePinpoint) {
    runs.push({ text: ` ${data.timePinpoint}` });
  }

  // URL
  runs.push({ text: " <" + data.url + ">" });

  return runs;
}
