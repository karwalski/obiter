/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for the Open Australian Legal Corpus index, adapter, and coverage
 * modules (Stories 17.7 – 17.11).
 */

import { InMemoryCorpusIndex, normaliseCitation } from "../../src/api/corpus/inMemoryCorpusIndex";
import type { CorpusEntry } from "../../src/api/corpus/corpusIndex";
import { CorpusAdapter } from "../../src/api/adapters/corpusAdapter";
import type { SourceAdapter } from "../../src/api/sourceAdapter";
import {
  checkCorpusAvailable,
  getCorpusStatus,
  downloadCorpusIndex,
  skipCorpus,
  isCorpusSkipped,
  _resetCorpusState,
} from "../../src/api/corpus/corpusDownload";
import {
  getCoverageStatus,
  getCoverageDescription,
  getJurisdictionBadge,
  getAllCoverage,
} from "../../src/api/corpus/corpusCoverage";

// Mock devicePreferences for skip preference persistence
jest.mock("../../src/store/devicePreferences", () => {
  const store: Record<string, unknown> = {};
  return {
    getDevicePref: (key: string) => store[key] ?? undefined,
    setDevicePref: (key: string, value: unknown) => {
      if (value === undefined) delete store[key]; else store[key] = value;
    },
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeTestEntries(): CorpusEntry[] {
  return [
    {
      citation: "[2023] HCA 1",
      normalisedCitation: "2023 hca 1",
      jurisdiction: "Cth",
      courtOrRegister: "HCA",
      type: "case",
      year: 2023,
      parties: "Smith v Jones",
      sourceUrl: "https://example.com/hca/2023/1",
      corpusDocId: "test-case-1",
    },
    {
      citation: "[2020] NSWSC 42",
      normalisedCitation: "2020 nswsc 42",
      jurisdiction: "NSW",
      courtOrRegister: "NSWSC",
      type: "case",
      year: 2020,
      parties: "Alpha Pty Ltd v Beta Corp",
      sourceUrl: "https://example.com/nswsc/2020/42",
      corpusDocId: "test-case-2",
    },
    {
      citation: "[2015] QCA 100",
      normalisedCitation: "2015 qca 100",
      jurisdiction: "Qld",
      courtOrRegister: "QCA",
      type: "case",
      year: 2015,
      parties: "R v Brown",
      sourceUrl: "https://example.com/qca/2015/100",
      corpusDocId: "test-case-3",
    },
    {
      citation: "Competition and Consumer Act 2010 (Cth)",
      normalisedCitation: "competition and consumer act 2010 cth",
      jurisdiction: "Cth",
      courtOrRegister: "Federal Register",
      type: "primary_legislation",
      year: 2010,
      title: "Competition and Consumer Act 2010",
      sourceUrl: "https://example.com/frl/c2004a00109",
      corpusDocId: "test-leg-1",
    },
    {
      citation: "Environmental Planning and Assessment Act 1979 (NSW)",
      normalisedCitation: "environmental planning and assessment act 1979 nsw",
      jurisdiction: "NSW",
      courtOrRegister: "NSW Legislation",
      type: "primary_legislation",
      year: 1979,
      title: "Environmental Planning and Assessment Act 1979",
      sourceUrl: "https://example.com/nsw-leg/ep-a-act",
      corpusDocId: "test-leg-2",
    },
  ];
}

// =========================================================================
// Story 17.7 — InMemoryCorpusIndex
// =========================================================================

describe("InMemoryCorpusIndex (Story 17.7)", () => {
  let index: InMemoryCorpusIndex;

  beforeEach(() => {
    index = new InMemoryCorpusIndex();
    index.loadFromJson(makeTestEntries(), "1.0.0-test");
  });

  // -----------------------------------------------------------------------
  // loadFromJson
  // -----------------------------------------------------------------------

  it("loads entries and sets version", () => {
    expect(index.entryCount).toBe(5);
    expect(index.version).toBe("1.0.0-test");
  });

  it("computes normalised citations if not provided", () => {
    const idx = new InMemoryCorpusIndex();
    idx.loadFromJson([
      {
        citation: "[2023] HCA 1",
        normalisedCitation: "",
        jurisdiction: "Cth",
        courtOrRegister: "HCA",
        type: "case",
        year: 2023,
        sourceUrl: "https://example.com",
        corpusDocId: "auto-norm",
      },
    ]);
    const result = idx.resolve("2023 HCA 1");
    expect(result).not.toBeNull();
    expect(result?.corpusDocId).toBe("auto-norm");
  });

  // -----------------------------------------------------------------------
  // search
  // -----------------------------------------------------------------------

  it("finds entries by case-insensitive substring on citation", () => {
    const results = index.search("hca");
    expect(results.length).toBe(1);
    expect(results[0].corpusDocId).toBe("test-case-1");
  });

  it("finds entries by parties", () => {
    const results = index.search("smith");
    expect(results.length).toBe(1);
    expect(results[0].parties).toContain("Smith");
  });

  it("finds entries by title (legislation)", () => {
    const results = index.search("competition");
    expect(results.length).toBe(1);
    expect(results[0].type).toBe("primary_legislation");
  });

  it("returns all entries for empty query without filters", () => {
    const results = index.search("");
    expect(results.length).toBe(5);
  });

  it("filters by jurisdiction", () => {
    const results = index.search("", { jurisdiction: "NSW" });
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.jurisdiction).toBe("NSW"));
  });

  it("filters by type", () => {
    const results = index.search("", { type: "case" });
    expect(results.length).toBe(3);
    results.forEach((r) => expect(r.type).toBe("case"));
  });

  it("filters by year range", () => {
    const results = index.search("", { yearFrom: 2015, yearTo: 2020 });
    expect(results.length).toBe(2); // QCA 2015 + NSWSC 2020
  });

  it("combines query with filters", () => {
    const results = index.search("v", { jurisdiction: "Cth" });
    expect(results.length).toBe(1);
    expect(results[0].corpusDocId).toBe("test-case-1");
  });

  it("returns empty for no matches", () => {
    const results = index.search("xyzzy-nonexistent");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // resolve
  // -----------------------------------------------------------------------

  it("resolves exact normalised citation", () => {
    const result = index.resolve("[2023] HCA 1");
    expect(result).not.toBeNull();
    expect(result?.corpusDocId).toBe("test-case-1");
  });

  it("resolves case-insensitively", () => {
    const result = index.resolve("[2020] nswsc 42");
    expect(result).not.toBeNull();
    expect(result?.corpusDocId).toBe("test-case-2");
  });

  it("resolves legislation by title", () => {
    const result = index.resolve("Competition and Consumer Act 2010 (Cth)");
    expect(result).not.toBeNull();
    expect(result?.corpusDocId).toBe("test-leg-1");
  });

  it("fuzzy matches partial citations", () => {
    // "2023 hca 1" is a substring of the normalised citation
    const result = index.resolve("HCA 1");
    expect(result).not.toBeNull();
  });

  it("returns null for unresolvable citations", () => {
    const result = index.resolve("[2099] XYZ 999");
    expect(result).toBeNull();
  });

  // -----------------------------------------------------------------------
  // getById
  // -----------------------------------------------------------------------

  it("retrieves entry by corpus document ID", () => {
    const result = index.getById("test-case-3");
    expect(result).not.toBeNull();
    expect(result?.citation).toBe("[2015] QCA 100");
  });

  it("returns null for unknown ID", () => {
    expect(index.getById("no-such-id")).toBeNull();
  });
});

// =========================================================================
// normaliseCitation utility
// =========================================================================

describe("normaliseCitation (Story 17.7)", () => {
  it("strips square brackets", () => {
    expect(normaliseCitation("[2023] HCA 1")).toBe("2023 hca 1");
  });

  it("strips parentheses", () => {
    expect(normaliseCitation("Act 2010 (Cth)")).toBe("act 2010 cth");
  });

  it("lowercases", () => {
    expect(normaliseCitation("NSWSC")).toBe("nswsc");
  });

  it("collapses whitespace", () => {
    expect(normaliseCitation("  foo   bar  ")).toBe("foo bar");
  });
});

// =========================================================================
// Story 17.8 — Corpus Download
// =========================================================================

describe("Corpus Download (Story 17.8)", () => {
  beforeEach(() => {
    _resetCorpusState();
  });

  it("starts in not-downloaded state", () => {
    expect(getCorpusStatus()).toBe("not-downloaded");
    expect(checkCorpusAvailable()).toBe(false);
  });

  it("downloads mock corpus index with progress", async () => {
    const progress: Array<[number, number]> = [];
    await downloadCorpusIndex((loaded, total) => {
      progress.push([loaded, total]);
    });
    expect(getCorpusStatus()).toBe("ready");
    expect(checkCorpusAvailable()).toBe(true);
    expect(progress.length).toBeGreaterThan(0);
    // Final progress should be 100/100
    const last = progress[progress.length - 1];
    expect(last[0]).toBe(last[1]);
  });

  it("sets skip preference", () => {
    expect(isCorpusSkipped()).toBe(false);
    skipCorpus();
    expect(isCorpusSkipped()).toBe(true);
  });
});

// =========================================================================
// Story 17.10 — Corpus Adapter
// =========================================================================

describe("CorpusAdapter (Story 17.10)", () => {
  let adapter: CorpusAdapter;

  beforeAll(async () => {
    _resetCorpusState();
    await downloadCorpusIndex();
  });

  beforeEach(() => {
    adapter = new CorpusAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("corpus");
    expect(d.displayName).toBe("Open Australian Legal Corpus");
    expect(d.accessTier).toBe("open");
    expect(d.licence).toBe("CC BY 4.0 (Isaacus)");
    expect(d.requiresKey).toBe(false);
    expect(d.fragile).toBe(false);
  });

  it("satisfies the SourceAdapter interface", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // search
  // -----------------------------------------------------------------------

  it("returns results for a matching query", async () => {
    const results = await adapter.search("Party A");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].attribution).toContain("Open Australian Legal Corpus");
    expect(results[0].attribution).toContain("CC BY 4.0");
  });

  it("returns empty array when corpus is not loaded", async () => {
    _resetCorpusState();
    const results = await adapter.search("anything");
    expect(results).toEqual([]);
    // Reload for subsequent tests
    await downloadCorpusIndex();
  });

  // -----------------------------------------------------------------------
  // resolve
  // -----------------------------------------------------------------------

  it("resolves a citation from the mock corpus", async () => {
    // The mock corpus generates citations like [2000] HCA 1
    const meta = await adapter.resolve("[2000] HCA 1");
    expect(meta).not.toBeNull();
    expect(meta?.attribution).toContain("Open Australian Legal Corpus");
  });

  it("returns null for unrecognised citations", async () => {
    const meta = await adapter.resolve("[2099] UNKNOWN 999");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // getMetadata
  // -----------------------------------------------------------------------

  it("returns metadata by corpus document ID", async () => {
    // Use a search to find a real ID from the mock data
    const results = await adapter.search("Party");
    if (results.length > 0) {
      const meta = await adapter.getMetadata(results[0].sourceId);
      expect(meta).not.toBeNull();
      expect(meta?.year).toBeDefined();
    }
  });

  it("returns null for unknown ID", async () => {
    const meta = await adapter.getMetadata("no-such-id");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck
  // -----------------------------------------------------------------------

  it("reports healthy when corpus is loaded", async () => {
    expect(await adapter.healthcheck()).toBe("healthy");
  });

  it("reports offline when corpus is not loaded", async () => {
    _resetCorpusState();
    expect(await adapter.healthcheck()).toBe("offline");
    // Reload for any subsequent tests
    await downloadCorpusIndex();
  });
});

// =========================================================================
// Story 17.11 — Corpus Coverage
// =========================================================================

describe("Corpus Coverage (Story 17.11)", () => {
  it("returns complete for Cth", () => {
    expect(getCoverageStatus("Cth")).toBe("complete");
  });

  it("returns complete for NSW, Qld, WA, SA, Tas", () => {
    for (const j of ["NSW", "Qld", "WA", "SA", "Tas"]) {
      expect(getCoverageStatus(j)).toBe("complete");
    }
  });

  it("returns partial for Vic, ACT, NT", () => {
    for (const j of ["Vic", "ACT", "NT"]) {
      expect(getCoverageStatus(j)).toBe("partial");
    }
  });

  it("returns absent for unknown jurisdictions", () => {
    expect(getCoverageStatus("NZ")).toBe("absent");
    expect(getCoverageStatus("UK")).toBe("absent");
  });

  it("returns a human-readable coverage description", () => {
    const desc = getCoverageDescription();
    expect(desc).toContain("Complete coverage");
    expect(desc).toContain("Partial coverage");
    expect(desc).toContain("Cth");
    expect(desc).toContain("Vic");
  });

  it("returns badge text for each status", () => {
    expect(getJurisdictionBadge("Cth")).toBe("Corpus: Full");
    expect(getJurisdictionBadge("Vic")).toBe("Corpus: Partial");
    expect(getJurisdictionBadge("NZ")).toBe("No corpus");
  });

  it("getAllCoverage returns all jurisdictions with metadata", () => {
    const all = getAllCoverage();
    expect(all.length).toBe(9);
    for (const item of all) {
      expect(item.jurisdiction).toBeTruthy();
      expect(item.status).toBeTruthy();
      expect(item.badge).toBeTruthy();
      expect(item.description).toBeTruthy();
    }
  });
});
