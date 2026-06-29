/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Rule 1.12.1: author lines (and the optional small-caps title variant) render
 * in small capitals. Word draws small caps by showing uppercase letters at full
 * height and lowercase as small caps, so an ALL-CAPS name produces no small-caps
 * effect. normalizeForSmallCaps title-cases all-caps input so the first letter
 * of each name is a full-height cap and the rest are small caps.
 */

import { normalizeForSmallCaps } from "../../src/word/template";

describe("normalizeForSmallCaps", () => {
  it("title-cases all-caps input so small caps show a large initial", () => {
    expect(normalizeForSmallCaps("ALBERT AUTHOR")).toBe("Albert Author");
  });

  it("title-cases lower-case input so small caps show a large initial", () => {
    expect(normalizeForSmallCaps("matt watt")).toBe("Matt Watt");
    expect(normalizeForSmallCaps("jane smith")).toBe("Jane Smith");
  });

  it("leaves correctly mixed-case names as typed", () => {
    expect(normalizeForSmallCaps("Albert Author")).toBe("Albert Author");
    expect(normalizeForSmallCaps("Jane McDonald")).toBe("Jane McDonald");
    expect(normalizeForSmallCaps("Niamh O'Brien")).toBe("Niamh O'Brien");
  });

  it("capitalises after spaces, hyphens, and apostrophes when all-caps", () => {
    expect(normalizeForSmallCaps("MARY-JANE O'BRIEN")).toBe("Mary-Jane O'Brien");
  });

  it("handles a single name and empty input", () => {
    expect(normalizeForSmallCaps("PLATO")).toBe("Plato");
    expect(normalizeForSmallCaps("")).toBe("");
  });
});
