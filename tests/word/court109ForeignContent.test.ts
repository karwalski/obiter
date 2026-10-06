/**
 * @jest-environment jsdom
 *
 * COURT-109 (OBI-201, OBI-204, OBI-P01, OBI-P04): detect and preserve fields,
 * bookmarks and content controls Obiter did not create.
 *
 * Evidence: O-C3 (REF fields and `_Ref` bookmarks inside HCA footnotes),
 * O-F2 (FCA template: DOCPROPERTY fields, a CC tagged `MNC` bound to custom
 * XML), O-P1 / R08 §3.4–3.5 (field reading and bookmarks, WordApi 1.4, all
 * platforms). Backlog decision rule 6: preserve, do not integrate.
 *
 * The fixture is a synthetic flat-OOXML footnotes part (no real document
 * content). A small reader turns it into the fake footnote harness the
 * refresher runs against, so the test exercises the real refresh path:
 *
 *  - fn 1: plain Obiter footnote → rebuilt as before;
 *  - fn 2: REF field + hidden `_Ref` bookmark inside the obiter-fn control →
 *    skipped, reported as user-edited (foreign content), nothing written;
 *  - fn 3: a foreign content control (`MNC`) nested in the obiter-fn
 *    control → skipped, the foreign control is never deleted;
 *  - fn 4: only Word's own `_GoBack` bookmark → rebuilt (not foreign).
 *
 * The field and bookmark inventory read from the fixture is compared before
 * and after an insert-style refresh: nothing outside the managed rebuilds
 * changes, and no foreign item is written to or deleted.
 */

import { refreshAllCitations, foreignNestedControls } from "../../src/word/citationRefresher";
import {
  describeForeignContent,
  fieldTypeFromCode,
  isForeignBookmark,
  isObiterNestedControl,
  readForeignContentProbe,
} from "../../src/word/foreignContent";
import { buildScanPlan } from "../../src/word/scanRepair";
import type { DocumentScanSnapshot } from "../../src/word/scanRepair";
import { captureDocumentSnapshot } from "../../src/word/documentScanner";
import { CitationStore } from "../../src/store/citationStore";
import { FakeDocState, installFakeWord, storeXmlWith } from "../store/fakeWordHarness";
import { makeRefreshContext } from "../store/fakeFootnoteHarness";
import type { FakeFootnoteContext, FootnoteSpec } from "../store/fakeFootnoteHarness";

const noopHook = async (): Promise<void> => undefined;
const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Synthetic footnotes part, flat OOXML (COURT-105-style fixture as a string). */
const FOOTNOTES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:footnotes xmlns:w="${W}">
  <w:footnote w:id="1"><w:p>
    <w:r><w:footnoteRef/></w:r>
    <w:sdt><w:sdtPr><w:tag w:val="obiter-fn"/><w:alias w:val="Obiter Footnote"/></w:sdtPr><w:sdtContent>
      <w:sdt><w:sdtPr><w:tag w:val="cit-1"/><w:alias w:val="Citation:auto"/></w:sdtPr><w:sdtContent><w:r><w:t>Old text</w:t></w:r></w:sdtContent></w:sdt>
    </w:sdtContent></w:sdt>
  </w:p></w:footnote>
  <w:footnote w:id="2"><w:p>
    <w:r><w:footnoteRef/></w:r>
    <w:sdt><w:sdtPr><w:tag w:val="obiter-fn"/><w:alias w:val="Obiter Footnote"/></w:sdtPr><w:sdtContent>
      <w:sdt><w:sdtPr><w:tag w:val="cit-2"/><w:alias w:val="Citation:auto"/></w:sdtPr><w:sdtContent><w:r><w:t>Old text</w:t></w:r></w:sdtContent></w:sdt>
      <w:r><w:t xml:space="preserve"> See above </w:t></w:r>
      <w:bookmarkStart w:id="7" w:name="_Ref1001"/>
      <w:fldSimple w:instr=" REF _Ref2002 \\r \\h "><w:r><w:t>[12]</w:t></w:r></w:fldSimple>
      <w:bookmarkEnd w:id="7"/>
    </w:sdtContent></w:sdt>
  </w:p></w:footnote>
  <w:footnote w:id="3"><w:p>
    <w:r><w:footnoteRef/></w:r>
    <w:sdt><w:sdtPr><w:tag w:val="obiter-fn"/><w:alias w:val="Obiter Footnote"/></w:sdtPr><w:sdtContent>
      <w:sdt><w:sdtPr><w:tag w:val="cit-1"/><w:alias w:val="Citation:auto"/></w:sdtPr><w:sdtContent><w:r><w:t>Old text</w:t></w:r></w:sdtContent></w:sdt>
      <w:sdt><w:sdtPr><w:tag w:val="MNC"/><w:dataBinding w:xpath="/fca/mnc" w:storeItemID="{00000000-0000-0000-0000-000000000000}"/></w:sdtPr><w:sdtContent><w:r><w:t>[2026] FCA 1</w:t></w:r></w:sdtContent></w:sdt>
    </w:sdtContent></w:sdt>
  </w:p></w:footnote>
  <w:footnote w:id="4"><w:p>
    <w:r><w:footnoteRef/></w:r>
    <w:sdt><w:sdtPr><w:tag w:val="obiter-fn"/><w:alias w:val="Obiter Footnote"/></w:sdtPr><w:sdtContent>
      <w:bookmarkStart w:id="9" w:name="_GoBack"/><w:bookmarkEnd w:id="9"/>
      <w:sdt><w:sdtPr><w:tag w:val="cit-2"/><w:alias w:val="Citation:auto"/></w:sdtPr><w:sdtContent><w:r><w:t>Old text</w:t></w:r></w:sdtContent></w:sdt>
    </w:sdtContent></w:sdt>
  </w:p></w:footnote>
</w:footnotes>`;

/** What the reader extracts from one footnote of the fixture. */
interface FixtureNote {
  childTags: { tag: string; title: string }[];
  fields: string[];
  bookmarks: string[];
}

/** Reads the fixture: nested controls, field codes and bookmarks inside each obiter-fn control. */
function readFixture(xml: string): FixtureNote[] {
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const notes = Array.from(dom.getElementsByTagNameNS(W, "footnote"));
  return notes.map((note) => {
    const parent = Array.from(note.getElementsByTagNameNS(W, "sdt")).find(
      (sdt) => sdt.getElementsByTagNameNS(W, "tag")[0]?.getAttributeNS(W, "val") === "obiter-fn"
    ) as Element;
    const content = parent.getElementsByTagNameNS(W, "sdtContent")[0];
    const childTags = Array.from(content.getElementsByTagNameNS(W, "sdt")).map((sdt) => ({
      tag: sdt.getElementsByTagNameNS(W, "tag")[0]?.getAttributeNS(W, "val") ?? "",
      title: sdt.getElementsByTagNameNS(W, "alias")[0]?.getAttributeNS(W, "val") ?? "",
    }));
    const fields = Array.from(content.getElementsByTagNameNS(W, "fldSimple")).map(
      (f) => f.getAttributeNS(W, "instr") ?? ""
    );
    const bookmarks = Array.from(content.getElementsByTagNameNS(W, "bookmarkStart")).map(
      (b) => b.getAttributeNS(W, "name") ?? ""
    );
    return { childTags, fields, bookmarks };
  });
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

/** Builds the refresher harness from the fixture, attaching field and bookmark reads. */
async function makeDoc(): Promise<{
  store: CitationStore;
  ctx: FakeFootnoteContext;
  fixture: FixtureNote[];
  fieldWrites: jest.Mock;
}> {
  const fixture = readFixture(FOOTNOTES_XML);
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("cit-1", "cit-2"));
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();

  const specs: FootnoteSpec[] = fixture.map((note) => {
    const [first, ...rest] = note.childTags;
    return {
      citationId: first.tag,
      text: "Old text",
      additional: rest.map((c) => ({ citationId: c.tag })),
    };
  });
  const ctx = makeRefreshContext(doc, specs);

  // Any write to a field would land here; COURT-109 says none may happen.
  const fieldWrites = jest.fn();
  fixture.forEach((note, i) => {
    // Restore the fixture's own titles (the harness gives every child Obiter's).
    note.childTags.forEach((c, j) => {
      ctx.children[i][j].title = c.title;
    });
    Object.assign(ctx.parents[i], {
      fields: {
        load: jest.fn(),
        items: note.fields.map((code) => ({
          code,
          updateResult: fieldWrites,
          delete: fieldWrites,
        })),
      },
      getRange: jest.fn(() => ({
        getBookmarks: jest.fn(() => ({ value: note.bookmarks })),
      })),
    });
  });
  return { store, ctx, fixture, fieldWrites };
}

/** Field codes and bookmark names inside each managed control, in order. */
function inventory(fixture: FixtureNote[], ctx: FakeFootnoteContext): string[][] {
  return fixture.map((note, i) => [
    ...note.fields,
    ...note.bookmarks,
    ...ctx.children[i].filter((c) => c.tag === "MNC" && !c.removed).map(() => "cc:MNC"),
  ]);
}

describe("COURT-109 — the refresher never rebuilds over foreign content", () => {
  it("rebuilds fn 1 and fn 4, skips fn 2 (REF field, _Ref bookmark) and fn 3 (foreign control)", async () => {
    installOffice(1.5);
    const { store, ctx, fixture, fieldWrites } = await makeDoc();
    const before = inventory(fixture, ctx);

    const result = await refreshAllCitations(ctx.context, store, noopHook);

    expect(result.failures).toEqual([]);
    expect(result.userEdits.map((e) => [e.footnoteNumber, e.reason])).toEqual([
      [2, "foreign-content"],
      [3, "foreign-content"],
    ]);
    expect(result.userEdits[0].foreignContent).toBe("1 REF field, 1 bookmark");
    expect(result.userEdits[1].foreignContent).toBe("1 content control from another tool");

    // Skipped footnotes: nothing written, nothing deleted (the MNC control survives).
    for (const i of [1, 2]) {
      expect(ctx.parents[i].writes).toEqual([]);
      expect(ctx.children[i].every((c) => !c.removed)).toBe(true);
    }
    // Plain and _GoBack-only footnotes rebuild exactly as before.
    expect(ctx.parents[0].writes.length).toBeGreaterThan(0);
    expect(ctx.parents[3].writes.length).toBeGreaterThan(0);

    // Inventory of fields, bookmarks and foreign controls is unchanged, and
    // no field was ever updated or deleted.
    expect(inventory(fixture, ctx)).toEqual(before);
    expect(fieldWrites).not.toHaveBeenCalled();
  });

  it("a second refresh still skips the foreign footnotes", async () => {
    installOffice(1.5);
    const { store, ctx } = await makeDoc();
    await refreshAllCitations(ctx.context, store, noopHook);
    const again = await refreshAllCitations(ctx.context, store, noopHook);
    expect(again.userEdits.map((e) => e.footnoteNumber)).toEqual([2, 3]);
    expect(ctx.parents[1].writes).toEqual([]);
  });

  it("the field and bookmark reads add no sync (same count as a host without them)", async () => {
    installOffice(1.5);
    const a = await makeDoc();
    const spyA = jest.spyOn(a.ctx.context, "sync");
    await refreshAllCitations(a.ctx.context, a.store, noopHook);

    installOffice(1.3); // no field or bookmark reads below WordApi 1.4
    const b = await makeDoc();
    const spyB = jest.spyOn(b.ctx.context, "sync");
    const resultB = await refreshAllCitations(b.ctx.context, b.store, noopHook);

    expect(spyA.mock.calls.length).toBe(spyB.mock.calls.length);
    // Without the reads only the nested foreign control is detectable.
    expect(resultB.userEdits.map((e) => e.footnoteNumber)).toEqual([3]);
  });

  it("a host that rejects the reads falls back to the pre-COURT-109 refresh", async () => {
    installOffice(1.5);
    const { store, ctx } = await makeDoc();
    const realSync = ctx.context.sync.bind(ctx.context);
    let failed = false;
    jest.spyOn(ctx.context, "sync").mockImplementation(async () => {
      // Fail the first sync after the parents' text was queued: the Phase 1
      // batch that also carries the field and bookmark reads.
      if (!failed && ctx.parents[0].load.mock.calls.length > 0) {
        failed = true;
        throw new Error("InvalidArgument");
      }
      return realSync();
    });
    const result = await refreshAllCitations(ctx.context, store, noopHook);
    expect(failed).toBe(true);
    expect(result.failures).toEqual([]);
    // Only the foreign control (read with the scan, not the probe) is caught.
    expect(result.userEdits.map((e) => e.footnoteNumber)).toEqual([3]);
  });
});

describe("COURT-109 — pure helpers", () => {
  it("names the field type from its code, tolerating non-string values", () => {
    expect(fieldTypeFromCode(" REF _Ref123 \\r \\h ")).toBe("REF");
    expect(fieldTypeFromCode("ADDIN ZOTERO_ITEM CSL_CITATION {}")).toBe("ADDIN");
    expect(fieldTypeFromCode(' TA \\l "Mabo" \\s "Mabo" \\c 1 ')).toBe("TA");
    expect(fieldTypeFromCode("noteref _Ref9 \\h")).toBe("NOTEREF");
    expect(fieldTypeFromCode("")).toBe("Field");
    expect(fieldTypeFromCode(42)).toBe("Field");
    expect(fieldTypeFromCode(undefined)).toBe("Field");
  });

  it("treats every bookmark but Word's own _GoBack and _Hlk markers as foreign", () => {
    expect(isForeignBookmark("_Ref1001")).toBe(true);
    expect(isForeignBookmark("Para12")).toBe(true);
    expect(isForeignBookmark("_GoBack")).toBe(false);
    // Word adds hidden _Hlk bookmarks around copied text; not template content.
    expect(isForeignBookmark("_Hlk148223344")).toBe(false);
    expect(isForeignBookmark("")).toBe(false);
  });

  it("owns obiter- controls, library citations and Citation-titled children only", () => {
    const known = (id: string): boolean => id === "cit-1";
    expect(isObiterNestedControl("obiter-fn", "", known)).toBe(true);
    expect(isObiterNestedControl("cit-1", "", known)).toBe(true);
    expect(isObiterNestedControl("lost-uuid", "Citation:auto:42", known)).toBe(true);
    expect(isObiterNestedControl("lost-uuid", "Citation", known)).toBe(true);
    expect(isObiterNestedControl("MNC", "", known)).toBe(false);
    expect(isObiterNestedControl("", "Citation:auto", known)).toBe(false);
    expect(isObiterNestedControl("x", "Citations list", known)).toBe(false);
  });

  it("foreignNestedControls lists foreign tags and untagged controls", () => {
    const store = { getById: (id: string) => (id === "cit-1" ? ({} as never) : undefined) };
    expect(
      foreignNestedControls(
        {
          nestedControls: [
            { tag: "cit-1", title: "Citation:auto" },
            { tag: "MNC", title: "" },
            { tag: "", title: "" },
          ],
        },
        store
      )
    ).toEqual(["MNC", "untagged"]);
  });

  it("describes foreign content plainly", () => {
    expect(
      describeForeignContent({
        fieldTypes: ["REF", "REF", "ADDIN"],
        bookmarks: ["_Ref1"],
        controls: [],
      })
    ).toBe("2 REF fields, 1 ADDIN field, 1 bookmark");
    expect(readForeignContentProbe(undefined)).toEqual({
      fieldTypes: [],
      bookmarks: [],
      controls: [],
    });
  });
});

describe("COURT-109 — Scan & Repair lists foreign fields as preserved and does not adopt", () => {
  it("captures fields and bookmarks per note in the existing two syncs", async () => {
    installOffice(1.5);
    let syncs = 0;
    const note = (text: string, codes: string[], bookmarks: string[]): unknown => ({
      body: {
        text,
        load: jest.fn(),
        contentControls: { items: [], load: jest.fn() },
        fields: { load: jest.fn(), items: codes.map((code) => ({ code })) },
        getRange: () => ({ getBookmarks: () => ({ value: bookmarks }) }),
      },
    });
    const context = {
      document: {
        body: {
          contentControls: { items: [], load: jest.fn() },
          fields: { load: jest.fn(), items: [{ code: " TOA \\c 1 " }] },
          footnotes: {
            load: jest.fn(),
            items: [
              note("Obeid v The Queen [2017] HCA 44.", [], []),
              note("See [12].", [" REF _Ref1 \\r \\h "], ["_Ref9", "_GoBack"]),
              note("Smith v Jones [2020] HCA 1.", [" ADDIN EN.CITE "], []),
            ],
          },
          endnotes: { load: jest.fn(), items: [] },
        },
      },
      sync: async () => {
        syncs++;
      },
    } as unknown as Word.RequestContext;

    const snapshot = await captureDocumentSnapshot(context);
    expect(syncs).toBe(2);
    expect(snapshot.bodyFields).toEqual(["TOA"]);
    expect(snapshot.notes[0].fields).toBeUndefined();
    expect(snapshot.notes[1].fields).toEqual(["REF"]);
    expect(snapshot.notes[1].bookmarks).toEqual(["_Ref9"]);
    expect(snapshot.notes[2].fields).toEqual(["ADDIN"]);

    const plan = buildScanPlan(snapshot, [], { makeId: () => "new-id" });
    // Only the clean note is offered; notes 2 and 3 are preserved.
    expect(plan.items.map((i) => i.noteIndex)).toEqual([1]);
    expect(plan.preserved?.map((p) => [p.location, p.noteIndex ?? 0, p.fieldTypes])).toEqual([
      ["body", 0, { TOA: 1 }],
      ["footnote", 2, { REF: 1 }],
      ["footnote", 3, { ADDIN: 1 }],
    ]);
    expect(plan.preserved?.[1].bookmarkCount).toBe(1);
  });

  it("a plan with no foreign content has no preserved list (existing documents unchanged)", () => {
    const snapshot: DocumentScanSnapshot = {
      bodyControls: [],
      notes: [
        { noteType: "footnote", index: 1, text: "Obeid v The Queen [2017] HCA 44.", controls: [] },
      ],
    };
    const plan = buildScanPlan(snapshot, [], { makeId: () => "id" });
    expect(plan.preserved).toBeUndefined();
    expect(plan.items).toHaveLength(1);
  });
});
