/**
 * LLM-005: Classify Source Type
 *
 * Given a free-text description of a legal source, asks the LLM to
 * determine the most appropriate AGLC4 source type, a confidence score,
 * and a brief explanation.
 */

import { SourceType } from "../types/citation";
import { LLMConfig } from "./config";
import { callLlm } from "./client";

/** All SourceType literal values. */
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

Given a description of a legal source, classify it into the most appropriate
AGLC4 source type. Consider:
- The jurisdiction and legal system
- The type of document (case, legislation, secondary source, etc.)
- Any distinguishing features (e.g. medium-neutral citation, explanatory memorandum)

Source types (use these exact string values):
${SOURCE_TYPES.map((t) => `  - "${t}"`).join("\n")}

Respond with ONLY valid JSON in this exact shape (no markdown fencing):
{
  "sourceType": "<one of the source type strings above>",
  "confidence": <number between 0 and 1>,
  "explanation": "<brief explanation of why this source type was chosen>"
}`;

export interface ClassificationResult {
  sourceType: SourceType;
  confidence: number;
  explanation: string;
}

/**
 * Classify a free-text source description into an AGLC4 source type.
 */
export async function classifySourceType(
  description: string,
  config: LLMConfig,
): Promise<ClassificationResult> {
  const userPrompt = `Classify this source:\n\n${description}`;

  const response = await callLlm(config, SYSTEM_PROMPT, userPrompt);

  const cleaned = response.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  const result = JSON.parse(cleaned) as ClassificationResult;

  // Validate sourceType.
  if (!SOURCE_TYPES.includes(result.sourceType)) {
    throw new Error(
      `LLM returned unknown source type: ${result.sourceType}`,
    );
  }

  // Clamp confidence to [0, 1].
  result.confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));

  return result;
}
