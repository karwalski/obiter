/**
 * AGLC4 Citation Data Model
 *
 * Core types for the citation data store, mirroring the AGLC4 spec (section 4.1).
 * All citation metadata persists in a Custom XML Part bound to the .docx file.
 */

// ─── Common Structures ────────────────────────────────────────────────────────

export interface Author {
  givenNames: string;
  surname: string;
  suffix?: string; // "Jr", "III", etc.
  isJudge?: boolean; // Rule 4.1.5
  judicialTitle?: string; // "Justice", "Chief Justice", etc.
}

export interface Pinpoint {
  type:
    | "page"
    | "paragraph"
    | "section"
    | "chapter"
    | "part"
    | "clause"
    | "schedule"
    | "article"
    | "regulation"
    | "rule"
    | "footnote"
    | "column"
    | "line"
    | "division"
    | "appendix"
    | "subdivision"
    | "subsection"
    | "subclause"
    | "subparagraph"
    | "subregulation"
    | "subrule"
    | "order"
    | "item";
  value: string; // "42", "42–5", "[23]", "[23]–[27]"
  subPinpoint?: Pinpoint; // e.g. page + paragraph: "6 [23]"
}

export interface ParallelCitation {
  yearType: "round" | "square";
  year: number;
  volume?: number;
  reportSeries: string;
  startingPage: number;
}

export interface JudicialOfficer {
  name: string;
  title: string; // "CJ", "J", "JJ", "JA", etc.
  role: "majority" | "concurring" | "dissenting" | "agreeing";
}

export interface CaseHistoryEntry {
  relationship: "affd" | "revd" | "special_leave" | "appeal" | "related";
  citation: string; // Free-text citation of the related case
}

// ─── Australian Jurisdiction ──────────────────────────────────────────────────

export type AustralianJurisdiction =
  | "Cth"
  | "ACT"
  | "NSW"
  | "NT"
  | "Qld"
  | "SA"
  | "Tas"
  | "Vic"
  | "WA";

// ─── Source Type Discriminated Union ──────────────────────────────────────────

export type SourceType =
  // Part II — Domestic Sources
  | "case.reported" // Rule 2.2
  | "case.unreported.mnc" // Rule 2.3.1
  | "case.unreported.no_mnc" // Rule 2.3.2
  | "case.proceeding" // Rule 2.3.3
  | "case.court_order" // Rule 2.3.4
  | "case.quasi_judicial" // Rule 2.6
  | "case.arbitration" // Rule 2.6.2
  | "case.transcript" // Rule 2.7
  | "case.submission" // Rule 2.8
  | "legislation.statute" // Rule 3.1
  | "legislation.bill" // Rule 3.2
  | "legislation.delegated" // Rule 3.4
  | "legislation.constitution" // Rule 3.6
  | "legislation.explanatory" // Rule 3.7
  | "legislation.quasi" // Rule 3.9

  // Part III — Secondary Sources
  | "journal.article" // Rule 5
  | "journal.online" // Rule 5.10
  | "journal.forthcoming" // Rule 5.11
  | "book" // Rule 6
  | "book.chapter" // Rule 6.6.1
  | "book.translated" // Rule 6.7
  | "book.audiobook" // Rule 6.9
  | "report" // Rule 7.1
  | "report.parliamentary" // Rule 7.1.2
  | "report.royal_commission" // Rule 7.1.3
  | "report.law_reform" // Rule 7.1.4
  | "report.abs" // Rule 7.1.5
  | "research_paper" // Rule 7.2
  | "research_paper.parliamentary" // Rule 7.2.3
  | "conference_paper" // Rule 7.2.4
  | "thesis" // Rule 7.2.5
  | "speech" // Rule 7.3
  | "press_release" // Rule 7.4
  | "hansard" // Rule 7.5.1
  | "submission.government" // Rule 7.5.2
  | "evidence.parliamentary" // Rule 7.5.3
  | "constitutional_convention" // Rule 7.5.4
  | "dictionary" // Rule 7.6
  | "legal_encyclopedia" // Rule 7.7
  | "looseleaf" // Rule 7.8
  | "ip_material" // Rule 7.9
  | "constitutive_document" // Rule 7.10
  | "newspaper" // Rule 7.11
  | "correspondence" // Rule 7.12
  | "interview" // Rule 7.13
  | "film_tv_media" // Rule 7.14
  | "internet_material" // Rule 7.15
  | "social_media" // Rule 7.16
  | "genai_output" // MULR interim guidance (Rule 7.12)

  // Part IV — International Materials
  | "treaty" // Rule 8
  | "un.document" // Rule 9.2
  | "un.communication" // Rule 9.3
  | "un.yearbook" // Rule 9.4
  | "icj.decision" // Rule 10.2
  | "icj.pleading" // Rule 10.3
  | "arbitral.state_state" // Rule 11.1
  | "arbitral.individual_state" // Rule 11.2
  | "icc_tribunal.case" // Rule 12.2
  | "wto.document" // Rule 13.1.2
  | "wto.decision" // Rule 13.1.3
  | "gatt.document" // Rule 13.2
  | "eu.official_journal" // Rule 14.2.1
  | "eu.court" // Rule 14.2.3
  | "echr.decision" // Rule 14.3.2
  | "supranational.decision" // Rule 14.4
  | "supranational.document" // Rule 14.5

  // Part V — Foreign Domestic Sources
  | "foreign.canada" // Rule 15
  | "foreign.china" // Rule 16
  | "foreign.france" // Rule 17
  | "foreign.germany" // Rule 18
  | "foreign.hong_kong" // Rule 19
  | "foreign.malaysia" // Rule 20
  | "foreign.new_zealand" // Rule 21
  | "foreign.singapore" // Rule 22
  | "foreign.south_africa" // Rule 23
  | "foreign.uk" // Rule 24
  | "foreign.usa" // Rule 25
  | "foreign.other"; // Rule 26

// ─── Source Data (type-specific fields) ───────────────────────────────────────
//
// SourceData is a flexible record for source-type-specific fields. Each source
// type defines its own set of keys; the full per-type interfaces (CaseReportedData,
// LegislationStatuteData, etc.) will be added as the rule engine is built out.
// For the data store layer, we store them as a generic record and let the rule
// engine validate the shape at format time.

export type SourceData = Record<string, unknown>;

// ─── Top-Level Citation Record ────────────────────────────────────────────────

export interface Citation {
  id: string; // UUID
  aglcVersion: "4" | "5"; // Rule version
  sourceType: SourceType; // Discriminated union key
  data: SourceData; // Type-specific fields
  shortTitle?: string; // User-defined or auto-suggested
  firstFootnoteNumber?: number; // Footnote where first cited
  tags: string[]; // User-defined grouping (for bibliography sections)
  createdAt: string; // ISO datetime
  modifiedAt: string; // ISO datetime
}

// ─── Store Metadata ───────────────────────────────────────────────────────────

export interface StoreMetadata {
  schemaVersion: string; // e.g. "1.0"
  aglcVersion: "4" | "5"; // Default AGLC version for new citations
}

// ─── Store Shape (deserialized) ───────────────────────────────────────────────

export interface CitationStoreData {
  metadata: StoreMetadata;
  citations: Citation[];
}
