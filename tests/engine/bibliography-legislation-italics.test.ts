/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Rule 3.1.1: in the bibliography, a statute's title AND year are italicised
 * (the year is part of the title); the jurisdiction in parentheses is roman.
 * Regression test for the year previously rendering in roman.
 */

import { Citation, SourceType } from "../../src/types/citation";
import { FormattedRun } from "../../src/types/formattedRun";
import { formatBibliographyEntry } from "../../src/engine/rules/v4/general/bibliography";

function makeCitation(
  overrides: Partial<Citation> & { id: string; sourceType: SourceType },
): Citation {
  return {
    aglcVersion: "4",
    data: {},
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const italicText = (runs: FormattedRun[]): string =>
  runs.filter((r) => r.italic).map((r) => r.text).join("");
const romanText = (runs: FormattedRun[]): string =>
  runs.filter((r) => !r.italic).map((r) => r.text).join("");

describe("bibliography legislation italics (Rule 3.1.1)", () => {
  const statute = makeCitation({
    id: "leg-crimes",
    sourceType: "legislation.act" as SourceType,
    data: { title: "Crimes Act", year: 1900, jurisdiction: "NSW" },
  });

  it("italicises the legislation title and year together", () => {
    const runs = formatBibliographyEntry(statute);
    expect(italicText(runs)).toContain("Crimes Act");
    expect(italicText(runs)).toContain("1900");
  });

  it("keeps the jurisdiction roman, not italic", () => {
    const runs = formatBibliographyEntry(statute);
    expect(romanText(runs)).toContain("(NSW)");
    expect(italicText(runs)).not.toContain("NSW");
  });
});
