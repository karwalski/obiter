/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Field-reported formatting bugs:
 *  1. Dictionary defined term dropped (form key `entryTerm` vs engine `entry`).
 *  2. Reported case rendered entirely in italics (only the case name should be
 *     italic — AGLC4 Rule 2). The engine must emit the citation reference as
 *     non-italic runs so the Word writer does not inherit the name's italic.
 */

import { getFormattedPreview } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

function preview(sourceType: string, data: Record<string, unknown>): FormattedRun[] {
  const citation = {
    id: "", aglcVersion: "4", sourceType, data,
    tags: [], createdAt: "", modifiedAt: "",
  } as Citation;
  return getFormattedPreview(citation);
}
const plain = (r: FormattedRun[]) => r.map((x) => x.text).join("");
const italic = (r: FormattedRun[]) => r.filter((x) => x.italic).map((x) => x.text).join("");

describe("Dictionary defined term (Rule 7.6)", () => {
  it("renders the defined word entered via the form's `entryTerm` key", () => {
    const runs = preview("dictionary", {
      title: "LexisNexis Australian Concise Legal Dictionary",
      edition: "7th",
      year: "2016",
      entryTerm: "Fiduciary Relationship",
    });
    const text = plain(runs);
    expect(text).toContain("‘Fiduciary Relationship’");
    expect(text).not.toContain("‘’"); // no empty single quotes
  });
});

describe("Reported case italics (AGLC4 Rule 2)", () => {
  it("italicises only the case name, not the citation reference", () => {
    const runs = preview("case.reported", {
      party1: "Smith",
      party2: "Jones",
      yearType: "square",
      year: "2009",
      reportSeries: "NSWLR",
      startingPage: "32",
    });

    // Case name is italic …
    expect(italic(runs)).toContain("Smith");
    expect(italic(runs)).toContain("Jones");
    // … but the citation reference ([2009] NSWLR 32) must be roman.
    const italicText = italic(runs);
    expect(italicText).not.toMatch(/2009/);
    expect(italicText).not.toMatch(/NSWLR/);
    expect(italicText).not.toMatch(/32/);
  });
});
