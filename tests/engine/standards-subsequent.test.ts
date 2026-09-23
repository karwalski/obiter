/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-015 — Standard-aware subsequent references and first-citation suffix
 * gating.
 *
 * Rule sources are the paraphrased notes in docs/standards-rule-notes.md:
 * OSCOLA 5 §1.2.1/§1.2.3 (brief identifier + (n X) + pinpoint, no ibid,
 * declared short forms for legislation and treaties), §2.1.2 (first-named
 * party, italic including the v), OSCOLA 4 §1.2.1/§1.2.3 (lower-case ibid,
 * unquoted declarations), NZLSG 3 §2.3.1 (rule 1 pinpoint-only, rule 2
 * ', above n X, at', legislation by short title alone), §2.3.2 (no tags
 * written). The AGLC path is asserted unchanged.
 */

import {
  formatCitation,
  formatCitationWithFormat,
  getFormattedPreview,
} from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import {
  declaresShortForm,
  formatShortTitleIntroduction,
  resolveIbid,
  resolveSubsequentReference,
  resolveSubsequentReferenceWithKind,
} from "../../src/engine/resolver";
import type { SubsequentReferenceContext } from "../../src/engine/resolver";
import { getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { Citation, Pinpoint } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";
import {
  bookLuntz,
  maboReported,
  nzBrooker,
  nzPrivacyAct,
  treatyRomeStatute,
  ukCorr,
  ukHra,
} from "../fixtures/standards/citations";

const aglc4 = getStandardConfig("aglc4");
const oscola5 = getStandardConfig("oscola5");
const oscola4 = getStandardConfig("oscola4");
const nzlsg3 = getStandardConfig("nzlsg3");

const PAGE_42: Pinpoint = { type: "page", value: "42" };
const PARA_42: Pinpoint = { type: "paragraph", value: "[42]" };
const PARA_50: Pinpoint = { type: "paragraph", value: "[50]" };
const SECTION_6: Pinpoint = { type: "section", value: "6" };
const ARTICLE_7: Pinpoint = { type: "article", value: "7" };

const text = (runs: FormattedRun[] | null): string =>
  runs === null ? "<null>" : runs.map((r) => r.text).join("");

/** Footnote 3, first cited in footnote 1, a different source in footnote 2. */
function laterFootnote(overrides: Partial<CitationContext> = {}): CitationContext {
  return {
    footnoteNumber: 3,
    isFirstCitation: false,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 1,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
    ...overrides,
  };
}

/** Footnote 2, immediately after the full citation in footnote 1. */
function immediatelyAfter(overrides: Partial<CitationContext> = {}): CitationContext {
  return laterFootnote({ footnoteNumber: 2, isSameAsPreceding: true, ...overrides });
}

function resolverContext(
  context: CitationContext,
  config: CitationConfig
): SubsequentReferenceContext {
  return {
    isFirstCitation: context.isFirstCitation,
    isSameAsPreceding: context.isSameAsPreceding,
    precedingFootnoteCitationCount: context.precedingFootnoteCitationCount,
    precedingPinpoint: context.precedingPinpoint,
    currentPinpoint: context.currentPinpoint,
    firstFootnoteNumber: context.firstFootnoteNumber,
    isWithinSameFootnote: context.isWithinSameFootnote,
    formatPreference: context.formatPreference,
    config,
  };
}

/** A form-entered case with parties but no short title. */
const phelps: Citation = {
  ...ukCorr,
  id: "phelps",
  data: { ...ukCorr.data, party1: "Phelps", party2: "Hillingdon London Borough Council" },
  shortTitle: undefined,
};

/** An Act with no declared short form. */
const undeclaredAct: Citation = { ...ukHra, id: "undeclared", shortTitle: undefined };

const explanatoryNote: Citation = {
  id: "note",
  aglcVersion: "4",
  sourceType: "explanatory_note",
  data: { noteText: "See generally Part II." },
  tags: [],
  createdAt: "2026-09-22T00:00:00Z",
  modifiedAt: "2026-09-22T00:00:00Z",
};

// ─── declaresShortForm ──────────────────────────────────────────────────────

describe("STD-015 declaresShortForm: which first citations declare a short form", () => {
  test("AGLC4 1.4.4: every source", () => {
    expect(declaresShortForm("case.reported", aglc4)).toBe(true);
    expect(declaresShortForm("book", aglc4)).toBe(true);
    expect(declaresShortForm("legislation.statute", aglc4)).toBe(true);
    expect(declaresShortForm("book")).toBe(true);
  });

  test("OSCOLA 5 §1.2.1/§4.1.1/§4.2.2/§4.4.1: legislation, treaties, the UN Charter, UN resolutions and OJ instruments only", () => {
    for (const type of [
      "legislation.statute",
      "legislation.delegated",
      "legislation.bill",
      "treaty",
      "treaty.mou",
      "un.charter",
      "un.document",
      "eu.official_journal",
    ] as const) {
      expect(declaresShortForm(type, oscola5)).toBe(true);
      expect(declaresShortForm(type, oscola4)).toBe(true);
    }
    for (const type of [
      "case.reported",
      "case.unreported.mnc",
      "book",
      "journal.article",
      "echr.decision",
      "eu.court",
      "hansard",
    ] as const) {
      expect(declaresShortForm(type, oscola5)).toBe(false);
    }
  });

  test("NZLSG 3 §2.3.2: never", () => {
    expect(declaresShortForm("case.reported", nzlsg3)).toBe(false);
    expect(declaresShortForm("legislation.statute", nzlsg3)).toBe(false);
    expect(declaresShortForm("book", nzlsg3)).toBe(false);
  });

  test("the config field wins over the family default", () => {
    expect(declaresShortForm("case.reported", { ...oscola5, shortTitleIntroduction: "aglc" })).toBe(
      true
    );
    expect(
      declaresShortForm("legislation.statute", { ...aglc4, shortTitleIntroduction: "none" })
    ).toBe(false);
  });
});

// ─── First-citation suffixes per standard ──────────────────────────────────

describe("STD-015 first-citation suffix gating", () => {
  test("AGLC4 1.4.4: the short title introduction is appended (unchanged)", () => {
    expect(text(formatCitation(ukCorr, undefined, aglc4))).toBe(
      "Corr v IBC Vehicles Ltd [2008] 1 AC 884 (‘Corr’)"
    );
  });

  test("OSCOLA 5 §2.1.2: a case declares nothing", () => {
    expect(text(formatCitation(ukCorr, undefined, oscola5))).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884"
    );
  });

  test("OSCOLA 5 §1.2.1: legislation declares its short form, roman, in single quotation marks", () => {
    const runs = formatCitation(ukHra, undefined, oscola5);
    expect(text(runs)).toBe("Human Rights Act 1998 (‘HRA 1998’)");
    expect(runs.some((r) => r.italic)).toBe(false);
  });

  test("OSCOLA 4 §1.2.1: the declaration has no quotation marks", () => {
    expect(text(formatCitation(ukHra, undefined, oscola4))).toBe(
      "Human Rights Act 1998 (HRA 1998)"
    );
  });

  test("OSCOLA 5 §4.1.1: a treaty declares its short form after the series", () => {
    expect(text(formatCitation(treatyRomeStatute, undefined, oscola5))).toMatch(
      /2187 UNTS 3 \(‘Rome Statute’\)$/
    );
  });

  test("OSCOLA 5 §3.1.5: a book declares nothing", () => {
    expect(text(formatCitation(bookLuntz, undefined, oscola5))).not.toContain("(‘Luntz’)");
  });

  test("NZLSG 3 §2.3.2: nothing is declared for any source", () => {
    expect(text(formatCitation(nzBrooker, undefined, nzlsg3))).toBe(
      "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91"
    );
    expect(text(formatCitation(nzPrivacyAct, undefined, nzlsg3))).toBe("Privacy Act 2020");
    expect(text(formatCitation(bookLuntz, undefined, nzlsg3))).not.toContain("(‘Luntz’)");
  });

  test("a subsequent full citation (forced full) never repeats the declaration", () => {
    expect(text(formatCitation(ukHra, laterFootnote({ formatPreference: "full" }), oscola5))).toBe(
      "Human Rights Act 1998"
    );
  });

  test("formatShortTitleIntroduction with an OSCOLA config is roman; with AGLC italic (unchanged)", () => {
    expect(formatShortTitleIntroduction("HRA 1998", "legislation.statute", oscola5)).toEqual([
      { text: "(‘" },
      { text: "HRA 1998" },
      { text: "’)" },
    ]);
    expect(formatShortTitleIntroduction("HRA 1998", "legislation.statute", oscola4)).toEqual([
      { text: "(HRA 1998)" },
    ]);
    expect(formatShortTitleIntroduction("Mabo", "case.reported")).toEqual([
      { text: "(‘" },
      { text: "Mabo", italic: true },
      { text: "’)" },
    ]);
  });
});

// ─── Preview and footnote agree ─────────────────────────────────────────────

describe("STD-015 getFormattedPreview shows the same first citation as the footnote", () => {
  test.each<[string, CitationConfig, Citation]>([
    ["OSCOLA 5 legislation (declared)", oscola5, ukHra],
    ["OSCOLA 4 legislation (unquoted declaration)", oscola4, ukHra],
    ["OSCOLA 5 case (no declaration)", oscola5, ukCorr],
    ["OSCOLA 5 treaty (declared)", oscola5, treatyRomeStatute],
    ["NZLSG 3 case", nzlsg3, nzBrooker],
    ["NZLSG 3 legislation", nzlsg3, nzPrivacyAct],
    ["NZLSG 3 book", nzlsg3, bookLuntz],
  ])("%s", (_, config, citation) => {
    const footnote = text(formatCitation(citation, undefined, config));
    expect(text(getFormattedPreview(citation, config))).toBe(`${footnote}.`);
  });

  test("the AGLC preview is unchanged: the Rule 1.4.4 suffix is the refresher's", () => {
    expect(text(getFormattedPreview(maboReported, aglc4))).toBe(
      "Mabo v Queensland (1992) 175 CLR 1."
    );
  });
});

// ─── OSCOLA 5 ───────────────────────────────────────────────────────────────

describe("STD-015 OSCOLA 5 subsequent references (§1.2.1, §1.2.3, §2.1.2)", () => {
  test("§2.1.2: a case is short-formed by its reference name in italics with (n X)", () => {
    const runs = resolveSubsequentReference(ukCorr, resolverContext(laterFootnote(), oscola5));
    expect(text(runs)).toBe("Corr (n 1)");
    expect(runs?.[0]).toEqual({ text: "Corr", italic: true });
  });

  test("§2.1.2: a case without a short title falls back to its first-named party ('Phelps (n 14)')", () => {
    const runs = resolveSubsequentReference(
      phelps,
      resolverContext(laterFootnote({ firstFootnoteNumber: 14 }), oscola5)
    );
    expect(text(runs)).toBe("Phelps (n 14)");
    expect(runs?.[0].italic).toBe(true);
  });

  test("§1.2.1: the pinpoint follows (n X) with no comma — 'Austin (n 1) [34]', 'Stevens (n 1) 110'", () => {
    expect(text(formatCitation(ukCorr, laterFootnote({ currentPinpoint: PARA_42 }), oscola5))).toBe(
      "Corr (n 1) [42]"
    );
    expect(
      text(formatCitation(bookLuntz, laterFootnote({ currentPinpoint: PAGE_42 }), oscola5))
    ).toBe("Luntz (n 1) 42");
  });

  test("§1.2.3: ibid is never used — the immediately following footnote repeats the short form", () => {
    expect(text(formatCitation(ukCorr, immediatelyAfter(), oscola5))).toBe("Corr (n 1)");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ currentPinpoint: PAGE_42 }), oscola5))
    ).toBe("Corr (n 1) 42");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ formatPreference: "ibid" }), oscola5))
    ).toBe("Corr (n 1)");
  });

  test("§1.2.1: declared legislation short form is used alone, then a comma and the provision ('SARAH, s 2')", () => {
    const runs = resolveSubsequentReference(
      ukHra,
      resolverContext(laterFootnote({ currentPinpoint: SECTION_6 }), oscola5)
    );
    expect(text(runs)).toBe("HRA 1998, s 6");
    expect(runs?.some((r) => r.italic)).toBe(false);
    expect(text(formatCitation(ukHra, laterFootnote(), oscola5))).toBe("HRA 1998");
    expect(text(formatCitation(ukHra, immediatelyAfter(), oscola5))).toBe("HRA 1998");
  });

  test("§4.1.1: a treaty's declared short form likewise ('UNCLOS, art 101')", () => {
    expect(
      text(
        formatCitation(treatyRomeStatute, laterFootnote({ currentPinpoint: ARTICLE_7 }), oscola5)
      )
    ).toBe("Rome Statute, art 7");
    expect(text(formatCitation(treatyRomeStatute, laterFootnote(), oscola5))).toBe("Rome Statute");
  });

  test("legislation with no declared short form repeats the full citation (OSCOLA 4 §1.2.1; DECISION-040 for the 5th edition)", () => {
    const later = laterFootnote({ currentPinpoint: SECTION_6 });
    expect(resolveSubsequentReference(undeclaredAct, resolverContext(later, oscola5))).toBeNull();
    const formatted = formatCitationWithFormat(undeclaredAct, later, oscola5);
    expect(text(formatted.runs)).toBe("Human Rights Act 1998, s 6");
    expect(formatted.renderedFormat).toBe("full");
  });

  test("no AGLC 1.4.6 'at' construct within a footnote — the §1.2.1 form is repeated", () => {
    expect(
      text(
        formatCitation(
          ukCorr,
          laterFootnote({ isWithinSameFootnote: true, currentPinpoint: PARA_50 }),
          oscola5
        )
      )
    ).toBe("Corr (n 1) [50]");
  });

  test("no above/below cross-reference constructs", () => {
    const context = resolverContext(laterFootnote({ currentPinpoint: PAGE_42 }), oscola5);
    expect(
      text(resolveSubsequentReference(ukCorr, { ...context, crossReferenceDirection: "above" }))
    ).toBe("Corr (n 1) 42");
    expect(
      text(
        resolveSubsequentReference(ukCorr, {
          ...context,
          crossReferenceDirection: "auto",
          footnoteNumber: 3,
        })
      )
    ).toBe("Corr (n 1) 42");
  });

  test("formatPreference is honoured: full renders the full citation, short the short form", () => {
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ formatPreference: "full" }), oscola5))
    ).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ formatPreference: "short" }), oscola5))
    ).toBe("Corr (n 1)");
  });

  test("an explanatory note is untouched", () => {
    expect(
      resolveSubsequentReference(explanatoryNote, resolverContext(immediatelyAfter(), oscola5))
    ).toBeNull();
  });
});

// ─── OSCOLA 4 ───────────────────────────────────────────────────────────────

describe("STD-015 OSCOLA 4 subsequent references (§1.2.1, §1.2.3)", () => {
  test("§1.2.3: lower-case 'ibid' for the immediately preceding footnote, never capitalised", () => {
    expect(text(formatCitation(ukCorr, immediatelyAfter(), oscola4))).toBe("ibid");
  });

  test("§1.2.1: 'ibid 638', 'ibid [34]' — the pinpoint after a space", () => {
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ currentPinpoint: PAGE_42 }), oscola4))
    ).toBe("ibid 42");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ currentPinpoint: PARA_42 }), oscola4))
    ).toBe("ibid [42]");
    expect(text(resolveIbid(PAGE_42, undefined, oscola4))).toBe("ibid 42");
  });

  test("ibid keeps the AGLC eligibility guards (one source in the preceding footnote; not when the pinpoint is dropped)", () => {
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ precedingFootnoteCitationCount: 2 }), oscola4))
    ).toBe("Corr (n 1)");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ precedingPinpoint: PAGE_42 }), oscola4))
    ).toBe("Corr (n 1)");
  });

  test("an explicit ibid preference is honoured; short and full likewise", () => {
    expect(
      text(
        formatCitation(
          ukCorr,
          immediatelyAfter({ formatPreference: "ibid", currentPinpoint: PAGE_42 }),
          oscola4
        )
      )
    ).toBe("ibid 42");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ formatPreference: "short" }), oscola4))
    ).toBe("Corr (n 1)");
    expect(
      text(formatCitation(ukCorr, immediatelyAfter({ formatPreference: "full" }), oscola4))
    ).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884");
  });

  test("a signal before ibid leaves it lower case", () => {
    const seen: Citation = { ...ukCorr, signal: "See" };
    expect(text(formatCitation(seen, immediatelyAfter(), oscola4))).toBe("See ibid");
  });

  test("§1.2.1: declared short forms as in the 5th edition ('NIA 1965, s 12')", () => {
    expect(
      text(formatCitation(ukHra, laterFootnote({ currentPinpoint: SECTION_6 }), oscola4))
    ).toBe("HRA 1998, s 6");
  });
});

// ─── NZLSG 3 ────────────────────────────────────────────────────────────────

describe("STD-015 NZLSG 3 subsequent references (§2.3.1)", () => {
  test("§2.3.1(a) rule 2: identifier, comma, above n X, comma, at pinpoint — italic case tag", () => {
    const runs = resolveSubsequentReference(
      nzBrooker,
      resolverContext(laterFootnote({ currentPinpoint: PARA_42 }), nzlsg3)
    );
    expect(text(runs)).toBe("Brooker, above n 1, at [42]");
    expect(runs?.[0]).toEqual({ text: "Brooker", italic: true });
    expect(text(formatCitation(nzBrooker, laterFootnote(), nzlsg3))).toBe("Brooker, above n 1");
  });

  test("§2.3.1(a)(i): a case without a tag repeats the case name ('Rainy Sky SA v Kookmin Bank, above n 10')", () => {
    const runs = resolveSubsequentReference(
      phelps,
      resolverContext(laterFootnote({ firstFootnoteNumber: 10 }), nzlsg3)
    );
    expect(text(runs)).toBe("Phelps v Hillingdon London Borough Council, above n 10");
    expect(runs?.[0].italic).toBe(true);
  });

  test("§2.3.1(a) rule 1: the immediately preceding source is cited by its capitalised pinpoint alone", () => {
    expect(
      text(formatCitation(nzBrooker, immediatelyAfter({ currentPinpoint: PARA_42 }), nzlsg3))
    ).toBe("At [42]");
    expect(
      text(formatCitation(bookLuntz, immediatelyAfter({ currentPinpoint: PAGE_42 }), nzlsg3))
    ).toBe("At 42");
    expect(
      text(formatCitation(nzPrivacyAct, immediatelyAfter({ currentPinpoint: SECTION_6 }), nzlsg3))
    ).toBe("Section 6");
  });

  test("rule 1 needs a pinpoint and a single-source preceding footnote; ibid is never used", () => {
    expect(text(formatCitation(nzBrooker, immediatelyAfter(), nzlsg3))).toBe("Brooker, above n 1");
    expect(
      text(
        formatCitation(
          nzBrooker,
          immediatelyAfter({ currentPinpoint: PARA_42, precedingFootnoteCitationCount: 2 }),
          nzlsg3
        )
      )
    ).toBe("Brooker, above n 1, at [42]");
    expect(
      text(
        formatCitation(
          nzBrooker,
          immediatelyAfter({ formatPreference: "ibid", currentPinpoint: PARA_42 }),
          nzlsg3
        )
      )
    ).toBe("At [42]");
  });

  test("a short preference always takes rule 2; a full preference the full citation", () => {
    expect(
      text(
        formatCitation(
          nzBrooker,
          immediatelyAfter({ formatPreference: "short", currentPinpoint: PARA_42 }),
          nzlsg3
        )
      )
    ).toBe("Brooker, above n 1, at [42]");
    const full = formatCitationWithFormat(
      nzBrooker,
      immediatelyAfter({ formatPreference: "full" }),
      nzlsg3
    );
    expect(text(full.runs)).toBe("Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91");
    expect(full.renderedFormat).toBe("full");
  });

  test("§2.3.1(a)(ii): legislation by short title without the year, comma, provision; never 'above n'", () => {
    expect(
      text(formatCitation(nzPrivacyAct, laterFootnote({ currentPinpoint: SECTION_6 }), nzlsg3))
    ).toBe("Privacy Act, s 6");
    expect(text(formatCitation(ukHra, laterFootnote({ currentPinpoint: SECTION_6 }), nzlsg3))).toBe(
      "Human Rights Act, s 6"
    );
    const yearInTitle: Citation = {
      ...nzPrivacyAct,
      id: "crimes",
      data: { title: "Crimes Act 1961", jurisdiction: "NZ" },
    };
    expect(
      text(formatCitation(yearInTitle, laterFootnote({ currentPinpoint: SECTION_6 }), nzlsg3))
    ).toBe("Crimes Act, s 6");
    expect(text(formatCitation(nzPrivacyAct, laterFootnote(), nzlsg3))).toBe("Privacy Act");
  });

  test("§2.3.1(a)(iii): a treaty's provision keeps its label after 'above n' (', art 7')", () => {
    expect(
      text(formatCitation(treatyRomeStatute, laterFootnote({ currentPinpoint: ARTICLE_7 }), nzlsg3))
    ).toBe("Rome Statute, above n 1, art 7");
  });

  test("no AGLC 1.4.6 'at' construct within a footnote — rule 2 is repeated", () => {
    expect(
      text(
        formatCitation(
          nzBrooker,
          laterFootnote({ isWithinSameFootnote: true, currentPinpoint: PARA_50 }),
          nzlsg3
        )
      )
    ).toBe("Brooker, above n 1, at [50]");
  });

  test("commercial style from config.nzlsgStyle: identifier and pinpoint only (NZLSG-008)", () => {
    const commercial: CitationConfig = { ...nzlsg3, nzlsgStyle: "commercial" };
    expect(
      text(formatCitation(nzBrooker, laterFootnote({ currentPinpoint: PARA_42 }), commercial))
    ).toBe("Brooker at [42]");
    expect(
      text(formatCitation(nzBrooker, immediatelyAfter({ currentPinpoint: PARA_42 }), commercial))
    ).toBe("Brooker at [42]");
    expect(text(formatCitation(bookLuntz, laterFootnote(), commercial))).toBe("Luntz");
    expect(
      text(formatCitation(nzPrivacyAct, laterFootnote({ currentPinpoint: SECTION_6 }), commercial))
    ).toBe("Privacy Act, s 6");
  });

  test("commercial style from data.nzlsgStyle when the config carries none; the config wins otherwise", () => {
    const stored: Citation = {
      ...bookLuntz,
      id: "stored",
      data: { ...bookLuntz.data, nzlsgStyle: "commercial" },
    };
    expect(text(formatCitation(stored, laterFootnote({ currentPinpoint: PAGE_42 }), nzlsg3))).toBe(
      "Luntz at 42"
    );
    expect(
      text(
        formatCitation(stored, laterFootnote({ currentPinpoint: PAGE_42 }), {
          ...nzlsg3,
          nzlsgStyle: "general",
        })
      )
    ).toBe("Luntz, above n 1, at 42");
  });

  test("an explanatory note is untouched", () => {
    expect(
      resolveSubsequentReference(explanatoryNote, resolverContext(immediatelyAfter(), nzlsg3))
    ).toBeNull();
    expect(text(formatCitation(explanatoryNote, immediatelyAfter(), nzlsg3))).toBe(
      "See generally Part II."
    );
  });
});

// ─── The label and the text come from one call ─────────────────────────────

describe("STD-015 formatCitationWithFormat labels the occurrence from the same resolution", () => {
  test("AGLC4: Ibid is 'ibid', a short form 'short', a first citation 'full'", () => {
    expect(formatCitationWithFormat(maboReported, immediatelyAfter(), aglc4).renderedFormat).toBe(
      "ibid"
    );
    expect(formatCitationWithFormat(maboReported, laterFootnote(), aglc4).renderedFormat).toBe(
      "short"
    );
    expect(formatCitationWithFormat(maboReported, undefined, aglc4).renderedFormat).toBe("full");
  });

  test("OSCOLA 4: the lower-case ibid is still labelled 'ibid'", () => {
    const formatted = formatCitationWithFormat(
      ukCorr,
      immediatelyAfter({ currentPinpoint: PARA_42 }),
      oscola4
    );
    expect(text(formatted.runs)).toBe("ibid [42]");
    expect(formatted.renderedFormat).toBe("ibid");
  });

  test("OSCOLA 5: never 'ibid'", () => {
    expect(formatCitationWithFormat(ukCorr, immediatelyAfter(), oscola5).renderedFormat).toBe(
      "short"
    );
  });

  test("NZLSG 3: the rule 1 pinpoint-only form is 'short'; a forced full citation 'full'", () => {
    expect(
      formatCitationWithFormat(nzBrooker, immediatelyAfter({ currentPinpoint: PARA_42 }), nzlsg3)
        .renderedFormat
    ).toBe("short");
    expect(
      formatCitationWithFormat(nzBrooker, immediatelyAfter({ formatPreference: "full" }), nzlsg3)
        .renderedFormat
    ).toBe("full");
  });

  test("the resolver reports the kind it produced", () => {
    expect(
      resolveSubsequentReferenceWithKind(maboReported, resolverContext(immediatelyAfter(), aglc4))
        ?.kind
    ).toBe("ibid");
    expect(
      resolveSubsequentReferenceWithKind(ukCorr, resolverContext(immediatelyAfter(), oscola5))?.kind
    ).toBe("short");
    expect(
      resolveSubsequentReferenceWithKind(
        ukCorr,
        resolverContext(immediatelyAfter({ formatPreference: "full" }), oscola5)
      )
    ).toBeNull();
  });

  test("an override renders verbatim and is labelled full", () => {
    const overridden: Citation = { ...ukCorr, overrideText: "As is." };
    expect(formatCitationWithFormat(overridden, immediatelyAfter(), oscola5)).toEqual({
      runs: [{ text: "As is." }],
      renderedFormat: "full",
    });
  });
});

// ─── AGLC unchanged ─────────────────────────────────────────────────────────

describe("STD-015 leaves the AGLC4 path byte-identical", () => {
  test("Rule 1.4.1 short form with pinpoint, Rule 1.4.3 Ibid, Rule 1.4.6 at", () => {
    expect(
      text(formatCitation(maboReported, laterFootnote({ currentPinpoint: PAGE_42 }), aglc4))
    ).toBe("Mabo (n 1) 42");
    expect(
      text(formatCitation(maboReported, immediatelyAfter({ currentPinpoint: PAGE_42 }), aglc4))
    ).toBe("Ibid 42");
    expect(
      text(
        formatCitation(
          maboReported,
          laterFootnote({ isWithinSameFootnote: true, currentPinpoint: PARA_50 }),
          aglc4
        )
      )
    ).toBe("at [50]");
    expect(resolveIbid(PAGE_42, undefined)).toEqual([{ text: "Ibid " }, { text: "42" }]);
  });

  test("a form-entered case without a short title still short-forms to a bare (n X) under AGLC (rule 2.1.14 titles are user-entered)", () => {
    expect(text(formatCitation(phelps, laterFootnote(), aglc4))).toBe(" (n 1)");
  });
});
