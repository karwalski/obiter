/**
 * Corpus Source Adapter (Story 17.10)
 *
 * Wraps the in-memory corpus index as a {@link SourceAdapter} so the
 * Source Orchestrator can query the Open Australian Legal Corpus alongside
 * live adapters (AustLII, Jade, FRL, etc.).
 *
 * Works offline when the corpus index is loaded.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";
import type { CorpusEntry } from "../corpus/corpusIndex";
import { checkCorpusAvailable, getCorpusIndex } from "../corpus/corpusDownload";

const ATTRIBUTION = "via Open Australian Legal Corpus (CC BY 4.0)";

/** Convert a CorpusEntry to the SourceAdapter's LookupResult format. */
function entryToLookupResult(entry: CorpusEntry): LookupResult {
  const displayTitle =
    entry.type === "case"
      ? entry.parties ?? entry.citation
      : entry.title ?? entry.citation;

  // Put the full citation in snippet so handleCaseSelect can parse
  // MNC ([YYYY] CourtCode N) and court from it.
  const snippetParts = [entry.citation];
  if (entry.jurisdiction) snippetParts.push(entry.jurisdiction);
  if (entry.courtOrRegister && !entry.citation.includes(entry.courtOrRegister)) {
    snippetParts.push(entry.courtOrRegister);
  }

  return {
    title: displayTitle,
    snippet: snippetParts.join(" — "),
    sourceId: entry.corpusDocId,
    confidence: 0.8,
    sourceUrl: entry.sourceUrl,
    attribution: ATTRIBUTION,
  };
}

/** Convert a CorpusEntry to the SourceAdapter's SourceMetadata format. */
function entryToMetadata(entry: CorpusEntry): SourceMetadata {
  return {
    title: entry.title ?? entry.parties ?? entry.citation,
    parties: entry.parties,
    year: entry.year,
    court: entry.type === "case" ? entry.courtOrRegister : undefined,
    jurisdiction: entry.jurisdiction,
    mnc: entry.type === "case" ? entry.citation : undefined,
    sourceUrl: entry.sourceUrl,
    corpusDocId: entry.corpusDocId,
    attribution: ATTRIBUTION,
  };
}

export class CorpusAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "corpus",
    displayName: "Open Australian Legal Corpus",
    jurisdictions: ["AU"],
    contentTypes: ["case", "legislation"],
    accessTier: "open",
    licence: "CC BY 4.0 (Isaacus)",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: Infinity, burst: Infinity },
    fragile: false,
  };

  /**
   * Search the corpus index. Maps SourceAdapter SearchFilters to the
   * corpus index's CorpusSearchFilters format.
   */
  async search(
    query: string,
    filters?: SearchFilters,
  ): Promise<LookupResult[]> {
    const index = getCorpusIndex();
    if (!index) {
      return [];
    }

    const corpusFilters: {
      jurisdiction?: string;
      type?: string;
      yearFrom?: number;
      yearTo?: number;
    } = {};

    if (filters?.jurisdiction) {
      corpusFilters.jurisdiction = filters.jurisdiction;
    }
    if (filters?.contentType) {
      // Map SourceAdapter content types to corpus types
      if (filters.contentType === "case") {
        corpusFilters.type = "case";
      } else if (filters.contentType === "legislation") {
        corpusFilters.type = "primary_legislation";
      }
    }
    if (filters?.yearFrom != null) {
      corpusFilters.yearFrom = filters.yearFrom;
    }
    if (filters?.yearTo != null) {
      corpusFilters.yearTo = filters.yearTo;
    }

    const entries = index.search(query, corpusFilters);
    return entries.map(entryToLookupResult);
  }

  /**
   * Resolve a citation directly against the corpus index.
   * Returns metadata if the citation matches a corpus entry.
   */
  async resolve(citation: string): Promise<SourceMetadata | null> {
    const index = getCorpusIndex();
    if (!index) {
      return null;
    }

    const entry = index.resolve(citation);
    return entry ? entryToMetadata(entry) : null;
  }

  /**
   * Retrieve full metadata by corpus document ID.
   */
  async getMetadata(id: string): Promise<SourceMetadata | null> {
    const index = getCorpusIndex();
    if (!index) {
      return null;
    }

    const entry = index.getById(id);
    return entry ? entryToMetadata(entry) : null;
  }

  /**
   * Health check: healthy if the corpus is loaded, offline otherwise.
   */
  async healthcheck(): Promise<AdapterHealth> {
    return checkCorpusAvailable() ? "healthy" : "offline";
  }
}
