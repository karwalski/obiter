/**
 * Corpus Index Design (Story 17.7)
 *
 * Defines the data model and query interface for the bundled Open Australian
 * Legal Corpus index. The corpus contains ~232k documents; the full text is
 * hosted on Obiter Cloud, but the citation index can be searched locally.
 */

/** A single entry in the corpus index. */
export interface CorpusEntry {
  /** The original citation string as it appears in the corpus. */
  citation: string;
  /** Normalised form used for matching (lowercase, no brackets, collapsed ws). */
  normalisedCitation: string;
  /** Jurisdiction code, e.g. "Cth", "NSW", "Qld". */
  jurisdiction: string;
  /** Court abbreviation (cases) or register name (legislation). */
  courtOrRegister: string;
  /** Document type. */
  type: "case" | "primary_legislation" | "secondary_legislation" | "bill";
  /** Decision or enactment year. */
  year: number;
  /** Party names (cases only). */
  parties?: string;
  /** Short title (legislation only). */
  title?: string;
  /** Canonical URL to the source document. */
  sourceUrl: string;
  /** Unique document identifier within the corpus. */
  corpusDocId: string;
}

/** Filters for narrowing corpus search results. */
export interface CorpusSearchFilters {
  jurisdiction?: string;
  type?: string;
  yearFrom?: number;
  yearTo?: number;
}

/**
 * Query interface over the corpus index.
 *
 * The initial implementation is in-memory array filtering
 * ({@link ../inMemoryCorpusIndex}). Production will use SQLite FTS5 or
 * a similar full-text engine for sub-millisecond queries over 232k entries.
 */
export interface CorpusIndex {
  /** Semantic version of the loaded corpus data. */
  version: string;
  /** Number of entries currently loaded. */
  entryCount: number;
  /** Free-text search with optional filters. */
  search(query: string, filters?: CorpusSearchFilters): CorpusEntry[];
  /** Resolve a citation string to a single best-match entry (or null). */
  resolve(citation: string): CorpusEntry | null;
  /** Retrieve an entry by its corpus document ID. */
  getById(corpusDocId: string): CorpusEntry | null;
}
