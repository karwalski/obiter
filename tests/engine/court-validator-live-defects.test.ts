/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Defects B2 and B3 from live testing in Word for the web (Federal Court
 * profile, court submission mode), 7 Oct 2026.
 *
 * - B2 / COURT-111: a recorded MNC satisfies parallel-citation enforcement.
 * - B3 / COURT-110: FCA GPN-AUTH cl 2.6 ("at [29]") supports a
 *   paragraph-only pinpoint, so the AGLC4 r 2.2.5 warning becomes an
 *   information note under the Federal Court profile only.
 *
 * Sources: FCA GPN-AUTH (7 May 2025) cl 2.4–2.6 (register FCA-1, O-R2);
 * AGLC4 rr 2.2.5, 2.2.7 (derived reference, PDF pp 77, 79).
 */

import { getPresetToggles } from "../../src/engine/court/profile";
import type { CourtJurisdiction } from "../../src/engine/court/presets";
import {
  checkParallelCitationEnforcement,
  checkReportParagraphPinpoints,
  type CitationOccurrence,
} from "../../src/engine/validator";
import { citationOccurrencesFromControls } from "../../src/word/footnoteManager";
import { runDocumentValidation } from "../../src/engine/documentValidation";
import type { Citation } from "../../src/types/citation";

function kozarov(extra: Record<string, unknown> = {}): Citation {
  return {
    id: "kozarov",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Kozarov",
      party2: "Victoria",
      yearType: "round",
      year: 2022,
      volume: 273,
      reportSeries: "CLR",
      startingPage: 115,
      mnc: "[2022] HCA 12",
      pinpoint: "[45]",
      ...extra,
    },
    tags: [],
    createdAt: "2026-10-07T00:00:00Z",
    modifiedAt: "2026-10-07T00:00:00Z",
  } as Citation;
}

describe("B2 / COURT-111: a recorded MNC satisfies parallel-citation enforcement", () => {
  test("no issue when the MNC is recorded in the mnc field", () => {
    expect(checkParallelCitationEnforcement([kozarov()], "mandatory", "FCA GPN-AUTH")).toEqual([]);
  });

  test("still flags a reported case with neither parallels nor an MNC", () => {
    const issues = checkParallelCitationEnforcement(
      [kozarov({ mnc: "" })],
      "mandatory",
      "FCA GPN-AUTH"
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
  });

  test("the MNC does not count where the profile's report replaces it", () => {
    const issues = checkParallelCitationEnforcement(
      [kozarov()],
      "preferred",
      "Court practice direction",
      "omit"
    );
    expect(issues).toHaveLength(1);
  });

  test("the FCA document validation raises no parallel-citation issue for Kozarov", () => {
    const result = runDocumentValidation({
      footnoteTexts: [],
      bodyText: "",
      headingLevels: [],
      citations: [kozarov()],
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "FCA",
      courtToggles: getPresetToggles("FCA") as Record<string, string>,
    });
    const all = [...result.errors, ...result.warnings, ...result.info];
    expect(all.some((i) => i.message.includes("Parallel citations"))).toBe(false);
  });
});

describe("B3 / COURT-110: paragraph-only pinpoint under a profile with instrument evidence", () => {
  test("FCA: information note naming the profile, not the AGLC4 warning", () => {
    const issues = checkReportParagraphPinpoints([kozarov()], "2.2.5", {
      courtJurisdiction: "FCA",
      courtRuleNumber: "FCA GPN-AUTH (7 May 2025)",
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].ruleNumber).toBe("FCA GPN-AUTH (7 May 2025)");
    expect(issues[0].message).toContain("Federal Court profile accepts this");
    expect(issues[0].message).toContain("cl 2.6");
  });

  test("FCA without an MNC keeps the warning (the paragraph would point into the report)", () => {
    const issues = checkReportParagraphPinpoints([kozarov({ mnc: "" })], "2.2.5", {
      courtJurisdiction: "FCA",
    });
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].ruleNumber).toBe("2.2.5");
  });

  test("profiles without register evidence keep the AGLC4 warning", () => {
    for (const id of ["HCA", "NSWCA", "QCA", "WASC", "VSC"]) {
      const issues = checkReportParagraphPinpoints([kozarov()], "2.2.5", {
        courtJurisdiction: id,
      });
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("AGLC4 r 2.2.5 requires a page");
    }
  });

  test("document validation: FCA gives info, NSWCA gives the warning", () => {
    const run = (id: CourtJurisdiction) =>
      runDocumentValidation({
        footnoteTexts: [],
        bodyText: "",
        headingLevels: [],
        citations: [kozarov()],
        standardId: "aglc4",
        writingMode: "court",
        courtJurisdiction: id,
        courtToggles: getPresetToggles(id) as Record<string, string>,
      });
    const fca = run("FCA");
    expect(fca.warnings.some((i) => i.message.includes("paragraph pinpoint has no page"))).toBe(
      false
    );
    expect(fca.info.some((i) => i.message.includes("Federal Court profile"))).toBe(true);
    const nsw = run("NSWCA");
    expect(nsw.warnings.some((i) => i.message.includes("paragraph pinpoint has no page"))).toBe(
      true
    );
  });
});

describe("N2 / COURT-110: the pinpoints checked are the ones in the footnotes", () => {
  // Live case (Word for the web, v1.17.9): the record held "45" while the
  // two footnotes held "[45]" and "[50]".
  const live = (): Citation => kozarov({ pinpoint: "45" });
  const occurrences: CitationOccurrence[] = [
    { citationId: "kozarov", footnoteIndex: 1, pinpoint: "[45]" },
    { citationId: "kozarov", footnoteIndex: 2, pinpoint: "[50]" },
  ];

  test("FCA: one information note, naming both footnotes", () => {
    const issues = checkReportParagraphPinpoints(
      [live()],
      "2.2.5",
      { courtJurisdiction: "FCA", courtRuleNumber: "FCA GPN-AUTH (7 May 2025)" },
      occurrences
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("Federal Court profile accepts this");
    expect(issues[0].message).toContain("(footnotes 1 and 2)");
    expect(issues[0].footnoteIndex).toBe(1);
  });

  test("AGLC4 (no profile evidence): one warning naming footnotes 1 and 2", () => {
    const issues = checkReportParagraphPinpoints([live()], "2.2.5", undefined, occurrences);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].ruleNumber).toBe("2.2.5");
    expect(issues[0].message).toContain("(footnotes 1 and 2)");
    expect(issues[0].message).toContain("AGLC4 r 2.2.5 requires a page");
    expect(issues[0].message).not.toContain("!");
  });

  test("a stale paragraph-only record is not flagged when the footnotes give a page", () => {
    const issues = checkReportParagraphPinpoints(
      [kozarov({ pinpoint: "[45]" })],
      "2.2.5",
      undefined,
      [{ citationId: "kozarov", footnoteIndex: 3, pinpoint: "410 [45]" }]
    );
    expect(issues).toEqual([]);
  });

  test("only the footnotes with a paragraph-only pinpoint are named", () => {
    const issues = checkReportParagraphPinpoints([live()], "2.2.5", undefined, [
      { citationId: "kozarov", footnoteIndex: 1, pinpoint: "120 [45]" },
      { citationId: "kozarov", footnoteIndex: 4, pinpoint: "[50]" },
      { citationId: "kozarov", footnoteIndex: 6 },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("(footnote 4)");
    expect(issues[0].footnoteIndex).toBe(4);
  });

  test("with no occurrence pinpoint, the record's pinpoint is read (no footnote named)", () => {
    const issues = checkReportParagraphPinpoints(
      [kozarov({ pinpoint: "[45]" })],
      "2.2.5",
      undefined,
      [{ citationId: "kozarov", footnoteIndex: 1 }]
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].message).not.toContain("footnote");
    expect(issues[0].footnoteIndex).toBeUndefined();
  });

  test("document validation passes the occurrences through", () => {
    const run = (id: CourtJurisdiction) =>
      runDocumentValidation({
        footnoteTexts: [],
        bodyText: "",
        headingLevels: [],
        citations: [live()],
        standardId: "aglc4",
        writingMode: "court",
        courtJurisdiction: id,
        courtToggles: getPresetToggles(id) as Record<string, string>,
        occurrences,
      });
    const all = (r: ReturnType<typeof run>) => [...r.errors, ...r.warnings, ...r.info];
    const fca = all(run("FCA")).filter((i) => i.message.includes("without a page"));
    expect(fca).toHaveLength(1);
    expect(fca[0].severity).toBe("info");
    const nsw = all(run("NSWCA")).filter((i) => i.message.includes("pinpoint has no page"));
    expect(nsw).toHaveLength(1);
    expect(nsw[0].severity).toBe("warning");
    expect(nsw[0].message).toContain("footnotes 1 and 2");
  });
});

describe("N2: citationOccurrencesFromControls reads the occurrence titles", () => {
  test("pinpoints per footnote, internal controls skipped", () => {
    expect(
      citationOccurrencesFromControls([
        [
          { tag: "obiter-fn", title: "Obiter Footnote" },
          { tag: "kozarov", title: "Citation:auto:[45]" },
        ],
        [{ tag: "kozarov", title: "Citation:short:[50]" }],
        [{ tag: "other", title: "Citation:auto" }],
      ])
    ).toEqual([
      { citationId: "kozarov", footnoteIndex: 1, pinpoint: "[45]" },
      { citationId: "kozarov", footnoteIndex: 2, pinpoint: "[50]" },
      { citationId: "other", footnoteIndex: 3 },
    ]);
  });
});
