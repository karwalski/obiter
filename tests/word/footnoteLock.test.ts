/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Per-footnote lock: the pure title-marker helper that the refresher uses to
 * decide whether to freeze (skip rebuilding) a footnote.
 */

import {
  isFootnoteLocked,
  LOCKED_PARENT_CC_TITLE,
  PARENT_CC_TITLE,
} from "../../src/word/footnoteManager";

describe("isFootnoteLocked", () => {
  it("is true only for the locked parent-CC title marker", () => {
    expect(isFootnoteLocked(LOCKED_PARENT_CC_TITLE)).toBe(true);
  });

  it("is false for a normal (auto) footnote and for absent/odd titles", () => {
    expect(isFootnoteLocked(PARENT_CC_TITLE)).toBe(false);
    expect(isFootnoteLocked("Obiter Footnote")).toBe(false);
    expect(isFootnoteLocked(undefined)).toBe(false);
    expect(isFootnoteLocked(null)).toBe(false);
    expect(isFootnoteLocked("")).toBe(false);
    expect(isFootnoteLocked("Citation:short:42")).toBe(false);
  });

  it("the locked and normal titles are distinct", () => {
    expect(LOCKED_PARENT_CC_TITLE).not.toBe(PARENT_CC_TITLE);
  });
});
