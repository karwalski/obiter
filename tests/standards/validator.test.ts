/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-008 — Validator rule sets per standard.
 *
 * Which checks fire, and which must stay silent, when the Validation view
 * validates a document under AGLC4, OSCOLA 5, OSCOLA 4 and NZLSG 3 and under
 * the court presets; every rule in `checkOscolaRules` and `checkNzlsgRules`
 * with a positive and a negative case; the court validation matrix; and a
 * check-set contract that makes drift visible.
 *
 * Convention (STD epic): every test asserts the CORRECT behaviour and names
 * the rule. Where the validator does not yet behave that way the assertion is
 * kept and the test is marked `test.failing` with the fix story (STD-019), so
 * the suite is green now and flips when the fix lands (the fixer removes
 * `.failing`). Rule questions the sources do not settle are `test.todo`
 * entries for DECISION-040.
 *
 * Rule authority consulted (22 September 2026):
 * - OSCOLA 5 (https://www.law.ox.ac.uk/sites/default/files/2026-03/OSCOLA%205.pdf):
 *   §1.1 p 3 (close footnotes with a full stop; separate citations with
 *   semicolons); §1.2.1 p 6 ("'ibid' should not be used"); §1.3.3 p 8 (Latin
 *   phrases in common legal usage such as obiter dicta and ratio decidendi are
 *   not italicised); §1.5 p 9 (single inverted commas, double for quotations
 *   within quotations; quotations longer than three lines indented; a space
 *   either side of an ellipsis); §1.6/1.6.2 p 11 (tables of cases in longer
 *   works only); §2.1.1 p 14 and §2.1.3 p 18 (neutral citation followed by
 *   the best report where reported; neutral citations from 2001, all High
 *   Court divisions from 2002); §2.4.1 p 25 (statute title not italicised).
 * - OSCOLA 4 PDF §1.2.1 and §1.2.3 (ibid permitted for the immediately
 *   preceding footnote; after a multi-source footnote only when referring to
 *   all of them).
 * - NZLSG 3 (https://www.lawfoundation.org.nz/style-guide2019/): 1.1.1(c)
 *   (macrons must be used; quotations follow the original); 1.1.3 (Latin in
 *   common legal usage not italicised); 1.2.2 (double quotation marks, single
 *   within; 30+ words indented; ellipsis preceded and followed by a space);
 *   2.2.4(a) (footnotes conclude with a full stop); 2.3.1 ("above n x"
 *   instead of ibid); 3.1(a) (neutral citation followed by the report; "at"
 *   before pinpoints); 4.1.1(a) (short title in ordinary text, not italics).
 * - Court presets: src/engine/court/presets.ts sign-off comments and
 *   docs/court-practices-review.md.
 */

import {
  validateDocument,
  checkOscolaRules,
  checkNzlsgRules,
  validateCourtMode,
} from "../../src/engine/validator";
import type {
  ValidationIssue,
  ValidationResult,
  CourtModeConfig,
  HeadingEntry,
} from "../../src/engine/validator";
import { COURT_PRESETS } from "../../src/engine/court/presets";
import type { Citation } from "../../src/types/citation";
import { configFor } from "./runner";
import type { StandardKey, CourtPresetKey } from "./runner";

// ─── Harness ────────────────────────────────────────────────────────────────

interface DocumentInput {
  footnotes: string[];
  citations: Citation[];
  bodyText?: string;
  headings?: HeadingEntry[];
}

function flatten(result: ValidationResult): ValidationIssue[] {
  return [...result.errors, ...result.warnings, ...result.info];
}

/**
 * Runs validation the way src/ui/views/Validation.tsx (lines 206–240) does:
 * `validateDocument` with the document config built exactly as the view
 * builds it (`configFor` = buildCourtConfig({ ...getStandardConfig(id),
 * writingMode }, toggles)), then the standard-specific rule set merged in for
 * `oscola*` / `nzlsg*`.
 *
 * The view does not pass `headings`; they are passed here because
 * `validateDocument` accepts them and the heading check's membership is under
 * test. When STD-019 changes the validator's signature this is the one place
 * to update.
 */
function validateAs(
  std: StandardKey,
  doc: DocumentInput,
  preset?: CourtPresetKey
): ValidationIssue[] {
  const config = configFor(std, preset ? { preset } : undefined);
  // STD-019: the view passes the standard and the court config as an options
  // object (src/ui/views/Validation.tsx); `headings` is the one addition.
  const result = validateDocument(doc.footnotes, doc.citations, doc.bodyText, {
    standardId: config.standardId,
    writingMode: config.writingMode,
    courtJurisdiction: preset,
    parallelCitationMode: config.parallelCitationMode,
    ibidSuppressionMode: config.ibidSuppressionMode,
    unreportedGateMode: config.unreportedGateMode,
    headings: doc.headings,
  });
  const issues = flatten(result);
  if (std.startsWith("oscola")) {
    issues.push(
      ...checkOscolaRules(doc.citations, doc.footnotes, { standardId: config.standardId })
    );
  } else if (std.startsWith("nzlsg")) {
    issues.push(...checkNzlsgRules(doc.citations, doc.footnotes));
  }
  return issues;
}

/** Sorted, de-duplicated rule ids of `issues`. */
function ruleIds(issues: ValidationIssue[]): string[] {
  return Array.from(new Set(issues.map((issue) => issue.ruleNumber))).sort();
}

function withRule(issues: ValidationIssue[], ruleNumber: string): ValidationIssue[] {
  return issues.filter((issue) => issue.ruleNumber === ruleNumber);
}

function matching(issues: ValidationIssue[], pattern: RegExp): ValidationIssue[] {
  return issues.filter((issue) => pattern.test(issue.message));
}

/** Issues emitted by the standard-specific rule sets (`OSCOLA …` / `NZLSG …`). */
function fromStandardSet(issues: ValidationIssue[], family: "OSCOLA" | "NZLSG"): ValidationIssue[] {
  return issues.filter((issue) => issue.ruleNumber.startsWith(family));
}

function cite(
  id: string,
  sourceType: Citation["sourceType"],
  data: Citation["data"],
  shortTitle?: string
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType,
    data,
    ...(shortTitle ? { shortTitle } : {}),
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** Pape v Commissioner of Taxation (2009) 238 CLR 1; [2009] HCA 23 — report + MNC as a parallel. */
const papeWithParallel = cite(
  "pape",
  "case.reported",
  {
    party1: "Pape",
    party2: "Commissioner of Taxation",
    yearType: "round",
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
    mnc: "[2009] HCA 23",
    parallelCitations: [{ yearType: "square", year: 2009, reportSeries: "HCA", startingPage: 23 }],
  },
  "Pape"
);

/** Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884 (OSCOLA 5 §2.1.1 example). */
const corr = cite(
  "corr",
  "case.reported",
  {
    party1: "Corr",
    party2: "IBC Vehicles Ltd",
    yearType: "square",
    year: 2008,
    volume: 1,
    reportSeries: "AC",
    startingPage: 884,
    courtId: "UKHL",
    mnc: "[2008] UKHL 13",
    parallelCitations: [{ yearType: "square", year: 2008, reportSeries: "UKHL", startingPage: 13 }],
  },
  "Corr"
);

/** AstraZeneca Ltd v Commerce Commission [2009] NZSC 92, [2010] 1 NZLR 297 (NZLSG 3 r 3.1(a) example). */
const astraZeneca = cite(
  "astra",
  "case.reported",
  {
    party1: "AstraZeneca Ltd",
    party2: "Commerce Commission",
    yearType: "square",
    year: 2010,
    volume: 1,
    reportSeries: "NZLR",
    startingPage: 297,
    courtId: "NZSC",
    mnc: "[2009] NZSC 92",
    parallelCitations: [{ yearType: "square", year: 2009, reportSeries: "NZSC", startingPage: 92 }],
  },
  "AstraZeneca"
);

const humanRightsAct = cite(
  "hra",
  "legislation.statute",
  { title: "Human Rights Act", year: 1998, jurisdiction: "UK" },
  "HRA"
);

const securitiesAct = cite(
  "securities",
  "legislation.statute",
  { title: "Securities Act", year: 1978, jurisdiction: "NZ" },
  "Securities Act"
);

/** R (Roberts) v Parole Board [2005] QB 410 — a post-2001 CA case entered without its neutral citation. */
const robertsNoMnc = cite(
  "roberts",
  "case.reported",
  {
    party1: "R (Roberts)",
    party2: "Parole Board",
    yearType: "square",
    year: 2005,
    reportSeries: "QB",
    startingPage: 410,
    courtId: "EWCA",
  },
  "Roberts"
);

const robertsWithMnc = cite("roberts-mnc", "case.reported", {
  ...robertsNoMnc.data,
  mnc: "[2004] EWCA Civ 1031",
});

/** Pre-2001 House of Lords case: no neutral citation existed. */
const pre2001Lords = cite("witham", "case.reported", {
  party1: "R v Lord Chancellor",
  party2: "ex p Witham",
  yearType: "square",
  year: 1998,
  reportSeries: "QB",
  startingPage: 575,
  courtId: "UKHL",
});

const LONG_QUOTE = "A".repeat(400);

/**
 * One mixed document exercising every scenario in the story: (a) a Latin
 * term, (b) a Level I heading in the wrong case, (c) a long quotation not in
 * a block, (d) an ellipsis with the wrong spacing, (e) 'Ibid' after a
 * two-source footnote, (f) cases cited with both a report and a neutral
 * citation, (g) a footnote without closing punctuation and straight quotes.
 */
const mixedDocument: DocumentInput = {
  footnotes: [
    "Pape v Commissioner of Taxation (2009) 238 CLR 1; [2009] HCA 23.",
    "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884; Human Rights Act 1998 (UK) s 3.",
    "Ibid.",
    "The court held ... that stare decisis did not apply.",
    `See ‘${LONG_QUOTE}’.`,
    "Pape (n 1) 10",
    'He said "no" at trial.',
    "AstraZeneca Ltd v Commerce Commission [2009] NZSC 92, [2010] 1 NZLR 297 at [29].",
  ],
  citations: [papeWithParallel, corr, astraZeneca, humanRightsAct],
  headings: [{ level: 1, text: "I Introduction" }],
};

const mixed: Record<StandardKey, ValidationIssue[]> = {
  aglc4: validateAs("aglc4", mixedDocument),
  oscola5: validateAs("oscola5", mixedDocument),
  oscola4: validateAs("oscola4", mixedDocument),
  nzlsg3: validateAs("nzlsg3", mixedDocument),
};

// ─── 1. Check-set membership per standard ───────────────────────────────────

describe("check-set membership per standard (mixed document)", () => {
  describe("aglc4 (academic)", () => {
    const issues = mixed.aglc4;

    test("AGLC4 r 1.8.3: the Latin-term italicisation reminder fires", () => {
      expect(withRule(issues, "1.8.3").length).toBeGreaterThan(0);
    });

    test("AGLC4 r 1.12.2: a Level I heading not in capitals is flagged", () => {
      expect(matching(withRule(issues, "1.12.2"), /Level I headings/)).toHaveLength(1);
    });

    test("AGLC4 r 1.5.1: a quotation longer than three lines outside a block is flagged", () => {
      expect(withRule(issues, "1.5.1")).toHaveLength(1);
    });

    test("AGLC4 r 1.5.3: an ellipsis without its surrounding spaces is flagged", () => {
      expect(withRule(issues, "1.5.3").length).toBeGreaterThan(0);
    });

    test("AGLC4 r 1.4.3: 'Ibid' after a footnote citing two sources is an error", () => {
      const ibid = withRule(issues, "1.4.3");
      expect(ibid).toHaveLength(1);
      expect(ibid[0].severity).toBe("error");
      expect(ibid[0].footnoteIndex).toBeUndefined();
      expect(ibid[0].message).toContain("Footnote 3");
    });

    test("AGLC4 r 2.2.7: an Australian case cited with a parallel citation is flagged for removal", () => {
      const pape = withRule(issues, "2.2.7").filter((issue) => issue.citationId === "pape");
      expect(pape).toHaveLength(1);
      expect(pape[0].message).toContain("prohibits parallel citations");
    });

    test("AGLC4 r 1.1.4: a footnote without closing punctuation is an error", () => {
      const closing = withRule(issues, "1.1.4");
      expect(closing).toHaveLength(1);
      expect(closing[0].footnoteIndex).toBe(6);
    });

    test("AGLC4 r 1.6: straight quotation marks are flagged", () => {
      expect(withRule(issues, "1.6")).toHaveLength(2);
    });

    test("no OSCOLA or NZLSG rule fires under AGLC4", () => {
      expect(fromStandardSet(issues, "OSCOLA")).toHaveLength(0);
      expect(fromStandardSet(issues, "NZLSG")).toHaveLength(0);
    });
  });

  describe("oscola5", () => {
    const issues = mixed.oscola5;

    test("OSCOLA 5 §1.3.3: common Latin phrases are not italicised, so the AGLC r 1.8.3 reminder is silent", () => {
      expect(withRule(issues, "1.8.3")).toHaveLength(0);
    });

    test("OSCOLA has no heading-case rule: AGLC r 1.12.2 is silent", () => {
      expect(withRule(issues, "1.12.2")).toHaveLength(0);
    });

    test("AGLC-only typography (r 1.6 curly quotes) is silent under OSCOLA", () => {
      expect(withRule(issues, "1.6")).toHaveLength(0);
    });

    test("OSCOLA 5 §1.5: a quotation longer than three lines outside an indented block is flagged", () => {
      expect(matching(issues, /long quotation/)).toHaveLength(1);
    });

    test("OSCOLA 5 §1.5: an ellipsis without a space either side is flagged", () => {
      expect(matching(issues, /ellipsis/i).length).toBeGreaterThan(0);
    });

    test("OSCOLA 5 §1.1: a footnote not closed with a full stop is flagged", () => {
      expect(matching(issues, /does not end with closing punctuation/)).toHaveLength(1);
    });

    test("OSCOLA 5 §1.2.1: 'Ibid' is flagged by the OSCOLA rule set", () => {
      const ibid = matching(fromStandardSet(issues, "OSCOLA"), /'Ibid'/);
      expect(ibid).toHaveLength(1);
      expect(ibid[0].severity).toBe("warning");
      expect(ibid[0].message).toContain("Footnote 3");
    });

    test("OSCOLA 5 §1.2.1: the AGLC r 1.4.3 multi-source ibid error does not also fire", () => {
      expect(withRule(issues, "1.4.3")).toHaveLength(0);
    });

    test("OSCOLA 5 §2.1.3: a neutral citation followed by the best report is required, not flagged for removal", () => {
      expect(withRule(issues, "2.2.7").filter((issue) => issue.citationId === "corr")).toHaveLength(
        0
      );
    });

    test("OSCOLA 5 §1.6.2: the Table of Cases reminder is info-level", () => {
      const table = matching(fromStandardSet(issues, "OSCOLA"), /Table of Cases/);
      expect(table).toHaveLength(1);
      expect(table[0].severity).toBe("info");
    });

    test("no NZLSG rule fires under OSCOLA 5", () => {
      expect(fromStandardSet(issues, "NZLSG")).toHaveLength(0);
    });
  });

  describe("oscola4", () => {
    const issues = mixed.oscola4;

    test("OSCOLA 4 §1.3.3: the AGLC r 1.8.3 Latin reminder is silent", () => {
      expect(withRule(issues, "1.8.3")).toHaveLength(0);
    });

    test("OSCOLA 4 has no heading-case rule: AGLC r 1.12.2 is silent", () => {
      expect(withRule(issues, "1.12.2")).toHaveLength(0);
    });

    test("AGLC-only typography (r 1.6 curly quotes) is silent under OSCOLA 4", () => {
      expect(withRule(issues, "1.6")).toHaveLength(0);
    });

    test("OSCOLA 4 §1.2.1/§1.2.3: ibid is permitted, so no 'Ibid is deprecated' warning fires", () => {
      expect(matching(fromStandardSet(issues, "OSCOLA"), /'Ibid'/)).toHaveLength(0);
    });

    test("OSCOLA 4 §1.2.3: ibid after a multi-source footnote may refer to all of them — the AGLC r 1.4.3 error is silent", () => {
      expect(withRule(issues, "1.4.3")).toHaveLength(0);
    });

    test("OSCOLA 4 §2.1.3: a neutral citation followed by the best report is required, not flagged for removal", () => {
      expect(withRule(issues, "2.2.7").filter((issue) => issue.citationId === "corr")).toHaveLength(
        0
      );
    });

    test("OSCOLA 4 §1.5 / §1.1: ellipsis spacing and closing full stop are still checked", () => {
      expect(matching(issues, /ellipsis/i).length).toBeGreaterThan(0);
      expect(matching(issues, /does not end with closing punctuation/)).toHaveLength(1);
    });
  });

  describe("nzlsg3", () => {
    const issues = mixed.nzlsg3;

    test("NZLSG 3 r 1.1.3: Latin in common legal usage is not italicised, so the AGLC r 1.8.3 reminder is silent", () => {
      expect(withRule(issues, "1.8.3")).toHaveLength(0);
    });

    test("NZLSG has no heading-case rule: AGLC r 1.12.2 is silent", () => {
      expect(withRule(issues, "1.12.2")).toHaveLength(0);
    });

    test("AGLC-only typography (r 1.6 curly quotes) is silent under NZLSG", () => {
      expect(withRule(issues, "1.6")).toHaveLength(0);
    });

    test("NZLSG 3 r 1.2.2(b)(v): an ellipsis not preceded and followed by a space is flagged", () => {
      expect(matching(issues, /ellipsis/i).length).toBeGreaterThan(0);
    });

    test("NZLSG 3 r 2.2.4(a): a footnote not concluded with a full stop is flagged", () => {
      expect(matching(issues, /does not end with closing punctuation/)).toHaveLength(1);
    });

    test("NZLSG 3 r 2.3.1: 'Ibid' is flagged by the NZLSG rule set", () => {
      const ibid = matching(fromStandardSet(issues, "NZLSG"), /'Ibid'/);
      expect(ibid).toHaveLength(1);
      expect(ibid[0].severity).toBe("warning");
      expect(ibid[0].message).toContain("Footnote 3");
    });

    test("NZLSG 3 r 2.3.1: the AGLC r 1.4.3 multi-source ibid error does not also fire", () => {
      expect(withRule(issues, "1.4.3")).toHaveLength(0);
    });

    test("NZLSG 3 r 3.1(a): a neutral citation followed by the report is the required form, not flagged for removal", () => {
      expect(
        withRule(issues, "2.2.7").filter((issue) => issue.citationId === "astra")
      ).toHaveLength(0);
    });

    test("NZLSG 3 r 1.2.2(a)(i): the single-quoted quotation is flagged (double quotation marks)", () => {
      expect(withRule(issues, "NZLSG 1.1.2").length).toBeGreaterThan(0);
    });

    test("no OSCOLA rule fires under NZLSG 3", () => {
      expect(fromStandardSet(issues, "OSCOLA")).toHaveLength(0);
    });
  });

  test.todo(
    "DECISION-040: OSCOLA 5 §2.1.3 requires the best report after a neutral citation where the case has been reported — what data would let the validator know a neutral-citation-only case has been reported (a 'missing report' warning cannot be asserted without it)?"
  );
});

// ─── 2. checkOscolaRules: every rule, positive and negative ─────────────────

describe("checkOscolaRules — every rule with a positive and a negative case", () => {
  describe("OSCOLA 5 §1.2.1 — 'ibid' should not be used (validator id 'OSCOLA 1.3')", () => {
    test("positive: 'Ibid' in a footnote is a warning with the '(n X)' suggestion", () => {
      const issues = checkOscolaRules([], ["Corr (n 1) [12].", "Ibid [14]."]);
      const ibid = matching(issues, /'Ibid'/);
      expect(ibid).toHaveLength(1);
      expect(ibid[0].severity).toBe("warning");
      expect(ibid[0].message).toContain("Footnote 2");
      expect(ibid[0].suggestion).toBe("(n X)");
      expect(ibid[0].offset).toBe(0);
      expect(ibid[0].length).toBe(4);
    });

    test("positive: lower-case 'ibid' is also caught", () => {
      expect(matching(checkOscolaRules([], ["ibid 45."]), /'Ibid'/)).toHaveLength(1);
    });

    test("negative: a '(n X)' short form raises no ibid issue", () => {
      expect(
        matching(checkOscolaRules([], ["Corr (n 1) [12].", "Corr (n 1) [14]."]), /'Ibid'/)
      ).toHaveLength(0);
    });

    test("through the view: OSCOLA 5 flags 'Ibid'", () => {
      const issues = validateAs("oscola5", { footnotes: ["Corr (n 1).", "Ibid."], citations: [] });
      expect(matching(fromStandardSet(issues, "OSCOLA"), /'Ibid'/)).toHaveLength(1);
    });

    test("through the view: OSCOLA 4 §1.2.1 permits ibid for the immediately preceding footnote — no warning", () => {
      const issues = validateAs("oscola4", {
        footnotes: ["Corr (n 1).", "ibid."],
        citations: [],
      });
      expect(matching(fromStandardSet(issues, "OSCOLA"), /'Ibid'/)).toHaveLength(0);
    });
  });

  describe("OSCOLA 5 §1.5 — single inverted commas for quotations (validator id 'OSCOLA 1.2')", () => {
    test("positive: double curly quotation marks around a title are flagged with the single-quote suggestion", () => {
      const issues = checkOscolaRules(
        [],
        ["Donal Nolan, “Deconstructing the Duty of Care” (2013) 129 LQR 559."]
      );
      const quotes = matching(issues, /single quotation marks/);
      expect(quotes).toHaveLength(2);
      expect(quotes[0].suggestion).toBe("‘");
      expect(quotes[1].suggestion).toBe("’");
      expect(quotes.every((issue) => issue.severity === "warning")).toBe(true);
    });

    test("negative: single curly quotation marks are correct", () => {
      const issues = checkOscolaRules(
        [],
        ["Donal Nolan, ‘Deconstructing the Duty of Care’ (2013) 129 LQR 559."]
      );
      expect(matching(issues, /single quotation marks/)).toHaveLength(0);
    });

    test("negative: double marks for a quotation within a quotation are correct (§1.5) and not flagged", () => {
      const issues = checkOscolaRules(
        [],
        ["Lord Hoffmann held that ‘the phrase “reasonable care” is elastic’."]
      );
      expect(matching(issues, /single quotation marks/)).toHaveLength(0);
    });
  });

  describe("OSCOLA 5 §2.4.1 — statute titles are not italicised (validator id 'OSCOLA 2.2')", () => {
    test.todo(
      "STD-019: positive case — decide the input that carries italics (formatted runs or a store flag) before asserting the OSCOLA §2.4.1 warning fires for an italicised statute title"
    );

    test("negative: a statute cited in roman (the only thing plain text can carry) raises no italics warning", () => {
      const issues = checkOscolaRules([humanRightsAct], ["Human Rights Act 1998, s 3."]);
      expect(matching(issues, /roman \(not italic\)/)).toHaveLength(0);
    });

    test("negative: a case citation never triggers the legislation italics warning", () => {
      const issues = checkOscolaRules(
        [corr],
        ["Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884."]
      );
      expect(matching(issues, /roman \(not italic\)/)).toHaveLength(0);
    });
  });

  describe("OSCOLA 5 §2.1.3 — neutral citation for cases from 2001 (validator id 'OSCOLA 2.1.1')", () => {
    test("positive: a post-2001 Court of Appeal case without a neutral citation is a warning", () => {
      const issues = checkOscolaRules(
        [robertsNoMnc],
        ["R (Roberts) v Parole Board [2005] QB 410."]
      );
      const neutral = matching(issues, /neutral citation/);
      expect(neutral).toHaveLength(1);
      expect(neutral[0].severity).toBe("warning");
      expect(neutral[0].message).toContain("post-2001");
    });

    test("negative: the same case with its neutral citation recorded is not flagged", () => {
      const issues = checkOscolaRules(
        [robertsWithMnc],
        ["R (Roberts) v Parole Board [2004] EWCA Civ 1031, [2005] QB 410."]
      );
      expect(matching(issues, /neutral citation/)).toHaveLength(0);
    });

    test("negative: a pre-2001 House of Lords case has no neutral citation to give", () => {
      const issues = checkOscolaRules(
        [pre2001Lords],
        ["R v Lord Chancellor, ex p Witham [1998] QB 575 (QBD)."]
      );
      expect(matching(issues, /neutral citation/)).toHaveLength(0);
    });

    test("negative: a non-UK court identifier is outside the rule", () => {
      const auCase = cite("au", "case.reported", {
        ...papeWithParallel.data,
        mnc: undefined,
        courtId: "HCA",
      });
      const issues = checkOscolaRules(
        [auCase],
        ["Pape v Commissioner of Taxation (2009) 238 CLR 1."]
      );
      expect(matching(issues, /neutral citation/)).toHaveLength(0);
    });

    test.todo(
      "DECISION-040: OSCOLA 5 §2.1.3 dates neutral citations to 2001 for HL/PC/CA/Admin but 2002 for the other High Court divisions — should a [2001] EWHC (Ch) case be flagged?"
    );
  });

  describe("OSCOLA 5 §1.6.2 — table of cases (validator id 'OSCOLA 1.4')", () => {
    test("positive: cases cited and no Table of Cases mentioned yields an info reminder", () => {
      const issues = checkOscolaRules(
        [corr],
        ["Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884."]
      );
      const table = matching(issues, /Table of Cases/);
      expect(table).toHaveLength(1);
      expect(table[0].severity).toBe("info");
    });

    test("negative: no case citations, no reminder", () => {
      const issues = checkOscolaRules([humanRightsAct], ["Human Rights Act 1998, s 3."]);
      expect(matching(issues, /Table of Cases/)).toHaveLength(0);
    });

    test("negative: a footnote referring to the Table of Cases suppresses the reminder", () => {
      const issues = checkOscolaRules(
        [corr],
        ["See the Table of Cases; Corr v IBC Vehicles Ltd [2008] UKHL 13."]
      );
      expect(matching(issues, /Table of Cases/)).toHaveLength(0);
    });
  });
});

// ─── 3. checkNzlsgRules: every rule, positive and negative ──────────────────

describe("checkNzlsgRules — every rule with a positive and a negative case", () => {
  describe("NZLSG 3 r 2.3.1 — 'above n x' instead of ibid (validator id 'NZLSG 2.3')", () => {
    test("positive: 'Ibid' is a warning pointing to the 'above n X, at [pinpoint]' form", () => {
      const issues = checkNzlsgRules([], ["Spiller, above n 21, at 70.", "Ibid, at 72."]);
      const ibid = matching(issues, /'Ibid'/);
      expect(ibid).toHaveLength(1);
      expect(ibid[0].severity).toBe("warning");
      expect(ibid[0].message).toContain("Footnote 2");
      expect(ibid[0].message).toContain("above n X");
      expect(ibid[0].ruleNumber).toMatch(/^NZLSG 2\.3/);
    });

    test("negative: an 'above n' subsequent reference raises no ibid issue", () => {
      const issues = checkNzlsgRules(
        [],
        ["Spiller, above n 21, at 70.", "Spiller, above n 21, at 72."]
      );
      expect(matching(issues, /'Ibid'/)).toHaveLength(0);
    });
  });

  describe("NZLSG 3 r 1.2.2 — double quotation marks, single within (validator id 'NZLSG 1.1.2')", () => {
    test("positive: single curly quotation marks around a title are flagged with the double-quote suggestion", () => {
      const issues = checkNzlsgRules(
        [],
        ["Peter Spiller, ‘Butterworths New Zealand Law Dictionary’ (8th ed, 2015)."]
      );
      const quotes = matching(issues, /double quotation marks/);
      expect(quotes).toHaveLength(2);
      expect(quotes[0].suggestion).toBe("“");
      expect(quotes[1].suggestion).toBe("”");
    });

    test("negative: double curly quotation marks are correct", () => {
      const issues = checkNzlsgRules(
        [],
        ["Peter Spiller, “Butterworths New Zealand Law Dictionary” (8th ed, 2015)."]
      );
      expect(matching(issues, /double quotation marks/)).toHaveLength(0);
    });

    test("negative: an apostrophe inside a word is not a quotation mark", () => {
      const issues = checkNzlsgRules([], ["The Crown’s submission was rejected."]);
      expect(matching(issues, /double quotation marks/)).toHaveLength(0);
    });

    test("negative: single marks for a quotation within a quotation are correct (r 1.2.2(b)(i)) and not flagged", () => {
      const issues = checkNzlsgRules(
        [],
        ["Tipping J said “the phrase ‘reasonable care’ is elastic”."]
      );
      expect(matching(issues, /double quotation marks/)).toHaveLength(0);
    });
  });

  describe("NZLSG 3 r 2.3.1 — '(n X)' is not the NZLSG cross-reference form (validator id 'NZLSG 2.3')", () => {
    test("positive: an OSCOLA-style '(n 3)' is flagged", () => {
      const issues = checkNzlsgRules([], ["Spiller (n 3) 70."]);
      const nx = matching(issues, /cross-reference style/);
      expect(nx).toHaveLength(1);
      expect(nx[0].severity).toBe("warning");
      expect(nx[0].offset).toBe(8);
      expect(nx[0].length).toBe(5);
    });

    test("negative: 'above n 3' is the NZLSG form and is not flagged", () => {
      const issues = checkNzlsgRules([], ["Spiller, above n 3, at 70."]);
      expect(matching(issues, /cross-reference style/)).toHaveLength(0);
    });

    test.todo(
      "DECISION-040: the '(n X)' message attributes the rule to an NZLSG 'commercial style' (NZLSG-008); the online 3rd edition r 2.3.1 prescribes 'above n x' with no commercial variant — where does the commercial style come from, and should the check be conditioned on it at all?"
    );
  });

  describe("NZLSG 3 r 3.1 — 'at' before a pinpoint (validator id 'NZLSG 2.2')", () => {
    test("positive: a bare page number after a comma at the end of a citation is flagged with the 'at' suggestion", () => {
      const issues = checkNzlsgRules([], ["R v Wang [1990] 2 NZLR 529 (CA), 534."]);
      const at = matching(issues, /requires 'at' before pinpoint/);
      expect(at).toHaveLength(1);
      expect(at[0].severity).toBe("info");
      expect(at[0].suggestion).toBe("at 534");
    });

    test("negative: 'at 534' is the NZLSG form and is not flagged", () => {
      const issues = checkNzlsgRules([], ["R v Wang [1990] 2 NZLR 529 (CA) at 534."]);
      expect(matching(issues, /requires 'at' before pinpoint/)).toHaveLength(0);
    });

    test("negative: ', at 534' is not flagged", () => {
      const issues = checkNzlsgRules([], ["Spiller, above n 21, at 534."]);
      expect(matching(issues, /requires 'at' before pinpoint/)).toHaveLength(0);
    });
  });

  describe("NZLSG 3 r 1.1.1(c) — macrons must be used (validator id 'NZLSG')", () => {
    test("positive: 'Maori' without its macron is flagged with the corrected spelling", () => {
      const issues = checkNzlsgRules([], ["The Maori Land Court so held."]);
      const macron = matching(issues, /should include macrons/);
      expect(macron).toHaveLength(1);
      expect(macron[0].severity).toBe("info");
      expect(macron[0].suggestion).toBe("Māori");
      expect(macron[0].offset).toBe(4);
      expect(macron[0].length).toBe(5);
    });

    test("positive: 'whanau' and 'hapu' are flagged; terms that take no macron ('iwi', 'taonga') are not", () => {
      const issues = checkNzlsgRules([], ["The whanau, hapu and iwi hold the taonga."]);
      const macron = matching(issues, /should include macrons/);
      expect(macron.map((issue) => issue.suggestion)).toEqual(["whānau", "hapū"]);
    });

    test("negative: correctly macronised words are not flagged", () => {
      const issues = checkNzlsgRules(
        [],
        ["The Māori Land Court held that the whānau and hapū retained mana."]
      );
      expect(matching(issues, /should include macrons/)).toHaveLength(0);
    });

    test("negative: r 1.1.1(c) — quotations follow the original, so a term inside a quotation is not flagged", () => {
      const issues = checkNzlsgRules([], ["The Act refers to “Maori land” throughout."]);
      expect(matching(issues, /should include macrons/)).toHaveLength(0);
    });
  });

  describe("NZLSG 3 r 4.1.1(a) — the short title in ordinary text, not italics (validator id 'NZLSG 4.1')", () => {
    test.todo(
      "STD-019: positive case — decide the input that carries italics (formatted runs or a store flag) before asserting the NZLSG r 4.1.1(a) warning fires for an italicised Act title"
    );

    test("negative: legislation cited in roman raises no italics warning", () => {
      const issues = checkNzlsgRules([securitiesAct], ["Securities Act 1978, s 63."]);
      expect(matching(issues, /roman \(not italic\)/)).toHaveLength(0);
    });

    test("negative: a case citation never triggers the legislation italics warning", () => {
      const issues = checkNzlsgRules(
        [astraZeneca],
        ["AstraZeneca Ltd v Commerce Commission [2009] NZSC 92, [2010] 1 NZLR 297."]
      );
      expect(matching(issues, /roman \(not italic\)/)).toHaveLength(0);
    });
  });
});

// ─── Shared footnote checks that hold under every standard ──────────────────

describe("shared footnote checks across standards", () => {
  const standards: StandardKey[] = ["aglc4", "oscola5", "oscola4", "nzlsg3"];

  describe.each(standards)("%s", (std) => {
    test("a '(n X)' cross-reference to a footnote that does not exist is an error", () => {
      const issues = validateAs(std, {
        footnotes: ["Corr [2008] UKHL 13.", "Corr (n 99) [12]."],
        citations: [],
      });
      const bad = matching(issues, /non-existent footnote/);
      expect(bad).toHaveLength(1);
      expect(bad[0].severity).toBe("error");
    });

    test("a footnote ending with a full stop, question mark or exclamation mark is not flagged", () => {
      const issues = validateAs(std, {
        footnotes: ["Is that so?", "It is.", "Indeed!"],
        citations: [],
      });
      expect(matching(issues, /does not end with closing punctuation/)).toHaveLength(0);
    });
  });

  test("NZLSG 3 r 2.3.1: an 'above n X' cross-reference to a footnote that does not exist is an error", () => {
    const issues = validateAs("nzlsg3", {
      footnotes: ["Spiller at 70.", "Spiller, above n 99, at 72."],
      citations: [],
    });
    expect(matching(issues, /non-existent footnote/)).toHaveLength(1);
  });

  test("NZLSG 3 r 1.2.2(a)(ii): a double-quoted quotation of 30 or more words outside an indented block is flagged", () => {
    const thirtyWords = Array.from({ length: 32 }, (_, i) => `word${i + 1}`).join(" ");
    const issues = validateAs("nzlsg3", {
      footnotes: [`Tipping J said “${thirtyWords}”.`],
      citations: [],
    });
    expect(matching(issues, /long quotation/)).toHaveLength(1);
  });

  test("NZLSG 3 r 1.2.2(a)(i): a short double-quoted quotation is not a long-quotation issue", () => {
    const issues = validateAs("nzlsg3", { footnotes: ["Tipping J said “no”."], citations: [] });
    expect(matching(issues, /long quotation/)).toHaveLength(0);
  });
});

// ─── 4. Court validation matrix ─────────────────────────────────────────────

const papeNoParallel = cite("pape-plain", "case.reported", {
  ...papeWithParallel.data,
  parallelCitations: undefined,
});

const smithUnreported = cite(
  "smith",
  "case.unreported.mnc",
  { party1: "Smith", party2: "Jones", year: 2024, mnc: "[2024] NSWSC 100" },
  "Smith"
);

const alphaTreated = cite(
  "alpha",
  "case.reported",
  {
    party1: "Alpha",
    party2: "Beta",
    yearType: "square",
    year: 2020,
    volume: 3,
    reportSeries: "Qd R",
    startingPage: 1,
    mnc: "[2020] QCA 1",
    subsequentTreatment: "Not affected",
  },
  "Alpha"
);

const competitionAct = cite(
  "cca",
  "legislation.statute",
  { title: "Competition and Consumer Act", year: 2010, jurisdiction: "Cth" },
  "CCA"
);

/** Five citations: report+MNC without parallels, with parallels, unreported and unconfirmed, treated, an Act. */
const courtDocument: DocumentInput = {
  footnotes: [
    "Pape v Commissioner of Taxation (2009) 238 CLR 1, [2009] HCA 23.",
    "Ibid.",
    "Smith v Jones [2024] NSWSC 100.",
    "Pape (n 1) 5.",
    "Alpha v Beta [2020] QCA 1, [2020] 3 Qd R 1.",
  ],
  citations: [papeNoParallel, papeWithParallel, smithUnreported, alphaTreated, competitionAct],
};

interface PresetExpectation {
  /** Severity of the parallel-citation enforcement issue, or null when parallels are off. */
  parallel: "error" | "warning" | null;
  /** Whether the Queensland subsequent-treatment check applies. */
  treatment: boolean;
  /** Whether the unreported-judgment gate warns. */
  unreportedGate: boolean;
}

const PRESET_EXPECTATIONS: Record<CourtPresetKey, PresetExpectation> = {
  HCA: { parallel: "error", treatment: false, unreportedGate: false },
  NSWCA: { parallel: "warning", treatment: false, unreportedGate: true },
  QSC: { parallel: "warning", treatment: true, unreportedGate: true },
  WASC: { parallel: "error", treatment: false, unreportedGate: false },
  STATE_TRIBUNAL: { parallel: null, treatment: false, unreportedGate: false },
};

const presetKeys = Object.keys(PRESET_EXPECTATIONS) as CourtPresetKey[];

describe("court validation matrix", () => {
  test.each(presetKeys)(
    "%s: configFor carries the preset toggles the way Validation.tsx builds the config",
    (preset) => {
      const preset$ = COURT_PRESETS[preset];
      const config = configFor("aglc4", { preset });
      expect(config.writingMode).toBe("court");
      expect(config.parallelCitationMode).toBe(preset$.parallelCitations);
      expect(config.ibidSuppressionMode).toBe(preset$.ibidSuppression);
      expect(config.unreportedGateMode).toBe(preset$.unreportedGate);
      expect(config.pinpointStyle).toBe(preset$.pinpointStyle);
      expect(config.loaType).toBe(preset$.loaType);
    }
  );

  test("the expectation table matches the preset definitions it is derived from", () => {
    for (const preset of presetKeys) {
      const expected = PRESET_EXPECTATIONS[preset];
      const p = COURT_PRESETS[preset];
      const parallel =
        p.parallelCitations === "off"
          ? null
          : p.parallelCitations === "mandatory"
            ? "error"
            : "warning";
      expect({ preset, parallel, gate: p.unreportedGate === "warn" }).toEqual({
        preset,
        parallel: expected.parallel,
        gate: expected.unreportedGate,
      });
    }
  });

  describe.each(presetKeys)("validateDocument via the view under %s", (preset) => {
    const expected = PRESET_EXPECTATIONS[preset];
    const issues = validateAs("aglc4", courtDocument, preset);
    const enforcement = matching(
      issues,
      /Parallel citations (required|recommended) for reported cases/
    );
    const prohibition = matching(issues, /prohibits parallel citations/);
    const treatment = matching(issues, /Subsequent treatment not recorded/);
    const gate = matching(issues, /Unreported judgment cited without confirmation/);

    if (expected.parallel === null) {
      test("parallel citations off: no enforcement issue for reported cases without parallels", () => {
        expect(enforcement).toHaveLength(0);
      });
    } else {
      test(`parallel citations ${COURT_PRESETS[preset].parallelCitations}: each reported case without parallels gets a ${expected.parallel}`, () => {
        expect(enforcement.map((issue) => issue.severity)).toEqual([
          expected.parallel,
          expected.parallel,
        ]);
        expect(enforcement.map((issue) => issue.message)).toEqual([
          expect.stringMatching(/'Pape\b/),
          expect.stringMatching(/'Alpha\b/),
        ]);
      });
    }

    test("AGLC r 2.2.7 prohibition never fires in court mode (parallels are expected)", () => {
      expect(prohibition).toHaveLength(0);
    });

    test("ibid suppression on: the AGLC r 1.4.3 ibid check is skipped", () => {
      expect(withRule(issues, "1.4.3")).toHaveLength(0);
    });

    if (expected.treatment) {
      test("Qld SC PD 1/2024 cl 4(c): every case without subsequent treatment gets an info issue", () => {
        expect(treatment.map((issue) => issue.severity)).toEqual(["info", "info", "info"]);
        expect(withRule(issues, "Qld SC PD 1/2024 cl 4(c")).toHaveLength(0);
        expect(treatment.every((issue) => issue.ruleNumber === "Qld SC PD 1/2024 cl 4(c)")).toBe(
          true
        );
        expect(treatment.map((issue) => issue.message)).toEqual([
          expect.stringMatching(/'Pape\b/),
          expect.stringMatching(/'Pape\b/),
          expect.stringMatching(/'Smith\b/),
        ]);
      });
    } else {
      test("subsequent treatment is not checked outside Queensland", () => {
        expect(treatment).toHaveLength(0);
      });
    }

    if (expected.unreportedGate) {
      test("unreported gate warn: an unconfirmed unreported judgment is a warning from the Validation view", () => {
        expect(gate).toHaveLength(1);
        expect(gate[0].severity).toBe("warning");
      });
    } else {
      test("unreported gate off: no unreported-judgment warning", () => {
        expect(gate).toHaveLength(0);
      });
    }
  });

  test("HCA (ibid suppression on): 'Ibid' in a footnote is warned from the Validation view", () => {
    const issues = validateAs("aglc4", courtDocument, "HCA");
    expect(matching(issues, /'Ibid' detected/)).toHaveLength(1);
  });

  describe("validateCourtMode cross-check with the preset's CourtModeConfig", () => {
    function courtConfig(preset: CourtPresetKey): CourtModeConfig {
      const p = COURT_PRESETS[preset];
      return {
        jurisdiction: preset,
        parallelCitationMode: p.parallelCitations,
        unreportedGate: p.unreportedGate,
      };
    }

    test.each(presetKeys)(
      "%s: mandatory parallels error only where report and MNC are both recorded without parallels",
      (preset) => {
        const issues = flatten(
          validateCourtMode(courtDocument.footnotes, courtDocument.citations, courtConfig(preset))
        );
        const missing = matching(issues, /Parallel citation required/);
        if (PRESET_EXPECTATIONS[preset].parallel === "error") {
          expect(missing.map((issue) => issue.message)).toEqual([
            expect.stringMatching(/'Pape\b/),
            expect.stringMatching(/'Alpha\b/),
          ]);
          expect(missing.every((issue) => issue.severity === "error")).toBe(true);
        } else {
          expect(missing).toHaveLength(0);
        }
      }
    );

    test.each(presetKeys)("%s: 'Ibid' and '(n X)' are warned in court submissions", (preset) => {
      const issues = flatten(
        validateCourtMode(courtDocument.footnotes, courtDocument.citations, courtConfig(preset))
      );
      expect(matching(issues, /'Ibid' detected/)).toHaveLength(1);
      expect(matching(issues, /'\(n 1\)' cross-reference detected/)).toHaveLength(1);
    });

    test.each(presetKeys)("%s: the unreported-judgment gate follows the preset", (preset) => {
      const issues = flatten(
        validateCourtMode(courtDocument.footnotes, courtDocument.citations, courtConfig(preset))
      );
      const gate = matching(issues, /Unreported judgment cited without confirmation/);
      expect(gate).toHaveLength(PRESET_EXPECTATIONS[preset].unreportedGate ? 1 : 0);
    });

    test.each(presetKeys)("%s: subsequent treatment is checked in Queensland only", (preset) => {
      const issues = flatten(
        validateCourtMode(courtDocument.footnotes, courtDocument.citations, courtConfig(preset))
      );
      const treatment = matching(issues, /Subsequent treatment not recorded/);
      expect(treatment).toHaveLength(PRESET_EXPECTATIONS[preset].treatment ? 3 : 0);
    });
  });
});

// ─── Rule ids: the number shown to the user must be the rule's number ───────

describe("rule ids match the standards' own numbering", () => {
  const oscola = checkOscolaRules(
    [humanRightsAct, robertsNoMnc, corr],
    ["Ibid.", "Nolan, “Deconstructing the Duty of Care” (2013) 129 LQR 559."]
  );
  const nzlsg = checkNzlsgRules(
    [securitiesAct],
    ["Ibid.", "Spiller, ‘Dictionary’ (2015).", "Spiller (n 3) 70.", "The Maori Land Court so held."]
  );

  test("OSCOLA 5 §1.2.1 is the ibid rule (validator emits 'OSCOLA 1.3', which is punctuation/ranges)", () => {
    expect(matching(oscola, /'Ibid'/)[0].ruleNumber).toBe("OSCOLA 1.2.1");
  });

  test("OSCOLA 5 §1.5 is the quotation-marks rule (validator emits 'OSCOLA 1.2', which is subsequent citations)", () => {
    expect(matching(oscola, /single quotation marks/)[0].ruleNumber).toBe("OSCOLA 1.5");
  });

  // STD-019: stays failing — the validator receives plain footnote text and
  // cannot see italics, so the OSCOLA §2.4.1 warning fires only when the
  // citation data carries an explicit `titleItalic: true` flag (see the todo
  // above); `humanRightsAct` carries none, so no issue exists to renumber.
  test.failing(
    "OSCOLA 5 §2.4.1 is the statute-title rule (validator emits 'OSCOLA 2.2', which is Scottish cases)",
    () => {
      expect(matching(oscola, /roman \(not italic\)/)[0].ruleNumber).toBe("OSCOLA 2.4.1");
    }
  );

  test("OSCOLA 5 §2.1.3 is the neutral-citation rule (validator emits 'OSCOLA 2.1.1', the general principles)", () => {
    expect(matching(oscola, /neutral citation/)[0].ruleNumber).toBe("OSCOLA 2.1.3");
  });

  test("OSCOLA 5 §1.6.2 is the table-of-cases rule (validator emits 'OSCOLA 1.4', which is foreign sources)", () => {
    expect(matching(oscola, /Table of Cases/)[0].ruleNumber).toBe("OSCOLA 1.6.2");
  });

  test("NZLSG 3 r 2.3.1 is the subsequent-reference rule for both the ibid and the '(n X)' issues", () => {
    expect(matching(nzlsg, /'Ibid'/)[0].ruleNumber).toBe("NZLSG 2.3.1");
    expect(matching(nzlsg, /cross-reference style/)[0].ruleNumber).toBe("NZLSG 2.3.1");
  });

  // STD-019: stays failing — the mixed-document test at "NZLSG 3 r 1.2.2(a)(i):
  // the single-quoted quotation is flagged" pins the id 'NZLSG 1.1.2'; the two
  // expectations contradict, so the id is left as it was until the spec
  // settles which one holds (DECISION-040).
  test.failing(
    "NZLSG 3 r 1.2.2 is the quotation-marks rule (validator emits 'NZLSG 1.1.2', which is punctuation)",
    () => {
      expect(matching(nzlsg, /double quotation marks/)[0].ruleNumber).toBe("NZLSG 1.2.2");
    }
  );

  test("NZLSG 3 r 1.1.1(c) is the macron rule (validator emits a bare 'NZLSG')", () => {
    expect(matching(nzlsg, /should include macrons/)[0].ruleNumber).toBe("NZLSG 1.1.1");
  });

  // STD-019: stays failing — as for OSCOLA §2.4.1: the NZLSG r 4.1.1(a)
  // warning fires only on an explicit `titleItalic: true` flag, which
  // `securitiesAct` does not carry, so no issue exists to renumber.
  test.failing("NZLSG 3 r 4.1.1(a) is the statute-title rule (validator emits 'NZLSG 4.1')", () => {
    expect(matching(nzlsg, /roman \(not italic\)/)[0].ruleNumber).toBe("NZLSG 4.1.1");
  });

  test("court parallel-citation enforcement cites the practice direction, not AGLC r 2.2.7 (which prohibits parallels)", () => {
    const issues = validateAs("aglc4", courtDocument, "HCA");
    const enforcement = matching(issues, /Parallel citations required for reported cases/);
    expect(enforcement.length).toBeGreaterThan(0);
    expect(enforcement.every((issue) => issue.ruleNumber !== "2.2.7")).toBe(true);
  });
});

// ─── 5. Check-set contract ──────────────────────────────────────────────────

/**
 * The rule ids that fire per standard for the mixed document TODAY. This is a
 * drift detector, not a statement of correctness: the correct behaviour is
 * asserted rule by rule above (and marked failing where the validator lags).
 * When STD-019 lands, the fixer updates these arrays deliberately, and the
 * diff is the record of what the check set gained and lost.
 */
const CHECK_SET_CONTRACT: Record<StandardKey, string[]> = {
  // 1.10.1 is the AGLC numbers check tripping on the volume numbers of
  // "[2008] 1 AC 884", "[2010] 1 NZLR 297" (a false positive worth its own
  // story; recorded here so the contract is honest about today's set).
  aglc4: ["1.1.4", "1.10.1", "1.12.2", "1.4.3", "1.5.1", "1.5.3", "1.6", "1.8.3", "2.2.7"],
  // STD-019: the AGLC-only checks (Latin, headings, typography, numbers,
  // ibid correctness, r 2.2.7) no longer fire; the universal checks carry
  // the standard's own ids (closing full stop §1.1, long quotation and
  // ellipsis §1.5) alongside the OSCOLA rule set (ibid §1.2.1, table of
  // cases §1.6.2).
  oscola5: ["OSCOLA 1.1", "OSCOLA 1.2.1", "OSCOLA 1.5", "OSCOLA 1.6.2"],
  // OSCOLA 4 permits ibid (§1.2.1), so only the universal checks and the
  // table-of-cases reminder remain.
  oscola4: ["OSCOLA 1.1", "OSCOLA 1.5", "OSCOLA 1.6.2"],
  // NZLSG: closing full stop r 2.2.4, ellipsis r 1.2.2, single quotation
  // marks (id pending, see the rule-ids block), ibid and '(n X)' r 2.3.1.
  // The single-quoted 400-character quotation is not a long-quotation
  // issue here: NZLSG quotations take double marks, and the marks
  // themselves are already flagged.
  nzlsg3: ["NZLSG 1.1.2", "NZLSG 1.2.2", "NZLSG 2.2.4", "NZLSG 2.3.1"],
};

describe("check-set contract", () => {
  test.each(Object.keys(CHECK_SET_CONTRACT) as StandardKey[])(
    "%s: rule ids that fire for the mixed document",
    (std) => {
      expect(ruleIds(mixed[std])).toEqual(CHECK_SET_CONTRACT[std]);
    }
  );
});
