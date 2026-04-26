/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for State Legislation Scraper Framework (Stories 17.25–17.33)
 *
 * Covers:
 * - Base class search/resolve/getMetadata/healthcheck flow via a mock subclass
 * - parseCitationForStatute helper
 * - All 8 state adapter descriptors (id, jurisdictions, licence, fragile)
 * - URL construction for each state
 */

import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  LookupResult,
  SourceMetadata,
} from "../../src/api/sourceAdapter";
import {
  StateLegislationAdapter,
  parseCitationForStatute,
} from "../../src/api/adapters/stateLegislationBase";
import { NswLegislationAdapter } from "../../src/api/adapters/nswLegislation";
import { QldLegislationAdapter } from "../../src/api/adapters/qldLegislation";
import { WaLegislationAdapter } from "../../src/api/adapters/waLegislation";
import { SaLegislationAdapter } from "../../src/api/adapters/saLegislation";
import { TasLegislationAdapter } from "../../src/api/adapters/tasLegislation";
import { VicLegislationAdapter } from "../../src/api/adapters/vicLegislation";
import { ActLegislationAdapter } from "../../src/api/adapters/actLegislation";
import { NtLegislationAdapter } from "../../src/api/adapters/ntLegislation";

// ---------------------------------------------------------------------------
// Concrete mock implementation of StateLegislationAdapter for testing
// ---------------------------------------------------------------------------

class TestStateLegislationAdapter extends StateLegislationAdapter {
  readonly descriptor: SourceAdapterDescriptor = {
    id: "test-state",
    displayName: "Test State Legislation",
    jurisdictions: ["AU-TEST"],
    contentTypes: ["legislation"],
    accessTier: "live",
    licence: "Test Licence",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 1, burst: 2 },
    fragile: true,
  };

  protected readonly baseUrl = "https://legislation.test.gov.au";

  /** Canned HTML responses keyed by URL substring. */
  private responses: Record<string, string> = {};

  /** Whether fetchHtml should throw. */
  private shouldFail = false;

  setResponse(urlSubstring: string, html: string): void {
    this.responses[urlSubstring] = html;
  }

  setFetchFailure(fail: boolean): void {
    this.shouldFail = fail;
  }

  protected override async fetchHtml(url: string): Promise<string> {
    if (this.shouldFail) throw new Error("Network failure");
    for (const [key, html] of Object.entries(this.responses)) {
      if (url.includes(key)) return html;
    }
    return "";
  }

  buildSearchUrl(title: string, year?: number): string {
    const q = year ? `${title} ${year}` : title;
    return `${this.baseUrl}/search?q=${encodeURIComponent(q)}`;
  }

  buildDetailUrl(id: string): string {
    return `${this.baseUrl}/view/${id}`;
  }

  parseSearchResults(html: string): LookupResult[] {
    const results: LookupResult[] = [];
    const pattern = /<a[^>]+href="\/view\/([^"]+)"[^>]*>\s*([^<]+)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      results.push({
        title: match[2].trim(),
        snippet: `Test: ${match[2].trim()}`,
        sourceId: match[1],
        confidence: 0.7,
        sourceUrl: `${this.baseUrl}/view/${match[1]}`,
      });
    }
    return results;
  }

  parseDetailPage(html: string): SourceMetadata | null {
    const titleMatch = html.match(/<h1[^>]*>\s*([^<]+)<\/h1>/i);
    if (!titleMatch) return null;
    const rawTitle = titleMatch[1].trim();
    const yearMatch = rawTitle.match(/\b(\d{4})\b/);
    return {
      title: rawTitle,
      year: yearMatch ? parseInt(yearMatch[1], 10) : undefined,
      jurisdiction: "AU-TEST",
    };
  }
}

// ---------------------------------------------------------------------------
// parseCitationForStatute
// ---------------------------------------------------------------------------

describe("parseCitationForStatute", () => {
  it("extracts title and year from a full citation", () => {
    const result = parseCitationForStatute("Crimes Act 1900 (NSW)");
    expect(result.title).toBe("Crimes Act 1900");
    expect(result.year).toBe(1900);
  });

  it("handles citation without jurisdiction abbreviation", () => {
    const result = parseCitationForStatute(
      "Environmental Planning and Assessment Act 1979",
    );
    expect(result.title).toBe("Environmental Planning and Assessment Act 1979");
    expect(result.year).toBe(1979);
  });

  it("handles citation without year", () => {
    const result = parseCitationForStatute("Crimes Act");
    expect(result.title).toBe("Crimes Act");
    expect(result.year).toBeUndefined();
  });

  it("handles citation with jurisdiction but no year", () => {
    const result = parseCitationForStatute("Crimes Act (NSW)");
    expect(result.title).toBe("Crimes Act");
    expect(result.year).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Base class — search / resolve / getMetadata / healthcheck flow
// ---------------------------------------------------------------------------

describe("StateLegislationAdapter base class (Story 17.25)", () => {
  let adapter: TestStateLegislationAdapter;

  beforeEach(() => {
    adapter = new TestStateLegislationAdapter();
  });

  it("satisfies the SourceAdapter type", () => {
    const typed: SourceAdapter = adapter;
    expect(typed).toBeDefined();
  });

  describe("search()", () => {
    it("returns parsed results from search HTML", async () => {
      adapter.setResponse("search", `
        <div>
          <a href="/view/crimes-act-1900">Crimes Act 1900</a>
          <a href="/view/criminal-code-2002">Criminal Code 2002</a>
        </div>
      `);
      const results = await adapter.search("Crimes Act 1900");
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Crimes Act 1900");
      expect(results[0].sourceId).toBe("crimes-act-1900");
      expect(results[1].title).toBe("Criminal Code 2002");
    });

    it("returns empty array on network failure (graceful degradation)", async () => {
      adapter.setFetchFailure(true);
      const results = await adapter.search("Crimes Act");
      expect(results).toEqual([]);
    });

    it("returns empty array when no results found", async () => {
      adapter.setResponse("search", "<div>No results</div>");
      const results = await adapter.search("Nonexistent Act");
      expect(results).toEqual([]);
    });
  });

  describe("getMetadata()", () => {
    it("returns parsed metadata from detail HTML", async () => {
      adapter.setResponse("crimes-act-1900", `
        <html><body><h1>Crimes Act 1900</h1></body></html>
      `);
      const meta = await adapter.getMetadata("crimes-act-1900");
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Crimes Act 1900");
      expect(meta!.year).toBe(1900);
      expect(meta!.jurisdiction).toBe("AU-TEST");
    });

    it("returns null on network failure", async () => {
      adapter.setFetchFailure(true);
      const meta = await adapter.getMetadata("crimes-act-1900");
      expect(meta).toBeNull();
    });

    it("returns null when detail page has no h1", async () => {
      adapter.setResponse("broken", "<html><body><p>No title</p></body></html>");
      const meta = await adapter.getMetadata("broken");
      expect(meta).toBeNull();
    });
  });

  describe("resolve()", () => {
    it("searches and returns metadata for the top result", async () => {
      adapter.setResponse("search", `
        <a href="/view/crimes-act-1900">Crimes Act 1900</a>
      `);
      adapter.setResponse("crimes-act-1900", `
        <html><body><h1>Crimes Act 1900</h1></body></html>
      `);
      const meta = await adapter.resolve("Crimes Act 1900 (NSW)");
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Crimes Act 1900");
      expect(meta!.year).toBe(1900);
    });

    it("returns null when search yields no results", async () => {
      adapter.setResponse("search", "<div>No results</div>");
      const meta = await adapter.resolve("Nonexistent Act");
      expect(meta).toBeNull();
    });

    it("returns null on network failure", async () => {
      adapter.setFetchFailure(true);
      const meta = await adapter.resolve("Crimes Act");
      expect(meta).toBeNull();
    });
  });

  describe("URL construction", () => {
    it("builds search URL with title and year", () => {
      const url = adapter.buildSearchUrl("Crimes Act", 1900);
      expect(url).toBe(
        "https://legislation.test.gov.au/search?q=Crimes%20Act%201900",
      );
    });

    it("builds search URL with title only", () => {
      const url = adapter.buildSearchUrl("Crimes Act");
      expect(url).toBe(
        "https://legislation.test.gov.au/search?q=Crimes%20Act",
      );
    });

    it("builds detail URL", () => {
      const url = adapter.buildDetailUrl("crimes-act-1900");
      expect(url).toBe(
        "https://legislation.test.gov.au/view/crimes-act-1900",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// All 8 state adapter descriptors and URL construction
// ---------------------------------------------------------------------------

interface StateAdapterSpec {
  AdapterClass: new () => StateLegislationAdapter;
  expectedId: string;
  expectedJurisdiction: string;
  expectedLicence: string;
  expectedBaseUrl: string;
  /** A sample search URL fragment to verify URL construction. */
  searchUrlContains: string;
  /** A sample detail URL fragment to verify URL construction. */
  detailUrlContains: string;
  /** Sample ID for buildDetailUrl. */
  sampleId: string;
}

const stateSpecs: StateAdapterSpec[] = [
  {
    AdapterClass: NswLegislationAdapter,
    expectedId: "nsw-legislation",
    expectedJurisdiction: "AU-NSW",
    expectedLicence: "Crown Copyright (NSW)",
    expectedBaseUrl: "https://legislation.nsw.gov.au",
    searchUrlContains: "legislation.nsw.gov.au/search?q=",
    detailUrlContains: "legislation.nsw.gov.au/view/html/inforce/",
    sampleId: "act-1900-040",
  },
  {
    AdapterClass: QldLegislationAdapter,
    expectedId: "qld-legislation",
    expectedJurisdiction: "AU-QLD",
    expectedLicence: "CC BY 3.0 AU",
    expectedBaseUrl: "https://legislation.qld.gov.au",
    searchUrlContains: "legislation.qld.gov.au/search?q=",
    detailUrlContains: "legislation.qld.gov.au/view/html/inforce/",
    sampleId: "act-1899-009",
  },
  {
    AdapterClass: WaLegislationAdapter,
    expectedId: "wa-legislation",
    expectedJurisdiction: "AU-WA",
    expectedLicence: "Crown Copyright (WA)",
    expectedBaseUrl: "https://legislation.wa.gov.au",
    searchUrlContains: "legislation.wa.gov.au/legislation/statutes.nsf/SearchResult",
    detailUrlContains: "legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_",
    sampleId: "criminal-code",
  },
  {
    AdapterClass: SaLegislationAdapter,
    expectedId: "sa-legislation",
    expectedJurisdiction: "AU-SA",
    expectedLicence: "Crown Copyright (SA)",
    expectedBaseUrl: "https://legislation.sa.gov.au",
    searchUrlContains: "legislation.sa.gov.au/legislation/search?q=",
    detailUrlContains: "legislation.sa.gov.au/legislation/",
    sampleId: "criminal-law-consolidation-act-1935",
  },
  {
    AdapterClass: TasLegislationAdapter,
    expectedId: "tas-legislation",
    expectedJurisdiction: "AU-TAS",
    expectedLicence: "Tasmanian Government",
    expectedBaseUrl: "https://legislation.tas.gov.au",
    searchUrlContains: "legislation.tas.gov.au/search?q=",
    detailUrlContains: "legislation.tas.gov.au/view/html/inforce/",
    sampleId: "act-69-of-1924",
  },
  {
    AdapterClass: VicLegislationAdapter,
    expectedId: "vic-legislation",
    expectedJurisdiction: "AU-VIC",
    expectedLicence: "Crown Copyright (VIC)",
    expectedBaseUrl: "https://legislation.vic.gov.au",
    searchUrlContains: "legislation.vic.gov.au/search?q=",
    detailUrlContains: "legislation.vic.gov.au/in-force/acts/",
    sampleId: "crimes-act-1958",
  },
  {
    AdapterClass: ActLegislationAdapter,
    expectedId: "act-legislation",
    expectedJurisdiction: "AU-ACT",
    expectedLicence: "ACT Government",
    expectedBaseUrl: "https://legislation.act.gov.au",
    searchUrlContains: "legislation.act.gov.au/Search?q=",
    detailUrlContains: "legislation.act.gov.au/a/",
    sampleId: "2002-51",
  },
  {
    AdapterClass: NtLegislationAdapter,
    expectedId: "nt-legislation",
    expectedJurisdiction: "AU-NT",
    expectedLicence: "Crown Copyright (NT)",
    expectedBaseUrl: "https://legislation.nt.gov.au",
    searchUrlContains: "legislation.nt.gov.au/Search?q=",
    detailUrlContains: "legislation.nt.gov.au/Legislation/",
    sampleId: "criminal-code-act-1983",
  },
];

describe("State legislation adapters — descriptors and URLs (Stories 17.26–17.33)", () => {
  it.each(stateSpecs)(
    "$expectedId — descriptor fields",
    ({ AdapterClass, expectedId, expectedJurisdiction, expectedLicence }) => {
      const adapter = new AdapterClass();
      const d = adapter.descriptor;

      expect(d.id).toBe(expectedId);
      expect(d.jurisdictions).toContain(expectedJurisdiction);
      expect(d.contentTypes).toContain("legislation");
      expect(d.licence).toBe(expectedLicence);
      expect(d.fragile).toBe(true);
      expect(d.requiresKey).toBe(false);
      expect(d.rateLimitHint.requestsPerSecond).toBe(1);
    },
  );

  it.each(stateSpecs)(
    "$expectedId — buildSearchUrl contains expected base",
    ({ AdapterClass, searchUrlContains }) => {
      const adapter = new AdapterClass();
      const url = adapter.buildSearchUrl("Test Act", 2020);
      expect(url).toContain(searchUrlContains);
      expect(url).toContain("Test");
      expect(url).toContain("2020");
    },
  );

  it.each(stateSpecs)(
    "$expectedId — buildDetailUrl contains expected path",
    ({ AdapterClass, detailUrlContains, sampleId }) => {
      const adapter = new AdapterClass();
      const url = adapter.buildDetailUrl(sampleId);
      expect(url).toContain(detailUrlContains);
      expect(url).toContain(sampleId);
    },
  );

  it.each(stateSpecs)(
    "$expectedId — satisfies SourceAdapter type",
    ({ AdapterClass }) => {
      const adapter = new AdapterClass();
      const typed: SourceAdapter = adapter;
      expect(typed).toBeDefined();
      expect(typeof typed.search).toBe("function");
      expect(typeof typed.resolve).toBe("function");
      expect(typeof typed.getMetadata).toBe("function");
      expect(typeof typed.healthcheck).toBe("function");
    },
  );
});

describe("All 8 state adapters are present", () => {
  it("has exactly 8 state adapter specs", () => {
    expect(stateSpecs).toHaveLength(8);
  });

  it("all adapter IDs are unique", () => {
    const ids = stateSpecs.map((s) => s.expectedId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all jurisdictions are unique", () => {
    const jurisdictions = stateSpecs.map((s) => s.expectedJurisdiction);
    expect(new Set(jurisdictions).size).toBe(jurisdictions.length);
  });
});
