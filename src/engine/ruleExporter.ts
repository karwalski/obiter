/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Rule Exporter (RESEARCH-005, rebuilt in PARITY-118)
 *
 * Exports Obiter's AGLC4 rule implementations as a machine-readable JSON
 * reference for other tool authors. Aggregates source type metadata, report
 * series, court identifiers, pinpoint abbreviations, citation format
 * templates, and subsequent reference rules into a single structured object.
 *
 * The same object is exposed as `sourceTypeSchema` in the Copilot action
 * catalogue (src/actions/actionCatalogue.ts), so the per-type field lists are
 * a live contract for AI callers, not documentation only.
 */

import { REPORT_SERIES } from "./data/report-series";
import { COURT_IDENTIFIERS } from "./data/court-identifiers";
import { PINPOINT_ABBREVIATIONS } from "./data/pinpoint-abbrevs";
import { APP_VERSION } from "../constants";

// ─── RuleReference Interface ────────────────────────────────────────────────

export interface RuleReference {
  version: string;
  generatedAt: string;
  generatedBy: string;
  sourceTypes: Array<{
    type: string;
    ruleNumber: string;
    label: string;
    category: string;
    requiredFields: string[];
    optionalFields: string[];
    formatTemplate: string;
    provenance?: "aglc4" | "experimental_pending_aglc5";
    provenanceNote?: string;
  }>;
  reportSeries: Array<{
    abbreviation: string;
    fullName: string;
    jurisdiction: string;
    type: string;
    yearOrganised: boolean;
  }>;
  courtIdentifiers: Array<{
    code: string;
    fullName: string;
    jurisdiction: string;
  }>;
  pinpointAbbreviations: Array<{
    type: string;
    singular: string;
    plural: string;
  }>;
  subsequentReferenceRules: {
    ibidConditions: string[];
    shortTitleRules: string[];
  };
}

// ─── Source Type Metadata ───────────────────────────────────────────────────

interface SourceTypeMeta {
  type: string;
  ruleNumber: string;
  label: string;
  category: string;
  requiredFields: string[];
  optionalFields: string[];
  formatTemplate: string;
  /**
   * A5-LABEL: provenance of the source type. Absent means the type is an
   * official AGLC4 form (treated as `'aglc4'`). `'experimental_pending_aglc5'`
   * marks a type or field set that goes BEYOND official AGLC4 — Obiter renders
   * it on an interim basis (by analogy or peer-standard precedent) and it is
   * excluded from the AGLC4-conformance count. Every experimental type carries
   * the `EXPERIMENTAL_BADGE` in the UI. On AGLC5 publication each such item is
   * re-mapped or retired per the WS-1 runbook (DECISION-036).
   */
  provenance?: "aglc4" | "experimental_pending_aglc5";
  /**
   * A5-LABEL: short note stating the interim basis for an experimental type
   * (the analogy/precedent Obiter follows pending AGLC5). Rendered as the badge
   * tooltip in the type picker and form header. Only meaningful when
   * `provenance` is `'experimental_pending_aglc5'`.
   */
  provenanceNote?: string;
}

// ─── A5-LABEL: Experimental-labelling constants ─────────────────────────────

/**
 * A5-LABEL / DECISION-036: the canonical badge copy shown wherever an
 * experimental (beyond-AGLC4) source type or field set surfaces in the UI or
 * docs. Every experimental item MUST carry this exact text so users can never
 * mistake it for an official AGLC4 form.
 */
export const EXPERIMENTAL_BADGE = "Experimental · pending AGLC5 (not an official AGLC4 form)";

/**
 * Comprehensive metadata for every SourceType the engine dispatcher supports
 * (src/engine/engine.ts SOURCE_DISPATCH). Each entry documents the AGLC4 rule
 * number, the field names the dispatcher actually reads (requiredFields =
 * rule-mandated elements; optionalFields = conditional elements), and a
 * citation format template mirroring the reference template for the rule.
 *
 * Field names are the PRIMARY keys each dispatch function reads (legacy
 * aliases such as `institutionalAuthor` or `icsidNumber` are accepted by the
 * dispatcher but not part of this contract). Where a rule has several forms,
 * the template shows each variant separated by ` | `.
 *
 * Consistency with SOURCE_DISPATCH is enforced by
 * tests/engine/rule-exporter.test.ts — update both together.
 */
const SOURCE_TYPE_METADATA: SourceTypeMeta[] = [
  // ── Part II — Domestic Sources: Cases ─────────────────────────────────────
  {
    type: "case.reported",
    ruleNumber: "2.2",
    label: "Reported Case",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "year", "reportSeries", "startingPage"],
    optionalFields: [
      "separator",
      "yearType",
      "volume",
      "pinpoint",
      "courtId",
      "judicialOfficers",
      "caseHistory",
      "parallelCitations",
      "mnc",
    ],
    // Rule 2.2.7: parallelCitations/mnc render only in court writing mode.
    formatTemplate:
      "Party1 v Party2 (Year) Volume ReportSeries StartingPage, Pinpoint JudicialOfficers (Court).",
  },
  {
    type: "case.unreported.mnc",
    ruleNumber: "2.3.1",
    label: "Unreported Case (Medium Neutral Citation)",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "year", "court", "caseNumber"],
    optionalFields: ["separator", "pinpoint", "judicialOfficer"],
    formatTemplate: "Party1 v Party2 [Year] Court CaseNumber, Pinpoint (JudicialOfficer).",
  },
  {
    type: "case.unreported.no_mnc",
    ruleNumber: "2.3.2",
    label: "Unreported Case (No Medium Neutral Citation)",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "court", "judges", "fullDate"],
    optionalFields: ["separator", "pinpoint"],
    formatTemplate: "Party1 v Party2 (Court, Judges, FullDate) Pinpoint.",
  },
  {
    type: "case.proceeding",
    ruleNumber: "2.3.3",
    label: "Proceeding",
    category: "domestic.case",
    requiredFields: ["party1", "court", "proceedingNumber", "commencedDate"],
    optionalFields: ["party2", "separator"],
    formatTemplate: "Party1 v Party2 (Court, ProceedingNumber, commenced CommencedDate).",
  },
  {
    type: "case.court_order",
    ruleNumber: "2.3.4",
    label: "Court Order",
    category: "domestic.case",
    requiredFields: ["party1", "judicialOfficers", "court", "orderDate"],
    optionalFields: ["party2", "separator", "proceedingNumber"],
    formatTemplate:
      "Order of JudicialOfficers in Party1 v Party2 (Court, ProceedingNumber, OrderDate).",
  },
  {
    type: "case.quasi_judicial",
    ruleNumber: "2.6.1",
    label: "Quasi-Judicial (Administrative) Decision",
    category: "domestic.case",
    requiredFields: ["party", "year", "reportSeries", "startingPage"],
    optionalFields: ["department", "separator", "volume", "pinpoint"],
    formatTemplate: "Re Party and Department (Year) Volume ReportSeries StartingPage, Pinpoint.",
  },
  {
    type: "case.arbitration",
    ruleNumber: "2.6.2",
    label: "Arbitration",
    category: "domestic.case",
    requiredFields: ["awardDescription", "date"],
    optionalFields: ["parties", "forum", "caseNumber", "pinpoint", "reportedIn"],
    formatTemplate:
      "Parties (AwardDescription, Forum, Case/Award No CaseNumber, FullDate) Pinpoint. | No parties: AwardDescription, Forum, Case/Award No CaseNumber, FullDate, Pinpoint.",
  },
  {
    type: "case.transcript",
    ruleNumber: "2.7",
    label: "Transcript of Proceedings",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "court", "date"],
    optionalFields: [
      "separator",
      "proceedingNumber",
      "judicialOfficers",
      "pinpoints",
      "pinpoint",
      "speaker",
      "hcaTranscript",
      "year",
      "number",
    ],
    formatTemplate:
      "Transcript of Proceedings, Party1 v Party2 (Court, ProceedingNumber, JudicialOfficers, FullDate) Pinpoint (Speaker). | HCA from July 2003 (2.7.2): Transcript of Proceedings, Party1 v Party2 [Year] HCATrans Number, Pinpoint (Speaker).",
  },
  {
    type: "case.submission",
    ruleNumber: "2.8",
    label: "Submission in a Case",
    category: "domestic.case",
    requiredFields: ["partyName", "party1", "date"],
    optionalFields: ["submissionTitle", "party2", "separator", "proceedingNumber", "pinpoint"],
    formatTemplate:
      "PartyName, 'SubmissionTitle', Submission in Party1 v Party2, ProceedingNumber, FullDate, Pinpoint.",
  },

  // ── Part II — Domestic Sources: Legislation ───────────────────────────────
  {
    type: "legislation.statute",
    ruleNumber: "3.1",
    label: "Statute",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction"],
    optionalFields: [
      "number",
      "pinpoint",
      "definedTerm",
      "definitionParagraph",
      "definitionInPortion",
      "legislativeHistory",
    ],
    formatTemplate:
      "Title Year (Jurisdiction) Pinpoint. | Definition (3.1.6): Title Year (Jurisdiction) Pinpoint (definition of 'DefinedTerm').",
  },
  {
    type: "legislation.bill",
    ruleNumber: "3.2",
    label: "Bill",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction"],
    optionalFields: ["number", "pinpoint", "legislativeHistory"],
    // Cited as a statute but with title and year in roman type.
    formatTemplate: "Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.delegated",
    ruleNumber: "3.4",
    label: "Delegated Legislation",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.constitution",
    ruleNumber: "3.6",
    label: "Constitution",
    category: "domestic.legislation",
    requiredFields: [],
    optionalFields: ["title", "year", "jurisdiction", "pinpoint"],
    formatTemplate:
      "Australian Constitution Pinpoint. | State constitutions (statute form): Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.explanatory",
    ruleNumber: "3.7",
    label: "Explanatory Memorandum",
    category: "domestic.legislation",
    requiredFields: ["billTitle", "billYear", "jurisdiction"],
    optionalFields: ["type", "pinpoint"],
    // The bill citation follows rule 3.2 (roman type).
    formatTemplate: "Explanatory Memorandum, BillTitle BillYear (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.quasi",
    ruleNumber: "3.9",
    label: "Quasi-Legislative Material",
    category: "domestic.legislation",
    requiredFields: ["issuingBody", "title"],
    optionalFields: [
      "bodyJurisdiction",
      "number",
      "date",
      "atDate",
      "pinpoint",
      "gazetteType",
      "jurisdiction",
      "page",
      "noticeAuthor",
      "noticeTitle",
      "court",
      "designation",
      "identifier",
      "reportCitation",
      "documentType",
    ],
    formatTemplate:
      "IssuingBody, Title (Number, FullDate) Pinpoint. | Gazette (3.9.1): NoticeAuthor, 'NoticeTitle' in Jurisdiction, GazetteType, No Number, FullDate, Page, Pinpoint. | Unnumbered material (3.9.3): IssuingBody, Title (at AtDate) Pinpoint. | Practice direction (3.9.4): Court, Designation No Identifier: Title, FullDate, Pinpoint.",
  },

  // ── Part III — Secondary Sources: Journals ────────────────────────────────
  {
    type: "journal.article",
    ruleNumber: "5",
    label: "Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "year", "journal", "startingPage"],
    optionalFields: ["volume", "issue", "yearOrganised", "partNumber", "pinpoint"],
    formatTemplate:
      "Author, 'Title' (Year) Volume(Issue) Journal StartingPage, Pinpoint. | Year-organised (5.3): Author, 'Title' [Year] (Issue) Journal StartingPage, Pinpoint.",
  },
  {
    type: "journal.online",
    ruleNumber: "5.10",
    label: "Online Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "year", "journal"],
    optionalFields: [
      "volume",
      "issue",
      "yearOrganised",
      "articleNumber",
      "startingPage",
      "pinpoint",
      "url",
    ],
    // ArticleNumber (or another identifier) replaces the starting page.
    formatTemplate: "Author, 'Title' (Year) Volume(Issue) Journal ArticleNumber, Pinpoint <URL>.",
  },
  {
    type: "journal.forthcoming",
    ruleNumber: "5.11",
    label: "Forthcoming Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "journal"],
    optionalFields: ["year", "volume", "issue", "yearOrganised", "advance"],
    formatTemplate:
      "Author, 'Title' (Year) Volume(Issue) Journal (forthcoming). | Advance version: Author, 'Title' (Year) Volume(Issue) Journal (advance).",
  },

  // ── Part III — Secondary Sources: Books ───────────────────────────────────
  {
    type: "book",
    ruleNumber: "6",
    label: "Book",
    category: "secondary",
    requiredFields: ["authors", "title", "publisher", "year"],
    optionalFields: [
      "edition",
      "revised",
      "editors",
      "volume",
      "volumeLabel",
      "forthcoming",
      "pinpoint",
    ],
    formatTemplate:
      "Author, Title (Publisher, Edition ed, Year) Pinpoint. | Author and editor (6.6.2): Author, Title, ed Editor (Publisher, Year) Pinpoint. | Multi-volume (6.5): Author, Title (Publisher, Year) vol Volume, Pinpoint. | Forthcoming (6.8): Author, Title (Publisher, forthcoming).",
  },
  {
    type: "book.chapter",
    ruleNumber: "6.6.1",
    label: "Book Chapter",
    category: "secondary",
    requiredFields: [
      "chapterAuthors",
      "chapterTitle",
      "editors",
      "bookTitle",
      "publisher",
      "year",
      "startingPage",
    ],
    optionalFields: ["pinpoint"],
    formatTemplate:
      "Author, 'ChapterTitle' in Editor (ed), BookTitle (Publisher, Year) StartingPage, Pinpoint.",
  },
  {
    type: "book.translated",
    ruleNumber: "6.7",
    label: "Translated Book",
    category: "secondary",
    requiredFields: ["authors", "title", "translator", "publisher", "year"],
    optionalFields: ["edition", "revised", "editors", "originalTitle", "originalYear", "pinpoint"],
    formatTemplate:
      "Author, Title, tr Translator (Publisher, Edition ed, Year) Pinpoint [trans of: OriginalTitle (first published OriginalYear)].",
  },
  {
    type: "book.audiobook",
    ruleNumber: "6.9",
    label: "Audiobook",
    category: "secondary",
    requiredFields: ["authors", "title", "publisher", "year"],
    optionalFields: ["edition", "pinpoint"],
    // Time-based pinpoints (eg 11:15:05) per rules 1.11.3–1.11.4.
    formatTemplate: "Author, Title (Audiobook, Publisher, Year) Pinpoint.",
  },
  {
    type: "book.ebook",
    ruleNumber: "n/a (Obiter extension)",
    label:
      "Ebook (Obiter extension — AGLC4 has no ebook rule; renders as a rule 6.1–6.5 book, DECISION-019)",
    category: "secondary",
    requiredFields: ["authors", "title", "publisher", "year"],
    optionalFields: ["edition", "pinpoint", "url"],
    formatTemplate: "Author, Title (Publisher, Edition ed, Year) Pinpoint <URL>.",
  },

  // ── Part III — Secondary Sources: Reports ─────────────────────────────────
  {
    type: "report",
    ruleNumber: "7.1.1",
    label: "Report",
    category: "secondary",
    requiredFields: ["title", "date"],
    optionalFields: [
      "authors",
      "body",
      "bodyJurisdiction",
      "bodySubdivision",
      "reportType",
      "reportNumber",
      "year",
      "pinpoint",
    ],
    formatTemplate: "Author, Title (ReportType No ReportNumber, FullDate) Pinpoint.",
  },
  {
    type: "report.parliamentary",
    ruleNumber: "7.1.2",
    label: "Parliamentary Committee Report",
    category: "secondary",
    requiredFields: ["committee", "legislature", "title", "date"],
    optionalFields: ["documentType", "number", "year", "pinpoint"],
    formatTemplate: "Committee, Legislature, Title (DocumentType No Number, FullDate) Pinpoint.",
  },
  {
    type: "report.royal_commission",
    ruleNumber: "7.1.3",
    label: "Royal Commission Report",
    category: "secondary",
    // Authorless: the italic title IS the commission name.
    requiredFields: ["title", "date"],
    optionalFields: ["commissionName", "documentType", "year", "volume", "pinpoint"],
    formatTemplate: "Title (DocumentType, FullDate) vol Volume, Pinpoint.",
  },
  {
    type: "report.law_reform",
    ruleNumber: "7.1.4",
    label: "Law Reform Commission Report",
    category: "secondary",
    requiredFields: ["commissionName", "title", "date"],
    optionalFields: ["documentType", "number", "year"],
    formatTemplate: "CommissionName, Title (DocumentType No Number, FullDate).",
  },
  {
    type: "report.abs",
    ruleNumber: "7.1.5",
    label: "ABS Publication",
    category: "secondary",
    requiredFields: ["title", "catalogueNumber", "date"],
    optionalFields: ["year"],
    formatTemplate:
      "Australian Bureau of Statistics, Title (Catalogue No CatalogueNumber, FullDate).",
  },
  {
    type: "report.waitangi_tribunal",
    ruleNumber: "n/a (NZLSG — non-AGLC4)",
    label: "Waitangi Tribunal Report (NZLSG)",
    category: "secondary",
    requiredFields: ["title", "date"],
    optionalFields: ["body", "reportType", "reportNumber", "year", "pinpoint"],
    formatTemplate: "Waitangi Tribunal, Title (ReportType No ReportNumber, FullDate) Pinpoint.",
  },

  // ── Part III — Secondary Sources: Other ───────────────────────────────────
  {
    type: "research_paper",
    ruleNumber: "7.2.1",
    label: "Research Paper",
    category: "secondary",
    requiredFields: ["authors", "title", "institution", "date"],
    optionalFields: ["documentType", "number", "year", "pinpoint", "url"],
    formatTemplate: "Author, 'Title' (DocumentType No Number, Institution, FullDate) Pinpoint.",
  },
  {
    type: "research_paper.parliamentary",
    ruleNumber: "7.2.3",
    label: "Parliamentary Research Paper",
    category: "secondary",
    requiredFields: ["title", "date"],
    optionalFields: ["authors", "body", "legislature", "documentType", "number", "year"],
    formatTemplate: "Author, 'Title' (DocumentType No Number, Body, Legislature, FullDate).",
  },
  {
    type: "conference_paper",
    ruleNumber: "7.2.4",
    label: "Conference Paper",
    category: "secondary",
    requiredFields: ["authors", "title", "conferenceName", "date"],
    optionalFields: ["documentType", "year"],
    formatTemplate: "Author, 'Title' (Conference Paper, ConferenceName, FullDate).",
  },
  {
    type: "thesis",
    ruleNumber: "7.2.5",
    label: "Thesis",
    category: "secondary",
    requiredFields: ["authors", "title", "thesisType", "university", "year"],
    optionalFields: ["date"],
    // Thesis titles take single quotation marks in roman type (7.2.1).
    formatTemplate: "Author, 'Title' (ThesisType, University, Year).",
  },
  {
    type: "speech",
    ruleNumber: "7.3",
    label: "Speech",
    category: "secondary",
    requiredFields: ["speaker", "title", "event", "date"],
    optionalFields: ["speechType"],
    formatTemplate: "Speaker, 'Title' (Speech, Event, FullDate).",
  },
  {
    type: "press_release",
    ruleNumber: "7.4",
    label: "Press Release",
    category: "secondary",
    requiredFields: ["authors", "title", "date"],
    optionalFields: ["body", "releaseType", "documentNumber", "issuingBody", "pinpoint"],
    formatTemplate: "Author, 'Title' (ReleaseType DocumentNumber, IssuingBody, FullDate) Pinpoint.",
  },
  {
    type: "hansard",
    ruleNumber: "7.5.1",
    label: "Hansard",
    category: "secondary",
    requiredFields: ["jurisdiction", "chamber", "date", "page"],
    optionalFields: ["speaker"],
    // The page is the pinpoint; nothing follows the speaker parenthetical.
    formatTemplate: "Jurisdiction, Parliamentary Debates, Chamber, FullDate, Page (Speaker).",
  },
  {
    type: "submission.government",
    ruleNumber: "7.5.2",
    label: "Submission to a Government Inquiry",
    category: "secondary",
    requiredFields: ["authors", "committee", "date"],
    optionalFields: ["body", "documentType", "number", "inquiry", "pinpoint"],
    formatTemplate: "Author, Submission No Number to Committee, Inquiry (FullDate) Pinpoint.",
  },
  {
    type: "evidence.parliamentary",
    ruleNumber: "7.5.3",
    label: "Parliamentary Evidence",
    category: "secondary",
    requiredFields: ["committee", "parliament", "location", "date"],
    optionalFields: ["title", "page", "witness"],
    formatTemplate: "Evidence to Committee, Parliament, Location, FullDate, Page (Witness).",
  },
  {
    type: "constitutional_convention",
    ruleNumber: "7.5.4",
    label: "Constitutional Convention Debates",
    category: "secondary",
    requiredFields: ["conventionName", "location", "date"],
    optionalFields: ["page", "speaker"],
    formatTemplate: "ConventionName, Location, FullDate, Page (Speaker).",
  },
  {
    type: "dictionary",
    ruleNumber: "7.6",
    label: "Dictionary",
    category: "secondary",
    requiredFields: ["title", "entry"],
    optionalFields: ["edition", "year", "retrievedDate", "entryType", "definitionNumber"],
    formatTemplate:
      "Title (Edition ed, Year) 'Entry' (def DefinitionNumber). | Online: Title (online at RetrievedDate) 'Entry' (def DefinitionNumber).",
  },
  {
    type: "legal_encyclopedia",
    ruleNumber: "7.7",
    label: "Legal Encyclopedia",
    category: "secondary",
    requiredFields: ["publisher", "title", "volume", "date"],
    optionalFields: ["retrievedDate", "titleNumber", "titleName", "topic", "paragraph"],
    formatTemplate:
      "Publisher, Title, vol Volume (at FullDate) TitleNumber TitleName, 'Topic' [Paragraph]. | Online: Publisher, Title (online at RetrievedDate) TitleNumber TitleName, 'Topic' [Paragraph].",
  },
  {
    type: "looseleaf",
    ruleNumber: "7.8",
    label: "Looseleaf Service",
    category: "secondary",
    requiredFields: ["publisher", "title", "date"],
    optionalFields: ["authors", "retrievedDate", "volume", "paragraph"],
    formatTemplate:
      "Author, Publisher, Title, vol Volume (at ServiceNumberOrFullDate) [Paragraph]. | Online: Author, Publisher, Title (online at RetrievedDate) [Paragraph].",
  },
  {
    type: "ip_material",
    ruleNumber: "7.9",
    label: "Intellectual Property Material",
    category: "secondary",
    requiredFields: ["ipType", "number", "filingDate"],
    optionalFields: ["jurisdictionCode", "numberQualifier", "filedTerm", "status", "statusDate"],
    // Italicised through the identification number.
    formatTemplate:
      "JurisdictionCode IpType NumberQualifier No Number, filed on FilingDate (Status on StatusDate).",
  },
  {
    type: "constitutive_document",
    ruleNumber: "7.10",
    label: "Constitutive Document of a Corporation",
    category: "secondary",
    requiredFields: ["documentType", "companyName", "date"],
    optionalFields: ["pinpoint"],
    formatTemplate: "DocumentType, CompanyName (at FullDate) Pinpoint.",
  },
  {
    type: "periodical",
    ruleNumber: "7.11.3",
    label: "Periodical (No Volume/Issue Number)",
    category: "secondary",
    requiredFields: ["title", "periodicalName", "datePeriod"],
    optionalFields: ["author", "page", "pinpoint"],
    // Periodicals WITH volume/issue numbers are cited as journal.article.
    formatTemplate: "Author, 'Title' (DatePeriod) PeriodicalName Page, Pinpoint.",
  },
  {
    type: "newspaper",
    ruleNumber: "7.11",
    label: "Newspaper Article",
    category: "secondary",
    requiredFields: ["title", "newspaper", "date"],
    optionalFields: [
      "authors",
      "place",
      "page",
      "isElectronic",
      "url",
      "isEditorial",
      "titleIsDescription",
    ],
    formatTemplate:
      "Author, 'Title', Newspaper (Place, FullDate) Page. | Electronic (7.11.2): Author, 'Title', Newspaper (online, FullDate) <URL>. | Editorial (7.11.4): Editorial, 'Title', Newspaper (Place, FullDate) Page.",
  },
  {
    type: "correspondence",
    ruleNumber: "7.12",
    label: "Written Correspondence",
    category: "secondary",
    requiredFields: ["sender", "recipient", "date"],
    optionalFields: ["type"],
    formatTemplate: "Type from Sender to Recipient, FullDate.",
  },
  {
    type: "interview",
    ruleNumber: "7.13",
    label: "Interview",
    category: "secondary",
    requiredFields: ["interviewee", "interviewer", "date"],
    optionalFields: ["location"],
    formatTemplate: "Interview with Interviewee (Interviewer, Location, FullDate).",
  },
  {
    type: "film_tv_media",
    ruleNumber: "7.14",
    label: "Film, Television, or Other Media",
    category: "secondary",
    requiredFields: ["title", "year"],
    optionalFields: [
      "medium",
      "episodeTitle",
      "seriesTitle",
      "seasonNumber",
      "episodeNumber",
      "versionDetails",
      "productionCompany",
      "director",
      "network",
      "producer",
      "date",
      "timePinpoint",
      "url",
    ],
    formatTemplate:
      "Film (7.14.2): Title (VersionDetails, ProductionCompany, Year) TimePinpoint. | TV (7.14.3): 'EpisodeTitle', SeriesTitle (VersionDetails, Network, Year) TimePinpoint. | Podcast/Radio (7.14.4): 'EpisodeTitle', SeriesTitle (Producer, FullDate) TimePinpoint <URL>.",
  },
  {
    type: "internet_material",
    ruleNumber: "7.15",
    label: "Internet Material",
    category: "secondary",
    requiredFields: ["title", "websiteName", "url"],
    // A5-EXP-4: archiveService/archivedUrl/archiveDate are experimental fields
    // (AGLC4 has no archive form). internet_material itself stays AGLC4; only
    // the archive fields carry the experimental note in the form.
    optionalFields: [
      "authors",
      "documentType",
      "date",
      "archiveService",
      "archivedUrl",
      "archiveDate",
    ],
    formatTemplate:
      "Author, 'Title', WebsiteName (DocumentType, FullDate) <URL> (archived at ArchiveService ArchiveDate).",
  },
  {
    type: "social_media",
    ruleNumber: "7.16",
    label: "Social Media Post",
    category: "secondary",
    requiredFields: ["author", "platform", "date"],
    optionalFields: ["title", "time", "timePinpoint", "url"],
    formatTemplate: "Author, 'Title' (Platform, FullDate, Time) TimePinpoint <URL>.",
  },
  {
    type: "genai_output",
    ruleNumber: "Obiter experimental (pending AGLC5)",
    label: "Generative AI Output",
    category: "secondary",
    requiredFields: ["platform", "model", "outputDate"],
    // A5-EXP-1: modelVersion renders with the model; archivedUrl appends an
    // "(archived at …)" note; transcriptCustody + prompt are stored for the
    // record but are not part of the correspondence line.
    optionalFields: ["prompt", "url", "modelVersion", "transcriptCustody", "archivedUrl"],
    // Treated as written correspondence (rule 7.12) per MULR interim
    // guidance; AGLC4 itself contains no generative-AI rule.
    formatTemplate:
      "Correspondence from Platform (Model Version) to the author, OutputDate <URL> (archived at ArchivedUrl).",
    provenance: "experimental_pending_aglc5",
    provenanceNote: "MULR interim guidance by analogy to rule 7.12; OSCOLA 5 r 3.7.13 precedent",
  },
  {
    // A5-EXP-2: dataset — experimental, no AGLC4 rule. Basis: APA §10.10 /
    // Chicago 18 / AMS precedent (docs/modern-sources-proposal.md §3.1).
    type: "dataset",
    ruleNumber: "Obiter experimental (pending AGLC5)",
    label: "Dataset",
    category: "secondary",
    requiredFields: ["creator", "title", "repository", "year"],
    optionalFields: ["version", "doi", "persistentId", "accessDate"],
    formatTemplate:
      "Creator, *Title* (Dataset, Version, Repository, Year) <doi/persistentId>. | No DOI: … (accessed AccessDate).",
    provenance: "experimental_pending_aglc5",
    provenanceNote:
      "No AGLC4 form; dataset element set by analogy to APA §10.10 / Chicago 18 / AMS precedent",
  },
  {
    // A5-EXP-3: software / code — experimental, no AGLC4 rule. Basis:
    // docs/modern-sources-proposal.md §3.2 (CRIT-002 P2).
    type: "software",
    ruleNumber: "Obiter experimental (pending AGLC5)",
    label: "Software / Code",
    category: "secondary",
    requiredFields: ["author", "title", "year"],
    optionalFields: ["versionOrCommit", "designation", "host", "url"],
    formatTemplate: "Author, *Title* (Designation, VersionOrCommit, Host, Year) <URL>.",
    provenance: "experimental_pending_aglc5",
    provenanceNote:
      "No AGLC4 form; software/code element set proposed for AGLC5 (docs/modern-sources-proposal.md §3.2)",
  },

  // ── Part IV — International Materials ─────────────────────────────────────
  {
    type: "treaty",
    ruleNumber: "8",
    label: "Treaty",
    category: "international",
    requiredFields: ["title", "treatySeries"],
    optionalFields: [
      "parties",
      "openedDate",
      "signedDate",
      "seriesVolume",
      "startingPage",
      "entryIntoForceDate",
      "notYetInForce",
      "pinpoint",
    ],
    formatTemplate:
      "Title, Parties, opened for signature OpenedDate, SeriesVolume TreatySeries StartingPage (entered into force EntryIntoForceDate) Pinpoint. | Same dates (8.3.2): … (signed and entered into force SignedDate) Pinpoint. | Not yet in force (8.3.3): … (not yet in force) Pinpoint.",
  },
  {
    type: "treaty.mou",
    ruleNumber: "8.6",
    label: "Memorandum of Understanding",
    category: "international",
    requiredFields: ["title"],
    optionalFields: ["parties", "signedDate", "treatySeries", "pinpoint", "url"],
    formatTemplate:
      "Title, Parties, signed SignedDate, TreatySeries (Memorandum of Understanding) Pinpoint <URL>.",
  },
  {
    type: "un.charter",
    ruleNumber: "9.1",
    label: "Charter of the United Nations",
    category: "international",
    requiredFields: [],
    optionalFields: ["article", "pinpoint"],
    formatTemplate: "Charter of the United Nations art Article. (fixed italic title, rule 9.1)",
  },
  {
    type: "un.document",
    ruleNumber: "9.2",
    label: "United Nations Document",
    category: "international",
    requiredFields: ["documentNumber", "date"],
    optionalFields: [
      "author",
      "title",
      "resolutionNumber",
      "officialRecords",
      "session",
      "meetingNumber",
      "agendaItem",
      "supplement",
      "annex",
      "year",
      "pinpoint",
      "isCharter",
      "article",
    ],
    formatTemplate:
      "Author, Title, Res ResolutionNumber, OfficialRecords, Session, MeetingNumber, Agenda Item AgendaItem, Supp No Supplement, UN Doc DocumentNumber (FullDate) annex Annex Pinpoint. | UN Charter (9.1): Charter of the United Nations art Article.",
  },
  {
    type: "un.communication",
    ruleNumber: "9.3",
    label: "United Nations Communication",
    category: "international",
    requiredFields: ["committee", "communicationNumber", "documentNumber"],
    optionalFields: [
      "author",
      "decisionType",
      "session",
      "date",
      "pinpoint",
      "submissionType",
      "documentTitle",
      "caseName",
    ],
    formatTemplate:
      "Committee, DecisionType: Communication No CommunicationNumber, Session, UN Doc DocumentNumber (FullDate) Pinpoint. | Party submission (9.3.2): Author, 'DocumentTitle', SubmissionType to Committee in CaseName, FullDate, Pinpoint.",
  },
  {
    type: "un.yearbook",
    ruleNumber: "9.4",
    label: "United Nations Yearbook",
    category: "international",
    requiredFields: ["title", "yearbook", "year"],
    optionalFields: ["yearType", "volume", "startingPage", "pinpoint"],
    formatTemplate:
      "'Title' [Year] Yearbook StartingPage, Pinpoint. | Volume-organised: 'Title' (Year) Volume Yearbook StartingPage, Pinpoint.",
  },
  {
    type: "icj.decision",
    ruleNumber: "10.2",
    label: "ICJ Decision",
    category: "international",
    requiredFields: ["caseName", "year"],
    optionalFields: [
      "parties",
      "phase",
      "reportSeries",
      "seriesLetter",
      "page",
      "caseNumber",
      "pinpoint",
      "judge",
      "generalListNumber",
      "date",
    ],
    formatTemplate:
      "CaseName (Parties) (Phase) [Year] ICJ Rep Page, Pinpoint. | PCIJ (10.2.5): CaseName [Year] PCIJ (ser SeriesLetter) No CaseNumber, Pinpoint. | Unreported (10.4.1): CaseName (Parties) (Phase) (International Court of Justice, General List No GeneralListNumber, FullDate) Pinpoint.",
  },
  {
    type: "icj.pleading",
    ruleNumber: "10.3",
    label: "ICJ Pleading",
    category: "international",
    requiredFields: ["documentTitle", "caseName", "year"],
    optionalFields: [
      "parties",
      "phase",
      "volume",
      "page",
      "pinpoint",
      "speaker",
      "generalListNumber",
      "date",
    ],
    formatTemplate:
      "'DocumentTitle', CaseName (Parties) [Year] Volume ICJ Pleadings Page, Pinpoint (Speaker). | Unreported (10.4.2): 'DocumentTitle', CaseName (Parties) (International Court of Justice, General List No GeneralListNumber, FullDate) Pinpoint.",
  },
  {
    type: "arbitral.state_state",
    ruleNumber: "11.1",
    label: "State–State Arbitration",
    category: "international",
    requiredFields: ["caseName"],
    optionalFields: [
      "parties",
      "phase",
      "year",
      "volume",
      "reportSeries",
      "startingPage",
      "tribunal",
      "caseNumber",
      "date",
      "pinpoint",
      "judge",
      "awardDetails",
    ],
    formatTemplate:
      "Reported (11.1.1): CaseName (Parties) (Phase) (Year) Volume ReportSeries StartingPage, Pinpoint. | Unreported (11.1.2): Parties (AwardDetails) (Tribunal, Case No CaseNumber, FullDate) Pinpoint.",
  },
  {
    type: "arbitral.individual_state",
    ruleNumber: "11.2",
    label: "Individual–State Arbitration",
    category: "international",
    requiredFields: ["parties"],
    optionalFields: [
      "phase",
      "year",
      "volume",
      "reportSeries",
      "startingPage",
      "tribunal",
      "caseNumber",
      "date",
      "pinpoint",
      "judge",
    ],
    formatTemplate:
      "Reported (11.2.1): Parties (Phase) (Year) Volume ReportSeries StartingPage, Pinpoint. | Unreported (11.2.2): Parties (Phase) (Tribunal, Case No CaseNumber, FullDate) Pinpoint.",
  },
  {
    type: "icc_tribunal.case",
    ruleNumber: "12.2",
    label: "International Criminal Tribunal Case",
    category: "international",
    requiredFields: ["caseName"],
    optionalFields: [
      "phase",
      "court",
      "chamber",
      "caseNumber",
      "date",
      "pinpoint",
      "judge",
      "reportSeries",
      "year",
      "volume",
      "startingPage",
    ],
    formatTemplate:
      "Prosecutor v Accused (Phase) (Court, Chamber, Case No CaseNumber, FullDate) Pinpoint. | Reported (12.3): Prosecutor v Accused (Phase) (Year) Volume ReportSeries StartingPage, Pinpoint (Court, Chamber).",
  },
  {
    type: "wto.document",
    ruleNumber: "13.1.2",
    label: "WTO Document",
    category: "international",
    requiredFields: ["title", "documentNumber", "date"],
    optionalFields: ["documentDescription", "pinpoint"],
    formatTemplate: "Title, WTO Doc DocumentNumber (FullDate) (DocumentDescription) Pinpoint.",
  },
  {
    type: "wto.decision",
    ruleNumber: "13.1.3",
    label: "WTO Panel/Appellate Body Decision",
    category: "international",
    requiredFields: ["documentDescription", "title", "documentNumber", "date"],
    optionalFields: ["dsrReference", "pinpoint"],
    formatTemplate:
      "DocumentDescription, Title, WTO Doc DocumentNumber (FullDate) DsrReference, Pinpoint.",
  },
  {
    type: "gatt.document",
    ruleNumber: "13.2",
    label: "GATT Document",
    category: "international",
    requiredFields: ["title", "date"],
    optionalFields: ["documentNumber", "documentDescription", "bisdReference", "pinpoint"],
    formatTemplate:
      "Title, GATT Doc DocumentNumber (FullDate) (DocumentDescription) BisdReference, Pinpoint. | Panel report (13.2.2): GATT Panel Report, Title, GATT Doc DocumentNumber (FullDate) BisdReference, Pinpoint.",
  },
  {
    type: "eu.official_journal",
    ruleNumber: "14.2.1",
    label: "EU Official Journal",
    category: "international",
    requiredFields: ["title", "year", "ojSeries", "page"],
    optionalFields: ["pinpoint"],
    // `page` holds the issue-number/starting-page pair (eg 'L 269/1').
    formatTemplate: "Title [Year] OJ OjSeries Page, Pinpoint.",
  },
  {
    type: "eu.court",
    ruleNumber: "14.2.3",
    label: "EU Court (CJEU) Decision",
    category: "international",
    requiredFields: ["caseName", "caseNumber"],
    optionalFields: ["year", "reportSeries", "page", "court", "ecli", "date", "pinpoint"],
    formatTemplate:
      "Reported: CaseName (CaseNumber) [Year] ReportSeries Page. | Unreported: CaseName (Court, CaseNumber, ECLI, FullDate) Pinpoint.",
  },
  {
    type: "echr.decision",
    ruleNumber: "14.3",
    label: "European Court of Human Rights Decision",
    category: "international",
    requiredFields: ["caseName"],
    optionalFields: [
      "year",
      "volume",
      "reportSeries",
      "startingPage",
      "applicationNumber",
      "chamber",
      "date",
      "pinpoint",
      "judge",
    ],
    formatTemplate:
      "Reported to end 1995 (14.3.2): CaseName (Year) Volume Eur Court HR (ser A) Pinpoint. | Reported from 1996: CaseName [Year] Volume Eur Court HR StartingPage, Pinpoint. | Unreported (14.3.1): CaseName (European Court of Human Rights, Chamber, Application No ApplicationNumber, FullDate) Pinpoint.",
  },
  {
    type: "supranational.decision",
    ruleNumber: "14.4",
    label: "Supranational Court Decision",
    category: "international",
    requiredFields: ["caseName", "court", "date"],
    optionalFields: ["caseNumber", "pinpoint"],
    formatTemplate: "CaseName (Court, CaseNumber, FullDate) Pinpoint.",
  },
  {
    type: "supranational.document",
    ruleNumber: "14.5",
    label: "Supranational Document",
    category: "international",
    requiredFields: ["body", "documentNumber", "date"],
    optionalFields: ["title", "session", "pinpoint"],
    // All elements comma-separated; the date is NOT parenthesised.
    formatTemplate: "Body, Title, Doc No DocumentNumber, Session, FullDate, Pinpoint.",
  },

  // ── Part V — Foreign Domestic Sources ─────────────────────────────────────
  //
  // All foreign.* types dispatch on the `foreignSubType` field ("case" |
  // "legislation" | "secondary"). Structured data routes to the per-country
  // formatters in src/engine/rules/v4/foreign/*; unstructured data (free-text
  // `citationDetails` that does not parse) falls back to a generic rendering
  // (italic title, citation details verbatim, court parenthetical, pinpoint).
  {
    type: "foreign.canada",
    ruleNumber: "15",
    label: "Canadian Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (15.1): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (15.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.china",
    ruleNumber: "16",
    label: "Chinese Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (16.2): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (16.3): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.france",
    ruleNumber: "17",
    label: "French Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (17.1): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (17.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.germany",
    ruleNumber: "18",
    label: "German Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (18.1): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (18.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.hong_kong",
    ruleNumber: "19",
    label: "Hong Kong Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (19.1): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (19.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.malaysia",
    ruleNumber: "20",
    label: "Malaysian Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (20.1): CaseName [Year] Volume ReportSeries StartingPage (Court). | Legislation (20.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.new_zealand",
    ruleNumber: "21",
    label: "New Zealand Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
    ],
    formatTemplate:
      "Case (21.1): CaseName [Year] Volume ReportSeries StartingPage, Pinpoint (Court). | Legislation (21.2): Title Year Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.singapore",
    ruleNumber: "22",
    label: "Singaporean Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
      "capNumber",
      "revisedEdition",
    ],
    formatTemplate:
      "Case (22.1): CaseName [Year] Volume ReportSeries StartingPage, Pinpoint (Court). | Legislation (22.2): Title (Singapore, cap CapNumber, RevisedEdition) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.south_africa",
    ruleNumber: "23",
    label: "South African Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
      "actNumber",
    ],
    formatTemplate:
      "Case (23.1): CaseName [Year] Volume ReportSeries StartingPage, Pinpoint (Court). | Legislation (23.2): Title Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.uk",
    ruleNumber: "24",
    label: "United Kingdom Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
      "ewhcDivision",
      "siNumber",
      "regnalYear",
      "chapter",
    ],
    formatTemplate:
      "Case (24.1): CaseName [Year] Volume ReportSeries StartingPage, Pinpoint (Court). | Legislation (24.2): Title Year (Jurisdiction) Pinpoint. | Statutory instrument (24.3): Title Year (Jurisdiction) SI Year/SiNumber, Pinpoint. | Unstructured data renders generically.",
  },
  {
    type: "foreign.usa",
    ruleNumber: "25",
    label: "United States Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "jurisdiction",
      "pinpoint",
      "uscTitle",
      "uscSection",
      "supplement",
    ],
    formatTemplate:
      "Case (25.1): CaseName, Volume Reporter StartingPage, Pinpoint (Court, Year). | Code (25.2): Title, UscTitle USC § UscSection (Supplement). | Unstructured data renders generically.",
  },
  {
    type: "foreign.other",
    ruleNumber: "26",
    label: "Other Foreign Source",
    category: "foreign",
    requiredFields: ["title", "jurisdiction"],
    optionalFields: [
      "foreignSubType",
      "year",
      "yearType",
      "volume",
      "reportSeries",
      "startingPage",
      "citationDetails",
      "court",
      "courtId",
      "pinpoint",
      "translatedCaseName",
      "translatedTitle",
    ],
    formatTemplate:
      "Case (26.2): CaseName [TranslatedCaseName] [Year] Volume ReportSeries StartingPage, Pinpoint (Court). | Legislation (26.3): Title [TranslatedTitle] Year (Jurisdiction) Pinpoint. | Unstructured data renders generically.",
  },

  // ── Custom / Manual ────────────────────────────────────────────────────────
  {
    type: "custom",
    ruleNumber: "n/a (Obiter extension)",
    label: "Custom Citation (Free Text)",
    category: "special",
    requiredFields: ["customText"],
    optionalFields: [],
    formatTemplate: "CustomText (inserted verbatim, roman type).",
  },
  {
    type: "explanatory_note",
    ruleNumber: "n/a (Obiter extension)",
    label: "Explanatory Note (Free Text)",
    category: "special",
    requiredFields: ["noteText"],
    optionalFields: [],
    formatTemplate:
      "NoteText (inserted verbatim; excluded from ibid/short-reference handling and bibliographies).",
  },
];

// ─── Subsequent Reference Rules ─────────────────────────────────────────────

const IBID_CONDITIONS: string[] = [
  "Rule 1.4.3: 'Ibid' refers to the immediately preceding source in the immediately preceding footnote.",
  "The preceding footnote must contain exactly one citation for ibid to apply.",
  "If the preceding footnote had a pinpoint but the current reference has no pinpoint, ibid is not used.",
  "If pinpoints are identical (or both absent), the reference is simply 'Ibid'.",
  "If pinpoints differ, the reference is 'Ibid' followed by the new pinpoint (e.g., 'Ibid 42').",
  "Ibid may not be used across footnotes within the same footnote — use 'at' format instead (Rule 1.4.6).",
];

const SHORT_TITLE_RULES: string[] = [
  "Rule 1.4.1: After the first full citation, subsequent references use a shortened form with a cross-reference back to the first footnote number.",
  "Rule 1.4.1: Secondary sources use the format: 'Author Surname (n FirstFootnoteNumber) Pinpoint'.",
  "Rule 1.4.1: Cases use the format: 'Short Title (n FirstFootnoteNumber) Pinpoint' with the short title in italics.",
  "Rule 1.4.1: Legislation uses the format: 'Short Title (n FirstFootnoteNumber) Pinpoint' with the short title in italics.",
  "Rule 1.4.4: A short title is introduced in parentheses after the first full citation, e.g., ('short title').",
  "Rule 1.4.4: For cases, the short title introduction uses italic text inside single quotes within parentheses.",
  "Rule 1.4.4: For secondary sources, the short title introduction uses single quotes, not italic.",
  "Rule 1.4.5: Abbreviation definitions appear in parentheses after the first citation, e.g., ('ADJR Act').",
  "Rule 1.4.6: Within-footnote subsequent references use 'at' followed by the pinpoint, e.g., 'at [23]'.",
  "When multiple works by the same author are cited, the title or short title is included after the surname to disambiguate.",
];

// ─── Main Export Function ───────────────────────────────────────────────────

/**
 * Builds a comprehensive JSON object documenting all AGLC4 rules
 * implemented by Obiter, suitable for consumption by other tools.
 *
 * @returns A RuleReference object containing all source types, report series,
 *   court identifiers, pinpoint abbreviations, and subsequent reference rules.
 */
export function exportRuleReference(): RuleReference {
  return {
    version: "AGLC4",
    generatedAt: new Date().toISOString(),
    generatedBy: `Obiter v${APP_VERSION}`,

    sourceTypes: SOURCE_TYPE_METADATA,

    reportSeries: REPORT_SERIES.map((rs) => ({
      abbreviation: rs.abbreviation,
      fullName: rs.fullName,
      jurisdiction: rs.jurisdiction,
      type: rs.type,
      yearOrganised: rs.yearOrganised,
    })),

    courtIdentifiers: COURT_IDENTIFIERS.map((ci) => ({
      code: ci.code,
      fullName: ci.fullName,
      jurisdiction: ci.jurisdiction,
    })),

    pinpointAbbreviations: PINPOINT_ABBREVIATIONS.map((pa) => ({
      type: pa.type,
      singular: pa.singular,
      plural: pa.plural,
    })),

    subsequentReferenceRules: {
      ibidConditions: IBID_CONDITIONS,
      shortTitleRules: SHORT_TITLE_RULES,
    },
  };
}

// ─── A5-LABEL: Experimental-provenance helpers ──────────────────────────────

const METADATA_BY_TYPE = new Map(SOURCE_TYPE_METADATA.map((m) => [m.type, m]));

/**
 * A5-LABEL / DECISION-036: returns true when a source type goes beyond official
 * AGLC4 and is rendered on an interim, pending-AGLC5 basis. Data-driven: reads
 * the `provenance` flag on SOURCE_TYPE_METADATA (absent ⇒ official AGLC4), so no
 * per-type hardcoding is needed in the UI or the conformance count.
 *
 * @param sourceType - The source type key.
 * @returns True when the type is flagged `experimental_pending_aglc5`.
 */
export function isExperimentalSourceType(sourceType: string): boolean {
  return METADATA_BY_TYPE.get(sourceType)?.provenance === "experimental_pending_aglc5";
}

/**
 * A5-LABEL: returns the interim-basis note for an experimental source type
 * (the badge tooltip text), or undefined for official AGLC4 types.
 *
 * @param sourceType - The source type key.
 * @returns The provenance note, or undefined.
 */
export function getProvenanceNote(sourceType: string): string | undefined {
  const meta = METADATA_BY_TYPE.get(sourceType);
  if (meta?.provenance !== "experimental_pending_aglc5") return undefined;
  return meta.provenanceNote;
}

/**
 * A5-LABEL / A5-DOC-2: the set of source types that count towards Obiter's
 * AGLC4-conformance total. Experimental (pending-AGLC5) types are excluded so
 * they never inflate the conformance count or any "AGLC4 output" claim.
 *
 * @returns The AGLC4-conformance source-type set.
 */
export function getAglc4ConformanceSourceTypes(): Set<string> {
  return new Set(
    SOURCE_TYPE_METADATA.filter((m) => m.provenance !== "experimental_pending_aglc5").map(
      (m) => m.type
    )
  );
}
