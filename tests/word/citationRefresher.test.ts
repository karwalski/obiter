/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * PARITY-102c (Rule 1.4.6): the refresher may offer the within-footnote
 * 'at «pinpoint»' form only when the immediately preceding citation in the
 * footnote is the same source. A pinpoint to an earlier, non-adjacent source
 * must fall back to the Rule 1.4.1 '(n X)' short form (AGLC4 fn 94:
 * 'Brennan Jr (n 94) 430').
 */

import { isImmediatelyPrecedingInFootnote } from "../../src/word/citationRefresher";

describe("Rule 1.4.6 — 'at' only for the immediately preceding source in the footnote", () => {
  it("is true when the immediately preceding citation is the same source", () => {
    expect(isImmediatelyPrecedingInFootnote("a", ["a"])).toBe(true);
    expect(isImmediatelyPrecedingInFootnote("a", ["b", "a"])).toBe(true);
  });

  it("is false when the source appeared earlier but another source intervened (AGLC4 fn 94)", () => {
    // fn 94: Brennan Jr article, then Rees & Rohn article, then a later
    // pinpoint to Brennan Jr — must use 'Brennan Jr (n 94) 430', not 'at 430'.
    expect(isImmediatelyPrecedingInFootnote("brennan", ["brennan", "rees-rohn"])).toBe(false);
    expect(isImmediatelyPrecedingInFootnote("a", ["a", "b", "c"])).toBe(false);
  });

  it("is false for the first citation in a footnote", () => {
    expect(isImmediatelyPrecedingInFootnote("a", [])).toBe(false);
  });
});
