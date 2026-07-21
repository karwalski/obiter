/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * TRUST-003: font names and sizes are document-derived and interpolated into
 * the style attribute of an insertHtml fragment. Names that could break out
 * of the font-family declaration (CSS injection) must never reach the emitted
 * HTML; the declaration is omitted rather than throwing, because citation
 * insertion must not fail on an unusual document font.
 */

import { escapeHtml, isSafeFontName, runsToHtml } from "../../src/word/formattedRunsHtml";

describe("escapeHtml", () => {
  it("escapes ampersands and angle brackets", () => {
    expect(escapeHtml("R v <Smith> & Ors")).toBe("R v &lt;Smith&gt; &amp; Ors");
  });
});

describe("isSafeFontName", () => {
  it("accepts common Word fonts", () => {
    expect(isSafeFontName("Times New Roman")).toBe(true);
    expect(isSafeFontName("Calibri Light")).toBe(true);
    expect(isSafeFontName("Arial")).toBe(true);
    expect(isSafeFontName("Garamond-Premier")).toBe(true);
    expect(isSafeFontName("Sitka Text Semibold")).toBe(true);
    expect(isSafeFontName("Ms. Reference 2")).toBe(true);
  });

  it("rejects names containing declaration-breakout characters", () => {
    for (const char of ["'", '"', ";", ":", "\\", "<", ">", "{", "}"]) {
      expect(isSafeFontName(`Arial${char}`)).toBe(false);
    }
  });

  it("rejects names that do not start with a letter or digit", () => {
    expect(isSafeFontName(" Arial")).toBe(false);
    expect(isSafeFontName("-Arial")).toBe(false);
    expect(isSafeFontName(".Arial")).toBe(false);
  });

  it("rejects empty and over-length names", () => {
    expect(isSafeFontName("")).toBe(false);
    expect(isSafeFontName("A".repeat(65))).toBe(false);
    expect(isSafeFontName("A".repeat(64))).toBe(true);
  });
});

describe("runsToHtml", () => {
  it("emits font-family and font-size for a legitimate run", () => {
    expect(runsToHtml([{ text: "Cth", font: "Times New Roman", size: 10 }])).toBe(
      `<span style="font-family: 'Times New Roman'; font-size: 10pt;">Cth</span>`
    );
  });

  it("omits font-family for a breakout attempt but keeps the rest", () => {
    const html = runsToHtml([{ text: "x", font: "a'; } body { display: none", size: 10 }]);
    expect(html).toBe(`<span style="font-size: 10pt;">x</span>`);
  });

  it("never lets quote or semicolon font names reach the style attribute", () => {
    for (const font of [`Arial'; color: red`, `Arial" onload="x`, "Arial: hover", "Ari\\al"]) {
      const html = runsToHtml([{ text: "x", font, smallCaps: true }]);
      expect(html).toBe(`<span style="font-variant: small-caps;">x</span>`);
    }
  });

  it("drops non-finite, zero, negative, and non-numeric sizes", () => {
    for (const size of [NaN, Infinity, -Infinity, 0, -12, "12" as unknown as number]) {
      const html = runsToHtml([{ text: "x", size, smallCaps: true }]);
      expect(html).toBe(`<span style="font-variant: small-caps;">x</span>`);
    }
  });

  it("emits no span at all when every style value is dropped", () => {
    expect(runsToHtml([{ text: "x", font: "Bad;Font", size: NaN }])).toBe("x");
  });

  it("still wraps italic, bold, and superscript runs as before", () => {
    expect(runsToHtml([{ text: "CLR", italic: true, bold: true, superscript: true }])).toBe(
      "<sup><b><i>CLR</i></b></sup>"
    );
  });
});
