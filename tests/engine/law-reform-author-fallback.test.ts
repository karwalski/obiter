/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Regression: a stale empty-string author field (e.g. `commissionName: ""`
 * left in formData when switching source types) must not suppress the real
 * author held under a fallback key. `pickString` treats "" as absent so the
 * fallback chain still resolves (AGLC4 Rule 7.1.4).
 */

import { getFormattedPreview } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";

function previewText(sourceType: string, data: Record<string, unknown>): string {
  const citation = {
    id: "",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  } as Citation;
  return getFormattedPreview(citation).map((r) => r.text).join("");
}

const EXPECTED =
  "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting " +
  "and Human Health (Report No 99, 2004).";

describe("Law Reform Report author fallback (Rule 7.1.4)", () => {
  const base = {
    title: "Genes and Ingenuity: Gene Patenting and Human Health",
    reportNumber: "99",
    year: "2004",
  };

  it("renders the author from `body` (as the form writes it)", () => {
    expect(
      previewText("report.law_reform", {
        body: "Australian Law Reform Commission",
        ...base,
      }),
    ).toBe(EXPECTED);
  });

  it("falls through a stale empty `commissionName` to `body`", () => {
    expect(
      previewText("report.law_reform", {
        commissionName: "",
        body: "Australian Law Reform Commission",
        ...base,
      }),
    ).toBe(EXPECTED);
  });

  it("a whitespace-only first candidate is also treated as absent", () => {
    expect(
      previewText("report.law_reform", {
        commissionName: "   ",
        body: "Australian Law Reform Commission",
        ...base,
      }),
    ).toBe(EXPECTED);
  });
});
