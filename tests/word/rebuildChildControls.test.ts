/**
 * @jest-environment jsdom
 *
 * Rebuilt footnotes carry exactly one child control per citation (Word for
 * the web defect, v1.17.2).
 *
 * `executeRebuildChunk` used to write the whole footnote as one HTML
 * fragment with "Replace" and then search the parent's text to wrap each
 * citation in its child control. On Word for the web the old child survived
 * the "Replace" — so every rebuild added a child beside it (`Mabo (n 1);
 * Mabo (n 1); …`) — or the search found nothing and the citation lost its
 * binding. The rebuild now runs three synced stages per chunk, the sequence
 * verified live on Word for the web: delete the old children → sync; chain
 * the text as ranges (`parentCC.insertHtml(cit1, "Replace")` →
 * `.insertText("; ", "After")` → `.insertHtml(cit2, "After")` →
 * `.insertText(".", "After")`) → sync; wrap each citation range in its child
 * control → sync. Appending through the parent's "End" put the full stop
 * inside the last child, and wrapping in the text batch put the separator
 * inside the child.
 *
 * Over the shared fake footnote harness, which models the web host (a
 * "Replace" insert does NOT remove existing children; only `delete()` does;
 * the parent's "End" and a same-batch wrap swallow text into the child):
 *
 * 1. After a rebuild each footnote holds exactly one child per rendered
 *    citation, tagged and titled like the insert path's children.
 * 2. The children the footnote was seeded with are deleted.
 * 3. Each child's text is exactly its citation (no separator, no full
 *    stop); the parent text is `cit1; cit2.`; the wraps are issued only
 *    after the text batch has synced.
 * 4. A second rebuild replaces the children again without changing the count.
 */

import { refreshAllCitations } from "../../src/word/citationRefresher";
import { buildOccurrenceTitle } from "../../src/word/footnoteManager";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import {
  DEFAULT_PARENT_TITLE,
  footnoteTexts,
  htmlToText,
  liveChildren,
  makeRefreshContext,
} from "../store/fakeFootnoteHarness";
import type { FakeFootnoteContext, FootnoteSpec } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;

/**
 * A three-footnote document over two sources: fn1 cites both (two children),
 * fn2 repeats the first source (a `(n 1)` short form — fn1 cites two sources,
 * so no ibid), fn3 repeats the second.
 */
const SPECS: FootnoteSpec[] = [
  { citationId: "cit-1", additional: [{ citationId: "cit-2" }] },
  { citationId: "cit-1" },
  { citationId: "cit-2" },
];
const CITATIONS_PER_FOOTNOTE = [2, 1, 1];

async function makeDoc(): Promise<{ store: CitationStore; ctx: FakeFootnoteContext }> {
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("cit-1", "cit-2"));
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();
  return { store, ctx: makeRefreshContext(doc, SPECS) };
}

beforeEach(() => {
  localStorage.clear();
});

describe("rebuild writes exactly one child control per citation", () => {
  it("each rebuilt footnote holds one child per rendered citation, bound like the insert path's", async () => {
    const { store, ctx } = await makeDoc();

    const result = await refreshAllCitations(ctx.context, store, noopHook);

    expect(result.failures).toEqual([]);
    expect(result.updated).toBe(4);
    expect(liveChildren(ctx).map((c) => c.length)).toEqual(CITATIONS_PER_FOOTNOTE);

    const expectedIds = SPECS.map((spec) => [
      spec.citationId,
      ...(spec.additional ?? []).map((occ) => occ.citationId),
    ]);
    for (const [i, children] of liveChildren(ctx).entries()) {
      expect(children.map((c) => c.tag)).toEqual(expectedIds[i]);
      for (const child of children) {
        expect(child.title).toBe(buildOccurrenceTitle("auto"));
        expect(child.appearance).toBe("Hidden");
        expect(child.text).not.toBe("");
      }
    }
  });

  it("deletes the children the footnote held before the rebuild", async () => {
    const { store, ctx } = await makeDoc();

    await refreshAllCitations(ctx.context, store, noopHook);

    for (const seeded of ctx.children.flat()) {
      expect(seeded.removed).toBe(true);
      expect(seeded.delete).toHaveBeenCalledWith(false);
    }
    // Nothing that survives is a seeded child; every live child was wrapped.
    for (const [i, children] of liveChildren(ctx).entries()) {
      for (const child of children) {
        expect(ctx.children[i]).not.toContain(child);
        expect(ctx.wrapped[i]).toContain(child);
      }
    }
  });

  it("chains the text off the first Replace and keeps separators and punctuation outside the children", async () => {
    const { store, ctx } = await makeDoc();

    await refreshAllCitations(ctx.context, store, noopHook);

    // fn1: parent.insertHtml(cit-1, "Replace") → .insertText("; ", "After")
    // → .insertHtml(cit-2, "After") → .insertText(".", "After"). Only the
    // html writes are wrapped; nothing goes through the parent's "End".
    const fn1 = ctx.parents[0].writes;
    expect(fn1.map((w) => w.kind)).toEqual(["html", "text", "html", "text"]);
    expect(fn1.map((w) => w.location)).toEqual(["Replace", "After", "After", "After"]);
    expect(fn1.map((w) => w.via)).toEqual(["parent", "range", "range", "range"]);
    expect(fn1.map((w) => w.child !== undefined)).toEqual([true, false, true, false]);
    expect(fn1[1].content).toBe("; ");
    expect(fn1[3].content).toBe(".");

    // Single-citation footnotes: [citation] "." with the "." chained after it.
    for (const parent of ctx.parents.slice(1)) {
      expect(parent.writes.map((w) => [w.kind, w.location, w.via])).toEqual([
        ["html", "Replace", "parent"],
        ["text", "After", "range"],
      ]);
      expect(parent.writes[0].child).toBeDefined();
      expect(parent.writes[1].child).toBeUndefined();
      expect(parent.writes[1].content).toBe(".");
    }
    for (const parent of ctx.parents) {
      expect(parent.insertText).not.toHaveBeenCalled();
      // insertHtml is never called with an empty fragment (it throws on the web).
      for (const call of parent.insertHtml.mock.calls) expect(call[0]).not.toBe("");
    }
  });

  it("each child's text is exactly its citation and the parent text is `cit1; cit2.`", async () => {
    const { store, ctx } = await makeDoc();

    await refreshAllCitations(ctx.context, store, noopHook);

    const texts = footnoteTexts(ctx);
    const children = liveChildren(ctx);
    for (const [i, fnChildren] of children.entries()) {
      // Every child covers its citation's HTML fragment and nothing else —
      // no separator, no full stop, no trailing space.
      const citationWrites = ctx.parents[i].writes.filter((w) => w.kind === "html");
      expect(fnChildren.map((c) => c.text)).toEqual(
        citationWrites.map((w) => htmlToText(w.content))
      );
      for (const child of fnChildren) {
        expect(child.text).not.toMatch(/[;.]\s*$/);
        expect(child.text).not.toMatch(/\s$/);
      }
    }
    expect(texts[0]).toBe(`${children[0][0].text}; ${children[0][1].text}.`);
    expect(texts[1]).toBe(`${children[1][0].text}.`);
    expect(texts[2]).toBe(`${children[2][0].text}.`);
    expect(texts[1]).toContain("(n 1)");
    // The live parent text agrees with the write log.
    expect(ctx.parents.map((p) => p.text)).toEqual(texts);
  });

  it("issues the wraps only after the text batch has synced, and the deletes before it", async () => {
    const { store, ctx } = await makeDoc();

    await refreshAllCitations(ctx.context, store, noopHook);

    for (const [i, parent] of ctx.parents.entries()) {
      const textBatches = new Set(parent.writes.map((w) => w.batch));
      expect(textBatches.size).toBe(1);
      const [textBatch] = textBatches;
      for (const seeded of ctx.children[i]) {
        expect(seeded.deletedInBatch).toBeLessThan(textBatch);
      }
      for (const child of ctx.wrapped[i]) {
        expect(child.wrappedInBatch).toBeGreaterThan(textBatch);
      }
    }
  });

  it("a second rebuild replaces the children without changing the count", async () => {
    const { store, ctx } = await makeDoc();
    await refreshAllCitations(ctx.context, store, noopHook);
    const firstRound = liveChildren(ctx);
    const textsAfterFirst = footnoteTexts(ctx);

    // A refresh over the up-to-date document finds every footnote current:
    // nothing is written and the children are untouched.
    const current = await refreshAllCitations(ctx.context, store, noopHook);
    expect(current.updated).toBe(0);
    expect(current.unchanged).toBe(4);
    expect(liveChildren(ctx)).toEqual(firstRound);

    // Force a second rebuild: the text is stale but unhashed, exactly as a
    // legacy footnote presents itself. Every first-round child is deleted
    // and replaced by one new child per citation — never accumulated.
    for (const parent of ctx.parents) {
      parent.text = "stale render";
      parent.title = DEFAULT_PARENT_TITLE;
    }
    const rebuilt = await refreshAllCitations(ctx.context, store, noopHook);
    expect(rebuilt.failures).toEqual([]);
    expect(rebuilt.updated).toBe(4);

    const secondRound = liveChildren(ctx);
    expect(secondRound.map((c) => c.length)).toEqual(CITATIONS_PER_FOOTNOTE);
    for (const [i, children] of firstRound.entries()) {
      for (const child of children) {
        expect(child.removed).toBe(true);
        expect(secondRound[i]).not.toContain(child);
      }
    }
    expect(secondRound.map((c) => c.map((child) => child.tag))).toEqual(
      firstRound.map((c) => c.map((child) => child.tag))
    );
    expect(footnoteTexts(ctx)).toEqual(textsAfterFirst);
    expect(ctx.wrapped.map((w) => w.length)).toEqual(CITATIONS_PER_FOOTNOTE.map((n) => 2 * n));
  });
});
