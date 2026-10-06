/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-107 (court toggle semantics: ibid separate from (n X), the explicit
 * no-court state) and COURT-113 (subsequent-reference forms per profile).
 *
 * Evidence (docs/research/court-interop/EVIDENCE-REGISTER.md, 6 Oct 2026):
 * - O-K5: (n X) was dropped whenever writing mode was court, under a toggle
 *   labelled "Ibid / (n X)"; court mode with no court kept ibid while the
 *   help text said "no ibid".
 * - O-R14: no instrument read mentions ibid or (n X). DECISION-043 item 2
 *   keeps court-mode ibid suppression and its label unchanged.
 * - O-R9 / WA-1: WA SC Consolidated Practice Directions PD 2.1 cl 14
 *   (updated 23 Sep 2026): later references by case name only, unless names
 *   are duplicated or popular.
 * - O-C2: HCA reasons restate the short name and the full report on repeat
 *   (observed, not a rule: an opt-in only).
 * - AGLC4 r 1.4.1: a short reference carries (n X); r 1.4.3: Ibid.
 */

import { formatCitation, formatCitationWithFormat } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { courtCaseNameRuns, findDuplicateCaseNames } from "../../src/engine/resolver";
import {
  SELECT_COURT_PROMPT,
  describeCourtMode,
  getCourtModeState,
  getPresetToggles,
} from "../../src/engine/court/profile";
import { getFieldProvenance } from "../../src/engine/court/provenance";
import { COURT_PRESETS, type CourtJurisdiction } from "../../src/engine/court/presets";
import { buildDocumentConfig, getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import { validateDocument } from "../../src/engine/validator";
import type { Citation, Pinpoint } from "../../src/types/citation";

const text = (runs: Array<{ text: string }>): string => runs.map((r) => r.text).join("");

function citation(
  id: string,
  sourceType: string,
  data: Record<string, unknown>,
  shortTitle?: string
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType: sourceType as Citation["sourceType"],
    data,
    shortTitle,
    tags: [],
    createdAt: "2026-10-07T00:00:00Z",
    modifiedAt: "2026-10-07T00:00:00Z",
  } as Citation;
}

const pape = citation(
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
  },
  "Pape"
);

const lee = citation(
  "lee",
  "case.reported",
  {
    party1: "Lee",
    party2: "The Queen",
    yearType: "round",
    year: 1999,
    volume: 18,
    reportSeries: "WAR",
    startingPage: 23,
    mnc: "[1999] WASCA 14",
  },
  "Lee"
);

const book = citation("book", "book", {
  authors: [{ givenNames: "Jane", surname: "Smith" }],
  title: "Court Practice",
  publisher: "Federation Press",
  edition: 2,
  year: 2020,
});

const para = (value: string): Pinpoint => ({ type: "paragraph", value });

/** A later reference in footnote 3 to a source first cited in footnote 1. */
function later(pinpoint?: Pinpoint, sameAsPreceding = false): CitationContext {
  return {
    footnoteNumber: 3,
    isFirstCitation: false,
    isSameAsPreceding: sameAsPreceding,
    precedingFootnoteCitationCount: sameAsPreceding ? 1 : 2,
    currentPinpoint: pinpoint,
    precedingPinpoint: sameAsPreceding ? pinpoint : undefined,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
}

function courtConfig(
  jurisdiction: CourtJurisdiction | undefined,
  overrides: Record<string, string> = {}
): CitationConfig {
  return buildDocumentConfig({
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: jurisdiction,
    courtToggles: jurisdiction ? { ...getPresetToggles(jurisdiction)!, ...overrides } : undefined,
  });
}

// ─── COURT-107: ibid and (n X) are separate ─────────────────────────────────

describe("COURT-107: (n X) suppression is a separate toggle from ibid", () => {
  test("default (absent toggle): court short form has no (n X), as before (O-K5)", () => {
    const config = courtConfig("HCA");
    expect(config.crossReferenceSuppression).toBeUndefined();
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape [45]");
  });

  test("a document stored before COURT-107 (no key) renders exactly as before", () => {
    const toggles = { ...getPresetToggles("HCA")! } as Record<string, string>;
    delete toggles.crossReferenceSuppression;
    delete toggles.subsequentForm;
    const before = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "HCA",
      courtToggles: toggles,
    });
    expect(before).toEqual(courtConfig("HCA"));
  });

  test("off: the AGLC4 r 1.4.1 (n X) returns", () => {
    const config = courtConfig("HCA", { crossReferenceSuppression: "off" });
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape (n 1) [45]");
    expect(text(formatCitation(book, later({ type: "page", value: "12" }), config))).toBe(
      "Smith (n 1) 12"
    );
  });

  test("off, with the 'at' connector (FCA GPN-AUTH cl 2.6): (n X) precedes 'at'", () => {
    const config = courtConfig("FCA", { crossReferenceSuppression: "off" });
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape (n 1) at [45]");
  });

  test("ibid suppression on, (n X) off: no Ibid, short form with (n X)", () => {
    const config = courtConfig("HCA", { crossReferenceSuppression: "off" });
    const out = formatCitationWithFormat(pape, later(para("[45]"), true), config);
    expect(out.renderedFormat).toBe("short");
    expect(text(out.runs)).toBe("Pape (n 1) [45]");
  });

  test("ibid suppression off, (n X) on: Ibid for the preceding source, no (n X) otherwise", () => {
    const config = courtConfig("HCA", { ibidSuppression: "off" });
    expect(text(formatCitation(pape, later(para("[45]"), true), config))).toBe("Ibid");
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape [45]");
  });

  test("DECISION-043 item 2: every preset keeps ibid suppression on and (n X) suppression on", () => {
    for (const id of Object.keys(COURT_PRESETS) as CourtJurisdiction[]) {
      const t = getPresetToggles(id)!;
      expect(t.ibidSuppression).toBe("on");
      expect(t.crossReferenceSuppression).toBe("on");
      expect(getFieldProvenance(id, "crossReferenceSuppression")?.kind).toBe("preference");
    }
  });

  test("the validator does not flag (n X) the document gives on purpose", () => {
    const base = {
      writingMode: "court" as const,
      courtJurisdiction: "HCA",
      ibidSuppressionMode: "on" as const,
    };
    const flagged = validateDocument(["Pape (n 1) [45]."], [pape], undefined, base);
    const all = [...flagged.errors, ...flagged.warnings, ...flagged.info];
    expect(all.some((i) => i.message.includes("(n 1)"))).toBe(true);

    const kept = validateDocument(["Pape (n 1) [45]."], [pape], undefined, {
      ...base,
      crossReferenceSuppression: "off",
    });
    const keptAll = [...kept.errors, ...kept.warnings, ...kept.info];
    expect(keptAll.some((i) => i.message.includes("(n 1)"))).toBe(false);
  });
});

// ─── COURT-107: explicit no-court state ─────────────────────────────────────

describe("COURT-107: court mode with no court selected", () => {
  test("getCourtModeState distinguishes academic, no-court and court", () => {
    expect(getCourtModeState("academic", "HCA")).toBe("academic");
    expect(getCourtModeState("court", undefined)).toBe("no-court");
    expect(getCourtModeState("court", "")).toBe("no-court");
    expect(getCourtModeState("court", "NOPE")).toBe("no-court");
    expect(getCourtModeState("court", "WASC")).toBe("court");
  });

  test("no court: the behaviour is unchanged (ibid kept, no (n X))", () => {
    const config = courtConfig(undefined);
    expect(text(formatCitation(pape, later(para("[45]"), true), config))).toBe("Ibid");
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape [45]");
  });

  test("no court: the help text asks for a court and matches the behaviour (O-K5)", () => {
    const textOut = describeCourtMode(courtConfig(undefined), "no-court");
    expect(textOut.startsWith(SELECT_COURT_PROMPT)).toBe(true);
    expect(SELECT_COURT_PROMPT).toBe("Select a court to apply court rules.");
    expect(textOut).not.toContain("no ibid");
    expect(textOut).toContain("ibid");
    expect(textOut).toContain("without (n X)");
    expect(textOut).toContain("no List of Authorities");
  });

  test("with a court: the help text follows the frozen toggles", () => {
    expect(describeCourtMode(courtConfig("HCA"), "court")).toBe(
      "Court mode: no ibid, short case names without (n X), the MNC added to a reported case where one is recorded, List of Authorities instead of bibliography."
    );
    expect(describeCourtMode(courtConfig("VSC"), "court")).toContain("the report replaces the MNC");
    expect(describeCourtMode(courtConfig("WASC"), "court")).toContain(
      "later references to cases by case name without (n X)"
    );
    expect(
      describeCourtMode(courtConfig("HCA", { crossReferenceSuppression: "off" }), "court")
    ).toContain("with (n X)");
    for (const id of Object.keys(COURT_PRESETS)) {
      expect(describeCourtMode(courtConfig(id as CourtJurisdiction), "court")).not.toContain("!");
    }
  });
});

// ─── COURT-113: subsequent-reference forms ──────────────────────────────────

describe("COURT-113: subsequent-reference forms per profile", () => {
  test("short-title (default): unchanged court short form", () => {
    expect(getPresetToggles("HCA")!.subsequentForm).toBe("short-title");
    expect(courtConfig("HCA").subsequentForm).toBeUndefined();
    expect(text(formatCitation(pape, later(para("[45]")), courtConfig("HCA")))).toBe("Pape [45]");
  });

  test("WASC preset uses the case name (WA PD 2.1 cl 14, register WA-1, O-R9)", () => {
    expect(getPresetToggles("WASC")!.subsequentForm).toBe("case-name");
    const prov = getFieldProvenance("WASC", "subsequentForm");
    expect(prov?.kind).toBe("official");
    expect(prov?.sourceIds).toEqual(["WA-1"]);
    expect(prov?.clause).toBe("PD 2.1 cl 14");
    const runs = formatCitation(lee, later(para("[15]")), courtConfig("WASC"));
    expect(text(runs)).toBe("Lee v The Queen [15]");
    expect(runs[0].italic).toBe(true);
  });

  test("only WASC sets a non-default subsequent form", () => {
    const nonDefault = (Object.keys(COURT_PRESETS) as CourtJurisdiction[]).filter(
      (id) => getPresetToggles(id)!.subsequentForm !== "short-title"
    );
    expect(nonDefault).toEqual(["WASC"]);
  });

  test("case-name: a duplicated case name keeps the short title (PD 2.1 cl 14 exception)", () => {
    const leeAgain = citation(
      "lee-2",
      "case.reported",
      { ...lee.data, year: 2001, volume: 24, startingPage: 100, mnc: "[2001] WASCA 5" },
      "Lee (2001)"
    );
    const dupes = findDuplicateCaseNames([lee, leeAgain, pape]);
    expect([...dupes].sort()).toEqual(["lee", "lee-2"]);

    const config = courtConfig("WASC");
    const ctx = { ...later(para("[15]")), duplicateCaseName: true };
    expect(text(formatCitation(lee, ctx, config))).toBe("Lee [15]");
    expect(text(formatCitation(leeAgain, ctx, config))).toBe("Lee (2001) [15]");
  });

  test("findDuplicateCaseNames ignores case and spacing, and non-case sources", () => {
    const shouting = citation("lee-caps", "case.reported", { party1: "LEE", party2: "the  queen" });
    expect(findDuplicateCaseNames([lee, shouting]).size).toBe(2);
    expect(findDuplicateCaseNames([lee, pape, book]).size).toBe(0);
    // A round-tripped numeric field does not throw (toText).
    const numeric = citation("n", "case.reported", { party1: 1234, party2: "R" });
    expect(
      courtCaseNameRuns(numeric)
        .map((r) => r.text)
        .join("")
    ).toContain("1234");
  });

  test("case-name applies to judgments: a transcript in the same case keeps its short title and is not a duplicate", () => {
    const transcript = citation(
      "lee-transcript",
      "case.transcript",
      { party1: "Lee", party2: "The Queen", proceedingNumber: "P1/1999" },
      "Lee Transcript"
    );
    expect(findDuplicateCaseNames([lee, transcript]).size).toBe(0);
    const config = courtConfig("WASC");
    expect(text(formatCitation(transcript, later(), config))).toBe("Lee Transcript");
    expect(text(formatCitation(lee, later(para("[15]")), config))).toBe("Lee v The Queen [15]");
  });

  test("case-name applies to cases only: legislation and secondary sources keep the court form", () => {
    const config = courtConfig("WASC");
    expect(text(formatCitation(book, later({ type: "page", value: "12" }), config))).toBe(
      "Smith 12"
    );
  });

  test("short-title-report (opt-in, observed in HCA reasons, O-C2): short title, report and pinpoint", () => {
    const config = courtConfig("HCA", { subsequentForm: "short-title-report" });
    const pin: Pinpoint = { type: "page", value: "23", subPinpoint: para("[45]") };
    expect(text(formatCitation(pape, later(pin), config))).toBe("Pape (2009) 238 CLR 1, 23 [45]");
    expect(text(formatCitation(pape, later(), config))).toBe("Pape (2009) 238 CLR 1");
  });

  test("short-title-report with the 'at' connector follows COURT-112", () => {
    const config = courtConfig("FCA", { subsequentForm: "short-title-report" });
    const pin: Pinpoint = { type: "page", value: "23", subPinpoint: para("[45]") };
    expect(text(formatCitation(pape, later(pin), config))).toBe("Pape (2009) 238 CLR 1 at 23 [45]");
  });

  test("short-title-report never adds (n X) and falls back for an unreported case", () => {
    const config = courtConfig("HCA", {
      subsequentForm: "short-title-report",
      crossReferenceSuppression: "off",
    });
    // The pinpoint takes the full-citation form for the profile's pinpoint
    // style (para-and-page keeps `1, [45]`, COURT-110).
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe(
      "Pape (2009) 238 CLR 1, [45]"
    );
    const unreported = citation(
      "smith",
      "case.unreported.mnc",
      { party1: "Smith", party2: "Brown", year: 1997, court: "TASSC", caseNumber: 161 },
      "Smith"
    );
    expect(text(formatCitation(unreported, later(para("[15]")), config))).toBe("Smith (n 1) [15]");
  });

  test("no preset defaults to the observed HCA repeat form (decision rule 2)", () => {
    for (const id of Object.keys(COURT_PRESETS) as CourtJurisdiction[]) {
      expect(getPresetToggles(id)!.subsequentForm).not.toBe("short-title-report");
    }
  });
});

// ─── Academic documents are untouched ───────────────────────────────────────

describe("COURT-107 / COURT-113: academic AGLC4 output is unchanged", () => {
  test("the AGLC4 config carries neither toggle and renders r 1.4.1 / r 1.4.3 forms", () => {
    const config = getStandardConfig("aglc4");
    expect(config.crossReferenceSuppression).toBeUndefined();
    expect(config.subsequentForm).toBeUndefined();
    expect(text(formatCitation(pape, later(para("[45]")), config))).toBe("Pape (n 1) [45]");
    expect(text(formatCitation(pape, later(para("[45]"), true), config))).toBe("Ibid");
  });

  test("court toggles in an academic document's store have no effect", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "academic",
      courtToggles: { crossReferenceSuppression: "off", subsequentForm: "case-name" },
    });
    expect(config).toEqual(getStandardConfig("aglc4"));
  });
});
