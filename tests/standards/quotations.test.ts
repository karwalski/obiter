/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-006 — Quotations per standard (engine).
 *
 * `applyQuotationToText` decides block versus inline for a pasted passage
 * and wraps or strips its boundary marks. STD-016 made it take the
 * document config (`quotationMarkStyle` for the marks, the standard's
 * `blockQuoteThreshold` for the block decision). This suite is the
 * specification for that change.
 *
 * Convention (STD epic): every test asserts the CORRECT behaviour and names
 * the rule. Where the code does not yet behave that way the assertion is
 * kept and the test is `test.failing` with the fix story, so the suite is
 * green now and flips when the fix lands (the fixer removes `.failing`).
 * STD-016 landed: every marker in this file is flipped. Rule questions the
 * sources do not settle are `test.todo` entries for DECISION-040.
 *
 * Rule authority:
 * - AGLC4 r 1.5.1 (derived rule reference, PDF pp 40–41): short quotations
 *   (three lines or less) run into the text in single quotation marks; long
 *   quotations (four lines or more) are indented without quotation marks.
 *   Nested marks: in a short quotation double inside single; in a long
 *   quotation single inside; marks in the original are changed to fit.
 * - OSCOLA 5 §1.5 (docs/standards-rule-notes.md): single inverted commas,
 *   double for quotations within quotations; up to three lines run in the
 *   text; longer than three lines indented without marks, inner quotations
 *   then single.
 * - NZLSG 3 §1.2.2(a)–(b) (docs/standards-rule-notes.md): fewer than 30 words
 *   run in the text in double quotation marks; 30 words or more indented
 *   without marks and introduced by a colon; a short quotation inside a short
 *   one takes single marks, inside a long (unmarked) one double marks.
 *
 * The calls pass `{ config: configFor(std) }` (`ApplyQuotationOptions.config`,
 * added by STD-016); the local `apply` alias predates the field and is kept
 * so the file reads the same before and after the fix.
 */

import { applyQuotationToText, stripBoundaryQuotes } from "../../src/engine/quotations/format";
import type { ApplyQuotationOptions, QuotationDecision } from "../../src/engine/quotations/format";
import { detectPinpointsInPassage, quotationLineCount } from "../../src/engine/quotations/pinpoint";
import type { CitationConfig } from "../../src/engine/standards/types";
import { configFor } from "./runner";
import type { StandardKey } from "./runner";

// ─── Helpers ────────────────────────────────────────────────────────────────

type OptionsWithConfig = ApplyQuotationOptions & { config?: CitationConfig };

/** `applyQuotationToText` with the STD-016 `config` option in its type. */
const apply = applyQuotationToText as (text: string, opts?: OptionsWithConfig) => QuotationDecision;

const STANDARDS: readonly StandardKey[] = ["aglc4", "oscola5", "nzlsg3"];

const wordCount = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Twenty words, two estimated lines: short under every standard. */
const SHORT =
  "The common law of Australia recognises a form of native title which reflects the entitlement of the indigenous inhabitants there.";

/** Twenty-nine words, two estimated lines: short under every standard. */
const WORDS_29 =
  "It is the law that no man may ever be put on trial for a crime he did not do, nor made to pay for the act of another.";

/** Thirty words, two estimated lines: long under NZLSG only. */
const WORDS_30 =
  "It is the law that no man may ever be put on trial for a crime he did not do, nor be made to pay for the act of another.";

/** A passage carrying a quotation in curly single marks. */
const INNER_SINGLE = "The judge said the claim was ‘wholly without merit’ and dismissed it.";
/** The same passage with the inner quotation in curly double marks. */
const INNER_DOUBLE = "The judge said the claim was “wholly without merit” and dismissed it.";

/** Four estimated lines at 90 characters, forty words: long under every standard. */
const LONG =
  "The common law of Australia recognises a form of native title which, wherever it has not been extinguished, reflects the entitlement of the indigenous inhabitants, in accordance with their traditional laws and customs, to their traditional lands throughout the territory.";

const ruleOf: Record<StandardKey, string> = {
  aglc4: "AGLC4 r 1.5.1",
  oscola5: "OSCOLA 5 §1.5",
  oscola4: "OSCOLA 4 §1.5",
  nzlsg3: "NZLSG 3 §1.2.2",
};

describe("fixture sanity", () => {
  test("the passages have the word and line counts the rules turn on", () => {
    expect(wordCount(SHORT)).toBe(20);
    expect(quotationLineCount(SHORT)).toBe(2);
    expect(wordCount(WORDS_29)).toBe(29);
    expect(quotationLineCount(WORDS_29)).toBe(2);
    expect(wordCount(WORDS_30)).toBe(30);
    expect(quotationLineCount(WORDS_30)).toBe(2);
    expect(wordCount(LONG)).toBe(40);
    expect(quotationLineCount(LONG)).toBe(4);
  });

  test("the standard configs declare the quotation-mark style the rules give", () => {
    expect(configFor("aglc4").quotationMarkStyle).toBe("single"); // AGLC4 r 1.5.1
    expect(configFor("oscola5").quotationMarkStyle).toBe("single"); // OSCOLA 5 §1.5
    expect(configFor("nzlsg3").quotationMarkStyle).toBe("double"); // NZLSG 3 §1.2.2(a)(i)
  });
});

// ─── (a) Quotation marks ────────────────────────────────────────────────────

describe("applyQuotationToText: quotation marks per standard", () => {
  describe.each(["aglc4", "oscola5"] as const)("%s: single curly marks", (std) => {
    const config = configFor(std);

    test(`a short passage is wrapped in ‘ ’ (${ruleOf[std]})`, () => {
      expect(apply(SHORT, { config })).toEqual({ mode: "inline", text: `‘${SHORT}’` });
    });

    test(`existing straight or double boundary marks are normalised to ‘ ’ (${ruleOf[std]})`, () => {
      expect(apply(`"${SHORT}"`, { config }).text).toBe(`‘${SHORT}’`);
      expect(apply(`“${SHORT}”`, { config }).text).toBe(`‘${SHORT}’`);
      expect(apply(`'${SHORT}'`, { config }).text).toBe(`‘${SHORT}’`);
    });
  });

  describe("nzlsg3: double curly marks", () => {
    const config = configFor("nzlsg3");

    test("a short passage is wrapped in “ ” (NZLSG 3 §1.2.2(a)(i))", () => {
      expect(apply(SHORT, { config })).toEqual({ mode: "inline", text: `“${SHORT}”` });
    });

    test("existing straight or single boundary marks are normalised to “ ” (NZLSG 3 §1.2.2(a)(i))", () => {
      expect(apply(`"${SHORT}"`, { config }).text).toBe(`“${SHORT}”`);
      expect(apply(`‘${SHORT}’`, { config }).text).toBe(`“${SHORT}”`);
      expect(apply(`'${SHORT}'`, { config }).text).toBe(`“${SHORT}”`);
    });
  });
});

// ─── (a) Inner quotations ───────────────────────────────────────────────────

describe("applyQuotationToText: quotations within quotations", () => {
  describe("inline", () => {
    test("aglc4: an inner quotation in single marks becomes double inside the single outer pair (AGLC4 r 1.5.1 nested marks)", () => {
      expect(apply(INNER_SINGLE, { config: configFor("aglc4") }).text).toBe(`‘${INNER_DOUBLE}’`);
    });

    test("aglc4: an inner quotation already in double marks is kept (AGLC4 r 1.5.1 nested marks)", () => {
      expect(apply(INNER_DOUBLE, { config: configFor("aglc4") }).text).toBe(`‘${INNER_DOUBLE}’`);
    });

    test("oscola5: an inner quotation in single marks becomes double inside the single outer pair (OSCOLA 5 §1.5)", () => {
      expect(apply(INNER_SINGLE, { config: configFor("oscola5") }).text).toBe(`‘${INNER_DOUBLE}’`);
    });

    test("oscola5: an inner quotation already in double marks is kept (OSCOLA 5 §1.5)", () => {
      expect(apply(INNER_DOUBLE, { config: configFor("oscola5") }).text).toBe(`‘${INNER_DOUBLE}’`);
    });

    test("nzlsg3: an inner quotation in single marks is kept inside the double outer pair (NZLSG 3 §1.2.2(b))", () => {
      expect(apply(INNER_SINGLE, { config: configFor("nzlsg3") }).text).toBe(`“${INNER_SINGLE}”`);
    });

    test("nzlsg3: an inner quotation in double marks becomes single inside the double outer pair (NZLSG 3 §1.2.2(b))", () => {
      expect(apply(INNER_DOUBLE, { config: configFor("nzlsg3") }).text).toBe(`“${INNER_SINGLE}”`);
    });
  });

  describe("block (no outer marks)", () => {
    test("aglc4: an inner quotation in double marks becomes single in a long quotation (AGLC4 r 1.5.1 nested marks)", () => {
      const result = apply(INNER_DOUBLE, { config: configFor("aglc4"), forceBlock: true });
      expect(result).toEqual({ mode: "block", text: INNER_SINGLE });
    });

    test("aglc4: an inner quotation already in single marks is kept in a long quotation (AGLC4 r 1.5.1 nested marks)", () => {
      const result = apply(INNER_SINGLE, { config: configFor("aglc4"), forceBlock: true });
      expect(result).toEqual({ mode: "block", text: INNER_SINGLE });
    });

    test("oscola5: an inner quotation in double marks becomes single in a long quotation (OSCOLA 5 §1.5)", () => {
      const result = apply(INNER_DOUBLE, { config: configFor("oscola5"), forceBlock: true });
      expect(result).toEqual({ mode: "block", text: INNER_SINGLE });
    });

    test("nzlsg3: an inner quotation in single marks becomes double in a long quotation (NZLSG 3 §1.2.2(b))", () => {
      const result = apply(INNER_SINGLE, { config: configFor("nzlsg3"), forceBlock: true });
      expect(result).toEqual({ mode: "block", text: INNER_DOUBLE });
    });

    test("nzlsg3: an inner quotation already in double marks is kept in a long quotation (NZLSG 3 §1.2.2(b))", () => {
      const result = apply(INNER_DOUBLE, { config: configFor("nzlsg3"), forceBlock: true });
      expect(result).toEqual({ mode: "block", text: INNER_DOUBLE });
    });
  });
});

// ─── (b) Block threshold ────────────────────────────────────────────────────

describe("applyQuotationToText: block threshold per standard", () => {
  describe.each(["aglc4", "oscola5"] as const)("%s: more than three estimated lines", (std) => {
    const config = configFor(std);
    const rule =
      std === "aglc4"
        ? "AGLC4 r 1.5.1: three lines or less is short"
        : "OSCOLA 5 §1.5: up to three lines runs in the text";

    test(`two estimated lines are inline (${rule})`, () => {
      expect(apply("x".repeat(20), { config, charsPerLine: 10 }).mode).toBe("inline");
      expect(apply(SHORT, { config }).mode).toBe("inline");
    });

    // STD-016 landed: the block form starts at four estimated lines (AGLC4
    // r 1.5.1: long is four lines or more); tests/engine/quotations/format.test.ts
    // pins it.
    test(`exactly three estimated lines are inline (${rule})`, () => {
      expect(apply("x".repeat(30), { config, charsPerLine: 10 }).mode).toBe("inline");
    });

    test(`four estimated lines are block (${ruleOf[std]}: longer than three lines is indented)`, () => {
      expect(apply("x".repeat(40), { config, charsPerLine: 10 }).mode).toBe("block");
      expect(apply(LONG, { config }).mode).toBe("block");
    });

    test(`the word count does not decide: forty words over four lines is block, thirty words over two lines is inline (${ruleOf[std]})`, () => {
      expect(apply(LONG, { config }).mode).toBe("block");
      expect(apply(WORDS_30, { config }).mode).toBe("inline");
    });

    test("forceBlock wins over the estimate", () => {
      expect(apply(SHORT, { config, forceBlock: true }).mode).toBe("block");
    });
  });

  describe("nzlsg3: thirty words or more", () => {
    const config = configFor("nzlsg3");

    test("a twenty-nine word passage is inline (NZLSG 3 §1.2.2(a)(i): fewer than 30 words)", () => {
      expect(apply(WORDS_29, { config }).mode).toBe("inline");
    });

    test("a thirty word passage is block (NZLSG 3 §1.2.2(a)(ii): 30 words or more)", () => {
      expect(apply(WORDS_30, { config })).toEqual({ mode: "block", text: WORDS_30 });
    });

    test("a forty word passage is block (NZLSG 3 §1.2.2(a)(ii))", () => {
      expect(apply(LONG, { config })).toEqual({ mode: "block", text: LONG });
    });

    test("the line estimate does not decide: a single forty-character word is inline (NZLSG 3 §1.2.2(a)(i) counts words)", () => {
      expect(apply("x".repeat(40), { config, charsPerLine: 10 }).mode).toBe("inline");
    });

    test("forceBlock wins over the word count", () => {
      expect(apply(WORDS_29, { config, forceBlock: true }).mode).toBe("block");
    });

    test.todo(
      "DECISION-040: NZLSG 3 §1.2.2(a)(ii) introduces a long quotation with a colon and places the footnote marker after the colon — whether the engine or the inserter should supply the colon and reposition the marker is a product question the guide does not settle"
    );
  });
});

// ─── (c) Boundary-mark stripping in block mode ──────────────────────────────

describe("applyQuotationToText: block mode strips one pair of boundary marks under every standard", () => {
  describe.each(STANDARDS)("%s", (std) => {
    const config = configFor(std);

    test("curly single, curly double and straight boundary marks are removed", () => {
      expect(apply(`‘${LONG}’`, { config })).toEqual({ mode: "block", text: LONG });
      expect(apply(`“${LONG}”`, { config })).toEqual({ mode: "block", text: LONG });
      expect(apply(`"${LONG}"`, { config })).toEqual({ mode: "block", text: LONG });
      expect(apply(`'${LONG}'`, { config })).toEqual({ mode: "block", text: LONG });
    });

    test("only one pair is removed and inner text is untouched", () => {
      expect(apply("‘‘Nested’’", { config, forceBlock: true }).text).toBe("‘Nested’");
      expect(apply(`“${LONG}”`, { config }).text).not.toMatch(/^[‘“'"]/);
    });

    test("stripBoundaryQuotes is the shared primitive", () => {
      expect(stripBoundaryQuotes(`“${SHORT}”`)).toBe(SHORT);
      expect(stripBoundaryQuotes(`‘${SHORT}’`)).toBe(SHORT);
    });
  });
});

// ─── (d) Pinpoint detection is standard-neutral ─────────────────────────────

describe("detectPinpointsInPassage is standard-neutral", () => {
  const PASSAGE = `[42] ${LONG}\n[43] ${SHORT}`;

  test("the same passage yields the same cleaned text, pinpoint and markers whatever the standard", () => {
    // The detector takes no config: the result the Quote panel feeds into
    // the standard-aware formatter is identical under every standard.
    const results = STANDARDS.map(() => detectPinpointsInPassage(PASSAGE));
    for (const result of results) {
      expect(result.cleaned).toBe(`${LONG}\n${SHORT}`);
      expect(result.pinpoint).toEqual({ type: "paragraph", value: "42–43" });
      expect(result.markers).toEqual(["[42]", "[43]"]);
    }
    expect(new Set(results.map((r) => JSON.stringify(r))).size).toBe(1);
  });

  test("the cleaned passage feeds the standard-aware decision unchanged", () => {
    const { cleaned } = detectPinpointsInPassage(`[42] ${SHORT}`);
    expect(cleaned).toBe(SHORT);
    for (const std of STANDARDS) {
      expect(apply(cleaned, { config: configFor(std) }).mode).toBe("inline");
    }
  });
});
