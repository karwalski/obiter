/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Rule Exporter (RESEARCH-005)
 *
 * Exports Obiter's AGLC4 rule implementations as a machine-readable JSON
 * reference for other tool authors. Aggregates source type metadata, report
 * series, court identifiers, pinpoint abbreviations, citation format
 * templates, and subsequent reference rules into a single structured object.
 */

import { REPORT_SERIES } from "./data/report-series";
import { COURT_IDENTIFIERS } from "./data/court-identifiers";
import { PINPOINT_ABBREVIATIONS } from "./data/pinpoint-abbrevs";

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
}

/**
 * Comprehensive metadata for every SourceType value in the citation model.
 * Each entry documents the AGLC4 rule number, required/optional fields,
 * and the citation format template showing field order and formatting.
 */
const SOURCE_TYPE_METADATA: SourceTypeMeta[] = [
  // Part II — Domestic Sources: Cases
  {
    type: "case.reported",
    ruleNumber: "2.2",
    label: "Reported Case",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "year", "reportSeries", "startingPage"],
    optionalFields: ["yearType", "volume", "pinpoint", "courtId", "parallelCitations", "separator"],
    formatTemplate: "Party1 v Party2 (Year) Volume ReportSeries StartingPage, Pinpoint.",
  },
  {
    type: "case.unreported.mnc",
    ruleNumber: "2.3.1",
    label: "Unreported Case (Medium Neutral Citation)",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "year", "court", "caseNumber"],
    optionalFields: ["pinpoint", "separator"],
    formatTemplate: "Party1 v Party2 [Year] Court CaseNumber, Pinpoint.",
  },
  {
    type: "case.unreported.no_mnc",
    ruleNumber: "2.3.2",
    label: "Unreported Case (No Medium Neutral Citation)",
    category: "domestic.case",
    requiredFields: ["party1", "party2", "court", "fullDate"],
    optionalFields: ["pinpoint", "separator", "judgeName"],
    formatTemplate: "Party1 v Party2 (Court, Judge, FullDate) Pinpoint.",
  },
  {
    type: "case.proceeding",
    ruleNumber: "2.3.3",
    label: "Proceeding",
    category: "domestic.case",
    requiredFields: ["party1", "court", "proceedingNumber", "year"],
    optionalFields: ["party2", "initiatingProcess", "separator"],
    formatTemplate: "Party1 v Party2 (Court, ProceedingNumber, initiated FullDate).",
  },
  {
    type: "case.court_order",
    ruleNumber: "2.3.4",
    label: "Court Order",
    category: "domestic.case",
    requiredFields: ["party1", "court", "orderDate"],
    optionalFields: ["party2", "orderType", "judge", "separator"],
    formatTemplate: "Party1 v Party2 (Court, Judge, OrderDate) (OrderType).",
  },
  {
    type: "case.quasi_judicial",
    ruleNumber: "2.6",
    label: "Quasi-Judicial Decision",
    category: "domestic.case",
    requiredFields: ["title", "year", "tribunal"],
    optionalFields: ["decisionNumber", "pinpoint", "fullDate"],
    formatTemplate: "Title (Year) Tribunal DecisionNumber, Pinpoint.",
  },
  {
    type: "case.arbitration",
    ruleNumber: "2.6.2",
    label: "Arbitration",
    category: "domestic.case",
    requiredFields: ["title", "year"],
    optionalFields: ["arbitrator", "awardDate", "pinpoint"],
    formatTemplate: "Title (Arbitrator, AwardDate) Pinpoint.",
  },
  {
    type: "case.transcript",
    ruleNumber: "2.7",
    label: "Transcript of Proceedings",
    category: "domestic.case",
    requiredFields: ["party1", "court", "fullDate"],
    optionalFields: ["party2", "caseNumber", "pinpoint", "separator"],
    formatTemplate: "Transcript of Proceedings, Party1 v Party2 (Court, CaseNumber, FullDate) Pinpoint.",
  },
  {
    type: "case.submission",
    ruleNumber: "2.8",
    label: "Submission in a Case",
    category: "domestic.case",
    requiredFields: ["documentTitle", "party1", "court"],
    optionalFields: ["party2", "caseNumber", "fullDate", "separator"],
    formatTemplate: "DocumentTitle, Party1 v Party2 (Court, CaseNumber, FullDate).",
  },

  // Part II — Domestic Sources: Legislation
  {
    type: "legislation.statute",
    ruleNumber: "3.1",
    label: "Statute",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction"],
    optionalFields: ["number", "pinpoint"],
    formatTemplate: "Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.bill",
    ruleNumber: "3.2",
    label: "Bill",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction", "chamber"],
    optionalFields: ["number", "pinpoint"],
    formatTemplate: "Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.delegated",
    ruleNumber: "3.4",
    label: "Delegated Legislation",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction"],
    optionalFields: ["number", "pinpoint", "enablingAct"],
    formatTemplate: "Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.constitution",
    ruleNumber: "3.6",
    label: "Constitution",
    category: "domestic.legislation",
    requiredFields: ["title"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Title Pinpoint.",
  },
  {
    type: "legislation.explanatory",
    ruleNumber: "3.7",
    label: "Explanatory Memorandum",
    category: "domestic.legislation",
    requiredFields: ["title", "year", "jurisdiction", "chamber"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Explanatory Memorandum, Title Year (Jurisdiction) Pinpoint.",
  },
  {
    type: "legislation.quasi",
    ruleNumber: "3.9",
    label: "Quasi-Legislative Material",
    category: "domestic.legislation",
    requiredFields: ["title", "issuingBody"],
    optionalFields: ["year", "documentNumber", "pinpoint"],
    formatTemplate: "IssuingBody, Title (DocumentNumber, Year) Pinpoint.",
  },

  // Part III — Secondary Sources
  {
    type: "journal.article",
    ruleNumber: "5",
    label: "Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "year", "journal", "startingPage"],
    optionalFields: ["volume", "issue", "pinpoint"],
    formatTemplate: "Author, 'Title' (Year) Volume(Issue) Journal StartingPage, Pinpoint.",
  },
  {
    type: "journal.online",
    ruleNumber: "5.10",
    label: "Online Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "year", "journal"],
    optionalFields: ["volume", "issue", "pinpoint", "url", "doi"],
    formatTemplate: "Author, 'Title' (Year) Volume(Issue) Journal (online) <URL>.",
  },
  {
    type: "journal.forthcoming",
    ruleNumber: "5.11",
    label: "Forthcoming Journal Article",
    category: "secondary",
    requiredFields: ["authors", "title", "journal"],
    optionalFields: ["year", "volume", "issue"],
    formatTemplate: "Author, 'Title' (forthcoming) Journal.",
  },
  {
    type: "book",
    ruleNumber: "6",
    label: "Book",
    category: "secondary",
    requiredFields: ["authors", "title", "publisher", "year"],
    optionalFields: ["edition", "pinpoint", "editors"],
    formatTemplate: "Author, Title (Publisher, Edition, Year) Pinpoint.",
  },
  {
    type: "book.chapter",
    ruleNumber: "6.6.1",
    label: "Book Chapter",
    category: "secondary",
    requiredFields: ["authors", "chapterTitle", "editors", "bookTitle", "publisher", "year", "startingPage"],
    optionalFields: ["edition", "pinpoint"],
    formatTemplate: "Author, 'ChapterTitle' in Editor (ed), BookTitle (Publisher, Edition, Year) StartingPage, Pinpoint.",
  },
  {
    type: "book.translated",
    ruleNumber: "6.7",
    label: "Translated Book",
    category: "secondary",
    requiredFields: ["authors", "title", "translator", "publisher", "year"],
    optionalFields: ["edition", "pinpoint", "originalYear"],
    formatTemplate: "Author, Title (tr Translator, Publisher, Edition, Year) Pinpoint.",
  },
  {
    type: "book.audiobook",
    ruleNumber: "6.9",
    label: "Audiobook",
    category: "secondary",
    requiredFields: ["authors", "title", "narrator", "publisher", "year"],
    optionalFields: ["edition", "pinpoint"],
    formatTemplate: "Author, Title (Publisher, Edition, Year) (audiobook, narrated by Narrator).",
  },
  {
    type: "report",
    ruleNumber: "7.1",
    label: "Report",
    category: "secondary",
    requiredFields: ["authors", "title", "year"],
    optionalFields: ["documentNumber", "pinpoint"],
    formatTemplate: "Author, Title (Report, Year) Pinpoint.",
  },
  {
    type: "report.parliamentary",
    ruleNumber: "7.1.2",
    label: "Parliamentary Committee Report",
    category: "secondary",
    requiredFields: ["committee", "title", "year"],
    optionalFields: ["chamber", "documentNumber", "pinpoint"],
    formatTemplate: "Committee, Title (Year) Pinpoint.",
  },
  {
    type: "report.royal_commission",
    ruleNumber: "7.1.3",
    label: "Royal Commission Report",
    category: "secondary",
    requiredFields: ["commissionName", "title", "year"],
    optionalFields: ["volume", "documentNumber", "pinpoint"],
    formatTemplate: "Royal Commission, Title (Year) Volume Pinpoint.",
  },
  {
    type: "report.law_reform",
    ruleNumber: "7.1.4",
    label: "Law Reform Commission Report",
    category: "secondary",
    requiredFields: ["body", "title", "reportNumber", "year"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Body, Title (Report No ReportNumber, Year) Pinpoint.",
  },
  {
    type: "report.abs",
    ruleNumber: "7.1.5",
    label: "ABS Publication",
    category: "secondary",
    requiredFields: ["title", "catalogueNumber", "year"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Australian Bureau of Statistics, Title (Catalogue No CatalogueNumber, Year) Pinpoint.",
  },
  {
    type: "research_paper",
    ruleNumber: "7.2",
    label: "Research Paper",
    category: "secondary",
    requiredFields: ["authors", "title", "institution", "paperType", "paperNumber", "year"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Author, 'Title' (PaperType No PaperNumber, Institution, Year) Pinpoint.",
  },
  {
    type: "research_paper.parliamentary",
    ruleNumber: "7.2.3",
    label: "Parliamentary Research Paper",
    category: "secondary",
    requiredFields: ["authors", "title", "paperNumber", "year"],
    optionalFields: ["chamber", "pinpoint"],
    formatTemplate: "Author, 'Title' (Parliamentary Research Paper No PaperNumber, Year) Pinpoint.",
  },
  {
    type: "conference_paper",
    ruleNumber: "7.2.4",
    label: "Conference Paper",
    category: "secondary",
    requiredFields: ["authors", "title", "conferenceName", "year"],
    optionalFields: ["location", "fullDate", "pinpoint"],
    formatTemplate: "Author, 'Title' (Conference Paper, ConferenceName, FullDate) Pinpoint.",
  },
  {
    type: "thesis",
    ruleNumber: "7.2.5",
    label: "Thesis",
    category: "secondary",
    requiredFields: ["authors", "title", "thesisType", "institution", "year"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Author, Title (ThesisType, Institution, Year) Pinpoint.",
  },
  {
    type: "speech",
    ruleNumber: "7.3",
    label: "Speech",
    category: "secondary",
    requiredFields: ["speaker", "title", "event", "fullDate"],
    optionalFields: ["location", "pinpoint"],
    formatTemplate: "Speaker, 'Title' (Speech, Event, FullDate) Pinpoint.",
  },
  {
    type: "press_release",
    ruleNumber: "7.4",
    label: "Press Release",
    category: "secondary",
    requiredFields: ["author", "title", "fullDate"],
    optionalFields: ["documentNumber", "pinpoint"],
    formatTemplate: "Author, 'Title' (Press Release, DocumentNumber, FullDate).",
  },
  {
    type: "hansard",
    ruleNumber: "7.5.1",
    label: "Hansard",
    category: "secondary",
    requiredFields: ["jurisdiction", "chamber", "fullDate", "startingPage"],
    optionalFields: ["speaker", "pinpoint"],
    formatTemplate: "Jurisdiction, Parliamentary Debates, Chamber, FullDate, StartingPage (Speaker) Pinpoint.",
  },
  {
    type: "submission.government",
    ruleNumber: "7.5.2",
    label: "Government Submission",
    category: "secondary",
    requiredFields: ["author", "title", "committee"],
    optionalFields: ["year", "pinpoint"],
    formatTemplate: "Author, Title, Submission to Committee (Year) Pinpoint.",
  },
  {
    type: "evidence.parliamentary",
    ruleNumber: "7.5.3",
    label: "Parliamentary Evidence",
    category: "secondary",
    requiredFields: ["witness", "committee", "fullDate"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Evidence to Committee (FullDate) Pinpoint (Witness).",
  },
  {
    type: "constitutional_convention",
    ruleNumber: "7.5.4",
    label: "Constitutional Convention Debates",
    category: "secondary",
    requiredFields: ["title", "fullDate"],
    optionalFields: ["speaker", "pinpoint", "volume"],
    formatTemplate: "Title, FullDate, Volume, Pinpoint (Speaker).",
  },
  {
    type: "dictionary",
    ruleNumber: "7.6",
    label: "Dictionary",
    category: "secondary",
    requiredFields: ["title", "entry"],
    optionalFields: ["edition", "year", "pinpoint"],
    formatTemplate: "Title (at Edition, Year) 'Entry'.",
  },
  {
    type: "legal_encyclopedia",
    ruleNumber: "7.7",
    label: "Legal Encyclopedia",
    category: "secondary",
    requiredFields: ["title", "volume", "topicTitle"],
    optionalFields: ["edition", "year", "pinpoint", "publisher"],
    formatTemplate: "Title (at Edition, Year) vol Volume, 'TopicTitle', Pinpoint.",
  },
  {
    type: "looseleaf",
    ruleNumber: "7.8",
    label: "Looseleaf Service",
    category: "secondary",
    requiredFields: ["authors", "title", "publisher"],
    optionalFields: ["volume", "serviceNumber", "pinpoint"],
    formatTemplate: "Author, Title (Publisher, ServiceNumber) Volume, Pinpoint.",
  },
  {
    type: "ip_material",
    ruleNumber: "7.9",
    label: "Intellectual Property Material",
    category: "secondary",
    requiredFields: ["title", "registrationNumber"],
    optionalFields: ["applicant", "year", "pinpoint"],
    formatTemplate: "Title, RegistrationNumber (Year) Pinpoint.",
  },
  {
    type: "constitutive_document",
    ruleNumber: "7.10",
    label: "Constitutive Document",
    category: "secondary",
    requiredFields: ["entityName", "documentType"],
    optionalFields: ["clause", "pinpoint"],
    formatTemplate: "EntityName DocumentType Pinpoint.",
  },
  {
    type: "newspaper",
    ruleNumber: "7.11",
    label: "Newspaper Article",
    category: "secondary",
    requiredFields: ["authors", "title", "newspaper", "fullDate"],
    optionalFields: ["startingPage", "pinpoint"],
    formatTemplate: "Author, 'Title', Newspaper (FullDate) StartingPage.",
  },
  {
    type: "correspondence",
    ruleNumber: "7.12",
    label: "Correspondence",
    category: "secondary",
    requiredFields: ["from", "to", "fullDate"],
    optionalFields: ["subject", "pinpoint"],
    formatTemplate: "Letter from From to To, FullDate.",
  },
  {
    type: "interview",
    ruleNumber: "7.13",
    label: "Interview",
    category: "secondary",
    requiredFields: ["interviewee", "interviewer"],
    optionalFields: ["title", "programme", "fullDate", "pinpoint"],
    formatTemplate: "Interview with Interviewee (Interviewer, FullDate).",
  },
  {
    type: "film_tv_media",
    ruleNumber: "7.14",
    label: "Film, Television, or Media",
    category: "secondary",
    requiredFields: ["title", "year"],
    optionalFields: ["director", "producer", "distributor", "pinpoint"],
    formatTemplate: "Title (Director, Distributor, Year) Pinpoint.",
  },
  {
    type: "internet_material",
    ruleNumber: "7.15",
    label: "Internet Material",
    category: "secondary",
    requiredFields: ["authors", "title", "websiteName", "url"],
    optionalFields: ["fullDate", "pinpoint"],
    formatTemplate: "Author, 'Title', WebsiteName (FullDate) <URL>.",
  },
  {
    type: "social_media",
    ruleNumber: "7.16",
    label: "Social Media Post",
    category: "secondary",
    requiredFields: ["author", "platform", "fullDate"],
    optionalFields: ["content", "url"],
    formatTemplate: "Author (Platform, FullDate) <URL>.",
  },
  {
    type: "genai_output",
    ruleNumber: "7.12",
    label: "Generative AI Output",
    category: "secondary",
    requiredFields: ["model", "provider", "prompt", "fullDate"],
    optionalFields: ["url"],
    formatTemplate: "Provider, Model (FullDate) prompt: 'Prompt'.",
  },

  // Part IV — International Materials
  {
    type: "treaty",
    ruleNumber: "8",
    label: "Treaty",
    category: "international",
    requiredFields: ["title", "treatySeries"],
    optionalFields: ["parties", "openedDate", "signedDate", "seriesVolume", "startingPage", "entryIntoForceDate", "notYetInForce", "pinpoint"],
    formatTemplate: "Title, opened for signature OpenedDate, SeriesVolume TreatySeries StartingPage (entered into force EntryIntoForceDate) Pinpoint.",
  },
  {
    type: "un.document",
    ruleNumber: "9.2",
    label: "United Nations Document",
    category: "international",
    requiredFields: ["title", "unOrgan", "documentNumber"],
    optionalFields: ["sessionNumber", "year", "pinpoint"],
    formatTemplate: "Title, UN Doc DocumentNumber (Year) Pinpoint.",
  },
  {
    type: "un.communication",
    ruleNumber: "9.3",
    label: "United Nations Communication",
    category: "international",
    requiredFields: ["applicant", "respondent", "documentNumber"],
    optionalFields: ["year", "pinpoint"],
    formatTemplate: "Applicant v Respondent, UN Doc DocumentNumber (Year) Pinpoint.",
  },
  {
    type: "un.yearbook",
    ruleNumber: "9.4",
    label: "United Nations Yearbook",
    category: "international",
    requiredFields: ["title", "year", "volume"],
    optionalFields: ["startingPage", "pinpoint"],
    formatTemplate: "Title [Year] Volume Yearbook StartingPage, Pinpoint.",
  },
  {
    type: "icj.decision",
    ruleNumber: "10.2",
    label: "ICJ Decision",
    category: "international",
    requiredFields: ["title", "year", "reportSeries"],
    optionalFields: ["startingPage", "pinpoint", "decisionType"],
    formatTemplate: "Title (DecisionType) [Year] ICJ Reports StartingPage, Pinpoint.",
  },
  {
    type: "icj.pleading",
    ruleNumber: "10.3",
    label: "ICJ Pleading",
    category: "international",
    requiredFields: ["title", "caseTitle", "year"],
    optionalFields: ["pinpoint"],
    formatTemplate: "Title (CaseTitle) [Year] ICJ Pleadings Pinpoint.",
  },
  {
    type: "arbitral.state_state",
    ruleNumber: "11.1",
    label: "State-State Arbitration",
    category: "international",
    requiredFields: ["title", "year"],
    optionalFields: ["reportSeries", "volume", "startingPage", "pinpoint"],
    formatTemplate: "Title (Year) Volume ReportSeries StartingPage, Pinpoint.",
  },
  {
    type: "arbitral.individual_state",
    ruleNumber: "11.2",
    label: "Individual-State Arbitration",
    category: "international",
    requiredFields: ["title", "year", "tribunal"],
    optionalFields: ["caseNumber", "reportSeries", "pinpoint"],
    formatTemplate: "Title (Tribunal, CaseNumber, Year) Pinpoint.",
  },
  {
    type: "icc_tribunal.case",
    ruleNumber: "12.2",
    label: "International Criminal Tribunal Case",
    category: "international",
    requiredFields: ["title", "tribunal", "caseNumber"],
    optionalFields: ["chamber", "decisionType", "fullDate", "pinpoint"],
    formatTemplate: "Prosecutor v Accused (Tribunal, Chamber, CaseNumber, FullDate) Pinpoint.",
  },
  {
    type: "wto.document",
    ruleNumber: "13.1.2",
    label: "WTO Document",
    category: "international",
    requiredFields: ["title", "documentNumber"],
    optionalFields: ["year", "pinpoint"],
    formatTemplate: "Title, WTO Doc DocumentNumber (Year) Pinpoint.",
  },
  {
    type: "wto.decision",
    ruleNumber: "13.1.3",
    label: "WTO Panel/Appellate Body Decision",
    category: "international",
    requiredFields: ["title", "documentNumber"],
    optionalFields: ["year", "pinpoint", "decisionType"],
    formatTemplate: "Title — DecisionType, WTO Doc DocumentNumber (Year) Pinpoint.",
  },
  {
    type: "gatt.document",
    ruleNumber: "13.2",
    label: "GATT Document",
    category: "international",
    requiredFields: ["title", "documentNumber"],
    optionalFields: ["year", "pinpoint"],
    formatTemplate: "Title, GATT Doc DocumentNumber (Year) Pinpoint.",
  },
  {
    type: "eu.official_journal",
    ruleNumber: "14.2.1",
    label: "EU Official Journal",
    category: "international",
    requiredFields: ["title", "ojSeries", "ojNumber", "year"],
    optionalFields: ["startingPage", "pinpoint"],
    formatTemplate: "[Year] OJ OjSeries OjNumber/StartingPage Pinpoint.",
  },
  {
    type: "eu.court",
    ruleNumber: "14.2.3",
    label: "EU Court Decision",
    category: "international",
    requiredFields: ["title", "caseNumber", "year"],
    optionalFields: ["reportSeries", "pinpoint"],
    formatTemplate: "Title (CaseNumber) [Year] ECR Pinpoint.",
  },
  {
    type: "echr.decision",
    ruleNumber: "14.3.2",
    label: "European Court of Human Rights Decision",
    category: "international",
    requiredFields: ["title", "applicationNumber"],
    optionalFields: ["year", "reportSeries", "pinpoint"],
    formatTemplate: "Title (European Court of Human Rights, ApplicationNumber, FullDate) Pinpoint.",
  },
  {
    type: "supranational.decision",
    ruleNumber: "14.4",
    label: "Supranational Court Decision",
    category: "international",
    requiredFields: ["title", "court", "year"],
    optionalFields: ["caseNumber", "reportSeries", "pinpoint"],
    formatTemplate: "Title (Court, CaseNumber, Year) Pinpoint.",
  },
  {
    type: "supranational.document",
    ruleNumber: "14.5",
    label: "Supranational Document",
    category: "international",
    requiredFields: ["title", "organisation", "documentNumber"],
    optionalFields: ["year", "pinpoint"],
    formatTemplate: "Organisation, Title, DocumentNumber (Year) Pinpoint.",
  },

  // Part V — Foreign Domestic Sources
  {
    type: "foreign.canada",
    ruleNumber: "15",
    label: "Canadian Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 15 for format details.",
  },
  {
    type: "foreign.china",
    ruleNumber: "16",
    label: "Chinese Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "pinpoint"],
    formatTemplate: "See AGLC4 Rule 16 for format details.",
  },
  {
    type: "foreign.france",
    ruleNumber: "17",
    label: "French Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "pinpoint"],
    formatTemplate: "See AGLC4 Rule 17 for format details.",
  },
  {
    type: "foreign.germany",
    ruleNumber: "18",
    label: "German Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "pinpoint"],
    formatTemplate: "See AGLC4 Rule 18 for format details.",
  },
  {
    type: "foreign.hong_kong",
    ruleNumber: "19",
    label: "Hong Kong Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 19 for format details.",
  },
  {
    type: "foreign.malaysia",
    ruleNumber: "20",
    label: "Malaysian Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 20 for format details.",
  },
  {
    type: "foreign.new_zealand",
    ruleNumber: "21",
    label: "New Zealand Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 21 for format details.",
  },
  {
    type: "foreign.singapore",
    ruleNumber: "22",
    label: "Singaporean Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 22 for format details.",
  },
  {
    type: "foreign.south_africa",
    ruleNumber: "23",
    label: "South African Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 23 for format details.",
  },
  {
    type: "foreign.uk",
    ruleNumber: "24",
    label: "United Kingdom Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 24 for format details.",
  },
  {
    type: "foreign.usa",
    ruleNumber: "25",
    label: "United States Source",
    category: "foreign",
    requiredFields: ["title"],
    optionalFields: ["authors", "year", "reportSeries", "volume", "startingPage", "pinpoint", "court"],
    formatTemplate: "See AGLC4 Rule 25 for format details.",
  },
  {
    type: "foreign.other",
    ruleNumber: "26",
    label: "Other Foreign Source",
    category: "foreign",
    requiredFields: ["title", "jurisdiction"],
    optionalFields: ["authors", "year", "pinpoint"],
    formatTemplate: "See AGLC4 Rule 26 for format details.",
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
    generatedBy: "Obiter v0.1.0",

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
