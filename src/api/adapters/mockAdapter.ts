/**
 * Mock Source Adapter (Story 17.1)
 *
 * A deterministic in-memory adapter used for unit and integration testing.
 * Returns canned data that exercises common AGLC4 citation patterns.
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
  SearchFilters,
  AdapterHealth,
} from "../sourceAdapter";

/** Canned metadata keyed by sourceId. */
const MOCK_SOURCES: Record<string, SourceMetadata> = {
  "mock-case-1": {
    title: "Mabo v Queensland (No 2)",
    parties: "Mabo v Queensland",
    year: 1992,
    court: "HCA",
    mnc: "[1992] HCA 23",
    reportSeries: "CLR",
    volume: 175,
    startingPage: 1,
    jurisdiction: "AU",
  },
  "mock-case-2": {
    title: "Donoghue v Stevenson",
    parties: "Donoghue v Stevenson",
    year: 1932,
    court: "UKHL",
    reportSeries: "AC",
    volume: 1932,
    startingPage: 562,
    jurisdiction: "GB",
  },
  "mock-legislation-1": {
    title: "Competition and Consumer Act 2010 (Cth)",
    year: 2010,
    jurisdiction: "AU",
    frliId: "C2004A00109",
    status: "in force",
  },
  "mock-journal-1": {
    title: "The Rule of Law and Its Virtue",
    authors: ["Joseph Raz"],
    year: 1977,
    journal: "Law Quarterly Review",
    volume: 93,
    startingPage: 195,
    issue: "2",
  },
  "mock-treaty-1": {
    title: "Vienna Convention on the Law of Treaties",
    year: 1969,
    treatySeries: "UNTS",
    volume: 1155,
    startingPage: 331,
  },
};

/** Build lookup results from the canned sources. */
function buildLookupResults(): Record<string, LookupResult> {
  const results: Record<string, LookupResult> = {};
  for (const [id, meta] of Object.entries(MOCK_SOURCES)) {
    results[id] = {
      title: meta.title ?? "Untitled",
      snippet: `Mock result for ${meta.title ?? id}`,
      sourceId: id,
      confidence: 0.95,
      sourceUrl: `https://mock.obiter.test/${id}`,
      attribution: "Mock Adapter (test data)",
    };
  }
  return results;
}

const MOCK_RESULTS = buildLookupResults();

export class MockAdapter implements SourceAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "mock",
    displayName: "Mock Adapter",
    jurisdictions: ["AU", "GB"],
    contentTypes: ["case", "legislation", "journal", "treaty"],
    accessTier: "open",
    licence: "Test data — no licence",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 100, burst: 100 },
    fragile: false,
  };

  private health: AdapterHealth = "healthy";

  /**
   * Allow tests to override health status.
   */
  setHealth(status: AdapterHealth): void {
    this.health = status;
  }

  async search(query: string, filters?: SearchFilters): Promise<LookupResult[]> {
    const lowerQuery = query.toLowerCase();

    return Object.values(MOCK_RESULTS).filter((result) => {
      // Basic text matching
      const matchesQuery =
        result.title.toLowerCase().includes(lowerQuery) ||
        result.sourceId.toLowerCase().includes(lowerQuery);
      if (!matchesQuery) return false;

      // Apply filters
      if (filters) {
        const meta = MOCK_SOURCES[result.sourceId];
        if (!meta) return false;

        if (
          filters.jurisdiction &&
          meta.jurisdiction &&
          meta.jurisdiction !== filters.jurisdiction
        ) {
          return false;
        }
        if (filters.yearFrom && meta.year && meta.year < filters.yearFrom) {
          return false;
        }
        if (filters.yearTo && meta.year && meta.year > filters.yearTo) {
          return false;
        }
        if (filters.court && meta.court && meta.court !== filters.court) {
          return false;
        }
        if (filters.contentType) {
          const id = result.sourceId;
          const typeSegment = id.split("-")[1]; // e.g. "case", "legislation"
          if (typeSegment !== filters.contentType) return false;
        }
      }

      return true;
    });
  }

  async resolve(citation: string): Promise<SourceMetadata | null> {
    const lower = citation.toLowerCase();

    // Match by MNC or title substring
    for (const [, meta] of Object.entries(MOCK_SOURCES)) {
      if (meta.mnc && lower.includes(meta.mnc.toLowerCase())) return { ...meta };
      if (meta.title && lower.includes(meta.title.toLowerCase())) return { ...meta };
    }

    return null;
  }

  async getMetadata(id: string): Promise<SourceMetadata | null> {
    const meta = MOCK_SOURCES[id];
    return meta ? { ...meta } : null;
  }

  async healthcheck(): Promise<AdapterHealth> {
    return this.health;
  }
}
