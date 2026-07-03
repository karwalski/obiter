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
import {
  OBITER_NAMESPACE,
  StoreXmlError,
  serializeStore,
  deserializeStore,
} from "../../src/store/xmlSerializer";
import type { Citation } from "../../src/types/citation";

// ─── Fake Word.customXmlParts harness ───────────────────────────────────────

class FakePart {
  constructor(
    private readonly doc: FakeDocState,
    public readonly id: string,
    public readonly namespaceUri: string,
    public xml: string
  ) {}

  load(_props: string): void {
    /* no-op — properties are always available on the fake */
  }

  getXml(): { value: string } {
    return { value: this.xml };
  }

  delete(): void {
    this.doc.parts = this.doc.parts.filter((p) => p !== this);
  }
}

class FakeDocState {
  parts: FakePart[] = [];
  private nextId = 1;

  addPart(xml: string, namespaceUri?: string): FakePart {
    const ns =
      namespaceUri ?? (xml.includes(OBITER_NAMESPACE) ? OBITER_NAMESPACE : "urn:other:ns");
    const part = new FakePart(this, `part-${this.nextId++}`, ns, xml);
    this.parts.push(part);
    return part;
  }

  obiterParts(): FakePart[] {
    return this.parts.filter((p) => p.namespaceUri === OBITER_NAMESPACE);
  }
}

/** Install a fake `Word.run` backed by the given document state. */
function installFakeWord(doc: FakeDocState): void {
  const customXmlParts = {
    getByNamespace(ns: string): { items: FakePart[]; load(props: string): void } {
      return {
        get items(): FakePart[] {
          return doc.parts.filter((p) => p.namespaceUri === ns);
        },
        load(_props: string): void {
          /* no-op */
        },
      };
    },
    add(xml: string): FakePart {
      return doc.addPart(xml);
    },
  };

  const context = {
    document: { customXmlParts },
    sync: async (): Promise<void> => {
      /* no-op */
    },
  };

  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCitation(id: string, overrides: Partial<Citation> = {}): Citation {
  return {
    id,
    sourceType: "case.reported",
    aglcVersion: "4",
    data: {
      caseName: `Case ${id}`,
      year: "1998",
    },
    tags: [],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

function storeXmlWith(...ids: string[]): string {
  return serializeStore(ids.map((id) => makeCitation(id)));
}

const CORRUPT_XML = `<?xml version="1.0"?><obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="2"><obiter:citation id="a`;

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

    expect(store.getAll().map((c) => c.id).sort()).toEqual(["a", "b", "c"]);

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
    expect(store.getAll().map((c) => c.id).sort()).toEqual(["a", "b", "c", "d"]);
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
    doc.addPart("<b:Sources xmlns:b=\"urn:other:ns\"></b:Sources>", "urn:other:ns");
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
    expect(deserializeStore(parts[0].xml).citations.map((c) => c.id).sort()).toEqual(["a", "b"]);
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
