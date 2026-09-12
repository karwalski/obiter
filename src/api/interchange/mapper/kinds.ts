/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * kinds.ts — the type vocabularies of each interchange format and how they
 * relate to InterchangeKind and to Obiter source types.
 *
 * Import direction: a format's type value -> kind (the mapper then refines
 * the kind into a SourceType from the record's fields). Export direction:
 * an Obiter SourceType -> the type value each format should carry.
 */

import type { SourceType } from "../../../types/citation";
import type { InterchangeKind } from "../model";

// ─── RIS ────────────────────────────────────────────────────────────────────

/** RIS TY value -> kind. Covers the 2001 specification plus modern additions. */
export const RIS_TYPE_TO_KIND: Readonly<Record<string, InterchangeKind>> = {
  ABST: "article",
  ADVS: "broadcast",
  ART: "generic",
  BILL: "bill",
  UNBILL: "bill",
  BLOG: "blog",
  BOOK: "book",
  EBOOK: "book",
  EDBOOK: "book",
  SER: "book",
  CASE: "case",
  LEGAL: "case",
  CHAP: "chapter",
  ECHAP: "chapter",
  COMP: "software",
  CONF: "conference",
  CPAPER: "conference",
  CTLG: "generic",
  DATA: "dataset",
  DBASE: "dataset",
  DICT: "dictionary",
  ENCYC: "encyclopedia",
  ELEC: "web",
  WEB: "web",
  GEN: "generic",
  GOVDOC: "report",
  HEAR: "hearing",
  ICOMM: "social",
  INPR: "article",
  JFULL: "article",
  JOUR: "article",
  EJOUR: "article",
  MANSCPT: "research-paper",
  MAP: "generic",
  MGZN: "periodical",
  MPCT: "film",
  MUSIC: "broadcast",
  NEWS: "newspaper",
  PAMP: "generic",
  PAT: "generic",
  PCOMM: "correspondence",
  RPRT: "report",
  SLIDE: "speech",
  SOUND: "podcast",
  STAND: "generic",
  STAT: "legislation",
  THES: "thesis",
  UNPB: "research-paper",
  VIDEO: "broadcast",
};

/** Kind -> RIS TY value written on export. */
export const KIND_TO_RIS_TYPE: Readonly<Record<InterchangeKind, string>> = {
  case: "CASE",
  "case-transcript": "CASE",
  "case-submission": "CASE",
  legislation: "STAT",
  bill: "BILL",
  regulation: "STAT",
  constitution: "STAT",
  "explanatory-memorandum": "GOVDOC",
  gazette: "GOVDOC",
  hansard: "HEAR",
  hearing: "HEAR",
  submission: "GOVDOC",
  treaty: "GEN",
  mou: "GEN",
  "un-document": "GOVDOC",
  "foreign-case": "CASE",
  article: "JOUR",
  book: "BOOK",
  chapter: "CHAP",
  report: "RPRT",
  "research-paper": "RPRT",
  thesis: "THES",
  conference: "CONF",
  speech: "SLIDE",
  "press-release": "GEN",
  newspaper: "NEWS",
  periodical: "MGZN",
  web: "ELEC",
  blog: "BLOG",
  social: "ICOMM",
  correspondence: "PCOMM",
  interview: "PCOMM",
  broadcast: "VIDEO",
  film: "MPCT",
  podcast: "SOUND",
  dictionary: "DICT",
  encyclopedia: "ENCYC",
  looseleaf: "SER",
  dataset: "DATA",
  software: "COMP",
  genai: "PCOMM",
  generic: "GEN",
};

// ─── CSL-JSON ───────────────────────────────────────────────────────────────

export const CSL_TYPE_TO_KIND: Readonly<Record<string, InterchangeKind>> = {
  legal_case: "case",
  legislation: "legislation",
  bill: "bill",
  regulation: "regulation",
  hearing: "hearing",
  treaty: "treaty",
  report: "report",
  "article-journal": "article",
  "article-newspaper": "newspaper",
  "article-magazine": "periodical",
  article: "article",
  book: "book",
  chapter: "chapter",
  webpage: "web",
  "post-weblog": "blog",
  post: "social",
  thesis: "thesis",
  interview: "interview",
  personal_communication: "correspondence",
  broadcast: "broadcast",
  motion_picture: "film",
  "paper-conference": "conference",
  speech: "speech",
  dataset: "dataset",
  software: "software",
  document: "generic",
  "entry-dictionary": "dictionary",
  "entry-encyclopedia": "encyclopedia",
  entry: "encyclopedia",
  manuscript: "research-paper",
  standard: "generic",
  pamphlet: "generic",
  periodical: "periodical",
  review: "article",
  "review-book": "article",
  collection: "book",
  event: "generic",
  figure: "generic",
  graphic: "generic",
  map: "generic",
  musical_score: "generic",
  patent: "generic",
  song: "broadcast",
  classic: "book",
  performance: "generic",
};

export const KIND_TO_CSL_TYPE: Readonly<Record<InterchangeKind, string>> = {
  case: "legal_case",
  "case-transcript": "legal_case",
  "case-submission": "legal_case",
  legislation: "legislation",
  bill: "bill",
  regulation: "regulation",
  constitution: "legislation",
  "explanatory-memorandum": "document",
  gazette: "document",
  hansard: "hearing",
  hearing: "hearing",
  submission: "document",
  treaty: "treaty",
  mou: "treaty",
  "un-document": "document",
  "foreign-case": "legal_case",
  article: "article-journal",
  book: "book",
  chapter: "chapter",
  report: "report",
  "research-paper": "report",
  thesis: "thesis",
  conference: "paper-conference",
  speech: "speech",
  "press-release": "document",
  newspaper: "article-newspaper",
  periodical: "article-magazine",
  web: "webpage",
  blog: "post-weblog",
  social: "post",
  correspondence: "personal_communication",
  interview: "interview",
  broadcast: "broadcast",
  film: "motion_picture",
  podcast: "broadcast",
  dictionary: "entry-dictionary",
  encyclopedia: "entry-encyclopedia",
  looseleaf: "document",
  dataset: "dataset",
  software: "software",
  genai: "personal_communication",
  generic: "document",
};

// ─── BibTeX / BibLaTeX ──────────────────────────────────────────────────────

export const BIBTEX_TYPE_TO_KIND: Readonly<Record<string, InterchangeKind>> = {
  article: "article",
  periodical: "periodical",
  book: "book",
  collection: "book",
  mvbook: "book",
  mvcollection: "book",
  proceedings: "book",
  mvproceedings: "book",
  inbook: "chapter",
  incollection: "chapter",
  bookinbook: "chapter",
  suppbook: "chapter",
  inproceedings: "conference",
  conference: "conference",
  phdthesis: "thesis",
  mastersthesis: "thesis",
  thesis: "thesis",
  techreport: "report",
  report: "report",
  online: "web",
  electronic: "web",
  www: "web",
  unpublished: "research-paper",
  booklet: "generic",
  manual: "generic",
  inreference: "encyclopedia",
  reference: "encyclopedia",
  patent: "generic",
  legislation: "legislation",
  legal: "case",
  jurisdiction: "case",
  commentary: "looseleaf",
  software: "software",
  dataset: "dataset",
  audio: "podcast",
  video: "film",
  movie: "film",
  letter: "correspondence",
  misc: "generic",
};

export const KIND_TO_BIBTEX_TYPE: Readonly<Record<InterchangeKind, string>> = {
  case: "jurisdiction",
  "case-transcript": "jurisdiction",
  "case-submission": "jurisdiction",
  legislation: "legislation",
  bill: "legislation",
  regulation: "legislation",
  constitution: "legislation",
  "explanatory-memorandum": "report",
  gazette: "misc",
  hansard: "misc",
  hearing: "misc",
  submission: "report",
  treaty: "legal",
  mou: "legal",
  "un-document": "report",
  "foreign-case": "jurisdiction",
  article: "article",
  book: "book",
  chapter: "incollection",
  report: "report",
  "research-paper": "report",
  thesis: "thesis",
  conference: "inproceedings",
  speech: "unpublished",
  "press-release": "misc",
  newspaper: "article",
  periodical: "article",
  web: "online",
  blog: "online",
  social: "online",
  correspondence: "letter",
  interview: "misc",
  broadcast: "misc",
  film: "video",
  podcast: "audio",
  dictionary: "inreference",
  encyclopedia: "inreference",
  looseleaf: "commentary",
  dataset: "dataset",
  software: "software",
  genai: "misc",
  generic: "misc",
};

// ─── EndNote ────────────────────────────────────────────────────────────────

/**
 * EndNote reference-type name -> kind. UTS AGLC4 custom names first, then
 * EndNote's default names. Matched case-insensitively after trimming.
 */
export const ENDNOTE_TYPE_TO_KIND: Readonly<Record<string, InterchangeKind>> = {
  // UTS AGLC4 reference types (RefTypeTable.xml, 54 types)
  "journal article": "article",
  book: "book",
  thesis: "thesis",
  "wto or gatt document": "un-document",
  "written correspondence": "correspondence",
  "newspaper article": "newspaper",
  "research or working paper": "research-paper",
  "book chapter": "chapter",
  "magazine article": "periodical",
  "edited book": "book",
  "royal or law reform commission": "report",
  speech: "speech",
  film: "film",
  "united nations document": "un-document",
  "case (unreported no medium neutral)": "case",
  "statute (united states session)": "legislation",
  "internet material with author": "web",
  bill: "bill",
  "case (reported)": "case",
  "parl. paper or committee report": "report",
  "internatl courts of justice": "foreign-case",
  "television, radio & audiovisual": "broadcast",
  statute: "legislation",
  "case (arbitral)": "case",
  "case (medium neutral)": "case",
  "statute (united kingdom)": "legislation",
  "bill or resolution (us)": "bill",
  "looseleaf service": "looseleaf",
  "electronic article": "article",
  "wto or gatt panel, appellate, arbitral decisions": "foreign-case",
  "case (reported, without short title)": "case",
  generic: "generic",
  treaty: "treaty",
  "conference paper": "conference",
  "bills digest or alert digest": "research-paper",
  gazette: "gazette",
  "parl. debate": "hansard",
  "unpublished work": "research-paper",
  "internatl criminal tribunals, courts": "foreign-case",
  "blog post": "blog",
  "case transcript": "case-transcript",
  "statute (canada)": "legislation",
  "statute (united states code)": "legislation",
  pleadings: "foreign-case",
  dictionary: "dictionary",
  "statute without short title": "legislation",
  "internatl unreported": "foreign-case",
  podcast: "podcast",
  "memorandum of understanding": "mou",
  interview: "interview",
  "internatl arbitral, tribunal decisions": "foreign-case",
  "social media post": "social",
  "internet material without author": "web",
  "case submission": "case-submission",
  // EndNote default reference types
  case: "case",
  hearing: "hearing",
  "legal rule or regulation": "regulation",
  "book section": "chapter",
  "web page": "web",
  report: "report",
  "personal communication": "correspondence",
  blog: "blog",
  "film or broadcast": "broadcast",
  "government document": "report",
  encyclopedia: "encyclopedia",
  dataset: "dataset",
  "computer program": "software",
  "online database": "dataset",
  "online multimedia": "broadcast",
  "audiovisual material": "broadcast",
  "conference proceedings": "conference",
  "electronic book": "book",
  newspaper: "newspaper",
  standard: "generic",
  patent: "generic",
  manuscript: "research-paper",
  "press release": "press-release",
  serial: "looseleaf",
  "classical work": "book",
  "ancient text": "book",
  legal: "case",
};

/** UTS AGLC4 reference-type names by Obiter source type (export default). */
export const SOURCE_TYPE_TO_UTS_ENDNOTE: Readonly<Partial<Record<SourceType, string>>> = {
  "case.reported": "Case (Reported)",
  "case.unreported.mnc": "Case (Medium Neutral)",
  "case.unreported.no_mnc": "Case (Unreported no Medium Neutral)",
  "case.proceeding": "Case (Unreported no Medium Neutral)",
  "case.court_order": "Case (Reported)",
  "case.quasi_judicial": "Case (Reported)",
  "case.arbitration": "Case (Arbitral)",
  "case.transcript": "Case Transcript",
  "case.submission": "Case Submission",
  "legislation.statute": "Statute",
  "legislation.delegated": "Statute",
  "legislation.constitution": "Statute",
  "legislation.bill": "Bill",
  "legislation.explanatory": "Parl. Paper or Committee Report",
  "legislation.quasi": "Gazette",
  hansard: "Parl. Debate",
  "evidence.parliamentary": "Parl. Paper or Committee Report",
  constitutional_convention: "Parl. Debate",
  "submission.government": "Parl. Paper or Committee Report",
  treaty: "Treaty",
  "treaty.mou": "Memorandum of Understanding",
  "un.document": "United Nations Document",
  "un.charter": "United Nations Document",
  "un.communication": "United Nations Document",
  "un.yearbook": "United Nations Document",
  "wto.document": "WTO or GATT Document",
  "gatt.document": "WTO or GATT Document",
  "wto.decision": "WTO or GATT Panel, Appellate, Arbitral Decisions",
  "icj.decision": "Internatl Courts of Justice",
  "icj.pleading": "Pleadings",
  "icc_tribunal.case": "Internatl Criminal Tribunals, Courts",
  "arbitral.state_state": "Internatl Arbitral, Tribunal Decisions",
  "arbitral.individual_state": "Internatl Arbitral, Tribunal Decisions",
  "eu.court": "Internatl Unreported",
  "echr.decision": "Internatl Unreported",
  "supranational.decision": "Internatl Unreported",
  "supranational.document": "Generic",
  "eu.official_journal": "Generic",
  "journal.article": "Journal Article",
  "journal.online": "Electronic Article",
  "journal.forthcoming": "Journal Article",
  book: "Book",
  "book.ebook": "Book",
  "book.translated": "Book",
  "book.audiobook": "Book",
  "book.chapter": "Book Chapter",
  report: "Royal or Law Reform Commission",
  "report.parliamentary": "Parl. Paper or Committee Report",
  "report.royal_commission": "Royal or Law Reform Commission",
  "report.law_reform": "Royal or Law Reform Commission",
  "report.abs": "Generic",
  "report.waitangi_tribunal": "Generic",
  research_paper: "Research or Working Paper",
  "research_paper.parliamentary": "Bills Digest or Alert Digest",
  conference_paper: "Conference Paper",
  thesis: "Thesis",
  speech: "Speech",
  press_release: "Generic",
  newspaper: "Newspaper Article",
  periodical: "Magazine Article",
  internet_material: "Internet Material with Author",
  social_media: "Social Media Post",
  correspondence: "Written Correspondence",
  interview: "Interview",
  film_tv_media: "Television, Radio & Audiovisual",
  dictionary: "Dictionary",
  legal_encyclopedia: "Generic",
  looseleaf: "Looseleaf Service",
  ip_material: "Generic",
  constitutive_document: "Generic",
  dataset: "Generic",
  software: "Generic",
  genai_output: "Generic",
  "foreign.uk": "Statute (United Kingdom)",
  "foreign.usa": "Statute (United States Code)",
  "foreign.canada": "Statute (Canada)",
  custom: "Generic",
  explanatory_note: "Generic",
};

/** EndNote default reference-type names by kind (export "generic" profile). */
export const KIND_TO_GENERIC_ENDNOTE: Readonly<Record<InterchangeKind, string>> = {
  case: "Case",
  "case-transcript": "Case",
  "case-submission": "Case",
  legislation: "Statute",
  bill: "Bill",
  regulation: "Legal Rule or Regulation",
  constitution: "Statute",
  "explanatory-memorandum": "Government Document",
  gazette: "Government Document",
  hansard: "Hearing",
  hearing: "Hearing",
  submission: "Government Document",
  treaty: "Generic",
  mou: "Generic",
  "un-document": "Government Document",
  "foreign-case": "Case",
  article: "Journal Article",
  book: "Book",
  chapter: "Book Section",
  report: "Report",
  "research-paper": "Report",
  thesis: "Thesis",
  conference: "Conference Paper",
  speech: "Generic",
  "press-release": "Press Release",
  newspaper: "Newspaper Article",
  periodical: "Magazine Article",
  web: "Web Page",
  blog: "Blog",
  social: "Web Page",
  correspondence: "Personal Communication",
  interview: "Interview",
  broadcast: "Film or Broadcast",
  film: "Film or Broadcast",
  podcast: "Podcast",
  dictionary: "Dictionary",
  encyclopedia: "Encyclopedia",
  looseleaf: "Serial",
  dataset: "Dataset",
  software: "Computer Program",
  genai: "Generic",
  generic: "Generic",
};

// ─── Obiter ─────────────────────────────────────────────────────────────────

/** Obiter source type -> kind (export direction and round-trip identity). */
export function sourceTypeToKind(
  sourceType: SourceType,
  data: Record<string, unknown> = {}
): InterchangeKind {
  if (sourceType.startsWith("case.")) {
    if (sourceType === "case.transcript") return "case-transcript";
    if (sourceType === "case.submission") return "case-submission";
    return "case";
  }
  switch (sourceType) {
    case "legislation.statute":
      return "legislation";
    case "legislation.bill":
      return "bill";
    case "legislation.delegated":
      return "regulation";
    case "legislation.constitution":
      return "constitution";
    case "legislation.explanatory":
      return "explanatory-memorandum";
    case "legislation.quasi":
      return data.gazetteType ? "gazette" : "generic";
    case "hansard":
    case "constitutional_convention":
      return "hansard";
    case "evidence.parliamentary":
      return "hearing";
    case "submission.government":
      return "submission";
    case "treaty":
      return "treaty";
    case "treaty.mou":
      return "mou";
    case "eu.official_journal":
      return "legislation";
    case "journal.article":
    case "journal.online":
    case "journal.forthcoming":
      return "article";
    case "book":
    case "book.ebook":
    case "book.translated":
    case "book.audiobook":
      return "book";
    case "book.chapter":
      return "chapter";
    case "research_paper":
    case "research_paper.parliamentary":
      return "research-paper";
    case "conference_paper":
      return "conference";
    case "thesis":
      return "thesis";
    case "speech":
      return "speech";
    case "press_release":
      return "press-release";
    case "newspaper":
      return "newspaper";
    case "periodical":
      return "periodical";
    case "internet_material":
      return String(data.documentType ?? "").toLowerCase() === "blog post" ? "blog" : "web";
    case "social_media":
      return "social";
    case "correspondence":
      return "correspondence";
    case "interview":
      return "interview";
    case "film_tv_media": {
      const medium = String(data.medium ?? "").toLowerCase();
      if (medium.includes("podcast") || medium.includes("radio")) return "podcast";
      if (medium.includes("tele") || medium.includes("tv") || medium.includes("series"))
        return "broadcast";
      return "film";
    }
    case "dictionary":
      return "dictionary";
    case "legal_encyclopedia":
      return "encyclopedia";
    case "looseleaf":
      return "looseleaf";
    case "dataset":
      return "dataset";
    case "software":
      return "software";
    case "genai_output":
      return "genai";
    default:
      break;
  }
  if (sourceType.startsWith("report")) return "report";
  if (
    sourceType.startsWith("un.") ||
    sourceType.startsWith("wto.") ||
    sourceType === "gatt.document" ||
    sourceType === "supranational.document"
  ) {
    return "un-document";
  }
  if (
    sourceType.startsWith("icj.") ||
    sourceType.startsWith("arbitral.") ||
    sourceType === "icc_tribunal.case" ||
    sourceType === "eu.court" ||
    sourceType === "echr.decision" ||
    sourceType === "supranational.decision"
  ) {
    return "foreign-case";
  }
  if (sourceType.startsWith("foreign.")) {
    const sub = String(data.foreignSubType ?? "").toLowerCase();
    if (sub === "case") return "foreign-case";
    if (sub === "legislation" || sub === "statute") return "legislation";
    if (sub === "bill") return "bill";
    return "generic";
  }
  return "generic";
}

/** Normalises an EndNote reference-type name for table lookup. */
export function normaliseEndnoteTypeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function endnoteTypeToKind(name: string): InterchangeKind | undefined {
  return ENDNOTE_TYPE_TO_KIND[normaliseEndnoteTypeName(name)];
}

export function risTypeToKind(ty: string): InterchangeKind | undefined {
  return RIS_TYPE_TO_KIND[ty.trim().toUpperCase()];
}

export function cslTypeToKind(type: string): InterchangeKind | undefined {
  return CSL_TYPE_TO_KIND[type.trim().toLowerCase()];
}

export function bibtexTypeToKind(entryType: string): InterchangeKind | undefined {
  return BIBTEX_TYPE_TO_KIND[entryType.trim().toLowerCase()];
}
