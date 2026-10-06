/**
 * @jest-environment jsdom
 *
 * COURT-122 (OBI-206): pre-handover check and Obiter metadata review.
 *
 * Evidence: O-K2 (Obiter.* properties earlier releases wrote, including a
 * personal name), O-F9 (Obiter's markers), O-P1 / R08 §3.3–3.6 (custom
 * properties WordApi 1.3, comments and Track Changes mode 1.4, tracked
 * changes 1.6). DECISION-043 item 1.
 *
 * The document is the COURT-105 `obiter-managed` fixture: its custom
 * properties, controls, comment and pending revisions are read from the
 * synthetic OOXML and served through a fake Word context.
 *
 * 1. The review lists Obiter.* properties only (legacy keys marked) and
 *    counts the rest; controls, store part, comments and revisions are
 *    counted read-only.
 * 2. The snapshot read takes four syncs whatever the footnote count, and
 *    degrades per requirement set.
 * 3. Removal is explicit, per item, Obiter keys only, reversible, and a
 *    read-only document refuses it cleanly.
 * 4. The validation summary is the Validate view's own result.
 */

import {
  countManagedControls,
  isObiterPropertyKey,
  obiterPropertyRows,
  otherPropertyCount,
  readHandoverSnapshot,
  removeObiterProperty,
  restoreObiterProperty,
} from "../../src/word/handoverCheck";
import type { DocumentPropertyEntry } from "../../src/word/handoverCheck";
import { DocumentReadOnlyError } from "../../src/word/documentAccess";
import { runDocumentValidation } from "../../src/engine/documentValidation";
import { validateDocument } from "../../src/engine/validator";
import { OBITER_NAMESPACE } from "../../src/store/xmlSerializer";
import { BACKUP_NAMESPACE } from "../../src/store/backupSerializer";
import { makeNotAllowedError } from "../store/fakeWordHarness";
import { apiFootnotes, inventoryOf, loadFixture } from "../fixtures/ooxml/ooxmlInventory";
import type { ApiFootnote } from "../fixtures/ooxml/ooxmlInventory";

const FIXTURE = loadFixture("obiter-managed");
const INVENTORY = inventoryOf(FIXTURE);

/** The fixture's custom properties as Word reports them. */
function fixtureProperties(): DocumentPropertyEntry[] {
  return INVENTORY.customProperties.map((line) => {
    const [key, value] = line.split(" = ");
    return { key, value, type: "String" };
  });
}

function installOffice(max: number, mode?: string): void {
  (global as Record<string, unknown>).Office = {
    DocumentMode: { ReadOnly: "readOnly", ReadWrite: "readWrite" },
    context: {
      document: { mode: mode ?? "readWrite" },
      requirements: {
        isSetSupported: (set: string, version: string): boolean =>
          set === "WordApi" && parseFloat(version) <= max,
      },
    },
  };
}

afterEach(() => {
  delete (global as Record<string, unknown>).Office;
});

const known = (tag: string): boolean => tag === "cit-1" || tag === "cit-2";

// ─── 1. Pure review helpers ──────────────────────────────────────────────────

describe("COURT-122 — the property review lists Obiter properties only", () => {
  it("lists the fixture's Obiter.* keys in order, marks legacy keys, counts the rest", () => {
    const props = fixtureProperties();
    const rows = obiterPropertyRows(props);
    expect(rows.map((r) => r.key)).toEqual([
      "Obiter.Version",
      "Obiter.CitationStyle",
      "Obiter.CreatedDate",
      "Obiter.Author",
      "Obiter.Website",
    ]);
    // DECISION-043 item 1: Author and Website are no longer written.
    expect(rows.filter((r) => r.noLongerWritten).map((r) => r.key)).toEqual([
      "Obiter.Author",
      "Obiter.Website",
    ]);
    // COURT-102 writes these again when the document has citations.
    expect(rows.filter((r) => r.rewrittenOnOpen).map((r) => r.key)).toEqual([
      "Obiter.Version",
      "Obiter.CitationStyle",
      "Obiter.CreatedDate",
    ]);
    // ClientMatter belongs to another tool: never listed, only counted.
    expect(otherPropertyCount(props)).toBe(1);
  });

  it("shows string-typed values that come back as numbers or dates as text (toText)", () => {
    const rows = obiterPropertyRows([
      { key: "Obiter.Version", value: 1.17 },
      { key: "Obiter.CreatedDate", value: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    expect(rows.map((r) => r.value)).toEqual(["1.17", "2026-01-01T00:00:00.000Z"]);
  });

  it("only Obiter. keys are Obiter's", () => {
    expect(isObiterPropertyKey("Obiter.Author")).toBe(true);
    expect(isObiterPropertyKey("ClientMatter")).toBe(false);
    expect(isObiterPropertyKey("obiter.author")).toBe(false);
    expect(isObiterPropertyKey(42)).toBe(false);
  });

  it("counts managed footnotes, locked footnotes, citation and notice controls", () => {
    const controls = apiFootnotes(FIXTURE).flatMap((n) => n.controls);
    expect(countManagedControls(controls, known)).toEqual({
      footnotes: 4,
      locked: 0,
      citations: 4,
      notices: 0,
    });
    expect(
      countManagedControls(
        [
          { tag: "obiter-fn", title: "Obiter Footnote (locked)" },
          { tag: "obiter-addin-notice", title: "" },
          { tag: "VendorRef", title: "" },
          { tag: 7, title: undefined },
        ],
        known
      )
    ).toEqual({ footnotes: 1, locked: 1, citations: 0, notices: 1 });
  });
});

// ─── 2. Reading the document ─────────────────────────────────────────────────

interface FakeOptions {
  notes?: ApiFootnote[];
  commentsThrow?: boolean;
  propertiesThrow?: boolean;
}

function fakeContext(opts: FakeOptions = {}): {
  context: Word.RequestContext;
  syncs: () => number;
  calls: string[];
} {
  let syncs = 0;
  const calls: string[] = [];
  const notes = opts.notes ?? apiFootnotes(FIXTURE);
  const parts = (ns: string): unknown => ({
    load: jest.fn(),
    items: ns === OBITER_NAMESPACE ? [{}] : ns === BACKUP_NAMESPACE ? [] : [],
  });
  const doc = {
    changeTrackingMode: undefined as string | undefined,
    load: jest.fn(() => {
      doc.changeTrackingMode = "TrackAll"; // fixture settings: w:trackRevisions
    }),
    properties: {
      get customProperties(): unknown {
        if (opts.propertiesThrow) throw new Error("ApiNotFound");
        return { load: jest.fn(), items: fixtureProperties() };
      },
    },
    customXmlParts: { getByNamespace: (ns: string) => parts(ns) },
    body: {
      text: "Synthetic submissions fixture",
      load: jest.fn(),
      paragraphs: { load: jest.fn(), items: [{ style: "Heading 1" }, { style: "Normal" }] },
      contentControls: { load: jest.fn(), items: [] },
      footnotes: {
        load: jest.fn(),
        items: notes.map((n) => ({
          body: {
            text: n.text,
            load: jest.fn(),
            contentControls: { load: jest.fn(), items: n.controls },
          },
        })),
      },
      getComments: jest.fn(() => {
        calls.push("getComments");
        if (opts.commentsThrow) throw new Error("ApiNotFound");
        return { load: jest.fn(), items: Array.from({ length: INVENTORY.comments }) };
      }),
      getTrackedChanges: jest.fn(() => {
        calls.push("getTrackedChanges");
        return {
          load: jest.fn(),
          items: Array.from({
            length: INVENTORY.revisions.insertions + INVENTORY.revisions.deletions,
          }),
        };
      }),
    },
  };
  const context = {
    document: doc,
    sync: jest.fn(async () => {
      syncs++;
    }),
  } as unknown as Word.RequestContext;
  return { context, syncs: () => syncs, calls };
}

describe("COURT-122 — reading the handover snapshot", () => {
  it("reads the fixture: properties, store part, controls, comment, revisions, tracking mode", async () => {
    installOffice(1.6);
    const { context, syncs } = fakeContext();
    const snap = await readHandoverSnapshot(context, known);

    expect(syncs()).toBe(4);
    expect(snap.footnoteTexts).toHaveLength(7);
    expect(snap.headingLevels).toEqual([1]);
    expect(snap.properties?.map((p) => p.key)).toContain("Obiter.Author");
    expect(snap.storeParts).toBe(1);
    expect(snap.backupParts).toBe(0);
    expect(snap.controls).toEqual({ footnotes: 4, locked: 0, citations: 4, notices: 0 });
    expect(snap.comments).toBe(1);
    expect(snap.pendingRevisions).toBe(2);
    expect(snap.trackingMode).toBe("TrackAll");
  });

  it("takes the same four syncs for 7 or 70 footnotes (perf rule: no sync per footnote)", async () => {
    installOffice(1.6);
    const many = Array.from({ length: 10 }, () => apiFootnotes(FIXTURE)).flat();
    const { context, syncs } = fakeContext({ notes: many });
    const snap = await readHandoverSnapshot(context, known);
    expect(snap.footnoteTexts).toHaveLength(70);
    expect(syncs()).toBe(4);
  });

  it("WordApi 1.3: no comments, revisions or tracking reads; three syncs", async () => {
    installOffice(1.3);
    const { context, syncs, calls } = fakeContext();
    const snap = await readHandoverSnapshot(context, known);
    expect(calls).toEqual([]);
    expect(snap.comments).toBeUndefined();
    expect(snap.pendingRevisions).toBeUndefined();
    expect(snap.trackingMode).toBe("unknown");
    expect(snap.properties).toBeDefined();
    expect(syncs()).toBe(3);
  });

  it("WordApi 1.5: comments and tracking mode, no tracked-change count (1.6)", async () => {
    installOffice(1.5);
    const { context, calls } = fakeContext();
    const snap = await readHandoverSnapshot(context, known);
    expect(calls).toEqual(["getComments"]);
    expect(snap.comments).toBe(1);
    expect(snap.pendingRevisions).toBeUndefined();
  });

  it("a host that rejects a read leaves that field unavailable, not the whole check", async () => {
    installOffice(1.6);
    const a = await readHandoverSnapshot(fakeContext({ commentsThrow: true }).context, known);
    expect(a.comments).toBeUndefined();
    expect(a.properties).toBeDefined();

    const b = await readHandoverSnapshot(fakeContext({ propertiesThrow: true }).context, known);
    expect(b.properties).toBeUndefined();
    expect(b.comments).toBe(1);
    expect(b.controls.footnotes).toBe(4);
  });
});

// ─── 3. Explicit, reversible removal ─────────────────────────────────────────

function propertyContext(
  present: Record<string, unknown>,
  failWith?: Error
): {
  context: Word.RequestContext;
  deleted: string[];
  added: [string, unknown][];
} {
  const deleted: string[] = [];
  const added: [string, unknown][] = [];
  const customProperties = {
    getItemOrNullObject: (key: string) => ({
      isNullObject: !(key in present),
      value: present[key],
      load: jest.fn(),
      delete: () => deleted.push(key),
    }),
    add: (key: string, value: unknown) => added.push([key, value]),
  };
  const context = {
    document: { properties: { customProperties } },
    sync: jest.fn(async () => {
      if (failWith) throw failWith;
    }),
  } as unknown as Word.RequestContext;
  return { context, deleted, added };
}

describe("COURT-122 — removing an Obiter property is explicit and reversible", () => {
  it("removes one Obiter property and returns its value; undo puts the same value back", async () => {
    installOffice(1.5);
    const { context, deleted, added } = propertyContext({
      "Obiter.Author": "[legacy placeholder]",
    });
    const removed = await removeObiterProperty(context, "Obiter.Author");
    expect(removed).toEqual({ key: "Obiter.Author", value: "[legacy placeholder]" });
    expect(deleted).toEqual(["Obiter.Author"]);

    await restoreObiterProperty(context, removed!);
    expect(added).toEqual([["Obiter.Author", "[legacy placeholder]"]]);
  });

  it("never touches a property another tool wrote", async () => {
    installOffice(1.5);
    const { context, deleted, added } = propertyContext({ ClientMatter: "EX-0001" });
    await expect(removeObiterProperty(context, "ClientMatter")).rejects.toThrow(
      /only removes its own properties/
    );
    await expect(
      restoreObiterProperty(context, { key: "ClientMatter", value: "x" })
    ).rejects.toThrow(/only restores its own properties/);
    expect(deleted).toEqual([]);
    expect(added).toEqual([]);
  });

  it("an absent property is reported as already removed, nothing deleted", async () => {
    installOffice(1.5);
    const { context, deleted } = propertyContext({});
    await expect(removeObiterProperty(context, "Obiter.Website")).resolves.toBeUndefined();
    expect(deleted).toEqual([]);
  });

  it("a read-only document refuses the removal with the read-only message", async () => {
    installOffice(1.5, "readOnly");
    const { context, deleted } = propertyContext({ "Obiter.Author": "x" });
    await expect(removeObiterProperty(context, "Obiter.Author")).rejects.toBeInstanceOf(
      DocumentReadOnlyError
    );
    expect(deleted).toEqual([]);

    installOffice(1.5);
    const refused = propertyContext({ "Obiter.Author": "x" }, makeNotAllowedError());
    await expect(removeObiterProperty(refused.context, "Obiter.Author")).rejects.toBeInstanceOf(
      DocumentReadOnlyError
    );
  });
});

// ─── 4. Validation summary ───────────────────────────────────────────────────

describe("COURT-122 — the validation summary is the Validate view's result", () => {
  it("adds nothing to validateDocument for an academic AGLC4 document with clean headings", () => {
    const footnoteTexts = apiFootnotes(FIXTURE).map((n) => n.text);
    const citations: never[] = [];
    const result = runDocumentValidation({
      footnoteTexts,
      bodyText: "Synthetic submissions fixture",
      headingLevels: [1],
      citations,
      standardId: "aglc4",
      writingMode: "academic",
    });
    const direct = validateDocument(footnoteTexts, citations, "Synthetic submissions fixture", {
      standardId: "aglc4",
      writingMode: "academic",
      courtJurisdiction: undefined,
      parallelCitationMode: "off",
      ibidSuppressionMode: "off",
      unreportedGateMode: "off",
    });
    expect(result.errors).toEqual(direct.errors);
    expect(result.warnings).toEqual(direct.warnings);
  });
});
