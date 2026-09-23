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
  insertText: jest.Mock;
}

/**
 * Builds a minimal parent-CC proxy: title, insertHtml / insertText returning
 * a range whose insertContentControl yields a fresh child CC.
 */
function makeMockParentCC(): MockParentCC {
  const makeInsertedRange = (): { insertContentControl: jest.Mock } => ({
    insertContentControl: jest.fn(() => ({ tag: "", title: "", appearance: "" })),
  });
  return {
    title: "Obiter Footnote",
    insertHtml: jest.fn(() => makeInsertedRange()),
    insertText: jest.fn(() => makeInsertedRange()),
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
    existingChildCCs: [],
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
  it("uses exactly 1 sync per chunk: R rebuilds cost ceil(R/8) syncs", async () => {
    const R = 20;
    const ccs = Array.from({ length: R }, () => makeMockParentCC());
    const items = ccs.map((cc, i) => makeWorkItem(i + 1, cc));
    const { context, getSyncCount } = makeSyncCountingContext();

    const outcome = await executeRebuilds(context, items, REBUILD_CHUNK_SIZE);

    const expectedSyncs = Math.ceil(R / REBUILD_CHUNK_SIZE);
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

// ═══════════════════════════════════════════════════════════════════════════
// ENP-010 — occurrence-title pinpoints keep their TYPE across "Refresh all"
// ═══════════════════════════════════════════════════════════════════════════
//
// AGLC4 Rule 1.1.6: a first reference may carry a pinpoint after the
// citation — 'Mabo v Queensland [No 2] (1992) 175 CLR 1, 42' (page) or
// '… 175 CLR 1 [42]' (paragraph; Rule 2.2.5 for cases). A first-occurrence
// footnote inserted with a title pinpoint must re-render with that same
// pinpoint, and a paragraph stored as '[42]' must never come back as page 42.

import {
  renderFootnoteCitations,
  resolveOccurrencePinpoint,
} from "../../src/word/citationRefresher";
import type { FootnoteEntry } from "../../src/word/citationRefresher";
import { parseOccurrenceTitle, buildOccurrenceTitle } from "../../src/word/footnoteManager";
import type { CitationStore } from "../../src/store/citationStore";
import type { Citation } from "../../src/types/citation";
import { getStandardConfig } from "../../src/engine/standards";

const mabo: Citation = {
  id: "mabo",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland [No 2]",
    yearType: "round",
    year: 1992,
    volume: 175,
    reportSeries: "CLR",
    startingPage: 1,
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

const smith: Citation = {
  id: "smith",
  aglcVersion: "4",
  sourceType: "book",
  data: {
    authors: [{ givenNames: "John", surname: "Smith" }],
    title: "Contract Law",
    publisher: "Oxford",
    year: 2020,
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

function makeStore(...citations: Citation[]): CitationStore {
  const byId = new Map(citations.map((c) => [c.id, c]));
  return { getById: (id: string) => byId.get(id) } as unknown as CitationStore;
}

/** A footnote entry as the refresher's scan phase assembles it from CC titles. */
function makeFootnote(footnoteNumber: number, ...children: Array<[string, string]>): FootnoteEntry {
  return {
    parentCC: {} as Word.ContentControl,
    footnoteNumber,
    isLocked: false,
    children: children.map(([citationId, ccTitle]) => {
      const parsed = parseOccurrenceTitle(ccTitle);
      return {
        citationId,
        footnoteNumber,
        pinpoint: parsed.pinpoint,
        formatPreference: parsed.formatPreference,
        ccTitle,
      };
    }),
  };
}

/** Renders a document's footnotes in order, threading the ibid/short context. */
function renderDocument(store: CitationStore, footnotes: FootnoteEntry[]): string[] {
  const config = getStandardConfig("aglc4");
  const footnoteMap = new Map<string, number>();
  for (const fn of footnotes) {
    for (const child of fn.children) {
      if (!footnoteMap.has(child.citationId)) footnoteMap.set(child.citationId, fn.footnoteNumber);
    }
  }
  const seen = new Set<string>();
  let prevNumber = 0;
  let prevIds: string[] = [];
  let prevPinpoint = undefined as ReturnType<typeof resolveOccurrencePinpoint>;
  const out: string[] = [];
  for (const fn of footnotes) {
    const currentIds: string[] = [];
    const rendered = renderFootnoteCitations(
      fn,
      store,
      config,
      footnoteMap,
      seen,
      currentIds,
      prevNumber,
      prevIds,
      prevPinpoint
    );
    out.push(rendered.map((r) => r.runs.map((run) => run.text).join("")).join("; "));
    prevNumber = fn.footnoteNumber;
    prevIds = [...currentIds];
    prevPinpoint = rendered[rendered.length - 1]?.effectivePinpoint;
  }
  return out;
}

describe("ENP-010 — resolveOccurrencePinpoint", () => {
  it("decodes the title pinpoint by type, taking priority over the stored pinpoint", () => {
    expect(resolveOccurrencePinpoint("[42]", { type: "page", value: "9" })).toEqual({
      type: "paragraph",
      value: "[42]",
    });
    expect(resolveOccurrencePinpoint("s 5", undefined)).toEqual({ type: "section", value: "5" });
    expect(resolveOccurrencePinpoint("42", undefined)).toEqual({ type: "page", value: "42" });
  });

  it("falls back to the stored pinpoint (object or page string) when the title has none", () => {
    expect(resolveOccurrencePinpoint(undefined, { type: "paragraph", value: "[7]" })).toEqual({
      type: "paragraph",
      value: "[7]",
    });
    expect(resolveOccurrencePinpoint("", "12")).toEqual({ type: "page", value: "12" });
  });

  it("drops blank or partial pinpoints so nothing renders as 'undefined'", () => {
    expect(
      resolveOccurrencePinpoint(undefined, { type: "page", value: undefined })
    ).toBeUndefined();
    expect(resolveOccurrencePinpoint("  ", "  ")).toBeUndefined();
    expect(resolveOccurrencePinpoint(undefined, undefined)).toBeUndefined();
  });
});

describe("ENP-010 — first-occurrence footnotes re-render with their title pinpoint", () => {
  it("a paragraph title pinpoint '[42]' on a reported case re-renders as '… 175 CLR 1 [42]'", () => {
    const store = makeStore(mabo);
    const [fn1] = renderDocument(store, [makeFootnote(1, ["mabo", "Citation:auto:[42]"])]);
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]");
  });

  it("a bare title pinpoint '42' on a book re-renders as a page (Rule 6.4)", () => {
    const store = makeStore(smith);
    const [fn1] = renderDocument(store, [makeFootnote(1, ["smith", "Citation:auto:42"])]);
    expect(fn1).toBe("John Smith, Contract Law (Oxford, 2020) 42");
  });

  it("a legacy bare title pinpoint '42' on a case is still a page: '… 175 CLR 1, 42'", () => {
    const store = makeStore(mabo);
    const [fn1] = renderDocument(store, [makeFootnote(1, ["mabo", "Citation:full:42"])]);
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1, 42");
  });

  it("a typed Pinpoint written through buildOccurrenceTitle survives the round trip", () => {
    const title = buildOccurrenceTitle("auto", { type: "paragraph", value: "[42]" });
    expect(title).toBe("Citation:auto:[42]");
    expect(parseOccurrenceTitle(title).pinpointRef).toEqual({ type: "paragraph", value: "[42]" });
    const [fn1] = renderDocument(makeStore(mabo), [makeFootnote(1, ["mabo", title])]);
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]");
  });

  it("the title pinpoint wins over the citation's stored pinpoint on the first occurrence", () => {
    const stored: Citation = {
      ...mabo,
      data: { ...mabo.data, pinpoint: { type: "page", value: "9" } },
    };
    const [fn1] = renderDocument(makeStore(stored), [
      makeFootnote(1, ["mabo", "Citation:auto:[42]"]),
    ]);
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1 [42]");
  });

  it("without a title pinpoint the first occurrence renders exactly as before", () => {
    const [fn1] = renderDocument(makeStore(mabo), [makeFootnote(1, ["mabo", "Citation:auto"])]);
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1");
  });

  it("subsequent occurrences keep the typed pinpoint and ibid compares the rendered ones (Rule 1.4.3)", () => {
    const store = makeStore({ ...mabo, shortTitle: "Mabo" });
    const [fn1, fn2, fn3, fn4] = renderDocument(store, [
      makeFootnote(1, ["mabo", "Citation:auto:[42]"]),
      makeFootnote(2, ["mabo", "Citation:auto:[42]"]),
      makeFootnote(3, ["mabo", "Citation:auto:[43]"]),
      makeFootnote(4, ["mabo", "Citation:short:s 5"]),
    ]);
    // Rule 1.4.4: the short title is introduced after the first citation.
    expect(fn1).toBe("Mabo v Queensland [No 2] (1992) 175 CLR 1 [42] (‘Mabo’)");
    // Same pinpoint as the preceding footnote → bare 'Ibid'.
    expect(fn2).toBe("Ibid");
    // Different paragraph → 'Ibid [43]', not 'Ibid 43'.
    expect(fn3).toBe("Ibid [43]");
    // Section pinpoint keeps its label in the short form.
    expect(fn4).toBe("Mabo (n 1) s 5");
  });
});
