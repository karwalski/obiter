/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Regression: an empty or malformed pinpoint object (e.g. { value: undefined }
 * left in citation.data.pinpoint) rendered the literal string "undefined" —
 * ", undefined" in a full citation and "undefinedundefined" in a subsequent
 * reference (formatPinpoint interpolates both prefix and value). No pinpoint
 * should render at all.
 */
import { Citation, SourceType, Pinpoint } from "../../src/types/citation";
import { FormattedRun } from "../../src/types/formattedRun";
import { formatCitation } from "../../src/engine/engine";
import { formatShortReference } from "../../src/engine/resolver";

function makeCitation(
  overrides: Partial<Citation> & { id: string; sourceType: SourceType }
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

const plain = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

// A malformed pinpoint object: passes a truthy check but has no usable value.
const MALFORMED = { type: "page", value: undefined } as unknown as Pinpoint;

describe("pinpoint 'undefined' rendering regression", () => {
  const mncBase = {
    id: "harazi",
    sourceType: "case.unreported.mnc" as SourceType,
    data: {
      party1: "R",
      party2: "Al-Harazi",
      year: "2016",
      court: "ACTSC",
      caseNumber: "250",
    },
  };

  it("full unreported-MNC citation with a malformed pinpoint renders no 'undefined'", () => {
    const runs = formatCitation(
      makeCitation({ ...mncBase, data: { ...mncBase.data, pinpoint: MALFORMED } })
    );
    const text = plain(runs);
    expect(text).toContain("[2016] ACTSC 250");
    expect(text).not.toContain("undefined");
    expect(text).not.toMatch(/,\s*$/); // no dangling ", "
  });

  it("full citation with an empty-string pinpoint renders no 'undefined'", () => {
    const runs = formatCitation(
      makeCitation({ ...mncBase, data: { ...mncBase.data, pinpoint: "" } })
    );
    expect(plain(runs)).not.toContain("undefined");
  });

  it("full citation with a real pinpoint still renders it", () => {
    const runs = formatCitation(
      makeCitation({ ...mncBase, data: { ...mncBase.data, pinpoint: "[50]" } })
    );
    expect(plain(runs)).toContain("[50]");
    expect(plain(runs)).not.toContain("undefined");
  });

  it("subsequent (short) reference with a malformed pinpoint renders no 'undefinedundefined'", () => {
    const citation = makeCitation({
      id: "aj",
      sourceType: "case.reported",
      shortTitle: "AJ",
      data: { party1: "A", party2: "J", year: "2013" },
    });
    const runs = formatShortReference(citation, 14, MALFORMED);
    const text = plain(runs);
    expect(text).toContain("(n 14)");
    expect(text).not.toContain("undefined");
  });

  it("subsequent reference with a real pinpoint still renders it", () => {
    const citation = makeCitation({
      id: "aj",
      sourceType: "case.reported",
      shortTitle: "AJ",
      data: { party1: "A", party2: "J", year: "2013" },
    });
    const text = plain(formatShortReference(citation, 14, { type: "paragraph", value: "[50]" }));
    expect(text).toContain("(n 14)");
    expect(text).toContain("[50]");
  });
});
