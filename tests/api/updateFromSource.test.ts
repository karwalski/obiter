/**
 * ENP-007: refetching a citation from its source — gating on the master
 * toggle and enabled adapters, the provenance-first order, the timeout
 * path, offline adapters, and the updated / same / unavailable statuses.
 */

import { MockAdapter } from "../../src/api/adapters/mockAdapter";
import type { SourceAdapter, SourceMetadata } from "../../src/api/sourceAdapter";
import type { Citation } from "../../src/types/citation";
import {
  canUpdateFromSource,
  fetchSourceUpdate,
  LOOKUP_OFF_MESSAGE,
  NO_ADAPTER_MESSAGE,
  NO_CONTENT_TYPE_MESSAGE,
  NO_MATCH_MESSAGE,
} from "../../src/api/updateFromSource";

let mockMaster = true;
let mockEnabledIds: string[] = ["mock"];
let mockAdapterList: SourceAdapter[] = [];

jest.mock("../../src/api/sourceRegistry", () => ({
  isMasterEnabled: (): boolean => mockMaster,
  isAdapterEnabled: (id: string): boolean => mockEnabledIds.includes(id),
}));
jest.mock("../../src/api/adapterSearch", () => ({
  getAllAdapterInstances: (): unknown[] => mockAdapterList,
}));
jest.mock("../../src/api/sourcePreferences", () => ({
  getPreferredAdapters: (): string[] => [],
}));
jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: (): unknown => undefined,
}));

/** An adapter whose calls never settle (the timeout path). */
function hangingAdapter(): SourceAdapter {
  const never = (): Promise<SourceMetadata | null> => new Promise(() => undefined);
  return {
    descriptor: {
      id: "slow",
      displayName: "Slow Source",
      jurisdictions: ["AU"],
      contentTypes: ["case", "legislation", "journal"],
      accessTier: "live",
      licence: "test",
      requiresKey: false,
      rateLimitHint: { requestsPerSecond: 5, burst: 5 },
      fragile: false,
    },
    search: async () => [],
    resolve: never,
    getMetadata: never,
    healthcheck: async () => "healthy",
  };
}

/** An adapter that rejects every call (offline). */
function offlineAdapter(): SourceAdapter {
  const fail = (): Promise<SourceMetadata | null> => Promise.reject(new Error("ECONNREFUSED"));
  return {
    descriptor: {
      id: "offline",
      displayName: "Offline Source",
      jurisdictions: ["AU"],
      contentTypes: ["case", "legislation", "journal"],
      accessTier: "live",
      licence: "test",
      requiresKey: false,
      rateLimitHint: { requestsPerSecond: 0, burst: 0 },
      fragile: false,
    },
    search: async () => [],
    resolve: fail,
    getMetadata: fail,
    healthcheck: async () => "offline",
  };
}

const mabo: Citation = {
  id: "c1",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland",
    year: "1992",
    volume: "175",
    reportSeries: "CLR",
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  modifiedAt: "2026-01-01T00:00:00.000Z",
};
const MABO_TEXT = "Mabo v Queensland (No 2) (1992) 175 CLR 1";

describe("canUpdateFromSource", () => {
  beforeEach(() => {
    mockMaster = true;
    mockEnabledIds = ["mock"];
    mockAdapterList = [new MockAdapter()];
  });

  test("master toggle off", () => {
    mockMaster = false;
    expect(canUpdateFromSource(mabo)).toEqual({ ok: false, reason: LOOKUP_OFF_MESSAGE });
  });

  test("no enabled adapter for the content type", () => {
    mockEnabledIds = [];
    expect(canUpdateFromSource(mabo)).toEqual({ ok: false, reason: NO_ADAPTER_MESSAGE });
  });

  test("a source type no adapter covers", () => {
    expect(canUpdateFromSource({ ...mabo, sourceType: "book" })).toEqual({
      ok: false,
      reason: NO_CONTENT_TYPE_MESSAGE,
    });
  });

  test("ok when the master toggle is on and an adapter is enabled", () => {
    expect(canUpdateFromSource(mabo)).toEqual({ ok: true });
  });
});

describe("fetchSourceUpdate", () => {
  beforeEach(() => {
    mockMaster = true;
    mockEnabledIds = ["mock"];
    mockAdapterList = [new MockAdapter()];
  });

  test("master toggle off is unavailable with the Settings hint", async () => {
    mockMaster = false;
    await expect(fetchSourceUpdate(mabo, MABO_TEXT)).resolves.toEqual({
      status: "unavailable",
      message: LOOKUP_OFF_MESSAGE,
    });
  });

  test("no adapters is unavailable", async () => {
    mockAdapterList = [];
    await expect(fetchSourceUpdate(mabo, MABO_TEXT)).resolves.toEqual({
      status: "unavailable",
      message: NO_ADAPTER_MESSAGE,
    });
  });

  test("resolves through the mock adapter and reports the missing starting page", async () => {
    const seen: string[] = [];
    const result = await fetchSourceUpdate(mabo, MABO_TEXT, {
      onAttempt: ({ label }) => seen.push(label),
    });
    expect(seen).toEqual(["Mock Adapter"]);
    expect(result.status).toBe("updated");
    expect(result.adapterId).toBe("mock");
    expect(result.adapterLabel).toBe("Mock Adapter");
    expect(result.rawId).toBeUndefined();
    expect(result.fields).toMatchObject({
      startingPage: "1",
      courtId: "HCA",
      mnc: "[1992] HCA 23",
    });
    expect(result.differences).toEqual(
      expect.arrayContaining([expect.stringMatching(/^startingPage: empty in the library/)])
    );
    expect(result.differences).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^year:/)])
    );
    expect(result.confidence).toBe(1.0);
  });

  test("same when every mapped field already matches", async () => {
    const complete: Citation = {
      ...mabo,
      data: { ...mabo.data, startingPage: 1, courtId: "HCA", mnc: "[1992] HCA 23" },
    };
    const result = await fetchSourceUpdate(complete, MABO_TEXT);
    expect(result.status).toBe("same");
    expect(result.differences).toEqual([]);
  });

  test("the provenance adapter's record is fetched first, by raw id", async () => {
    const mock = new MockAdapter();
    const getMetadata = jest.spyOn(mock, "getMetadata");
    const resolve = jest.spyOn(mock, "resolve");
    mockAdapterList = [mock];
    const statute: Citation = {
      ...mabo,
      sourceType: "legislation.statute",
      data: {
        title: "Competition and Consumer Act",
        year: "2010",
        interchange: {
          v: 1,
          provenance: {
            format: "adapter",
            rawType: "legislation",
            adapterId: "mock",
            rawId: "mock-legislation-1",
          },
        },
      },
    };
    const result = await fetchSourceUpdate(statute, "Competition and Consumer Act 2010 (Cth)");
    expect(getMetadata).toHaveBeenCalledWith("mock-legislation-1");
    expect(resolve).not.toHaveBeenCalled();
    expect(result.status).toBe("updated");
    expect(result.rawId).toBe("mock-legislation-1");
    expect(result.fields).toEqual({
      title: "Competition and Consumer Act",
      year: "2010",
      jurisdiction: "Cth",
      frliId: "C2004A00109",
    });
    expect(result.differences).toEqual([
      'jurisdiction: empty in the library, "Cth" from the source',
      'frliId: empty in the library, "C2004A00109" from the source',
    ]);
  });

  test("an adapter that never answers times out and the next one is tried", async () => {
    const seen: string[] = [];
    const result = await fetchSourceUpdate(mabo, MABO_TEXT, {
      adapters: [hangingAdapter(), new MockAdapter()],
      timeoutMs: 20,
      onAttempt: ({ label }) => seen.push(label),
    });
    expect(seen).toEqual(["Slow Source", "Mock Adapter"]);
    expect(result.status).toBe("updated");
    expect(result.adapterId).toBe("mock");
  });

  test("an adapter that rejects is skipped; when none answers the result is unavailable", async () => {
    const skipped = await fetchSourceUpdate(mabo, MABO_TEXT, {
      adapters: [offlineAdapter(), new MockAdapter()],
    });
    expect(skipped.status).toBe("updated");
    expect(skipped.adapterId).toBe("mock");

    const none = await fetchSourceUpdate(mabo, MABO_TEXT, { adapters: [offlineAdapter()] });
    expect(none).toEqual({ status: "unavailable", message: NO_MATCH_MESSAGE });
  });

  test("a citation the adapter does not recognise is unavailable", async () => {
    const unknown: Citation = {
      ...mabo,
      data: { party1: "Nobody", party2: "Anyone", year: "2001" },
    };
    await expect(fetchSourceUpdate(unknown, "Nobody v Anyone (2001) 1 CLR 1")).resolves.toEqual({
      status: "unavailable",
      message: NO_MATCH_MESSAGE,
    });
  });
});
