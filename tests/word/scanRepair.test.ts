/**
 * BUG-004 — Scan & Repair plan builder (pure logic).
 *
 * Covers the story's document shapes:
 *  - never-Obiter document (plain footnotes only): confident deterministic
 *    parses become managed-adoption candidates; everything else is offered
 *    as a verbatim manual citation (overrideText escape hatch);
 *  - lost store + content controls: store entries are rebuilt from the
 *    control tag/text (the recovery 'Import from Word' cannot do);
 *  - mixed documents and degenerate cases (empty doc, footnote with no
 *    citation).
 *
 * Scan & Repair is strictly offline: only the deterministic parser chain
 * (parseCitation + parseCitationText) is consulted — never the LLM.
 */

import {
  buildScanPlan,
  proposeCitationFromText,
  type DocumentScanSnapshot,
  type ScannedNote,
  type ScanItem,
} from "../../src/word/scanRepair";
import { PARENT_CC_TAG } from "../../src/word/footnoteManager";
import type { Citation } from "../../src/types/citation";

// ─── Helpers ────────────────────────────────────────────────────────────────

function plainFootnote(index: number, text: string): ScannedNote {
  return { noteType: "footnote", index, text, controls: [] };
}

function obiterFootnote(
  index: number,
  children: { tag: string; text: string }[],
  bodyText?: string
): ScannedNote {
  return {
    noteType: "footnote",
    index,
    text: bodyText ?? children.map((c) => c.text).join("; ") + ".",
    controls: [
      { tag: PARENT_CC_TAG, title: "Obiter Footnote", text: bodyText ?? "" },
      ...children.map((c) => ({ tag: c.tag, title: "Citation:auto", text: c.text })),
    ],
  };
}

function snapshot(
  notes: ScannedNote[],
  bodyControls: DocumentScanSnapshot["bodyControls"] = []
): DocumentScanSnapshot {
  return { bodyControls, notes };
}

function storeCitation(id: string): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType: "case.reported",
    data: { party1: "A", party2: "B" },
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
  };
}

let idCounter = 0;
const testOptions = {
  now: () => "2026-07-03T00:00:00.000Z",
  makeId: () => `generated-${++idCounter}`,
};

beforeEach(() => {
  idCounter = 0;
});

function itemsOfKind(items: ScanItem[], kind: ScanItem["kind"]): ScanItem[] {
  return items.filter((i) => i.kind === kind);
}

// ─── Never-Obiter document (plain footnotes only) ───────────────────────────

describe("buildScanPlan — never-Obiter document (plain footnotes)", () => {
  test("reported case footnote is adopted structured, per the BUG-002 citation", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(1, "Smith v Land & House Property Corporation (1884) 28 Ch D 7.")]),
      [],
      testOptions
    );

    expect(plan.counts).toEqual({ found: 1, linked: 0, rebuild: 0, adopt: 1, verbatim: 0 });
    const [item] = itemsOfKind(plan.items, "adopt");
    expect(item.location).toBe("footnote");
    expect(item.noteIndex).toBe(1);
    expect(item.wrap).toBe("managed");
    expect(item.defaultSelected).toBe(true);
    expect(item.text).toBe("Smith v Land & House Property Corporation (1884) 28 Ch D 7");

    const citation = item.proposedCitation!;
    expect(citation.id).toBe("generated-1");
    expect(citation.sourceType).toBe("case.reported");
    expect(citation.firstFootnoteNumber).toBe(1);
    // Rule 2.1.1: '&' stays inside the party name — never a party separator.
    expect(citation.data.party1).toBe("Smith");
    expect(citation.data.party2).toBe("Land & House Property Corporation");
    expect(citation.data.year).toBe(1884);
    expect(citation.data.volume).toBe(28);
    expect(citation.data.reportSeries).toBe("Ch D");
    expect(citation.data.startingPage).toBe(7);
    expect(citation.overrideText).toBeUndefined();
  });

  test("medium neutral citation footnote is adopted as case.unreported.mnc", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(1, "Obeid v The Queen [2017] HCA 44.")]),
      [],
      testOptions
    );

    const [item] = itemsOfKind(plan.items, "adopt");
    const citation = item.proposedCitation!;
    expect(citation.sourceType).toBe("case.unreported.mnc");
    expect(citation.data.party1).toBe("Obeid");
    expect(citation.data.party2).toBe("The Queen");
    expect(citation.data.year).toBe(2017);
    expect(citation.data.court).toBe("HCA");
    expect(citation.data.caseNumber).toBe("44");
  });

  test("statute footnote with a section pinpoint is adopted with the pinpoint preserved", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(2, "Native Title Act 1993 (Cth) s 223.")]),
      [],
      testOptions
    );

    const [item] = itemsOfKind(plan.items, "adopt");
    expect(item.pinpoint).toBe("s 223");
    const citation = item.proposedCitation!;
    expect(citation.sourceType).toBe("legislation.statute");
    expect(citation.data.title).toBe("Native Title Act");
    expect(citation.data.year).toBe(1993);
    expect(citation.data.jurisdiction).toBe("Cth");
  });

  test("reported case with trailing page pinpoint keeps the pinpoint out of the citation", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(1, "Mabo v Queensland (No 2) (1992) 175 CLR 1, 42.")]),
      [],
      testOptions
    );

    const [item] = itemsOfKind(plan.items, "adopt");
    expect(item.pinpoint).toBe("42");
    const citation = item.proposedCitation!;
    expect(citation.data.party2).toBe("Queensland (No 2)");
    expect(citation.data.startingPage).toBe(1);
  });

  test("Hansard footnote is adopted with the engine's hansard field names", () => {
    const plan = buildScanPlan(
      snapshot([
        plainFootnote(
          1,
          "Commonwealth, Parliamentary Debates, Senate, 22 June 2009, 3925 (Penny Wong)."
        ),
      ]),
      [],
      testOptions
    );

    const [item] = itemsOfKind(plan.items, "adopt");
    const citation = item.proposedCitation!;
    expect(citation.sourceType).toBe("hansard");
    expect(citation.data.jurisdiction).toBe("Commonwealth");
    expect(citation.data.chamber).toBe("Senate");
    expect(citation.data.date).toBe("22 June 2009");
    expect(citation.data.page).toBe("3925");
    expect(citation.data.speaker).toBe("Penny Wong");
  });

  test("prose footnote is offered as a verbatim manual citation, default-unselected", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(3, "See generally the discussion of native title in chapter 3.")]),
      [],
      testOptions
    );

    expect(plan.counts.verbatim).toBe(1);
    const [item] = itemsOfKind(plan.items, "verbatim");
    expect(item.defaultSelected).toBe(false);
    expect(item.wrap).toBe("flat");

    const citation = item.proposedCitation!;
    expect(citation.sourceType).toBe("custom");
    // The overrideText mechanism: rendered verbatim, closing stop stripped
    // (the refresher owns closing punctuation, Rule 1.1.4).
    expect(citation.overrideText).toBe("See generally the discussion of native title in chapter 3");
    expect(citation.data.customText).toBe(citation.overrideText);
  });

  test("a signal before a parseable citation forces the verbatim path (text is more than a citation)", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(1, "See Mabo v Queensland (No 2) (1992) 175 CLR 1.")]),
      [],
      testOptions
    );
    expect(plan.counts.adopt).toBe(0);
    expect(plan.counts.verbatim).toBe(1);
    expect(itemsOfKind(plan.items, "verbatim")[0].proposedCitation!.overrideText).toBe(
      "See Mabo v Queensland (No 2) (1992) 175 CLR 1"
    );
  });

  test("trailing prose after a parseable citation forces the verbatim path", () => {
    const plan = buildScanPlan(
      snapshot([
        plainFootnote(1, "Smith v Jones (2001) 200 CLR 1, discussed further in chapter 3."),
      ]),
      [],
      testOptions
    );
    expect(plan.counts.adopt).toBe(0);
    expect(plan.counts.verbatim).toBe(1);
  });

  test("Word line breaks and non-breaking spaces are normalised before parsing", () => {
    const plan = buildScanPlan(
      snapshot([
        plainFootnote(1, "Smith v Land & House Property\r\nCorporation (1884) 28 Ch D 7."),
      ]),
      [],
      testOptions
    );
    const [item] = itemsOfKind(plan.items, "adopt");
    expect(item.proposedCitation!.data.party2).toBe("Land & House Property Corporation");
  });

  test("endnote citations adopt with a flat in-place wrap (the refresher does not manage endnotes)", () => {
    const plan = buildScanPlan(
      snapshot([
        { noteType: "endnote", index: 1, text: "Obeid v The Queen [2017] HCA 44.", controls: [] },
      ]),
      [],
      testOptions
    );
    const [item] = itemsOfKind(plan.items, "adopt");
    expect(item.location).toBe("endnote");
    expect(item.wrap).toBe("flat");
    // firstFootnoteNumber tracks footnotes only.
    expect(item.proposedCitation!.firstFootnoteNumber).toBeUndefined();
  });
});

// ─── Lost store + content controls (Pass A rebuild) ─────────────────────────

describe("buildScanPlan — lost store, Obiter controls intact", () => {
  test("store entries are rebuilt from control tags and text", () => {
    const plan = buildScanPlan(
      snapshot([
        obiterFootnote(1, [{ tag: "uuid-case", text: "Obeid v The Queen [2017] HCA 44" }]),
        obiterFootnote(2, [
          { tag: "uuid-odd", text: "An unusual looseleaf reference, service 99" },
        ]),
      ]),
      [], // the store is empty — lost
      testOptions
    );

    expect(plan.counts).toEqual({ found: 2, linked: 0, rebuild: 2, adopt: 0, verbatim: 0 });

    const rebuilds = itemsOfKind(plan.items, "rebuild");
    const caseItem = rebuilds.find((i) => i.citationId === "uuid-case")!;
    // The control tag IS the citation id — relinking existing occurrences.
    expect(caseItem.proposedCitation!.id).toBe("uuid-case");
    expect(caseItem.proposedCitation!.sourceType).toBe("case.unreported.mnc");
    expect(caseItem.proposedCitation!.firstFootnoteNumber).toBe(1);
    expect(caseItem.wrap).toBe("none");
    expect(caseItem.defaultSelected).toBe(true);

    const oddItem = rebuilds.find((i) => i.citationId === "uuid-odd")!;
    // Unparseable control text falls back to a verbatim manual entry so the
    // occurrence still renders exactly as it reads today.
    expect(oddItem.proposedCitation!.sourceType).toBe("custom");
    expect(oddItem.proposedCitation!.overrideText).toBe(
      "An unusual looseleaf reference, service 99"
    );
  });

  test("Pass B never runs on footnotes that carry Obiter controls", () => {
    const plan = buildScanPlan(
      snapshot([
        obiterFootnote(
          1,
          [{ tag: "uuid-1", text: "Obeid v The Queen [2017] HCA 44" }],
          "Obeid v The Queen [2017] HCA 44."
        ),
      ]),
      [],
      testOptions
    );
    expect(plan.counts.adopt).toBe(0);
    expect(plan.counts.verbatim).toBe(0);
    expect(plan.counts.rebuild).toBe(1);
  });

  test("repeat occurrences of the same orphaned tag propose a single rebuild", () => {
    const plan = buildScanPlan(
      snapshot([
        obiterFootnote(1, [{ tag: "uuid-1", text: "Obeid v The Queen [2017] HCA 44" }]),
        obiterFootnote(5, [{ tag: "uuid-1", text: "Obeid (n 1)" }]),
      ]),
      [],
      testOptions
    );
    expect(plan.counts.rebuild).toBe(1);
    // First occurrence wins: the full citation, footnote 1.
    const [item] = itemsOfKind(plan.items, "rebuild");
    expect(item.noteIndex).toBe(1);
    expect(item.proposedCitation!.firstFootnoteNumber).toBe(1);
  });

  test("body content controls participate in Pass A", () => {
    const plan = buildScanPlan(
      snapshot(
        [],
        [{ tag: "uuid-body", title: "Citation:auto", text: "Native Title Act 1993 (Cth)" }]
      ),
      [],
      testOptions
    );
    expect(plan.counts.rebuild).toBe(1);
    const [item] = itemsOfKind(plan.items, "rebuild");
    expect(item.location).toBe("body");
    expect(item.proposedCitation!.sourceType).toBe("legislation.statute");
    expect(item.proposedCitation!.firstFootnoteNumber).toBeUndefined();
  });
});

// ─── Mixed document ─────────────────────────────────────────────────────────

describe("buildScanPlan — mixed document", () => {
  test("linked, rebuild, adopt and verbatim items are all classified in one pass", () => {
    const plan = buildScanPlan(
      snapshot([
        obiterFootnote(1, [{ tag: "known-id", text: "Known v Case (2000) 1 CLR 1" }]),
        obiterFootnote(2, [{ tag: "orphan-id", text: "Obeid v The Queen [2017] HCA 44" }]),
        plainFootnote(3, "Native Title Act 1993 (Cth)."),
        plainFootnote(4, "A note that is definitely not a citation."),
      ]),
      [storeCitation("known-id")],
      testOptions
    );

    expect(plan.counts).toEqual({ found: 4, linked: 1, rebuild: 1, adopt: 1, verbatim: 1 });

    const linked = itemsOfKind(plan.items, "linked")[0];
    expect(linked.citationId).toBe("known-id");
    expect(linked.selectable).toBe(false);
    expect(linked.wrap).toBe("none");
  });
});

// ─── Degenerate cases ───────────────────────────────────────────────────────

describe("buildScanPlan — degenerate documents", () => {
  test("empty document yields an empty plan", () => {
    const plan = buildScanPlan(snapshot([]), [], testOptions);
    expect(plan.items).toEqual([]);
    expect(plan.counts).toEqual({ found: 0, linked: 0, rebuild: 0, adopt: 0, verbatim: 0 });
  });

  test("footnote with no text yields no items", () => {
    const plan = buildScanPlan(
      snapshot([plainFootnote(1, ""), plainFootnote(2, "   \r\n ")]),
      [],
      testOptions
    );
    expect(plan.items).toEqual([]);
  });

  test("footnote with an empty parent control and no children yields no items", () => {
    const plan = buildScanPlan(
      snapshot([
        {
          noteType: "footnote",
          index: 1,
          text: "",
          controls: [{ tag: PARENT_CC_TAG, title: "Obiter Footnote", text: "" }],
        },
      ]),
      [],
      testOptions
    );
    expect(plan.items).toEqual([]);
  });
});

// ─── proposeCitationFromText ────────────────────────────────────────────────

describe("proposeCitationFromText", () => {
  test("returns null for empty text", () => {
    expect(proposeCitationFromText("", "id-1")).toBeNull();
    expect(proposeCitationFromText("  .  ", "id-1")).toBeNull();
  });

  test("stamps the provided id, timestamps and AGLC version", () => {
    const proposal = proposeCitationFromText("Obeid v The Queen [2017] HCA 44", "fixed-id", {
      aglcVersion: "4",
      nowIso: "2026-07-03T00:00:00.000Z",
    })!;
    expect(proposal.structured).toBe(true);
    expect(proposal.citation.id).toBe("fixed-id");
    expect(proposal.citation.aglcVersion).toBe("4");
    expect(proposal.citation.createdAt).toBe("2026-07-03T00:00:00.000Z");
    expect(proposal.citation.tags).toEqual([]);
  });
});
