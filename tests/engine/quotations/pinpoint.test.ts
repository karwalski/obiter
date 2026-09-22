/**
 * ENP-010: paragraph-marker detection and line estimation for pasted
 * quotations (AGLC4 Rules 1.1.6, 1.1.7, 1.5.1, 1.7.1).
 */

import {
  detectPinpointsInPassage,
  quotationLineCount,
  bracketParagraphValue,
} from "../../../src/engine/quotations/pinpoint";

describe("detectPinpointsInPassage", () => {
  it("finds a bracketed marker at the line start and strips it", () => {
    const result = detectPinpointsInPassage("[42] The common law of Australia recognises native title.");
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42" });
    expect(result.markers).toEqual(["[42]"]);
    expect(result.cleaned).toBe("The common law of Australia recognises native title.");
  });

  it("finds a dotted marker opening a prose line", () => {
    const result = detectPinpointsInPassage("42. The common law of Australia recognises native title.");
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42" });
    expect(result.cleaned).toBe("The common law of Australia recognises native title.");
  });

  it("finds a bare number alone on a line before prose", () => {
    const result = detectPinpointsInPassage("42\nThe common law of Australia recognises native title.");
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42" });
    expect(result.cleaned).toBe("The common law of Australia recognises native title.");
  });

  it("is conservative: a bare number before a non-prose line is kept", () => {
    const result = detectPinpointsInPassage("42\n(1992) 175 CLR 1");
    expect(result.pinpoint).toBeUndefined();
    expect(result.cleaned).toBe("42\n(1992) 175 CLR 1");
  });

  it("builds a span from consecutive markers", () => {
    const result = detectPinpointsInPassage(
      "[42] The first point.\n[43] The second point.\n[44] The third point."
    );
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42–44" });
    expect(result.markers).toEqual(["[42]", "[43]", "[44]"]);
    expect(result.cleaned).toBe("The first point.\nThe second point.\nThe third point.");
  });

  it("stops the span at the first non-consecutive marker", () => {
    const result = detectPinpointsInPassage("[42] One.\n[43] Two.\n[47] Three.");
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42–43" });
  });

  it("recognises 'at [n]' and removes the whole phrase", () => {
    const result = detectPinpointsInPassage("As the Court said at [42], the title survives.");
    expect(result.pinpoint).toEqual({ type: "paragraph", value: "42" });
    expect(result.markers).toEqual(["at [42]"]);
    expect(result.cleaned).toBe("As the Court said, the title survives.");
  });

  it("returns no pinpoint when there are no markers", () => {
    const result = detectPinpointsInPassage("The common law of Australia recognises native title.");
    expect(result.pinpoint).toBeUndefined();
    expect(result.markers).toEqual([]);
  });

  it("does not treat a bracketed year as a pinpoint", () => {
    const result = detectPinpointsInPassage("In Love v Commonwealth [2020] HCA 3 the Court held otherwise.");
    expect(result.pinpoint).toBeUndefined();
    expect(result.cleaned).toBe("In Love v Commonwealth [2020] HCA 3 the Court held otherwise.");
  });

  it("normalises whitespace and keeps curly quotes", () => {
    const result = detectPinpointsInPassage(
      "  The   Court ‘held’   that\r\n\r\n\n  the  title   survives.  "
    );
    expect(result.cleaned).toBe("The Court ‘held’ that\nthe title survives.");
  });
});

describe("quotationLineCount", () => {
  it("counts one line for a short paragraph and rounds up long ones", () => {
    expect(quotationLineCount("short")).toBe(1);
    expect(quotationLineCount("x".repeat(90))).toBe(1);
    expect(quotationLineCount("x".repeat(91))).toBe(2);
    expect(quotationLineCount("x".repeat(200), 100)).toBe(2);
  });

  it("sums across paragraphs and ignores blank lines", () => {
    expect(quotationLineCount("one\n\ntwo\nthree")).toBe(3);
    expect(quotationLineCount("")).toBe(0);
  });
});

describe("bracketParagraphValue", () => {
  it("brackets single values and each end of a span", () => {
    expect(bracketParagraphValue("42")).toBe("[42]");
    expect(bracketParagraphValue("42–44")).toBe("[42]–[44]");
    expect(bracketParagraphValue("42-44")).toBe("[42]–[44]");
    expect(bracketParagraphValue("[42]")).toBe("[42]");
    expect(bracketParagraphValue("")).toBe("");
  });
});
