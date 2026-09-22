/**
 * @jest-environment jsdom
 *
 * ENP-005: a citation's history through the real store, backup part and
 * serializer over the fake Word harness. Two manual snapshots bracket two
 * edits; the history lists both earlier states with the right changed
 * fields, and restoring the oldest through the store puts the old title back.
 */
import { CitationStore } from "../../src/store/citationStore";
import { addSnapshot, getSnapshot, listSnapshots } from "../../src/store/backupStore";
import { deserializeStore } from "../../src/store/xmlSerializer";
import { listCitationVersions } from "../../src/store/citationHistory";
import type { Citation } from "../../src/types/citation";
import { FakeDocState, installFakeWord, makeFakeContext } from "../store/fakeWordHarness";

const T1 = "2026-09-01T10:00:00.000Z";
const T2 = "2026-09-02T10:00:00.000Z";

function book(): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType: "book",
    data: {
      authors: [{ givenNames: "James", surname: "Edelman" }],
      title: "Unjust Enrichmnt",
      publisher: "Hart Publishing",
      year: "2015",
    },
    tags: ["remedies"],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-01-15T10:30:00.000Z",
  };
}

/** Write a manual snapshot of the on-document store XML at a fixed time. */
async function snapshotNow(doc: FakeDocState, timestamp: string): Promise<void> {
  const context = makeFakeContext(doc).context as unknown as Word.RequestContext;
  const part = doc.obiterParts()[0];
  expect(part).toBeDefined();
  const added = await addSnapshot(context, {
    storeXml: part.xml,
    citationCount: 1,
    reason: "manual",
    timestamp,
  });
  expect(added).toBe(true);
}

const deps = { listSnapshots, getSnapshot, parseStoreXml: deserializeStore };

describe("ENP-005: citation history through the store", () => {
  let doc: FakeDocState;
  let store: CitationStore;

  beforeEach(async () => {
    doc = new FakeDocState();
    installFakeWord(doc);
    store = new CitationStore();
    await store.initStore();
    await store.add(book());
    await snapshotNow(doc, T1);

    const first = store.getById("c1")!;
    await store.update({
      ...first,
      data: { ...first.data, title: "Unjust Enrichment" },
      modifiedAt: "2026-09-01T12:00:00.000Z",
    });
    await snapshotNow(doc, T2);

    const second = store.getById("c1")!;
    await store.update({
      ...second,
      data: { ...second.data, year: "2016" },
      modifiedAt: "2026-09-02T12:00:00.000Z",
    });
  });

  it("lists both earlier states, newest first, with the fields that differ from the current record", async () => {
    const current = store.getById("c1")!;
    expect(current.data.title).toBe("Unjust Enrichment");
    expect(String(current.data.year)).toBe("2016");

    const versions = await listCitationVersions(current, deps);
    expect(versions.map((v) => [v.timestamp, v.reason, v.changedFields])).toEqual([
      [T2, "manual", ["Year"]],
      [T1, "manual", ["Title", "Year"]],
    ]);
    expect(versions[1].citation.data.title).toBe("Unjust Enrichmnt");
  });

  it("restoring the oldest version through the store puts the old title back", async () => {
    const current = store.getById("c1")!;
    const versions = await listCitationVersions(current, deps);
    const oldest = versions[versions.length - 1];

    await store.update({
      ...oldest.citation,
      id: current.id,
      createdAt: current.createdAt,
      modifiedAt: "2026-09-03T12:00:00.000Z",
    });

    const restored = store.getById("c1")!;
    expect(restored.data.title).toBe("Unjust Enrichmnt");
    expect(String(restored.data.year)).toBe("2015");
    expect(restored.tags).toEqual(["remedies"]);
    expect(restored.createdAt).toBe(current.createdAt);

    // The document store carries the restored values too, not only memory.
    const onDocument = deserializeStore(doc.obiterParts()[0].xml).citations.find((c) => c.id === "c1");
    expect(onDocument?.data.title).toBe("Unjust Enrichmnt");

    // The history is relative to the restored record: the T1 state now matches
    // it and drops out, T2 differs by title only. (The restore's own persist
    // snapshot falls inside the SAFE-001 throttle window of the store's first
    // persist, so no third state appears.)
    const after = await listCitationVersions(restored, deps);
    expect(after.map((v) => [v.timestamp, v.changedFields])).toEqual([[T2, ["Title"]]]);
    expect(after[0].citation.data.title).toBe("Unjust Enrichment");
  });
});
