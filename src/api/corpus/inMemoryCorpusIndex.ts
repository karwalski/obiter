/**
 * In-Memory Corpus Index (Story 17.7)
 *
 * Array-backed implementation of {@link CorpusIndex} suitable for initial
 * integration and testing. Production will migrate to SQLite FTS5 or similar
 * once the full ~232k-entry corpus is wired to Obiter Cloud.
 */

import type { CorpusEntry, CorpusIndex, CorpusSearchFilters } from "./corpusIndex";

/**
 * Normalise a citation string for matching:
 * - strip square brackets
 * - lowercase
 * - collapse whitespace
 */
export function normaliseCitation(raw: string): string {
  return raw
    .replace(/[[\]()]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export class InMemoryCorpusIndex implements CorpusIndex {
  private entries: CorpusEntry[] = [];
  private byId: Map<string, CorpusEntry> = new Map();
  private byNormCitation: Map<string, CorpusEntry> = new Map();

  version = "0.0.0";

  get entryCount(): number {
    return this.entries.length;
  }

  /**
   * Bulk-load entries into the index, replacing any previous data.
   * Normalised citations are computed if not already present on each entry.
   */
  loadFromJson(entries: CorpusEntry[], version = "0.0.0"): void {
    this.version = version;
    this.entries = entries.map((e) => ({
      ...e,
      normalisedCitation: e.normalisedCitation || normaliseCitation(e.citation),
    }));
    this.byId = new Map(this.entries.map((e) => [e.corpusDocId, e]));
    this.byNormCitation = new Map(
      this.entries.map((e) => [e.normalisedCitation, e]),
    );
  }

  /**
   * Case-insensitive substring search across citation, parties, and title.
   * Applies optional jurisdiction, type, and year-range filters.
   */
  search(query: string, filters?: CorpusSearchFilters): CorpusEntry[] {
    const q = query.toLowerCase().trim();

    return this.entries.filter((entry) => {
      // Apply filters first (cheap)
      if (filters?.jurisdiction && entry.jurisdiction !== filters.jurisdiction) {
        return false;
      }
      if (filters?.type && entry.type !== filters.type) {
        return false;
      }
      if (filters?.yearFrom != null && entry.year < filters.yearFrom) {
        return false;
      }
      if (filters?.yearTo != null && entry.year > filters.yearTo) {
        return false;
      }

      // Empty query with filters only — return all matching entries
      if (!q) {
        return true;
      }

      // Substring match on searchable fields
      const haystack = [
        entry.citation,
        entry.parties ?? "",
        entry.title ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  /**
   * Resolve a citation to a single entry.
   * First attempts exact normalised citation match, then falls back to
   * substring matching and returns the first hit.
   */
  resolve(citation: string): CorpusEntry | null {
    const norm = normaliseCitation(citation);

    // Exact match on normalised citation
    const exact = this.byNormCitation.get(norm);
    if (exact) {
      return exact;
    }

    // Fuzzy fallback: find first entry whose normalised citation contains
    // the query, or whose query contains the normalised citation.
    for (const entry of this.entries) {
      if (
        entry.normalisedCitation.includes(norm) ||
        norm.includes(entry.normalisedCitation)
      ) {
        return entry;
      }
    }

    return null;
  }

  /** Retrieve an entry by its corpus document ID. */
  getById(corpusDocId: string): CorpusEntry | null {
    return this.byId.get(corpusDocId) ?? null;
  }
}
