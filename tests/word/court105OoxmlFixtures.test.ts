/**
 * @jest-environment jsdom
 *
 * COURT-105 (OBI-402, OBI-201, OBI-202): synthetic OOXML regression fixtures
 * and golden inventories.
 *
 * Evidence: O-K15 (no OOXML fixtures before COURT-105); corpus structures
 * O-C3 (REF _Ref \r \h fields and _Ref bookmarks inside HCA footnotes),
 * O-C6 (NSW footnotes: record references and prose), O-C7 (flattened
 * _Ref / _Toc hyperlinks), O-C9 (split italic runs, NBSPs), O-F2 (FCA
 * template: docVars, DOCPROPERTY, MACROBUTTON, style-linked ParaNumbering,
 * a control bound to vendor custom XML), O-F6 (ACT house-template families),
 * O-F9 (Obiter's own markers). Every fixture is synthetic: no court bytes,
 * no court text, no personal names (tests/fixtures/ooxml/*.xml).
 *
 * 1. Each fixture parses at package level (no Word) to its golden inventory.
 * 2. The inventory and `canonicalPart` ignore rsids and timestamps, and do
 *    see real changes.
 * 3. The refresher runs against the managed fixture: it rebuilds only the
 *    plain managed footnote, skips the foreign-content and tracked-revision
 *    footnotes (COURT-108, COURT-109), and the package is unchanged outside
 *    the rebuilt managed range.
 * 4. Scan & Repair runs against the fixtures: split-run and NBSP citations
 *    are offered (COURT-121), foreign fields are preserved and not adopted
 *    (COURT-109), prose and record references are not offered.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  FIXTURE_FILES,
  apiFootnotes,
  applyManagedRebuild,
  canonicalPart,
  compareInventories,
  inventoryOf,
  loadFixture,
  outsideManagedRanges,
  partXml,
} from "../fixtures/ooxml/ooxmlInventory";
import type { ApiFootnote, FixtureId, OoxmlInventory } from "../fixtures/ooxml/ooxmlInventory";
import { refreshAllCitations } from "../../src/word/citationRefresher";
import { captureDocumentSnapshot } from "../../src/word/documentScanner";
import { buildScanPlan } from "../../src/word/scanRepair";
import { CitationStore } from "../../src/store/citationStore";
import { deserializeStore, OBITER_NAMESPACE } from "../../src/store/xmlSerializer";
import { FakeDocState, installFakeWord } from "../store/fakeWordHarness";
import { htmlToText, makeRefreshContext } from "../store/fakeFootnoteHarness";
import type { FakeFootnoteContext, FootnoteSpec } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;
const FIXTURE_IDS = Object.keys(FIXTURE_FILES) as FixtureId[];

/**
 * The golden inventory of a fixture. With UPDATE_OOXML_GOLDEN=1 the file is
 * first rewritten from the current fixture (review the diff before committing).
 */
function golden(id: FixtureId): OoxmlInventory {
  const file = join(__dirname, "../fixtures/ooxml/golden", `${id}.json`);
  if (process.env.UPDATE_OOXML_GOLDEN === "1") {
    writeFileSync(file, `${JSON.stringify(inventoryOf(loadFixture(id)), null, 2)}\n`);
  }
  return JSON.parse(readFileSync(file, "utf8")) as OoxmlInventory;
}

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
});

// ─── 1. Golden inventories ───────────────────────────────────────────────────

describe("COURT-105 — each synthetic fixture parses to its golden inventory", () => {
  it.each(FIXTURE_IDS)("%s matches its golden inventory", (id) => {
    expect(inventoryOf(loadFixture(id))).toEqual(golden(id));
  });

  it("hca-footnotes: REF \\r \\h fields in footnotes target _Ref bookmarks in the body (O-C3)", () => {
    const inv = inventoryOf(loadFixture("hca-footnotes"));
    expect(inv.fields.footnotes).toEqual(["REF _Ref100001 \\r \\h", "REF _Ref100002 \\r \\h"]);
    expect(inv.bookmarks.body).toEqual(expect.arrayContaining(["_Ref100001", "_Ref100002"]));
    expect(inv.fields.body).toEqual(['TOC \\o "1-3" \\h \\z \\u']);
    // Style-linked numbering, never direct numPr (R03 federal §3, OBI-201).
    expect(inv.styles).toContain("ParaList (ParaList) numId=1");
    expect(inv.directNumbering).toBe(0);
    // Split italic case names and NBSPs (O-C9); a tracked insertion,
    // deletion and comment for COURT-108 / COURT-122.
    expect(inv.footnotes[0]).toMatchObject({ nbsp: 2, splitItalics: 1 });
    expect(inv.revisions).toEqual({ insertions: 1, deletions: 1 });
    expect(inv.comments).toBe(1);
    // Deleted text is not visible text.
    expect(inv.footnotes[3].text).toBe("The parties did not press this ground on appeal.");
  });

  it("fca-template: docVars, DOCPROPERTY, MACROBUTTON and a control bound to vendor XML (O-F2)", () => {
    const inv = inventoryOf(loadFixture("fca-template"));
    expect(inv.footnotes).toEqual([]);
    expect(inv.docVars).toHaveLength(3);
    expect(inv.fields.body.map((f) => f.split(" ")[0])).toEqual([
      "DOCPROPERTY",
      "MACROBUTTON",
      "ADDIN",
    ]);
    expect(inv.controls).toEqual([
      expect.objectContaining({
        tag: "MNC",
        binding: "/ns0:Judgment[1]/ns0:MNC[1] @ {11111111-2222-3333-4444-555555555555}",
      }),
    ]);
    expect(inv.customXml).toEqual(["urn:example:synthetic-template-vendor"]);
    expect(inv.styles).toEqual(
      expect.arrayContaining([
        "ParaNumbering (ParaNumbering) numId=1",
        "Orders (Orders) numId=2",
        "quotation2 (Quotation 2)",
      ])
    );
  });

  it("nsw-export: no live fields, dangling _Ref / _Toc links, record and prose notes (O-C6, O-C7)", () => {
    const inv = inventoryOf(loadFixture("nsw-export"));
    expect(inv.fields).toEqual({ body: [], footnotes: [] });
    expect(inv.danglingAnchors).toEqual(["_Toc300001", "_Ref300001", "_Ref300002"]);
    expect(inv.footnotes.map((f) => f.text)).toEqual([
      "Example Pty Ltd v Sample Council (2001) 1 CLR 1; [2001] HCA 1 at [20].",
      "T 12.5; Exhibit A at 3.",
      "The witness was not cross-examined on this point.",
      "That approach was not followed in Fictional Holdings Ltd v Placeholder [2002] NSWCA 2 at [8], for the reasons given there.",
    ]);
  });

  it("act-house-template: coversheet controls, house styles, third-party docVars, no footnotes (O-F6)", () => {
    const inv = inventoryOf(loadFixture("act-house-template"));
    expect(inv.footnotes).toEqual([]);
    expect(inv.controls.map((c) => c.alias)).toEqual(["Medium Neutral Citation", "Before:"]);
    expect(inv.fields.body).toEqual(["PAGE"]);
    expect(inv.customXml).toEqual([
      "http://schemas.openxmlformats.org/officeDocument/2006/bibliography",
    ]);
  });

  it("obiter-managed: the store part is the real Obiter format and reads back (O-F9)", () => {
    const inv = inventoryOf(loadFixture("obiter-managed"));
    expect(inv.customXml).toEqual([OBITER_NAMESPACE]);
    const store = deserializeStore(partXml(loadFixture("obiter-managed"), "/customXml/item1.xml"));
    expect(store.citations.map((c) => c.id)).toEqual(["cit-1", "cit-2"]);
    expect(inv.footnotes.filter((f) => f.managed).map((f) => f.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("fixtures are synthetic: no creator or last-modified-by, revision authors are a role", () => {
    for (const id of FIXTURE_IDS) {
      const xml = loadFixture(id);
      expect(xml).not.toMatch(/<dc:creator>|<cp:lastModifiedBy>/);
      const authors = Array.from(xml.matchAll(/w:author="([^"]*)"/g)).map((m) => m[1]);
      expect(authors.every((a) => a === "Reviewer")).toBe(true);
    }
  });
});

// ─── 2. Compare helper ───────────────────────────────────────────────────────

describe("COURT-105 — inventory comparison ignores rsids and timestamps", () => {
  const xml = loadFixture("hca-footnotes");

  it("a save that only changes rsids, revision dates and core dates compares equal", () => {
    const resaved = xml
      .replace(/w:rsidR="00B20001"/g, 'w:rsidR="00FFFFFF"')
      .replace(/<w:rsid w:val="00B20001"\/>/, '<w:rsid w:val="00FFFFFF"/>')
      .replace(/w:date="2026-01-02T00:00:00Z"/g, 'w:date="2026-09-30T12:00:00Z"')
      .replace("<cp:revision>3</cp:revision>", "<cp:revision>9</cp:revision>")
      .replace(
        /2026-01-02T00:00:00Z<\/dcterms:modified>/,
        "2026-09-30T12:00:00Z</dcterms:modified>"
      );
    expect(resaved).not.toBe(xml);
    expect(compareInventories(inventoryOf(xml), inventoryOf(resaved))).toEqual([]);
    for (const part of ["/word/footnotes.xml", "/word/settings.xml", "/docProps/core.xml"]) {
      expect(canonicalPart(partXml(resaved, part))).toBe(canonicalPart(partXml(xml, part)));
    }
  });

  it("a changed field instruction or a dropped bookmark is reported", () => {
    const changed = xml
      .replace("REF _Ref100002 \\r \\h", "REF _Ref100002 \\h")
      .replace('<w:bookmarkStart w:id="3" w:name="_Ref100002"/>', "")
      .replace('<w:bookmarkEnd w:id="3"/>', "");
    const diffs = compareInventories(inventoryOf(xml), inventoryOf(changed));
    expect(diffs.map((d) => d.split(":")[0])).toEqual(["fields", "bookmarks"]);
  });
});

// ─── 3. Refresher against the managed fixture ────────────────────────────────

/** Builds the refresher harness from the managed footnotes of a fixture. */
async function refreshHarness(notes: ApiFootnote[]): Promise<{
  store: CitationStore;
  ctx: FakeFootnoteContext;
  fieldWrites: jest.Mock;
}> {
  const managed = notes.filter((n) => n.controls.some((c) => c.tag === "obiter-fn"));
  const doc = new FakeDocState();
  doc.addPart(partXml(loadFixture("obiter-managed"), "/customXml/item1.xml"));
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();

  const specs: FootnoteSpec[] = managed.map((note) => {
    const [first, ...rest] = note.controls.filter((c) => c.tag !== "obiter-fn");
    return {
      citationId: first.tag,
      text: note.text,
      additional: rest.map((c) => ({ citationId: c.tag })),
    };
  });
  const ctx = makeRefreshContext(doc, specs);
  const fieldWrites = jest.fn();
  const items = (
    ctx.context as unknown as {
      document: { body: { footnotes: { items: { body: { contentControls: object } }[] } } };
    }
  ).document.body.footnotes.items;

  managed.forEach((note, i) => {
    const nested = note.controls.filter((c) => c.tag !== "obiter-fn");
    nested.forEach((c, j) => {
      ctx.children[i][j].title = c.title;
    });
    Object.assign(ctx.parents[i], {
      fields: {
        load: jest.fn(),
        items: note.fieldCodes.map((code) => ({
          code,
          updateResult: fieldWrites,
          delete: fieldWrites,
        })),
      },
      getRange: jest.fn(() => ({ getBookmarks: jest.fn(() => ({ value: note.bookmarks })) })),
    });
    // COURT-108: getByChangeTrackingStates reports the managed controls that
    // sit inside a pending revision in the fixture.
    Object.assign(items[i].body.contentControls, {
      getByChangeTrackingStates: jest.fn(() => ({
        load: jest.fn(),
        items: note.controls.filter((c) => c.inRevision).map((c) => ({ tag: c.tag })),
      })),
    });
  });
  return { store, ctx, fieldWrites };
}

describe("COURT-105 — the refresher against the managed fixture", () => {
  it("rebuilds fn 1, skips fn 2 and fn 4 (foreign content) and fn 3 (pending revision)", async () => {
    installOffice(1.5);
    const xml = loadFixture("obiter-managed");
    const { store, ctx, fieldWrites } = await refreshHarness(apiFootnotes(xml));

    const result = await refreshAllCitations(ctx.context, store, noopHook);

    expect(result.failures).toEqual([]);
    expect(result.userEdits.map((e) => [e.footnoteNumber, e.reason])).toEqual([
      [2, "foreign-content"],
      [4, "foreign-content"],
    ]);
    expect(result.revisionSkips).toEqual([3]);
    expect(ctx.parents.map((p) => p.writes.length > 0)).toEqual([true, false, false, false]);
    expect(fieldWrites).not.toHaveBeenCalled();
    expect(ctx.children[3].every((c) => !c.removed)).toBe(true);

    // Apply the rebuild to the package: nothing outside fn 1's managed
    // control changes, and the inventory differs only in fn 1's text.
    const segments = ctx.parents[0].writes.map((w) => ({
      text: w.kind === "html" ? htmlToText(w.content) : w.content,
      ...(w.child ? { tag: w.child.tag, alias: w.child.title } : {}),
    }));
    const after = applyManagedRebuild(xml, "1", segments);
    expect(outsideManagedRanges(after, ["1"])).toBe(outsideManagedRanges(xml, ["1"]));
    const diffs = compareInventories(inventoryOf(xml), inventoryOf(after));
    expect(diffs.map((d) => d.split(":")[0])).toEqual(["footnotes"]);
    const before = inventoryOf(xml).footnotes;
    const rebuilt = inventoryOf(after).footnotes;
    expect(rebuilt.slice(1)).toEqual(before.slice(1));
    expect(rebuilt[0].text).toBe(ctx.parents[0].text.trim());
  });

  it("fn 1 renders the AGLC4 r 2.2.1 report form with its r 1.4.1 short title (academic, unchanged)", async () => {
    installOffice(1.5);
    const { store, ctx } = await refreshHarness(apiFootnotes(loadFixture("obiter-managed")));
    await refreshAllCitations(ctx.context, store, noopHook);
    expect(ctx.parents[0].text).toBe(
      "Example Pty Ltd v Sample Council (2001) 1 CLR 1 (\u2018Example Pty Ltd\u2019)."
    );
  });
});

// ─── 4. Scan & Repair against the fixtures ───────────────────────────────────

/** A scan context over a fixture's footnotes, as the Word API reports them. */
function scanContext(xml: string): { context: Word.RequestContext; syncs: () => number } {
  let syncs = 0;
  const inv = inventoryOf(xml);
  const note = (n: ApiFootnote): unknown => ({
    body: {
      text: n.text,
      load: jest.fn(),
      contentControls: {
        load: jest.fn(),
        items: n.controls.map((c) => ({ tag: c.tag, title: c.title, text: "" })),
      },
      fields: { load: jest.fn(), items: n.fieldCodes.map((code) => ({ code })) },
      getRange: () => ({ getBookmarks: () => ({ value: n.bookmarks }) }),
    },
  });
  const context = {
    document: {
      body: {
        contentControls: { items: [], load: jest.fn() },
        fields: { load: jest.fn(), items: inv.fields.body.map((code) => ({ code: ` ${code} ` })) },
        footnotes: { load: jest.fn(), items: apiFootnotes(xml).map(note) },
        endnotes: { load: jest.fn(), items: [] },
      },
    },
    sync: async () => {
      syncs++;
    },
  } as unknown as Word.RequestContext;
  return { context, syncs: () => syncs };
}

describe("COURT-105 — Scan & Repair against the fixtures", () => {
  async function plan(id: FixtureId): Promise<ReturnType<typeof buildScanPlan>> {
    installOffice(1.5);
    const { context, syncs } = scanContext(loadFixture(id));
    const snapshot = await captureDocumentSnapshot(context);
    expect(syncs()).toBe(2); // O(1): the same two syncs whatever the note count
    return buildScanPlan(snapshot, [], { makeId: () => "new-id" });
  }

  /** [note, kind, pre-selected] for each offered item. */
  function offered(p: ReturnType<typeof buildScanPlan>): [number | undefined, string, boolean][] {
    return p.items.map((i) => [i.noteIndex, i.kind, i.defaultSelected]);
  }

  it("hca-footnotes: adopts the split-run and NBSP citations, preserves the REF notes", async () => {
    const p = await plan("hca-footnotes");
    expect(offered(p)).toEqual([
      [1, "adopt", true],
      // Prose-only note: offered verbatim, never pre-selected (COURT-121).
      [4, "verbatim", false],
      [5, "adopt", true],
    ]);
    // Split italic runs and NBSPs are joined and normalised (O-C9, COURT-121).
    expect(p.items[0].text).toBe("Example Pty Ltd v Sample Council (2001) 1 CLR 1 at 5 [12]");
    // Notes 2 and 3 hold REF fields: preserved, not adopted (COURT-109).
    expect(p.preserved?.map((e) => [e.location, e.noteIndex ?? 0, e.fieldTypes])).toEqual([
      ["body", 0, { TOC: 1 }],
      ["footnote", 2, { REF: 1 }],
      ["footnote", 3, { REF: 1 }],
    ]);
  });

  it("nsw-export: nothing is pre-selected; record and prose notes stay verbatim", async () => {
    const p = await plan("nsw-export");
    // Golden of current behaviour: the report-first parallel citation with a
    // paragraph pinpoint (O-C6) is not parsed either, so it is offered
    // verbatim and not pre-selected rather than adopted wrongly.
    expect(offered(p)).toEqual([
      [1, "verbatim", false],
      [2, "verbatim", false],
      [3, "verbatim", false],
      [4, "verbatim", false],
    ]);
    expect(p.preserved).toBeUndefined();
  });

  it("obiter-managed: managed notes are left alone, fn 5 is adopted, REF and ADDIN notes preserved", async () => {
    const p = await plan("obiter-managed");
    expect(offered(p)).toEqual([
      [5, "adopt", true],
      [7, "verbatim", false],
    ]);
    expect(p.preserved?.map((e) => [e.noteIndex ?? 0, e.fieldTypes])).toEqual([
      [2, { REF: 1 }],
      [6, { ADDIN: 1 }],
    ]);
  });
});
