/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for journal adapters (Stories 17.12, 17.13, 17.14).
 * All external API calls are mocked via jest.fn() on global.fetch.
 */

import { CrossrefAdapter } from "../../src/api/adapters/crossrefAdapter";
import { OpenAlexAdapter } from "../../src/api/adapters/openAlexAdapter";
import { DoajAdapter } from "../../src/api/adapters/doajAdapter";
import type { SourceAdapter } from "../../src/api/sourceAdapter";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock keyVault — default to no stored key (anonymous mode)
jest.mock("../../src/api/keyVault", () => ({
  getKey: jest.fn(() => ""),
  saveKey: jest.fn(),
  removeKey: jest.fn(),
  hasKey: jest.fn(() => false),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    statusText: "OK",
    type: "basic" as ResponseType,
    url: "",
    clone: () => jsonResponse(body, status) as Response,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ===========================================================================
// 17.12 — Crossref Adapter
// ===========================================================================

describe("CrossrefAdapter (Story 17.12)", () => {
  let adapter: CrossrefAdapter;

  beforeEach(() => {
    adapter = new CrossrefAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes the correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("crossref");
    expect(d.displayName).toBe("Crossref");
    expect(d.contentTypes).toEqual(["journal"]);
    expect(d.accessTier).toBe("open");
    expect(d.licence).toBe("CC0");
    expect(d.requiresKey).toBe(false);
    expect(d.fragile).toBe(false);
  });

  it("has a rate limit hint of 1 RPS in anonymous mode", () => {
    // keyVault returns "" so anonymous mode
    expect(adapter.descriptor.rateLimitHint.requestsPerSecond).toBe(1);
  });

  it("satisfies the SourceAdapter interface", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // search()
  // -----------------------------------------------------------------------

  const CROSSREF_SEARCH_RESPONSE = {
    message: {
      items: [
        {
          DOI: "10.1093/lqr/93.2.195",
          title: ["The Rule of Law and Its Virtue"],
          author: [{ given: "Joseph", family: "Raz" }],
          "container-title": ["Law Quarterly Review"],
          volume: "93",
          issue: "2",
          page: "195-211",
          "published-print": { "date-parts": [[1977]] },
        },
      ],
    },
  };

  it("constructs the correct search URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(CROSSREF_SEARCH_RESPONSE));

    await adapter.search("rule of law");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://api.crossref.org/works");
    expect(url).toContain("query.bibliographic=rule%20of%20law");
    expect(url).toContain("rows=10");
    expect(url).toContain("select=");
  });

  it("maps Crossref response to LookupResult[]", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(CROSSREF_SEARCH_RESPONSE));

    const results = await adapter.search("rule of law");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("The Rule of Law and Its Virtue");
    expect(results[0].sourceId).toBe("10.1093/lqr/93.2.195");
    expect(results[0].confidence).toBeGreaterThan(0);
    expect(results[0].attribution).toBe("Crossref");
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    const results = await adapter.search("test");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // resolve()
  // -----------------------------------------------------------------------

  const CROSSREF_SINGLE_RESPONSE = {
    message: {
      DOI: "10.1093/lqr/93.2.195",
      title: ["The Rule of Law and Its Virtue"],
      author: [{ given: "Joseph", family: "Raz" }],
      "container-title": ["Law Quarterly Review"],
      volume: "93",
      issue: "2",
      page: "195-211",
      "published-print": { "date-parts": [[1977]] },
    },
  };

  it("constructs the correct resolve URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(CROSSREF_SINGLE_RESPONSE));

    await adapter.resolve("10.1093/lqr/93.2.195");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://api.crossref.org/works/");
    expect(url).toContain("10.1093%2Flqr%2F93.2.195");
  });

  it("maps resolved metadata correctly", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(CROSSREF_SINGLE_RESPONSE));

    const meta = await adapter.resolve("10.1093/lqr/93.2.195");

    expect(meta).not.toBeNull();
    expect(meta?.title).toBe("The Rule of Law and Its Virtue");
    expect(meta?.authors).toEqual(["Joseph Raz"]);
    expect(meta?.journal).toBe("Law Quarterly Review");
    expect(meta?.volume).toBe(93);
    expect(meta?.issue).toBe("2");
    expect(meta?.startingPage).toBe(195);
    expect(meta?.year).toBe(1977);
    expect(meta?.doi).toBe("10.1093/lqr/93.2.195");
  });

  it("returns null on non-ok resolve response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    const meta = await adapter.resolve("10.9999/nonexistent");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("returns healthy on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    expect(await adapter.healthcheck()).toBe("healthy");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("rows=0");
  });

  it("returns degraded on non-ok", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 503));
    expect(await adapter.healthcheck()).toBe("degraded");
  });

  it("returns offline on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    expect(await adapter.healthcheck()).toBe("offline");
  });
});

// ===========================================================================
// 17.13 — OpenAlex Adapter
// ===========================================================================

describe("OpenAlexAdapter (Story 17.13)", () => {
  let adapter: OpenAlexAdapter;

  beforeEach(() => {
    adapter = new OpenAlexAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes the correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("openalex");
    expect(d.displayName).toBe("OpenAlex");
    expect(d.contentTypes).toEqual(["journal"]);
    expect(d.accessTier).toBe("open");
    expect(d.licence).toBe("CC0");
    expect(d.requiresKey).toBe(false);
    expect(d.rateLimitHint.requestsPerSecond).toBe(10);
  });

  it("satisfies the SourceAdapter interface", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // search()
  // -----------------------------------------------------------------------

  const OPENALEX_SEARCH_RESPONSE = {
    results: [
      {
        id: "https://openalex.org/W12345",
        doi: "https://doi.org/10.1093/lqr/93.2.195",
        title: "The Rule of Law and Its Virtue",
        authorships: [
          { author: { display_name: "Joseph Raz" } },
        ],
        primary_location: {
          source: { display_name: "Law Quarterly Review" },
        },
        biblio: {
          volume: "93",
          issue: "2",
          first_page: "195",
        },
        publication_year: 1977,
      },
    ],
  };

  it("constructs the correct search URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(OPENALEX_SEARCH_RESPONSE));

    await adapter.search("rule of law");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://api.openalex.org/works");
    expect(url).toContain("search=rule%20of%20law");
    expect(url).toContain("filter=type:article");
    expect(url).toContain("per_page=10");
  });

  it("maps OpenAlex response to LookupResult[]", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(OPENALEX_SEARCH_RESPONSE));

    const results = await adapter.search("rule of law");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("The Rule of Law and Its Virtue");
    expect(results[0].confidence).toBeGreaterThan(0);
    expect(results[0].attribution).toBe("OpenAlex");
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    const results = await adapter.search("test");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getMetadata()
  // -----------------------------------------------------------------------

  it("maps metadata correctly including DOI stripping", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(OPENALEX_SEARCH_RESPONSE));

    const meta = await adapter.getMetadata("10.1093/lqr/93.2.195");

    expect(meta).not.toBeNull();
    expect(meta?.title).toBe("The Rule of Law and Its Virtue");
    expect(meta?.authors).toEqual(["Joseph Raz"]);
    expect(meta?.journal).toBe("Law Quarterly Review");
    expect(meta?.volume).toBe(93);
    expect(meta?.issue).toBe("2");
    expect(meta?.startingPage).toBe(195);
    expect(meta?.year).toBe(1977);
    // DOI should have the https://doi.org/ prefix stripped
    expect(meta?.doi).toBe("10.1093/lqr/93.2.195");
  });

  it("returns null when no results found", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const meta = await adapter.getMetadata("nonexistent");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("returns healthy on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    expect(await adapter.healthcheck()).toBe("healthy");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("per_page=0");
  });

  it("returns offline on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    expect(await adapter.healthcheck()).toBe("offline");
  });
});

// ===========================================================================
// 17.14 — DOAJ Adapter
// ===========================================================================

describe("DoajAdapter (Story 17.14)", () => {
  let adapter: DoajAdapter;

  beforeEach(() => {
    adapter = new DoajAdapter();
  });

  // -----------------------------------------------------------------------
  // Descriptor
  // -----------------------------------------------------------------------

  it("exposes the correct descriptor", () => {
    const d = adapter.descriptor;
    expect(d.id).toBe("doaj");
    expect(d.displayName).toBe("DOAJ");
    expect(d.contentTypes).toEqual(["journal"]);
    expect(d.accessTier).toBe("open");
    expect(d.licence).toBe("CC BY");
    expect(d.requiresKey).toBe(false);
    expect(d.rateLimitHint.requestsPerSecond).toBe(2);
  });

  it("satisfies the SourceAdapter interface", () => {
    const _typed: SourceAdapter = adapter;
    expect(_typed).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // search()
  // -----------------------------------------------------------------------

  const DOAJ_SEARCH_RESPONSE = {
    results: [
      {
        id: "doaj-article-abc123",
        bibjson: {
          title: "Open Access and the Rule of Law",
          author: [
            { name: "Jane Smith" },
            { name: "John Doe" },
          ],
          journal: {
            title: "Journal of Open Access Law",
            volume: "5",
            number: "3",
          },
          year: "2020",
          start_page: "42",
          link: [
            { type: "fulltext", url: "https://example.com/article.pdf", content_type: "application/pdf" },
          ],
          identifier: [
            { type: "doi", id: "10.1234/joal.2020.042" },
          ],
        },
      },
    ],
  };

  it("constructs the correct search URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(DOAJ_SEARCH_RESPONSE));

    await adapter.search("open access law");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://doaj.org/api/search/articles/");
    expect(url).toContain("open%20access%20law");
    expect(url).toContain("pageSize=10");
  });

  it("maps DOAJ response to LookupResult[]", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(DOAJ_SEARCH_RESPONSE));

    const results = await adapter.search("open access law");

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Open Access and the Rule of Law");
    expect(results[0].sourceId).toBe("doaj-article-abc123");
    expect(results[0].confidence).toBeGreaterThan(0);
    expect(results[0].attribution).toBe("DOAJ");
    // Should capture the open-access URL
    expect(results[0].sourceUrl).toBe("https://example.com/article.pdf");
  });

  it("returns empty array on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    const results = await adapter.search("test");
    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getMetadata()
  // -----------------------------------------------------------------------

  const DOAJ_ARTICLE_RESPONSE = {
    id: "doaj-article-abc123",
    bibjson: {
      title: "Open Access and the Rule of Law",
      author: [
        { name: "Jane Smith" },
        { name: "John Doe" },
      ],
      journal: {
        title: "Journal of Open Access Law",
        volume: "5",
        number: "3",
      },
      year: "2020",
      start_page: "42",
      link: [
        { type: "fulltext", url: "https://example.com/article.pdf", content_type: "application/pdf" },
      ],
      identifier: [
        { type: "doi", id: "10.1234/joal.2020.042" },
      ],
    },
  };

  it("maps metadata correctly", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(DOAJ_ARTICLE_RESPONSE));

    const meta = await adapter.getMetadata("doaj-article-abc123");

    expect(meta).not.toBeNull();
    expect(meta?.title).toBe("Open Access and the Rule of Law");
    expect(meta?.authors).toEqual(["Jane Smith", "John Doe"]);
    expect(meta?.journal).toBe("Journal of Open Access Law");
    expect(meta?.volume).toBe(5);
    expect(meta?.issue).toBe("3");
    expect(meta?.startingPage).toBe(42);
    expect(meta?.year).toBe(2020);
    expect(meta?.doi).toBe("10.1234/joal.2020.042");
    expect((meta as Record<string, unknown>).openAccessUrl).toBe("https://example.com/article.pdf");
  });

  it("fetches from the articles endpoint", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(DOAJ_ARTICLE_RESPONSE));

    await adapter.getMetadata("doaj-article-abc123");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("https://doaj.org/api/articles/");
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    const meta = await adapter.getMetadata("nonexistent");
    expect(meta).toBeNull();
  });

  // -----------------------------------------------------------------------
  // healthcheck()
  // -----------------------------------------------------------------------

  it("returns healthy on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    expect(await adapter.healthcheck()).toBe("healthy");

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/api/search/articles/test");
    expect(url).toContain("pageSize=0");
  });

  it("returns offline on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    expect(await adapter.healthcheck()).toBe("offline");
  });
});
