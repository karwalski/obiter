/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * SAFE-002: rendered-text hashing for user-edit detection. Pure — no
 * Office mocks. The hash distinguishes a stale Obiter render (hash of the
 * current text matches the stored hash) from a manual user edit.
 */

import { hashRenderedText, normalizeRenderedText } from "../../src/utils/textHash";

const NBSP = "\u00a0";
const NARROW_NBSP = "\u202f";

describe("normalizeRenderedText", () => {
  it("maps NBSP and narrow NBSP to plain spaces", () => {
    expect(normalizeRenderedText(`Mabo${NBSP}v${NARROW_NBSP}Queensland`)).toBe("Mabo v Queensland");
  });

  it("normalizes CRLF and CR line endings to LF", () => {
    expect(normalizeRenderedText("line1\r\nline2\rline3")).toBe("line1\nline2\nline3");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeRenderedText("  text  ")).toBe("text");
  });

  it("does NOT collapse interior plain-space runs (conservative)", () => {
    expect(normalizeRenderedText("a  b")).toBe("a  b");
  });
});

describe("hashRenderedText (FNV-1a 32-bit)", () => {
  it("matches the FNV-1a reference values", () => {
    // FNV-1a 32-bit offset basis for the empty string, and the standard
    // reference vector for "a".
    expect(hashRenderedText("")).toBe("811c9dc5");
    expect(hashRenderedText("a")).toBe("e40c292c");
  });

  it("returns a fixed-width 8-char lowercase hex string", () => {
    const samples = ["", "a", "Ibid.", "Mabo v Queensland (No 2) (1992) 175 CLR 1."];
    for (const s of samples) {
      expect(hashRenderedText(s)).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("is deterministic", () => {
    const text = "Mabo v Queensland (No 2) (1992) 175 CLR 1.";
    expect(hashRenderedText(text)).toBe(hashRenderedText(text));
  });

  it("hashes whitespace variants of the same text identically", () => {
    const canonical = hashRenderedText("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    expect(hashRenderedText(`Mabo${NBSP}v Queensland (No 2) (1992) 175 CLR 1.`)).toBe(canonical);
    expect(hashRenderedText("  Mabo v Queensland (No 2) (1992) 175 CLR 1. ")).toBe(canonical);
  });

  it("distinguishes a manual edit from the original text", () => {
    const original = hashRenderedText("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    const edited = hashRenderedText("Mabo v Queensland (No 2) (1992) 175 CLR 1, 15.");
    expect(edited).not.toBe(original);
  });
});
