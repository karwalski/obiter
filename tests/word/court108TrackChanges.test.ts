/**
 * @jest-environment jsdom
 *
 * COURT-108 (OBI-205): respect Track Changes during managed writes.
 *
 * Evidence: O-K12 (no use of changeTrackingMode before COURT-108), O-P1 and
 * R08 §3.6 (Document.changeTrackingMode WordApi 1.4;
 * ContentControlCollection.getByChangeTrackingStates WordApi 1.5;
 * Range.getTrackedChanges WordApi 1.6), R01 §2.9 (a rebuild with tracking on
 * records whole-footnote delete/insert revisions).
 *
 * 1. The Track Changes mode is read only where WordApi 1.4 is reported, and a
 *    failed read degrades to "unknown" (no pause, behaviour as before).
 * 2. The automatic-refresh gate pauses while tracking is on and clears when
 *    it is off; an acknowledged pause stays quiet until tracking is off.
 * 3. A managed footnote whose controls sit inside a pending tracked
 *    insertion or deletion is skipped and listed, never rebuilt, at no extra
 *    sync cost; other footnotes still rebuild.
 * 4. The pending-revision count is read-only and needs WordApi 1.6.
 */

import {
  countPendingRevisionsInManagedFootnotes,
  isTrackingOn,
  normaliseTrackingMode,
  queueRevisionProbe,
  readChangeTrackingMode,
  readRevisionProbe,
} from "../../src/word/trackChanges";
import {
  acknowledgeTrackChangesPause,
  getTrackChangesGate,
  recordTrackingMode,
  resetTrackChangesGate,
} from "../../src/ui/trackChangesGate";
import { refreshAllCitations } from "../../src/word/citationRefresher";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import { makeRefreshContext } from "../store/fakeFootnoteHarness";
import type { FootnoteSpec } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;

/** Install an Office global reporting WordApi up to `max` (e.g. 1.5). */
function installOffice(max: number): void {
  (global as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, version: string): boolean =>
          set === "WordApi" && parseFloat(version) <= max,
      },
    },
  };
}

afterEach(() => {
  delete (global as Record<string, unknown>).Office;
  resetTrackChangesGate();
});

// ─── 1. Reading the mode ──────────────────────────────────────────────────────

describe("COURT-108 — reading Document.changeTrackingMode (WordApi 1.4)", () => {
  it("normalises Word's values and treats both tracking modes as on", () => {
    expect(normaliseTrackingMode("Off")).toBe("Off");
    expect(normaliseTrackingMode("TrackAll")).toBe("TrackAll");
    expect(normaliseTrackingMode("trackMineOnly")).toBe("TrackMineOnly");
    expect(normaliseTrackingMode(undefined)).toBe("unknown");
    expect(normaliseTrackingMode(3)).toBe("unknown");
    expect(isTrackingOn("TrackAll")).toBe(true);
    expect(isTrackingOn("TrackMineOnly")).toBe(true);
    expect(isTrackingOn("Off")).toBe(false);
    expect(isTrackingOn("unknown")).toBe(false);
  });

  function modeContext(mode: string | Error): {
    context: Word.RequestContext;
    syncs: () => number;
  } {
    let syncs = 0;
    const doc = { changeTrackingMode: undefined as string | undefined, load: jest.fn() };
    const context = {
      document: doc,
      sync: jest.fn(async () => {
        syncs++;
        if (mode instanceof Error) throw mode;
        doc.changeTrackingMode = mode;
      }),
    };
    return { context: context as unknown as Word.RequestContext, syncs: () => syncs };
  }

  it("reads the mode in one sync where WordApi 1.4 is reported", async () => {
    installOffice(1.5);
    const { context, syncs } = modeContext("TrackAll");
    await expect(readChangeTrackingMode(context)).resolves.toBe("TrackAll");
    expect(syncs()).toBe(1);
  });

  it("does not touch the document below WordApi 1.4", async () => {
    installOffice(1.3);
    const { context, syncs } = modeContext("TrackAll");
    await expect(readChangeTrackingMode(context)).resolves.toBe("unknown");
    expect(syncs()).toBe(0);
  });

  it("degrades to unknown when the read fails", async () => {
    installOffice(1.5);
    const { context } = modeContext(new Error("GeneralException"));
    await expect(readChangeTrackingMode(context)).resolves.toBe("unknown");
  });
});

// ─── 2. The automatic-refresh gate ───────────────────────────────────────────

describe("COURT-108 — automatic refresh pauses while Track Changes is on", () => {
  it("pauses on TrackAll / TrackMineOnly and never on Off or unknown", () => {
    expect(recordTrackingMode("Off")).toBe(false);
    expect(recordTrackingMode("unknown")).toBe(false);
    expect(getTrackChangesGate().paused).toBe(false);

    expect(recordTrackingMode("TrackMineOnly", 3)).toBe(true);
    expect(getTrackChangesGate()).toEqual({
      paused: true,
      mode: "TrackMineOnly",
      acknowledged: false,
      pendingRevisions: 3,
    });
  });

  it("an acknowledged pause stays quiet until Track Changes is turned off", () => {
    recordTrackingMode("TrackAll");
    acknowledgeTrackChangesPause();
    expect(recordTrackingMode("TrackAll")).toBe(true);
    expect(getTrackChangesGate().acknowledged).toBe(true);

    // Turned off: the pause clears.
    expect(recordTrackingMode("Off")).toBe(false);
    expect(getTrackChangesGate().paused).toBe(false);

    // Turned on again: a fresh, unacknowledged pause.
    recordTrackingMode("TrackAll");
    expect(getTrackChangesGate()).toMatchObject({ paused: true, acknowledged: false });
  });
});

// ─── 3. Managed controls inside pending revisions ────────────────────────────

describe("COURT-108 — footnotes in pending revisions are skipped and listed", () => {
  /**
   * Fixture (synthetic, mirrors a tracked insertion in OOXML: the footnote's
   * obiter-fn control sits inside a w:ins). Footnote 2 is in the revision;
   * footnotes 1 and 3 are not. None carries a stored hash, so all three
   * would be rebuilt without COURT-108.
   */
  const SPECS: FootnoteSpec[] = [
    { citationId: "cit-1" },
    { citationId: "cit-2" },
    { citationId: "cit-1" },
  ];

  async function makeDoc(inRevision: number[]): Promise<{
    store: CitationStore;
    ctx: ReturnType<typeof makeRefreshContext>;
    probeCalls: jest.Mock[];
  }> {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("cit-1", "cit-2"));
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();
    const ctx = makeRefreshContext(doc, SPECS);
    const notes = (
      ctx.context as unknown as {
        document: { body: { footnotes: { items: { body: { contentControls: object } }[] } } };
      }
    ).document.body.footnotes.items;
    const probeCalls = notes.map((note, i) => {
      const fn = jest.fn((states: string[]) => {
        expect(states).toEqual(["Added", "Deleted"]);
        return {
          load: jest.fn(),
          items: inRevision.includes(i + 1) ? [{ tag: "obiter-fn" }] : [],
        };
      });
      Object.assign(note.body.contentControls, { getByChangeTrackingStates: fn });
      return fn;
    });
    return { store, ctx, probeCalls };
  }

  it("skips footnote 2 and rebuilds footnotes 1 and 3", async () => {
    installOffice(1.5);
    const { store, ctx, probeCalls } = await makeDoc([2]);

    const result = await refreshAllCitations(ctx.context, store, noopHook);

    expect(probeCalls.every((fn) => fn.mock.calls.length === 1)).toBe(true);
    expect(result.revisionSkips).toEqual([2]);
    expect(result.failures).toEqual([]);
    // Footnote 2: no write, no deleted child.
    expect(ctx.parents[1].writes).toEqual([]);
    expect(ctx.children[1].every((child) => !child.removed)).toBe(true);
    // Footnotes 1 and 3 were rebuilt as before.
    expect(ctx.parents[0].writes.length).toBeGreaterThan(0);
    expect(ctx.parents[2].writes.length).toBeGreaterThan(0);
  });

  it("the probe adds no sync: same sync count with and without it", async () => {
    installOffice(1.5);
    const withProbe = await makeDoc([]);
    const syncSpy = jest.spyOn(withProbe.ctx.context, "sync");
    await refreshAllCitations(withProbe.ctx.context, withProbe.store, noopHook);
    const syncsWith = syncSpy.mock.calls.length;

    installOffice(1.4); // getByChangeTrackingStates is WordApi 1.5
    const without = await makeDoc([]);
    const syncSpy2 = jest.spyOn(without.ctx.context, "sync");
    await refreshAllCitations(without.ctx.context, without.store, noopHook);

    expect(without.probeCalls.every((fn) => fn.mock.calls.length === 0)).toBe(true);
    expect(syncSpy2.mock.calls.length).toBe(syncsWith);
  });

  it("an unchanged footnote in a revision is not reported (nothing would be written)", async () => {
    installOffice(1.5);
    const inRevision: number[] = [];
    const { store, ctx } = await makeDoc(inRevision);
    // First refresh, no revisions: every footnote is rendered.
    const first = await refreshAllCitations(ctx.context, store, noopHook);
    expect(first.revisionSkips).toBeUndefined();
    expect(first.updated).toBe(3);

    // Now all three sit in revisions, but their text is current.
    inRevision.push(1, 2, 3);
    const second = await refreshAllCitations(ctx.context, store, noopHook);
    expect(second.revisionSkips).toBeUndefined();
    expect(second.unchanged).toBe(3);
  });

  it("a host that rejects the tracked-state read refreshes as before", async () => {
    installOffice(1.5);
    const { store, ctx, probeCalls } = await makeDoc([2]);
    const realSync = ctx.context.sync.bind(ctx.context);
    let failed = false;
    jest.spyOn(ctx.context, "sync").mockImplementation(async () => {
      if (!failed && probeCalls[0].mock.calls.length > 0) {
        failed = true;
        throw new Error("ApiNotFound");
      }
      return realSync();
    });

    const result = await refreshAllCitations(ctx.context, store, noopHook);

    expect(failed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.revisionSkips).toBeUndefined();
    expect(result.updated).toBe(3);
  });

  it("readRevisionProbe ignores controls Obiter does not manage", () => {
    const hits = { items: [{ tag: "MNC" }] } as unknown as Word.ContentControlCollection;
    expect(readRevisionProbe(hits, (tag) => tag === "obiter-fn")).toBe(false);
    expect(readRevisionProbe(undefined, () => true)).toBe(false);
  });

  it("queueRevisionProbe yields nothing below WordApi 1.5 or without the method", () => {
    installOffice(1.4);
    const coll = {
      getByChangeTrackingStates: jest.fn(),
    } as unknown as Word.ContentControlCollection;
    expect(queueRevisionProbe(coll)).toBeUndefined();
    installOffice(1.5);
    expect(queueRevisionProbe({} as Word.ContentControlCollection)).toBeUndefined();
  });
});

// ─── 4. Pending revision count (WordApi 1.6, read-only) ──────────────────────

describe("COURT-108 — pending revisions in managed footnotes (WordApi 1.6)", () => {
  function revisionContext(counts: number[]): {
    context: Word.RequestContext;
    accept: jest.Mock;
    syncs: () => number;
  } {
    let syncs = 0;
    const accept = jest.fn();
    const parents = counts.map((n) => ({
      getRange: () => ({
        getTrackedChanges: () => ({
          load: jest.fn(),
          items: Array.from({ length: n }, () => ({ accept, reject: accept })),
        }),
      }),
    }));
    const context = {
      document: {
        contentControls: { getByTag: () => ({ load: jest.fn(), items: parents }) },
      },
      sync: jest.fn(async () => {
        syncs++;
      }),
    };
    return { context: context as unknown as Word.RequestContext, accept, syncs: () => syncs };
  }

  it("counts in two syncs regardless of footnote count, and never accepts or rejects", async () => {
    installOffice(1.6);
    const small = revisionContext([1, 0, 2]);
    await expect(countPendingRevisionsInManagedFootnotes(small.context, "obiter-fn")).resolves.toBe(
      3
    );
    expect(small.syncs()).toBe(2);
    expect(small.accept).not.toHaveBeenCalled();

    const large = revisionContext(Array.from({ length: 40 }, () => 1));
    await expect(countPendingRevisionsInManagedFootnotes(large.context, "obiter-fn")).resolves.toBe(
      40
    );
    expect(large.syncs()).toBe(2);
  });

  it("returns undefined below WordApi 1.6", async () => {
    installOffice(1.5);
    const { context, syncs } = revisionContext([1]);
    await expect(countPendingRevisionsInManagedFootnotes(context, "obiter-fn")).resolves.toBe(
      undefined
    );
    expect(syncs()).toBe(0);
  });
});
