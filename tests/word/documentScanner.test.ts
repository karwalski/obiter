/**
 * BUG-004 — Scan & Repair Office.js layer, against a fake Word harness
 * (same approach as tests/store/citationStore.test.ts: no Office.js).
 *
 * Verifies:
 *  - captureDocumentSnapshot batches context.sync() (two syncs for a
 *    120-footnote document — never per-footnote);
 *  - applyScanPlan store/document effects for managed adoption, flat
 *    (verbatim/endnote) wraps and rebuild-only items;
 *  - data safety: a store entry survives a failed wrap, and failures are
 *    reported instead of thrown.
 */

import {
  captureDocumentSnapshot,
  applyScanPlan,
  scanDocument,
  type ScanRepairStore,
} from "../../src/word/documentScanner";
import type { ScanItem } from "../../src/word/scanRepair";
import { PARENT_CC_TAG } from "../../src/word/footnoteManager";
import type { Citation } from "../../src/types/citation";

// ─── Fake Word harness ──────────────────────────────────────────────────────

class FakeCC {
  tag = "";
  title = "";
  text = "";
  appearance = "";
  /** Child controls inserted at this CC's end range. */
  children: FakeCC[] = [];

  load(_props: string): void {}

  insertText(text: string, _location: string): { font: Record<string, unknown> } {
    this.text += text;
    return { font: {} };
  }

  getRange(_location: string): { insertContentControl(type: string): FakeCC } {
    return {
      insertContentControl: (): FakeCC => {
        const child = new FakeCC();
        this.children.push(child);
        return child;
      },
    };
  }
}

class FakeRange {
  deleted = false;
  /** CC created by an in-place wrap of this range, if any. */
  wrappedCC: FakeCC | null = null;

  constructor(
    private readonly body: FakeBody,
    public readonly matchedText: string
  ) {}

  load(_props: string): void {}

  delete(): void {
    this.deleted = true;
    this.body.textValue = this.body.textValue.replace(this.matchedText, "");
  }

  insertContentControl(_type: string): FakeCC {
    const cc = new FakeCC();
    cc.text = this.matchedText;
    this.wrappedCC = cc;
    this.body.inPlaceWraps.push(cc);
    return cc;
  }
}

class FakePara {
  constructor(private readonly body: FakeBody) {}

  getRange(_location: string): { insertContentControl(type: string): FakeCC } {
    return {
      insertContentControl: (): FakeCC => {
        const cc = new FakeCC();
        this.body.paragraphEndCCs.push(cc);
        return cc;
      },
    };
  }
}

class FakeBody {
  textValue: string;
  ccs: FakeCC[];
  /** Controls created by in-place range wraps (flat adoption). */
  inPlaceWraps: FakeCC[] = [];
  /** Controls created at the first paragraph's end (managed adoption). */
  paragraphEndCCs: FakeCC[] = [];
  searches: string[] = [];

  constructor(text: string, ccs: FakeCC[] = []) {
    this.textValue = text;
    this.ccs = ccs;
  }

  load(_props: string): void {}

  get text(): string {
    return this.textValue;
  }

  get contentControls(): { items: FakeCC[]; load(props: string): void } {
    const items = this.ccs;
    return { items, load: () => {} };
  }

  get paragraphs(): { items: FakePara[]; load(props: string): void } {
    return { items: [new FakePara(this)], load: () => {} };
  }

  search(text: string, _opts: unknown): { items: FakeRange[]; load(props: string): void } {
    this.searches.push(text);
    const items = this.textValue.includes(text) ? [new FakeRange(this, text)] : [];
    return { items, load: () => {} };
  }
}

class FakeNote {
  constructor(public readonly body: FakeBody) {}
}

interface FakeDoc {
  bodyText?: string;
  bodyCCs?: FakeCC[];
  footnotes?: FakeNote[];
  endnotes?: FakeNote[];
}

function makeCC(tag: string, title: string, text: string): FakeCC {
  const cc = new FakeCC();
  cc.tag = tag;
  cc.title = title;
  cc.text = text;
  return cc;
}

interface FakeContext {
  document: {
    body: {
      contentControls: { items: FakeCC[]; load(props: string): void };
      footnotes: { items: FakeNote[]; load(props: string): void };
      endnotes: { items: FakeNote[]; load(props: string): void };
    };
  };
  sync(): Promise<void>;
}

/** Install a fake `Word.run`; returns a sync-call counter. */
function installFakeWord(doc: FakeDoc): { syncCount: () => number } {
  let syncs = 0;
  const context: FakeContext = {
    document: {
      body: {
        contentControls: { items: doc.bodyCCs ?? [], load: () => {} },
        footnotes: { items: doc.footnotes ?? [], load: () => {} },
        endnotes: { items: doc.endnotes ?? [], load: () => {} },
      },
    },
    sync: async (): Promise<void> => {
      syncs++;
    },
  };

  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: FakeContext) => Promise<T>): Promise<T> => callback(context),
  };

  return { syncCount: () => syncs };
}

// ─── Fake store ─────────────────────────────────────────────────────────────

class FakeStore implements ScanRepairStore {
  citations = new Map<string, Citation>();
  ccModel: "flat" | "parent-child" | undefined;

  getById(id: string): Citation | undefined {
    return this.citations.get(id);
  }

  async add(citation: Citation): Promise<void> {
    if (this.citations.has(citation.id)) {
      throw new Error(`Citation with id "${citation.id}" already exists`);
    }
    this.citations.set(citation.id, citation);
  }

  getCcModel(): "flat" | "parent-child" | undefined {
    return this.ccModel;
  }

  async setCcModel(model: "flat" | "parent-child"): Promise<void> {
    this.ccModel = model;
  }
}

// ─── Item factory ───────────────────────────────────────────────────────────

function makeCitation(id: string, overrides: Partial<Citation> = {}): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType: "case.reported",
    data: { party1: "A", party2: "B" },
    tags: [],
    createdAt: "2026-07-03T00:00:00.000Z",
    modifiedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

function makeItem(overrides: Partial<ScanItem> & Pick<ScanItem, "key" | "kind">): ScanItem {
  return {
    location: "footnote",
    noteIndex: 1,
    citationId: "cit-1",
    rawText: "A v B (2000) 1 CLR 1.",
    text: "A v B (2000) 1 CLR 1",
    selectable: true,
    defaultSelected: true,
    wrap: "none",
    ...overrides,
  };
}

// ─── captureDocumentSnapshot ────────────────────────────────────────────────

describe("captureDocumentSnapshot (BUG-004)", () => {
  test("captures body controls, footnotes and endnotes", async () => {
    const { syncCount } = installFakeWord({
      bodyCCs: [makeCC("body-tag", "Citation:auto", "Inline citation")],
      footnotes: [
        new FakeNote(new FakeBody("Plain footnote text.")),
        new FakeNote(
          new FakeBody("Managed footnote.", [
            makeCC(PARENT_CC_TAG, "Obiter Footnote", "Managed footnote"),
            makeCC("uuid-1", "Citation:auto", "Managed footnote"),
          ])
        ),
      ],
      endnotes: [new FakeNote(new FakeBody("Endnote text."))],
    });

    const snapshot = await scanDocument();

    expect(snapshot.bodyControls).toEqual([
      { tag: "body-tag", title: "Citation:auto", text: "Inline citation" },
    ]);
    expect(snapshot.notes).toHaveLength(3);
    expect(snapshot.notes[0]).toEqual({
      noteType: "footnote",
      index: 1,
      text: "Plain footnote text.",
      controls: [],
    });
    expect(snapshot.notes[1].controls.map((c) => c.tag)).toEqual([PARENT_CC_TAG, "uuid-1"]);
    expect(snapshot.notes[2]).toEqual({
      noteType: "endnote",
      index: 1,
      text: "Endnote text.",
      controls: [],
    });
    expect(syncCount()).toBe(2);
  });

  test("a 120-footnote document is read in two syncs — never per-footnote", async () => {
    const footnotes = Array.from(
      { length: 120 },
      (_, i) => new FakeNote(new FakeBody(`Case ${i} v Other (2000) 1 CLR ${i}.`))
    );
    const { syncCount } = installFakeWord({ footnotes });

    const snapshot = await scanDocument();

    expect(snapshot.notes).toHaveLength(120);
    expect(syncCount()).toBe(2);
  });

  test("empty document: one sync, empty snapshot", async () => {
    const { syncCount } = installFakeWord({});
    const snapshot = await scanDocument();
    expect(snapshot).toEqual({ bodyControls: [], notes: [] });
    expect(syncCount()).toBe(1);
  });
});

// ─── applyScanPlan ──────────────────────────────────────────────────────────

describe("applyScanPlan (BUG-004)", () => {
  test("rebuild items are store-only: no document mutation", async () => {
    const body = new FakeBody("Obeid v The Queen [2017] HCA 44.", [
      makeCC(PARENT_CC_TAG, "Obiter Footnote", ""),
      makeCC("uuid-1", "Citation:auto", "Obeid v The Queen [2017] HCA 44"),
    ]);
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "rebuild-1",
        kind: "rebuild",
        citationId: "uuid-1",
        proposedCitation: makeCitation("uuid-1"),
        wrap: "none",
      }),
    ]);

    expect(outcome.rebuiltFromControls).toBe(1);
    expect(outcome.wrappedNotes).toBe(0);
    expect(outcome.failures).toEqual([]);
    expect(store.getById("uuid-1")).toBeDefined();
    expect(body.searches).toEqual([]);
    expect(body.inPlaceWraps).toEqual([]);
  });

  test("managed adoption removes the plain text and builds the parent-child structure", async () => {
    const body = new FakeBody("A v B (2000) 1 CLR 1.");
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "adopt-1",
        kind: "adopt",
        citationId: "new-id",
        proposedCitation: makeCitation("new-id"),
        pinpoint: "42",
        wrap: "managed",
      }),
    ]);

    expect(outcome.adoptedManaged).toBe(1);
    expect(outcome.wrappedNotes).toBe(1);
    expect(outcome.failures).toEqual([]);
    expect(store.getById("new-id")).toBeDefined();

    // Managed wrap searches for the full text INCLUDING the closing stop
    // and removes it (the refresher re-adds punctuation, Rule 1.1.4).
    expect(body.searches).toEqual(["A v B (2000) 1 CLR 1."]);
    expect(body.textValue).not.toContain("A v B");

    // Structure: parent CC (obiter-fn) at the paragraph end, child CC
    // tagged with the citation id, pinpoint encoded in the title.
    expect(body.paragraphEndCCs).toHaveLength(1);
    const parent = body.paragraphEndCCs[0];
    expect(parent.tag).toBe(PARENT_CC_TAG);
    expect(parent.title).toBe("Obiter Footnote");
    expect(parent.appearance).toBe("Hidden");
    expect(parent.children).toHaveLength(1);
    const child = parent.children[0];
    expect(child.tag).toBe("new-id");
    expect(child.title).toBe("Citation:auto:42");
    expect(child.text).toBe("A v B (2000) 1 CLR 1");
  });

  test("verbatim adoption wraps the text in place (formatting preserved), closing stop left outside", async () => {
    const body = new FakeBody("Some unparseable note text.");
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "verbatim-1",
        kind: "verbatim",
        citationId: "vb-id",
        rawText: "Some unparseable note text.",
        text: "Some unparseable note text",
        proposedCitation: makeCitation("vb-id", {
          sourceType: "custom",
          overrideText: "Some unparseable note text",
          data: { customText: "Some unparseable note text" },
        }),
        wrap: "flat",
      }),
    ]);

    expect(outcome.adoptedVerbatim).toBe(1);
    expect(outcome.wrappedNotes).toBe(1);
    // The search excludes the trailing full stop so the stop stays outside
    // the control, and the text itself is never deleted/re-inserted.
    expect(body.searches).toEqual(["Some unparseable note text"]);
    expect(body.textValue).toBe("Some unparseable note text.");
    expect(body.inPlaceWraps).toHaveLength(1);
    expect(body.inPlaceWraps[0].tag).toBe("vb-id");
    expect(body.inPlaceWraps[0].title).toBe("Citation:auto");
    expect(body.paragraphEndCCs).toEqual([]);
  });

  test("endnote flat wrap targets the endnote collection", async () => {
    const endnoteBody = new FakeBody("Obeid v The Queen [2017] HCA 44.");
    installFakeWord({ endnotes: [new FakeNote(endnoteBody)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "adopt-en-1",
        kind: "adopt",
        location: "endnote",
        noteIndex: 1,
        citationId: "en-id",
        rawText: "Obeid v The Queen [2017] HCA 44.",
        text: "Obeid v The Queen [2017] HCA 44",
        proposedCitation: makeCitation("en-id"),
        wrap: "flat",
      }),
    ]);

    expect(outcome.wrappedNotes).toBe(1);
    expect(endnoteBody.inPlaceWraps).toHaveLength(1);
    expect(endnoteBody.inPlaceWraps[0].tag).toBe("en-id");
  });

  test("the store entry survives a failed wrap; the failure is reported, not thrown", async () => {
    const body = new FakeBody("Completely different text.");
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "adopt-miss",
        kind: "adopt",
        citationId: "miss-id",
        rawText: "A v B (2000) 1 CLR 1.",
        proposedCitation: makeCitation("miss-id"),
        wrap: "managed",
      }),
    ]);

    expect(store.getById("miss-id")).toBeDefined();
    expect(outcome.wrappedNotes).toBe(0);
    expect(outcome.failures).toHaveLength(1);
    expect(outcome.failures[0].reason).toContain("not found in the note");
    // Nothing was deleted from the document.
    expect(body.textValue).toBe("Completely different text.");
  });

  test("text over the Word search limit is added to the library but not wrapped", async () => {
    const longText = `${"A very long citation ".repeat(15)}(2000) 1 CLR 1.`;
    const body = new FakeBody(longText);
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "verbatim-long",
        kind: "verbatim",
        citationId: "long-id",
        rawText: longText,
        proposedCitation: makeCitation("long-id"),
        wrap: "flat",
      }),
    ]);

    expect(store.getById("long-id")).toBeDefined();
    expect(outcome.failures).toHaveLength(1);
    expect(outcome.failures[0].reason).toContain("too long");
    expect(body.searches).toEqual([]);
  });

  test("a duplicate id is not re-added and does not fail the run", async () => {
    installFakeWord({ footnotes: [] });
    const store = new FakeStore();
    await store.add(makeCitation("uuid-1"));

    const outcome = await applyScanPlan(store, [
      makeItem({
        key: "rebuild-dup",
        kind: "rebuild",
        citationId: "uuid-1",
        proposedCitation: makeCitation("uuid-1"),
        wrap: "none",
      }),
    ]);

    expect(outcome.failures).toEqual([]);
    expect(outcome.rebuiltFromControls).toBe(1);
    expect(store.citations.size).toBe(1);
  });

  test("linked items and empty selections are no-ops", async () => {
    installFakeWord({ footnotes: [] });
    const store = new FakeStore();

    const outcome = await applyScanPlan(store, [
      makeItem({ key: "linked-1", kind: "linked", wrap: "none" }),
    ]);

    expect(outcome).toEqual({
      rebuiltFromControls: 0,
      adoptedManaged: 0,
      adoptedVerbatim: 0,
      wrappedNotes: 0,
      failures: [],
    });
    expect(store.citations.size).toBe(0);

    const empty = await applyScanPlan(store, []);
    expect(empty.failures).toEqual([]);
  });

  test("a never-Obiter document records the parent-child cc model after wrapping", async () => {
    const body = new FakeBody("A v B (2000) 1 CLR 1.");
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();
    expect(store.getCcModel()).toBeUndefined();

    await applyScanPlan(store, [
      makeItem({
        key: "adopt-1",
        kind: "adopt",
        citationId: "new-id",
        proposedCitation: makeCitation("new-id"),
        wrap: "managed",
      }),
    ]);

    expect(store.getCcModel()).toBe("parent-child");
  });

  test("an existing cc model is left untouched", async () => {
    const body = new FakeBody("A v B (2000) 1 CLR 1.");
    installFakeWord({ footnotes: [new FakeNote(body)] });
    const store = new FakeStore();
    store.ccModel = "flat";
    const setSpy = jest.spyOn(store, "setCcModel");

    await applyScanPlan(store, [
      makeItem({
        key: "adopt-1",
        kind: "adopt",
        citationId: "new-id",
        proposedCitation: makeCitation("new-id"),
        wrap: "managed",
      }),
    ]);

    expect(setSpy).not.toHaveBeenCalled();
    expect(store.ccModel).toBe("flat");
  });
});

// Keep TypeScript happy about the direct captureDocumentSnapshot import
// (exercised through scanDocument above); also assert it is the same code
// path Word.run receives.
describe("scanDocument", () => {
  test("delegates to captureDocumentSnapshot in a Word context", async () => {
    installFakeWord({ footnotes: [new FakeNote(new FakeBody("text"))] });
    const viaWrapper = await scanDocument();
    const direct = await (async () => {
      let result: unknown;
      await (
        global as Record<string, unknown> as {
          Word: { run: <T>(cb: (c: FakeContext) => Promise<T>) => Promise<T> };
        }
      ).Word.run(async (ctx) => {
        result = await captureDocumentSnapshot(ctx as unknown as Word.RequestContext);
      });
      return result;
    })();
    expect(direct).toEqual(viaWrapper);
  });
});
