/**
 * AI-009: Multi-Turn Corpus-Enhanced Citation Parsing
 *
 * Wraps the citation parse flow to try fast local sources (deterministic
 * parser, then corpus index) before falling back to a multi-turn LLM
 * conversation. The multi-turn approach:
 *
 *   Turn 1 (classify): LLM identifies the source type from the full list
 *   Turn 2 (extract):  LLM receives the exact field schema for that type,
 *                       plus nearby corpus matches, and returns JSON with
 *                       only the known fields populated
 *
 * This eliminates field name mismatches by constraining the LLM to the
 * exact field names each form expects.
 */

import type { SourceType, SourceData } from "../types/citation";
import type { CorpusEntry } from "../api/corpus/corpusIndex";
import type { LLMConfig } from "./config";
import {
  parseCitation,
  tokeniseMNC,
  type ParsedCitation as DeterministicParsed,
} from "../api/citationParser";
import {
  checkCorpusAvailable,
  getCorpusIndex,
} from "../api/corpus/corpusDownload";
import { callLlmMultiTurn, type ChatMessage } from "./client";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface CorpusEnhancedResult {
  data: Partial<SourceData>;
  source: "corpus" | "llm" | "parser";
  warnings: string[];
  /** Source type detected by LLM if it differs from the hint. */
  detectedSourceType?: SourceType;
  /** Short title suggested by the parser / LLM. */
  shortTitle?: string;
}

// ---------------------------------------------------------------------------
// Field schema — comprehensive map of every source type's form fields
// ---------------------------------------------------------------------------

interface FieldDescriptor {
  name: string;
  description: string;
}

/** All known source type string values. */
const SOURCE_TYPES: SourceType[] = [
  "case.reported", "case.unreported.mnc", "case.unreported.no_mnc",
  "case.proceeding", "case.court_order", "case.quasi_judicial",
  "case.arbitration", "case.transcript", "case.submission",
  "legislation.statute", "legislation.bill", "legislation.delegated",
  "legislation.constitution", "legislation.explanatory", "legislation.quasi",
  "journal.article", "journal.online", "journal.forthcoming",
  "book", "book.chapter", "book.translated", "book.audiobook",
  "report", "report.parliamentary", "report.royal_commission",
  "report.law_reform", "report.abs",
  "research_paper", "research_paper.parliamentary",
  "conference_paper", "thesis", "speech", "press_release",
  "hansard", "submission.government", "evidence.parliamentary",
  "constitutional_convention", "dictionary", "legal_encyclopedia",
  "looseleaf", "ip_material", "constitutive_document",
  "newspaper", "correspondence", "interview", "film_tv_media",
  "internet_material", "social_media", "genai_output",
  "treaty", "un.document", "un.communication", "un.yearbook",
  "icj.decision", "icj.pleading",
  "arbitral.state_state", "arbitral.individual_state",
  "icc_tribunal.case", "wto.document", "wto.decision", "gatt.document",
  "eu.official_journal", "eu.court", "echr.decision",
  "supranational.decision", "supranational.document",
  "foreign.canada", "foreign.china", "foreign.france", "foreign.germany",
  "foreign.hong_kong", "foreign.malaysia", "foreign.new_zealand",
  "foreign.singapore", "foreign.south_africa", "foreign.uk",
  "foreign.usa", "foreign.other",
  "custom",
  "explanatory_note",
];

/**
 * Return the expected form field names for a given source type.
 * These match exactly the field names used by updateField() in each
 * renderXxxForm function in InsertCitation.tsx.
 */
export function getFieldSchemaForSourceType(
  sourceType: SourceType,
): FieldDescriptor[] {
  const schemas: Record<string, FieldDescriptor[]> = {
    "case.reported": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "separator", description: 'Party separator: "v" or "and" or "&"' },
      { name: "yearType", description: '"round" for (year) or "square" for [year]' },
      { name: "year", description: "Year of the decision" },
      { name: "volume", description: "Report volume number" },
      { name: "reportSeries", description: "Report series abbreviation (e.g. CLR, HCA)" },
      { name: "startingPage", description: "Starting page number" },
      { name: "courtId", description: "Court abbreviation (if not apparent from report series)" },
      { name: "mnc", description: "Medium neutral citation number (if also unreported)" },
      { name: "pinpoint", description: "Pinpoint reference (page, paragraph)" },
    ],
    "case.unreported.mnc": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "year", description: "Year of the decision" },
      { name: "court", description: "Court abbreviation (e.g. HCA, NSWSC)" },
      { name: "caseNumber", description: "Case/judgment number" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "judicialOfficer", description: "Name of the judicial officer" },
    ],
    "case.unreported.no_mnc": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "proceedingNumber", description: "Proceeding or file number" },
      { name: "date", description: "Date of the decision" },
    ],
    "case.proceeding": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "commencedDate", description: "Date commenced" },
    ],
    "case.court_order": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "court", description: "Court name or abbreviation" },
      { name: "orderDate", description: "Date of the order" },
    ],
    "case.quasi_judicial": [
      { name: "party", description: "Party name or parties" },
      { name: "department", description: "Department or body" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Report volume" },
      { name: "reportSeries", description: "Report series" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "case.arbitration": [
      { name: "parties", description: "Parties to the arbitration" },
      { name: "arbitrationType", description: "Type of arbitration" },
      { name: "year", description: "Year of the award" },
      { name: "awardDetails", description: "Award details / citation" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "case.transcript": [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "year", description: "Year" },
      { name: "court", description: "Court" },
      { name: "caseNumber", description: "Case number" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "date", description: "Transcript date" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "hcaTranscript", description: "Whether this is an HCA transcript" },
    ],
    "case.submission": [
      { name: "partyName", description: "Submitting party name" },
      { name: "submissionTitle", description: "Submission title" },
      { name: "caseParty1", description: "First party in the case" },
      { name: "caseParty2", description: "Second party in the case" },
      { name: "proceedingNumber", description: "Proceeding number" },
      { name: "date", description: "Submission date" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.statute": [
      { name: "title", description: "Short title of the Act" },
      { name: "year", description: "Year of enactment" },
      { name: "jurisdiction", description: 'Jurisdiction abbreviation (e.g. "Cth", "NSW", "Vic")' },
      { name: "number", description: "Act number" },
      { name: "pinpoint", description: "Section / schedule pinpoint (e.g. s 51, sch 2)" },
    ],
    "legislation.bill": [
      { name: "title", description: "Bill title" },
      { name: "year", description: "Year" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "number", description: "Bill number" },
      { name: "pinpoint", description: "Clause pinpoint" },
    ],
    "legislation.delegated": [
      { name: "title", description: "Instrument title" },
      { name: "year", description: "Year" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "number", description: "Instrument number" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.constitution": [
      { name: "constitutionType", description: 'Type: "Commonwealth" or "State"' },
      { name: "jurisdiction", description: "Jurisdiction" },
      { name: "title", description: "Constitution title" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Section pinpoint" },
    ],
    "legislation.explanatory": [
      { name: "type", description: 'Type: "Explanatory Memorandum" or "Explanatory Statement"' },
      { name: "billTitle", description: "Title of the bill" },
      { name: "billYear", description: "Year of the bill" },
      { name: "jurisdiction", description: "Jurisdiction abbreviation" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ],
    "legislation.quasi": [
      { name: "quasiVariant", description: 'Variant: e.g. "rules", "practice direction", "gazette notice"' },
      { name: "issuingBody", description: "Issuing body" },
      { name: "documentType", description: "Document type" },
      { name: "number", description: "Document number" },
      { name: "title", description: "Title" },
      { name: "date", description: "Date" },
      { name: "jurisdiction", description: "Jurisdiction" },
      { name: "gazetteType", description: "Gazette type" },
      { name: "page", description: "Page number" },
    ],
    "journal.article": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "year", description: "Publication year" },
      { name: "volume", description: "Journal volume" },
      { name: "issue", description: "Journal issue number" },
      { name: "journal", description: "Journal name" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint page" },
    ],
    "journal.online": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "journal", description: "Journal name" },
      { name: "url", description: "URL" },
      { name: "dateAccessed", description: "Date accessed" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "journal.forthcoming": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "journal", description: "Journal name" },
      { name: "year", description: "Expected publication year" },
      { name: "volume", description: "Expected volume" },
      { name: "forthcomingNote", description: "Forthcoming note" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "book": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher name" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Publication year" },
      { name: "pinpoint", description: "Pinpoint page" },
    ],
    "book.chapter": [
      { name: "authors", description: "Array of { givenNames, surname } for chapter author" },
      { name: "chapterTitle", description: "Chapter title" },
      { name: "editors", description: "Array of { givenNames, surname } for editors" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "startingPage", description: "Starting page of chapter" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "book.translated": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "translator", description: "Translator name" },
      { name: "publisher", description: "Publisher" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "book.audiobook": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "narrator", description: "Narrator name" },
      { name: "publisher", description: "Publisher" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report": [
      { name: "author", description: "Author or institutional author name" },
      { name: "title", description: "Report title" },
      { name: "reportNumber", description: "Report number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.parliamentary": [
      { name: "body", description: "Parliamentary body or committee" },
      { name: "title", description: "Report title" },
      { name: "parlPaperNumber", description: "Parliamentary paper number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.royal_commission": [
      { name: "title", description: "Report title" },
      { name: "commissioner", description: "Commissioner name" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.law_reform": [
      { name: "body", description: "Law reform body" },
      { name: "title", description: "Report title" },
      { name: "reportNumber", description: "Report number" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "report.abs": [
      { name: "title", description: "Publication title" },
      { name: "catalogueNumber", description: "ABS catalogue number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "research_paper": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "seriesNumber", description: "Series/working paper number" },
      { name: "year", description: "Year" },
      { name: "institution", description: "Institution" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "research_paper.parliamentary": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "researchPaperNumber", description: "Research paper number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "conference_paper": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Paper title" },
      { name: "conferenceName", description: "Conference name" },
      { name: "location", description: "Conference location" },
      { name: "date", description: "Conference date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "thesis": [
      { name: "author", description: "Author name" },
      { name: "title", description: "Thesis title" },
      { name: "thesisType", description: "Type (PhD, Masters, etc.)" },
      { name: "institution", description: "Institution" },
      { name: "year", description: "Year" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "speech": [
      { name: "speaker", description: "Speaker name" },
      { name: "title", description: "Speech title" },
      { name: "event", description: "Event or occasion" },
      { name: "location", description: "Location" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "press_release": [
      { name: "issuingBody", description: "Issuing body or person" },
      { name: "title", description: "Title of the press release" },
      { name: "number", description: "Press release number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "hansard": [
      { name: "jurisdiction", description: "Parliament (e.g. Commonwealth, New South Wales)" },
      { name: "chamber", description: "Chamber (e.g. Senate, House of Representatives, Legislative Assembly)" },
      { name: "date", description: "Date of the debate" },
      { name: "pinpoint", description: "Page number" },
      { name: "speaker", description: "Name of the speaker" },
    ],
    "submission.government": [
      { name: "author", description: "Author or organisation" },
      { name: "title", description: "Submission title" },
      { name: "inquiryName", description: "Inquiry name" },
      { name: "submissionNumber", description: "Submission number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "evidence.parliamentary": [
      { name: "witness", description: "Witness name" },
      { name: "committee", description: "Committee name" },
      { name: "inquiryTitle", description: "Inquiry title" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "constitutional_convention": [
      { name: "conventionName", description: "Convention name" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
      { name: "speaker", description: "Speaker name" },
    ],
    "dictionary": [
      { name: "title", description: "Dictionary title" },
      { name: "edition", description: "Edition" },
      { name: "year", description: "Year" },
      { name: "entryTerm", description: "Entry term being defined" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "legal_encyclopedia": [
      { name: "title", description: "Encyclopedia title" },
      { name: "volume", description: "Volume" },
      { name: "titleNumber", description: "Title number within volume" },
      { name: "topic", description: "Topic name" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "looseleaf": [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Service title" },
      { name: "publisher", description: "Publisher" },
      { name: "serviceNumber", description: "Service number" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "ip_material": [
      { name: "applicant", description: "Applicant name" },
      { name: "title", description: "Title of the IP material" },
      { name: "ipType", description: "Type (Patent, Trade Mark, Design)" },
      { name: "country", description: "Country" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "constitutive_document": [
      { name: "entityName", description: "Entity name" },
      { name: "documentType", description: "Document type (Constitution, Charter, etc.)" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "newspaper": [
      { name: "author", description: "Author name" },
      { name: "title", description: "Article title" },
      { name: "newspaperName", description: "Newspaper name" },
      { name: "place", description: "Place of publication" },
      { name: "date", description: "Date" },
      { name: "page", description: "Page number" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "correspondence": [
      { name: "author", description: "Author / sender name" },
      { name: "recipient", description: "Recipient name" },
      { name: "date", description: "Date" },
      { name: "medium", description: "Medium (Letter, Email, etc.)" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "interview": [
      { name: "interviewee", description: "Interviewee name" },
      { name: "interviewer", description: "Interviewer name" },
      { name: "program", description: "Program or publication" },
      { name: "date", description: "Date" },
      { name: "medium", description: "Medium (Radio, Television, etc.)" },
    ],
    "film_tv_media": [
      { name: "title", description: "Film / TV title" },
      { name: "director", description: "Director name" },
      { name: "productionCompany", description: "Production company" },
      { name: "year", description: "Year" },
      { name: "medium", description: "Medium (Film, Television, Podcast, etc.)" },
      { name: "pinpoint", description: "Pinpoint (timestamp, episode)" },
    ],
    "internet_material": [
      { name: "author", description: "Author name" },
      { name: "title", description: "Page or article title" },
      { name: "websiteName", description: "Website name" },
      { name: "date", description: "Date" },
      { name: "url", description: "URL" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "social_media": [
      { name: "author", description: "Author / handle" },
      { name: "platform", description: "Platform (Twitter/X, Facebook, etc.)" },
      { name: "content", description: "Post content / excerpt" },
      { name: "date", description: "Date" },
      { name: "url", description: "URL" },
    ],
    "genai_output": [
      { name: "platform", description: "AI platform name" },
      { name: "platformCustom", description: "Custom platform name (if other)" },
      { name: "model", description: "Model name" },
      { name: "prompt", description: "Prompt used" },
      { name: "outputDate", description: "Date of the output" },
      { name: "url", description: "URL (if applicable)" },
    ],
    "treaty": [
      { name: "title", description: "Treaty title" },
      { name: "parties", description: "Parties to the treaty" },
      { name: "openedDate", description: "Date opened for signature" },
      { name: "signedDate", description: "Date signed" },
      { name: "treatySeries", description: "Treaty series abbreviation (e.g. UNTS)" },
      { name: "seriesVolume", description: "Series volume number" },
      { name: "startingPage", description: "Starting page in the series" },
      { name: "entryIntoForceDate", description: "Date of entry into force" },
      { name: "notYetInForce", description: "Whether not yet in force (boolean)" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.document": [
      { name: "body", description: "UN body (e.g. General Assembly, Security Council)" },
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "UN document symbol (e.g. A/RES/70/1)" },
      { name: "date", description: "Date" },
      { name: "session", description: "Session" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.communication": [
      { name: "author", description: "Parties / author of the communication" },
      { name: "communicationNumber", description: "Communication number" },
      { name: "committee", description: "Committee (e.g. Human Rights Committee)" },
      { name: "date", description: "Date" },
      { name: "docNumber", description: "UN document symbol" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "un.yearbook": [
      { name: "title", description: "Yearbook title" },
      { name: "year", description: "Year" },
      { name: "volume", description: "Volume" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icj.decision": [
      { name: "caseTitle", description: "Case title" },
      { name: "parties", description: "Parties (e.g. Portugal v Australia)" },
      { name: "decisionType", description: "Judgment, Advisory Opinion, or Order" },
      { name: "year", description: "Year of the decision" },
      { name: "icjReportsPage", description: "ICJ Reports starting page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icj.pleading": [
      { name: "caseTitle", description: "Case title" },
      { name: "documentType", description: "Document type (Memorial, Counter-Memorial, etc.)" },
      { name: "party", description: "Filing party" },
      { name: "date", description: "Date" },
      { name: "icjPleadingsVolume", description: "ICJ Pleadings volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "arbitral.state_state": [
      { name: "caseTitle", description: "Case title" },
      { name: "parties", description: "State parties" },
      { name: "tribunal", description: "Tribunal (e.g. PCA)" },
      { name: "awardDate", description: "Award date" },
      { name: "reportSeries", description: "Report series" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "arbitral.individual_state": [
      { name: "caseTitle", description: "Case title" },
      { name: "caseNumber", description: "Case number (e.g. ICSID Case No ARB/01/8)" },
      { name: "tribunal", description: "Tribunal (ICSID, UNCITRAL, PCA, Other)" },
      { name: "tribunalOther", description: "Custom tribunal name if Other" },
      { name: "awardDate", description: "Award date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "icc_tribunal.case": [
      { name: "accused", description: "Accused name" },
      { name: "caseNumber", description: "Case number" },
      { name: "tribunal", description: "Tribunal (ICC, ICTY, ICTR, Other)" },
      { name: "tribunalOther", description: "Custom tribunal name if Other" },
      { name: "chamber", description: "Chamber" },
      { name: "decisionType", description: "Decision type" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "wto.document": [
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "WTO document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "wto.decision": [
      { name: "title", description: "Case title" },
      { name: "complainant", description: "Complainant" },
      { name: "respondent", description: "Respondent" },
      { name: "panelType", description: "Panel or Appellate Body" },
      { name: "docNumber", description: "Document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "gatt.document": [
      { name: "title", description: "Document title" },
      { name: "docNumber", description: "GATT document number" },
      { name: "date", description: "Date" },
      { name: "bisdVolume", description: "BISD volume" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "eu.official_journal": [
      { name: "title", description: "Document title" },
      { name: "documentType", description: "Type (Regulation, Directive, Decision)" },
      { name: "number", description: "Document number" },
      { name: "ojSeries", description: "OJ series (L or C)" },
      { name: "date", description: "Date" },
      { name: "page", description: "Page" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "eu.court": [
      { name: "caseTitle", description: "Case title" },
      { name: "caseNumber", description: "Case number" },
      { name: "court", description: "Court (CJEU, General Court)" },
      { name: "date", description: "Date" },
      { name: "ecrCitation", description: "ECR citation" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "echr.decision": [
      { name: "caseTitle", description: "Case title" },
      { name: "applicationNumber", description: "Application number" },
      { name: "court", description: "Court (ECtHR Grand Chamber, ECtHR Chamber)" },
      { name: "date", description: "Date" },
      { name: "echrReports", description: "ECHR Reports citation" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "supranational.decision": [
      { name: "caseTitle", description: "Case title / parties" },
      { name: "parties", description: "Parties" },
      { name: "court", description: "Court or tribunal" },
      { name: "date", description: "Date" },
      { name: "reportSeries", description: "Report series" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
    "supranational.document": [
      { name: "body", description: "Issuing body" },
      { name: "title", description: "Document title" },
      { name: "documentNumber", description: "Document number" },
      { name: "date", description: "Date" },
      { name: "pinpoint", description: "Pinpoint" },
    ],
  };

  // All foreign.* types share the same schema
  const foreignSchema: FieldDescriptor[] = [
    { name: "foreignSubType", description: '"case", "legislation", or "secondary"' },
    { name: "title", description: "Case name, legislation title, or source title" },
    { name: "citationDetails", description: "FULL citation identifier as used in that jurisdiction (e.g. 2018 FCA 153, [2020] UKSC 5) — do NOT split into parts" },
    { name: "court", description: "Court or body" },
    { name: "year", description: "Year" },
    { name: "pinpoint", description: "Pinpoint reference" },
  ];

  if (sourceType.startsWith("foreign.")) {
    return foreignSchema;
  }

  if (sourceType === "custom") {
    return [
      { name: "customText", description: "Free-text citation" },
      { name: "shortTitle", description: "Short title" },
    ];
  }

  if (sourceType === "explanatory_note") {
    return [
      { name: "noteText", description: "Explanatory note text" },
    ];
  }

  return schemas[sourceType] ?? [
    { name: "author", description: "Author name" },
    { name: "title", description: "Title" },
    { name: "year", description: "Year" },
    { name: "pinpoint", description: "Pinpoint reference" },
  ];
}

// ---------------------------------------------------------------------------
// Deterministic parse -> SourceData mapping
// ---------------------------------------------------------------------------

function mapDeterministicToSourceData(
  parsed: DeterministicParsed,
  rawText: string,
): Partial<SourceData> {
  const data: Partial<SourceData> = {};

  if (parsed.type === "mnc") {
    data.year = parsed.year;
    data.courtId = parsed.court;
    data.mnc = String(parsed.number);
    data.yearType = "square";

    // Try to extract party names from the text preceding the MNC
    const mncIdx = rawText.indexOf(`[${parsed.year}]`);
    if (mncIdx > 0) {
      const partiesStr = rawText.substring(0, mncIdx).trim();
      const vMatch = partiesStr.match(/^(.+?)\s+v\s+(.+)$/i);
      if (vMatch) {
        data.party1 = vMatch[1].trim();
        data.party2 = vMatch[2].trim();
      }
    }
  } else if (parsed.type === "report") {
    data.year = parsed.year;
    data.volume = parsed.volume;
    data.reportSeries = parsed.series;
    data.startingPage = parsed.page;
    data.yearType = "round";

    // Try to extract party names from the text preceding the report citation
    const rptIdx = rawText.indexOf(`(${parsed.year})`);
    if (rptIdx > 0) {
      const partiesStr = rawText.substring(0, rptIdx).trim();
      const vMatch = partiesStr.match(/^(.+?)\s+v\s+(.+)$/i);
      if (vMatch) {
        data.party1 = vMatch[1].trim();
        data.party2 = vMatch[2].trim();
      }
    }
  } else if (parsed.type === "statute") {
    data.title = parsed.title;
    data.year = parsed.year;
    data.jurisdiction = parsed.jurisdiction;
  } else if (parsed.type === "hansard") {
    data.parliament = parsed.parliament;
    data.chamber = parsed.chamber;
    data.date = parsed.date;
    data.page = parsed.page;
    if (parsed.speaker) data.speaker = parsed.speaker;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Corpus entry -> SourceData mapping
// ---------------------------------------------------------------------------

function extractParty1(parties: string): string {
  const vMatch = parties.match(/^(.+?)\s+v\s+/i);
  return vMatch ? vMatch[1].trim() : parties.trim();
}

function extractParty2(parties: string): string {
  const vMatch = parties.match(/\s+v\s+(.+)$/i);
  return vMatch ? vMatch[1].trim() : "";
}

function mapCorpusEntryToSourceData(
  entry: CorpusEntry,
  sourceType: SourceType,
): Partial<SourceData> {
  const data: Partial<SourceData> = {};

  if (sourceType.startsWith("case.")) {
    if (entry.parties) {
      data.party1 = extractParty1(entry.parties);
      data.party2 = extractParty2(entry.parties);
    }
    data.year = entry.year;
    data.courtId = entry.courtOrRegister;

    const mnc = tokeniseMNC(entry.citation);
    if (mnc) {
      data.mnc = String(mnc.number);
      data.yearType = "square";
    }
  } else if (
    sourceType === "legislation.statute" ||
    sourceType === "legislation.delegated"
  ) {
    if (entry.title) data.title = entry.title;
    data.year = entry.year;
    data.jurisdiction = entry.jurisdiction;
  } else {
    if (entry.title) data.title = entry.title;
    data.year = entry.year;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Multi-turn LLM parse
// ---------------------------------------------------------------------------

/** Source type categories for the classification prompt. */
const SOURCE_CATEGORIES = `CASES:
  case.reported, case.unreported.mnc, case.unreported.no_mnc, case.proceeding, case.court_order, case.quasi_judicial, case.arbitration, case.transcript, case.submission

LEGISLATION:
  legislation.statute, legislation.bill, legislation.delegated, legislation.constitution, legislation.explanatory, legislation.quasi

JOURNALS:
  journal.article, journal.online, journal.forthcoming

BOOKS:
  book, book.chapter, book.translated, book.audiobook

REPORTS:
  report, report.parliamentary, report.royal_commission, report.law_reform, report.abs

OTHER SECONDARY:
  research_paper, research_paper.parliamentary, conference_paper, thesis, speech, press_release, hansard, submission.government, evidence.parliamentary, constitutional_convention, dictionary, legal_encyclopedia, looseleaf, ip_material, constitutive_document, newspaper, correspondence, interview, film_tv_media, internet_material, social_media, genai_output

INTERNATIONAL:
  treaty, un.document, un.communication, un.yearbook, icj.decision, icj.pleading, arbitral.state_state, arbitral.individual_state, icc_tribunal.case, wto.document, wto.decision, gatt.document, eu.official_journal, eu.court, echr.decision, supranational.decision, supranational.document

FOREIGN:
  foreign.canada, foreign.china, foreign.france, foreign.germany, foreign.hong_kong, foreign.malaysia, foreign.new_zealand, foreign.singapore, foreign.south_africa, foreign.uk, foreign.usa, foreign.other`;

/**
 * Build the Turn 1 classification prompt — returns ranked candidates.
 */
function buildClassifyMessages(citationText: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are an expert in the Australian Guide to Legal Citation (AGLC4), OSCOLA, and NZLSG.

Given a formatted citation string, identify the most likely source types from the categories below. Return up to 3 ranked candidates with confidence scores. If only one type is likely, return just one.

Handle typographic conventions:
- *text* or _text_ = italicised titles (strip markers)
- Smart quotes (\u2018\u2019\u201C\u201D) = same as straight quotes
- Preserve em/en dashes in values

Source types by category:
${SOURCE_CATEGORIES}

Respond with ONLY valid JSON (no markdown fencing):
{
  "candidates": [
    { "sourceType": "<exact source type string>", "confidence": <0 to 1> },
    ...
  ],
  "standard": "aglc4" | "oscola" | "nzlsg"
}`,
    },
    {
      role: "user",
      content: `Classify this citation:\n\n${citationText}`,
    },
  ];
}

/** A ranked source type candidate from Turn 1. */
interface ClassifyCandidate {
  sourceType: SourceType;
  confidence: number;
}

/**
 * Build the Turn 2 extraction prompt. Includes the field schema for each
 * candidate type so the LLM can pick the best fit and extract into it.
 */
function buildExtractMessages(
  citationText: string,
  classifyResponse: string,
  candidates: ClassifyCandidate[],
  nearbyMatches: CorpusEntry[],
): ChatMessage[] {
  // Build a schema block for each candidate
  const schemaBlocks = candidates.map((c) => {
    const schema = getFieldSchemaForSourceType(c.sourceType);
    const fields = schema
      .map((f) => `    - "${f.name}": ${f.description}`)
      .join("\n");
    return `  "${c.sourceType}" (confidence ${c.confidence}):\n${fields}`;
  });

  const examplesBlock =
    nearbyMatches.length > 0
      ? nearbyMatches
          .map(
            (e, i) =>
              `  ${i + 1}. "${e.citation}"` +
              (e.parties ? ` — parties: ${e.parties}` : "") +
              (e.title ? ` — title: ${e.title}` : "") +
              ` — year: ${e.year}, court/register: ${e.courtOrRegister}, jurisdiction: ${e.jurisdiction}`,
          )
          .join("\n")
      : "  (no corpus examples available)";

  return [
    {
      role: "system",
      content: `You are an expert in Australian legal citation (AGLC4).

You previously classified a citation. Now choose the best source type and extract the structured fields.`,
    },
    {
      role: "user",
      content: `Classify this citation:\n\n${citationText}`,
    },
    {
      role: "assistant",
      content: classifyResponse,
    },
    {
      role: "user",
      content: `Here are the field schemas for your candidate types. Pick the one that best fits the citation and extract the fields using ONLY that type's field names.

${schemaBlocks.join("\n\n")}

Similar entries from a local legal corpus for context:
${examplesBlock}

IMPORTANT:
- First decide which source type is the best match, then use ONLY that type's field names
- Do not invent new field names — only use the ones listed above
- Strip italic markers (*text*) from values
- Only populate fields you are confident about — leave others out
- Also suggest a shortTitle (first party name for cases, short form for legislation)

Respond with ONLY valid JSON (no markdown fencing):
{
  "sourceType": "<the chosen source type>",
  "data": { <fields using ONLY that type's field names> },
  "shortTitle": "<suggested short title>"
}`,
    },
  ];
}

/**
 * Parse JSON from an LLM response, stripping markdown fences if present.
 */
function parseJsonResponse<T>(response: string): T {
  const cleaned = response.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/**
 * Run the two-turn LLM parse: classify (with ranked candidates) then extract.
 *
 * Turn 1 returns up to 3 candidate source types with confidence scores.
 * Turn 2 receives all candidate schemas so the LLM can make a more informed
 * final selection — seeing the available fields often resolves ambiguity that
 * the classification alone cannot.
 */
async function multiTurnLlmParse(
  citationText: string,
  hintSourceType: SourceType,
  llmConfig: LLMConfig,
  nearbyMatches: CorpusEntry[],
): Promise<CorpusEnhancedResult> {
  // ── Turn 1: Classify — get ranked candidates ────────────────────────────
  const classifyMessages = buildClassifyMessages(citationText);
  const classifyResponse = await callLlmMultiTurn(llmConfig, classifyMessages);

  let candidates: ClassifyCandidate[] = [];
  try {
    const rawClassification = parseJsonResponse<unknown>(classifyResponse);

    // Normalise: LLM might return { candidates: [...] }, { sourceType, confidence },
    // or a raw array [{sourceType, confidence}, ...] at the top level.
    let candidateArray: Array<{ sourceType?: string; confidence?: number }> = [];

    if (Array.isArray(rawClassification)) {
      // Raw array at top level
      candidateArray = rawClassification.filter(
        (e): e is Record<string, unknown> => e !== null && typeof e === "object",
      ) as typeof candidateArray;
    } else if (rawClassification !== null && typeof rawClassification === "object") {
      const obj = rawClassification as Record<string, unknown>;
      if (Array.isArray(obj.candidates)) {
        candidateArray = obj.candidates as typeof candidateArray;
      } else if (obj.sourceType) {
        candidateArray = [obj as { sourceType: string; confidence?: number }];
      }
    }

    candidates = candidateArray
      .filter(
        (c) =>
          c.sourceType &&
          SOURCE_TYPES.includes(c.sourceType as SourceType),
      )
      .map((c) => ({
        sourceType: c.sourceType as SourceType,
        confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0)),
      }));
  } catch {
    // If classification JSON fails, fall back to the hint type
  }

  // Always include the hint type if not already a candidate
  if (!candidates.some((c) => c.sourceType === hintSourceType)) {
    candidates.push({ sourceType: hintSourceType, confidence: 0.1 });
  }

  // Sort by confidence descending, cap at 3
  candidates.sort((a, b) => b.confidence - a.confidence);
  candidates = candidates.slice(0, 3);

  // ── Turn 2: Extract — LLM sees all candidate schemas ───────────────────
  const extractMessages = buildExtractMessages(
    citationText,
    classifyResponse,
    candidates,
    nearbyMatches,
  );
  const extractResponse = await callLlmMultiTurn(llmConfig, extractMessages);

  const rawExtracted = parseJsonResponse<unknown>(extractResponse);

  // Defensive: LLM may return an array of results instead of a single object.
  // Normalise to a single extraction object — take the first element if array,
  // or the highest-confidence entry if each has a confidence field.
  let extracted: {
    sourceType?: string;
    data?: Record<string, unknown>;
    shortTitle?: string;
    confidence?: number;
  };

  if (Array.isArray(rawExtracted)) {
    // Pick the entry with the highest confidence, or just the first
    const sorted = rawExtracted
      .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
      .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
    extracted = (sorted[0] ?? {}) as typeof extracted;
  } else if (rawExtracted !== null && typeof rawExtracted === "object") {
    extracted = rawExtracted as typeof extracted;
  } else {
    extracted = {};
  }

  // Defensive: data must be a plain object, not an array or primitive
  if (extracted.data && (Array.isArray(extracted.data) || typeof extracted.data !== "object")) {
    extracted.data = {};
  }

  // The LLM picks the final type in Turn 2 after seeing the schemas
  const finalType =
    extracted.sourceType &&
    SOURCE_TYPES.includes(extracted.sourceType as SourceType)
      ? (extracted.sourceType as SourceType)
      : candidates[0].sourceType;

  return {
    data: (extracted.data ?? {}) as Partial<SourceData>,
    source: "llm",
    warnings: [],
    detectedSourceType:
      finalType !== hintSourceType ? finalType : undefined,
    shortTitle:
      typeof extracted.shortTitle === "string"
        ? extracted.shortTitle
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a citation trying local sources first, then falling back to the
 * multi-turn LLM.
 *
 * 1. Deterministic regex parser (MNC, report, statute, Hansard)
 * 2. Corpus exact resolve
 * 3. Corpus fuzzy search (top result with high confidence)
 * 4. Multi-turn LLM with corpus context
 * 5. Multi-turn LLM without corpus
 */
export async function parseWithCorpusFirst(
  citationText: string,
  sourceType: SourceType,
  llmConfig: LLMConfig | null,
): Promise<CorpusEnhancedResult> {
  const text = citationText.trim();
  if (!text) {
    return { data: {}, source: "parser", warnings: ["Empty citation text."] };
  }

  // ── Step 1: Deterministic parser ──────────────────────────────────────────
  const deterministicResult = parseCitation(text);
  if (deterministicResult) {
    const data = mapDeterministicToSourceData(deterministicResult, text);
    if (Object.keys(data).length > 0) {
      return { data, source: "parser", warnings: [] };
    }
  }

  // ── Step 2: Corpus exact resolve ──────────────────────────────────────────
  const corpusAvailable = checkCorpusAvailable();
  const index = corpusAvailable ? getCorpusIndex() : null;

  if (index) {
    const exact = index.resolve(text);
    if (exact) {
      const data = mapCorpusEntryToSourceData(exact, sourceType);
      if (Object.keys(data).length > 0) {
        return { data, source: "corpus", warnings: [] };
      }
    }

    // ── Step 3: Corpus fuzzy search ───────────────────────────────────────
    const fuzzyResults = index.search(text);
    const topResults = fuzzyResults.slice(0, 3);

    if (topResults.length > 0) {
      const best = topResults[0];
      const normQuery = text
        .replace(/[[\]()]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      const normBest = best.normalisedCitation;

      const isCloseMatch =
        normBest.includes(normQuery) || normQuery.includes(normBest);

      if (isCloseMatch) {
        const data = mapCorpusEntryToSourceData(best, sourceType);
        if (Object.keys(data).length > 0) {
          return { data, source: "corpus", warnings: [] };
        }
      }

      // ── Step 4: Multi-turn LLM with corpus context ──────────────────────
      if (llmConfig && llmConfig.enabled) {
        try {
          return await multiTurnLlmParse(
            text,
            sourceType,
            llmConfig,
            topResults,
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "LLM parsing failed";
          return {
            data: {},
            source: "llm",
            warnings: [`AI parse with corpus context failed: ${msg}`],
          };
        }
      }
    }
  }

  // ── Step 5: Multi-turn LLM without corpus ─────────────────────────────────
  if (llmConfig && llmConfig.enabled) {
    try {
      return await multiTurnLlmParse(text, sourceType, llmConfig, []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "LLM parsing failed";
      return { data: {}, source: "llm", warnings: [`AI parse failed: ${msg}`] };
    }
  }

  // ── No match at all ─────────────────────────────────────────────────────
  return {
    data: {},
    source: "parser",
    warnings: ["No local match found and LLM is not available."],
  };
}
