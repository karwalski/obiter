/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-110, COURT-112 and COURT-120: pinpoint correctness in court mode,
 * the 'at' pinpoint connector, and the AGLC4 r 2.7 / r 2.8 transcript and
 * submission defects found in research report R07 (O-K8, O-K14).
 *
 * Sources: AGLC4 rr 2.2.5, 2.3.1, 2.7.1, 2.7.2, 2.8 (derived reference,
 * PDF pp 77, 79, 90–1); Vic SC Gen 3 cl 5.5 (1 Dec 2025, register VIC-1);
 * FCA GPN-AUTH cl 2.5–2.6 (7 May 2025, register FCA-1, O-R2); Tas SC PD 3
 * of 2014 cl 3 (21 Feb 2014, register TAS-1, O-R8).
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { formatStartingPageAndPinpoint } from "../../src/engine/rules/v4/domestic/cases";
import {
  checkReportParagraphPinpoints,
  checkTranscriptRules,
  validateDocument,
} from "../../src/engine/validator";
import { COURT_PRESETS } from "../../src/engine/court/presets";
import { buildCourtConfig, getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import { pinpointFromTitleString } from "../../src/engine/rules/v4/general/pinpoints";
import { resolveOccurrencePinpoint } from "../../src/word/citationRefresher";
import type { Citation, Pinpoint } from "../../src/types/citation";

const text = (runs: Array<{ text: string }>): string => runs.map((r) => r.text).join("");

function makeCitation(
  sourceType: string,
  data: Record<string, unknown>,
  shortTitle?: string
): Citation {
  return {
    id: `c-${sourceType}-${Math.random().toString(36).slice(2, 8)}`,
    aglcVersion: "4",
    sourceType: sourceType as Citation["sourceType"],
    data,
    shortTitle,
    tags: [],
    createdAt: "2026-10-06T00:00:00Z",
    modifiedAt: "2026-10-06T00:00:00Z",
  } as Citation;
}

const academic: CitationConfig = getStandardConfig("aglc4");

/** A court config built the way a new document's toggles are written. */
function courtConfigFor(
  jurisdiction: keyof typeof COURT_PRESETS,
  extra: Record<string, string> = {}
): CitationConfig {
  const preset = COURT_PRESETS[jurisdiction];
  const toggles: Record<string, string> = {
    parallelCitations: preset.parallelCitations,
    pinpointStyle: preset.pinpointStyle,
    unreportedGate: preset.unreportedGate,
    ibidSuppression: preset.ibidSuppression,
    loaType: preset.loaType,
    ...(preset.parallelOrder ? { parallelOrder: preset.parallelOrder } : {}),
    ...(preset.pinpointConnector ? { pinpointConnector: preset.pinpointConnector } : {}),
    ...extra,
  };
  return buildCourtConfig({ ...academic, writingMode: "court" }, toggles);
}

function firstContext(currentPinpoint?: Pinpoint): CitationContext {
  return {
    footnoteNumber: 1,
    isFirstCitation: true,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 0,
    currentPinpoint,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
}

// ─── COURT-110 ──────────────────────────────────────────────────────────────

describe("COURT-110: report pinpoints keep the starting page (AGLC4 r 2.2.5)", () => {
  const pageAndPara: Pinpoint = {
    type: "page",
    value: "410",
    subPinpoint: { type: "paragraph", value: "[60]" },
  };

  test("golden VIC-1 (Vic SC Gen 3 cl 5.5): para-and-page renders '394, 410 [60]'", () => {
    expect(text(formatStartingPageAndPinpoint(394, pageAndPara, "para-and-page"))).toBe(
      "394, 410 [60]"
    );
  });

  test("one input: '410 [60]' decodes to page + paragraph and renders the VIC-1 form", () => {
    const vic = makeCitation(
      "case.reported",
      {
        party1: "Smith",
        party2: "Jones",
        yearType: "round",
        year: 2023,
        volume: 72,
        reportSeries: "VR",
        startingPage: 394,
      },
      "Smith"
    );
    const runs = formatCitation(
      vic,
      firstContext(pinpointFromTitleString("410 [60]")),
      courtConfigFor("VSC")
    );
    expect(text(runs)).toContain("(2023) 72 VR 394, 410 [60]");
  });

  test.each(["para-only", "para-and-page", "page-only"] as const)(
    "%s never drops the starting page",
    (style) => {
      for (const pin of [
        { type: "paragraph", value: "[45]" } as Pinpoint,
        { type: "page", value: "425" } as Pinpoint,
        pageAndPara,
      ]) {
        expect(text(formatStartingPageAndPinpoint(420, pin, style)).startsWith("420")).toBe(true);
      }
    }
  );

  test("para-only renders exactly as AGLC4 page-only for a report (DECISION-043 item 5 left open)", () => {
    for (const pin of [
      { type: "paragraph", value: "[45]" } as Pinpoint,
      { type: "page", value: "425" } as Pinpoint,
      pageAndPara,
    ]) {
      expect(text(formatStartingPageAndPinpoint(420, pin, "para-only"))).toBe(
        text(formatStartingPageAndPinpoint(420, pin, "page-only"))
      );
    }
  });

  test("academic AGLC4 output is unchanged: '1, 6', '1 [23]', '1, 6 [23]'", () => {
    expect(text(formatStartingPageAndPinpoint(1, { type: "page", value: "6" }))).toBe("1, 6");
    expect(text(formatStartingPageAndPinpoint(1, { type: "paragraph", value: "[23]" }))).toBe(
      "1 [23]"
    );
    expect(
      text(
        formatStartingPageAndPinpoint(1, {
          type: "page",
          value: "6",
          subPinpoint: { type: "paragraph", value: "[23]" },
        })
      )
    ).toBe("1, 6 [23]");
  });

  describe("validator: paragraph pinpoint with no page on a report (court mode)", () => {
    const reported = (pinpoint: unknown): Citation =>
      makeCitation("case.reported", {
        party1: "Pape",
        party2: "Commissioner of Taxation",
        yearType: "round",
        year: 2009,
        volume: 238,
        reportSeries: "CLR",
        startingPage: 1,
        pinpoint,
      });

    test("warns for '[45]' (form string) and for a typed paragraph pinpoint (r 2.2.5)", () => {
      const issues = checkReportParagraphPinpoints([
        reported("[45]"),
        reported({ type: "paragraph", value: "[45]–[46]" }),
      ]);
      expect(issues).toHaveLength(2);
      expect(issues.every((i) => i.ruleNumber === "2.2.5" && i.severity === "warning")).toBe(true);
    });

    test("no warning for a page, or for page + paragraph", () => {
      expect(
        checkReportParagraphPinpoints([reported("42"), reported("410 [60]"), reported(42)])
      ).toEqual([]);
    });

    test("MNC citations are not checked: paragraph pinpoints are sufficient there", () => {
      const mnc = makeCitation("case.unreported.mnc", {
        party1: "Smith",
        party2: "Brown",
        year: 1997,
        court: "TASSC",
        caseNumber: 161,
        pinpoint: "[15]",
      });
      expect(checkReportParagraphPinpoints([mnc])).toEqual([]);
    });

    test("validateDocument raises it in court mode only", () => {
      const cite = reported("[45]");
      const court = validateDocument([], [cite], undefined, {
        writingMode: "court",
        courtJurisdiction: "NSWCA",
      });
      const academicResult = validateDocument([], [cite], undefined, { writingMode: "academic" });
      const has = (r: typeof court): boolean =>
        [...r.errors, ...r.warnings, ...r.info].some(
          (i) => i.ruleNumber === "2.2.5" && i.message.includes("paragraph pinpoint has no page")
        );
      expect(has(court)).toBe(true);
      expect(has(academicResult)).toBe(false);
    });
  });
});

// ─── COURT-112 ──────────────────────────────────────────────────────────────

describe("COURT-112: 'at' pinpoint connector", () => {
  test("formatter: '479 at 481', '479 at 481 [29]', '479 at [29]'", () => {
    expect(
      text(
        formatStartingPageAndPinpoint(479, { type: "page", value: "481" }, "para-and-page", "at")
      )
    ).toBe("479 at 481");
    expect(
      text(
        formatStartingPageAndPinpoint(
          479,
          { type: "page", value: "481", subPinpoint: { type: "paragraph", value: "[29]" } },
          "para-and-page",
          "at"
        )
      )
    ).toBe("479 at 481 [29]");
    expect(
      text(
        formatStartingPageAndPinpoint(
          479,
          { type: "paragraph", value: "[29]" },
          "para-and-page",
          "at"
        )
      )
    ).toBe("479 at [29]");
  });

  test("presets: 'at' only for FCA (GPN-AUTH cl 2.6) and TASSC (PD 3 of 2014 cl 3)", () => {
    const withAt = Object.entries(COURT_PRESETS)
      .filter(([, p]) => p.pinpointConnector === "at")
      .map(([id]) => id)
      .sort();
    expect(withAt).toEqual(["FCA", "TASSC"]);
  });

  test("buildCourtConfig: a document saved without the toggle keeps the AGLC connector (DECISION-043 item 4)", () => {
    const legacy = buildCourtConfig(
      { ...academic, writingMode: "court" },
      { pinpointStyle: "para-and-page", ibidSuppression: "on" }
    );
    expect(legacy.pinpointConnector).toBeUndefined();
    expect(courtConfigFor("FCA").pinpointConnector).toBe("at");
    // Academic mode ignores court toggles entirely.
    expect(
      buildCourtConfig(academic, { pinpointConnector: "at" }).pinpointConnector
    ).toBeUndefined();
  });

  const darcy = makeCitation(
    "case.reported",
    {
      party1: "DArcy",
      party2: "Myriad Genetics Inc",
      yearType: "round",
      year: 2014,
      volume: 224,
      reportSeries: "FCR",
      startingPage: 479,
      mnc: "[2014] FCAFC 115",
    },
    "DArcy"
  );

  test("golden FCA-1 (GPN-AUTH cl 2.5–2.6): MNC first, 'at 481'", () => {
    const config = courtConfigFor("FCA", { parallelOrder: "mnc-first" });
    const runs = formatCitation(darcy, firstContext({ type: "page", value: "481" }), config);
    expect(text(runs)).toContain("[2014] FCAFC 115; (2014) 224 FCR 479 at 481");
  });

  test("FCA preset (report-first until COURT-111): '479 at 481'", () => {
    const runs = formatCitation(
      darcy,
      firstContext({ type: "page", value: "481" }),
      courtConfigFor("FCA")
    );
    expect(text(runs)).toContain("(2014) 224 FCR 479 at 481; [2014] FCAFC 115");
  });

  const smithBrown = makeCitation(
    "case.unreported.mnc",
    { party1: "Smith", party2: "Brown", year: 1997, court: "TASSC", caseNumber: 161 },
    "Smith"
  );

  test("golden TAS-1 (PD 3 of 2014 cl 3): 'Smith v Brown [1997] TASSC 161 at [15]'", () => {
    const runs = formatCitation(
      smithBrown,
      firstContext({ type: "paragraph", value: "[15]" }),
      courtConfigFor("TASSC")
    );
    expect(text(runs)).toContain("Smith v Brown [1997] TASSC 161 at [15]");
  });

  test("short form: 'Smith at [15]'; ibid behaviour unchanged ('Ibid [16]')", () => {
    const config = courtConfigFor("TASSC");
    const subsequent: CitationContext = {
      footnoteNumber: 3,
      isFirstCitation: false,
      isSameAsPreceding: false,
      precedingFootnoteCitationCount: 1,
      currentPinpoint: { type: "paragraph", value: "[15]" },
      firstFootnoteNumber: 1,
      isWithinSameFootnote: false,
      formatPreference: "auto",
    };
    expect(text(formatCitation(smithBrown, subsequent, config))).toBe("Smith at [15]");

    const ibidAllowed = { ...config, ibidSuppressionMode: "off" as const };
    const ibidContext: CitationContext = {
      ...subsequent,
      isSameAsPreceding: true,
      precedingPinpoint: { type: "paragraph", value: "[15]" },
      currentPinpoint: { type: "paragraph", value: "[16]" },
    };
    const ibid = text(formatCitation(smithBrown, ibidContext, ibidAllowed));
    expect(ibid).toMatch(/^Ibid/);
    expect(ibid).not.toContain(" at ");
  });

  test("the AGLC connector and academic output are unchanged", () => {
    const vic = courtConfigFor("VSC");
    expect(
      text(formatCitation(smithBrown, firstContext({ type: "paragraph", value: "[15]" }), vic))
    ).toContain("[1997] TASSC 161, [15]");
    const academicWithStrayToggle = { ...academic, pinpointConnector: "at" as const };
    expect(
      text(
        formatCitation(
          smithBrown,
          firstContext({ type: "paragraph", value: "[15]" }),
          academicWithStrayToggle
        )
      )
    ).toContain("[1997] TASSC 161, [15]");
  });
});

// ─── COURT-120 ──────────────────────────────────────────────────────────────

describe("COURT-120: AGLC4 r 2.7 / r 2.8 defects", () => {
  test("r 2.8: title and proceeding number omitted when absent — no ‘’ or ', ,'", () => {
    const sub = makeCitation("case.submission", {
      partyName: "Attorney-General (Cth)",
      party1: "Humane Society International Inc",
      party2: "Kyodo Senpaku Kaisha Ltd",
      date: "25 January 2005",
      pinpoint: "[10]",
    });
    const out = text(formatCitation(sub, undefined, academic));
    expect(out).toBe(
      "Attorney-General (Cth), Submission in Humane Society International Inc v Kyodo Senpaku Kaisha Ltd, 25 January 2005, [10]"
    );
    expect(out).not.toContain("‘’");
    expect(out).not.toContain(", ,");
  });

  test("r 2.8 ex 120 still renders in full when every element is present", () => {
    const sub = makeCitation("case.submission", {
      partyName: "Attorney-General (Cth)",
      submissionTitle:
        "Outline of Submissions of the Attorney-General of the Commonwealth as Amicus Curiae",
      party1: "Humane Society International Inc",
      party2: "Kyodo Senpaku Kaisha Ltd",
      proceedingNumber: "NSD1519/2004",
      date: "25 January 2005",
    });
    expect(text(formatCitation(sub, undefined, academic))).toBe(
      "Attorney-General (Cth), ‘Outline of Submissions of the Attorney-General of the Commonwealth as Amicus Curiae’, " +
        "Submission in Humane Society International Inc v Kyodo Senpaku Kaisha Ltd, NSD1519/2004, 25 January 2005"
    );
  });

  test("r 2.7.2: a missing HCATrans number never renders 'HCATrans 0' and is a validation error", () => {
    const tr = makeCitation("case.transcript", {
      hcaTranscript: true,
      party1: "Ruhani",
      party2: "Director of Police",
      year: 2005,
    });
    const out = text(formatCitation(tr, undefined, academic));
    expect(out).not.toContain("HCATrans 0");
    expect(out).toBe("Transcript of Proceedings, Ruhani v Director of Police [2005] HCATrans");
    const issues = checkTranscriptRules(tr);
    expect(issues.some((i) => i.ruleNumber === "2.7.2" && i.severity === "error")).toBe(true);
  });

  test("r 2.7.2 ex 118: a number returned from the XML store as a number still renders", () => {
    const tr = makeCitation("case.transcript", {
      hcaTranscript: "true",
      party1: "Ruhani",
      party2: "Director of Police",
      year: 2005,
      caseNumber: 205,
    });
    expect(text(formatCitation(tr, undefined, academic))).toBe(
      "Transcript of Proceedings, Ruhani v Director of Police [2005] HCATrans 205"
    );
    expect(checkTranscriptRules(tr)).toEqual([]);
  });

  test("r 2.7.2 ex 119: a zero-padded number renders 'HCATrans 8'; '000' is treated as missing", () => {
    const tr = makeCitation("case.transcript", {
      hcaTranscript: true,
      party1: "Mulholland",
      party2: "Australian Electoral Commission",
      year: 2004,
      caseNumber: "08",
    });
    expect(text(formatCitation(tr, undefined, academic))).toBe(
      "Transcript of Proceedings, Mulholland v Australian Electoral Commission [2004] HCATrans 8"
    );
    const zero = makeCitation("case.transcript", { ...tr.data, caseNumber: "000" });
    expect(text(formatCitation(zero, undefined, academic))).toMatch(/HCATrans$/);
    expect(checkTranscriptRules(zero)).toEqual([
      expect.objectContaining({ ruleNumber: "2.7.2", severity: "error" }),
    ]);
  });

  test("r 2.7.1: a flag stored as the string 'false' (XML round trip) keeps the general form", () => {
    const tr = makeCitation("case.transcript", {
      hcaTranscript: "false",
      party1: "North East Solution Pty Ltd",
      party2: "Masters Home Improvement Australia Pty Ltd",
      court: "Supreme Court of Victoria",
      judicialOfficers: "Croft J",
      date: "18 May 2015",
      pinpoint: 31,
      speaker: "PJ Bick QC",
    });
    expect(text(formatCitation(tr, undefined, academic))).toBe(
      "Transcript of Proceedings, North East Solution Pty Ltd v Masters Home Improvement Australia Pty Ltd " +
        "(Supreme Court of Victoria, Croft J, 18 May 2015) 31 (PJ Bick QC)"
    );
    // The validator agrees: no r 2.7.2 'missing HCATrans number' error.
    expect(checkTranscriptRules(tr)).toEqual([]);
  });

  test("r 2.7.1 / 2.7.2: '(during argument)' in a speaker is a validation error", () => {
    const single = makeCitation("case.transcript", {
      party1: "North East Solution Pty Ltd",
      party2: "Masters Home Improvement Australia Pty Ltd",
      court: "Supreme Court of Victoria",
      judicialOfficers: "Croft J",
      date: "18 May 2015",
      pinpoint: "31",
      speaker: "PJ Bick QC (during argument)",
    });
    const rows = makeCitation("case.transcript", {
      hcaTranscript: true,
      party1: "Mulholland",
      party2: "Australian Electoral Commission",
      year: 2004,
      number: 8,
      pinpoints: [{ value: "2499–517", speaker: "Callinan J (during argument)" }],
    });
    expect(checkTranscriptRules(single)).toEqual([
      expect.objectContaining({ ruleNumber: "2.7.1", severity: "error" }),
    ]);
    expect(checkTranscriptRules(rows)).toEqual([
      expect.objectContaining({ ruleNumber: "2.7.2", severity: "error" }),
    ]);
    const clean = makeCitation("case.transcript", { ...single.data, speaker: "PJ Bick QC" });
    expect(checkTranscriptRules(clean)).toEqual([]);
  });

  test("r 2.7.2 ex 119: multiple pinpoint + speaker rows, numeric values from the XML store", () => {
    const tr = makeCitation("case.transcript", {
      hcaTranscript: true,
      party1: "Mulholland",
      party2: "Australian Electoral Commission",
      year: 2004,
      number: 8,
      pinpoints: [
        { value: "2499–517", speaker: "Callinan J and JBR Beach QC" },
        { value: "2589–93", speaker: "McHugh J" },
        { value: "", speaker: "" },
      ],
    });
    expect(text(formatCitation(tr, undefined, academic))).toBe(
      "Transcript of Proceedings, Mulholland v Australian Electoral Commission [2004] HCATrans 8, " +
        "2499–517 (Callinan J and JBR Beach QC), 2589–93 (McHugh J)"
    );
    const numeric = makeCitation("case.transcript", {
      ...tr.data,
      pinpoints: [{ value: 2499 }, { value: 2589, speaker: "McHugh J" }],
    });
    expect(text(formatCitation(numeric, undefined, academic))).toContain(
      "HCATrans 8, 2499, 2589 (McHugh J)"
    );
  });

  describe("normalisePinpoint with a numeric value (XML round-trip hazard)", () => {
    test("r 2.7.1 ex 116: a numeric transcript pinpoint is kept", () => {
      const tr = makeCitation("case.transcript", {
        party1: "North East Solution Pty Ltd",
        party2: "Masters Home Improvement Australia Pty Ltd",
        court: "Supreme Court of Victoria",
        judicialOfficers: "Croft J",
        date: "18 May 2015",
        pinpoint: 31,
        speaker: "PJ Bick QC",
      });
      expect(text(formatCitation(tr, undefined, academic))).toBe(
        "Transcript of Proceedings, North East Solution Pty Ltd v Masters Home Improvement Australia Pty Ltd " +
          "(Supreme Court of Victoria, Croft J, 18 May 2015) 31 (PJ Bick QC)"
      );
    });

    test("r 2.2.5: a numeric page pinpoint, bare or in a Pinpoint object, is kept", () => {
      const base = {
        party1: "Pape",
        party2: "Commissioner of Taxation",
        yearType: "round",
        year: 2009,
        volume: 238,
        reportSeries: "CLR",
        startingPage: 1,
      };
      expect(
        text(
          formatCitation(
            makeCitation("case.reported", { ...base, pinpoint: 42 }),
            undefined,
            academic
          )
        )
      ).toBe("Pape v Commissioner of Taxation (2009) 238 CLR 1, 42");
      expect(
        text(
          formatCitation(
            makeCitation("case.reported", { ...base, pinpoint: { type: "page", value: 42 } }),
            undefined,
            academic
          )
        )
      ).toBe("Pape v Commissioner of Taxation (2009) 238 CLR 1, 42");
    });

    test("refresher: a numeric stored pinpoint resolves instead of being dropped", () => {
      expect(resolveOccurrencePinpoint(undefined, 42)).toEqual({ type: "page", value: "42" });
    });
  });
});
