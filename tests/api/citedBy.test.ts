/**
 * ENP-008: citing works for a journal article.
 *
 * The adapters' fetches are mocked with OpenAlex and Crossref JSON fixtures;
 * the toggles come from a mocked device-preference store. Covers the DOI-less
 * and toggle-off short-circuits (no fetch at all), the merged count and rows,
 * the per-adapter failure paths, and the linked library record built for a
 * citing work.
 */

import { CrossrefAdapter } from "../../src/api/adapters/crossrefAdapter";
import { OpenAlexAdapter, shortWorkId } from "../../src/api/adapters/openAlexAdapter";
import {
  CITED_BY_LOOKUP_OFF,
  CITED_BY_NO_DOI,
  CITED_BY_NO_SOURCE,
  addCitingWorkToLibrary,
  authorFromDisplayName,
  buildCitingWorkCitation,
  citedByForCitation,
  doiForCitation,
  isCitedByUnavailable,
  normaliseDoi,
} from "../../src/api/citedBy";
import { isCitatorAdapter } from "../../src/api/sourceAdapter";
import type { CitedByResult, LookupResult } from "../../src/api/sourceAdapter";
import type { Citation } from "../../src/types/citation";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

/** Device preferences, so the master toggle and enabled map can be set per test. */
const mockPrefs: Record<string, unknown> = {};

jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: jest.fn((key: string): unknown => mockPrefs[key]),
  setDevicePref: jest.fn((key: string, value: unknown): void => {
    mockPrefs[key] = value;
  }),
}));

jest.mock("../../src/api/keyVault", () => ({
  getKey: jest.fn(() => ""),
  saveKey: jest.fn(),
  removeKey: jest.fn(),
  hasKey: jest.fn(() => false),
}));

const mockStoreAdd = jest.fn(async (_citation: Citation): Promise<void> => undefined);

jest.mock("../../src/store/singleton", () => ({
  getSharedStore: (): Promise<unknown> => Promise.resolve({ add: mockStoreAdd }),
  getSharedStoreIfReady: (): unknown => null,
}));

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function setMaster(on: boolean): void {
  mockPrefs["sourceRegistry.masterEnabled"] = on;
}

function setEnabled(map: Record<string, boolean>): void {
  mockPrefs["sourceRegistry.enabled"] = map;
}

function urlOf(call: number): string {
  return String(mockFetch.mock.calls[call][0]);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOI = "10.1093/lqr/93.2.195";

const CITED_WORK = {
  id: "https://openalex.org/W2741809807",
  doi: `https://doi.org/${DOI}`,
  title: "The Rule of Law and Its Virtue",
  authorships: [{ author: { display_name: "Joseph Raz" } }],
  primary_location: { source: { display_name: "Law Quarterly Review" } },
  biblio: { volume: "93", issue: "2", first_page: "195" },
  publication_year: 1977,
  cited_by_count: 12,
  cited_by_api_url: "https://api.openalex.org/works?filter=cites:W2741809807",
  referenced_works: ["https://openalex.org/W1"],
};

function citingWork(n: number): Record<string, unknown> {
  return {
    id: `https://openalex.org/W${1000 + n}`,
    doi: n % 3 === 0 ? undefined : `https://doi.org/10.5555/citing.${n}`,
    title: `Citing work ${n}`,
    authorships: [
      { author: { display_name: `Author ${n}` } },
      { author: { display_name: "Co Writer" } },
    ],
    primary_location: { source: { display_name: "Melbourne University Law Review" } },
    biblio: { volume: String(40 + n), issue: "1", first_page: String(100 + n) },
    publication_year: 2000 + n,
    cited_by_count: 100 - n,
  };
}

const CITING_WORKS = { results: Array.from({ length: 10 }, (_, i) => citingWork(i + 1)) };

const CROSSREF_WORK = {
  message: {
    DOI,
    title: ["The Rule of Law and Its Virtue"],
    author: [{ given: "Joseph", family: "Raz" }],
    "container-title": ["Law Quarterly Review"],
    volume: "93",
    issue: "2",
    page: "195-211",
    "published-print": { "date-parts": [[1977]] },
    "is-referenced-by-count": 15,
  },
};

function cite(data: Record<string, unknown>, overrides: Partial<Citation> = {}): Citation {
  return {
    id: "parent-1",
    aglcVersion: "4",
    sourceType: "journal.article",
    data,
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

const ARTICLE = cite({
  authors: [{ givenNames: "Joseph", surname: "Raz" }],
  title: "The Rule of Law and Its Virtue",
  journal: "Law Quarterly Review",
  volume: 93,
  year: 1977,
  doi: DOI,
});

/**
 * Route each fetch by URL so adapter order does not matter: the OpenAlex
 * work lookup, the OpenAlex citing-works query, and the Crossref work.
 */
function routeFetch(
  overrides: Partial<Record<"work" | "cites" | "crossref", Response | Error>> = {}
): void {
  mockFetch.mockImplementation((input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    const pick = (key: "work" | "cites" | "crossref", fallback: unknown): Promise<Response> => {
      const chosen = overrides[key];
      if (chosen instanceof Error) return Promise.reject(chosen);
      return Promise.resolve(chosen ?? jsonResponse(fallback));
    };
    if (url.includes("api.crossref.org")) return pick("crossref", CROSSREF_WORK);
    if (url.includes("filter=cites:")) return pick("cites", CITING_WORKS);
    return pick("work", { results: [CITED_WORK] });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockStoreAdd.mockClear();
  for (const key of Object.keys(mockPrefs)) delete mockPrefs[key];
  setMaster(true);
  setEnabled({});
});

// ---------------------------------------------------------------------------
// Capability and DOI helpers
// ---------------------------------------------------------------------------

describe("ENP-008: citator capability", () => {
  it("OpenAlex and Crossref are citator adapters; the guard reads the method", () => {
    expect(isCitatorAdapter(new OpenAlexAdapter())).toBe(true);
    expect(isCitatorAdapter(new CrossrefAdapter())).toBe(true);
  });

  it("shortWorkId accepts a bare id or the OpenAlex URL", () => {
    expect(shortWorkId("https://openalex.org/W2741809807")).toBe("W2741809807");
    expect(shortWorkId("w2741809807")).toBe("W2741809807");
    expect(shortWorkId("10.1093/lqr/93.2.195")).toBeUndefined();
    expect(shortWorkId(undefined)).toBeUndefined();
  });

  it("normaliseDoi strips resolver URLs and doi: prefixes", () => {
    expect(normaliseDoi(`https://doi.org/${DOI}`)).toBe(DOI);
    expect(normaliseDoi(`http://dx.doi.org/${DOI}`)).toBe(DOI);
    expect(normaliseDoi(`doi:${DOI}`)).toBe(DOI);
    expect(normaliseDoi("not a doi")).toBe("");
    expect(normaliseDoi({ nested: true })).toBe("");
  });

  it("doiForCitation reads data.doi or the interchange identifiers", () => {
    expect(doiForCitation(ARTICLE)).toBe(DOI);
    expect(
      doiForCitation(
        cite({ interchange: { v: 1, identifiers: { doi: `https://doi.org/${DOI}` } } })
      )
    ).toBe(DOI);
    expect(doiForCitation(cite({ title: "No identifier" }))).toBe("");
  });
});

// ---------------------------------------------------------------------------
// OpenAlex adapter citedBy
// ---------------------------------------------------------------------------

describe("ENP-008: OpenAlexAdapter.citedBy", () => {
  it("resolves the DOI, then queries filter=cites sorted by cited_by_count", async () => {
    routeFetch();
    const result = await new OpenAlexAdapter().citedBy(DOI, 10);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(urlOf(0)).toContain("https://api.openalex.org/works?filter=doi:");
    expect(urlOf(0)).toContain(encodeURIComponent(DOI));
    expect(urlOf(1)).toBe(
      "https://api.openalex.org/works?filter=cites:W2741809807&per_page=10&sort=cited_by_count:desc"
    );

    expect(result.count).toBe(12);
    expect(result.attribution).toBe("Data from OpenAlex (CC0)");
    expect(result.works).toHaveLength(10);

    const first = result.works[0];
    expect(first.title).toBe("Citing work 1");
    expect(first.snippet).toBe("Author 1, Co Writer, Melbourne University Law Review 41(1) 2001");
    expect(first.sourceId).toBe("10.5555/citing.1");
    expect(first.sourceUrl).toBe("https://doi.org/10.5555/citing.1");
    expect(first.attribution).toBe("Data from OpenAlex (CC0)");
    expect(first.metadata).toEqual({
      title: "Citing work 1",
      authors: ["Author 1", "Co Writer"],
      journal: "Melbourne University Law Review",
      volume: 41,
      issue: "1",
      startingPage: 101,
      year: 2001,
      doi: "10.5555/citing.1",
    });

    // A work without a DOI falls back to its OpenAlex id and URL.
    const third = result.works[2];
    expect(third.sourceId).toBe("W1003");
    expect(third.sourceUrl).toBe("https://openalex.org/W1003");
  });

  it("accepts an OpenAlex work id and uses the single-work endpoint", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(CITED_WORK))
      .mockResolvedValueOnce(jsonResponse({ results: [citingWork(1)] }));
    const result = await new OpenAlexAdapter().citedBy("W2741809807", 5);
    expect(urlOf(0)).toBe("https://api.openalex.org/works/W2741809807");
    expect(urlOf(1)).toContain("per_page=5");
    expect(result.count).toBe(12);
    expect(result.works).toHaveLength(1);
  });

  it("returns a null count and no rows when the work is unknown", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ results: [] }));
    const result = await new OpenAlexAdapter().citedBy(DOI);
    expect(result).toEqual({ count: null, works: [], attribution: "Data from OpenAlex (CC0)" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the count when the citing-works query fails", async () => {
    routeFetch({ cites: jsonResponse({}, 503) });
    const result = await new OpenAlexAdapter().citedBy(DOI);
    expect(result.count).toBe(12);
    expect(result.works).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Crossref adapter citedBy
// ---------------------------------------------------------------------------

describe("ENP-008: CrossrefAdapter.citedBy", () => {
  it("returns is-referenced-by-count with no rows", async () => {
    routeFetch();
    const result = await new CrossrefAdapter().citedBy(DOI);
    expect(urlOf(0)).toBe(`https://api.crossref.org/works/${encodeURIComponent(DOI)}`);
    expect(result).toEqual({ count: 15, works: [], attribution: "Count from Crossref" });
  });

  it("returns a null count when Crossref has no record", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    const result = await new CrossrefAdapter().citedBy(DOI);
    expect(result.count).toBeNull();
  });

  it("selects is-referenced-by-count in searches", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: { items: [] } }));
    await new CrossrefAdapter().search("rule of law");
    expect(urlOf(0)).toContain("is-referenced-by-count");
  });
});

// ---------------------------------------------------------------------------
// citedByForCitation
// ---------------------------------------------------------------------------

describe("ENP-008: citedByForCitation", () => {
  it("needs a DOI and makes no request without one", async () => {
    const outcome = await citedByForCitation(cite({ title: "No identifier" }));
    expect(outcome).toEqual({ unavailable: CITED_BY_NO_DOI });
    expect(isCitedByUnavailable(outcome)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("makes no request when the source-lookup master toggle is off", async () => {
    setMaster(false);
    const outcome = await citedByForCitation(ARTICLE);
    expect(outcome).toEqual({ unavailable: CITED_BY_LOOKUP_OFF });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports when no citator adapter is enabled, without a request", async () => {
    setEnabled({ openalex: false, crossref: false });
    const outcome = await citedByForCitation(ARTICLE);
    expect(outcome).toEqual({ unavailable: CITED_BY_NO_SOURCE });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("merges the count, the ten OpenAlex rows and both attributions", async () => {
    routeFetch();
    const outcome = await citedByForCitation(ARTICLE);
    expect(isCitedByUnavailable(outcome)).toBe(false);
    const result = outcome as CitedByResult;

    expect(result.works).toHaveLength(10);
    expect(result.works.map((w) => w.title)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Citing work ${i + 1}`)
    );
    // The count comes from the first adapter to report one; the rows from
    // OpenAlex. Both services contributed, so both are credited.
    expect([12, 15]).toContain(result.count);
    expect(result.attribution).toContain("Data from OpenAlex (CC0)");
    expect(result.attribution).toContain("Count from Crossref");

    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.startsWith("https://api.crossref.org/works/"))).toBe(true);
    expect(urls.some((u) => u.includes("filter=cites:W2741809807"))).toBe(true);
  });

  it("honours the limit option", async () => {
    routeFetch();
    await citedByForCitation(ARTICLE, { limit: 3 });
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls.find((u) => u.includes("filter=cites:"))).toContain("per_page=3");
  });

  it("uses the interchange DOI when data.doi is absent", async () => {
    routeFetch();
    const imported = cite({ title: "Imported", interchange: { v: 1, identifiers: { doi: DOI } } });
    const outcome = (await citedByForCitation(imported)) as CitedByResult;
    expect(outcome.works).toHaveLength(10);
  });

  it("still answers with the Crossref count when OpenAlex fails", async () => {
    setEnabled({ openalex: true, crossref: true });
    routeFetch({ work: new Error("network down") });
    const outcome = (await citedByForCitation(ARTICLE)) as CitedByResult;
    expect(outcome.count).toBe(15);
    expect(outcome.works).toEqual([]);
    expect(outcome.attribution).toBe("Count from Crossref");
  });

  it("rejects with a plain message when every adapter fails", async () => {
    routeFetch({ work: new Error("openalex down"), crossref: new Error("crossref down") });
    await expect(citedByForCitation(ARTICLE)).rejects.toThrow(
      "The citing-works services could not be reached."
    );
  });

  it("only consults enabled adapters", async () => {
    setEnabled({ crossref: false });
    routeFetch();
    const outcome = (await citedByForCitation(ARTICLE)) as CitedByResult;
    const urls = mockFetch.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("api.crossref.org"))).toBe(false);
    expect(outcome.count).toBe(12);
    expect(outcome.attribution).toBe("Data from OpenAlex (CC0)");
  });
});

// ---------------------------------------------------------------------------
// Building and adding the citing work
// ---------------------------------------------------------------------------

describe("ENP-008: adding a citing work to the library", () => {
  const WORK: LookupResult = {
    title: "Citing work 1",
    snippet: "Author 1, Co Writer, Melbourne University Law Review 41(1) 2001",
    sourceId: "10.5555/citing.1",
    confidence: 1,
    sourceUrl: "https://doi.org/10.5555/citing.1",
    attribution: "Data from OpenAlex (CC0)",
    metadata: {
      title: "Citing work 1",
      authors: ["Author 1", "Co Writer", "Madonna"],
      journal: "Melbourne University Law Review",
      volume: 41,
      issue: "1",
      startingPage: 101,
      year: 2001,
      doi: "10.5555/citing.1",
    },
  };

  it("splits display names into given names and surname", () => {
    expect(authorFromDisplayName("Joseph Raz")).toEqual({ givenNames: "Joseph", surname: "Raz" });
    expect(authorFromDisplayName("Mary Anne Warren")).toEqual({
      givenNames: "Mary Anne",
      surname: "Warren",
    });
    expect(authorFromDisplayName("Madonna")).toEqual({ givenNames: "", surname: "Madonna" });
  });

  it("builds a journal.article linked to the cited article with the Rule 1.3 phrase 'citing'", () => {
    const built = buildCitingWorkCitation(ARTICLE, WORK);
    expect(built.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(built.id).not.toBe(ARTICLE.id);
    expect(built.aglcVersion).toBe("4");
    expect(built.sourceType).toBe("journal.article");
    expect(built.tags).toEqual([]);
    expect(built.linkingPhrase).toBe("citing");
    expect(built.linkedCitationId).toBe("parent-1");
    expect(built.createdAt).toBe(built.modifiedAt);
    expect(built.data).toEqual({
      authors: [
        { givenNames: "Author", surname: "1" },
        { givenNames: "Co", surname: "Writer" },
        { givenNames: "", surname: "Madonna" },
      ],
      title: "Citing work 1",
      journal: "Melbourne University Law Review",
      volume: 41,
      issue: "1",
      startingPage: 101,
      year: 2001,
      doi: "10.5555/citing.1",
    });
  });

  it("omits fields the work does not carry and falls back to the row title", () => {
    const built = buildCitingWorkCitation(ARTICLE, {
      ...WORK,
      metadata: undefined,
      sourceId: "W1003",
    });
    expect(built.data).toEqual({ title: "Citing work 1" });
  });

  it("writes the record through the shared store", async () => {
    const stored = await addCitingWorkToLibrary(ARTICLE, WORK);
    expect(mockStoreAdd).toHaveBeenCalledTimes(1);
    expect(mockStoreAdd.mock.calls[0][0]).toBe(stored);
    expect(stored.sourceType).toBe("journal.article");
    expect(stored.linkedCitationId).toBe("parent-1");
  });
});
