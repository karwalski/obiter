/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * endnoteRefTypes.ts — how each EndNote reference type uses the generic
 * EndNote XML elements.
 *
 * EndNote stores every reference in the same forty-odd elements
 * (<secondary-title>, <volume>, <section>, ...) and lets a reference type
 * relabel them. The UTS AGLC4 reference-type table (tests/fixtures/
 * interchange/endnote/uts-RefTypeTable.xml) relabels them heavily: for a
 * "Case (Reported)" <secondary-title> is the law report abbreviation,
 * <publisher> the judge or court and <section> a square-bracket year. This
 * module records those relabellings as role assignments the codec applies
 * on import and inverts on export. The generic assignment is the fallback
 * for any element a type does not relabel.
 *
 * Derived from the UTS field list, not transcribed from EndNote itself.
 */

import type { CreatorRole, InterchangeKind, InterchangeLegal } from "../model";
import { normaliseEndnoteTypeName } from "../mapper/kinds";

/** The flat element names the codec reads from and writes to a <record>. */
export type EndnoteElement =
  | "authors"
  | "secondary-authors"
  | "tertiary-authors"
  | "subsidiary-authors"
  | "translated-authors"
  | "title"
  | "secondary-title"
  | "tertiary-title"
  | "alt-title"
  | "short-title"
  | "translated-title"
  | "full-title"
  | "abbr-1"
  | "pages"
  | "volume"
  | "number"
  | "num-vols"
  | "edition"
  | "section"
  | "reprint-edition"
  | "keywords"
  | "year"
  | "date"
  | "pub-location"
  | "publisher"
  | "orig-pub"
  | "isbn"
  | "accession-num"
  | "call-num"
  | "label"
  | "work-type"
  | "abstract"
  | "notes"
  | "research-notes"
  | "urls"
  | "pdf-urls"
  | "electronic-resource-num"
  | "custom1"
  | "custom2"
  | "custom3"
  | "custom4"
  | "custom5"
  | "custom6"
  | "custom7"
  | "custom8"
  | "access-date"
  | "language"
  | "auth-address"
  | "remote-database-name"
  | "remote-database-provider";

/** Elements in the order the codec applies them (dates before the fields that depend on them). */
export const ENDNOTE_ELEMENT_ORDER: readonly EndnoteElement[] = [
  "remote-database-name",
  "remote-database-provider",
  "authors",
  "secondary-authors",
  "tertiary-authors",
  "subsidiary-authors",
  "translated-authors",
  "year",
  "title",
  "secondary-title",
  "tertiary-title",
  "alt-title",
  "short-title",
  "translated-title",
  "full-title",
  "abbr-1",
  "pub-location",
  "publisher",
  "volume",
  "number",
  "num-vols",
  "pages",
  "edition",
  "section",
  "reprint-edition",
  "orig-pub",
  "date",
  "keywords",
  "isbn",
  "accession-num",
  "call-num",
  "label",
  "work-type",
  "abstract",
  "notes",
  "research-notes",
  "urls",
  "pdf-urls",
  "electronic-resource-num",
  "custom1",
  "custom2",
  "custom3",
  "custom4",
  "custom5",
  "custom6",
  "custom7",
  "custom8",
  "access-date",
  "language",
  "auth-address",
];

/** Legal string fields a role may target directly. */
export type LegalTextField = {
  [K in keyof InterchangeLegal]-?: InterchangeLegal[K] extends string | undefined ? K : never;
}[keyof InterchangeLegal];

export type LegalDateField = "decidedDate" | "openedDate" | "signedDate" | "inForceDate";

/** Plain string fields on the record a role may target directly. */
export type SimpleField =
  | "title"
  | "shortTitle"
  | "containerTitle"
  | "containerTitleShort"
  | "collectionTitle"
  | "volume"
  | "issue"
  | "part"
  | "number"
  | "numberOfPages"
  | "edition"
  | "publisher"
  | "place"
  | "institution"
  | "genre"
  | "medium"
  | "event"
  | "eventPlace"
  | "language"
  | "abstract";

/**
 * Where an element's text lands on the record. Compound targets (those
 * with a "+" or "|", or the legal.* helpers that also fill a generic field)
 * encode the UTS conventions the codec must honour both ways.
 */
export type RoleAssignment =
  | "ignore"
  | SimpleField
  | "issued"
  | "issued.year"
  | "issued.ifNoDate"
  | "issued.yearSquareFlag"
  | "accessed"
  | "eventDate"
  | "pageRange"
  | "pageFirst"
  | "issueOrNumber"
  | "keywords"
  | "notes"
  | "attachments"
  | "urls"
  | "identifiers.doi"
  | "identifiers.isbnOrIssn"
  | "identifiers.accessionNumber"
  | "identifiers.callNumber"
  | "provenance.sourceLabel"
  | "containerTitle.fallback"
  | "containerTitleShort.fallback"
  | "lawReform.title"
  | "lawReform.commission"
  | "lawReform.reportTitle"
  | `creators.${CreatorRole}`
  | `legal.${LegalTextField}`
  | `legal.${LegalDateField}`
  | "legal.decidedDate+issued"
  | "legal.signedDate+inForceDate"
  | "legal.inForceDate|not-yet"
  | "legal.parties"
  | "legal.caseName"
  | "legal.reporter"
  | "legal.yearRound"
  | "legal.yearSquare"
  | "legal.judgesOrCourt"
  | "legal.mncNumber"
  | "legal.actTitle"
  | "legal.actYear"
  | `passthrough:${string}`;

export type RoleMap = Readonly<Partial<Record<EndnoteElement, RoleAssignment>>>;

export interface EndnoteRefType {
  /** Numeric id in the reference-type table this entry belongs to. */
  id: number;
  /** Name exactly as EndNote writes it in ref-type@name. */
  name: string;
  kind: InterchangeKind;
  /** Elements this type relabels; everything else follows GENERIC_ROLES. */
  roles: RoleMap;
}

/** Element -> target for any type that does not relabel the element. */
export const GENERIC_ROLES: Readonly<Record<EndnoteElement, RoleAssignment>> = {
  authors: "creators.author",
  "secondary-authors": "creators.editor",
  "tertiary-authors": "creators.series-editor",
  "subsidiary-authors": "creators.translator",
  "translated-authors": "passthrough:translated-authors",
  title: "title",
  "secondary-title": "containerTitle",
  "tertiary-title": "collectionTitle",
  "alt-title": "containerTitleShort",
  "short-title": "shortTitle",
  "translated-title": "passthrough:translated-title",
  "full-title": "containerTitle.fallback",
  "abbr-1": "containerTitleShort.fallback",
  pages: "pageRange",
  volume: "volume",
  number: "issueOrNumber",
  "num-vols": "passthrough:num-vols",
  edition: "edition",
  section: "passthrough:section",
  "reprint-edition": "passthrough:reprint-edition",
  keywords: "keywords",
  year: "issued.year",
  date: "issued",
  "pub-location": "place",
  publisher: "publisher",
  "orig-pub": "passthrough:orig-pub",
  isbn: "identifiers.isbnOrIssn",
  "accession-num": "identifiers.accessionNumber",
  "call-num": "identifiers.callNumber",
  label: "passthrough:label",
  "work-type": "genre",
  abstract: "abstract",
  notes: "notes",
  "research-notes": "notes",
  urls: "urls",
  "pdf-urls": "attachments",
  "electronic-resource-num": "identifiers.doi",
  custom1: "passthrough:custom1",
  custom2: "passthrough:custom2",
  custom3: "passthrough:custom3",
  custom4: "passthrough:custom4",
  custom5: "passthrough:custom5",
  custom6: "passthrough:custom6",
  custom7: "passthrough:custom7",
  custom8: "passthrough:custom8",
  "access-date": "accessed",
  language: "language",
  "auth-address": "passthrough:auth-address",
  "remote-database-name": "provenance.sourceLabel",
  "remote-database-provider": "passthrough:remote-database-provider",
};

// ─── Shared role fragments ──────────────────────────────────────────────────

const REPORTED_CASE: RoleMap = {
  year: "legal.yearRound",
  title: "legal.caseName",
  "secondary-title": "legal.reporter",
  "tertiary-title": "passthrough:reporter-full-name",
  publisher: "legal.judgesOrCourt",
  volume: "legal.reporterVolume",
  pages: "legal.firstPage",
  section: "legal.yearSquare",
  date: "legal.decidedDate",
  "work-type": "passthrough:phase",
};

const STATUTE: RoleMap = {
  year: "legal.actYear",
  title: "legal.actTitle",
  "secondary-title": "legal.jurisdiction",
  edition: "passthrough:date-in-force",
  date: "passthrough:date-enacted",
};

const BOOK: RoleMap = {
  "secondary-authors": "creators.series-editor",
  "secondary-title": "collectionTitle",
  pages: "numberOfPages",
  section: "passthrough:pages",
  "subsidiary-authors": "creators.translator",
  "orig-pub": "passthrough:original-title",
  "reprint-edition": "passthrough:original-year",
  date: "issued",
};

const JOURNAL_ARTICLE: RoleMap = {
  "secondary-title": "containerTitle",
  publisher: "part",
  number: "issue",
  section: "issued.yearSquareFlag",
  edition: "passthrough:issue-square-brackets",
  "alt-title": "containerTitleShort",
  date: "issued",
};

const INTERNET: RoleMap = {
  "secondary-title": "containerTitle",
  publisher: "publisher",
  "work-type": "genre",
  date: "issued",
  "translated-title": "passthrough:translated-title",
};

const PARL_PAPER: RoleMap = {
  authors: "creators.author",
  "secondary-title": "genre",
  "pub-location": "legal.legislature",
  publisher: "passthrough:jurisdiction",
  number: "number",
  section: "legal.session",
  date: "issued",
};

const AUDIOVISUAL: RoleMap = {
  publisher: "publisher",
  volume: "passthrough:version-details",
  "num-vols": "passthrough:extent",
  "work-type": "medium",
  "subsidiary-authors": "creators.contributor",
  date: "issued",
};

// ─── The UTS AGLC4 table ────────────────────────────────────────────────────

const UTS_LIST: readonly EndnoteRefType[] = [
  { id: 0, name: "Journal Article", kind: "article", roles: JOURNAL_ARTICLE },
  { id: 1, name: "Book", kind: "book", roles: BOOK },
  {
    id: 2,
    name: "Thesis",
    kind: "thesis",
    roles: {
      "secondary-title": "passthrough:department",
      publisher: "institution",
      pages: "numberOfPages",
      "tertiary-authors": "passthrough:advisor",
      "work-type": "genre",
    },
  },
  {
    id: 3,
    name: "WTO or GATT Document",
    kind: "un-document",
    roles: {
      "secondary-title": "genre",
      number: "legal.documentNumber",
      section: "passthrough:bisd-reference",
      date: "issued",
      "work-type": "passthrough:date-of-adoption",
      "alt-title": "passthrough:annex-title",
      isbn: "passthrough:annex-number",
    },
  },
  {
    id: 4,
    name: "Written Correspondence",
    kind: "correspondence",
    roles: {
      title: "genre",
      "secondary-title": "creators.author",
      "pub-location": "passthrough:collection-title",
      publisher: "passthrough:collection-location",
      number: "passthrough:folio-number",
      "tertiary-authors": "creators.recipient",
      edition: "passthrough:description",
      date: "issued",
      "work-type": "passthrough:work-type",
    },
  },
  {
    id: 5,
    name: "Newspaper Article",
    kind: "newspaper",
    roles: {
      "secondary-title": "containerTitle",
      "pub-location": "place",
      "num-vols": "passthrough:frequency",
      number: "number",
      pages: "pageFirst",
      section: "passthrough:section",
      edition: "issued.ifNoDate",
      date: "issued",
      "work-type": "genre",
    },
  },
  {
    id: 6,
    name: "Research or Working Paper",
    kind: "research-paper",
    roles: { "pub-location": "genre", publisher: "institution", number: "number", date: "issued" },
  },
  {
    id: 7,
    name: "Book Chapter",
    kind: "chapter",
    roles: {
      title: "title",
      "secondary-authors": "creators.editor",
      "secondary-title": "containerTitle",
      pages: "pageFirst",
      "tertiary-authors": "creators.series-editor",
      "tertiary-title": "collectionTitle",
      "subsidiary-authors": "creators.translator",
      "orig-pub": "passthrough:original-title",
      "reprint-edition": "passthrough:original-year",
    },
  },
  {
    id: 8,
    name: "Magazine Article",
    kind: "periodical",
    roles: {
      "secondary-title": "containerTitle",
      number: "issue",
      pages: "pageFirst",
      section: "passthrough:section",
      date: "issued",
    },
  },
  { id: 9, name: "Edited Book", kind: "book", roles: { ...BOOK, authors: "creators.editor" } },
  {
    id: 10,
    name: "Royal or Law Reform Commission",
    kind: "report",
    roles: {
      title: "lawReform.title",
      "secondary-title": "lawReform.commission",
      "pub-location": "lawReform.reportTitle",
      publisher: "genre",
      volume: "volume",
      number: "number",
      date: "issued",
    },
  },
  {
    id: 11,
    name: "Speech",
    kind: "speech",
    roles: {
      authors: "creators.speaker",
      "secondary-title": "event",
      section: "genre",
      date: "issued",
    },
  },
  { id: 12, name: "Film", kind: "film", roles: AUDIOVISUAL },
  {
    id: 13,
    name: "United Nations Document",
    kind: "un-document",
    roles: {
      authors: "creators.author",
      "secondary-title": "legal.resolutionNumber",
      "pub-location": "legal.officialRecords",
      publisher: "legal.committee",
      volume: "legal.session",
      "num-vols": "passthrough:part-number",
      number: "legal.meetingNumber",
      pages: "legal.agendaItem",
      section: "legal.supplement",
      "tertiary-title": "legal.documentNumber",
      edition: "passthrough:author-position",
      date: "issued",
      "work-type": "passthrough:annex",
      "alt-title": "passthrough:annex-title",
      isbn: "passthrough:date-of-adoption",
    },
  },
  {
    id: 14,
    name: "Case (Unreported no Medium Neutral)",
    kind: "case",
    roles: {
      title: "legal.caseName",
      "pub-location": "legal.courtName",
      publisher: "legal.judges",
      volume: "legal.proceedingNumber",
      date: "legal.decidedDate+issued",
    },
  },
  {
    id: 15,
    name: "Statute (United States Session)",
    kind: "legislation",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      "secondary-title": "passthrough:public-law-number",
      "pub-location": "passthrough:private-law-number",
      publisher: "passthrough:chapter-number",
      volume: "passthrough:volume-or-year",
      "num-vols": "passthrough:full-date",
      number: "passthrough:session-laws-name",
      pages: "passthrough:original-pinpoint",
      section: "passthrough:starting-page",
      "tertiary-authors": "passthrough:publisher-editor-compiler",
    },
  },
  { id: 16, name: "Internet Material with Author", kind: "web", roles: INTERNET },
  { id: 17, name: "Bill", kind: "bill", roles: STATUTE },
  { id: 18, name: "Case (Reported)", kind: "case", roles: REPORTED_CASE },
  { id: 19, name: "Parl. Paper or Committee Report", kind: "report", roles: PARL_PAPER },
  {
    id: 20,
    name: "Internatl Courts of Justice",
    kind: "foreign-case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.parties",
      "pub-location": "passthrough:phase",
      publisher: "legal.reporter",
      volume: "legal.reporterVolume",
      number: "passthrough:series-letter",
      pages: "legal.firstPage",
      section: "legal.docket",
      "tertiary-title": "passthrough:document-title",
      date: "legal.decidedDate",
    },
  },
  {
    id: 21,
    name: "Television, Radio & Audiovisual",
    kind: "broadcast",
    roles: { ...AUDIOVISUAL, title: "title", "secondary-title": "containerTitle" },
  },
  { id: 22, name: "Statute", kind: "legislation", roles: STATUTE },
  {
    id: 23,
    name: "Case (Arbitral)",
    kind: "case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "passthrough:award-description",
      "pub-location": "legal.courtName",
      volume: "passthrough:award-type",
      number: "legal.docket",
      "tertiary-title": "passthrough:citation-to-reproduction",
      date: "legal.decidedDate",
    },
  },
  {
    id: 24,
    name: "Case (Medium Neutral)",
    kind: "case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.courtCode",
      volume: "legal.mncNumber",
      date: "legal.decidedDate",
    },
  },
  {
    id: 25,
    name: "Statute (United Kingdom)",
    kind: "legislation",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      "secondary-authors": "passthrough:year-no-jurisdiction",
      "secondary-title": "legal.jurisdiction",
      "pub-location": "passthrough:regnal-year",
      publisher: "passthrough:si-number",
      volume: "passthrough:chapter",
      number: "passthrough:scottish-act-number",
      pages: "passthrough:welsh-measure-number",
    },
  },
  {
    id: 26,
    name: "Bill or Resolution (US)",
    kind: "bill",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      "secondary-title": "passthrough:chamber-or-resolution-type",
      "pub-location": "passthrough:bill-number",
      publisher: "passthrough:resolution-number",
      volume: "passthrough:congress-number",
      "num-vols": "passthrough:congressional-record-volume",
      number: "passthrough:congressional-record-pinpoint",
      pages: "passthrough:statutes-at-large-volume",
      "tertiary-title": "passthrough:statutes-at-large-page",
      date: "issued",
    },
  },
  {
    id: 27,
    name: "Looseleaf Service",
    kind: "looseleaf",
    roles: {
      "secondary-title": "publisher",
      publisher: "passthrough:service-or-date",
      date: "accessed",
    },
  },
  {
    id: 28,
    name: "Electronic Article",
    kind: "article",
    roles: {
      ...JOURNAL_ARTICLE,
      section: "passthrough:article-number",
      "tertiary-title": "passthrough:issue-month-or-season",
      "pub-location": "place",
    },
  },
  {
    id: 29,
    name: "WTO or GATT Panel, Appellate, Arbitral Decisions",
    kind: "foreign-case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "genre",
      number: "legal.documentNumber",
      section: "passthrough:dsr-or-bisd-reference",
      date: "legal.decidedDate",
      "work-type": "passthrough:date-of-adoption",
    },
  },
  { id: 30, name: "Case (Reported, without short title)", kind: "case", roles: REPORTED_CASE },
  { id: 31, name: "Generic", kind: "generic", roles: { "work-type": "genre" } },
  {
    id: 32,
    name: "Treaty",
    kind: "treaty",
    roles: {
      publisher: "legal.parties",
      volume: "legal.signedDate",
      "num-vols": "legal.signedDate+inForceDate",
      number: "legal.openedDate",
      pages: "legal.inForceDate|not-yet",
      section: "legal.treatySeries",
    },
  },
  {
    id: 33,
    name: "Conference Paper",
    kind: "conference",
    roles: {
      "secondary-authors": "creators.editor",
      "secondary-title": "event",
      "pub-location": "eventPlace",
      section: "genre",
      date: "issued",
    },
  },
  {
    id: 34,
    name: "Bills Digest or Alert Digest",
    kind: "research-paper",
    roles: {
      authors: "creators.author",
      "secondary-title": "genre",
      "pub-location": "legal.legislature",
      publisher: "passthrough:jurisdiction",
      number: "number",
      date: "issued",
    },
  },
  {
    id: 35,
    name: "Gazette",
    kind: "gazette",
    roles: {
      authors: "creators.author",
      title: "genre",
      "secondary-title": "legal.jurisdiction",
      "pub-location": "title",
      number: "number",
      pages: "pageFirst",
      date: "issued",
    },
  },
  {
    id: 36,
    name: "Parl. Debate",
    kind: "hansard",
    roles: {
      authors: "legal.jurisdiction",
      title: "legal.chamber",
      publisher: "creators.speaker",
      volume: "passthrough:speaker-position",
      "num-vols": "volume",
      number: "passthrough:column",
      pages: "pageFirst",
      date: "issued",
    },
  },
  {
    id: 37,
    name: "Unpublished Work",
    kind: "research-paper",
    roles: {
      "secondary-title": "collectionTitle",
      publisher: "institution",
      number: "number",
      date: "issued",
      "work-type": "genre",
    },
  },
  {
    id: 42,
    name: "Internatl Criminal Tribunals, Courts",
    kind: "foreign-case",
    roles: {
      title: "legal.caseName",
      "pub-location": "passthrough:phase",
      publisher: "legal.courtName",
      volume: "legal.reporterVolume",
      "num-vols": "legal.reporter",
      number: "legal.docket",
      pages: "legal.firstPage",
      section: "legal.chamber",
      date: "legal.decidedDate",
    },
  },
  {
    id: 43,
    name: "Blog Post",
    kind: "blog",
    roles: {
      ...INTERNET,
      "secondary-authors": "passthrough:blog-author",
      volume: "passthrough:access-year",
      number: "passthrough:access-date",
      "remote-database-provider": "passthrough:archived-url",
    },
  },
  {
    id: 44,
    name: "Case Transcript",
    kind: "case-transcript",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.courtName",
      "pub-location": "legal.proceedingNumber",
      publisher: "legal.judges",
      volume: "number",
      date: "issued",
    },
  },
  {
    id: 45,
    name: "Statute (Canada)",
    kind: "legislation",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      volume: "passthrough:volume-and-jurisdiction",
      number: "passthrough:chapter",
    },
  },
  {
    id: 46,
    name: "Statute (United States Code)",
    kind: "legislation",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      "secondary-authors": "passthrough:title-chapter-or-volume",
      "secondary-title": "passthrough:code-name",
      "pub-location": "passthrough:state-title-details",
      publisher: "passthrough:publisher-name",
      pages: "passthrough:code-pinpoint",
    },
  },
  {
    id: 47,
    name: "Pleadings",
    kind: "foreign-case",
    roles: {
      title: "title",
      "secondary-title": "legal.caseName",
      "pub-location": "legal.parties",
      publisher: "legal.reporter",
      "num-vols": "passthrough:report-series-number",
      number: "legal.docket",
      pages: "legal.firstPage",
      date: "legal.decidedDate",
    },
  },
  {
    id: 48,
    name: "Dictionary",
    kind: "dictionary",
    roles: {
      "secondary-title": "passthrough:entry",
      number: "passthrough:definition-number",
      edition: "edition",
      date: "accessed",
    },
  },
  { id: 49, name: "Statute without Short Title", kind: "legislation", roles: STATUTE },
  {
    id: 50,
    name: "Internatl Unreported",
    kind: "foreign-case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.parties",
      "pub-location": "passthrough:phase",
      publisher: "legal.courtName",
      "num-vols": "passthrough:type-of-number",
      number: "legal.docket",
      "tertiary-title": "passthrough:document-title",
      date: "legal.decidedDate",
    },
  },
  {
    id: 51,
    name: "Podcast",
    kind: "podcast",
    roles: { "secondary-title": "containerTitle", publisher: "publisher", date: "issued" },
  },
  {
    id: 52,
    name: "Memorandum of Understanding",
    kind: "mou",
    roles: { "secondary-title": "legal.parties", date: "legal.signedDate" },
  },
  {
    id: 53,
    name: "Interview",
    kind: "interview",
    roles: {
      authors: "creators.interviewee",
      "secondary-authors": "creators.interviewer",
      "secondary-title": "passthrough:position",
      "pub-location": "eventPlace",
      date: "issued",
    },
  },
  {
    id: 54,
    name: "Internatl Arbitral, Tribunal Decisions",
    kind: "foreign-case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.parties",
      "pub-location": "passthrough:phase",
      publisher: "legal.reporter",
      volume: "legal.reporterVolume",
      pages: "legal.firstPage",
    },
  },
  {
    id: 55,
    name: "Social Media Post",
    kind: "social",
    roles: {
      authors: "creators.author",
      "secondary-authors": "passthrough:display-name",
      publisher: "passthrough:platform",
      edition: "passthrough:time",
      "work-type": "passthrough:time-zone",
      date: "issued",
      "orig-pub": "passthrough:original-post",
    },
  },
  { id: 56, name: "Internet Material without Author", kind: "web", roles: INTERNET },
  {
    id: 57,
    name: "Case Submission",
    kind: "case-submission",
    roles: {
      authors: "creators.author",
      title: "legal.caseName",
      "secondary-title": "passthrough:submission-title",
      number: "legal.proceedingNumber",
      date: "issued",
    },
  },
];

/** UTS AGLC4 reference types keyed by normalised name. */
export const UTS_REF_TYPES: Readonly<Record<string, EndnoteRefType>> = Object.freeze(
  UTS_LIST.reduce<Record<string, EndnoteRefType>>((acc, entry) => {
    acc[normaliseEndnoteTypeName(entry.name)] = entry;
    return acc;
  }, {})
);

/**
 * The few EndNote default types whose generic elements carry legal
 * meaning. Applied when a file uses EndNote's own type names.
 */
const DEFAULT_LIST: readonly EndnoteRefType[] = [
  {
    id: 17,
    name: "Case",
    kind: "case",
    roles: {
      title: "legal.caseName",
      "secondary-title": "legal.reporter",
      publisher: "legal.judgesOrCourt",
      volume: "legal.reporterVolume",
      number: "legal.docket",
      pages: "legal.firstPage",
      date: "legal.decidedDate",
    },
  },
  {
    id: 31,
    name: "Statute",
    kind: "legislation",
    roles: {
      year: "legal.actYear",
      title: "legal.actTitle",
      "secondary-title": "passthrough:code",
      section: "legal.section",
    },
  },
];

const DEFAULT_REF_TYPES: Readonly<Record<string, EndnoteRefType>> = Object.freeze(
  DEFAULT_LIST.reduce<Record<string, EndnoteRefType>>((acc, entry) => {
    acc[normaliseEndnoteTypeName(entry.name)] = entry;
    return acc;
  }, {})
);

/**
 * EndNote's default numeric ids, used when ref-type@name is missing or
 * unknown. Generic is 13 in EndNote's own table.
 */
export const ENDNOTE_DEFAULT_ID_TO_TYPE: Readonly<Record<number, string>> = {
  0: "Journal Article",
  1: "Book",
  2: "Thesis",
  3: "Conference Proceedings",
  5: "Book Section",
  6: "Book Section",
  7: "Book Section",
  10: "Report",
  12: "Web Page",
  13: "Generic",
  17: "Case",
  23: "Newspaper Article",
  27: "Report",
  31: "Statute",
  32: "Statute",
  33: "Web Page",
  34: "Bill",
  35: "Hearing",
  36: "Legal Rule or Regulation",
  43: "Blog",
  45: "Personal Communication",
  46: "Film or Broadcast",
  47: "Conference Paper",
  48: "Interview",
  49: "Podcast",
  50: "Encyclopedia",
  52: "Dictionary",
  53: "Dataset",
  59: "Government Document",
  61: "Electronic Article",
  63: "Magazine Article",
};

const DEFAULT_TYPE_TO_ID: Readonly<Record<string, number>> = Object.entries(
  ENDNOTE_DEFAULT_ID_TO_TYPE
).reduce<Record<string, number>>((acc, [id, name]) => {
  const key = normaliseEndnoteTypeName(name);
  if (acc[key] === undefined) acc[key] = Number(id);
  return acc;
}, {});

/** The id EndNote's own table uses for a default type name; 13 (Generic) when unknown. */
export function endnoteDefaultTypeId(name: string): number {
  return DEFAULT_TYPE_TO_ID[normaliseEndnoteTypeName(name)] ?? 13;
}

/** The UTS entry for a type name, when the name is one of the UTS types. */
export function utsRefType(typeName: string): EndnoteRefType | undefined {
  return UTS_REF_TYPES[normaliseEndnoteTypeName(typeName)];
}

/** The UTS id for a type name; 31 (the UTS Generic) when unknown. */
export function utsRefTypeId(typeName: string): number {
  return utsRefType(typeName)?.id ?? 31;
}

/**
 * The element relabellings for a UTS type, or an empty map for a name the
 * UTS table does not define. Merge over GENERIC_ROLES for the full map.
 */
export function utsRolesFor(typeName: string): RoleMap {
  return utsRefType(typeName)?.roles ?? {};
}

/**
 * The full element -> target map for any type name: UTS relabellings
 * first, then EndNote's default legal types, then the generic map.
 */
export function rolesFor(typeName: string): Readonly<Record<EndnoteElement, RoleAssignment>> {
  const key = normaliseEndnoteTypeName(typeName);
  const overrides = UTS_REF_TYPES[key]?.roles ?? DEFAULT_REF_TYPES[key]?.roles ?? {};
  return { ...GENERIC_ROLES, ...overrides };
}

/** The type entry (UTS or default) a name resolves to, for its kind. */
export function refTypeFor(typeName: string): EndnoteRefType | undefined {
  const key = normaliseEndnoteTypeName(typeName);
  return UTS_REF_TYPES[key] ?? DEFAULT_REF_TYPES[key];
}

/** UTS type name written on export when the record carries no Obiter source type. */
export const KIND_TO_UTS_ENDNOTE: Readonly<Record<InterchangeKind, string>> = {
  case: "Case (Reported)",
  "case-transcript": "Case Transcript",
  "case-submission": "Case Submission",
  legislation: "Statute",
  bill: "Bill",
  regulation: "Statute",
  constitution: "Statute",
  "explanatory-memorandum": "Parl. Paper or Committee Report",
  gazette: "Gazette",
  hansard: "Parl. Debate",
  hearing: "Parl. Paper or Committee Report",
  submission: "Parl. Paper or Committee Report",
  treaty: "Treaty",
  mou: "Memorandum of Understanding",
  "un-document": "United Nations Document",
  "foreign-case": "Internatl Unreported",
  article: "Journal Article",
  book: "Book",
  chapter: "Book Chapter",
  report: "Royal or Law Reform Commission",
  "research-paper": "Research or Working Paper",
  thesis: "Thesis",
  conference: "Conference Paper",
  speech: "Speech",
  "press-release": "Generic",
  newspaper: "Newspaper Article",
  periodical: "Magazine Article",
  web: "Internet Material with Author",
  blog: "Blog Post",
  social: "Social Media Post",
  correspondence: "Written Correspondence",
  interview: "Interview",
  broadcast: "Television, Radio & Audiovisual",
  film: "Film",
  podcast: "Podcast",
  dictionary: "Dictionary",
  encyclopedia: "Generic",
  looseleaf: "Looseleaf Service",
  dataset: "Generic",
  software: "Generic",
  genai: "Generic",
  generic: "Generic",
};
