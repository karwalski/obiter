/**
 * @jest-environment jsdom
 *
 * SAFE-004 — Pre-refresh footnote text snapshot and restore.
 *
 * Covers the default snapshot hook (snapshotFootnotesBeforeRebuild), its
 * wiring as the default OnBeforeRebuild inside refreshAllCitations (same
 * request context, abort-on-failure semantics), the generation ring buffer,
 * the sync/write budget, and the restore path (restoreFootnoteText via the
 * verbatim-replace-and-lock primitive).
 *
 * Uses the shared namespace-aware fake Word harness for all Custom XML Part
 * IO; footnote/content-control proxies are minimal jest mocks in the style
 * of the SAFE-003 executeRebuilds tests.
 */

import { snapshotFootnotesBeforeRebuild, restoreFootnoteText } from "../../src/word/footnoteBackup";
import { refreshAllCitations } from "../../src/word/citationRefresher";
import {
  LOCKED_PARENT_CC_TITLE,
  isFootnoteLocked,
  buildOccurrenceTitle,
} from "../../src/word/footnoteManager";
import { listFootnoteGenerations } from "../../src/store/backupStore";
import { deserializeBackup, MAX_FOOTNOTE_GENERATIONS } from "../../src/store/backupSerializer";
import { hashRenderedText } from "../../src/utils/textHash";
import { escapeHtml } from "../../src/word/formattedRunsHtml";
import { CitationStore } from "../../src/store/citationStore";
import {
  FakeDocState,
  installFakeWord,
  makeFakeContext,
  storeXmlWith,
} from "../store/fakeWordHarness";

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

// ─── snapshotFootnotesBeforeRebuild (unit) ──────────────────────────────────

describe("SAFE-004 — snapshotFootnotesBeforeRebuild", () => {
  test("writes one generation with an {n, hash, text} entry per rebuilt footnote", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const { context } = makeFakeContext(doc);

    const mabo = "Mabo v Queensland (No 2) (1992) 175 CLR 1.";
    await snapshotFootnotesBeforeRebuild(context as unknown as Word.RequestContext, [
      { footnoteNumber: 3, existingText: mabo },
      { footnoteNumber: 7, existingText: "Ibid." },
    ]);

    const generations = await listFootnoteGenerations();
    expect(generations).toHaveLength(1);
    expect(generations[0].timestamp).toBe(T0.toISOString());
    expect(generations[0].footnotes).toEqual([
      { n: 3, hash: hashRenderedText(mabo), text: mabo },
      { n: 7, hash: hashRenderedText("Ibid."), text: "Ibid." },
    ]);

    // The generation is recoverable straight from the on-document part too.
    expect(doc.backupParts()).toHaveLength(1);
    const raw = deserializeBackup(doc.backupParts()[0].xml);
    expect(raw.footnoteSnapshots[0].footnotes.map((f) => f.text)).toEqual([mabo, "Ibid."]);
  });

  test("empty rebuild set writes nothing: no part, no syncs, no part writes", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const { context, getSyncCount, getPartAddCount } = makeFakeContext(doc);

    await snapshotFootnotesBeforeRebuild(context as unknown as Word.RequestContext, []);

    expect(doc.backupParts()).toHaveLength(0);
    expect(getSyncCount()).toBe(0);
    expect(getPartAddCount()).toBe(0);
    expect(await listFootnoteGenerations()).toEqual([]);
  });

  test(`generations ring-buffer at ${MAX_FOOTNOTE_GENERATIONS}, newest first`, async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    for (const [i, text] of ["first", "second", "third"].entries()) {
      const { context } = makeFakeContext(doc);
      await snapshotFootnotesBeforeRebuild(context as unknown as Word.RequestContext, [
        { footnoteNumber: i + 1, existingText: text },
      ]);
      advanceClock(60);
    }

    const generations = await listFootnoteGenerations();
    expect(generations).toHaveLength(MAX_FOOTNOTE_GENERATIONS);
    // Newest first — the oldest ("first") was evicted.
    expect(generations.map((g) => g.footnotes[0].text)).toEqual(["third", "second"]);
    // Still consolidated into a single backup part.
    expect(doc.backupParts()).toHaveLength(1);
  });

  test("snapshot write adds no read syncs and at most one write batch", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    // Seed an existing generation so the write path scans a non-empty part.
    const seed = makeFakeContext(doc);
    await snapshotFootnotesBeforeRebuild(seed.context as unknown as Word.RequestContext, [
      { footnoteNumber: 1, existingText: "seed" },
    ]);
    advanceClock(60);

    // The context deliberately has NO document.body — any attempt to read
    // footnotes would throw. The entries come from the refresher's existing
    // batch read, so the snapshot itself never touches the footnotes.
    const { context, getSyncCount, getPartAddCount } = makeFakeContext(doc);
    await snapshotFootnotesBeforeRebuild(context as unknown as Word.RequestContext, [
      { footnoteNumber: 2, existingText: "next" },
    ]);

    // Exactly one part write (single consolidated backup part)...
    expect(getPartAddCount()).toBe(1);
    // ...and a bounded number of syncs: backup-part scan (list + read) plus
    // the single write batch. No syncs are footnote reads.
    expect(getSyncCount()).toBeLessThanOrEqual(3);
  });
});

// ─── Default wiring inside refreshAllCitations (integration) ────────────────

/**
 * Builds a fake refresh context over `doc`: one footnote whose parent CC
 * (tag "obiter-fn") contains a single child citation CC. Mirrors the mock
 * style of the SAFE-003 executeRebuilds tests, plus the harness-backed
 * customXmlParts so the default snapshot hook writes into the same context.
 */
function makeRefreshContext(
  doc: FakeDocState,
  opts: { existingText: string; citationId: string; locked?: boolean }
): {
  context: Word.RequestContext;
  parentCC: { title: string; text: string; insertHtml: jest.Mock };
  getPartAddCount: () => number;
  patchAddToThrow: () => void;
} {
  const handle = makeFakeContext(doc);

  const wrappedChild = { tag: "", title: "", appearance: "" };
  const matchRange = { insertContentControl: jest.fn(() => wrappedChild) };
  const parentRange = {
    search: jest.fn(() => ({ items: [matchRange], load: jest.fn() })),
  };
  const childCC = { tag: opts.citationId, title: "Citation:auto" };
  const parentCC = {
    tag: "obiter-fn",
    title: opts.locked ? LOCKED_PARENT_CC_TITLE : "Obiter Footnote",
    text: opts.existingText,
    load: jest.fn(),
    insertHtml: jest.fn(),
    getRange: jest.fn(() => parentRange),
    contentControls: { load: jest.fn(), items: [childCC] },
  };
  const noteItem = {
    body: {
      // Word's body.contentControls includes nested descendants.
      contentControls: { load: jest.fn(), items: [parentCC, childCC] },
    },
  };

  const context = handle.context as unknown as {
    document: { body?: unknown; customXmlParts: unknown };
  };
  context.document.body = { footnotes: { load: jest.fn(), items: [noteItem] } };

  const parts = handle.context.document.customXmlParts;
  const patchAddToThrow = (): void => {
    parts.add = () => {
      throw new Error("backup part write refused");
    };
  };

  return {
    context: context as unknown as Word.RequestContext,
    parentCC,
    getPartAddCount: handle.getPartAddCount,
    patchAddToThrow,
  };
}

describe("SAFE-004 — default snapshot hook wired into refreshAllCitations", () => {
  test("a refresh that rebuilds a footnote snapshots its prior text in the same context", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("cit-1"));
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();

    const { context, parentCC } = makeRefreshContext(doc, {
      existingText: "OLD FOOTNOTE TEXT",
      citationId: "cit-1",
    });

    const result = await refreshAllCitations(context, store);

    expect(result.failures).toEqual([]);
    expect(result.userEdits).toEqual([]);
    expect(result.updated).toBe(1);
    expect(parentCC.insertHtml).toHaveBeenCalledTimes(1);

    // The pre-rebuild text is recoverable from the backup part.
    const generations = await listFootnoteGenerations();
    expect(generations).toHaveLength(1);
    expect(generations[0].footnotes).toEqual([
      {
        n: 1,
        hash: hashRenderedText("OLD FOOTNOTE TEXT"),
        text: "OLD FOOTNOTE TEXT",
      },
    ]);
  });

  test("a refresh with an empty rebuild set (locked footnote) writes no generation", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("cit-1"));
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();

    const { context, parentCC } = makeRefreshContext(doc, {
      existingText: "frozen text",
      citationId: "cit-1",
      locked: true,
    });

    const result = await refreshAllCitations(context, store);

    expect(result.lockedSkipped).toBe(1);
    expect(result.updated).toBe(0);
    expect(parentCC.insertHtml).not.toHaveBeenCalled();
    expect(await listFootnoteGenerations()).toEqual([]);
  });

  test("a failing default snapshot aborts the rebuilds — never clobber without a snapshot", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("cit-1"));
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();

    const { context, parentCC, patchAddToThrow } = makeRefreshContext(doc, {
      existingText: "OLD FOOTNOTE TEXT",
      citationId: "cit-1",
    });
    patchAddToThrow();

    const result = await refreshAllCitations(context, store);

    expect(result.updated).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].footnoteNumbers).toEqual([1]);
    expect(result.failures[0].error).toContain("Pre-rebuild hook failed");
    expect(result.failures[0].error).toContain("backup part write refused");
    // The document was not touched.
    expect(parentCC.insertHtml).not.toHaveBeenCalled();
    expect(parentCC.title).toBe("Obiter Footnote");
  });

  test("an explicit onBeforeRebuild replaces the default snapshot hook", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("cit-1"));
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();

    const { context } = makeRefreshContext(doc, {
      existingText: "OLD FOOTNOTE TEXT",
      citationId: "cit-1",
    });

    const custom = jest.fn(async () => undefined);
    const result = await refreshAllCitations(context, store, custom);

    expect(result.updated).toBe(1);
    expect(custom).toHaveBeenCalledTimes(1);
    expect(custom).toHaveBeenCalledWith([{ footnoteNumber: 1, existingText: "OLD FOOTNOTE TEXT" }]);
    // The default hook did not also run.
    expect(await listFootnoteGenerations()).toEqual([]);
  });
});

// ─── restoreFootnoteText ────────────────────────────────────────────────────

/** Builds a fake Word.run over a document with the given footnote items. */
function installFakeWordWithFootnotes(noteItems: unknown[]): { getSyncCount: () => number } {
  let syncCount = 0;
  const context = {
    document: { body: { footnotes: { load: jest.fn(), items: noteItems } } },
    sync: async (): Promise<void> => {
      syncCount++;
    },
  };
  (global as Record<string, unknown>).Word = {
    run: async <T>(callback: (ctx: typeof context) => Promise<T>): Promise<T> => callback(context),
  };
  return { getSyncCount: () => syncCount };
}

interface RestoreMocks {
  parentCC: {
    title: string;
    clear: jest.Mock;
    insertHtml: jest.Mock;
  };
  wrappedChild: { tag: string; title: string; appearance: string };
  insertContentControl: jest.Mock;
  noteItem: unknown;
}

/** A footnote whose parent CC holds one child citation CC (tag `citationId`). */
function makeRestorableFootnote(citationId?: string): RestoreMocks {
  const wrappedChild = { tag: "", title: "", appearance: "" };
  const insertContentControl = jest.fn(() => wrappedChild);
  const contentRange = { insertContentControl };
  const children = citationId === undefined ? [] : [{ tag: citationId }];
  const parentCC = {
    tag: "obiter-fn",
    title: "Obiter Footnote [r:deadbeef]",
    clear: jest.fn(),
    insertHtml: jest.fn(() => contentRange),
    contentControls: { load: jest.fn(), items: children },
  };
  const noteItem = {
    body: { contentControls: { load: jest.fn(), items: [parentCC] } },
  };
  return { parentCC, wrappedChild, insertContentControl, noteItem };
}

describe("SAFE-004 — restoreFootnoteText", () => {
  test("writes the previous text verbatim and locks the footnote", async () => {
    const fn = makeRestorableFootnote("cit-9");
    installFakeWordWithFootnotes([fn.noteItem]);

    const previousText = "Smith & Co v Jones (2001) 1 CLR 5.";
    await restoreFootnoteText(1, previousText);

    expect(fn.parentCC.clear).toHaveBeenCalledTimes(1);
    expect(fn.parentCC.insertHtml).toHaveBeenCalledWith(escapeHtml(previousText), "Replace");
    // Restored footnotes end up LOCKED so refresh never re-clobbers them.
    expect(fn.parentCC.title).toBe(LOCKED_PARENT_CC_TITLE);
    expect(isFootnoteLocked(fn.parentCC.title)).toBe(true);
    // The occurrence stays discoverable under its citation id.
    expect(fn.wrappedChild.tag).toBe("cit-9");
    expect(fn.wrappedChild.title).toBe(buildOccurrenceTitle("auto"));
    expect(fn.wrappedChild.appearance).toBe("Hidden");
  });

  test("restores and locks even when the footnote has no child citation CC left", async () => {
    const fn = makeRestorableFootnote(undefined);
    installFakeWordWithFootnotes([fn.noteItem]);

    await restoreFootnoteText(1, "orphaned text");

    expect(fn.parentCC.insertHtml).toHaveBeenCalledWith(escapeHtml("orphaned text"), "Replace");
    expect(fn.parentCC.title).toBe(LOCKED_PARENT_CC_TITLE);
    // No citation id available — nothing to wrap.
    expect(fn.insertContentControl).not.toHaveBeenCalled();
  });

  test("a footnote that no longer exists errors cleanly and touches nothing", async () => {
    const fn = makeRestorableFootnote("cit-9");
    installFakeWordWithFootnotes([fn.noteItem]);

    await expect(restoreFootnoteText(4, "text")).rejects.toThrow(
      "Cannot restore footnote 4: the document no longer has a footnote at that position."
    );
    expect(fn.parentCC.clear).not.toHaveBeenCalled();
    expect(fn.parentCC.insertHtml).not.toHaveBeenCalled();
  });

  test("a footnote without an Obiter content control errors cleanly", async () => {
    const bareNote = { body: { contentControls: { load: jest.fn(), items: [] } } };
    installFakeWordWithFootnotes([bareNote]);

    await expect(restoreFootnoteText(1, "text")).rejects.toThrow(
      "Cannot restore footnote 1: it has no Obiter content control to restore into."
    );
  });
});
