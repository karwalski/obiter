/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-014 — `formatPinpointFor`: the standard-aware pinpoint suffix.
 *
 * Every expectation is the label vocabulary and punctuation recorded in
 * docs/standards-rule-notes.md for the rule named in the test (paraphrased;
 * no guide text). AGLC4 goes through `formatPinpoint` unchanged; OSCOLA 5,
 * OSCOLA 4 and NZLSG 3 each have their own table.
 */

import { getStandardConfig } from "../../src/engine/standards";
import {
  endsWithClosingBracket,
  formatPinpointFor,
  normaliseStringPinpoint,
  pinpointText,
} from "../../src/engine/standards/pinpoints";
import type { Pinpoint } from "../../src/types/citation";

const aglc4 = getStandardConfig("aglc4");
const oscola5 = getStandardConfig("oscola5");
const oscola4 = getStandardConfig("oscola4");
const nzlsg3 = getStandardConfig("nzlsg3");

const PAGE: Pinpoint = { type: "page", value: "42" };
const PARAGRAPH: Pinpoint = { type: "paragraph", value: "[42]" };
const PARAGRAPH_RANGE: Pinpoint = { type: "paragraph", value: "[42]–[45]" };
const SECTION: Pinpoint = { type: "section", value: "6" };
const SECTIONS: Pinpoint = { type: "section", value: "1(1) and 4(3)" };
const SCHEDULE: Pinpoint = { type: "schedule", value: "1" };
const REGULATION: Pinpoint = { type: "regulation", value: "7(2)" };
const ARTICLE: Pinpoint = { type: "article", value: "6" };
const CHAPTER: Pinpoint = { type: "chapter", value: "1" };
const PAGE_WITH_FOOTNOTE: Pinpoint = {
  type: "page",
  value: "9",
  subPinpoint: { type: "footnote", value: "6" },
};
const PAGE_WITH_PARAGRAPH: Pinpoint = {
  type: "page",
  value: "6",
  subPinpoint: { type: "paragraph", value: "[23]" },
};
const SCHEDULE_CLAUSE: Pinpoint = {
  type: "schedule",
  value: "3",
  subPinpoint: { type: "clause", value: "4" },
};

// ─── Normalisation ──────────────────────────────────────────────────────────

describe("normaliseStringPinpoint: form strings are decoded by type", () => {
  test("bare number → page; [n] → paragraph; 's n' → section; '6 [23]' → page + paragraph", () => {
    expect(normaliseStringPinpoint("42")).toEqual(PAGE);
    expect(normaliseStringPinpoint("[42]")).toEqual(PARAGRAPH);
    expect(normaliseStringPinpoint("s 6")).toEqual(SECTION);
    expect(normaliseStringPinpoint("6 [23]")).toEqual(PAGE_WITH_PARAGRAPH);
  });

  test("a typed pinpoint passes through; a valueless one is dropped", () => {
    expect(normaliseStringPinpoint(PAGE_WITH_FOOTNOTE)).toBe(PAGE_WITH_FOOTNOTE);
    expect(normaliseStringPinpoint({ value: undefined })).toBeUndefined();
    expect(normaliseStringPinpoint({ type: "page", value: "  " })).toBeUndefined();
    expect(normaliseStringPinpoint("")).toBeUndefined();
    expect(normaliseStringPinpoint(undefined)).toBeUndefined();
    expect(normaliseStringPinpoint(null)).toBeUndefined();
  });
});

// ─── AGLC4 (unchanged vocabulary, Rules 1.1.6–1.1.7) ────────────────────────

describe("AGLC4 Rules 1.1.6–1.1.7: formatPinpoint vocabulary through the config path", () => {
  test("page after a report: ', 42'; paragraph: ' [42]'; section after a statute: ' s 6'", () => {
    expect(formatPinpointFor(aglc4, PAGE, { after: "report" })).toBe(", 42");
    expect(formatPinpointFor(aglc4, PARAGRAPH, { after: "report" })).toBe(" [42]");
    expect(formatPinpointFor(aglc4, SECTION, { after: "statute" })).toBe(" s 6");
  });

  test("Rule 1.1.7 footnote sub-pinpoint keeps the AGLC 'n' label: ' 9 n 6'", () => {
    expect(formatPinpointFor(aglc4, PAGE_WITH_FOOTNOTE, { after: "secondary" })).toBe(" 9 n 6");
  });

  test("after (n X): a space, never a comma (Rule 1.4.1 'Mabo (n 1) 42')", () => {
    expect(formatPinpointFor(aglc4, PAGE, { after: "cross-reference" })).toBe(" 42");
  });
});

// ─── OSCOLA 5 ───────────────────────────────────────────────────────────────

describe("OSCOLA 5 §2.1.6: case pinpoints", () => {
  test("paragraph after a neutral citation or a report: ' [42]' with no comma", () => {
    expect(formatPinpointFor(oscola5, PARAGRAPH, { after: "neutral" })).toBe(" [42]");
    expect(formatPinpointFor(oscola5, PARAGRAPH, { after: "report" })).toBe(" [42]");
    expect(formatPinpointFor(oscola5, PARAGRAPH_RANGE, { after: "report" })).toBe(" [42]–[45]");
  });

  test("page after a bracketed court identifier: ' 42' with no comma", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "report", afterBracket: true })).toBe(" 42");
  });

  test("page after a report page with no closing bracket: ', 42' (OSCOLA 4 §2.1.6 comma kept; Unresolved 1)", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "report" })).toBe(", 42");
    expect(formatPinpointFor(oscola4, PAGE, { after: "report" })).toBe(", 42");
  });

  test("a paragraph typed without brackets is bracketed: '[42]', '[42]–[45]'", () => {
    expect(
      formatPinpointFor(oscola5, { type: "paragraph", value: "42" }, { after: "report" })
    ).toBe(" [42]");
    expect(
      formatPinpointFor(oscola5, { type: "paragraph", value: "42-45" }, { after: "report" })
    ).toBe(" [42]–[45]");
  });

  test("§1.3.2: a hyphenated page span takes an en dash", () => {
    expect(
      formatPinpointFor(
        oscola5,
        { type: "page", value: "530-31" },
        { after: "report", afterBracket: true }
      )
    ).toBe(" 530–31");
  });
});

describe("OSCOLA 5 §2.4.2, §2.5.2: legislation pinpoints", () => {
  test("', s 6' after a statute title; ', ss 1(1) and 4(3)' for several sections", () => {
    expect(formatPinpointFor(oscola5, SECTION, { after: "statute" })).toBe(", s 6");
    expect(formatPinpointFor(oscola5, SECTIONS, { after: "statute" })).toBe(", ss 1(1) and 4(3)");
  });

  test("', sch 1' and ', reg 7(2)'", () => {
    expect(formatPinpointFor(oscola5, SCHEDULE, { after: "statute" })).toBe(", sch 1");
    expect(formatPinpointFor(oscola5, REGULATION, { after: "statute" })).toBe(", reg 7(2)");
  });

  test("§1.2.1: after a declared short form in brackets no comma ('(‘SARAH’) s 1'); used alone a comma ('SARAH, s 2')", () => {
    expect(formatPinpointFor(oscola5, SECTION, { after: "statute", afterBracket: true })).toBe(
      " s 6"
    );
    expect(formatPinpointFor(oscola5, SECTION, { after: "short-form" })).toBe(", s 6");
  });
});

describe("OSCOLA 5 §4.1.1: treaty articles", () => {
  test("', art 6' after a series; ' art 6' after a bracketed short form", () => {
    expect(formatPinpointFor(oscola5, ARTICLE, { after: "statute" })).toBe(", art 6");
    expect(formatPinpointFor(oscola5, ARTICLE, { after: "statute", afterBracket: true })).toBe(
      " art 6"
    );
  });
});

describe("OSCOLA 5 §3.1.3, §3.2.1, §3.3: secondary-source pinpoints", () => {
  test("bare page after the publication bracket: ' 42'", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "secondary", afterBracket: true })).toBe(
      " 42"
    );
  });

  test("§3.2.1: book paragraphs take 'para', never square brackets", () => {
    expect(formatPinpointFor(oscola5, PARAGRAPH, { after: "secondary", afterBracket: true })).toBe(
      " para 42"
    );
    expect(
      formatPinpointFor(oscola5, PARAGRAPH_RANGE, { after: "secondary", afterBracket: true })
    ).toBe(" paras 42–45");
  });

  test("§3.1.3: footnote sub-pinpoint '9 fn 6'; 'ch 1'", () => {
    expect(
      formatPinpointFor(oscola5, PAGE_WITH_FOOTNOTE, { after: "secondary", afterBracket: true })
    ).toBe(" 9 fn 6");
    expect(formatPinpointFor(oscola5, CHAPTER, { after: "secondary", afterBracket: true })).toBe(
      " ch 1"
    );
  });

  test("§3.3: journal pinpoint after the first page takes a comma: ', 42'", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "report" })).toBe(", 42");
  });
});

describe("OSCOLA 5 §1.2.1: pinpoints after (n X)", () => {
  test("a space and the value: ' 42', ' [42]', ' 9 fn 6'", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "cross-reference" })).toBe(" 42");
    expect(formatPinpointFor(oscola5, PARAGRAPH, { after: "cross-reference" })).toBe(" [42]");
    expect(formatPinpointFor(oscola5, PAGE_WITH_FOOTNOTE, { after: "cross-reference" })).toBe(
      " 9 fn 6"
    );
    expect(pinpointText(oscola5, PAGE_WITH_FOOTNOTE, { after: "cross-reference" })).toBe("9 fn 6");
  });
});

describe("OSCOLA 5 §4.4.4 and OSCOLA 4 §2.7.1: paragraph-cited international sources", () => {
  test("OSCOLA 5: ' [42]' after the date bracket", () => {
    expect(
      formatPinpointFor(oscola5, PARAGRAPH, { after: "paragraph-source", afterBracket: true })
    ).toBe(" [42]");
  });

  test("OSCOLA 4: ', para 42' after a comma", () => {
    expect(
      formatPinpointFor(oscola4, PARAGRAPH, { after: "paragraph-source", afterBracket: true })
    ).toBe(", para 42");
  });
});

describe("OSCOLA: joiner override and string input", () => {
  test("joiner 'none' / 'space' / 'comma' override the standard's punctuation", () => {
    expect(formatPinpointFor(oscola5, PAGE, { after: "report", joiner: "none" })).toBe("42");
    expect(formatPinpointFor(oscola5, PAGE, { after: "report", joiner: "space" })).toBe(" 42");
    expect(formatPinpointFor(oscola5, PARAGRAPH, { after: "report", joiner: "comma" })).toBe(
      ", [42]"
    );
  });

  test("a form string is normalised by type before rendering", () => {
    expect(formatPinpointFor(oscola5, "[42]", { after: "report" })).toBe(" [42]");
    expect(formatPinpointFor(oscola5, "s 6", { after: "statute" })).toBe(", s 6");
    expect(formatPinpointFor(oscola5, "", { after: "statute" })).toBe("");
    expect(formatPinpointFor(oscola5, undefined, { after: "statute" })).toBe("");
  });
});

// ─── NZLSG 3 ────────────────────────────────────────────────────────────────

describe("NZLSG 3 §3.2.8: case pinpoints take 'at'", () => {
  test("' at 42' and ' at [42]' after the court identifier or report", () => {
    expect(formatPinpointFor(nzlsg3, PAGE, { after: "report" })).toBe(" at 42");
    expect(formatPinpointFor(nzlsg3, PARAGRAPH, { after: "report" })).toBe(" at [42]");
    expect(formatPinpointFor(nzlsg3, PAGE, { after: "report", afterBracket: true })).toBe(" at 42");
    expect(formatPinpointFor(nzlsg3, PARAGRAPH, { after: "neutral" })).toBe(" at [42]");
  });

  test("ranges with an unspaced en dash and full digits: ' at [42]–[45]', ' at 92–98'", () => {
    expect(formatPinpointFor(nzlsg3, PARAGRAPH_RANGE, { after: "report" })).toBe(" at [42]–[45]");
    expect(formatPinpointFor(nzlsg3, { type: "page", value: "92-98" }, { after: "report" })).toBe(
      " at 92–98"
    );
  });

  test("several pinpoints comma separated with 'and' before the last: ' at [30], [40] and [47]'", () => {
    expect(
      formatPinpointFor(
        nzlsg3,
        { type: "paragraph", value: "[30], [40], [47]" },
        { after: "report" }
      )
    ).toBe(" at [30], [40] and [47]");
    expect(formatPinpointFor(nzlsg3, { type: "page", value: "12, 15" }, { after: "report" })).toBe(
      " at 12 and 15"
    );
  });
});

describe("NZLSG 3 §4.1.1(d), §4.3.1: legislation pinpoints", () => {
  test("', s 6' after the year; ', ss 5–7' for several; ', subs 2' for a subsection", () => {
    expect(formatPinpointFor(nzlsg3, SECTION, { after: "statute" })).toBe(", s 6");
    expect(formatPinpointFor(nzlsg3, { type: "section", value: "5–7" }, { after: "statute" })).toBe(
      ", ss 5–7"
    );
    expect(
      formatPinpointFor(nzlsg3, { type: "subsection", value: "2" }, { after: "statute" })
    ).toBe(", subs 2");
  });

  test("', sch 3 cl 4' — schedule provisions with no comma between", () => {
    expect(formatPinpointFor(nzlsg3, SCHEDULE_CLAUSE, { after: "statute" })).toBe(", sch 3 cl 4");
  });

  test("', reg 3' after a regulation title; ', art 7' after a treaty (§10.1.1)", () => {
    expect(
      formatPinpointFor(nzlsg3, { type: "regulation", value: "3" }, { after: "statute" })
    ).toBe(", reg 3");
    expect(formatPinpointFor(nzlsg3, { type: "article", value: "7" }, { after: "statute" })).toBe(
      ", art 7"
    );
  });

  test("§2.3.1(a)(ii): a declared short title used alone takes the same comma: ', s 6'", () => {
    expect(formatPinpointFor(nzlsg3, SECTION, { after: "short-form" })).toBe(", s 6");
  });
});

describe("NZLSG 3 §2.3.1: pinpoints after 'above n X'", () => {
  test("', at 42' and ', at [42]–[45]'", () => {
    expect(formatPinpointFor(nzlsg3, PAGE, { after: "cross-reference" })).toBe(", at 42");
    expect(formatPinpointFor(nzlsg3, PARAGRAPH_RANGE, { after: "cross-reference" })).toBe(
      ", at [42]–[45]"
    );
  });

  test("a labelled provision after 'above n X' keeps its label without 'at': ', art 7'", () => {
    expect(
      formatPinpointFor(nzlsg3, { type: "article", value: "7" }, { after: "cross-reference" })
    ).toBe(", art 7");
  });
});

describe("NZLSG 3 §6.1.8: secondary-source pinpoints", () => {
  test("' at 164', ' at [1206]', ' at ch 1', ' at 189, n 92'", () => {
    expect(formatPinpointFor(nzlsg3, { type: "page", value: "164" }, { after: "secondary" })).toBe(
      " at 164"
    );
    expect(
      formatPinpointFor(nzlsg3, { type: "paragraph", value: "[1206]" }, { after: "secondary" })
    ).toBe(" at [1206]");
    expect(formatPinpointFor(nzlsg3, CHAPTER, { after: "secondary" })).toBe(" at ch 1");
    expect(
      formatPinpointFor(
        nzlsg3,
        { type: "page", value: "189", subPinpoint: { type: "footnote", value: "92" } },
        { after: "secondary" }
      )
    ).toBe(" at 189, n 92");
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────────

describe("endsWithClosingBracket", () => {
  test("true for a citation ending in a bracketed element, false otherwise", () => {
    expect(endsWithClosingBracket("Mabo v Queensland (1992) 175 CLR 1 (HCA)")).toBe(true);
    expect(endsWithClosingBracket("Human Rights Act 1998 (‘HRA 1998’) ")).toBe(true);
    expect(endsWithClosingBracket("[2008] 1 AC 884")).toBe(false);
  });
});
