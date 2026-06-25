/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * checkLegislativeHistoryHint — the principal-Act nudge (Note to Rule 3.1.2 /
 * Rule 3.8, DECISION-008). Info severity only; never an error.
 */

import { checkLegislativeHistoryHint } from "../../src/engine/validator";
import type { Citation } from "../../src/types/citation";

function makeCitation(
  overrides: Partial<Citation> & Pick<Citation, "sourceType" | "data">,
): Citation {
  return {
    id: "leg-001",
    aglcVersion: "4",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("checkLegislativeHistoryHint (Note to Rule 3.1.2 / Rule 3.8)", () => {
  it("emits an info nudge for a passive amendment hybrid", () => {
    const citation = makeCitation({
      sourceType: "legislation.statute",
      shortTitle: "Patents Act",
      data: {
        title: "Patents Act",
        year: 1990,
        jurisdiction: "Cth",
        pinpoint: "s 7",
        legislativeHistory: { connector: "as amended by" },
      },
    });
    const issues = checkLegislativeHistoryHint(citation);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].ruleNumber).toBe("3.1.2");
    expect(issues[0].message).toContain("as amended by");
  });

  it("also nudges 'later amended by' and the Bill 'amended by' form", () => {
    for (const connector of ["later amended by", "amended by"]) {
      const issues = checkLegislativeHistoryHint(
        makeCitation({
          sourceType: "legislation.statute",
          data: { legislativeHistory: { connector } },
        }),
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("info");
    }
  });

  it("does not nudge active or non-amendment connectors", () => {
    for (const connector of ["amending", "as repealed by", "as inserted by", "as enacted", "as at"]) {
      const issues = checkLegislativeHistoryHint(
        makeCitation({
          sourceType: "legislation.statute",
          data: { legislativeHistory: { connector } },
        }),
      );
      expect(issues).toHaveLength(0);
    }
  });

  it("is silent for a plain single-Act citation (no history)", () => {
    const issues = checkLegislativeHistoryHint(
      makeCitation({
        sourceType: "legislation.statute",
        data: { title: "Patents Act", year: 1990, jurisdiction: "Cth" },
      }),
    );
    expect(issues).toHaveLength(0);
  });

  it("is silent for non-legislation source types", () => {
    const issues = checkLegislativeHistoryHint(
      makeCitation({
        sourceType: "case.reported",
        data: { legislativeHistory: { connector: "as amended by" } },
      }),
    );
    expect(issues).toHaveLength(0);
  });
});
