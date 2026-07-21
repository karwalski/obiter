/**
 * @jest-environment jsdom
 *
 * Backup snapshot ring buffer — Office.js layer tests (SAFE-001).
 *
 * Covers the doPersist() snapshot hook, the snapshot policy as observed
 * through real store operations (throttle, shrink-override, dedup, ring,
 * size cap), duplicate/corrupt backup part handling, and
 * CitationStore.restoreFromSnapshot(). Uses the shared fake Word harness —
 * backup parts live in BACKUP_NAMESPACE and are invisible to main-store
 * scans (asserted explicitly in citationStore.test.ts).
 */

let hasDOMParser = typeof DOMParser !== "undefined";
try {
  if (!hasDOMParser) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = eval("require")("jsdom");
    const jsdom = new JSDOM();
    (global as Record<string, unknown>).DOMParser = jsdom.window.DOMParser;
    (global as Record<string, unknown>).XMLSerializer = jsdom.window.XMLSerializer;
    hasDOMParser = true;
  }
} catch {
  // jsdom not available — tests will be skipped
}

const describeIfDOMParser = hasDOMParser ? describe : describe.skip;

import { CitationStore, StoreDataLossError } from "../../src/store/citationStore";
import { deserializeStore, serializeStore } from "../../src/store/xmlSerializer";
import {
  BACKUP_NAMESPACE,
  deserializeBackup,
  serializeBackup,
} from "../../src/store/backupSerializer";
import { getSnapshot, listSnapshots } from "../../src/store/backupStore";
import { FakeDocState, installFakeWord, makeCitation, storeXmlWith } from "./fakeWordHarness";

const T0 = new Date("2026-07-21T10:00:00.000Z");

/** Advance the mocked clock by `seconds` (fake timers mock Date for src code). */
function advanceClock(seconds: number): void {
  jest.setSystemTime(new Date(Date.now() + seconds * 1000));
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Snapshot on persist ────────────────────────────────────────────────────

describeIfDOMParser("doPersist snapshot hook (SAFE-001)", () => {
  test("a persist snapshots the winning on-document XML before destroying it", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const originalXml = storeXmlWith("a", "b");
    doc.addPart(originalXml);

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("c"));

    // The pre-persist on-document XML (2 citations) is now in the backup.
    expect(doc.backupParts()).toHaveLength(1);
    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].reason).toBe("persist");
    expect(snapshots[0].citationCount).toBe(2);

    const snap = await getSnapshot(snapshots[0].timestamp);
    expect(snap).not.toBeNull();
    expect(snap!.storeXml).toBe(originalXml);
    expect(
      deserializeStore(snap!.storeXml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b"]);
  });

  test("a fresh empty store persist writes no snapshot (nothing to protect)", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore(); // creates the first (empty) part — no prior XML

    expect(doc.backupParts()).toHaveLength(0);
  });

  test("throttle: rapid growing persists snapshot once; after 30 s snapshots resume", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("c")); // snapshot of {a,b}
    await store.add(makeCitation("d")); // within 30 s, growing — throttled
    expect(await listSnapshots()).toHaveLength(1);

    advanceClock(31);
    await store.add(makeCitation("e")); // snapshot of {a,b,c,d}
    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].citationCount).toBe(4);
    expect(snapshots[1].citationCount).toBe(2);
  });

  test("shrink-override beats the throttle: a persist that reduces the count always snapshots", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("c")); // snapshot 1: {a,b}
    await store.remove("c"); // within 30 s, but shrinking: snapshot 2: {a,b,c}

    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].citationCount).toBe(3);
    const snap = await getSnapshot(snapshots[0].timestamp);
    expect(
      deserializeStore(snap!.storeXml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c"]);
  });

  test("dedup: re-persisting an identical store adds no duplicate snapshot", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a"));

    const store = new CitationStore();
    await store.initStore();
    // Each call persists the same in-memory data — the on-document XML
    // stabilizes after the first rewrite.
    await store.setAglcVersion("4"); // snapshot of the original part XML
    advanceClock(31);
    await store.setAglcVersion("4"); // snapshot of the rewritten XML (differs: generator)
    advanceClock(31);
    await store.setAglcVersion("4"); // identical XML again — dedup skips
    advanceClock(31);
    await store.setAglcVersion("4"); // still identical — dedup skips

    expect(await listSnapshots()).toHaveLength(2);
  });

  test("ring of 3: the fourth snapshot evicts the oldest", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a"));

    const store = new CitationStore();
    await store.initStore();
    for (const id of ["b", "c", "d", "e"]) {
      await store.add(makeCitation(id));
      advanceClock(31);
    }

    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(3);
    // Newest-first: snapshots of {a,b,c,d}, {a,b,c}, {a,b} — {a} evicted.
    expect(snapshots.map((s) => s.citationCount)).toEqual([4, 3, 2]);
  });

  test("size cap: oversized snapshots evict older ones down to a ring of 1", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const bigCitation = makeCitation("big", {
      data: { caseName: "Big", year: "1998", notes: "x".repeat(1_000_000) },
    });
    doc.addPart(serializeStore([bigCitation]));

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("a")); // snapshot 1: ~1 MB store
    advanceClock(31);
    await store.remove("a"); // snapshot 2: ~1 MB store — two would exceed 1.5 MB

    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].citationCount).toBe(2); // the newest snapshot survives
  });

  test("a backup part with only corrupt content never fails the persist", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a"));
    doc.addPart(`<obiter:backupStore xmlns:obiter="${BACKUP_NAMESPACE}" version="1">truncat`);

    const store = new CitationStore();
    await store.initStore();
    await expect(store.add(makeCitation("b"))).resolves.toBeUndefined();

    // Persist succeeded and the corrupt backup was replaced by a fresh one.
    expect(deserializeStore(doc.obiterParts()[0].xml).citations).toHaveLength(2);
    expect(await listSnapshots()).toHaveLength(1);
  });
});

// ─── Duplicate and corrupt backup parts ─────────────────────────────────────

describeIfDOMParser("backup part duplication and corruption (SAFE-001)", () => {
  test("multiple backup parts (co-authoring) are merged by timestamp and consolidated to one", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const snapAt = (iso: string, label: string) => ({
      timestamp: iso,
      reason: "persist" as const,
      citationCount: 1,
      storeXml: `store ${label}`,
    });
    doc.addPart(
      serializeBackup({
        snapshots: [snapAt("2026-07-21T09:00:00.000Z", "old"), snapAt("2026-07-21T09:10:00.000Z", "mid")],
        footnoteSnapshots: [],
      })
    );
    doc.addPart(
      serializeBackup({
        snapshots: [snapAt("2026-07-21T09:20:00.000Z", "new"), snapAt("2026-07-21T09:10:00.000Z", "mid dup")],
        footnoteSnapshots: [],
      })
    );
    expect(doc.backupParts()).toHaveLength(2);

    const snapshots = await listSnapshots();
    expect(snapshots.map((s) => s.timestamp)).toEqual([
      "2026-07-21T09:20:00.000Z",
      "2026-07-21T09:10:00.000Z",
      "2026-07-21T09:00:00.000Z",
    ]);
    // First-seen wins for the duplicated timestamp; extras deleted, one part left.
    expect((await getSnapshot("2026-07-21T09:10:00.000Z"))!.storeXml).toBe("store mid");
    expect(doc.backupParts()).toHaveLength(1);
    const consolidated = deserializeBackup(doc.backupParts()[0].xml);
    expect(consolidated.snapshots).toHaveLength(3);
  });

  test("a corrupt backup part is deleted, not quarantined (backups are redundant copies)", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const mainPart = doc.addPart(storeXmlWith("a"));
    doc.addPart("garbage, not xml", BACKUP_NAMESPACE);
    const good = serializeBackup({
      snapshots: [
        {
          timestamp: "2026-07-21T09:00:00.000Z",
          reason: "manual",
          citationCount: 1,
          storeXml: "kept",
        },
      ],
      footnoteSnapshots: [],
    });
    doc.addPart(good);

    const snapshots = await listSnapshots();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].reason).toBe("manual");

    // Corrupt part gone, readable content consolidated, main store untouched.
    expect(doc.backupParts()).toHaveLength(1);
    expect(deserializeBackup(doc.backupParts()[0].xml).snapshots).toHaveLength(1);
    expect(doc.obiterParts()).toEqual([mainPart]);
  });

  test("a solitary corrupt backup part is deleted and reads as no snapshots", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart("garbage, not xml", BACKUP_NAMESPACE);

    expect(await listSnapshots()).toEqual([]);
    expect(doc.backupParts()).toHaveLength(0);
  });
});

// ─── restoreFromSnapshot ────────────────────────────────────────────────────

describeIfDOMParser("CitationStore.restoreFromSnapshot (SAFE-001)", () => {
  test("round-trips a snapshot back into the library, preceded by a pre-restore snapshot", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b", "c"));

    const store = new CitationStore();
    await store.initStore();
    await store.remove("c"); // snapshots {a,b,c}, then writes {a,b}

    const before = await listSnapshots();
    expect(before).toHaveLength(1);
    expect(before[0].citationCount).toBe(3);

    advanceClock(60);
    const snap = await getSnapshot(before[0].timestamp);
    await store.restoreFromSnapshot(deserializeStore(snap!.storeXml));

    // Library and document part hold {a,b,c} again.
    expect(store.getAll().map((c) => c.id).sort()).toEqual(["a", "b", "c"]);
    expect(
      deserializeStore(doc.obiterParts()[0].xml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c"]);

    // The restore snapshotted the pre-restore state {a,b}, so it is revertible.
    const after = await listSnapshots();
    expect(after[0].reason).toBe("pre-restore");
    expect(after[0].citationCount).toBe(2);
    const preRestore = await getSnapshot(after[0].timestamp);
    expect(
      deserializeStore(preRestore!.storeXml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b"]);
  });

  test("restoring an empty snapshot over a populated library is refused without allowEmpty", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));

    const store = new CitationStore();
    await store.initStore();

    const emptyData = deserializeStore(serializeStore([]));
    await expect(store.restoreFromSnapshot(emptyData)).rejects.toThrow(StoreDataLossError);

    // Library and document untouched.
    expect(store.getAll()).toHaveLength(2);
    expect(deserializeStore(doc.obiterParts()[0].xml).citations).toHaveLength(2);
  });

  test("allowEmpty: true restores an empty snapshot and keeps the pre-restore escape hatch", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b", "c"));

    const store = new CitationStore();
    await store.initStore();

    const emptyData = deserializeStore(serializeStore([]));
    await store.restoreFromSnapshot(emptyData, { allowEmpty: true });

    expect(store.getAll()).toHaveLength(0);
    expect(deserializeStore(doc.obiterParts()[0].xml).citations).toHaveLength(0);

    // The wiped library is still recoverable: a pre-restore snapshot of the
    // 3-citation state exists (alongside the persist-reason snapshot of the
    // on-document XML, which the shrink-override also captured).
    const snapshots = await listSnapshots();
    const preRestore = snapshots.find((s) => s.reason === "pre-restore");
    expect(preRestore).toBeDefined();
    expect(preRestore!.citationCount).toBe(3);
    const snap = await getSnapshot(preRestore!.timestamp);
    expect(deserializeStore(snap!.storeXml).citations).toHaveLength(3);
  });
});
