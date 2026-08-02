/**
 * @jest-environment jsdom
 *
 * CitationStore Custom XML Part lifecycle tests (BUG-003).
 *
 * The field failure: a document with 100+ managed footnotes suddenly reports
 * zero citations, and refreshes/imports cannot recover. Root causes covered:
 * - duplicate Custom XML parts (Word copies parts on copy/paste, save-as,
 *   crashed saves; our historic delete+add persist could race) with the
 *   empty/newer part being selected;
 * - a corrupted part deserializing silently to an EMPTY store (DOMParser
 *   signals failure via <parsererror>, it does not throw) and then being
 *   overwritten by the next routine persist;
 * - persist creating a second part instead of replacing the existing one.
 *
 * Uses a fake Word.customXmlParts harness — no Office.js required, so this
 * suite runs in the default (node) Jest environment like xmlSerializer.test.ts.
 */

// DOMParser polyfill for Node.js test environment (same pattern as
// xmlSerializer.test.ts, which runs green in the default suite).
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
import { StoreXmlError, serializeStore, deserializeStore } from "../../src/store/xmlSerializer";
import { BACKUP_NAMESPACE, serializeBackup } from "../../src/store/backupSerializer";
import {
  CORRUPT_XML,
  FakeDocState,
  installFakeWord,
  makeCitation,
  storeXmlWith,
} from "./fakeWordHarness";

// ─── Part selection and dedupe ──────────────────────────────────────────────

describeIfDOMParser("CitationStore part selection (BUG-003)", () => {
  test("duplicate parts: empty newer part + populated older part selects the populated one", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    // Newer empty part first in enumeration order, populated part second.
    doc.addPart(serializeStore([]));
    doc.addPart(storeXmlWith("a", "b", "c"));

    const store = new CitationStore();
    await store.initStore();

    expect(
      store
        .getAll()
        .map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c"]);

    const diag = store.getDiagnostics();
    expect(diag.status).toBe("recovered");
    expect(diag.partsFound).toBe(2);
    expect(diag.citationCount).toBe(3);

    // The losing readable duplicate is removed — exactly one part remains.
    const parts = doc.obiterParts();
    expect(parts).toHaveLength(1);
    expect(deserializeStore(parts[0].xml).citations).toHaveLength(3);
  });

  test("duplicate readable parts are merged: citations unique to the loser survive", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));
    doc.addPart(storeXmlWith("b", "c", "d"));

    const store = new CitationStore();
    await store.initStore();

    // Winner is {b,c,d} (most citations); "a" is merged in from the loser.
    expect(
      store
        .getAll()
        .map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c", "d"]);
    expect(store.getDiagnostics().mergedFromDuplicates).toBe(1);
    expect(store.getDiagnostics().status).toBe("recovered");

    // Merged result is persisted back as a single part.
    const parts = doc.obiterParts();
    expect(parts).toHaveLength(1);
    expect(deserializeStore(parts[0].xml).citations).toHaveLength(4);
  });

  test("part present with zero content controls still loads its citations", async () => {
    // Store layer must not depend on content controls existing in footnotes.
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));

    const store = new CitationStore();
    await store.initStore();

    expect(store.getAll()).toHaveLength(2);
    expect(store.getDiagnostics().status).toBe("ok");
    expect(doc.obiterParts()).toHaveLength(1);
  });

  test("controls present but no part: creates a fresh empty store part", async () => {
    // Document had Obiter content controls but the part is gone entirely —
    // store initialises new (the UI surfaces the unlinked-library state).
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    expect(store.getAll()).toHaveLength(0);
    expect(store.getDiagnostics().status).toBe("new");
    expect(doc.obiterParts()).toHaveLength(1);

    await store.add(makeCitation("a"));
    expect(doc.obiterParts()).toHaveLength(1);
    expect(deserializeStore(doc.obiterParts()[0].xml).citations).toHaveLength(1);
  });

  test("parts in other namespaces are ignored", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart('<b:Sources xmlns:b="urn:other:ns"></b:Sources>', "urn:other:ns");
    doc.addPart(storeXmlWith("a"));

    const store = new CitationStore();
    await store.initStore();

    expect(store.getAll()).toHaveLength(1);
    expect(store.getDiagnostics().partsFound).toBe(1);
    // Foreign part untouched.
    expect(doc.parts.some((p) => p.namespaceUri === "urn:other:ns")).toBe(true);
  });
});

// ─── Corrupted parts ────────────────────────────────────────────────────────

describeIfDOMParser("CitationStore corrupted part handling (BUG-003)", () => {
  test("a corrupted part yields the unreadable diagnostic state, not a silent empty library", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(CORRUPT_XML);

    const store = new CitationStore();
    await store.initStore();

    const diag = store.getDiagnostics();
    expect(diag.status).toBe("unreadable");
    expect(diag.partsFound).toBe(1);
    expect(diag.unreadableParts).toBe(1);
    expect(diag.detail).toContain("none could be read");
    expect(diag.parts[0].error).toBeTruthy();

    // The corrupt part is quarantined — never deleted, never overwritten.
    expect(doc.obiterParts()).toHaveLength(1);
    expect(doc.obiterParts()[0].xml).toBe(CORRUPT_XML);
  });

  test("writes after an unreadable init never delete the quarantined part", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const corrupt = doc.addPart(CORRUPT_XML);

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("a"));

    // New data lives in a new part; the corrupt part is still in the document.
    const parts = doc.obiterParts();
    expect(parts).toContain(corrupt);
    expect(parts).toHaveLength(2);

    // A later session recovers: selects the readable part, keeps quarantine.
    const store2 = new CitationStore();
    await store2.initStore();
    expect(store2.getAll().map((c) => c.id)).toEqual(["a"]);
    expect(store2.getDiagnostics().status).toBe("recovered");
    expect(store2.getDiagnostics().unreadableParts).toBe(1);
    expect(doc.obiterParts()).toContain(corrupt);
  });

  test("corrupt part alongside a populated part: populated wins, corrupt is quarantined", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const corrupt = doc.addPart(CORRUPT_XML);
    doc.addPart(storeXmlWith("a", "b", "c"));

    const store = new CitationStore();
    await store.initStore();

    expect(store.getAll()).toHaveLength(3);
    const diag = store.getDiagnostics();
    expect(diag.status).toBe("recovered");
    expect(diag.readableParts).toBe(1);
    expect(diag.unreadableParts).toBe(1);
    expect(doc.obiterParts()).toContain(corrupt);
  });
});

// ─── Persist behaviour ──────────────────────────────────────────────────────

describeIfDOMParser("CitationStore persist (BUG-003)", () => {
  test("persist never leaves a second part behind, even with a stale part id", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a"));

    const store = new CitationStore();
    await store.initStore();

    // Simulate Word replacing the part behind our back (save-as / copy-paste):
    // the store's remembered part id is now stale.
    doc.obiterParts()[0].delete();
    doc.addPart(storeXmlWith("a"));

    await store.add(makeCitation("b"));

    const parts = doc.obiterParts();
    expect(parts).toHaveLength(1);
    expect(
      deserializeStore(parts[0].xml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b"]);
  });

  test("updateMany applies every change in a SINGLE persist (PERF)", async () => {
    const doc = new FakeDocState();
    const handle = installFakeWord(doc);
    doc.addPart(serializeStore(["a", "b", "c"].map((id) => makeCitation(id))));

    const store = new CitationStore();
    await store.initStore();
    // Warm up so the SAFE-001 backup part already exists and each subsequent
    // persist has a stable part-write cost.
    await store.update({ ...makeCitation("a"), firstFootnoteNumber: 0 });

    // Two separate update() calls = two persist cycles.
    const s0 = handle.getPartAddCount();
    await store.update({ ...makeCitation("b"), firstFootnoteNumber: 2 });
    await store.update({ ...makeCitation("c"), firstFootnoteNumber: 3 });
    const twoUpdateAdds = handle.getPartAddCount() - s0;

    // One updateMany covering two changes = a SINGLE persist cycle.
    const s1 = handle.getPartAddCount();
    const updated = await store.updateMany([
      { ...makeCitation("a"), firstFootnoteNumber: 1 },
      { ...makeCitation("c"), firstFootnoteNumber: 4 },
      { ...makeCitation("zzz"), firstFootnoteNumber: 9 }, // unknown id — skipped
    ]);
    const manyAdds = handle.getPartAddCount() - s1;

    expect(updated).toBe(2);
    // Batched: two changes cost strictly fewer part-writes than two persists.
    expect(manyAdds).toBeLessThan(twoUpdateAdds);

    const reloaded = new CitationStore();
    await reloaded.initStore();
    const byId = new Map(reloaded.getAll().map((c) => [c.id, c] as const));
    expect(byId.get("a")!.firstFootnoteNumber).toBe(1); // set by updateMany
    expect(byId.get("c")!.firstFootnoteNumber).toBe(4); // set by updateMany
    expect(byId.get("b")!.firstFootnoteNumber).toBe(2); // set by the earlier update()
  });

  test("updateMany with no matching changes does not persist", async () => {
    const doc = new FakeDocState();
    const handle = installFakeWord(doc);
    doc.addPart(serializeStore([makeCitation("a")]));

    const store = new CitationStore();
    await store.initStore();

    const before = handle.getPartAddCount();
    const updated = await store.updateMany([{ ...makeCitation("nope") }]);
    expect(updated).toBe(0);
    expect(handle.getPartAddCount() - before).toBe(0);
  });

  test("concurrent persists serialize and still leave exactly one part", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();

    await Promise.all([
      store.add(makeCitation("a")),
      store.add(makeCitation("b")),
      store.add(makeCitation("c")),
    ]);

    const parts = doc.obiterParts();
    expect(parts).toHaveLength(1);
    expect(deserializeStore(parts[0].xml).citations).toHaveLength(3);
  });

  test("data-loss guard: an empty in-memory library refuses to overwrite a populated part", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore(); // fresh empty store

    // Another session (or Word itself) put a populated store in the document.
    doc.obiterParts().forEach((p) => p.delete());
    const populated = doc.addPart(storeXmlWith("a", "b", "c"));

    await expect(store.setAglcVersion("5")).rejects.toThrow(StoreDataLossError);

    // The populated part is untouched.
    expect(doc.obiterParts()).toEqual([populated]);
    expect(deserializeStore(populated.xml).citations).toHaveLength(3);
  });

  test("removing the last citation (legitimate clear-down) is still allowed", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a"));

    const store = new CitationStore();
    await store.initStore();
    await store.remove("a");

    const parts = doc.obiterParts();
    expect(parts).toHaveLength(1);
    expect(deserializeStore(parts[0].xml).citations).toHaveLength(0);
  });
});

// ─── Deserializer hardening ─────────────────────────────────────────────────

describeIfDOMParser("deserializeStore hardening (BUG-003)", () => {
  test("throws StoreXmlError on an empty payload instead of returning an empty store", () => {
    expect(() => deserializeStore("")).toThrow(StoreXmlError);
    expect(() => deserializeStore("   ")).toThrow(StoreXmlError);
  });

  test("throws StoreXmlError on malformed XML (DOMParser parsererror)", () => {
    expect(() => deserializeStore(CORRUPT_XML)).toThrow(StoreXmlError);
    expect(() => deserializeStore("not xml at all")).toThrow(StoreXmlError);
  });

  test("throws StoreXmlError when the root element is not a citation store", () => {
    expect(() => deserializeStore("<wrongRoot></wrongRoot>")).toThrow(StoreXmlError);
  });

  test("TASCSC -> TASSC court jurisdiction migration is preserved (PARITY-117)", () => {
    const xml = serializeStore([], "2", "4", "aglc4", "court", "TASCSC");
    expect(xml).toContain('courtJurisdiction="TASCSC"');
    const data = deserializeStore(xml);
    expect(data.metadata.courtJurisdiction).toBe("TASSC");
  });
});

// ─── Backup-part isolation (SAFE-001) ───────────────────────────────────────

describeIfDOMParser("CitationStore backup-namespace isolation (SAFE-001)", () => {
  test("backup parts are invisible to initStore and doPersist namespace scans", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(storeXmlWith("a", "b"));
    // A pre-existing backup part in the backup namespace.
    const backup = doc.addPart(
      serializeBackup({
        snapshots: [
          {
            timestamp: "2026-01-01T00:00:00.000Z",
            reason: "manual",
            citationCount: 1,
            storeXml: storeXmlWith("old"),
          },
        ],
        footnoteSnapshots: [],
      })
    );
    expect(backup.namespaceUri).toBe(BACKUP_NAMESPACE);

    const store = new CitationStore();
    await store.initStore();

    // initStore scan sees exactly ONE part — the backup part never appears
    // as a duplicate/unreadable candidate.
    const diag = store.getDiagnostics();
    expect(diag.status).toBe("ok");
    expect(diag.partsFound).toBe(1);
    expect(diag.parts.map((p) => p.partId)).not.toContain(backup.id);

    // A persist replaces the main part but never treats the backup part as a
    // main-store duplicate: it stays in its own namespace, and its existing
    // snapshot survives (merged, not clobbered, when doPersist snapshots).
    await store.add(makeCitation("c"));
    expect(doc.obiterParts()).toHaveLength(1);
    expect(deserializeStore(doc.obiterParts()[0].xml).citations).toHaveLength(3);
    expect(doc.backupParts()).toHaveLength(1);
    expect(doc.backupParts()[0].xml).toContain("2026-01-01T00:00:00.000Z");
  });
});

// ─── Court mode metadata persistence (mode-switch hardening) ────────────────
//
// writingMode / courtJurisdiction / courtToggles are DOCUMENT metadata: they
// must survive persist + a fresh CitationStore instance (a new device opening
// the same document), so customised court toggles no longer silently fall
// back to jurisdiction presets on other machines.

describeIfDOMParser("CitationStore court mode metadata", () => {
  test("writingMode, courtJurisdiction and courtToggles round-trip through persist + reload", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.setWritingMode("court");
    await store.setCourtJurisdiction("HCA");
    await store.setCourtToggles({ ibidSuppression: "on", parallelCitations: "mandatory" });

    // A second store instance over the same document (another device).
    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getWritingMode()).toBe("court");
    expect(reopened.getCourtJurisdiction()).toBe("HCA");
    expect(reopened.getCourtToggles()).toEqual({
      ibidSuppression: "on",
      parallelCitations: "mandatory",
    });
  });

  test("setCourtToggles(undefined) clears the stored overrides", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.setCourtToggles({ pinpointStyle: "para-only" });
    await store.setCourtToggles(undefined);

    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getCourtToggles()).toBeUndefined();
  });

  test("a v2 document persisted without courtToggles reloads with undefined (backward compat)", async () => {
    const doc = new FakeDocState();
    doc.addPart(serializeStore([makeCitation("a")], "2", "4", "aglc4", "court", "HCA"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(store.getWritingMode()).toBe("court");
    expect(store.getCourtJurisdiction()).toBe("HCA");
    expect(store.getCourtToggles()).toBeUndefined();
  });

  test("getCourtToggles returns a copy — mutating it does not change the store", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.setCourtToggles({ ibidSuppression: "on" });

    const snapshot = store.getCourtToggles();
    expect(snapshot).toBeDefined();
    snapshot!.ibidSuppression = "off";
    expect(store.getCourtToggles()).toEqual({ ibidSuppression: "on" });
  });

  test("unknown future toggle keys survive persist + reload opaquely", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.setWritingMode("court");
    await store.setCourtToggles({ parallelOrder: "reported-first", loaType: "simple" });

    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getCourtToggles()).toEqual({
      parallelOrder: "reported-first",
      loaType: "simple",
    });
  });
});
