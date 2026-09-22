/**
 * @jest-environment jsdom
 *
 * ENP-005: earlier versions of one citation, read from the SAFE-001 store
 * snapshots. The snapshot reader is stubbed; the store XML is built with
 * the real serializer and parsed with the real parser, so a version is only
 * reported when the round-tripped citation differs from the current one.
 */
import { changedFieldKeys, listCitationVersions } from "../../src/store/citationHistory";
import type { CitationHistoryDeps } from "../../src/store/citationHistory";
import { deserializeStore, serializeStore } from "../../src/store/xmlSerializer";
import type { SnapshotReason, StoreSnapshot } from "../../src/store/backupSerializer";
import type { Citation } from "../../src/types/citation";

function book(overrides: Partial<Citation> = {}, data: Record<string, unknown> = {}): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType: "book",
    data: {
      authors: [{ givenNames: "James", surname: "Edelman" }],
      title: "Unjust Enrichment",
      publisher: "Hart Publishing",
      year: "2016",
      ...data,
    },
    shortTitle: "Edelman",
    tags: ["import", "remedies"],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

function snapshot(timestamp: string, reason: SnapshotReason, citations: Citation[]): StoreSnapshot {
  return { timestamp, reason, citationCount: citations.length, storeXml: serializeStore(citations) };
}

function stubDeps(snapshots: StoreSnapshot[]): CitationHistoryDeps & {
  parseStoreXml: jest.Mock<ReturnType<typeof deserializeStore>, [string]>;
  getSnapshot: jest.Mock<Promise<StoreSnapshot | null>, [string]>;
} {
  return {
    listSnapshots: jest.fn(async () =>
      snapshots.map((s) => ({ timestamp: s.timestamp, reason: s.reason, citationCount: s.citationCount }))
    ),
    getSnapshot: jest.fn(async (timestamp: string) => snapshots.find((s) => s.timestamp === timestamp) ?? null),
    parseStoreXml: jest.fn((xml: string) => deserializeStore(xml)),
  };
}

const T0 = "2026-09-01T09:00:00.000Z";
const T1 = "2026-09-01T10:00:00.000Z";
const T2 = "2026-09-02T10:00:00.000Z";
const T3 = "2026-09-03T10:00:00.000Z";

describe("changedFieldKeys", () => {
  it("ignores the interchange bag, underscore bookkeeping keys, and number-vs-string values", () => {
    const current = book({}, { year: "2016", _formatPreference: "auto", interchange: { v: 1 } });
    const older = book({}, { year: 2016, interchange: { v: 1, abstract: "different" } });
    expect(changedFieldKeys(older, current)).toEqual([]);
  });

  it("reports data keys, short title and tags that differ", () => {
    const current = book();
    const older = book({ shortTitle: "", tags: ["import"] }, { title: "Unjust Enrichmnt", edition: "2nd" });
    expect(changedFieldKeys(older, current)).toEqual(["title", "edition", "shortTitle", "tags"]);
  });
});

describe("listCitationVersions", () => {
  it("returns only versions that differ from the current citation, newest first, with field labels", async () => {
    const current = book({}, { _formatPreference: "auto" });
    const same = book();
    const yearOnly = book({}, { year: "2015" });
    const older = book({ tags: ["import"] }, { title: "Unjust Enrichmnt", year: "2015" });
    const deps = stubDeps([
      // Listed out of order on purpose: the helper sorts newest first.
      snapshot(T1, "manual", [older]),
      snapshot(T3, "persist", [same]),
      snapshot(T2, "persist", [yearOnly]),
      snapshot(T0, "persist", [older]),
    ]);

    const versions = await listCitationVersions(current, deps);

    expect(versions.map((v) => v.timestamp)).toEqual([T2, T1]);
    expect(versions[0].reason).toBe("persist");
    expect(versions[0].changedFields).toEqual(["Year"]);
    // Fields typed string come back from the XML store as numbers.
    expect(String(versions[0].citation.data.year)).toBe("2015");
    expect(versions[1].reason).toBe("manual");
    expect(versions[1].changedFields).toEqual(["Title", "Year", "Tags"]);
    expect(versions[1].citation.tags).toEqual(["import"]);
  });

  it("parses each snapshot at most once", async () => {
    const deps = stubDeps([
      snapshot(T2, "persist", [book({}, { year: "2015" })]),
      snapshot(T1, "persist", [book({}, { year: "2014" })]),
    ]);
    await listCitationVersions(book(), deps);
    expect(deps.getSnapshot).toHaveBeenCalledTimes(2);
    expect(deps.parseStoreXml).toHaveBeenCalledTimes(2);
  });

  it("skips snapshots that are missing, unparsable, or do not hold the citation", async () => {
    const other = book({ id: "someone-else" }, { title: "Other" });
    const deps = stubDeps([
      snapshot(T3, "persist", [other]),
      { timestamp: T2, reason: "persist", citationCount: 1, storeXml: "<not-xml" },
      snapshot(T1, "manual", [book({}, { year: "2015" })]),
    ]);
    deps.listSnapshots = jest.fn(async () => [
      { timestamp: T3, reason: "persist", citationCount: 1 },
      { timestamp: T2, reason: "persist", citationCount: 1 },
      { timestamp: "2026-09-01T11:00:00.000Z", reason: "persist", citationCount: 1 },
      { timestamp: T1, reason: "manual", citationCount: 1 },
    ]);

    const versions = await listCitationVersions(book(), deps);
    expect(versions.map((v) => v.timestamp)).toEqual([T1]);
    expect(versions[0].changedFields).toEqual(["Year"]);
  });

  it("falls back to the data key when no edit field carries it", async () => {
    const deps = stubDeps([snapshot(T1, "persist", [book({}, { mysteryKey: "old" })])]);
    const versions = await listCitationVersions(book({}, { mysteryKey: "new" }), deps);
    expect(versions[0].changedFields).toEqual(["mysteryKey"]);
  });

  it("returns an empty list when there are no snapshots", async () => {
    expect(await listCitationVersions(book(), stubDeps([]))).toEqual([]);
  });
});
