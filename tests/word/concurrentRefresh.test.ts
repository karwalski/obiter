/**
 * @jest-environment jsdom
 *
 * Concurrent refreshes are serialised (Word for the web defect, v1.17.1).
 *
 * A standard change in Settings fires the auto-refresh while the user's
 * Refresh All button runs a refresh of its own. Without a re-entrancy guard
 * the two passes interleaved: both scanned the same footnotes before either
 * wrote, then both replaced and re-wrapped the content, and every footnote
 * ended with duplicate child citation controls (`Ibid; Ibid; Ibid; Ibid`).
 *
 * The contract, over the shared fake footnote harness with a document that
 * updates its text as the refresher writes it:
 *
 * 1. Two `refreshAllCitations` calls fired concurrently run one after the
 *    other: the first rebuilds both footnotes, the second finds them
 *    current — each footnote is written once and wrapped in exactly one
 *    child control, with no duplicated text.
 * 2. A third call after both have resolved runs normally.
 * 3. A failing refresh does not block the queue.
 */

import {
  refreshAllCitations,
  resetRefreshSerialisationForTests,
} from "../../src/word/citationRefresher";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import { footnoteTexts, makeRefreshContext } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;

/** A two-footnote document citing "cit-1" twice (fn2 resolves to Ibid). */
function twoFootnoteDoc(): { doc: FakeDocState; specs: { citationId: string }[] } {
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("cit-1"));
  installFakeWord(doc);
  return { doc, specs: [{ citationId: "cit-1" }, { citationId: "cit-1" }] };
}

// The fake document is live: every write updates the parent's text as Word
// would present it to the next scan (see tests/store/fakeFootnoteHarness).

beforeEach(() => {
  localStorage.clear();
  resetRefreshSerialisationForTests();
});

describe("refreshAllCitations serialises concurrent calls", () => {
  it("two concurrent refreshes write each footnote once and wrap one child control each", async () => {
    const { doc, specs } = twoFootnoteDoc();
    const store = new CitationStore();
    await store.initStore();
    const ctx = makeRefreshContext(doc, specs);

    const [first, second] = await Promise.all([
      refreshAllCitations(ctx.context, store, noopHook),
      refreshAllCitations(ctx.context, store, noopHook),
    ]);

    expect(first.failures).toEqual([]);
    expect(second.failures).toEqual([]);
    // The first pass rebuilt both footnotes; the second found them current.
    expect(first.updated).toBe(2);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(2);

    // Each footnote's citation was written exactly once and wrapped exactly once.
    for (const parent of ctx.parents) expect(parent.insertHtml).toHaveBeenCalledTimes(1);
    expect(ctx.wrapped.map((w) => w.length)).toEqual([1, 1]);
    expect(ctx.parents.map((p) => p.contentControls.items.length)).toEqual([1, 1]);

    // No duplicated text: fn2 is a single Ibid, fn1 a single full citation.
    const texts = footnoteTexts(ctx);
    expect(texts[1]).toBe("Ibid.");
    expect(texts[0].match(/Ibid/g)).toBeNull();
    expect(texts[0].endsWith(".")).toBe(true);
    expect(texts[0].indexOf(texts[0].slice(0, 10), 1)).toBe(-1);
  });

  it("a third refresh after both resolve runs normally", async () => {
    const { doc, specs } = twoFootnoteDoc();
    const store = new CitationStore();
    await store.initStore();
    const ctx = makeRefreshContext(doc, specs);

    await Promise.all([
      refreshAllCitations(ctx.context, store, noopHook),
      refreshAllCitations(ctx.context, store, noopHook),
    ]);
    const third = await refreshAllCitations(ctx.context, store, noopHook);
    expect(third.failures).toEqual([]);
    expect(third.updated).toBe(0);
    expect(third.unchanged).toBe(2);
    expect(ctx.wrapped.map((w) => w.length)).toEqual([1, 1]);
  });

  it("a later caller shares the refresh already waiting behind the running one", async () => {
    const { doc, specs } = twoFootnoteDoc();
    const store = new CitationStore();
    await store.initStore();
    const ctx = makeRefreshContext(doc, specs);

    const running = refreshAllCitations(ctx.context, store);
    const waiting = refreshAllCitations(ctx.context, store);
    const joined = refreshAllCitations(ctx.context, store);
    expect(joined).toBe(waiting);
    expect(joined).not.toBe(running);

    const results = await Promise.all([running, waiting, joined]);
    expect(results.map((r) => r.failures)).toEqual([[], [], []]);
    expect(ctx.wrapped.map((w) => w.length)).toEqual([1, 1]);
  });

  it("a rejected refresh does not block the next one", async () => {
    const { doc, specs } = twoFootnoteDoc();
    const store = new CitationStore();
    await store.initStore();
    const ctx = makeRefreshContext(doc, specs);

    const broken = {
      document: {
        get body(): never {
          throw new Error("context lost");
        },
      },
    } as unknown as Word.RequestContext;
    const failing = refreshAllCitations(broken, store, noopHook);
    const next = refreshAllCitations(ctx.context, store, noopHook);

    await expect(failing).rejects.toThrow("context lost");
    const result = await next;
    expect(result.failures).toEqual([]);
    expect(result.updated).toBe(2);
  });
});
