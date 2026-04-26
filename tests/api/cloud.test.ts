/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Stories 17.39–17.44 — Obiter Cloud: unit tests.
 */

import {
  LICENCE_LEDGER,
  getReplicableSources,
  isReplicable,
  getAttribution,
} from "../../src/api/cloud/licenceLedger";

import {
  getCloudMode,
  setCloudMode,
  shouldUseCloud,
  shouldUseLocal,
} from "../../src/api/cloud/cloudMode";

import { sanitiseQuery, getPrivacyPolicy, isLocalOnlyMode } from "../../src/api/cloud/privacy";

import { CloudSearchClient, CloudClientError } from "../../src/api/cloud/cloudClient";

import { getIngestionSchedule } from "../../src/api/cloud/ingestionPipeline";

// ---------------------------------------------------------------------------
// Mock devicePreferences
// ---------------------------------------------------------------------------

const mockStore: Record<string, unknown> = {};

jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: (key: string) => mockStore[key],
  setDevicePref: (key: string, value: unknown) => {
    if (value === undefined) {
      delete mockStore[key];
    } else {
      mockStore[key] = value;
    }
  },
}));

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.Mock;
(globalThis as Record<string, unknown>).fetch = mockFetch;

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  mockFetch.mockReset();
});

// ===========================================================================
// 17.39 — Licence Ledger
// ===========================================================================

describe("17.39 — Licence Ledger", () => {
  test("ledger contains both replicable and non-replicable entries", () => {
    const replicable = LICENCE_LEDGER.filter((e) => e.replicable);
    const nonReplicable = LICENCE_LEDGER.filter((e) => !e.replicable);
    expect(replicable.length).toBeGreaterThan(0);
    expect(nonReplicable.length).toBeGreaterThan(0);
  });

  test("getReplicableSources returns only replicable entries", () => {
    const sources = getReplicableSources();
    expect(sources.every((s) => s.replicable)).toBe(true);
    expect(sources.length).toBe(
      LICENCE_LEDGER.filter((e) => e.replicable).length,
    );
  });

  test("isReplicable returns true for corpus, false for austlii", () => {
    expect(isReplicable("corpus")).toBe(true);
    expect(isReplicable("austlii")).toBe(false);
  });

  test("isReplicable returns false for unknown sourceId", () => {
    expect(isReplicable("nonexistent")).toBe(false);
  });

  test("getAttribution returns correct string for known source", () => {
    expect(getAttribution("corpus")).toBe(
      "Isaacus, Open Australian Legal Corpus (CC BY 4.0)",
    );
    expect(getAttribution("crossref")).toBe("Crossref (CC0)");
  });

  test("getAttribution returns undefined for unknown source", () => {
    expect(getAttribution("nonexistent")).toBeUndefined();
  });

  test("every replicable source has permitted status", () => {
    const replicable = getReplicableSources();
    for (const entry of replicable) {
      expect(entry.permissionStatus).toBe("permitted");
    }
  });

  test("every entry has a non-empty attributionString", () => {
    for (const entry of LICENCE_LEDGER) {
      expect(entry.attributionString.length).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// 17.42 — Cloud Mode Toggle
// ===========================================================================

describe("17.42 — Cloud Mode Toggle", () => {
  test("default mode is local-then-cloud", () => {
    expect(getCloudMode()).toBe("local-then-cloud");
  });

  test("setCloudMode persists and getCloudMode reads back", () => {
    setCloudMode("cloud-only");
    expect(getCloudMode()).toBe("cloud-only");

    setCloudMode("local-only");
    expect(getCloudMode()).toBe("local-only");

    setCloudMode("local-then-cloud");
    expect(getCloudMode()).toBe("local-then-cloud");
  });

  test("invalid stored value falls back to default", () => {
    mockStore["cloudMode"] = "nonsense";
    expect(getCloudMode()).toBe("local-then-cloud");
  });

  test("shouldUseCloud reflects mode", () => {
    setCloudMode("local-only");
    expect(shouldUseCloud()).toBe(false);

    setCloudMode("cloud-only");
    expect(shouldUseCloud()).toBe(true);

    setCloudMode("local-then-cloud");
    expect(shouldUseCloud()).toBe(true);
  });

  test("shouldUseLocal reflects mode", () => {
    setCloudMode("local-only");
    expect(shouldUseLocal()).toBe(true);

    setCloudMode("cloud-only");
    expect(shouldUseLocal()).toBe(false);

    setCloudMode("local-then-cloud");
    expect(shouldUseLocal()).toBe(true);
  });
});

// ===========================================================================
// 17.43 — Privacy & Query Anonymisation
// ===========================================================================

describe("17.43 — Privacy & Query Anonymisation", () => {
  test("strips email addresses", () => {
    expect(sanitiseQuery("search user@example.com case")).toBe(
      "search [REDACTED] case",
    );
  });

  test("strips multiple emails", () => {
    expect(
      sanitiseQuery("from a@b.co to c@d.org"),
    ).toBe("from [REDACTED] to [REDACTED]");
  });

  test("strips Australian mobile numbers", () => {
    expect(sanitiseQuery("call 0412 345 678")).toBe("call [REDACTED]");
    expect(sanitiseQuery("call +61412345678")).toBe("call [REDACTED]");
  });

  test("strips Australian landline numbers", () => {
    expect(sanitiseQuery("ring (02) 9876 5432")).toContain("[REDACTED]");
    expect(sanitiseQuery("ring 02 9876 5432")).toContain("[REDACTED]");
  });

  test("leaves normal citation text untouched", () => {
    const citation = "Smith v Jones [2024] HCA 12";
    expect(sanitiseQuery(citation)).toBe(citation);
  });

  test("getPrivacyPolicy returns non-empty string", () => {
    const policy = getPrivacyPolicy();
    expect(policy.length).toBeGreaterThan(100);
    expect(policy).toContain("TLS");
    expect(policy).toContain("GPLv3");
  });

  test("isLocalOnlyMode reflects cloud mode", () => {
    setCloudMode("local-only");
    expect(isLocalOnlyMode()).toBe(true);

    setCloudMode("cloud-only");
    expect(isLocalOnlyMode()).toBe(false);
  });
});

// ===========================================================================
// 17.40 — Cloud Search Client
// ===========================================================================

describe("17.40 — Cloud Search Client", () => {
  test("constructor uses provided base URL", () => {
    const client = new CloudSearchClient("https://custom.example.com");
    // We verify by checking the fetch call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], totalHits: 0, queryTimeMs: 5 }),
    });

    client.search("test");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom.example.com/api/search",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("constructor falls back to default URL", () => {
    const client = new CloudSearchClient();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], totalHits: 0, queryTimeMs: 5 }),
    });

    client.search("test");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://search.obiter.com.au/api/search",
      expect.anything(),
    );
  });

  test("constructor reads cloudBaseUrl from device preferences", () => {
    mockStore["cloudBaseUrl"] = "https://pref.example.com";
    const client = new CloudSearchClient();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], totalHits: 0, queryTimeMs: 5 }),
    });

    client.search("test");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://pref.example.com/api/search",
      expect.anything(),
    );
  });

  test("search sends correct body", async () => {
    const client = new CloudSearchClient("https://test.local");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [], totalHits: 0, queryTimeMs: 1 }),
    });

    await client.search("Smith v Jones", { jurisdiction: "HCA" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.query).toBe("Smith v Jones");
    expect(body.jurisdiction).toBe("HCA");
  });

  test("resolve sends citation in body", async () => {
    const client = new CloudSearchClient("https://test.local");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ found: true, title: "Smith v Jones" }),
    });

    const result = await client.resolve("Smith v Jones [2024] HCA 12");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.citation).toBe("Smith v Jones [2024] HCA 12");
    expect(result.found).toBe(true);
  });

  test("throws CloudClientError on HTTP error", async () => {
    const client = new CloudSearchClient("https://test.local");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(client.search("test")).rejects.toThrow(CloudClientError);
  });

  test("CloudClientError includes status code", async () => {
    const client = new CloudSearchClient("https://test.local");
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    try {
      await client.search("test");
      fail("Expected CloudClientError");
    } catch (err) {
      expect(err).toBeInstanceOf(CloudClientError);
      expect((err as CloudClientError).statusCode).toBe(429);
    }
  });

  test("throws CloudClientError on network failure", async () => {
    const client = new CloudSearchClient("https://test.local");
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(client.search("test")).rejects.toThrow(CloudClientError);
  });
});

// ===========================================================================
// 17.41 — Ingestion Pipeline (stub)
// ===========================================================================

describe("17.41 — Ingestion Pipeline stub", () => {
  test("getIngestionSchedule returns a job for each replicable source", () => {
    const schedule = getIngestionSchedule();
    const replicable = getReplicableSources();
    expect(schedule.length).toBe(replicable.length);

    for (const job of schedule) {
      expect(isReplicable(job.sourceId)).toBe(true);
      expect(job.schedule).toBeTruthy();
      expect(job.status).toBe("idle");
    }
  });
});
