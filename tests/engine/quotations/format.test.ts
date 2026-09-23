/**
 * ENP-010 / QUOTE-001 / STD-016: the shared block-versus-inline decision and
 * boundary quotation-mark handling (AGLC4 Rule 1.5.1; OSCOLA 5 §1.5; NZLSG 3
 * §1.2.2). tests/standards/quotations.test.ts is the per-standard
 * specification; this file pins the AGLC default (no config) and the
 * config plumbing.
 */

import {
  applyQuotationToText,
  nestQuotationMarks,
  stripBoundaryQuotes,
} from "../../../src/engine/quotations/format";
import { getStandardConfig } from "../../../src/engine/standards";

const LONG =
  "The common law of Australia recognises a form of native title which, in the cases where it has not been extinguished, reflects the entitlement of the indigenous inhabitants, in accordance with their laws or customs, to their traditional lands and which is not necessarily a mere personal right.";

describe("applyQuotationToText", () => {
  it("wraps a short passage in single curly quotes", () => {
    expect(applyQuotationToText("A short quotation.")).toEqual({
      mode: "inline",
      text: "‘A short quotation.’",
    });
  });

  it("normalises existing straight or double boundary marks to single curly marks", () => {
    expect(applyQuotationToText('"A short quotation."').text).toBe("‘A short quotation.’");
    expect(applyQuotationToText("“A short quotation.”").text).toBe("‘A short quotation.’");
    expect(applyQuotationToText("'A short quotation.'").text).toBe("‘A short quotation.’");
  });

  it("uses the block form at four or more estimated lines and strips boundary marks (r 1.5.1)", () => {
    const result = applyQuotationToText(`“${LONG}”`);
    expect(result.mode).toBe("block");
    expect(result.text).toBe(LONG);
  });

  it("keeps exactly three estimated lines inline (r 1.5.1: 'three lines or less' is short)", () => {
    // STD-016 (DECISION-040, resolved from the rule text): the block form
    // starts at four lines, not three.
    expect(applyQuotationToText("x".repeat(30), { charsPerLine: 10 }).mode).toBe("inline");
  });

  it("respects forceBlock and charsPerLine", () => {
    expect(applyQuotationToText("‘Short.’", { forceBlock: true })).toEqual({
      mode: "block",
      text: "Short.",
    });
    expect(applyQuotationToText("x".repeat(40), { charsPerLine: 10 }).mode).toBe("block");
    expect(applyQuotationToText("x".repeat(40), { charsPerLine: 20 }).mode).toBe("inline");
  });

  it("strips only one pair of boundary marks", () => {
    expect(applyQuotationToText("‘‘Nested’’", { forceBlock: true }).text).toBe("‘Nested’");
  });

  describe("quotations within quotations (r 1.5.1)", () => {
    const INNER_SINGLE = "The judge said the claim was ‘wholly without merit’ and dismissed it.";
    const INNER_DOUBLE = "The judge said the claim was “wholly without merit” and dismissed it.";

    it("a short quotation takes double marks within the single outer pair", () => {
      expect(applyQuotationToText(INNER_SINGLE).text).toBe(`‘${INNER_DOUBLE}’`);
      expect(applyQuotationToText(INNER_DOUBLE).text).toBe(`‘${INNER_DOUBLE}’`);
    });

    it("a long quotation takes single marks within", () => {
      expect(applyQuotationToText(INNER_DOUBLE, { forceBlock: true }).text).toBe(INNER_SINGLE);
      expect(applyQuotationToText(INNER_SINGLE, { forceBlock: true }).text).toBe(INNER_SINGLE);
    });

    it("an apostrophe is not a closing mark", () => {
      expect(nestQuotationMarks("Birks’ theory of ‘unjust’ factors", "single")).toBe(
        "Birks’ theory of “unjust” factors"
      );
      expect(nestQuotationMarks("don’t", "single")).toBe("don’t");
    });
  });

  describe("STD-016: config", () => {
    const nzlsg = getStandardConfig("nzlsg3");
    const oscola = getStandardConfig("oscola5");
    const aglc = getStandardConfig("aglc4");
    const WORDS_30 =
      "It is the law that no man may ever be put on trial for a crime he did not do, nor be made to pay for the act of another.";

    it("takes the marks from quotationMarkStyle (NZLSG 3 §1.2.2(a)(i) double; OSCOLA 5 §1.5 single)", () => {
      expect(applyQuotationToText("A short quotation.", { config: nzlsg }).text).toBe(
        "“A short quotation.”"
      );
      expect(applyQuotationToText("A short quotation.", { config: oscola }).text).toBe(
        "‘A short quotation.’"
      );
      expect(applyQuotationToText("A short quotation.", { config: aglc }).text).toBe(
        "‘A short quotation.’"
      );
    });

    it("takes the threshold from blockQuoteThreshold (NZLSG 3 §1.2.2(a)(ii) thirty words; AGLC4/OSCOLA four lines)", () => {
      expect(applyQuotationToText(WORDS_30, { config: nzlsg })).toEqual({
        mode: "block",
        text: WORDS_30,
      });
      expect(applyQuotationToText(WORDS_30, { config: oscola }).mode).toBe("inline");
      expect(applyQuotationToText(WORDS_30, { config: aglc }).mode).toBe("inline");
      expect(applyQuotationToText("x".repeat(40), { config: nzlsg, charsPerLine: 10 }).mode).toBe(
        "inline"
      );
      expect(applyQuotationToText("x".repeat(40), { config: aglc, charsPerLine: 10 }).mode).toBe(
        "block"
      );
    });

    it("honours an explicit lines threshold", () => {
      const threeLines = { ...aglc, blockQuoteThreshold: { lines: 3 } };
      expect(
        applyQuotationToText("x".repeat(30), { config: threeLines, charsPerLine: 10 }).mode
      ).toBe("block");
    });
  });
});

describe("stripBoundaryQuotes", () => {
  it("strips one side only when asked", () => {
    expect(stripBoundaryQuotes("‘open only", { leading: true, trailing: false })).toBe("open only");
    expect(stripBoundaryQuotes("close only’", { leading: false, trailing: true })).toBe(
      "close only"
    );
    expect(stripBoundaryQuotes("‘both’")).toBe("both");
    expect(stripBoundaryQuotes("none")).toBe("none");
  });
});
