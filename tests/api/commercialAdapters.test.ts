/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for commercial source adapters (Stories 17.45–17.50).
 * All external API calls are mocked via jest.fn() on global.fetch.
 */

import { LexisAdapter } from "../../src/api/adapters/lexisAdapter";
import { WestlawAdapter } from "../../src/api/adapters/westlawAdapter";
import { VlexAdapter } from "../../src/api/adapters/vlexAdapter";
import {
  JadeProAdapter,
  buildJadeFreeUrl,
  buildJadeProUrl,
  hasJadeProSubscription,
} from "../../src/api/adapters/jadeProAdapter";
import { HabeasAdapter } from "../../src/api/adapters/habeasAdapter";
import type { SourceAdapter } from "../../src/api/sourceAdapter";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Mock keyVault
// ---------------------------------------------------------------------------

const mockGetKey = jest.fn(() => "");
const mockHasKey = jest.fn(() => false);

jest.mock("../../src/api/keyVault", () => ({
  getKey: (...args: unknown[]) => mockGetKey(...args),
  saveKey: jest.fn(),
  removeKey: jest.fn(),
  hasKey: (...args: unknown[]) => mockHasKey(...args),
}));

// ---------------------------------------------------------------------------
// Mock devicePreferences
// ---------------------------------------------------------------------------

const mockGetDevicePref = jest.fn(() => undefined as unknown);

jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: (...args: unknown[]) => mockGetDevicePref(...args),
  setDevicePref: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  mockGetKey.mockReset().mockReturnValue("");
  mockHasKey.mockReset().mockReturnValue(false);
  mockGetDevicePref.mockReset().mockReturnValue(undefined);
});

// ===========================================================================
// 17.45 — Adapter Descriptor Conformance
// ===========================================================================

describe("Commercial adapter descriptors (Story 17.45)", () => {
  const adapters: SourceAdapter[] = [
    new LexisAdapter(),
    new WestlawAdapter(),
    new VlexAdapter(),
    new JadeProAdapter(),
    new HabeasAdapter(),
  ];

  it.each(adapters.map((a) => [a.descriptor.id, a]))(
    "%s implements SourceAdapter interface",
    (_id, adapter) => {
      const a = adapter as SourceAdapter;
      expect(a.descriptor).toBeDefined();
      expect(typeof a.descriptor.id).toBe("string");
      expect(typeof a.descriptor.displayName).toBe("string");
      expect(Array.isArray(a.descriptor.jurisdictions)).toBe(true);
      expect(Array.isArray(a.descriptor.contentTypes)).toBe(true);
      expect(typeof a.descriptor.accessTier).toBe("string");
      expect(typeof a.descriptor.requiresKey).toBe("boolean");
      expect(typeof a.descriptor.fragile).toBe("boolean");
      expect(typeof a.search).toBe("function");
      expect(typeof a.resolve).toBe("function");
      expect(typeof a.getMetadata).toBe("function");
      expect(typeof a.healthcheck).toBe("function");
    },
  );

  it("all commercial adapters have unique IDs", () => {
    const ids = adapters.map((a) => a.descriptor.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Lexis descriptor has correct fields", () => {
    const d = new LexisAdapter().descriptor;
    expect(d.id).toBe("lexis-au");
    expect(d.displayName).toBe("Lexis+ AU");
    expect(d.contentTypes).toEqual(["case", "legislation", "journal"]);
    expect(d.jurisdictions).toEqual(["Cth", "NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"]);
    expect(d.accessTier).toBe("link-only");
    expect(d.requiresKey).toBe(true);
    expect(d.fragile).toBe(false);
  });

  it("Westlaw descriptor has correct fields", () => {
    const d = new WestlawAdapter().descriptor;
    expect(d.id).toBe("westlaw-au");
    expect(d.displayName).toBe("Westlaw AU");
    expect(d.contentTypes).toEqual(["case", "legislation", "journal"]);
    expect(d.requiresKey).toBe(true);
  });

  it("vLex descriptor has correct fields", () => {
    const d = new VlexAdapter().descriptor;
    expect(d.id).toBe("vlex");
    expect(d.displayName).toBe("vLex");
    expect(d.contentTypes).toEqual(["case", "legislation", "journal"]);
    expect(d.accessTier).toBe("link-only");
    expect(d.requiresKey).toBe(true);
  });

  it("Jade Pro descriptor has correct fields", () => {
    const d = new JadeProAdapter().descriptor;
    expect(d.id).toBe("jade-pro");
    expect(d.displayName).toBe("Jade Professional");
    expect(d.accessTier).toBe("link-only");
    expect(d.requiresKey).toBe(false);
  });

  it("Habeas descriptor has correct fields", () => {
    const d = new HabeasAdapter().descriptor;
    expect(d.id).toBe("habeas");
    expect(d.displayName).toBe("Habeas");
    expect(d.accessTier).toBe("link-only");
    expect(d.requiresKey).toBe(true);
  });
});

// ===========================================================================
// 17.46 — Lexis+ AU Adapter Stub
// ===========================================================================

describe("LexisAdapter (Story 17.46)", () => {
  let adapter: LexisAdapter;

  beforeEach(() => {
    adapter = new LexisAdapter();
  });

  it("search returns empty without key", async () => {
    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("search returns empty even with key (stub)", async () => {
    mockGetKey.mockReturnValue("some-key");
    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("resolve returns null", async () => {
    expect(await adapter.resolve("test")).toBeNull();
  });

  it("getMetadata returns null", async () => {
    expect(await adapter.getMetadata("123")).toBeNull();
  });

  it("healthcheck returns degraded without key", async () => {
    expect(await adapter.healthcheck()).toBe("degraded");
  });

  it("healthcheck returns healthy with key", async () => {
    mockGetKey.mockReturnValue("some-key");
    expect(await adapter.healthcheck()).toBe("healthy");
  });
});

// ===========================================================================
// 17.47 — Westlaw AU Adapter Stub
// ===========================================================================

describe("WestlawAdapter (Story 17.47)", () => {
  let adapter: WestlawAdapter;

  beforeEach(() => {
    adapter = new WestlawAdapter();
  });

  it("search returns empty without key", async () => {
    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("search returns empty even with key (stub)", async () => {
    mockGetKey.mockReturnValue("some-key");
    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("resolve returns null", async () => {
    expect(await adapter.resolve("test")).toBeNull();
  });

  it("getMetadata returns null", async () => {
    expect(await adapter.getMetadata("123")).toBeNull();
  });

  it("healthcheck returns degraded without key", async () => {
    expect(await adapter.healthcheck()).toBe("degraded");
  });

  it("healthcheck returns healthy with key", async () => {
    mockGetKey.mockReturnValue("some-key");
    expect(await adapter.healthcheck()).toBe("healthy");
  });
});

// ===========================================================================
// 17.48 — vLex Adapter
// ===========================================================================

describe("VlexAdapter (Story 17.48)", () => {
  let adapter: VlexAdapter;

  beforeEach(() => {
    adapter = new VlexAdapter();
  });

  it("search returns empty without key", async () => {
    const results = await adapter.search("test query");
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("search calls vLex API with Bearer auth when key present", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: "doc-1",
            title: "Test Case",
            snippet: "A test case snippet",
            url: "https://vlex.com/doc/1",
            year: 2024,
            court: "HCA",
          },
        ],
      }),
    );

    const results = await adapter.search("test query");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("https://api.vlex.com/search?q=");
    expect(url).toContain("test%20query");
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer test-api-key",
        Accept: "application/json",
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Test Case");
    expect(results[0].sourceId).toBe("doc-1");
    expect(results[0].sourceUrl).toBe("https://vlex.com/doc/1");
    expect(results[0].attribution).toBe("vLex");
  });

  it("search returns empty on API error", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockResolvedValue(jsonResponse({}, 500));

    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("search returns empty on network error", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockRejectedValue(new Error("Network error"));

    const results = await adapter.search("test query");
    expect(results).toEqual([]);
  });

  it("resolve returns null without key", async () => {
    expect(await adapter.resolve("test")).toBeNull();
  });

  it("resolve searches and fetches top result metadata", async () => {
    mockGetKey.mockReturnValue("test-api-key");

    // First call: search
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: "doc-42", title: "Smith v Jones" },
        ],
      }),
    );

    // Second call: getMetadata
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "doc-42",
        title: "Smith v Jones",
        year: 2023,
        court: "FCA",
        jurisdiction: "AU",
      }),
    );

    const meta = await adapter.resolve("Smith v Jones");
    expect(meta).not.toBeNull();
    expect(meta?.title).toBe("Smith v Jones");
    expect(meta?.year).toBe(2023);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("getMetadata fetches document by ID", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockResolvedValue(
      jsonResponse({
        id: "doc-42",
        title: "Smith v Jones",
        year: 2023,
        court: "FCA",
        page: "123-145",
      }),
    );

    const meta = await adapter.getMetadata("doc-42");
    expect(meta).not.toBeNull();
    expect(meta?.title).toBe("Smith v Jones");
    expect(meta?.startingPage).toBe(123);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.vlex.com/documents/doc-42",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  it("getMetadata returns null without key", async () => {
    expect(await adapter.getMetadata("doc-42")).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("healthcheck returns degraded without key", async () => {
    expect(await adapter.healthcheck()).toBe("degraded");
  });

  it("healthcheck returns healthy with key and successful API call", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockResolvedValue(jsonResponse({}));

    expect(await adapter.healthcheck()).toBe("healthy");
  });

  it("healthcheck returns offline on network error", async () => {
    mockGetKey.mockReturnValue("test-api-key");
    mockFetch.mockRejectedValue(new Error("Network error"));

    expect(await adapter.healthcheck()).toBe("offline");
  });
});

// ===========================================================================
// 17.49 — Jade Professional Link-Out
// ===========================================================================

describe("JadeProAdapter (Story 17.49)", () => {
  let adapter: JadeProAdapter;

  beforeEach(() => {
    adapter = new JadeProAdapter();
  });

  it("search returns empty (link-only)", async () => {
    const results = await adapter.search("test");
    expect(results).toEqual([]);
  });

  it("getMetadata returns null (link-only)", async () => {
    expect(await adapter.getMetadata("123")).toBeNull();
  });

  it("healthcheck returns healthy (no external dependency)", async () => {
    expect(await adapter.healthcheck()).toBe("healthy");
  });

  it("buildJadeFreeUrl constructs correct URL", () => {
    expect(buildJadeFreeUrl("HCA", 2024, 10)).toBe(
      "https://jade.io/article/HCA/2024/10",
    );
  });

  it("buildJadeProUrl constructs correct professional URL", () => {
    expect(buildJadeProUrl("HCA", 2024, 10)).toBe(
      "https://pro.jade.io/article/HCA/2024/10",
    );
  });

  it("resolve constructs free-tier URL when Pro toggle is off", async () => {
    mockGetDevicePref.mockReturnValue(undefined);

    const meta = await adapter.resolve("[2024] HCA 10");
    expect(meta).not.toBeNull();
    expect(meta?.sourceUrl).toBe("https://jade.io/article/HCA/2024/10");
    expect(meta?.mnc).toBe("[2024] HCA 10");
    expect(meta?.year).toBe(2024);
    expect(meta?.court).toBe("HCA");
  });

  it("resolve constructs Pro URL when Pro toggle is on", async () => {
    mockGetDevicePref.mockReturnValue(true);

    const meta = await adapter.resolve("[2024] HCA 10");
    expect(meta).not.toBeNull();
    expect(meta?.sourceUrl).toBe("https://pro.jade.io/article/HCA/2024/10");
  });

  it("resolve returns null for unparseable citation", async () => {
    expect(await adapter.resolve("not a citation")).toBeNull();
  });

  it("hasJadeProSubscription returns false when pref not set", () => {
    mockGetDevicePref.mockReturnValue(undefined);
    expect(hasJadeProSubscription()).toBe(false);
  });

  it("hasJadeProSubscription returns true when pref is true", () => {
    mockGetDevicePref.mockReturnValue(true);
    expect(hasJadeProSubscription()).toBe(true);
  });

  it("hasJadeProSubscription reads correct preference key", () => {
    hasJadeProSubscription();
    expect(mockGetDevicePref).toHaveBeenCalledWith("jadeProSubscription");
  });

  it("makes no HTTP requests", async () => {
    mockGetDevicePref.mockReturnValue(true);
    await adapter.search("test");
    await adapter.resolve("[2024] HCA 10");
    await adapter.getMetadata("123");
    await adapter.healthcheck();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 17.50 — Habeas Placeholder
// ===========================================================================

describe("HabeasAdapter (Story 17.50)", () => {
  let adapter: HabeasAdapter;

  beforeEach(() => {
    adapter = new HabeasAdapter();
  });

  it("search returns empty", async () => {
    expect(await adapter.search("test")).toEqual([]);
  });

  it("resolve returns null", async () => {
    expect(await adapter.resolve("test")).toBeNull();
  });

  it("getMetadata returns null", async () => {
    expect(await adapter.getMetadata("123")).toBeNull();
  });

  it("healthcheck returns offline", async () => {
    expect(await adapter.healthcheck()).toBe("offline");
  });
});

// ===========================================================================
// Cross-cutting: all commercial adapters graceful without keys
// ===========================================================================

describe("All commercial adapters graceful without keys", () => {
  const adapterClasses = [
    ["LexisAdapter", LexisAdapter],
    ["WestlawAdapter", WestlawAdapter],
    ["VlexAdapter", VlexAdapter],
    ["JadeProAdapter", JadeProAdapter],
    ["HabeasAdapter", HabeasAdapter],
  ] as const;

  it.each(adapterClasses)(
    "%s returns empty search results without key",
    async (_name, AdapterClass) => {
      const adapter = new AdapterClass();
      const results = await adapter.search("test query");
      expect(results).toEqual([]);
    },
  );

  it.each(adapterClasses)(
    "%s returns null from resolve without key",
    async (_name, AdapterClass) => {
      const adapter = new AdapterClass();
      const result = await adapter.resolve("test citation");
      // JadeProAdapter returns metadata for valid MNCs even without key
      if (adapter.descriptor.id !== "jade-pro") {
        expect(result).toBeNull();
      }
    },
  );

  it.each(adapterClasses)(
    "%s returns null from getMetadata without key",
    async (_name, AdapterClass) => {
      const adapter = new AdapterClass();
      const result = await adapter.getMetadata("test-id");
      expect(result).toBeNull();
    },
  );

  it.each(adapterClasses)(
    "%s healthcheck does not throw without key",
    async (_name, AdapterClass) => {
      const adapter = new AdapterClass();
      const health = await adapter.healthcheck();
      expect(["healthy", "degraded", "offline"]).toContain(health);
    },
  );
});
