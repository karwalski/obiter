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
 * binding. The rebuild now deletes the old children explicitly and writes
 * each citation through the parent's own `insertHtml`, wrapping the range
 * it returns (the insert path's mechanism), with separators and closing
 * punctuation appended as plain text outside the children.
 *
 * Over the shared fake footnote harness, which models the web host (a
 * "Replace" insert does NOT remove existing children; only `delete()` does):
 *
 * 1. After a rebuild each footnote holds exactly one child per rendered
 *    citation, tagged and titled like the insert path's children.
 * 2. The children the footnote was seeded with are deleted.
 * 3. Separators and the closing punctuation are written as text outside
 *    the child controls; the footnote text is the expected render.
 * 4. A second rebuild replaces the children again without changing the count.
 */

import { refreshAllCitations } from "../../src/word/citationRefresher";
import { buildOccurrenceTitle } from "../../src/word/footnoteManager";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import {
  DEFAULT_PARENT_TITLE,
  footnoteTexts,
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

  it("keeps separators and closing punctuation outside the child controls", async () => {
    const { store, ctx } = await makeDoc();

    await refreshAllCitations(ctx.context, store, noopHook);

    // fn1: [cit-1] "; " [cit-2] "." — html writes are wrapped, text writes are not.
    const fn1 = ctx.parents[0].writes;
    expect(fn1.map((w) => w.kind)).toEqual(["html", "text", "html", "text"]);
    expect(fn1.map((w) => w.location)).toEqual(["Replace", "End", "End", "End"]);
    expect(fn1.map((w) => w.child !== undefined)).toEqual([true, false, true, false]);
    expect(fn1[1].content).toBe("; ");
    expect(fn1[3].content).toBe(".");

    // Single-citation footnotes: [citation] "." with the "." outside the child.
    for (const parent of ctx.parents.slice(1)) {
      expect(parent.writes.map((w) => [w.kind, w.location])).toEqual([
        ["html", "Replace"],
        ["text", "End"],
      ]);
      expect(parent.writes[0].child).toBeDefined();
      expect(parent.writes[1].child).toBeUndefined();
      expect(parent.writes[1].content).toBe(".");
    }

    // The children's text plus the separators and punctuation IS the footnote
    // text — the expected render the hash in the parent title covers.
    const texts = footnoteTexts(ctx);
    const children = liveChildren(ctx);
    expect(texts[0]).toBe(`${children[0][0].text}; ${children[0][1].text}.`);
    expect(texts[1]).toBe(`${children[1][0].text}.`);
    expect(texts[2]).toBe(`${children[2][0].text}.`);
    expect(texts[1]).toContain("(n 1)");
    // insertHtml is never called with an empty fragment (it throws on the web).
    for (const parent of ctx.parents) {
      for (const call of parent.insertHtml.mock.calls) expect(call[0]).not.toBe("");
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
