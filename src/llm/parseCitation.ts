/**
 * LLM-002: Parse Citation Text
 *
 * Takes free-form citation text (e.g. pasted from a document or typed by the
 * user) and asks the LLM to identify the AGLC4 source type and extract
 * structured field data.
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

const SYSTEM_PROMPT = `You are an expert in the Australian Guide to Legal Citation, 4th Edition (AGLC4).

Given a raw citation string, you must:
1. Identify which AGLC4 source type the citation belongs to.
2. Extract every identifiable field from the citation text.

Source types (use these exact string values):
${SOURCE_TYPES.map((t) => `  - "${t}"`).join("\n")}

Common fields by category:
- Cases: caseName, year, volume, reportSeries, startingPage, court, judgmentNumber, parties, judicialOfficers
- Legislation: title, year, jurisdiction, section, chapter, schedule
- Journal articles: authors (array of {givenNames, surname}), title, year, volume, journal, startingPage
- Books: authors, title, publisher, year, edition, editors, chapter, pages
- Reports: author/body, title, reportNumber, year
- Treaties: title, openedDate, treatySeries, volume, page, entryIntoForce
- Online/Internet: author, title, url, accessDate, websiteName

Respond with ONLY valid JSON in this exact shape (no markdown fencing):
{
  "sourceType": "<one of the source type strings above>",
  "data": { <extracted fields> }
}`;

export interface ParsedCitation {
  sourceType: SourceType;
  data: Record<string, unknown>;
}

/**
 * Parse unstructured citation text into a typed source record using an LLM.
 */
export async function parseCitationText(
  rawText: string,
  config: LLMConfig,
): Promise<ParsedCitation> {
  const userPrompt = `Parse this citation:\n\n${rawText}`;

  const response = await callLlm(config, SYSTEM_PROMPT, userPrompt);

  // Strip potential markdown code fences the model may add despite instructions.
  const cleaned = response.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  const parsed = JSON.parse(cleaned) as ParsedCitation;

  // Validate sourceType is a known value.
  if (!SOURCE_TYPES.includes(parsed.sourceType)) {
    throw new Error(`LLM returned unknown source type: ${parsed.sourceType}`);
  }

  return parsed;
}
