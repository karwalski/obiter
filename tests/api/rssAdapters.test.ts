/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for FCA and SCLQLD RSS Adapters (Stories 17.17, 17.18).
 * Uses mocked fetch with sample RSS XML.
 */

import type { SourceAdapter, LookupResult } from "../../src/api/sourceAdapter";
import { FcaRssAdapter, parseRssItems } from "../../src/api/adapters/fcaRssAdapter";
import { SclqldRssAdapter } from "../../src/api/adapters/sclqldRssAdapter";

// ---------------------------------------------------------------------------
// Sample RSS XML
// ---------------------------------------------------------------------------

const today = new Date().toUTCString();
const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toUTCString();
const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toUTCString();

const SAMPLE_FCA_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Federal Court of Australia - Judgments</title>
    <item>
      <title>Smith v Jones [2024] FCA 123</title>
      <link>https://www.fedcourt.gov.au/judgments/fca/2024/fca2024-0123</link>
      <pubDate>${today}</pubDate>
      <description>Application for judicial review dismissed.</description>
    </item>
    <item>
      <title>Brown v Green [2024] FCA 456</title>
      <link>https://www.fedcourt.gov.au/judgments/fca/2024/fca2024-0456</link>
      <pubDate>${tenDaysAgo}</pubDate>
      <description>Appeal allowed with costs.</description>
    </item>
    <item>
      <title>Old v Case [2023] FCA 999</title>
      <link>https://www.fedcourt.gov.au/judgments/fca/2023/fca2023-0999</link>
      <pubDate>${sixtyDaysAgo}</pubDate>
      <description>This item is older than 30 days.</description>
    </item>
  </channel>
</rss>`;

const SAMPLE_QLD_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Supreme Court Library Queensland</title>
    <item>
      <title>Alpha v Beta [2024] QSC 10</title>
      <link>https://www.sclqld.org.au/caselaw/QSC/2024/10</link>
      <pubDate>${today}</pubDate>
      <description><![CDATA[Summary judgment granted.]]></description>
    </item>
    <item>
      <title>Gamma v Delta [2024] QCA 5</title>
      <link>https://www.sclqld.org.au/caselaw/QCA/2024/5</link>
      <pubDate>${tenDaysAgo}</pubDate>
      <description>Appeal dismissed.</description>
    </item>
  </channel>
</rss>`;

// ---------------------------------------------------------------------------
// Test subclasses that override fetch
// ---------------------------------------------------------------------------

class TestFcaAdapter extends FcaRssAdapter {
  private xml: string;
  constructor(xml: string) {
    super();
    this.xml = xml;
  }
  protected async fetchFeed(): Promise<string> {
    return this.xml;
  }
}

class TestSclqldAdapter extends SclqldRssAdapter {
  private xml: string;
  constructor(xml: string) {
    super();
    this.xml = xml;
  }
  protected async fetchAllFeeds(): Promise<Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
  }>> {
    return parseRssItems(this.xml);
  }
}

// ---------------------------------------------------------------------------
// parseRssItems unit tests
// ---------------------------------------------------------------------------

describe("parseRssItems", () => {
  it("extracts items from RSS XML", () => {
    const items = parseRssItems(SAMPLE_FCA_RSS);
    expect(items.length).toBe(3);
    expect(items[0].title).toBe("Smith v Jones [2024] FCA 123");
    expect(items[0].link).toContain("fedcourt.gov.au");
    expect(items[0].description).toBe("Application for judicial review dismissed.");
  });

  it("handles CDATA in description", () => {
    const items = parseRssItems(SAMPLE_QLD_RSS);
    expect(items[0].description).toBe("Summary judgment granted.");
  });

  it("returns empty array for invalid XML", () => {
    expect(parseRssItems("not xml at all")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FcaRssAdapter (Story 17.17)
// ---------------------------------------------------------------------------

describe("FcaRssAdapter (Story 17.17)", () => {
  let adapter: TestFcaAdapter;

  beforeEach(() => {
    adapter = new TestFcaAdapter(SAMPLE_FCA_RSS);
  });

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("fca-rss");
    expect(d.displayName).toBe("Federal Court RSS");
    expect(d.contentTypes).toContain("case");
    expect(d.jurisdictions).toContain("Cth");
    expect(d.accessTier).toBe("live");
    expect(d.fragile).toBe(true);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  describe("search()", () => {
    it("returns recent items matching query", async () => {
      const results = await adapter.search("Smith");
      expect(results.length).toBe(1);
      expect(results[0].title).toContain("Smith");
      expect(results[0].sourceUrl).toContain("fedcourt.gov.au");
      expect(results[0].attribution).toBe("Federal Court of Australia");
    });

    it("filters out items older than 30 days", async () => {
      const results = await adapter.search("Old");
      expect(results.length).toBe(0);
    });

    it("returns all recent items for empty query", async () => {
      const results = await adapter.search("");
      // Should get 2 recent items (not the 60-day-old one)
      expect(results.length).toBe(2);
    });

    it("returns empty array for unmatched query", async () => {
      const results = await adapter.search("xyzzy-no-match");
      expect(results).toEqual([]);
    });

    it("parses MNC from title and sets higher confidence", async () => {
      const results = await adapter.search("Smith");
      expect(results[0].confidence).toBe(0.9);
    });
  });

  describe("resolve()", () => {
    it("resolves an MNC found in the feed", async () => {
      const meta = await adapter.resolve("[2024] FCA 123");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("FCA");
      expect(meta!.year).toBe(2024);
      expect(meta!.mnc).toBe("[2024] FCA 123");
      expect(meta!.jurisdiction).toBe("Cth");
    });

    it("returns null for non-MNC citation", async () => {
      const meta = await adapter.resolve("Some random text");
      expect(meta).toBeNull();
    });

    it("returns null for MNC not in feed", async () => {
      const meta = await adapter.resolve("[2024] FCA 9999");
      expect(meta).toBeNull();
    });
  });

  describe("getMetadata()", () => {
    it("returns metadata for a known link", async () => {
      const meta = await adapter.getMetadata(
        "https://www.fedcourt.gov.au/judgments/fca/2024/fca2024-0123",
      );
      expect(meta).not.toBeNull();
      expect(meta!.title).toContain("Smith");
      expect(meta!.court).toBe("FCA");
    });

    it("returns null for unknown link", async () => {
      const meta = await adapter.getMetadata("https://example.com/nope");
      expect(meta).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// SclqldRssAdapter (Story 17.18)
// ---------------------------------------------------------------------------

describe("SclqldRssAdapter (Story 17.18)", () => {
  let adapter: TestSclqldAdapter;

  beforeEach(() => {
    adapter = new TestSclqldAdapter(SAMPLE_QLD_RSS);
  });

  it("exposes correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("sclqld-rss");
    expect(d.displayName).toBe("Qld Courts RSS");
    expect(d.contentTypes).toContain("case");
    expect(d.jurisdictions).toContain("Qld");
    expect(d.fragile).toBe(true);
  });

  it("satisfies the SourceAdapter type", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  describe("search()", () => {
    it("returns items matching query", async () => {
      const results = await adapter.search("Alpha");
      expect(results.length).toBe(1);
      expect(results[0].title).toContain("Alpha");
      expect(results[0].attribution).toBe("Supreme Court Library Queensland");
    });

    it("returns all items for empty query", async () => {
      const results = await adapter.search("");
      expect(results.length).toBe(2);
    });

    it("returns empty array for unmatched query", async () => {
      const results = await adapter.search("zzz-no-match");
      expect(results).toEqual([]);
    });
  });

  describe("resolve()", () => {
    it("resolves a QSC MNC", async () => {
      const meta = await adapter.resolve("[2024] QSC 10");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("QSC");
      expect(meta!.jurisdiction).toBe("Qld");
    });

    it("resolves a QCA MNC", async () => {
      const meta = await adapter.resolve("[2024] QCA 5");
      expect(meta).not.toBeNull();
      expect(meta!.court).toBe("QCA");
    });

    it("returns null for non-matching MNC", async () => {
      const meta = await adapter.resolve("[2024] QSC 9999");
      expect(meta).toBeNull();
    });
  });

  describe("getMetadata()", () => {
    it("returns metadata for a known link", async () => {
      const meta = await adapter.getMetadata(
        "https://www.sclqld.org.au/caselaw/QSC/2024/10",
      );
      expect(meta).not.toBeNull();
      expect(meta!.title).toContain("Alpha");
    });

    it("returns null for unknown link", async () => {
      const meta = await adapter.getMetadata("https://example.com/nope");
      expect(meta).toBeNull();
    });
  });
});
