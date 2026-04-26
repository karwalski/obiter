/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for remaining adapters (Stories 17.19, 17.20, 17.21, 17.22,
 * 17.34, 17.35, 17.38).
 *
 * Verifies descriptors, SourceAdapter type conformance, URL construction,
 * NSW Caselaw JSON parsing, and sourceUrlPassthrough utility.
 */

import type { SourceAdapter, SourceMetadata } from "../../src/api/sourceAdapter";
import { ActScRssAdapter } from "../../src/api/adapters/actScRssAdapter";
import { WaScRssAdapter } from "../../src/api/adapters/waScRssAdapter";
import { FrlAdapter } from "../../src/api/adapters/frlAdapter";
import {
  NswCaselawAdapter,
  NswCaselawSearchResponse,
} from "../../src/api/adapters/nswCaselawAdapter";
import { DfatTreatiesAdapter } from "../../src/api/adapters/dfatTreatiesAdapter";
import { LrcAdapter, DEFAULT_LRC_CONFIGS } from "../../src/api/adapters/lrcAdapter";
import { getSourceLinks } from "../../src/api/adapters/sourceUrlPassthrough";
import { parseRssItems } from "../../src/api/adapters/fcaRssAdapter";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const today = new Date().toUTCString();
const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toUTCString();

const SAMPLE_ACT_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ACT Supreme Court Judgments</title>
    <item>
      <title>Baker v Cook [2024] ACTSC 55</title>
      <link>https://data.gov.au/act-sc/2024/55</link>
      <pubDate>${today}</pubDate>
      <description>Costs application.</description>
    </item>
    <item>
      <title>Lee v Park [2024] ACTSC 42</title>
      <link>https://data.gov.au/act-sc/2024/42</link>
      <pubDate>${tenDaysAgo}</pubDate>
      <description>Summary judgment refused.</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_WA_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>WA Supreme Court Decisions</title>
    <item>
      <title>Fox v Crow [2024] WASC 88</title>
      <link>https://ecourts.justice.wa.gov.au/decisions/2024/88</link>
      <pubDate>${today}</pubDate>
      <description>Application granted.</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_NSW_RESPONSE: NswCaselawSearchResponse = {
  totalResults: 2,
  results: [
    {
      caseTitle: "Smith v Jones",
      mnc: "[2024] NSWSC 100",
      uri: "/decision/12345",
      decisionDate: "2024-03-15",
      catchwords: "Contract law; breach; damages",
      court: "NSWSC",
    },
    {
      caseTitle: "Alpha v Beta",
      mnc: "[2024] NSWCA 50",
      uri: "/decision/67890",
      decisionDate: "2024-02-20",
      catchwords: "Criminal law; appeal",
      court: "NSWCA",
    },
  ],
};

// ---------------------------------------------------------------------------
// Test subclasses that override fetch methods
// ---------------------------------------------------------------------------

class TestActScAdapter extends ActScRssAdapter {
  private xml: string;
  constructor(xml: string) {
    super();
    this.xml = xml;
  }
  protected async fetchFeed(): Promise<
    Array<{ title: string; link: string; pubDate: string; description: string }>
  > {
    return parseRssItems(this.xml);
  }
}

class TestWaScAdapter extends WaScRssAdapter {
  private xml: string;
  constructor(xml: string) {
    super();
    this.xml = xml;
  }
  protected async fetchFeed(): Promise<
    Array<{ title: string; link: string; pubDate: string; description: string }>
  > {
    return parseRssItems(this.xml);
  }
}

class TestFrlAdapter extends FrlAdapter {
  private htmlResponse: string;
  constructor(html: string) {
    super();
    this.htmlResponse = html;
  }
  protected async fetchHtml(_url: string): Promise<string> {
    return this.htmlResponse;
  }
}

class TestNswCaselawAdapter extends NswCaselawAdapter {
  private response: NswCaselawSearchResponse;
  constructor(response: NswCaselawSearchResponse) {
    super();
    this.response = response;
  }
  protected async fetchJson(_url: string): Promise<NswCaselawSearchResponse> {
    return this.response;
  }
}

class TestDfatAdapter extends DfatTreatiesAdapter {
  private htmlResponse: string;
  constructor(html: string) {
    super();
    this.htmlResponse = html;
  }
  protected async fetchHtml(_url: string): Promise<string> {
    return this.htmlResponse;
  }
}

class TestLrcAdapter extends LrcAdapter {
  private htmlResponse: string;
  constructor(html: string) {
    super();
    this.htmlResponse = html;
  }
  protected async fetchHtml(_url: string): Promise<string> {
    return this.htmlResponse;
  }
}

// ===========================================================================
// ACT Supreme Court RSS Adapter (Story 17.19)
// ===========================================================================

describe("ActScRssAdapter (Story 17.19)", () => {
  let adapter: TestActScAdapter;

  beforeEach(() => {
    adapter = new TestActScAdapter(SAMPLE_ACT_RSS);
  });

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("act-sc-rss");
    expect(d.displayName).toContain("ACT");
    expect(d.jurisdictions).toContain("ACT");
    expect(d.contentTypes).toContain("case");
    expect(d.accessTier).toBe("open");
    expect(d.licence).toBe("CC BY 3.0 AU");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(1);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  describe("search()", () => {
    it("returns items matching query", async () => {
      const results = await adapter.search("Baker");
      expect(results.length).toBe(1);
      expect(results[0].title).toContain("Baker");
      expect(results[0].attribution).toContain("ACT");
    });

    it("returns all recent items for empty query", async () => {
      const results = await adapter.search("");
      expect(results.length).toBe(2);
    });
  });

  describe("resolve()", () => {
    it("resolves an MNC found in the feed", async () => {
      const meta = await adapter.resolve("[2024] ACTSC 55");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("ACTSC");
      expect(meta!.year).toBe(2024);
      expect(meta!.jurisdiction).toBe("ACT");
    });

    it("returns null for non-MNC citation", async () => {
      const meta = await adapter.resolve("random text");
      expect(meta).toBeNull();
    });
  });

  describe("getMetadata()", () => {
    it("returns metadata for a known link", async () => {
      const meta = await adapter.getMetadata("https://data.gov.au/act-sc/2024/55");
      expect(meta).not.toBeNull();
      expect(meta!.title).toContain("Baker");
    });

    it("returns null for unknown link", async () => {
      const meta = await adapter.getMetadata("https://example.com/nope");
      expect(meta).toBeNull();
    });
  });
});

// ===========================================================================
// WA Supreme Court RSS Adapter (Story 17.20)
// ===========================================================================

describe("WaScRssAdapter (Story 17.20)", () => {
  let adapter: TestWaScAdapter;

  beforeEach(() => {
    adapter = new TestWaScAdapter(SAMPLE_WA_RSS);
  });

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("wa-sc-rss");
    expect(d.jurisdictions).toContain("WA");
    expect(d.contentTypes).toContain("case");
    expect(d.accessTier).toBe("live");
    expect(d.licence).toBe("WA Crown Copyright");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(1);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  describe("search()", () => {
    it("returns items matching query", async () => {
      const results = await adapter.search("Fox");
      expect(results.length).toBe(1);
      expect(results[0].title).toContain("Fox");
      expect(results[0].attribution).toContain("Western Australia");
    });
  });

  describe("resolve()", () => {
    it("resolves a WASC MNC", async () => {
      const meta = await adapter.resolve("[2024] WASC 88");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("WASC");
      expect(meta!.jurisdiction).toBe("WA");
    });
  });
});

// ===========================================================================
// FRL Adapter (Story 17.21)
// ===========================================================================

describe("FrlAdapter (Story 17.21)", () => {
  it("exposes correct descriptor", () => {
    const adapter = new FrlAdapter();
    const d = adapter.descriptor;
    expect(d.id).toBe("frl");
    expect(d.displayName).toBe("Federal Register of Legislation");
    expect(d.jurisdictions).toContain("Cth");
    expect(d.contentTypes).toContain("legislation");
    expect(d.accessTier).toBe("live");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(1);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = new FrlAdapter();
    expect(_typed).toBeDefined();
  });

  describe("URL construction", () => {
    const adapter = new FrlAdapter();

    it("builds search URL with query", () => {
      const url = adapter.buildSearchUrl("Crimes Act 1914");
      expect(url).toContain("legislation.gov.au");
      expect(url).toContain("SearchText=");
      expect(url).toContain("Crimes");
    });

    it("builds statute URL from title", () => {
      const url = adapter.buildStatuteUrl("Crimes Act 1914");
      expect(url).toContain("legislation.gov.au/Details/");
      expect(url).toContain("Crimes");
    });
  });

  describe("resolve() with HTML", () => {
    it("extracts title from HTML page", async () => {
      const html = `<html><title>Crimes Act 1914 - Federal Register of Legislation</title>
        <body><meta name="dcterms.identifier" content="C2023C00123">
        <span class="status-label">In force</span></body></html>`;
      const adapter = new TestFrlAdapter(html);
      const meta = await adapter.resolve("Crimes Act 1914 (Cth)");
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Crimes Act 1914");
      expect(meta!.jurisdiction).toBe("Cth");
    });

    it("degrades to URL-only when SPA blocks parsing", async () => {
      const html = `<html><title></title><body><div id="app"></div></body></html>`;
      const adapter = new TestFrlAdapter(html);
      const meta = await adapter.resolve("Crimes Act 1914 (Cth)");
      expect(meta).not.toBeNull();
      // Should still return basic metadata even without HTML extraction
      expect(meta!.jurisdiction).toBe("Cth");
    });
  });

  describe("search() with degraded result", () => {
    it("returns URL-only result when no links parsed", async () => {
      const html = `<html><body>Loading...</body></html>`;
      const adapter = new TestFrlAdapter(html);
      const results = await adapter.search("Crimes Act 1914");
      expect(results.length).toBe(1);
      expect(results[0].confidence).toBe(0.3);
      expect(results[0].sourceUrl).toContain("legislation.gov.au");
    });
  });
});

// ===========================================================================
// NSW Caselaw JSON Adapter (Story 17.22)
// ===========================================================================

describe("NswCaselawAdapter (Story 17.22)", () => {
  let adapter: TestNswCaselawAdapter;

  beforeEach(() => {
    adapter = new TestNswCaselawAdapter(SAMPLE_NSW_RESPONSE);
  });

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("nsw-caselaw");
    expect(d.displayName).toBe("NSW Caselaw");
    expect(d.jurisdictions).toContain("NSW");
    expect(d.contentTypes).toContain("case");
    expect(d.accessTier).toBe("live");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(0.1);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  describe("URL construction", () => {
    it("builds search URL with body parameter", () => {
      const url = adapter.buildSearchUrl({ body: "contract" });
      expect(url).toContain("caselaw.nsw.gov.au/search/advanced");
      expect(url).toContain("body=contract");
    });

    it("builds search URL with citation parameter", () => {
      const url = adapter.buildSearchUrl({ citation: "[2024] NSWSC 100" });
      expect(url).toContain("mnc=");
    });

    it("builds search URL with date range", () => {
      const url = adapter.buildSearchUrl({
        body: "test",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
      expect(url).toContain("startDate=2024-01-01");
      expect(url).toContain("endDate=2024-12-31");
    });

    it("builds decision URL from relative path", () => {
      const url = adapter.buildDecisionUrl("/decision/12345");
      expect(url).toBe("https://www.caselaw.nsw.gov.au/decision/12345");
    });

    it("passes through absolute URLs", () => {
      const url = adapter.buildDecisionUrl("https://example.com/test");
      expect(url).toBe("https://example.com/test");
    });
  });

  describe("search()", () => {
    it("returns results from JSON response", async () => {
      const results = await adapter.search("contract");
      expect(results.length).toBe(2);
      expect(results[0].title).toBe("Smith v Jones");
      expect(results[0].sourceUrl).toContain("caselaw.nsw.gov.au");
      expect(results[0].attribution).toBe("NSW Caselaw");
    });

    it("sets high confidence for results with MNC", async () => {
      const results = await adapter.search("Smith");
      expect(results[0].confidence).toBe(0.9);
    });
  });

  describe("resolve()", () => {
    it("resolves an NSWSC MNC", async () => {
      const meta = await adapter.resolve("[2024] NSWSC 100");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("NSWSC");
      expect(meta!.jurisdiction).toBe("NSW");
      expect(meta!.year).toBe(2024);
    });

    it("returns null for non-MNC citation", async () => {
      const meta = await adapter.resolve("random text");
      expect(meta).toBeNull();
    });
  });

  describe("getMetadata()", () => {
    it("returns metadata for a valid ID", async () => {
      const meta = await adapter.getMetadata("[2024] NSWSC 100");
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Smith v Jones");
    });
  });

  describe("empty response handling", () => {
    it("returns empty array for empty results", async () => {
      const emptyAdapter = new TestNswCaselawAdapter({ results: [], totalResults: 0 });
      const results = await emptyAdapter.search("no-match");
      expect(results).toEqual([]);
    });

    it("resolve returns null for empty results", async () => {
      const emptyAdapter = new TestNswCaselawAdapter({ results: [], totalResults: 0 });
      const meta = await emptyAdapter.resolve("[2024] NSWSC 9999");
      expect(meta).toBeNull();
    });
  });
});

// ===========================================================================
// DFAT Treaties Adapter (Story 17.34)
// ===========================================================================

describe("DfatTreatiesAdapter (Story 17.34)", () => {
  it("exposes correct descriptor", () => {
    const adapter = new DfatTreatiesAdapter();
    const d = adapter.descriptor;
    expect(d.id).toBe("dfat-treaties");
    expect(d.displayName).toBe("DFAT Treaty Database");
    expect(d.jurisdictions).toContain("Cth");
    expect(d.contentTypes).toContain("treaty");
    expect(d.accessTier).toBe("live");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(0.5);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = new DfatTreatiesAdapter();
    expect(_typed).toBeDefined();
  });

  describe("URL construction", () => {
    const adapter = new DfatTreatiesAdapter();

    it("builds search URL", () => {
      const url = adapter.buildSearchUrl("Vienna Convention");
      expect(url).toContain("info.dfat.gov.au");
      expect(url).toContain("SearchText=");
      expect(url).toContain("Vienna");
    });

    it("builds detail URL from ID", () => {
      const url = adapter.buildDetailUrl("12345");
      expect(url).toContain("Treaty.aspx?id=12345");
    });

    it("passes through absolute URLs", () => {
      const url = adapter.buildDetailUrl("https://example.com/treaty");
      expect(url).toBe("https://example.com/treaty");
    });
  });

  describe("search()", () => {
    it("parses search results from HTML", async () => {
      const html = `<html><body>
        <a href="Treaty.aspx?id=123">Vienna Convention on Diplomatic Relations [1968] ATS 12</a>
        <a href="Treaty.aspx?id=456">Charter of the United Nations</a>
      </body></html>`;
      const adapter = new TestDfatAdapter(html);
      const results = await adapter.search("Vienna");
      expect(results.length).toBe(2);
      expect(results[0].title).toContain("Vienna");
      expect(results[0].confidence).toBe(0.8); // has ATS number
      expect(results[1].confidence).toBeGreaterThan(0); // confidence varies by metadata completeness
    });
  });

  describe("getMetadata()", () => {
    it("extracts treaty metadata from detail page", async () => {
      const html = `<html>
        <title>Vienna Convention - Australian Treaties Database</title>
        <body>
          <h1>Vienna Convention on Diplomatic Relations</h1>
          <span>[1961] ATS 12</span>
          <td>Parties</td><td>Multilateral</td>
          <td>Signature</td><td>18 April 1961</td>
          <td>Entry into force</td><td>24 April 1964</td>
        </body></html>`;
      const adapter = new TestDfatAdapter(html);
      const meta = await adapter.getMetadata("123");
      expect(meta).not.toBeNull();
      expect(meta!.title).toBe("Vienna Convention on Diplomatic Relations");
      expect(meta!.treatySeries).toBe("[1961] ATS 12");
      expect(meta!.year).toBe(1961);
      expect(meta!.jurisdiction).toBe("Cth");
    });
  });
});

// ===========================================================================
// LRC Adapter (Story 17.35)
// ===========================================================================

describe("LrcAdapter (Story 17.35)", () => {
  it("exposes correct descriptor", () => {
    const adapter = new LrcAdapter();
    const d = adapter.descriptor;
    expect(d.id).toBe("lrc");
    expect(d.displayName).toBe("Law Reform Commissions");
    expect(d.contentTypes).toContain("lrc-report");
    expect(d.accessTier).toBe("live");
    expect(d.fragile).toBe(true);
    expect(d.rateLimitHint.requestsPerSecond).toBe(0.5);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = new LrcAdapter();
    expect(_typed).toBeDefined();
  });

  it("has 8 default commission configurations", () => {
    expect(DEFAULT_LRC_CONFIGS.length).toBe(8);
    const ids = DEFAULT_LRC_CONFIGS.map((c) => c.id);
    expect(ids).toContain("alrc");
    expect(ids).toContain("nswlrc");
    expect(ids).toContain("vlrc");
    expect(ids).toContain("qlrc");
    expect(ids).toContain("walrc");
    expect(ids).toContain("salri");
    expect(ids).toContain("tlri");
    expect(ids).toContain("ntlrc");
  });

  describe("commission enable/disable", () => {
    it("can disable a commission", () => {
      const adapter = new LrcAdapter();
      adapter.disableCommission("alrc");
      const enabled = adapter.getEnabledCommissions();
      expect(enabled.find((c) => c.id === "alrc")).toBeUndefined();
      expect(enabled.length).toBe(7);
    });

    it("can re-enable a commission", () => {
      const adapter = new LrcAdapter();
      adapter.disableCommission("alrc");
      adapter.enableCommission("alrc");
      const enabled = adapter.getEnabledCommissions();
      expect(enabled.find((c) => c.id === "alrc")).toBeDefined();
    });
  });

  describe("URL construction", () => {
    it("builds search URL for ALRC", () => {
      const adapter = new LrcAdapter();
      const alrc = DEFAULT_LRC_CONFIGS.find((c) => c.id === "alrc")!;
      const url = adapter.buildSearchUrl(alrc, "family law");
      expect(url).toContain("alrc.gov.au");
      expect(url).toContain("family%20law");
    });
  });

  describe("search()", () => {
    it("parses report links from HTML", async () => {
      const html = `<html><body>
        <a href="/publications/report-142">ALRC Report 142: Family Law</a>
        <a href="/publications/discussion-paper">Discussion Paper on Evidence</a>
      </body></html>`;
      const adapter = new TestLrcAdapter(html);
      const results = await adapter.search("family law");
      // Should find the report link (contains "report" in text)
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].title).toContain("Report");
    });
  });
});

// ===========================================================================
// Source-URL Passthrough (Story 17.38)
// ===========================================================================

describe("getSourceLinks (Story 17.38)", () => {
  it("returns primary link for a primary source URL", () => {
    const metadata: SourceMetadata = {
      title: "Test Case",
      sourceUrl: "https://www.caselaw.nsw.gov.au/decision/12345",
    };
    const links = getSourceLinks(metadata);
    expect(links.length).toBe(1);
    expect(links[0].icon).toBe("primary");
    expect(links[0].url).toContain("caselaw.nsw.gov.au");
    expect(links[0].label).toContain("caselaw.nsw.gov.au");
  });

  it("returns aggregator link for AustLII URL", () => {
    const metadata: SourceMetadata = {
      title: "Test Case",
      sourceUrl: "https://www.austlii.edu.au/cgi-bin/viewdoc/12345",
    };
    const links = getSourceLinks(metadata);
    expect(links.length).toBe(1);
    expect(links[0].icon).toBe("aggregator");
  });

  it("distinguishes primary from aggregator when both present", () => {
    const metadata: SourceMetadata = {
      title: "Test Case",
      sourceUrl: "https://www.caselaw.nsw.gov.au/decision/12345",
      austliiUrl: "https://www.austlii.edu.au/cgi-bin/viewdoc/12345",
    };
    const links = getSourceLinks(metadata);
    expect(links.length).toBe(2);
    // Primary should come first
    expect(links[0].icon).toBe("primary");
    expect(links[1].icon).toBe("aggregator");
  });

  it("deduplicates identical URLs", () => {
    const metadata: SourceMetadata = {
      title: "Test Case",
      sourceUrl: "https://www.example.com/case",
      alternateUrl: "https://www.example.com/case",
    };
    const links = getSourceLinks(metadata);
    expect(links.length).toBe(1);
  });

  it("returns empty array when no URLs present", () => {
    const metadata: SourceMetadata = {
      title: "Test Case",
      year: 2024,
    };
    const links = getSourceLinks(metadata);
    expect(links).toEqual([]);
  });

  it("handles jade.io as aggregator", () => {
    const metadata: SourceMetadata = {
      title: "Test",
      sourceUrl: "https://jade.io/article/12345",
    };
    const links = getSourceLinks(metadata);
    expect(links[0].icon).toBe("aggregator");
  });

  it("handles BAILII as aggregator", () => {
    const metadata: SourceMetadata = {
      title: "Test",
      sourceUrl: "https://www.bailii.org/uk/cases/UKSC/2024/1.html",
    };
    const links = getSourceLinks(metadata);
    expect(links[0].icon).toBe("aggregator");
  });
});
