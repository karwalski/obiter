/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * SAFE-002: parent-CC title codec. Pure — no Office mocks.
 *
 * Title grammar (backward compatible):
 *   "Obiter Footnote"              — legacy, unlocked, no rendered hash
 *   "Obiter Footnote (locked)"     — locked; lock wins, never carries a hash
 *   "Obiter Footnote [r:<hex8>]"   — unlocked, with the rendered-text hash
 */

import {
  buildParentTitle,
  parseParentTitle,
  isFootnoteLocked,
  PARENT_CC_TITLE,
  LOCKED_PARENT_CC_TITLE,
} from "../../src/word/footnoteManager";
import { hashRenderedText } from "../../src/utils/textHash";

describe("buildParentTitle", () => {
  it("builds the legacy title when unlocked with no hash", () => {
    expect(buildParentTitle({ locked: false })).toBe(PARENT_CC_TITLE);
    expect(buildParentTitle({ locked: false })).toBe("Obiter Footnote");
  });

  it("builds the hashed title when unlocked with a rendered hash", () => {
    expect(buildParentTitle({ locked: false, renderedHash: "deadbeef" })).toBe(
      "Obiter Footnote [r:deadbeef]"
    );
  });

  it("lock wins: locked titles are exactly the legacy locked string, hash dropped", () => {
    expect(buildParentTitle({ locked: true })).toBe(LOCKED_PARENT_CC_TITLE);
    expect(buildParentTitle({ locked: true, renderedHash: "deadbeef" })).toBe(
      LOCKED_PARENT_CC_TITLE
    );
  });
});

describe("parseParentTitle", () => {
  it("parses the legacy unlocked title", () => {
    expect(parseParentTitle(PARENT_CC_TITLE)).toEqual({ locked: false });
  });

  it("parses the legacy locked title (no hash)", () => {
    expect(parseParentTitle(LOCKED_PARENT_CC_TITLE)).toEqual({ locked: true });
  });

  it("parses the hashed title", () => {
    expect(parseParentTitle("Obiter Footnote [r:0123abcd]")).toEqual({
      locked: false,
      renderedHash: "0123abcd",
    });
  });

  it("round-trips through buildParentTitle", () => {
    const hash = hashRenderedText("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    expect(parseParentTitle(buildParentTitle({ locked: false, renderedHash: hash }))).toEqual({
      locked: false,
      renderedHash: hash,
    });
    expect(parseParentTitle(buildParentTitle({ locked: false }))).toEqual({ locked: false });
    expect(parseParentTitle(buildParentTitle({ locked: true }))).toEqual({ locked: true });
  });

  it("rejects malformed hashes — decodes as legacy unlocked with no hash", () => {
    const malformed = [
      "Obiter Footnote [r:xyz]", // not hex
      "Obiter Footnote [r:1234567]", // 7 chars
      "Obiter Footnote [r:123456789]", // 9 chars
      "Obiter Footnote [r:DEADBEEF]", // uppercase
      "Obiter Footnote [r:deadbeef", // unterminated
      "Obiter Footnote[r:deadbeef]", // missing space
    ];
    for (const title of malformed) {
      expect(parseParentTitle(title)).toEqual({ locked: false });
    }
  });

  it("decodes unknown/missing titles as legacy unlocked with no hash", () => {
    expect(parseParentTitle(undefined)).toEqual({ locked: false });
    expect(parseParentTitle(null)).toEqual({ locked: false });
    expect(parseParentTitle("")).toEqual({ locked: false });
    expect(parseParentTitle("Citation:short:42")).toEqual({ locked: false });
  });
});

describe("isFootnoteLocked (parse-based)", () => {
  it("is true only for the exact locked title", () => {
    expect(isFootnoteLocked(LOCKED_PARENT_CC_TITLE)).toBe(true);
    expect(isFootnoteLocked(PARENT_CC_TITLE)).toBe(false);
    expect(isFootnoteLocked("Obiter Footnote [r:deadbeef]")).toBe(false);
    expect(isFootnoteLocked(undefined)).toBe(false);
    expect(isFootnoteLocked(null)).toBe(false);
  });
});
