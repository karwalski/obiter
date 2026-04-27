/**
 * AI-ENH-002: Corpus-Enhanced Citation Parsing
 *
 * Wraps the citation parse flow to try fast local sources (deterministic
 * parser, then corpus index) before falling back to the LLM. When the LLM
 * is used, nearby corpus matches are included in the prompt as grounding
 * examples so the model returns field names that match the form schema.
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
import { parseCitationText } from "./parseCitation";
import { callLlm } from "./client";

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
// Field schema helper
// ---------------------------------------------------------------------------

interface FieldDescriptor {
  name: string;
  description: string;
}

/**
 * Return the expected form field names for a given source type.
 * Used to ground the LLM prompt so it returns the correct keys.
 */
export function getFieldSchemaForSourceType(
  sourceType: SourceType,
): FieldDescriptor[] {
  if (sourceType === "case.reported") {
    return [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      {
        name: "yearType",
        description: 'Bracket type for the year: "round" or "square"',
      },
      { name: "year", description: "Year of the decision" },
      { name: "volume", description: "Report volume number" },
      { name: "reportSeries", description: "Report series abbreviation (e.g. CLR)" },
      { name: "startingPage", description: "Starting page number" },
      { name: "pinpoint", description: "Pinpoint reference" },
      { name: "courtId", description: "Court abbreviation" },
    ];
  }

  if (sourceType === "case.unreported.mnc") {
    return [
      { name: "party1", description: "First party name" },
      { name: "party2", description: "Second party name" },
      { name: "year", description: "Year of the decision" },
      { name: "courtId", description: "Court abbreviation" },
      { name: "mnc", description: "Medium neutral citation number" },
      { name: "yearType", description: 'Bracket type: "square"' },
      { name: "pinpoint", description: "Pinpoint reference" },
    ];
  }

  if (sourceType === "legislation.statute") {
    return [
      { name: "title", description: "Short title of the Act" },
      { name: "year", description: "Year of enactment" },
      { name: "jurisdiction", description: 'Jurisdiction abbreviation (e.g. "Cth", "NSW")' },
      { name: "pinpoint", description: "Section / schedule pinpoint" },
    ];
  }

  if (sourceType === "journal.article" || sourceType === "journal.online") {
    return [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Article title" },
      { name: "year", description: "Publication year" },
      { name: "volume", description: "Journal volume" },
      { name: "issue", description: "Journal issue number" },
      { name: "journal", description: "Journal name" },
      { name: "startingPage", description: "Starting page" },
      { name: "pinpoint", description: "Pinpoint page" },
    ];
  }

  if (sourceType === "book" || sourceType === "book.chapter") {
    return [
      { name: "authors", description: "Array of { givenNames, surname }" },
      { name: "title", description: "Book title" },
      { name: "publisher", description: "Publisher name" },
      { name: "edition", description: "Edition number" },
      { name: "year", description: "Publication year" },
      { name: "pinpoint", description: "Pinpoint page" },
    ];
  }

  if (sourceType === "treaty") {
    return [
      { name: "title", description: "Treaty title" },
      { name: "parties", description: "Parties to the treaty" },
      { name: "openedDate", description: "Date opened for signature" },
      { name: "treatySeries", description: "Treaty series abbreviation (e.g. UNTS)" },
      { name: "seriesVolume", description: "Series volume number" },
      { name: "startingPage", description: "Starting page in the series" },
      { name: "entryIntoForceDate", description: "Date of entry into force" },
      { name: "notYetInForce", description: "Whether not yet in force (boolean)" },
    ];
  }

  if (sourceType === "icj.decision") {
    return [
      { name: "caseTitle", description: "The title of the case" },
      { name: "parties", description: "The parties (e.g. Portugal v Australia)" },
      { name: "decisionType", description: "Judgment, Advisory Opinion, or Order" },
      { name: "year", description: "Year of the decision" },
      { name: "page", description: "ICJ Reports starting page" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ];
  }

  if (sourceType === "hansard") {
    return [
      { name: "parliament", description: "Parliament name (e.g. Commonwealth)" },
      { name: "chamber", description: "Chamber (e.g. Senate, House of Representatives)" },
      { name: "date", description: "Date of the debate" },
      { name: "page", description: "Page number" },
      { name: "speaker", description: "Name of the speaker" },
    ];
  }

  if (
    sourceType === "report" ||
    sourceType === "report.parliamentary" ||
    sourceType === "report.law_reform"
  ) {
    return [
      { name: "authors", description: "Array of { givenNames, surname } or body name" },
      { name: "title", description: "Report title" },
      { name: "year", description: "Publication year" },
      { name: "reportNumber", description: "Report number" },
      { name: "pinpoint", description: "Pinpoint reference" },
    ];
  }

  // Generic fallback
  return [
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

/**
 * Extract the first party from a "Party1 v Party2" string.
 */
function extractParty1(parties: string): string {
  const vMatch = parties.match(/^(.+?)\s+v\s+/i);
  return vMatch ? vMatch[1].trim() : parties.trim();
}

/**
 * Extract the second party from a "Party1 v Party2" string.
 */
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

    // Try to parse MNC from the corpus citation
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
    // Generic: populate what we can
    if (entry.title) data.title = entry.title;
    data.year = entry.year;
  }

  return data;
}

// ---------------------------------------------------------------------------
// Corpus-context-enhanced LLM prompt
// ---------------------------------------------------------------------------

function buildCorpusContextPrompt(
  citationText: string,
  sourceType: SourceType,
  nearbyMatches: CorpusEntry[],
): { system: string; user: string } {
  const schema = getFieldSchemaForSourceType(sourceType);
  const schemaBlock = schema
    .map((f) => `  - ${f.name}: ${f.description}`)
    .join("\n");

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

  const system = `You are an expert in Australian legal citation (AGLC4).

Parse the citation into JSON with EXACTLY these field names for source type "${sourceType}":
${schemaBlock}

Here are similar entries from the local corpus for context:
${examplesBlock}

Respond with ONLY valid JSON (no markdown fencing):
{
  "sourceType": "<detected source type>",
  "data": { <fields using the names above> },
  "shortTitle": "<suggested short title>",
  "confidence": <0 to 1>
}`;

  const user = `Parse this citation:\n\n${citationText}`;

  return { system, user };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse a citation trying local sources first, then falling back to the LLM.
 *
 * 1. Deterministic regex parser (MNC, report, statute, Hansard)
 * 2. Corpus exact resolve
 * 3. Corpus fuzzy search (top result with high confidence)
 * 4. LLM with corpus context (if corpus has near-matches)
 * 5. LLM without corpus (standard path)
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
      // Use the best match if it looks close (simple heuristic: the
      // normalised citation of the top hit is a substring of the query
      // or vice-versa, which indicates high confidence).
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

      // ── Step 4: LLM with corpus context ─────────────────────────────────
      if (llmConfig && llmConfig.enabled) {
        try {
          const { system, user } = buildCorpusContextPrompt(
            text,
            sourceType,
            topResults,
          );
          const response = await callLlm(llmConfig, system, user);
          const cleaned = response
            .replace(/^```(?:json)?\s*|\s*```$/g, "")
            .trim();
          const parsed = JSON.parse(cleaned) as {
            sourceType?: string;
            data: Record<string, unknown>;
            shortTitle?: string;
            confidence?: number;
          };

          return {
            data: parsed.data ?? {},
            source: "llm",
            warnings: [],
            detectedSourceType: parsed.sourceType as SourceType | undefined,
            shortTitle:
              typeof parsed.shortTitle === "string"
                ? parsed.shortTitle
                : undefined,
          };
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

  // ── Step 5: LLM without corpus ──────────────────────────────────────────
  if (llmConfig && llmConfig.enabled) {
    try {
      const result = await parseCitationText(text, llmConfig);
      return {
        data: result.data,
        source: "llm",
        warnings: [],
        detectedSourceType: result.sourceType,
        shortTitle: result.shortTitle,
      };
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
