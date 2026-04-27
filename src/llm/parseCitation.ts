/**
 * AI-ENH-001: Parse Formatted Citation
 *
 * Accepts a fully formatted citation string (AGLC4, OSCOLA, or NZLSG) and
 * asks the LLM to identify the citation standard, source type, extract all
 * structured fields, and return a confidence score. The extracted fields map
 * directly to Citation.data for auto-populating the insert form.
 *
 * Supersedes the earlier LLM-002 basic parse — this version includes detailed
 * field mapping examples, handles typographic markers, and returns confidence.
 */

import { SourceType } from "../types/citation";
import { LLMConfig } from "./config";
import { callLlm } from "./client";

/** All SourceType literal values, kept in sync with the union. */
const SOURCE_TYPES: SourceType[] = [
  "case.reported",
  "case.unreported.mnc",
  "case.unreported.no_mnc",
  "case.proceeding",
  "case.court_order",
  "case.quasi_judicial",
  "case.arbitration",
  "case.transcript",
  "case.submission",
  "legislation.statute",
  "legislation.bill",
  "legislation.delegated",
  "legislation.constitution",
  "legislation.explanatory",
  "legislation.quasi",
  "journal.article",
  "journal.online",
  "journal.forthcoming",
  "book",
  "book.chapter",
  "book.translated",
  "book.audiobook",
  "report",
  "report.parliamentary",
  "report.royal_commission",
  "report.law_reform",
  "report.abs",
  "research_paper",
  "research_paper.parliamentary",
  "conference_paper",
  "thesis",
  "speech",
  "press_release",
  "hansard",
  "submission.government",
  "evidence.parliamentary",
  "constitutional_convention",
  "dictionary",
  "legal_encyclopedia",
  "looseleaf",
  "ip_material",
  "constitutive_document",
  "newspaper",
  "correspondence",
  "interview",
  "film_tv_media",
  "internet_material",
  "social_media",
  "genai_output",
  "treaty",
  "un.document",
  "un.communication",
  "un.yearbook",
  "icj.decision",
  "icj.pleading",
  "arbitral.state_state",
  "arbitral.individual_state",
  "icc_tribunal.case",
  "wto.document",
  "wto.decision",
  "gatt.document",
  "eu.official_journal",
  "eu.court",
  "echr.decision",
  "supranational.decision",
  "supranational.document",
  "foreign.canada",
  "foreign.china",
  "foreign.france",
  "foreign.germany",
  "foreign.hong_kong",
  "foreign.malaysia",
  "foreign.new_zealand",
  "foreign.singapore",
  "foreign.south_africa",
  "foreign.uk",
  "foreign.usa",
  "foreign.other",
];

const SYSTEM_PROMPT = `You are an expert in Australian, UK, and New Zealand legal citation standards (AGLC4, OSCOLA, NZLSG).

Given a fully formatted citation string, you must:
1. Identify the citation standard used (aglc4, oscola, or nzlsg).
2. Identify the source type from the list below.
3. Extract ALL structured fields as JSON matching the expected data shape for that source type.
4. Provide a confidence score (0 to 1) reflecting how certain you are of the parse.

Handle typographic conventions:
- Italic markers: *text* or _text_ indicate italicised titles; strip the markers and extract the plain text.
- Curly/smart quotes: treat \u2018 \u2019 \u201C \u201D the same as straight quotes.
- Em dashes (\u2014) and en dashes (\u2013): preserve in values where they appear (e.g. page ranges).

Source types (use these exact string values):
${SOURCE_TYPES.map((t) => `  - "${t}"`).join("\n")}

FIELD MAPPING BY SOURCE TYPE:

Reported cases (case.reported):
  party1, party2, yearType ("round" or "square"), year, volume, reportSeries, startingPage, pinpoint, courtId
  parallelCitations: array of { yearType, year, volume?, reportSeries, startingPage }
  Example: "Mabo v Queensland (No 2) (1992) 175 CLR 1" ->
    { party1: "Mabo", party2: "Queensland (No 2)", yearType: "round", year: "1992", volume: "175", reportSeries: "CLR", startingPage: "1" }

Unreported cases with MNC (case.unreported.mnc):
  party1, party2, year, courtId, mnc (medium-neutral citation number), pinpoint
  Example: "Kozarov v Victoria [2022] HCA 12" ->
    { party1: "Kozarov", party2: "Victoria", year: "2022", courtId: "HCA", mnc: "12", yearType: "square" }

Legislation (legislation.statute):
  title, year, jurisdiction (e.g. "Cth", "NSW", "Vic"), pinpoint
  Example: "Competition and Consumer Act 2010 (Cth) s 51" ->
    { title: "Competition and Consumer Act", year: "2010", jurisdiction: "Cth", pinpoint: "s 51" }

Journal articles (journal.article):
  authors (array of { givenNames, surname }), title, year, volume, issue, journal, startingPage, pinpoint
  Example: "James Crawford, 'The Rule of Law' (2020) 44(2) Melbourne University Law Review 123, 130" ->
    { authors: [{ givenNames: "James", surname: "Crawford" }], title: "The Rule of Law", year: "2020", volume: "44", issue: "2", journal: "Melbourne University Law Review", startingPage: "123", pinpoint: "130" }

Books (book):
  authors (array of { givenNames, surname }), title, publisher, edition, year, pinpoint
  Example: "Mark Leeming, Authority to Decide (Federation Press, 2nd ed, 2020) 42" ->
    { authors: [{ givenNames: "Mark", surname: "Leeming" }], title: "Authority to Decide", publisher: "Federation Press", edition: "2nd", year: "2020", pinpoint: "42" }

Treaties (treaty):
  title, parties, openedDate, treatySeries, volume (as seriesVolume), startingPage, entryIntoForceDate, notYetInForce
  Example: "Convention on the Rights of the Child, opened for signature 20 November 1989, 1577 UNTS 3 (entered into force 2 September 1990)" ->
    { title: "Convention on the Rights of the Child", openedDate: "20 November 1989", treatySeries: "UNTS", volume: "1577", startingPage: "3", entryIntoForceDate: "2 September 1990" }

Foreign jurisdictions (foreign.canada, foreign.uk, foreign.usa, foreign.new_zealand, etc.):
  title (case name or legislation title), citationDetails (the FULL citation string as used in that jurisdiction e.g. "2018 FCA 153" or "[2020] UKSC 5"), court, year, foreignSubType ("case", "legislation", or "secondary"), pinpoint
  IMPORTANT: citationDetails must be the COMPLETE citation identifier — do NOT split MNCs into separate fields.
  Example: "*Tsleil-Waututh Nation v Canada (Attorney General)* 2018 FCA 153, [558]–[561]" ->
    { title: "Tsleil-Waututh Nation v Canada (Attorney General)", citationDetails: "2018 FCA 153", court: "FCA", year: "2018", foreignSubType: "case", pinpoint: "[558]–[561]" }

Also extract a suggested shortTitle where appropriate (e.g. first party name for cases, abbreviated title for legislation).

Respond with ONLY valid JSON in this exact shape (no markdown fencing):
{
  "standard": "aglc4" | "oscola" | "nzlsg",
  "sourceType": "<one of the source type strings above>",
  "data": { <extracted fields matching the mappings above> },
  "shortTitle": "<suggested short title or empty string>",
  "confidence": <number between 0 and 1>
}`;

export interface ParsedCitation {
  sourceType: SourceType;
  data: Record<string, unknown>;
  confidence: number;
  standard?: "aglc4" | "oscola" | "nzlsg";
  shortTitle?: string;
}

/**
 * Parse a formatted citation string into structured fields using an LLM.
 *
 * Returns the identified source type, extracted field data matching the
 * Citation.data shape, a confidence score, and optionally the detected
 * citation standard and a suggested short title.
 */
export async function parseCitationText(
  rawText: string,
  config: LLMConfig,
): Promise<ParsedCitation> {
  const userPrompt = `Parse this formatted citation into structured fields:\n\n${rawText}`;

  const response = await callLlm(config, SYSTEM_PROMPT, userPrompt);

  // Strip potential markdown code fences the model may add despite instructions.
  const cleaned = response.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  const parsed = JSON.parse(cleaned) as {
    standard?: string;
    sourceType: string;
    data: Record<string, unknown>;
    shortTitle?: string;
    confidence?: number;
  };

  // Validate sourceType is a known value.
  if (!SOURCE_TYPES.includes(parsed.sourceType as SourceType)) {
    throw new Error(`LLM returned unknown source type: ${parsed.sourceType}`);
  }

  // Clamp confidence to [0, 1].
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

  // Validate standard if present.
  const validStandards = ["aglc4", "oscola", "nzlsg"];
  const standard = validStandards.includes(parsed.standard ?? "")
    ? (parsed.standard as "aglc4" | "oscola" | "nzlsg")
    : undefined;

  return {
    sourceType: parsed.sourceType as SourceType,
    data: parsed.data ?? {},
    confidence,
    standard,
    shortTitle: typeof parsed.shortTitle === "string" ? parsed.shortTitle : undefined,
  };
}
