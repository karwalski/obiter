/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-007 — Bibliography, tables and lists of authorities per standard.
 *
 * Part 1 is table-driven over the `bibliography-entry` rows of every
 * expectation table through tests/standards/matrix.ts (plain tests; recorded
 * deltas as `test.failing` under STD-018; pending rows as todos).
 *
 * Part 2 renders the whole fixture library through `renderBibliography`
 * (the Bibliography view's and the export's entry point) and asserts the
 * section structure and order each standard prescribes: AGLC4 Rule 1.13
 * sections A–E; OSCOLA 5 §1.6.2 table of cases, §1.6.3 table of legislation,
 * §1.7 bibliography (secondary only, surname first); NZLSG 3 Appendix 7
 * groups (cases, legislation, then secondary; Waitangi Tribunal material
 * kept apart, DECISION-040 item 9). Entries that still render in AGLC form
 * under OSCOLA or NZLSG are `test.failing` under STD-018.
 *
 * Part 3 covers the court List of Authorities variants under the AGLC4
 * court presets exactly as the refresher builds the config (HCA part-ab,
 * NSWCA part-ab with the key-authority asterisk, WASC simple,
 * STATE_TRIBUNAL off) and, through toggle overrides, part-abc, three-part-tas
 * and two-part-read, cross-checked against `generateLoaWithOptions` the way
 * tests/engine/rules/v4/general/bibliography-loa.test.ts drives it.
 */

import type { Citation } from "../../src/types/citation";
import { generateLoaWithOptions } from "../../src/engine/rules/v4/general/bibliography";
import type { LoaGenerationOptions } from "../../src/engine/rules/v4/general/bibliography";
import { runsToPlainText } from "../../src/actions/citationService";
import {
  articleYoung,
  bookLuntz,
  cthNativeTitleAct,
  maboReported,
  nzBrooker,
  STANDARD_FIXTURES,
  treatyRomeStatute,
  ukCorr,
  ukHra,
  waiKoAotearoa,
} from "../fixtures/standards/citations";
import { parseScenario, runTable, TABLE_KEYS } from "./matrix";
import { bibliographyTexts, presetToggles, renderBibliography } from "./runner";
import type { BibliographySection, CourtOptions } from "./runner";

// ─── Part 1: the expectation tables ─────────────────────────────────────────

function isBibliographyScenario(scenario: string): boolean {
  return parseScenario(scenario).base === "bibliography-entry";
}

describe("STD-007: bibliography entries per standard", () => {
  for (const key of TABLE_KEYS) {
    runTable(key, isBibliographyScenario);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALL: Citation[] = [...STANDARD_FIXTURES];

function headings(sections: BibliographySection[]): string[] {
  return sections.map((s) => s.heading);
}

function entriesOf(sections: BibliographySection[], heading: string): string[] {
  const section = sections.find((s) => s.heading === heading);
  if (!section)
    throw new Error(`No section headed "${heading}" in ${headings(sections).join(" | ")}`);
  return section.entries.map(runsToPlainText);
}

/** The position of each of `wanted` in `all`, in the order given. */
function positions(all: string[], wanted: string[]): number[] {
  return wanted.map((h) => {
    const i = all.indexOf(h);
    if (i === -1) throw new Error(`Heading "${h}" missing from ${all.join(" | ")}`);
    return i;
  });
}

function isAscending(values: number[]): boolean {
  return values.every((v, i) => i === 0 || v > values[i - 1]);
}

// ─── Part 2: whole bibliographies ───────────────────────────────────────────

describe("STD-007: AGLC4 bibliography (Rule 1.13)", () => {
  const sections = renderBibliography(ALL, "aglc4");

  test("sections A–E appear in order with the Rule 1.13 titles", () => {
    expect(headings(sections)).toEqual([
      "A Articles/Books/Reports",
      "B Cases",
      "C Legislation",
      "D Treaties",
      "E Other",
    ]);
  });

  test("cases, legislation and the treaty land in their sections", () => {
    expect(entriesOf(sections, "B Cases")).toContain("Mabo v Queensland (1992) 175 CLR 1");
    expect(entriesOf(sections, "C Legislation")).toContain("Native Title Act 1993 (Cth)");
    expect(entriesOf(sections, "D Treaties").some((t) => t.startsWith("Rome Statute"))).toBe(true);
  });

  test("secondary entries are surname-first and alphabetical (Rule 1.13.1)", () => {
    const secondary = entriesOf(sections, "A Articles/Books/Reports");
    const luntz = secondary.findIndex((t) => t.startsWith("Luntz, Harold"));
    const young = secondary.findIndex((t) => t.startsWith("Young, Alison L"));
    expect(luntz).toBeGreaterThanOrEqual(0);
    expect(young).toBeGreaterThan(luntz);
  });
});

describe("STD-007: OSCOLA 5 tables and bibliography (§1.6.2, §1.6.3, §1.7)", () => {
  const sections = renderBibliography(ALL, "oscola5");
  const all = headings(sections);

  test("table of cases (by jurisdiction) precedes the table of legislation, which precedes the bibliography", () => {
    const caseHeadings = all.filter((h) => h.endsWith(" Cases") || h === "Table of Cases");
    expect(caseHeadings.length).toBeGreaterThan(0);
    const lastCase = all.indexOf(caseHeadings[caseHeadings.length - 1]);
    const legislation = all.filter(
      (h) => h === "Table of Legislation" || h.endsWith(" Legislation")
    );
    expect(legislation.length).toBeGreaterThan(0);
    const firstLegislation = all.indexOf(legislation[0]);
    const lastLegislation = all.indexOf(legislation[legislation.length - 1]);
    expect(lastCase).toBeLessThan(firstLegislation);
    expect(lastLegislation).toBeLessThan(all.indexOf("Bibliography"));
    expect(all[all.length - 1]).toBe("Bibliography");
  });

  test("the table of cases holds every case, in footnote form, and the tables hold the legislation (§1.6.2, §1.6.3)", () => {
    // §1.6.2 splits the table by jurisdiction "unless there are few cases";
    // the engine renders one "Table of Cases" for this set, which the rule
    // allows, so only membership is asserted here.
    const caseEntries = sections
      .filter((s) => s.heading === "Table of Cases" || s.heading.endsWith(" Cases"))
      .flatMap((s) => s.entries.map(runsToPlainText));
    expect(caseEntries.some((t) => t.startsWith("Corr v IBC Vehicles Ltd"))).toBe(true);
    expect(caseEntries.some((t) => t.startsWith("Mabo v Queensland"))).toBe(true);
    const legislationEntries = sections
      .filter((s) => s.heading === "Table of Legislation" || s.heading.endsWith(" Legislation"))
      .flatMap((s) => s.entries.map(runsToPlainText));
    expect(legislationEntries.some((t) => t.startsWith("Human Rights Act 1998"))).toBe(true);
  });

  test("primary sources never appear in the bibliography (§1.7)", () => {
    const bib = entriesOf(sections, "Bibliography");
    expect(bib.some((t) => t.includes("Mabo v Queensland"))).toBe(false);
    expect(bib.some((t) => t.includes("Human Rights Act"))).toBe(false);
  });

  // STD-018: the bibliography renders through the OSCOLA formatters with
  // the §1.7 author inversion (formatBibliographyEntry(citation, config)).
  test("STD-018: bibliography entries give surname then initials and no closing full stop (§1.7)", () => {
    const bib = entriesOf(sections, "Bibliography");
    expect(bib).toContain(
      "Luntz H, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)"
    );
    expect(bib).toContain("Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554");
  });

  test("bibliography is alphabetical by surname (§1.7)", () => {
    const bib = entriesOf(sections, "Bibliography");
    const luntz = bib.findIndex((t) => t.startsWith("Luntz"));
    const young = bib.findIndex((t) => t.startsWith("Young"));
    expect(luntz).toBeGreaterThanOrEqual(0);
    expect(young).toBeGreaterThan(luntz);
  });
});

describe("STD-007: NZLSG 3 bibliography (Appendix 7)", () => {
  const sections = renderBibliography(ALL, "nzlsg3");
  const all = headings(sections);

  test("cases, then legislation, then secondary sources, with Waitangi Tribunal material apart", () => {
    expect(
      isAscending(
        positions(all, ["Cases", "Legislation", "Waitangi Tribunal", "Secondary Sources"])
      )
    ).toBe(true);
  });

  test("the Waitangi Tribunal report is in its own section, not among the secondary sources", () => {
    expect(entriesOf(sections, "Waitangi Tribunal").length).toBe(1);
    expect(
      entriesOf(sections, "Secondary Sources").some((t) => t.includes("Ko Aotearoa Tēnei"))
    ).toBe(false);
  });

  // Currently "Cases" / "Legislation" / "Waitangi Tribunal" / "Secondary
  // Sources": generateNzlsgBibliography has no lettered headings and does
  // not split secondary sources into books and journal articles. STD-018
  // leaves the headings as they are: the letters depend on where Waitangi
  // Tribunal and Māori Land Court material sits and on whether a treaties
  // group precedes the books (DECISION-040 item 9), and the structural
  // tests above pin the present headings until that is decided.
  test.failing(
    "STD-018: Appendix 7 lettered group headings: A Cases, B Legislation, C Books and Chapters in Books, D Journal Articles",
    () => {
      expect(
        isAscending(
          positions(all, [
            "A Cases",
            "B Legislation",
            "C Books and Chapters in Books",
            "D Journal Articles",
          ])
        )
      ).toBe(true);
    }
  );

  // STD-018: formatBibliographyEntry(citation, config) renders the NZLSG
  // footnote form with a full stop. Per-fixture rows in nzlsg3.ts.
  test("STD-018: entries follow the NZLSG footnote form, names uninverted, ending with a full stop", () => {
    const secondary = entriesOf(sections, "Secondary Sources");
    expect(secondary).toContain("Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554.");
    expect(entriesOf(sections, "Cases")).toContain(
      "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91."
    );
    expect(entriesOf(sections, "Waitangi Tribunal")).toContain(
      "Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011)."
    );
  });

  test("secondary entries are alphabetical by first author's surname", () => {
    const secondary = entriesOf(sections, "Secondary Sources");
    const luntz = secondary.findIndex((t) => t.includes("Luntz"));
    const young = secondary.findIndex((t) => t.includes("Young"));
    expect(luntz).toBeGreaterThanOrEqual(0);
    expect(young).toBeGreaterThan(luntz);
  });
});

// ─── Part 3: court Lists of Authorities ─────────────────────────────────────

/** The authorities a court document cites: cases and legislation from the library, plus one secondary work. */
const COURT_SET: Citation[] = [
  maboReported,
  ukCorr,
  nzBrooker,
  cthNativeTitleAct,
  ukHra,
  bookLuntz,
  articleYoung,
  treatyRomeStatute,
  waiKoAotearoa,
];

const PART_A_HEADING = "Part A — Authorities from which passages are to be read";
const PART_B_HEADING = "Part B — Authorities to which reference may be made";

describe("STD-007: court Lists of Authorities under the AGLC4 presets", () => {
  test("HCA (part-ab): Part A holds the authorities marked for reading, Part B the rest, cases before legislation", () => {
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const } : c
    );
    const sections = renderBibliography(cited, "aglc4", { preset: "HCA" });
    const all = headings(sections);
    expect(all).toEqual([PART_A_HEADING, "Cases", PART_B_HEADING, "Cases", "Legislation"]);
    const partACases = sections[1].entries.map(runsToPlainText);
    expect(partACases).toEqual(["Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23"]);
    const partBCases = sections[3].entries.map(runsToPlainText);
    expect(partBCases.some((t) => t.startsWith("Brooker v Police"))).toBe(true);
    expect(partBCases.some((t) => t.startsWith("Corr v IBC Vehicles Ltd"))).toBe(true);
    expect(partBCases.some((t) => t.startsWith("Mabo"))).toBe(false);
    // Alphabetical by first party within a part.
    expect(partBCases[0].startsWith("Brooker")).toBe(true);
    expect(partBCases[1].startsWith("Corr")).toBe(true);
  });

  test("HCA (part-ab): secondary sources are excluded from both parts", () => {
    const sections = renderBibliography(COURT_SET, "aglc4", { preset: "HCA" });
    const texts = bibliographyTexts(sections);
    expect(texts.some((t) => t.includes("Luntz"))).toBe(false);
    expect(texts.some((t) => t.includes("Due Deference"))).toBe(false);
  });

  test("NSWCA (part-ab): a key authority is prefixed with an asterisk (LOA-004)", () => {
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const, isKeyAuthority: true } : c
    );
    const sections = renderBibliography(cited, "aglc4", { preset: "NSWCA" });
    expect(headings(sections)[0]).toBe(PART_A_HEADING);
    const partACases = sections[1].entries.map(runsToPlainText);
    expect(partACases).toEqual(["* Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23"]);
    const partBCases = sections[3].entries.map(runsToPlainText);
    expect(partBCases.every((t) => !t.startsWith("* "))).toBe(true);
  });

  test("NSWCA (part-ab): without a key-authority flag no entry carries the asterisk", () => {
    const sections = renderBibliography(COURT_SET, "aglc4", { preset: "NSWCA" });
    expect(bibliographyTexts(sections).every((t) => !t.startsWith("* "))).toBe(true);
  });

  test("WASC (simple): a flat Cases then Legislation list, MNC first in the parallel citation (PD 8.2.2)", () => {
    const sections = renderBibliography(COURT_SET, "aglc4", { preset: "WASC" });
    expect(headings(sections)).toEqual(["Cases", "Legislation"]);
    const cases = entriesOf(sections, "Cases");
    expect(cases[0].startsWith("Brooker")).toBe(true);
    expect(cases.some((t) => t.startsWith("Mabo v Queensland"))).toBe(true);
    const legislation = entriesOf(sections, "Legislation");
    expect(legislation).toContain("Human Rights Act 1998 (UK)");
    expect(legislation).toContain("Native Title Act 1993 (Cth)");
  });

  test("WASC (simple): the key-authority asterisk is honoured (WA PD 2.1)", () => {
    const cited = COURT_SET.map((c) => (c.id === ukCorr.id ? { ...c, isKeyAuthority: true } : c));
    const sections = renderBibliography(cited, "aglc4", { preset: "WASC" });
    const cases = entriesOf(sections, "Cases");
    expect(cases.some((t) => t.startsWith("* Corr v IBC Vehicles Ltd"))).toBe(true);
    expect(cases.filter((t) => t.startsWith("* ")).length).toBe(1);
  });

  test("STATE_TRIBUNAL (off): no List of Authorities is generated", () => {
    expect(presetToggles("STATE_TRIBUNAL").loaType).toBe("off");
    expect(renderBibliography(COURT_SET, "aglc4", { preset: "STATE_TRIBUNAL" })).toEqual([]);
  });

  test("part-abc override (Vic SC PN CA 3): Parts A, B and C with secondary sources in Part C", () => {
    const court: CourtOptions = { preset: "HCA", overrides: { loaType: "part-abc" } };
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const } : c
    );
    const sections = renderBibliography(cited, "aglc4", court);
    const all = headings(sections);
    expect(
      isAscending(
        positions(all, [
          "Part A — Authorities to be read from at the hearing",
          "Part B — Authorities to be referred to but not read from",
          "Part C — Textbooks, articles and extrinsic materials",
        ])
      )
    ).toBe(true);
    const partC = entriesOf(sections, "Textbooks, articles and extrinsic materials");
    expect(partC.some((t) => t.includes("Luntz"))).toBe(true);
    expect(partC.some((t) => t.includes("Due Deference"))).toBe(true);
  });

  test("part-abc override: an empty part is rendered as 'None'", () => {
    const court: CourtOptions = { preset: "HCA", overrides: { loaType: "part-abc" } };
    const sections = renderBibliography([maboReported, cthNativeTitleAct], "aglc4", court);
    const partA = sections.find((s) => s.heading.startsWith("Part A"));
    expect(partA?.entries.map(runsToPlainText)).toEqual(["None"]);
  });

  test("three-part-tas override (Tas SC PD 3 of 2022): Part 1 cited cases, Part 2 other cases, Part 3 legislation", () => {
    const court: CourtOptions = { preset: "HCA", overrides: { loaType: "three-part-tas" } };
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const } : c
    );
    const sections = renderBibliography(cited, "aglc4", court);
    expect(headings(sections)).toEqual([
      "Part 1 — Authorities counsel intends to cite",
      "Cases",
      "Part 2 — Authorities that might be referred to but not cited",
      "Cases",
      "Part 3 — Legislation",
      "Legislation",
    ]);
    expect(sections[1].entries.map(runsToPlainText)).toEqual([
      "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23",
    ]);
    expect(sections[5].entries.map(runsToPlainText)).toEqual([
      "Human Rights Act 1998 (UK)",
      "Native Title Act 1993 (Cth)",
    ]);
  });

  test("two-part-read override (SA UCR r 217.8 / FCFCOA): 'expected to be read' headings", () => {
    const court: CourtOptions = { preset: "HCA", overrides: { loaType: "two-part-read" } };
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const } : c
    );
    const all = headings(renderBibliography(cited, "aglc4", court));
    expect(all[0]).toBe("Part A — Authorities expected to be read");
    expect(all).toContain("Part B — Authorities not expected to be read");
  });

  test("generateLoaWithOptions agrees with renderBibliography for every multi-part variant", () => {
    const cited = COURT_SET.map((c) =>
      c.id === maboReported.id ? { ...c, loaPart: "A" as const } : c
    );
    const variants: Array<LoaGenerationOptions["loaType"]> = [
      "part-ab",
      "part-abc",
      "three-part-tas",
      "two-part-read",
    ];
    for (const loaType of variants) {
      const options: LoaGenerationOptions = {
        loaType,
        includeSecondary: false,
        exportTarget: "insert-section",
      };
      const direct = generateLoaWithOptions(cited, options);
      const viaConfig = renderBibliography(cited, "aglc4", {
        preset: "HCA",
        overrides: { loaType },
      });
      expect(headings(direct.sections)).toEqual(headings(viaConfig));
      expect(bibliographyTexts(direct.sections)).toEqual(bibliographyTexts(viaConfig));
      expect(direct.exportTarget).toBe("insert-section");
    }
  });

  test("generateLoaWithOptions (simple) equals the WASC list and adds the PDF note for a pdf target", () => {
    const options: LoaGenerationOptions = {
      loaType: "simple",
      includeSecondary: false,
      exportTarget: "pdf",
    };
    const direct = generateLoaWithOptions(COURT_SET, options);
    const viaConfig = renderBibliography(COURT_SET, "aglc4", { preset: "WASC" });
    expect(bibliographyTexts(direct.sections)).toEqual(bibliographyTexts(viaConfig));
    expect(direct.pdfExportNote).toContain("Save As PDF");
  });

  test("part-ab: Part B may include secondary sources only when generateLoaWithOptions is asked to", () => {
    const options: LoaGenerationOptions = {
      loaType: "part-ab",
      includeSecondary: true,
      exportTarget: "new-document",
    };
    const result = generateLoaWithOptions(COURT_SET, options);
    expect(result.partB?.some((s) => s.heading === "Secondary Sources")).toBe(true);
    expect(result.warnings.some((w) => w.code === "LOA_PART_A_EMPTY")).toBe(true);
  });
});
