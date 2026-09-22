/**
 * ENP-010 / QUOTE-001: the shared block-versus-inline decision and boundary
 * quotation-mark handling (AGLC4 Rule 1.5.1).
 */

import { applyQuotationToText, stripBoundaryQuotes } from "../../../src/engine/quotations/format";

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

  it("uses the block form at three or more estimated lines and strips boundary marks", () => {
    const result = applyQuotationToText(`“${LONG}”`);
    expect(result.mode).toBe("block");
    expect(result.text).toBe(LONG);
  });

  it("respects forceBlock and charsPerLine", () => {
    expect(applyQuotationToText("‘Short.’", { forceBlock: true })).toEqual({
      mode: "block",
      text: "Short.",
    });
    expect(applyQuotationToText("x".repeat(30), { charsPerLine: 10 }).mode).toBe("block");
    expect(applyQuotationToText("x".repeat(30), { charsPerLine: 20 }).mode).toBe("inline");
  });

  it("strips only one pair of boundary marks", () => {
    expect(applyQuotationToText("‘‘Nested’’", { forceBlock: true }).text).toBe("‘Nested’");
  });
});

describe("stripBoundaryQuotes", () => {
  it("strips one side only when asked", () => {
    expect(stripBoundaryQuotes("‘open only", { leading: true, trailing: false })).toBe("open only");
    expect(stripBoundaryQuotes("close only’", { leading: false, trailing: true })).toBe("close only");
    expect(stripBoundaryQuotes("‘both’")).toBe("both");
    expect(stripBoundaryQuotes("none")).toBe("none");
  });
});
