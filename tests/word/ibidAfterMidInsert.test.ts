/**
 * @jest-environment jsdom
 *
 * Field report 27 Sep 2026: an "auto" occurrence rendered as Ibid must stop
 * being Ibid when a footnote citing a different source is inserted before
 * it. The form is re-decided on every refresh (AGLC4 r 1.4.3).
 */

import { refreshAllCitations } from "../../src/word/citationRefresher";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import { footnoteTexts, makeRefreshContext } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;

beforeEach(() => localStorage.clear());

test("inserting another source between a short reference and its Ibid re-decides the Ibid", async () => {
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("x", "y"));
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();

  // Before: fn1 X, fn2 Y, fn3 X (short), fn4 X (auto -> Ibid).
  const before = makeRefreshContext(doc, [
    { citationId: "x" },
    { citationId: "y" },
    { citationId: "x" },
    { citationId: "x" },
  ]);
  await refreshAllCitations(before.context, store, noopHook);
  const t1 = footnoteTexts(before);
  const titles = before.parents.map((p) => p.title);
  expect(t1[3]).toMatch(/^Ibid/);

  // The user inserts a new footnote citing Y between fn3 and fn4.
  const after = makeRefreshContext(doc, [
    { citationId: "x", text: t1[0], title: titles[0] },
    { citationId: "y", text: t1[1], title: titles[1] },
    { citationId: "x", text: t1[2], title: titles[2] },
    { citationId: "y" },
    { citationId: "x", text: t1[3], title: titles[3] },
  ]);
  const result = await refreshAllCitations(after.context, store, noopHook);
  const t2 = footnoteTexts(after);
  expect(t2[4]).not.toMatch(/^Ibid/);
  expect(t2[4]).toMatch(/\(n 1\)/);
});
