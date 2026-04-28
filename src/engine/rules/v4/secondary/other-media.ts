/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Author, Pinpoint } from "../../../../types/citation";
import { FormattedRun } from "../../../../types/formattedRun";
import { formatAuthors, formatAuthorName } from "./authors";

// ─── Data Interfaces ────────────────────────────────────────────────────────

export interface ParliamentaryEvidenceData {
  title: string;
  committee: string;
  parliament: string;
  jurisdiction: string;
  date: string;
  page?: string;
  witness?: string;
}

export interface ConstitutionalConventionData {
  conventionName: string;
  location: string;
  date: string;
  volume?: string;
  page?: string;
}

export interface DictionaryData {
  title: string;
  publisher?: string;
  edition?: string;
  year: string;
  entry: string;
  definitionNumber?: string;
}

export interface LegalEncyclopediaData {
  title: string;
  date: string;
  volume?: string;
  titleNumber?: string;
  topic: string;
  paragraph: string;
}

export interface LooseleafData {
  authors: Author[];
  title: string;
  publisher: string;
  date: string;
  volume?: string;
  paragraph?: string;
}

export interface IpMaterialData {
  ipType: string;
  number: string;
  title?: string;
  applicant?: string;
  date?: string;
}

export interface ConstitutiveDocumentData {
  companyName: string;
  documentType: string;
  pinpoint?: Pinpoint;
}

export interface NewspaperData {
  authors?: Author[];
  title: string;
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
  interviewer?: string;
  location?: string;
  date: string;
}

export interface FilmData {
  title: string;
  director: string;
  year: string;
}

export interface TvSeriesData {
  episodeTitle: string;
  seriesTitle: string;
  network: string;
  date: string;
}

export interface PodcastData {
  episodeTitle?: string;
  seriesTitle: string;
  host?: string;
  date: string;
  url?: string;
}

export interface InternetMaterialData {
  authors?: Author[];
  title: string;
  website: string;
  date: string;
  url: string;
}

export interface SocialMediaData {
  author: string;
  platform: string;
  title?: string;
  date: string;
  time?: string;
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

// ─── OTHER-014 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.5.3 — Evidence to Parliamentary Committees
 *
 * Format: Evidence to Committee, Parliament, Jurisdiction, Date, Page (Witness).
 *
 * @param data - Parliamentary evidence metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.3.
 */
export function formatParliamentaryEvidence(
  data: ParliamentaryEvidenceData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({
    text:
      "Evidence to " +
      data.committee +
      ", " +
      data.parliament +
      ", " +
      data.jurisdiction +
      ", " +
      data.date,
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
 * AGLC4 Rule 7.5.4 — Constitutional Conventions
 *
 * Format: Convention Name, Location, Date, Volume, Page.
 *
 * @param data - Constitutional convention metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.5.4.
 */
export function formatConstitutionalConvention(
  data: ConstitutionalConventionData,
): FormattedRun[] {
  const parts: string[] = [
    data.conventionName,
    data.location,
    data.date,
  ];

  if (data.volume) {
    parts.push("vol " + data.volume);
  }

  if (data.page) {
    parts.push(data.page);
  }

  return [{ text: parts.join(", ") }];
}

// ─── OTHER-016 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.6 — Dictionaries
 *
 * Format: Dictionary Title (Publisher, Ed, Year) 'entry' (def no).
 * The dictionary title is italic.
 *
 * @param data - Dictionary citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.6.
 */
export function formatDictionary(data: DictionaryData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: data.title, italic: true });

  const parentheticalParts: string[] = [];
  if (data.publisher) {
    parentheticalParts.push(data.publisher);
  }
  if (data.edition) {
    parentheticalParts.push(data.edition);
  }
  parentheticalParts.push(data.year);

  runs.push({ text: " (" + parentheticalParts.join(", ") + ")" });
  runs.push({ text: " \u2018" + data.entry + "\u2019" });

  if (data.definitionNumber) {
    runs.push({ text: " (def " + data.definitionNumber + ")" });
  }

  return runs;
}

// ─── OTHER-017 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.7 — Legal Encyclopedias
 *
 * Format: Title (italic), at Date, Volume, Title Number, 'Topic', Paragraph.
 *
 * @param data - Legal encyclopedia citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.7.
 */
export function formatLegalEncyclopedia(
  data: LegalEncyclopediaData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  runs.push({ text: data.title, italic: true });
  runs.push({ text: " (at " + data.date + ")" });

  if (data.volume) {
    runs.push({ text: " vol " + data.volume });
  }

  if (data.titleNumber) {
    runs.push({ text: ", " + data.titleNumber });
  }

  runs.push({ text: " \u2018" + data.topic + "\u2019" });
  runs.push({ text: " " + data.paragraph });

  return runs;
}

// ─── OTHER-018 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.8 — Looseleaf Services
 *
 * Format: Author, Title (italic), (Publisher, Date) vol Volume, Paragraph.
 *
 * @param data - Looseleaf service citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.8.
 */
export function formatLooseleaf(data: LooseleafData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  const authorRuns = formatAuthors(data.authors);
  if (authorRuns.length > 0) {
    runs.push(...authorRuns);
    runs.push({ text: ", " });
  }

  runs.push({ text: data.title, italic: true });
  runs.push({
    text: " (" + data.publisher + ", " + data.date + ")",
  });

  if (data.volume) {
    runs.push({ text: " vol " + data.volume });
  }

  if (data.paragraph) {
    runs.push({ text: ", " + data.paragraph });
  }

  return runs;
}

// ─── OTHER-019 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.9 — Intellectual Property Materials
 *
 * Format: IP Type No Number, Title, Applicant, Date.
 *
 * @param data - IP material citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.9.
 */
export function formatIpMaterial(data: IpMaterialData): FormattedRun[] {
  const parts: string[] = [data.ipType + " No " + data.number];

  if (data.title) {
    parts.push(data.title);
  }

  if (data.applicant) {
    parts.push(data.applicant);
  }

  if (data.date) {
    parts.push(data.date);
  }

  return [{ text: parts.join(", ") }];
}

// ─── OTHER-020 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.10 — Constitutive Documents
 *
 * Format: Company Name, Document Type, Pinpoint.
 *
 * @param data - Constitutive document citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.10.
 */
export function formatConstitutiveDocument(
  data: ConstitutiveDocumentData,
): FormattedRun[] {
  const parts: string[] = [data.companyName, data.documentType];

  if (data.pinpoint) {
    parts.push(formatPinpointValue(data.pinpoint));
  }

  return [{ text: parts.join(", ") }];
}

// ─── OTHER-021 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rules 7.11.1–7.11.4 — Newspaper Articles
 *
 * Printed format: Author, 'Title', Newspaper (Place, Date) Page.
 * Electronic format adds: (online, Date) <URL>.
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

  runs.push({ text: "\u2018" + data.title + "\u2019" });
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
 * AGLC4 Rules 7.11.1–7.11.4 — Editorials and Unsigned Newspaper Articles
 *
 * Editorials are cited without an author. If the editorial has a title,
 * it is included in single quotes. Otherwise, 'Editorial' is used.
 *
 * @param data - Editorial citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.11.1–7.11.4.
 */
export function formatEditorial(data: EditorialData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.title) {
    runs.push({ text: "\u2018" + data.title + "\u2019" });
  } else {
    runs.push({ text: "Editorial" });
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
export function formatCorrespondence(
  data: CorrespondenceData,
): FormattedRun[] {
  return [
    {
      text:
        data.type +
        " from " +
        data.sender +
        " to " +
        data.recipient +
        ", " +
        data.date,
    },
  ];
}

// ─── OTHER-023 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.13 — Interviews
 *
 * Format: Interview with Interviewee (Interviewer, Location, Date).
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

  return [
    {
      text:
        "Interview with " +
        data.interviewee +
        " (" +
        parentheticalParts.join(", ") +
        ")",
    },
  ];
}

// ─── OTHER-024 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rules 7.14.1–7.14.4 — Films
 *
 * Format: Title (italic) (Director, Year).
 *
 * @param data - Film citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.14.1–7.14.4.
 */
export function formatFilm(data: FilmData): FormattedRun[] {
  return [
    { text: data.title, italic: true },
    {
      text:
        " (Directed by " + data.director + ", " + data.year + ")",
    },
  ];
}

/**
 * AGLC4 Rules 7.14.1–7.14.4 — Television Series
 *
 * Format: 'Episode Title', Series Title (italic) (Network, Date).
 *
 * @param data - Television series citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.14.1–7.14.4.
 */
export function formatTvSeries(data: TvSeriesData): FormattedRun[] {
  return [
    { text: "\u2018" + data.episodeTitle + "\u2019" },
    { text: ", " },
    { text: data.seriesTitle, italic: true },
    { text: " (" + data.network + ", " + data.date + ")" },
  ];
}

/**
 * AGLC4 Rules 7.14.1–7.14.4 — Podcasts
 *
 * Format: 'Episode Title', Series Title (italic) (Host, Date) <URL>.
 * If no episode title, just the series title.
 *
 * @param data - Podcast citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rules 7.14.1–7.14.4.
 */
export function formatPodcast(data: PodcastData): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.episodeTitle) {
    runs.push({ text: "\u2018" + data.episodeTitle + "\u2019" });
    runs.push({ text: ", " });
  }

  runs.push({ text: data.seriesTitle, italic: true });

  const parentheticalParts: string[] = [];
  if (data.host) {
    parentheticalParts.push(data.host);
  }
  parentheticalParts.push(data.date);

  runs.push({ text: " (" + parentheticalParts.join(", ") + ")" });

  if (data.url) {
    runs.push({ text: " <" + data.url + ">" });
  }

  return runs;
}

// ─── OTHER-025 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.15 — Internet Materials
 *
 * Format: Author, 'Title', Website (Date) <URL>.
 *
 * @param data - Internet material citation metadata.
 * @returns FormattedRun[] representing the formatted citation.
 *
 * @see AGLC4, Rule 7.15.
 */
export function formatInternetMaterial(
  data: InternetMaterialData,
): FormattedRun[] {
  const runs: FormattedRun[] = [];

  if (data.authors && data.authors.length > 0) {
    const authorRuns = formatAuthors(data.authors);
    runs.push(...authorRuns);
    runs.push({ text: ", " });
  }

  if (data.title) {
    runs.push({ text: `\u2018${data.title}\u2019` });
  }
  if (data.website) {
    if (runs.length > 0) runs.push({ text: ", " });
    runs.push({ text: data.website, italic: true });
  }
  if (data.date) {
    runs.push({ text: ` (${data.date})` });
  }
  if (data.url) {
    runs.push({ text: ` <${data.url}>` });
  }

  return runs;
}

// ─── OTHER-026 ──────────────────────────────────────────────────────────────

/**
 * AGLC4 Rule 7.16 — Social Media
 *
 * Format: Username, 'Title' (Social Media Platform, Full Date, Time) <URL>.
 * If no title, omit the title portion.
 * If a time is provided, include it after the date separated by a comma.
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
    runs.push({ text: ", \u2018" + data.title + "\u2019" });
  }

  // Parenthetical: (Platform, Date[, Time])
  const parenParts: string[] = [data.platform, data.date];
  if (data.time) {
    parenParts.push(data.time);
  }
  runs.push({ text: " (" + parenParts.join(", ") + ")" });

  // URL
  runs.push({ text: " <" + data.url + ">" });

  return runs;
}
