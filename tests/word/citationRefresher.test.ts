/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * PARITY-102c (Rule 1.4.6): the refresher may offer the within-footnote
 * 'at «pinpoint»' form only when the immediately preceding citation in the
 * footnote is the same source. A pinpoint to an earlier, non-adjacent source
 * must fall back to the Rule 1.4.1 '(n X)' short form (AGLC4 fn 94:
 * 'Brennan Jr (n 94) 430').
 */

import {
  isImmediatelyPrecedingInFootnote,
  classifyFootnote,
  chunkItems,
  executeRebuilds,
  REBUILD_CHUNK_SIZE,
} from "../../src/word/citationRefresher";
import type { RenderedCitation, RebuildWorkItem } from "../../src/word/citationRefresher";
import { hashRenderedText } from "../../src/utils/textHash";
import { buildParentTitle } from "../../src/word/footnoteManager";

describe("Rule 1.4.6 — 'at' only for the immediately preceding source in the footnote", () => {
  it("is true when the immediately preceding citation is the same source", () => {
    expect(isImmediatelyPrecedingInFootnote("a", ["a"])).toBe(true);
    expect(isImmediatelyPrecedingInFootnote("a", ["b", "a"])).toBe(true);
  });

  it("is false when the source appeared earlier but another source intervened (AGLC4 fn 94)", () => {
    // fn 94: Brennan Jr article, then Rees & Rohn article, then a later
    // pinpoint to Brennan Jr — must use 'Brennan Jr (n 94) 430', not 'at 430'.
    expect(isImmediatelyPrecedingInFootnote("brennan", ["brennan", "rees-rohn"])).toBe(false);
    expect(isImmediatelyPrecedingInFootnote("a", ["a", "b", "c"])).toBe(false);
  });

  it("is false for the first citation in a footnote", () => {
    expect(isImmediatelyPrecedingInFootnote("a", [])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFE-002 — user-edit detection decision matrix
// ═══════════════════════════════════════════════════════════════════════════

describe("SAFE-002 — classifyFootnote decision matrix", () => {
  const oldRender = "Mabo v Queensland (No 2) (1992) 175 CLR 1.";
  const newRender = "Ibid.";
  const userEdit = "Mabo v Queensland (No 2) (1992) 175 CLR 1, as I prefer to cite it.";

  it("current == expected → unchanged (regardless of stored hash)", () => {
    expect(classifyFootnote(oldRender, oldRender, undefined)).toBe("unchanged");
    expect(classifyFootnote(oldRender, oldRender, hashRenderedText(oldRender))).toBe("unchanged");
    expect(classifyFootnote(oldRender, oldRender, "00000000")).toBe("unchanged");
  });

  it("current != expected with matching stored hash → rebuild (stale Obiter render)", () => {
    expect(classifyFootnote(oldRender, newRender, hashRenderedText(oldRender))).toBe("rebuild");
  });

  it("current != expected with no stored hash → rebuild (legacy status quo)", () => {
    expect(classifyFootnote(oldRender, newRender, undefined)).toBe("rebuild");
  });

  it("current != expected with mismatching stored hash → user-edited (never clobber)", () => {
    expect(classifyFootnote(userEdit, newRender, hashRenderedText(oldRender))).toBe("user-edited");
  });

  it("after Ctrl+Z reverts a refresh, the reverted text reads as user-edited", () => {
    // A refresh rendered newRender and stored its hash; the user pressed
    // Ctrl+Z, restoring oldRender. hash(oldRender) != stored hash(newRender),
    // so the next refresh must NOT re-clobber.
    expect(classifyFootnote(oldRender, newRender, hashRenderedText(newRender))).toBe("user-edited");
  });

  it("whitespace-only host quirks still classify as a stale render, not a user edit", () => {
    // Word for Web reads back NBSP where a plain space was rendered — the
    // normalized hash still matches the stored hash, so this rebuilds.
    const nbspVariant = oldRender.replace(/ /g, "\u00a0");
    expect(classifyFootnote(nbspVariant, newRender, hashRenderedText(oldRender))).toBe("rebuild");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SAFE-003 — chunking math and pipelined rebuild batching
// ═══════════════════════════════════════════════════════════════════════════

describe("SAFE-003 — chunkItems", () => {
  it("splits items into consecutive chunks of at most the given size", () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    const chunks = chunkItems(items, 8);
    expect(chunks.map((c) => c.length)).toEqual([8, 8, 4]);
    expect(chunks.flat()).toEqual(items);
  });

  it("returns a single chunk when the size exceeds the item count", () => {
    expect(chunkItems([1, 2, 3], 8)).toEqual([[1, 2, 3]]);
  });

  it("returns an exact split with no trailing empty chunk", () => {
    expect(chunkItems([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("returns no chunks for no items", () => {
    expect(chunkItems([], 8)).toEqual([]);
  });
});

// ─── Mock harness for executeRebuilds ───────────────────────────────────────

interface MockParentCC {
  title: string;
  insertHtml: jest.Mock;
  getRange: jest.Mock;
}

/** Builds a minimal parent-CC proxy: insertHtml, title, getRange→search→wrap. */
function makeMockParentCC(): MockParentCC {
  const makeMatchRange = (): { insertContentControl: jest.Mock } => ({
    insertContentControl: jest.fn(() => ({ tag: "", title: "", appearance: "" })),
  });
  const parentRange = {
    search: jest.fn(() => ({ items: [makeMatchRange()], load: jest.fn() })),
  };
  return {
    title: "Obiter Footnote",
    insertHtml: jest.fn(),
    getRange: jest.fn(() => parentRange),
  };
}

function makeWorkItem(footnoteNumber: number, cc: MockParentCC): RebuildWorkItem {
  const text = `Citation text for footnote ${footnoteNumber}`;
  const rendered: RenderedCitation[] = [
    {
      runs: [{ text }],
      citationId: `id-${footnoteNumber}`,
      signal: undefined,
      renderedFormat: "full",
      formatPreference: "auto",
    },
  ];
  return {
    footnoteNumber,
    parentCC: cc as unknown as Word.ContentControl,
    rendered,
    expectedText: `${text}.`,
    existingText: "stale text",
  };
}

function makeSyncCountingContext(): { context: Word.RequestContext; getSyncCount: () => number } {
  let syncCount = 0;
  const context = {
    sync: jest.fn(async () => {
      syncCount++;
    }),
  } as unknown as Word.RequestContext;
  return { context, getSyncCount: () => syncCount };
}

describe("SAFE-003 — executeRebuilds sync batching", () => {
  it("uses exactly 3 syncs per chunk: R rebuilds cost 3·ceil(R/8) syncs", async () => {
    const R = 20;
    const ccs = Array.from({ length: R }, () => makeMockParentCC());
    const items = ccs.map((cc, i) => makeWorkItem(i + 1, cc));
    const { context, getSyncCount } = makeSyncCountingContext();

    const outcome = await executeRebuilds(context, items, REBUILD_CHUNK_SIZE);

    const expectedSyncs = 3 * Math.ceil(R / REBUILD_CHUNK_SIZE);
    expect(getSyncCount()).toBe(expectedSyncs);
    // AC bound for the whole refresh: ≤ 2 + 3·ceil(R/8). The two extra syncs
    // (batch read + final commit) live outside executeRebuilds.
    expect(getSyncCount() + 2).toBeLessThanOrEqual(2 + 3 * Math.ceil(R / 8));
    expect(outcome.updated).toBe(R);
    expect(outcome.failures).toEqual([]);
  });

  it("writes the rendered-text hash into each parent title (SAFE-002)", async () => {
    const cc = makeMockParentCC();
    const item = makeWorkItem(1, cc);
    const { context } = makeSyncCountingContext();

    await executeRebuilds(context, [item]);

    expect(cc.title).toBe(
      buildParentTitle({ locked: false, renderedHash: hashRenderedText(item.expectedText) })
    );
    expect(cc.insertHtml).toHaveBeenCalledTimes(1);
  });

  it("a failing chunk is recorded and the remaining chunks still rebuild", async () => {
    const R = 20; // chunks: [1-8], [9-16], [17-20]
    const ccs = Array.from({ length: R }, () => makeMockParentCC());
    // Footnote 9 (first item of the second chunk) fails at insertHtml.
    ccs[8].insertHtml.mockImplementation(() => {
      throw new Error("boom");
    });
    const items = ccs.map((cc, i) => makeWorkItem(i + 1, cc));
    const { context } = makeSyncCountingContext();

    const outcome = await executeRebuilds(context, items, REBUILD_CHUNK_SIZE);

    // The failed chunk covers footnotes 9-16; chunks 1 and 3 succeeded.
    expect(outcome.failures).toHaveLength(1);
    expect(outcome.failures[0].footnoteNumbers).toEqual([9, 10, 11, 12, 13, 14, 15, 16]);
    expect(outcome.failures[0].error).toContain("boom");
    expect(outcome.updated).toBe(12);
    // Footnotes outside the failed chunk were actually written.
    expect(ccs[0].insertHtml).toHaveBeenCalled();
    expect(ccs[19].insertHtml).toHaveBeenCalled();
  });
});
