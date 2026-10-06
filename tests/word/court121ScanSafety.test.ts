/**
 * @jest-environment jsdom
 *
 * COURT-121 (OBI-203): Scan & Repair safety.
 *
 * Evidence: O-K10 (managed adoption deleted the original note text without a
 * snapshot), O-C9 (case-name italics split across runs; up to 304 NBSPs in
 * one FCA judgment body).
 *
 * 1. Managed adoption saves the original note texts as a footnote-history
 *    generation BEFORE any library or document change; if the save fails the
 *    managed items are not applied at all, while other items still apply.
 *    The default save writes to the backup part, where Recovery lists it.
 * 2. Candidate text is normalised (NBSP family, zero-width characters, soft
 *    hyphens, Word control marks) before parsing; Word reports split runs as
 *    one string, so a run-split case name parses like any other.
 * 3. Quotations are offered but not pre-selected.
 * 4. The search text is encoded for Word's search syntax (NBSP → ^s, ^ → ^^).
 */

import { applyScanPlan, toWordSearchText } from "../../src/word/documentScanner";
import type { ScanRepairStore } from "../../src/word/documentScanner";
import { buildScanPlan, normaliseCandidateText } from "../../src/word/scanRepair";
import type { ScanItem } from "../../src/word/scanRepair";
import type { Citation } from "../../src/types/citation";
import { listFootnoteGenerations } from "../../src/store/backupStore";
import { FakeDocState, makeFakeContext } from "../store/fakeWordHarness";

// ─── Minimal fakes ───────────────────────────────────────────────────────────

class FakeStore implements ScanRepairStore {
  citations = new Map<string, Citation>();
  events: string[];
  constructor(events: string[]) {
    this.events = events;
  }
  getById(id: string): Citation | undefined {
    return this.citations.get(id);
  }
  async add(citation: Citation): Promise<void> {
    this.events.push(`add:${citation.id}`);
    this.citations.set(citation.id, citation);
  }
  getCcModel(): "flat" | "parent-child" | undefined {
    return "parent-child";
  }
  async setCcModel(): Promise<void> {}
}

interface NoteFake {
  text: string;
  searches: string[];
  deleted: boolean;
}

/** One footnote body whose search matches the encoded text and records deletes. */
function installNotes(notes: NoteFake[], events: string[]): void {
  const context = {
    document: {
      body: {
        footnotes: {
          load: jest.fn(),
          items: notes.map((note) => ({
            body: {
              search: (text: string) => {
                note.searches.push(text);
                return {
                  load: jest.fn(),
                  items: [
                    {
                      delete: () => {
                        events.push("delete");
                        note.deleted = true;
                      },
                      insertContentControl: () => {
                        events.push("wrap");
                        return {};
                      },
                    },
                  ],
                };
              },
              paragraphs: {
                load: jest.fn(),
                items: [
                  {
                    getRange: () => ({
                      insertContentControl: () => ({
                        getRange: () => ({
                          insertContentControl: () => ({ insertText: jest.fn() }),
                        }),
                      }),
                    }),
                  },
                ],
              },
            },
          })),
        },
        endnotes: { load: jest.fn(), items: [] },
      },
    },
    sync: async () => undefined,
  };
  (global as Record<string, unknown>).Word = {
    run: async <T>(cb: (ctx: unknown) => Promise<T>): Promise<T> => cb(context),
  };
}

function citation(id: string): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType: "case.reported",
    data: { party1: "A", party2: "B" },
    tags: [],
    createdAt: "2026-10-07T00:00:00.000Z",
    modifiedAt: "2026-10-07T00:00:00.000Z",
  };
}

function managedItem(noteIndex: number, rawText: string): ScanItem {
  return {
    key: `adopt-footnote-${noteIndex}`,
    kind: "adopt",
    location: "footnote",
    noteIndex,
    citationId: `id-${noteIndex}`,
    rawText,
    text: rawText.replace(/\.$/, ""),
    proposedCitation: citation(`id-${noteIndex}`),
    selectable: true,
    defaultSelected: true,
    wrap: "managed",
  };
}

function flatItem(noteIndex: number, rawText: string): ScanItem {
  return {
    ...managedItem(noteIndex, rawText),
    key: `verbatim-${noteIndex}`,
    kind: "verbatim",
    wrap: "flat",
  };
}

// ─── 1. Snapshot before adoption ─────────────────────────────────────────────

describe("COURT-121 — managed adoption snapshots the original notes first", () => {
  it("saves every managed note's text before any library or document change", async () => {
    const events: string[] = [];
    const notes: NoteFake[] = [
      { text: "A v B (2000) 1 CLR 1.", searches: [], deleted: false },
      { text: "C v D (2001) 2 CLR 2.", searches: [], deleted: false },
    ];
    installNotes(notes, events);
    const store = new FakeStore(events);
    const snapshotNotes = jest.fn(async () => {
      events.push("snapshot");
    });

    const outcome = await applyScanPlan(
      store,
      [managedItem(1, notes[0].text), managedItem(2, notes[1].text)],
      { snapshotNotes }
    );

    expect(snapshotNotes).toHaveBeenCalledWith([
      { footnoteNumber: 1, existingText: "A v B (2000) 1 CLR 1." },
      { footnoteNumber: 2, existingText: "C v D (2001) 2 CLR 2." },
    ]);
    expect(events[0]).toBe("snapshot");
    expect(events.indexOf("snapshot")).toBeLessThan(events.indexOf("delete"));
    expect(outcome.adoptedManaged).toBe(2);
    expect(outcome.failures).toEqual([]);
  });

  it("aborts the managed adoptions when the snapshot fails; other items still apply", async () => {
    const events: string[] = [];
    const notes: NoteFake[] = [
      { text: "A v B (2000) 1 CLR 1.", searches: [], deleted: false },
      { text: "Some prose note.", searches: [], deleted: false },
    ];
    installNotes(notes, events);
    const store = new FakeStore(events);

    const outcome = await applyScanPlan(
      store,
      [managedItem(1, notes[0].text), flatItem(2, notes[1].text)],
      {
        snapshotNotes: async () => {
          throw new Error("NotAllowed");
        },
      }
    );

    // Managed item: no library entry, no search, no delete.
    expect(store.getById("id-1")).toBeUndefined();
    expect(notes[0].searches).toEqual([]);
    expect(notes[0].deleted).toBe(false);
    expect(outcome.adoptedManaged).toBe(0);
    expect(outcome.failures).toEqual([
      {
        key: "adopt-footnote-1",
        reason: expect.stringContaining("could not be saved to Recovery first"),
      },
    ]);
    // The flat (in-place, non-destructive) item still applied.
    expect(store.getById("id-2")).toBeDefined();
    expect(events).toContain("wrap");
  });

  it("items without a managed adoption never take a snapshot", async () => {
    const events: string[] = [];
    installNotes([{ text: "Prose.", searches: [], deleted: false }], events);
    const snapshotNotes = jest.fn(async () => undefined);
    await applyScanPlan(new FakeStore(events), [flatItem(1, "Prose.")], { snapshotNotes });
    expect(snapshotNotes).not.toHaveBeenCalled();
  });

  it("the default snapshot writes a footnote-history generation that Recovery lists", async () => {
    const doc = new FakeDocState();
    const handle = makeFakeContext(doc);
    const context = handle.context as unknown as { document: Record<string, unknown> };
    // No footnotes: the adoption itself reports "not found", but the
    // snapshot must already be in the backup part.
    context.document.body = {
      footnotes: { load: jest.fn(), items: [] },
      endnotes: { load: jest.fn(), items: [] },
    };
    (global as Record<string, unknown>).Word = {
      run: async <T>(cb: (ctx: unknown) => Promise<T>): Promise<T> => cb(context),
    };

    await applyScanPlan(new FakeStore([]), [managedItem(3, "E v F (2002) 3 CLR 3.")]);

    const generations = await listFootnoteGenerations();
    expect(generations).toHaveLength(1);
    expect(generations[0].footnotes).toEqual([
      expect.objectContaining({ n: 3, text: "E v F (2002) 3 CLR 3." }),
    ]);
  });
});

// ─── 2–3. Normalisation and pre-selection ────────────────────────────────────

describe("COURT-121 — candidate text normalisation (O-C9)", () => {
  it("normalises NBSP, narrow NBSP, zero-width characters, soft hyphens and control marks", () => {
    expect(normaliseCandidateText("Obeid v The Queen​ [2017]­ HCA 44.")).toBe(
      "Obeid v The Queen [2017] HCA 44."
    );
    expect(normaliseCandidateText("\u0002 Mabo v Queensland\u0013")).toBe("Mabo v Queensland");
    expect(normaliseCandidateText("non\u001ebreaking")).toBe("non-breaking");
  });

  it("an NBSP-laden, run-split note is adopted like a clean one", () => {
    const clean = buildScanPlan(
      {
        bodyControls: [],
        notes: [
          {
            noteType: "footnote",
            index: 1,
            text: "Obeid v The Queen [2017] HCA 44.",
            controls: [],
          },
        ],
      },
      [],
      { makeId: () => "x", now: () => "2026-10-07T00:00:00.000Z" }
    );
    // Word reports the italic run split ("Obeid v The " + "Queen") as one string.
    const messy = buildScanPlan(
      {
        bodyControls: [],
        notes: [
          {
            noteType: "footnote",
            index: 1,
            text: "Obeid v The Queen​ [2017] HCA 44.",
            controls: [],
          },
        ],
      },
      [],
      { makeId: () => "x", now: () => "2026-10-07T00:00:00.000Z" }
    );
    expect(messy.items[0].kind).toBe("adopt");
    expect(messy.items[0].proposedCitation).toEqual(clean.items[0].proposedCitation);
    expect(messy.items[0].text).toBe(clean.items[0].text);
  });

  it("quotations and prose-only notes are not pre-selected", () => {
    const plan = buildScanPlan(
      {
        bodyControls: [],
        notes: [
          {
            noteType: "footnote",
            index: 1,
            text: "Obeid v The Queen [2017] HCA 44.",
            controls: [],
          },
          { noteType: "footnote", index: 2, text: "This is a prose note only.", controls: [] },
          {
            noteType: "footnote",
            index: 3,
            text: "‘A quoted passage’, Obeid v The Queen [2017] HCA 44.",
            controls: [],
          },
          // Parses as a case (so it is an adoption), but holds quotation marks.
          {
            noteType: "footnote",
            index: 4,
            text: "Ruddock v “Vadarlis” (2001) 110 FCR 491.",
            controls: [],
          },
        ],
      },
      [],
      { makeId: () => "x" }
    );
    const byNote = new Map(plan.items.map((i) => [i.noteIndex, i]));
    expect(byNote.get(1)?.defaultSelected).toBe(true);
    expect(byNote.get(2)?.defaultSelected).toBe(false);
    expect(byNote.get(3)?.defaultSelected).toBe(false);
    expect(byNote.get(4)?.kind).toBe("adopt");
    expect(byNote.get(4)?.defaultSelected).toBe(false);
  });

  it("a straight opening single quote is a quotation; an apostrophe is not (AGLC4 r 1.5.1)", () => {
    const plan = buildScanPlan(
      {
        bodyControls: [],
        notes: [
          {
            noteType: "footnote",
            index: 1,
            text: "Burger King Corporation v Hungry Jack's Pty Ltd (2001) 69 NSWLR 558.",
            controls: [],
          },
          {
            noteType: "footnote",
            index: 2,
            text: "'A quoted passage', Obeid v The Queen [2017] HCA 44.",
            controls: [],
          },
        ],
      },
      [],
      { makeId: () => "x" }
    );
    const byNote = new Map(plan.items.map((i) => [i.noteIndex, i]));
    expect(byNote.get(1)?.kind).toBe("adopt");
    expect(byNote.get(1)?.defaultSelected).toBe(true);
    expect(byNote.get(2)?.defaultSelected).toBe(false);
  });
});

// ─── 4. Search encoding ──────────────────────────────────────────────────────

describe("COURT-121 — Word search encoding", () => {
  it("encodes NBSP, soft hyphen and a literal caret", () => {
    expect(toWordSearchText("Obeid v The Queen")).toBe("Obeid^sv The Queen");
    expect(toWordSearchText("co­operate")).toBe("co^-operate");
    expect(toWordSearchText("x^2")).toBe("x^^2");
    expect(toWordSearchText("A v B (2000) 1 CLR 1.")).toBe("A v B (2000) 1 CLR 1.");
  });

  it("a managed adoption searches with the encoded text", async () => {
    const events: string[] = [];
    const note: NoteFake = { text: "A v B (2000) 1 CLR 1.", searches: [], deleted: false };
    installNotes([note], events);
    await applyScanPlan(new FakeStore(events), [managedItem(1, note.text)], {
      snapshotNotes: async () => undefined,
    });
    expect(note.searches).toEqual(["A^sv^sB (2000) 1 CLR 1."]);
  });
});
