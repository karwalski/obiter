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
import { checkCorpusAvailable, getCorpusIndex } from "../api/corpus/corpusDownload";
import { callLlmMultiTurn, type ChatMessage } from "./client";
import { verifyParse, type VerificationSummary } from "./parseVerification";
import { getFieldSchemaForSourceType } from "./fieldSchema";
import type { IntroductorySignal } from "../types/citation";

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
  /** LCT-010: verification-loop decisions and findings (LLM results only). */
  signal?: IntroductorySignal;
  commentaryBefore?: string;
  commentaryAfter?: string;
  notes?: string[];
  verification?: VerificationSummary;
}

// ---------------------------------------------------------------------------
// Field schema — comprehensive map of every source type's form fields
// ---------------------------------------------------------------------------

export type { FieldDescriptor } from "./fieldSchema";

/** All known source type string values. */
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
  "book.ebook",
  "periodical",
  "treaty.mou",
  "custom",
  "explanatory_note",
];

export { getFieldSchemaForSourceType } from "./fieldSchema";

// ---------------------------------------------------------------------------
// Deterministic parse -> SourceData mapping
// ---------------------------------------------------------------------------

function mapDeterministicToSourceData(
  parsed: DeterministicParsed,
  rawText: string
): Partial<SourceData> {
  const data: Partial<SourceData> = {};

  if (parsed.type === "mnc") {
    data.year = parsed.year;
    // Engine field names vary by source type: case.reported expects
    // `courtId`, case.unreported.mnc expects `court` + `caseNumber`. Set
    // every alias so whichever dispatcher consumes the data finds the
    // value (and the formatter no longer renders "0" for a missing case
    // number).
    data.court = parsed.court;
    data.courtId = parsed.court;
    data.caseNumber = String(parsed.number);
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
      } else if (partiesStr.length > 0) {
        // Single-party form: "Re X", "Ex parte X", or any unmatched
        // pre-MNC text. Store the whole thing as party1 so the user
        // can edit either part; the formatter renders single-party
        // names without injecting " v ".
        data.party1 = partiesStr;
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
  sourceType: SourceType
): Partial<SourceData> {
  const data: Partial<SourceData> = {};

  if (sourceType.startsWith("case.")) {
    if (entry.parties) {
      data.party1 = extractParty1(entry.parties);
      data.party2 = extractParty2(entry.parties);
    }
    data.year = entry.year;
    // The engine reads different keys per case sub-type:
    //   case.reported       → `courtId`
    //   case.unreported.mnc → `court` (+ `caseNumber` instead of `mnc`)
    // Populate both keys so either dispatcher finds the value, and put the
    // MNC number under the right key for case.unreported.mnc.
    if (entry.courtOrRegister) {
      data.courtId = entry.courtOrRegister;
      data.court = entry.courtOrRegister;
    }

    const mnc = tokeniseMNC(entry.citation);
    if (mnc) {
      if (sourceType === "case.unreported.mnc") {
        data.caseNumber = String(mnc.number);
      } else {
        data.mnc = String(mnc.number);
      }
      data.yearType = "square";
    }
  } else if (sourceType === "legislation.statute" || sourceType === "legislation.delegated") {
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
  book, book.chapter, book.translated, book.audiobook, book.ebook

REPORTS:
  report, report.parliamentary, report.royal_commission, report.law_reform, report.abs

OTHER SECONDARY:
  research_paper, research_paper.parliamentary, conference_paper, thesis, speech, press_release, hansard, submission.government, evidence.parliamentary, constitutional_convention, dictionary, legal_encyclopedia, looseleaf, ip_material, constitutive_document, periodical, newspaper, correspondence, interview, film_tv_media, internet_material, social_media, genai_output

INTERNATIONAL:
  treaty, treaty.mou, un.document, un.communication, un.yearbook, icj.decision, icj.pleading, arbitral.state_state, arbitral.individual_state, icc_tribunal.case, wto.document, wto.decision, gatt.document, eu.official_journal, eu.court, echr.decision, supranational.decision, supranational.document

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
  nearbyMatches: CorpusEntry[]
): ChatMessage[] {
  // Build a schema block for each candidate
  const schemaBlocks = candidates.map((c) => {
    const schema = getFieldSchemaForSourceType(c.sourceType);
    const fields = schema.map((f) => `    - "${f.name}": ${f.description}`).join("\n");
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
              ` — year: ${e.year}, court/register: ${e.courtOrRegister}, jurisdiction: ${e.jurisdiction}`
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
- Case parties are separated ONLY by " v ". "&" and "and" occurring inside a party name (eg "Land & House Property Corporation") are part of that name — never split a party there
- Strip italic markers (*text*) from values
- Only populate fields you are confident about — leave others out
- Never invent a value or take one from the corpus entries above: every year, volume, page and number must appear in the citation itself, and each number in the citation fills at most one field
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
  nearbyMatches: CorpusEntry[]
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
        (e): e is Record<string, unknown> => e !== null && typeof e === "object"
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
      .filter((c) => c.sourceType && SOURCE_TYPES.includes(c.sourceType as SourceType))
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
    nearbyMatches
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
    extracted.sourceType && SOURCE_TYPES.includes(extracted.sourceType as SourceType)
      ? (extracted.sourceType as SourceType)
      : candidates[0].sourceType;

  // ── Verify: check, render and let the model confirm or correct (LCT-010)
  const verified = await verifyParse(
    citationText,
    {
      sourceType: finalType,
      data: extracted.data ?? {},
      shortTitle: typeof extracted.shortTitle === "string" ? extracted.shortTitle : undefined,
    },
    llmConfig
  );

  return {
    data: verified.data as Partial<SourceData>,
    source: "llm",
    warnings: verified.warnings,
    detectedSourceType: verified.sourceType !== hintSourceType ? verified.sourceType : undefined,
    shortTitle: verified.shortTitle,
    signal: verified.signal,
    commentaryBefore: verified.commentaryBefore,
    commentaryAfter: verified.commentaryAfter,
    notes: verified.notes,
    verification: verified.verification,
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
  llmConfig: LLMConfig | null
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

      const isCloseMatch = normBest.includes(normQuery) || normQuery.includes(normBest);

      if (isCloseMatch) {
        const data = mapCorpusEntryToSourceData(best, sourceType);
        if (Object.keys(data).length > 0) {
          return { data, source: "corpus", warnings: [] };
        }
      }

      // ── Step 4: Multi-turn LLM with corpus context ──────────────────────
      if (llmConfig && llmConfig.enabled) {
        try {
          return await multiTurnLlmParse(text, sourceType, llmConfig, topResults);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "LLM parsing failed";
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
