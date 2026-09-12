/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * model.ts — the canonical interchange record.
 *
 * Every bibliographic format Obiter reads or writes (RIS, EndNote XML,
 * BibTeX, CSL-JSON, Word's Source Manager XML) is a codec that converts
 * between its own text and this one record shape. A single mapper then
 * converts records to and from Obiter citations, so adding a format never
 * touches the mapping rules and adding a source type never touches a codec.
 *
 * The record is CSL-shaped for the generic fields (title, container title,
 * creators, dates, volume, pages) and carries a `legal` block for the
 * elements AGLC4 needs that reference managers model poorly (parties,
 * reporter, medium neutral citation, jurisdiction, chamber). Anything a
 * format supplies that has no slot is kept in `passthrough` so an export
 * back to the same format is lossless (DECISION-038).
 */

/** Formats a codec can identify itself as. */
export type InterchangeFormat = "ris" | "bibtex" | "csl-json" | "endnote-xml" | "word-sources-xml";

/**
 * Format-neutral genre of a record. Coarser than Obiter's SourceType; the
 * mapper refines a kind into a source type from the record's fields.
 */
export type InterchangeKind =
  | "case"
  | "case-transcript"
  | "case-submission"
  | "legislation"
  | "bill"
  | "regulation"
  | "constitution"
  | "explanatory-memorandum"
  | "gazette"
  | "hansard"
  | "hearing"
  | "submission"
  | "treaty"
  | "mou"
  | "un-document"
  | "foreign-case"
  | "article"
  | "book"
  | "chapter"
  | "report"
  | "research-paper"
  | "thesis"
  | "conference"
  | "speech"
  | "press-release"
  | "newspaper"
  | "periodical"
  | "web"
  | "blog"
  | "social"
  | "correspondence"
  | "interview"
  | "broadcast"
  | "film"
  | "podcast"
  | "dictionary"
  | "encyclopedia"
  | "looseleaf"
  | "dataset"
  | "software"
  | "genai"
  | "generic";

export type CreatorRole =
  | "author"
  | "editor"
  | "translator"
  | "series-editor"
  | "speaker"
  | "interviewee"
  | "interviewer"
  | "recipient"
  | "sponsor"
  | "judge"
  | "director"
  | "contributor";

/**
 * A person or body credited on a record. Personal names carry `family` and
 * `given`; a body (commission, department, company) carries `literal`.
 * `raw` keeps the name exactly as the source wrote it.
 */
export interface InterchangeCreator {
  role: CreatorRole;
  family?: string;
  given?: string;
  suffix?: string;
  literal?: string;
  raw: string;
}

/** A partial date. `raw` holds text that could not be structured. */
export interface InterchangeDate {
  year?: number;
  /** 1-12. */
  month?: number;
  day?: number;
  raw?: string;
}

/** Elements AGLC4 needs for primary sources. All optional. */
export interface InterchangeLegal {
  /** "Mabo v Queensland (No 2)" as written. */
  caseName?: string;
  party1?: string;
  party2?: string;
  separator?: string;
  /** Round brackets (volume-organised) or square (year-organised). */
  yearType?: "round" | "square";
  /** Report series abbreviation, eg "CLR". */
  reporter?: string;
  reporterVolume?: string;
  /** Starting page, or a unique reference such as "¶93-198". */
  firstPage?: string;
  /** AGLC court identifier code, eg "HCA". */
  courtCode?: string;
  /** Court name in full, eg "Supreme Court of Victoria". */
  courtName?: string;
  /** Judges as free text, eg "Gleeson CJ, Gummow and Hayne JJ". */
  judges?: string;
  docket?: string;
  /** Medium neutral citation parts. */
  mnc?: { year: number; court: string; number: number; raw: string };
  decidedDate?: InterchangeDate;
  /** Statute short title without the year, eg "Native Title Act". */
  actTitle?: string;
  actYear?: number;
  actNumber?: string;
  /** Jurisdiction code in Obiter form: Cth, NSW, Vic, ..., UK, NZ, US. */
  jurisdiction?: string;
  section?: string;
  chamber?: string;
  legislature?: string;
  committee?: string;
  session?: string;
  history?: string;
  proceedingNumber?: string;
  treatySeries?: string;
  seriesVolume?: string;
  openedDate?: InterchangeDate;
  signedDate?: InterchangeDate;
  inForceDate?: InterchangeDate;
  parties?: string[];
  documentNumber?: string;
  resolutionNumber?: string;
  officialRecords?: string;
  meetingNumber?: string;
  agendaItem?: string;
  supplement?: string;
  /** Raw parallel citation strings, not parsed. */
  parallelCitations?: string[];
  /** Pinpoint text carried by the source, eg "s 223" or "[42]". */
  pinpoint?: string;
}

export interface InterchangeIdentifiers {
  doi?: string;
  isbn?: string;
  issn?: string;
  url?: string;
  urls?: string[];
  citeKey?: string;
  externalId?: string;
  accessionNumber?: string;
  callNumber?: string;
}

/** Where a record came from, and any Obiter identity it carries. */
export interface InterchangeProvenance {
  format: InterchangeFormat;
  /** "Zotero", "EndNote (UTS AGLC4)", "Trove" — from database or generator tags. */
  sourceLabel?: string;
  /** The format's own type value: "CASE", "Case (Reported)", "legal_case", "jurisdiction". */
  rawType: string;
  /** RIS ID, EndNote rec-number, CSL id, BibTeX cite key. */
  rawId?: string;
  /** Obiter citation id carried through an earlier export. */
  obiterId?: string;
  /** Obiter source type carried through an earlier export. */
  obiterSourceType?: string;
  /** ISO timestamp set by the import pipeline. */
  importedAt?: string;
}

/** The formatted output attached on export so other tools can display it. */
export interface InterchangeFormatted {
  standard: string;
  footnote?: string;
  bibliography?: string;
}

export interface InterchangeRecord {
  kind: InterchangeKind;
  title?: string;
  shortTitle?: string;
  /** Journal, book, website, newspaper or series that contains the item. */
  containerTitle?: string;
  containerTitleShort?: string;
  collectionTitle?: string;
  creators: InterchangeCreator[];
  issued?: InterchangeDate;
  accessed?: InterchangeDate;
  eventDate?: InterchangeDate;
  volume?: string;
  issue?: string;
  part?: string;
  number?: string;
  pageFirst?: string;
  pageLast?: string;
  pageRange?: string;
  numberOfPages?: string;
  /** Edition as written: "2nd", "Second", "2". */
  edition?: string;
  publisher?: string;
  place?: string;
  institution?: string;
  /** Document type, thesis type, work type, release type. */
  genre?: string;
  medium?: string;
  event?: string;
  eventPlace?: string;
  language?: string;
  legal?: InterchangeLegal;
  identifiers: InterchangeIdentifiers;
  keywords: string[];
  abstract?: string;
  notes: string[];
  /** Attachment paths and URLs from the source. Never persisted. */
  attachments: string[];
  formatted?: InterchangeFormatted;
  /** Raw tag or element name -> value(s), for anything without a slot. */
  passthrough: Record<string, string | string[]>;
  provenance: InterchangeProvenance;
}

export type IssueSeverity = "error" | "warning" | "info";

export type IssueCode =
  | "parse-error"
  | "unsupported-type"
  | "missing-required"
  | "duplicate"
  | "lossy-mapping"
  | "unknown-report-series"
  | "unknown-court-code"
  | "ambiguous-case-form"
  | "party-split-failed"
  | "date-unparsed"
  | "edition-unparsed"
  | "judges-unparsed"
  | "foreign-routed"
  | "type-fallback-custom"
  | "dropped-fields"
  | "passthrough-truncated"
  | "format-unrecognised";

/** A problem or note attached to a parse, mapping, import or export. */
export interface InterchangeIssue {
  severity: IssueSeverity;
  code: IssueCode;
  /** Obiter voice: says what happened and what to do; no exclamation marks. */
  message: string;
  recordIndex?: number;
  field?: string;
  line?: number;
}

/** The passthrough bag persisted on a citation under `data.interchange`. */
export interface CitationInterchangeBag {
  v: 1;
  provenance: InterchangeProvenance;
  identifiers?: InterchangeIdentifiers;
  keywords?: string[];
  abstract?: string;
  notes?: string[];
  language?: string;
  /** ISO date. */
  accessed?: string;
  custom?: Record<string, string>;
  passthrough?: Record<string, string | string[]>;
}

/** The `data` key under which the bag is stored. Never read by the engine. */
export const INTERCHANGE_DATA_KEY = "interchange";

/** Per-record cap on abstract and notes kept in the bag (DECISION-038). */
export const PASSTHROUGH_TEXT_CAP = 8 * 1024;

/** Builds an empty record of the given kind. */
export function createRecord(
  kind: InterchangeKind,
  provenance: InterchangeProvenance
): InterchangeRecord {
  return {
    kind,
    creators: [],
    identifiers: {},
    keywords: [],
    notes: [],
    attachments: [],
    passthrough: {},
    provenance,
  };
}

/** Appends a value to a passthrough key, promoting to a list on repeat. */
export function addPassthrough(record: InterchangeRecord, key: string, value: string): void {
  const existing = record.passthrough[key];
  if (existing === undefined) {
    record.passthrough[key] = value;
  } else if (Array.isArray(existing)) {
    existing.push(value);
  } else {
    record.passthrough[key] = [existing, value];
  }
}

/** Issue factory keeping the shape in one place. */
export function issue(
  severity: IssueSeverity,
  code: IssueCode,
  message: string,
  extra: Partial<Pick<InterchangeIssue, "recordIndex" | "field" | "line">> = {}
): InterchangeIssue {
  return { severity, code, message, ...extra };
}
