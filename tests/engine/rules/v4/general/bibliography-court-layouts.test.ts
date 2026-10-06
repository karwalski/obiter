/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-116, COURT-117, COURT-118: instrument-backed List of Authorities
 * layouts, the legislation version ("as at") field, and the per-layout
 * List of Authorities controls. Each test names the register source
 * (docs/research/court-interop/EVIDENCE-REGISTER.md) and clause.
 */

import { Citation, SourceType } from "../../../../../src/types/citation";
import {
  generateBibliographyForStandard,
  generateCourtListOfAuthorities,
  generateFcaEbookListOfAuthorities,
  generateHcaJbaListOfAuthorities,
  generateLoaWithOptions,
  generateNswcaFourCategoryListOfAuthorities,
  generatePartABListOfAuthorities,
  generateWaOutlineListOfAuthorities,
  WA_NO_CASES_READ_STATEMENT,
  type BibliographySection,
} from "../../../../../src/engine/rules/v4/general/bibliography";
import {
  formatLegislationVersion,
  formatVersionDate,
  hasLegislationVersion,
} from "../../../../../src/engine/court/legislationVersion";
import {
  getLoaCitationControls,
  hasLoaControls,
  loaUsesParts,
} from "../../../../../src/engine/court/loaLayouts";
import { formatCitation } from "../../../../../src/engine/engine";
import type { CitationContext } from "../../../../../src/engine/engine";
import { buildDocumentConfig } from "../../../../../src/engine/standards";
import { serializeCitation, deserializeCitation } from "../../../../../src/store/xmlSerializer";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeCitation(
  overrides: Partial<Citation> & { id: string; sourceType: SourceType }
): Citation {
  return {
    aglcVersion: "4",
    data: {},
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const pape = makeCitation({
  id: "case-pape",
  sourceType: "case.reported",
  data: {
    title: "Pape v Commissioner of Taxation",
    party1: "Pape",
    party2: "Commissioner of Taxation",
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
    mnc: "[2009] HCA 23",
  },
});

const harris = makeCitation({
  id: "case-harris",
  sourceType: "case.reported",
  data: {
    title: "Harris v Harris",
    party1: "Harris",
    party2: "Harris",
    year: 2001,
    volume: 52,
    reportSeries: "NSWLR",
    startingPage: 77,
  },
});

const darcy = makeCitation({
  id: "case-darcy",
  sourceType: "case.reported",
  data: {
    title: "D'Arcy v Myriad Genetics Inc",
    party1: "D'Arcy",
    party2: "Myriad Genetics Inc",
    year: 2014,
    volume: 224,
    reportSeries: "FCR",
    startingPage: 479,
    mnc: "[2014] FCAFC 115",
  },
});

const unreported = makeCitation({
  id: "case-unreported",
  sourceType: "case.unreported.mnc",
  data: {
    title: "Brown v Smith",
    party1: "Brown",
    party2: "Smith",
    mnc: "[2020] NSWCA 1",
  },
});

const ccaAct = makeCitation({
  id: "leg-cca",
  sourceType: "legislation.statute",
  data: {
    title: "Competition and Consumer Act",
    year: 2010,
    jurisdiction: "Cth",
  },
});

const civilLiability = makeCitation({
  id: "leg-cla",
  sourceType: "legislation.statute",
  data: {
    title: "Civil Liability Act",
    year: 2002,
    jurisdiction: "NSW",
    versionDate: "2019-12-15",
  },
});

const bill = makeCitation({
  id: "leg-bill",
  sourceType: "legislation.bill",
  data: {
    title: "Treasury Laws Amendment Bill",
    year: 2024,
    jurisdiction: "Cth",
  },
});

const em = makeCitation({
  id: "leg-em",
  sourceType: "legislation.explanatory",
  data: {
    title: "Explanatory Memorandum, Treasury Laws Amendment Bill 2024 (Cth)",
  },
});

const article = makeCitation({
  id: "sec-french",
  sourceType: "journal.article",
  data: {
    title: "The Rule of Law as a Constitutional Principle",
    authors: [{ givenNames: "Robert", surname: "French" }],
    year: 2010,
    volume: 21,
    journalName: "Public Law Review",
    startingPage: 101,
  },
});

const text = (runs: { text: string }[]): string => runs.map((r) => r.text).join("");
const headings = (sections: BibliographySection[]): string[] => sections.map((s) => s.heading);
const entries = (sections: BibliographySection[], heading: string): string[] =>
  (sections.find((s) => s.heading === heading)?.entries ?? []).map(text);

// ─── COURT-118: legislation version ─────────────────────────────────────────

describe('COURT-118: legislation version ("as at") field', () => {
  test("NSW SC CA 1 cl 37(1) form: an ISO date reads 'as at 15 December 2019'", () => {
    expect(formatVersionDate("2019-12-15")).toBe("15 December 2019");
    expect(formatLegislationVersion({ versionDate: "2019-12-15" })).toBe("as at 15 December 2019");
  });

  test("version kinds: compilation and as enacted", () => {
    expect(
      formatLegislationVersion({ versionDate: "2025-01-01", versionKind: "compilation" })
    ).toBe("compilation as at 1 January 2025");
    expect(formatLegislationVersion({ versionKind: "as-enacted" })).toBe("as enacted");
    expect(formatLegislationVersion({ versionDate: "2020-01-01", versionKind: "as-enacted" })).toBe(
      "as enacted on 1 January 2020"
    );
  });

  test("a hand-typed date is kept as typed; nothing recorded gives no statement", () => {
    expect(formatLegislationVersion({ versionDate: "1 July 2024" })).toBe("as at 1 July 2024");
    expect(formatLegislationVersion({})).toBe("");
    expect(hasLegislationVersion({})).toBe(false);
    expect(hasLegislationVersion({ versionKind: "as-enacted" })).toBe(true);
  });

  test("the HCA Form 27A reason note is added only when asked", () => {
    const data = { versionDate: "2019-12-15", versionNote: "date of the contract" };
    expect(formatLegislationVersion(data)).toBe("as at 15 December 2019");
    expect(formatLegislationVersion(data, true)).toBe(
      "as at 15 December 2019; date of the contract"
    );
  });

  test("numeric-looking values from the XML store are read with toText", () => {
    expect(formatLegislationVersion({ versionDate: 2019 as unknown as string })).toBe("as at 2019");
  });

  test("the fields round-trip through the XML store", () => {
    const withVersion: Citation = {
      ...civilLiability,
      data: {
        ...civilLiability.data,
        versionKind: "compilation",
        versionNote: "law at the date of the accident",
      },
    };
    const back = deserializeCitation(serializeCitation(withVersion));
    expect(back.data.versionDate).toBe("2019-12-15");
    expect(back.data.versionKind).toBe("compilation");
    expect(back.data.versionNote).toBe("law at the date of the accident");
  });

  test("AGLC4 r 3.1 footnotes never show the version, in academic or court mode", () => {
    const first: CitationContext = {
      footnoteNumber: 1,
      isFirstCitation: true,
      isSameAsPreceding: false,
      precedingFootnoteCitationCount: 0,
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    const bare: Citation = { ...civilLiability, data: { ...civilLiability.data } };
    delete bare.data.versionDate;
    for (const config of [
      buildDocumentConfig({ standardId: "aglc4", writingMode: "academic" }),
      buildDocumentConfig({
        standardId: "aglc4",
        writingMode: "court",
        courtJurisdiction: "NSWCA",
      }),
    ]) {
      const withVersion = text(formatCitation(civilLiability, first, config));
      expect(withVersion).toBe(text(formatCitation(bare, first, config)));
      expect(withVersion).not.toContain("as at");
    }
  });

  test("the academic AGLC4 bibliography (r 1.13) never shows the version", () => {
    const sections = generateBibliographyForStandard([civilLiability], "aglc", "academic");
    expect(sections.flatMap((s) => s.entries.map(text)).join(" ")).not.toContain("as at");
  });

  test("existing court layouts do not show the version (only COURT-117 layouts that require it)", () => {
    for (const loaType of [
      "simple",
      "part-ab",
      "part-abc",
      "two-part-read",
      "three-part-tas",
    ] as const) {
      const { sections } = generateCourtListOfAuthorities([civilLiability], loaType);
      expect(sections.flatMap((s) => s.entries.map(text)).join(" ")).not.toContain("as at");
    }
  });
});

// ─── COURT-117: HCA Joint Book Parts A to E ─────────────────────────────────

describe("COURT-117: hca-jba-five-part (HCA PD 2 of 2024; register HCA-1, O-R3)", () => {
  const principal: Citation = {
    ...ccaAct,
    data: {
      ...ccaAct.data,
      jbaPrincipal: "true",
      versionDate: "2024-07-01",
      versionNote: "date of the conduct",
    },
  };
  const cited = [{ ...pape, loaPart: "A" as const }, darcy, principal, civilLiability, article];

  test("Parts A to E in order; empty parts left out", () => {
    const { sections } = generateHcaJbaListOfAuthorities(cited);
    expect(headings(sections)).toEqual([
      "Part A — Principal legislation",
      "Part B — Other legislation",
      "Part C — Cases reported in the Commonwealth Law Reports",
      "Part D — Cases from other report series",
      "Part E — Other materials",
    ]);
  });

  test("legislation carries the version with the Form 27A reason note (HCA-2)", () => {
    const { sections } = generateHcaJbaListOfAuthorities(cited);
    expect(entries(sections, "Part A — Principal legislation")[0]).toContain(
      "(as at 1 July 2024; date of the conduct)"
    );
    expect(entries(sections, "Part B — Other legislation")[0]).toContain(
      "(as at 15 December 2019)"
    );
  });

  test("CLR cases in Part C, other series in Part D", () => {
    const { sections } = generateHcaJbaListOfAuthorities(cited);
    expect(
      entries(sections, "Part C — Cases reported in the Commonwealth Law Reports")[0]
    ).toContain("Pape");
    expect(entries(sections, "Part D — Cases from other report series")[0]).toContain("D'Arcy");
  });

  test("warns about cases counsel will not take the Court to, and legislation without a version", () => {
    const { warnings } = generateHcaJbaListOfAuthorities([
      ...cited,
      { ...ccaAct, id: "leg-cca-2" },
    ]);
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(["JBA_CASES_NOT_FOR_READING", "LOA_LEGISLATION_VERSION_MISSING"])
    );
  });

  test("dispatches through the court-mode bibliography and generateLoaWithOptions", () => {
    const viaStandard = generateBibliographyForStandard(
      cited,
      "aglc",
      "court",
      "hca-jba-five-part"
    );
    const viaOptions = generateLoaWithOptions(cited, {
      loaType: "hca-jba-five-part",
      includeSecondary: false,
      exportTarget: "pdf",
    });
    expect(headings(viaStandard)).toEqual(headings(viaOptions.sections));
    expect(viaOptions.pdfExportNote).toContain("Save As PDF");
  });
});

// ─── COURT-117: NSW Court of Appeal four categories ─────────────────────────

describe("COURT-117: nswca-four-category (NSW SC CA 1 cl 37; register NSW-2, O-R12)", () => {
  test("cl 37(1)–(4): legislation, cases read in three groups, cited not read, secondary", () => {
    const cited = [
      { ...pape, loaPart: "A" as const },
      { ...darcy, loaPart: "A" as const },
      { ...unreported, loaPart: "A" as const },
      harris,
      civilLiability,
      em,
      article,
    ];
    const { sections } = generateNswcaFourCategoryListOfAuthorities(cited);
    expect(headings(sections)).toEqual([
      "1 Legislation",
      "2 Cases from which passages will be read",
      "(a) Cases reported in the CLR and NSWLR",
      "(b) Cases from other reports",
      "(c) Other cases",
      "3 Cases cited but not read",
      "4 Secondary sources",
    ]);
    // cl 37(1): the version date ("as at").
    expect(entries(sections, "1 Legislation")).toEqual([
      "Civil Liability Act 2002 (NSW) (as at 15 December 2019)",
    ]);
    expect(entries(sections, "(a) Cases reported in the CLR and NSWLR")[0]).toContain("Pape");
    expect(entries(sections, "(b) Cases from other reports")[0]).toContain("D'Arcy");
    expect(entries(sections, "(c) Other cases")[0]).toContain("Brown v Smith");
    expect(entries(sections, "3 Cases cited but not read")[0]).toContain("Harris");
    // cl 37(4) examples include explanatory notes: extrinsic material is secondary.
    const secondary = entries(sections, "4 Secondary sources");
    expect(secondary).toHaveLength(2);
  });

  test("cl 37(2)(a) cap: more than 10 CLR and NSWLR cases read warns", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({
      ...pape,
      id: `pape-${i}`,
      loaPart: "A" as const,
      data: { ...pape.data, party1: `Pape ${String.fromCharCode(65 + i)}` },
    }));
    const { warnings } = generateNswcaFourCategoryListOfAuthorities(many);
    expect(warnings.some((w) => w.code === "LOA_NSWCA_PRINCIPAL_CAP")).toBe(true);
    const ten = generateNswcaFourCategoryListOfAuthorities(many.slice(0, 10));
    expect(ten.warnings.some((w) => w.code === "LOA_NSWCA_PRINCIPAL_CAP")).toBe(false);
  });

  test("cl 37(2)(b) cap: more than five cases from other reports read warns", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      ...darcy,
      id: `darcy-${i}`,
      loaPart: "A" as const,
    }));
    const { warnings } = generateNswcaFourCategoryListOfAuthorities(many);
    expect(warnings.some((w) => w.code === "LOA_NSWCA_OTHER_REPORTS_CAP")).toBe(true);
  });

  test("cl 37(1): legislation without a version date warns", () => {
    const { warnings } = generateNswcaFourCategoryListOfAuthorities([ccaAct]);
    expect(warnings).toEqual([
      expect.objectContaining({ level: "warning", code: "LOA_LEGISLATION_VERSION_MISSING" }),
    ]);
  });

  test("cl 37 has no key-authority asterisk: a stale isKeyAuthority flag is not printed", () => {
    const { sections } = generateNswcaFourCategoryListOfAuthorities([
      { ...pape, loaPart: "A", isKeyAuthority: true },
    ]);
    expect(entries(sections, "(a) Cases reported in the CLR and NSWLR")[0].startsWith("* ")).toBe(
      false
    );
    expect(getLoaCitationControls("nswca-four-category", "case.reported").keyAuthority).toBe(false);
  });
});

// ─── COURT-117: FCA eBook sections ──────────────────────────────────────────

describe("COURT-117: fca-ebook-sections (FCA GPN-eBOOKS cl 7.2, 7.4; register FCA-2, O-R1)", () => {
  test("authorities, legislation, bills and explanatory material, each alphabetical; no Part A / B", () => {
    const { sections } = generateFcaEbookListOfAuthorities([
      { ...pape, loaPart: "A" },
      darcy,
      article,
      civilLiability,
      ccaAct,
      bill,
      em,
    ]);
    expect(headings(sections)).toEqual([
      "Authorities",
      "Legislation",
      "Bills and explanatory material",
    ]);
    const authorities = entries(sections, "Authorities");
    expect(authorities).toHaveLength(3);
    expect(authorities[0]).toContain("D'Arcy");
    const legislation = entries(sections, "Legislation");
    expect(legislation[0]).toContain("Civil Liability Act 2002 (NSW) (as at 15 December 2019)");
    expect(legislation[1]).toContain("Competition and Consumer Act 2010 (Cth)");
    expect(entries(sections, "Bills and explanatory material")).toHaveLength(2);
    expect(headings(sections).join(" ")).not.toContain("Part A");
  });

  test("GPN-AUTH (7 May 2025) has no key-authority mark: a stale isKeyAuthority flag is not printed", () => {
    const { sections } = generateFcaEbookListOfAuthorities([{ ...pape, isKeyAuthority: true }]);
    expect(entries(sections, "Authorities")[0].startsWith("* ")).toBe(false);
  });

  test("cl 7.4: an info warning names legislation with no version in force", () => {
    const { warnings } = generateFcaEbookListOfAuthorities([ccaAct]);
    expect(warnings[0]).toMatchObject({ level: "info", code: "LOA_LEGISLATION_VERSION_MISSING" });
  });
});

// ─── COURT-117: WA PD 2.1 list ──────────────────────────────────────────────

describe("COURT-117: wa-outline-asterisk (WA PD 2.1 cl 11–13; register WA-1)", () => {
  test("cl 12: cases then legislation, each alphabetical", () => {
    const { sections } = generateWaOutlineListOfAuthorities([
      pape,
      { ...darcy, loaPart: "A" },
      ccaAct,
      civilLiability,
      article,
    ]);
    expect(headings(sections)).toEqual(["Cases", "Legislation"]);
    expect(entries(sections, "Cases")[0]).toContain("D'Arcy");
    expect(entries(sections, "Legislation")[0]).toContain("Civil Liability Act");
    // WA lists do not carry the version (not required by PD 2.1).
    expect(entries(sections, "Legislation")[0]).not.toContain("as at");
  });

  test("cl 13: a case to be read has an asterisk and the pages or paragraphs to be read", () => {
    const { sections } = generateWaOutlineListOfAuthorities([
      pape,
      { ...darcy, loaPart: "A", data: { ...darcy.data, loaReadPassages: "[29]–[35]" } },
    ]);
    const cases = entries(sections, "Cases");
    expect(cases[0].startsWith("* D'Arcy")).toBe(true);
    expect(cases[0].endsWith("(to be read: [29]–[35])")).toBe(true);
    expect(cases[1].startsWith("Pape")).toBe(true);
  });

  test("cl 13: when no case will be read, the list ends with a statement", () => {
    const { sections } = generateWaOutlineListOfAuthorities([pape, ccaAct]);
    const last = sections[sections.length - 1];
    expect(last.heading).toBe("");
    expect(last.entries.map(text)).toEqual([WA_NO_CASES_READ_STATEMENT]);
  });

  test("a key authority flag (the earlier WA marker) also counts as to be read", () => {
    const { sections } = generateWaOutlineListOfAuthorities([{ ...pape, isKeyAuthority: true }]);
    expect(entries(sections, "Cases")[0].startsWith("* Pape")).toBe(true);
    expect(sections.some((s) => s.heading === "")).toBe(false);
  });
});

// ─── COURT-116: Part A placement and the empty-Part-A warning ───────────────

describe("COURT-116: Part A placement from the loaPart control", () => {
  test("setting loaPart 'A' moves the authority into Part A and clears LOA_PART_A_EMPTY", () => {
    const before = generatePartABListOfAuthorities([pape, darcy]);
    expect(before.warnings.some((w) => w.code === "LOA_PART_A_EMPTY")).toBe(true);
    const after = generatePartABListOfAuthorities([{ ...pape, loaPart: "A" }, darcy]);
    expect(after.warnings.some((w) => w.code === "LOA_PART_A_EMPTY")).toBe(false);
    expect(after.partA[0].entries.map(text)[0]).toContain("Pape");
    expect(after.partB[0].entries.map(text)[0]).toContain("D'Arcy");
  });

  test("generateCourtListOfAuthorities returns the warnings the List of Authorities view shows", () => {
    const empty = generateCourtListOfAuthorities([pape], "part-abc");
    expect(empty.warnings.some((w) => w.code === "LOA_PART_A_EMPTY")).toBe(true);
    const set = generateCourtListOfAuthorities([{ ...pape, loaPart: "A" }], "part-abc");
    expect(set.warnings.some((w) => w.code === "LOA_PART_A_EMPTY")).toBe(false);
    expect(generateCourtListOfAuthorities([pape], "off").sections).toEqual([]);
  });
});

describe("COURT-116: List of Authorities controls per layout", () => {
  test("no controls for academic documents, 'off' and 'simple'", () => {
    for (const loaType of [undefined, "off", "simple"] as const) {
      expect(hasLoaControls(getLoaCitationControls(loaType, "case.reported"))).toBe(false);
    }
    expect(loaUsesParts("simple")).toBe(false);
    expect(loaUsesParts("part-ab")).toBe(true);
  });

  test("Part A / B layouts place cases and legislation by part, with the key-authority marker", () => {
    const c = getLoaCitationControls("part-ab", "case.reported");
    expect(c.part?.a).toContain("Part A");
    expect(c.keyAuthority).toBe(true);
    expect(getLoaCitationControls("part-ab", "legislation.statute").part).toBeDefined();
    // Tas PD 3 of 2022: legislation always goes to Part 3.
    expect(getLoaCitationControls("three-part-tas", "legislation.statute").part).toBeUndefined();
  });

  test("HCA: principal legislation and the version; cases by the counsel-will-take-the-Court-to mark", () => {
    const leg = getLoaCitationControls("hca-jba-five-part", "legislation.statute");
    expect(leg.principalLegislation).toBe(true);
    expect(leg.legislationVersion).toBe(true);
    expect(leg.part).toBeUndefined();
    expect(getLoaCitationControls("hca-jba-five-part", "case.reported").part).toBeDefined();
  });

  test("WA: cases read with passages; FCA: version only; NSWCA: version and read cases", () => {
    const wa = getLoaCitationControls("wa-outline-asterisk", "case.reported");
    expect(wa.readPassages).toBe(true);
    expect(wa.part).toBeDefined();
    const fcaCase = getLoaCitationControls("fca-ebook-sections", "case.reported");
    expect(hasLoaControls(fcaCase)).toBe(false);
    expect(
      getLoaCitationControls("fca-ebook-sections", "legislation.statute").legislationVersion
    ).toBe(true);
    expect(
      getLoaCitationControls("nswca-four-category", "legislation.statute").legislationVersion
    ).toBe(true);
    expect(getLoaCitationControls("nswca-four-category", "case.reported").part).toBeDefined();
    // Bills are not enacted legislation: no version control.
    expect(
      getLoaCitationControls("nswca-four-category", "legislation.bill").legislationVersion
    ).toBe(false);
  });
});
