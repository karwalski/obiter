/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-006 — unified adapter search stamps every hit with the adapter that
 * produced it, and registers each adapter with the preference system so the
 * default consultation order (corpus > live API > scraper > link-only) is
 * derived from adapter metadata rather than instantiation order.
 *
 * Only the corpus adapter is replaced with a fake; with the master lookup
 * toggle off (the default) it is the only adapter the search consults, so
 * no live adapter is ever called.
 */

import {
  searchViaAdapters,
  initialiseAdapters,
  getAdapterInstance,
} from "../../src/api/adapterSearch";
import { getPreferredAdapters, getRegisteredAdapters } from "../../src/api/sourcePreferences";
import type { LookupResult } from "../../src/api/sourceAdapter";

const mockCorpusResults: LookupResult[] = [
  {
    title: "Mabo v Queensland (No 2)",
    snippet: "(1992) 175 CLR 1",
    sourceId: "corpus:mabo-1992",
    confidence: 0.9,
    sourceUrl: "https://example.test/corpus/mabo",
    attribution: "CC BY 4.0 (Isaacus)",
  },
  {
    title: "Cole v Whitfield",
    snippet: "(1988) 165 CLR 360",
    sourceId: "corpus:cole-1988",
    confidence: 0.8,
  },
];
const mockCorpusSearch = jest.fn(async (): Promise<LookupResult[]> => mockCorpusResults);

jest.mock("../../src/api/adapters/corpusAdapter", () => ({
  CorpusAdapter: class {
    readonly descriptor = {
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
    search(...args: unknown[]): Promise<LookupResult[]> {
      return mockCorpusSearch(...(args as []));
    }
    async getMetadata(): Promise<Record<string, unknown>> {
      return {};
    }
    async healthCheck(): Promise<{ status: string; message: string; checkedAt: string }> {
      return { status: "green", message: "", checkedAt: "" };
    }
  },
}));

beforeEach(() => {
  localStorage.clear();
  mockCorpusSearch.mockClear();
});

describe("ENP-006: searchViaAdapters provenance", () => {
  test("every result carries the id of the adapter that produced it", async () => {
    const results = await searchViaAdapters("mabo", "case");
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.adapterId).toBe("corpus");
    }
    // The full adapter result flows through, nothing is narrowed away.
    expect(results[0].sourceUrl).toBe("https://example.test/corpus/mabo");
    expect(results[0].attribution).toBe("CC BY 4.0 (Isaacus)");
  });

  test("stamping copies the hits rather than mutating adapter-owned objects", async () => {
    await searchViaAdapters("mabo", "case");
    for (const original of mockCorpusResults) {
      expect("adapterId" in original).toBe(false);
    }
  });

  test("the producing adapter can be resolved to its display name", async () => {
    const [first] = await searchViaAdapters("mabo", "case");
    const adapter = getAdapterInstance(first.adapterId ?? "");
    expect(adapter?.descriptor.displayName).toBe("Open Australian Legal Corpus");
  });
});

describe("ENP-006: adapters are registered with the preference system", () => {
  test("getPreferredAdapters is non-empty after initialiseAdapters()", () => {
    initialiseAdapters();
    const order = getPreferredAdapters("case", "NSW");
    expect(order.length).toBeGreaterThan(0);
    // The reliability hierarchy puts the local corpus first.
    expect(order[0]).toBe("corpus");
    expect(order).toContain("nsw-caselaw");
  });

  test("adapter kinds follow the corpus > live API > scraper > link-only hierarchy", () => {
    initialiseAdapters();
    const kinds = new Map(getRegisteredAdapters().map((m) => [m.id, m.kind]));
    expect(kinds.get("corpus")).toBe("corpus");
    // A non-fragile live API.
    expect(kinds.get("nsw-hansard")).toBe("live-api");
    // Fragile HTML parsers rank as scrapers.
    expect(kinds.get("nsw-caselaw")).toBe("scraper");
    expect(kinds.get("frl")).toBe("scraper");
    // Link builders, whether or not they carry a rate-limit hint.
    expect(kinds.get("austlii-link")).toBe("link-only");
    expect(kinds.get("lexis-au")).toBe("link-only");
  });

  test("link-only adapters sort after every live adapter for a content type", () => {
    initialiseAdapters();
    const order = getPreferredAdapters("case", "NSW");
    const lastLive = Math.max(order.indexOf("nsw-caselaw"), order.indexOf("corpus"));
    expect(order.indexOf("austlii-link")).toBeGreaterThan(lastLive);
  });
});
