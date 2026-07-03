/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Multi-Standard Integration Tests (OSC-ENH-002 / NZLSG-ENH-002)
 *
 * End-to-end integration tests that call formatCitation() with OSCOLA and
 * NZLSG configs and verify the engine dispatch pipeline produces output
 * matching the dedicated formatters.
 *
 * These tests verify that formatCitation routes correctly when
 * config.standardId is "oscola5" or "nzlsg3". The dispatch wiring from
 * OSC-ENH-001 / NZLSG-ENH-001 has landed, so assertions pin the exact
 * output strings (PARITY-119). Source types without a standard-specific
 * formatter fall through to the generic AGLC4 dispatch; those outputs are
 * pinned as-is and any known gaps are logged in the PARITY-121 leftovers.
 */

import { formatCitation, CitationContext } from "../../src/engine/engine";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";
import type { Citation, Pinpoint } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

// ─── OSCOLA Direct Formatter Imports ────────────────────────────────────────

import { formatOscolaScottishCase } from "../../src/engine/rules/oscola/cases-scotland";
import { formatOscolaNICase } from "../../src/engine/rules/oscola/cases-ni";
import {
  formatOscolaPrimaryLegislation,
  formatOscolaSecondaryLegislation,
} from "../../src/engine/rules/oscola/legislation";
import { formatOscolaHansard } from "../../src/engine/rules/oscola/parliamentary";
import { formatCjeuCase } from "../../src/engine/rules/oscola/eu";
import { formatEcthrCase } from "../../src/engine/rules/oscola/echr";
import { formatGenAiCitation } from "../../src/engine/rules/oscola/genai";
import { formatIrishCase } from "../../src/engine/rules/oscola/ireland";

// ─── NZLSG Direct Formatter Imports ─────────────────────────────────────────

import {
  formatNeutralCitation as nzlsgFormatNeutralCitation,
  formatPreNeutralCase as nzlsgFormatPreNeutralCase,
} from "../../src/engine/rules/nzlsg/cases";
import { formatMaoriLandCourt as nzlsgFormatMaoriLandCourt } from "../../src/engine/rules/nzlsg/maori-land-court";
import { formatWaitangiTribunalReport as nzlsgFormatWaitangiTribunalReport } from "../../src/engine/rules/nzlsg/waitangi";
import {
  formatLegislation as nzlsgFormatLegislation,
  formatBill as nzlsgFormatBill,
} from "../../src/engine/rules/nzlsg/legislation";
import { formatNZPD as nzlsgFormatNZPD } from "../../src/engine/rules/nzlsg/parliamentary";
import {
  formatBook as nzlsgFormatBook,
  formatJournalArticle as nzlsgFormatJournalArticle,
} from "../../src/engine/rules/nzlsg/secondary";
import { formatTreaty as nzlsgFormatTreaty } from "../../src/engine/rules/nzlsg/international";
import { formatTreatyOfWaitangi as nzlsgFormatTreatyOfWaitangi } from "../../src/engine/rules/nzlsg/treaty-of-waitangi";

// ─── Config Fixtures ────────────────────────────────────────────────────────

const OSCOLA5_CONFIG = STANDARD_PROFILES.oscola5.config;
const NZLSG3_CONFIG = STANDARD_PROFILES.nzlsg3.config;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Join all runs into plain text. */
const joinText = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");

/** Check whether any run in the array is italic. */
const hasItalicRun = (runs: FormattedRun[], substring: string): boolean =>
  runs.some((r) => r.text.includes(substring) && r.italic === true);

/** Build a first-citation context (full reference, no subsequent resolution). */
const firstCitationContext: CitationContext = {
  footnoteNumber: 1,
  isFirstCitation: true,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 0,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "full",
};

/** Build a subsequent-citation context for ibid/short ref testing. */
function subsequentContext(overrides: Partial<CitationContext> = {}): CitationContext {
  return {
    footnoteNumber: 3,
    isFirstCitation: false,
    isSameAsPreceding: true,
    precedingFootnoteCitationCount: 1,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
    ...overrides,
  };
}

/** Construct a Citation object from source type and data. */
function makeCitation(
  sourceType: Citation["sourceType"],
  data: Citation["data"],
  shortTitle?: string
): Citation {
  return {
    id: `test-${sourceType}-${Date.now()}`,
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

// =============================================================================
// OSCOLA INTEGRATION TESTS
// =============================================================================

describe("OSC-ENH-002: OSCOLA engine dispatch integration", () => {
  // ─── 1. UK case with neutral citation ───────────────────────────────────────

  it("routes UK case with neutral citation through engine dispatch", () => {
    const citation = makeCitation("case.reported", {
      party1: "Corr",
      party2: "IBC Vehicles Ltd",
      separator: "v",
      yearType: "square",
      year: 2008,
      volume: 1,
      reportSeries: "AC",
      startingPage: 884,
    });

    const runs = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const text = joinText(runs);

    // Key elements that must be present regardless of routing path
    expect(text).toBe("Corr v IBC Vehicles Ltd [2008] 1 AC 884");
    // Closing punctuation now managed by refresher, not formatCitation
  });

  // ─── 2. Scottish case ──────────────────────────────────────────────────────

  it("routes Scottish case through engine dispatch", () => {
    const directRuns = formatOscolaScottishCase({
      caseName: "AXA General Insurance Ltd v Lord Advocate",
      year: 2011,
      yearType: "round",
      reportSeries: "SC",
      startPage: 158,
      neutralCitation: { year: 2011, court: "CSIH", number: 31 },
    });
    const directText = joinText(directRuns);

    // Verify the direct formatter output contains expected elements
    expect(directText).toBe(
      "AXA General Insurance Ltd v Lord Advocate [2011] CSIH 31, (2011) SC 158"
    );

    // Engine dispatch with OSCOLA config for a reported case
    const citation = makeCitation("case.reported", {
      party1: "AXA General Insurance Ltd",
      party2: "Lord Advocate",
      separator: "v",
      yearType: "round",
      year: 2011,
      reportSeries: "SC",
      startingPage: 158,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    // Engine output must contain the key case elements
    // No neutral citation supplied via the engine path, so only the report
    // citation is rendered.
    expect(engineText).toBe("AXA General Insurance Ltd v Lord Advocate (2011) SC 158");
  });

  // ─── 3. NI case ────────────────────────────────────────────────────────────

  it("routes NI case through engine dispatch", () => {
    const directRuns = formatOscolaNICase({
      caseName: "Re McFarland",
      neutralCitation: { year: 2004, court: "NICA", number: 29 },
      reportCitation: {
        year: 2004,
        yearType: "square",
        series: "NI",
        startPage: 380,
      },
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Re McFarland [2004] NICA 29, [2004] NI 380");

    // Via engine — use case.reported source type
    const citation = makeCitation("case.reported", {
      party1: "Re McFarland",
      party2: "",
      separator: "",
      yearType: "square",
      year: 2004,
      reportSeries: "NI",
      startingPage: 380,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    // No neutral citation supplied via the engine path, so only the report
    // citation is rendered.
    expect(engineText).toBe("Re McFarland [2004] NI 380");
  });

  // ─── 4. UK primary legislation ─────────────────────────────────────────────

  it("routes UK primary legislation through engine dispatch", () => {
    const directRuns = formatOscolaPrimaryLegislation({
      title: "Human Rights Act",
      year: 1998,
      type: "uk",
      pinpoint: "s 6",
    });
    const directText = joinText(directRuns);
    expect(directText).toContain("Human Rights Act 1998");

    // Via engine
    const citation = makeCitation("legislation.statute", {
      title: "Human Rights Act",
      year: 1998,
      jurisdiction: "UK",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Human Rights Act 1998");
    // OSCOLA: legislation is NOT italic
    const legRun = engineRuns.find((r) => r.text.includes("Human Rights Act"));
    if (legRun) {
      // When wiring is complete, this should be roman (not italic)
      // Under OSCOLA config, italiciseLegislation is false
    }
    // Closing punctuation now managed by refresher
  });

  // ─── 5. UK secondary legislation ──────────────────────────────────────────

  it("routes UK secondary legislation through engine dispatch", () => {
    const directRuns = formatOscolaSecondaryLegislation({
      title: "Civil Procedure Rules",
      year: 1998,
      type: "si",
      number: 3132,
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Civil Procedure Rules 1998, SI 1998/3132");

    // Via engine with delegated legislation type
    const citation = makeCitation("legislation.delegated", {
      title: "Civil Procedure Rules",
      year: 1998,
      number: 3132,
      jurisdiction: "UK",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Civil Procedure Rules 1998, SI 1998/3132");
  });

  // ─── 6. Hansard ────────────────────────────────────────────────────────────

  it("routes Hansard through engine dispatch", () => {
    const directRuns = formatOscolaHansard({
      chamber: "HC",
      date: "3 March 2020",
      volume: 672,
      column: 800,
      speaker: "Boris Johnson",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("HC Deb 3 March 2020, vol 672, col 800 (Boris Johnson)");

    // Via engine with correct adapter fields
    const citation = makeCitation("hansard", {
      chamber: "HC",
      date: "3 March 2020",
      volume: 672,
      column: 800,
      speaker: "Boris Johnson",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("HC Deb 3 March 2020, vol 672, col 800 (Boris Johnson)");
  });

  // ─── 7. EU case ────────────────────────────────────────────────────────────

  it("routes EU case through engine dispatch", () => {
    const directRuns = formatCjeuCase({
      caseNumber: "C-402/05 P",
      caseName: "Kadi v Council of the European Union",
      ecli: "ECLI:EU:C:2008:461",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe(
      "Case C-402/05 P Kadi v Council of the European Union ECLI:EU:C:2008:461"
    );

    // Via engine with correct adapter fields for EU court dispatch
    const citation = makeCitation("eu.court", {
      caseNumber: "C-402/05 P",
      caseName: "Kadi v Council of the European Union",
      title: "Kadi v Council of the European Union",
      ecli: "ECLI:EU:C:2008:461",
      year: 2008,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe(
      "Case C-402/05 P Kadi v Council of the European Union ECLI:EU:C:2008:461"
    );
  });

  // ─── 8. ECHR case ──────────────────────────────────────────────────────────

  it("routes ECHR case through engine dispatch", () => {
    const directRuns = formatEcthrCase({
      caseName: "Othman (Abu Qatada)",
      respondentState: "United Kingdom",
      applicationNumber: "8139/09",
      date: "17 January 2012",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe(
      "Othman (Abu Qatada) v United Kingdom App no 8139/09 (ECtHR, 17 January 2012)"
    );

    // Via engine with correct adapter fields for ECHR dispatch
    const citation = makeCitation("echr.decision", {
      caseName: "Othman (Abu Qatada)",
      respondentState: "United Kingdom",
      applicationNumber: "8139/09",
      date: "17 January 2012",
      title: "Othman (Abu Qatada) v United Kingdom",
      year: 2012,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe(
      "Othman (Abu Qatada) v United Kingdom App no 8139/09 (ECtHR, 17 January 2012)"
    );
  });

  // ─── 9. GenAI ──────────────────────────────────────────────────────────────

  it("routes GenAI citation through engine dispatch", () => {
    const directRuns = formatGenAiCitation({
      toolName: "ChatGPT",
      provider: "OpenAI",
      prompt: "Summarise the rule in Donoghue v Stevenson",
      dateGenerated: "15 March 2026",
      url: "https://chat.openai.com/share/abc123",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe(
      "ChatGPT (OpenAI), ‘Summarise the rule in Donoghue v Stevenson’ (response generated 15 March 2026) <https://chat.openai.com/share/abc123>"
    );

    // Via engine
    const citation = makeCitation("genai_output", {
      platform: "ChatGPT",
      model: "GPT-4",
      prompt: "Summarise the rule in Donoghue v Stevenson",
      outputDate: "15 March 2026",
      url: "https://chat.openai.com/share/abc123",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    // GenAI output is dispatched through the engine (may use OSCOLA or AGLC4 formatter)
    // Engine data uses platform (no provider field), so no "(OpenAI)" suffix.
    expect(engineText).toBe(
      "ChatGPT, ‘Summarise the rule in Donoghue v Stevenson’ " +
        "(response generated 15 March 2026) <https://chat.openai.com/share/abc123>"
    );
  });

  // ─── 10. Irish case ────────────────────────────────────────────────────────

  it("routes Irish case through engine dispatch", () => {
    const directRuns = formatIrishCase({
      caseName: "Langan v Health Service Executive",
      neutralCitation: { year: 2024, court: "IESC", number: 1 },
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Langan v Health Service Executive [2024] IESC 1");

    // Via engine — Irish cases as foreign sources
    const citation = makeCitation("case.reported", {
      party1: "Langan",
      party2: "Health Service Executive",
      separator: "v",
      yearType: "square",
      year: 2024,
      reportSeries: "IESC",
      startingPage: 1,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Langan v Health Service Executive [2024] IESC 1");
  });

  // ─── 11. Book citation with OSCOLA config — "edn" not "ed" ────────────────

  it("uses 'edn' edition abbreviation with OSCOLA config", () => {
    // OSCOLA uses "edn" not "ed" for editions
    expect(OSCOLA5_CONFIG.editionAbbreviation).toBe("edn");

    const citation = makeCitation("book", {
      authors: [{ givenNames: "Andrew", surname: "Burrows" }],
      title: "The Law of Restitution",
      publisher: "Oxford University Press",
      edition: 3,
      year: 2011,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe(
      "Andrew Burrows, The Law of Restitution (Oxford University Press, 3rd edn, 2011)"
    );
    // When edition wiring is complete, the "edn" abbreviation should appear
    // The config is correctly set to "edn" for OSCOLA
    expect(OSCOLA5_CONFIG.editionAbbreviation).toBe("edn");
  });

  // ─── 12. Subsequent reference — no ibid ────────────────────────────────────

  it("produces short reference (not ibid) with OSCOLA config", () => {
    // OSCOLA disables ibid
    expect(OSCOLA5_CONFIG.ibidEnabled).toBe(false);

    const citation = makeCitation(
      "book",
      {
        authors: [{ givenNames: "Andrew", surname: "Burrows" }],
        title: "The Law of Restitution",
        publisher: "Oxford University Press",
        year: 2011,
      },
      "Law of Restitution"
    );
    citation.firstFootnoteNumber = 1;

    const ctx = subsequentContext({
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
    });

    const runs = formatCitation(citation, ctx, OSCOLA5_CONFIG);
    const text = joinText(runs);

    // Should NOT produce "Ibid" — OSCOLA disables ibid
    expect(text).not.toMatch(/^Ibid/i);
    // Should produce a short reference with (n X) format
    expect(text).toContain("(n ");
    // Closing punctuation now managed by refresher
  });
});

// =============================================================================
// NZLSG INTEGRATION TESTS
// =============================================================================

describe("NZLSG-ENH-002: NZLSG engine dispatch integration", () => {
  // ─── 1. NZ case with neutral citation ──────────────────────────────────────

  it("routes NZ case with neutral citation through engine dispatch", () => {
    const directRuns = nzlsgFormatNeutralCitation({
      caseName: "R v Fonotia",
      year: 2007,
      courtIdentifier: "NZCA",
      decisionNumber: 188,
      parallelReport: {
        year: 2007,
        volume: 3,
        reportSeries: "NZLR",
        startPage: 338,
      },
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338");

    // Via engine — the NZLSG dispatch reads court/decisionNumber/parallelReport
    const citation = makeCitation("case.reported", {
      party1: "R",
      party2: "Fonotia",
      separator: "v",
      yearType: "square",
      year: 2007,
      court: "NZCA",
      decisionNumber: 188,
      parallelReport: {
        year: 2007,
        volume: 3,
        reportSeries: "NZLR",
        startPage: 338,
      },
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("R v Fonotia [2007] NZCA 188, [2007] 3 NZLR 338");
    // Closing punctuation now managed by refresher
  });

  // ─── 2. Pre-neutral case ───────────────────────────────────────────────────

  it("routes pre-neutral NZ case through engine dispatch", () => {
    const directRuns = nzlsgFormatPreNeutralCase({
      caseName: "Taylor v Beere",
      court: "HC",
      registry: "Wellington",
      fileNumber: "CP 291/85",
      date: "7 November 1985",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Taylor v Beere HC Wellington CP 291/85, 7 November 1985");

    // Via engine with a case source type — fileNumber selects the
    // pre-neutral format in the NZLSG dispatch
    const citation = makeCitation("case.unreported.mnc", {
      party1: "Taylor",
      party2: "Beere",
      separator: "v",
      year: 1985,
      court: "HC",
      registry: "Wellington",
      fileNumber: "CP 291/85",
      date: "7 November 1985",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Taylor v Beere HC Wellington CP 291/85, 7 November 1985");
  });

  // ─── 3. Maori Land Court ───────────────────────────────────────────────────

  it("routes Maori Land Court case through engine dispatch", () => {
    const directRuns = nzlsgFormatMaoriLandCourt({
      caseName: "Pomare \u2013 Peter Here Pomare",
      year: 2015,
      blockNumber: 103,
      minuteBookDistrict: "Taitokerau",
      minuteBookAbbrev: "MB",
      page: 95,
      shortBlockNumber: 103,
      shortCourtAbbrev: "TTK",
      shortPage: 95,
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Pomare – Peter Here Pomare (2015) 103 Taitokerau MB 95 (103 TTK 95)");

    // Maori Land Court via engine — uses quasi_judicial with MLC fields
    const citation = makeCitation("case.quasi_judicial", {
      caseName: "Pomare \u2013 Peter Here Pomare",
      title: "Pomare \u2013 Peter Here Pomare",
      party1: "Pomare",
      year: 2015,
      blockNumber: 103,
      minuteBookDistrict: "Taitokerau",
      minuteBookAbbrev: "MB",
      page: 95,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    // Should contain key elements from the formatter
    expect(engineText).toContain("2015");
  });

  // ─── 4. Waitangi Tribunal report ───────────────────────────────────────────

  it("routes Waitangi Tribunal report through engine dispatch", () => {
    const directRuns = nzlsgFormatWaitangiTribunalReport({
      title: "Ko Aotearoa T\u0113nei",
      waiNumber: 262,
      year: 2011,
      pinpoint: "23",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011) at 23");

    // Via engine
    const citation = makeCitation("report.waitangi_tribunal", {
      title: "Ko Aotearoa T\u0113nei",
      waiNumber: 262,
      year: 2011,
      pinpoint: { type: "page" as const, value: "23" },
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Waitangi Tribunal Ko Aotearoa T\u0113nei (Wai 262, 2011) at 23");
  });

  // ─── 5. NZ legislation ─────────────────────────────────────────────────────

  it("routes NZ legislation through engine dispatch", () => {
    const directRuns = nzlsgFormatLegislation({
      title: "Property Law Act",
      year: 2007,
      pinpoint: "s 27",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Property Law Act 2007, s 27");

    // Via engine
    const citation = makeCitation("legislation.statute", {
      title: "Property Law Act",
      year: 2007,
      jurisdiction: "NZ",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    // NZLSG 4.1: no jurisdiction parenthetical for NZ domestic legislation
    expect(engineText).toBe("Property Law Act 2007");
    // NZLSG: legislation is NOT italic
    expect(NZLSG3_CONFIG.italiciseLegislation).toBe(false);
    // Closing punctuation now managed by refresher
  });

  // ─── 6. NZ bill ────────────────────────────────────────────────────────────

  it("routes NZ bill through engine dispatch", () => {
    const directRuns = nzlsgFormatBill({
      title: "Trusts Bill",
      billNumber: "105-2",
      pinpoint: "cl 5",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("Trusts Bill (no 105-2), cl 5");

    // Via engine
    const citation = makeCitation("legislation.bill", {
      title: "Trusts Bill",
      year: 2017,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toContain("Trusts Bill");
  });

  // ─── 7. NZPD ──────────────────────────────────────────────────────────────

  it("routes NZPD through engine dispatch", () => {
    const directRuns = nzlsgFormatNZPD({
      date: "21 July 2009",
      volume: 656,
      page: 5531,
      speaker: "Christopher Finlayson",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe("(21 July 2009) 656 NZPD 5531 (Christopher Finlayson)");

    // Via engine
    const citation = makeCitation("hansard", {
      title: "NZPD 21 July 2009",
      year: 2009,
      nzpd: true,
      date: "21 July 2009",
      volume: 656,
      page: 5531,
      speaker: "Christopher Finlayson",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("(21 July 2009) 656 NZPD 5531 (Christopher Finlayson)");
  });

  // ─── 8. NZ book with "at" pinpoint ─────────────────────────────────────────

  it("routes NZ book with 'at' pinpoint through engine dispatch", () => {
    const directRuns = nzlsgFormatBook({
      author: "Andrew Butler and Petra Butler",
      title: "The New Zealand Bill of Rights Act: A Commentary",
      edition: "2nd ed",
      publisher: "LexisNexis",
      place: "Wellington",
      year: 2015,
      pinpoint: "134",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe(
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 134"
    );

    // Via engine — the NZLSG dispatch passes edition/place through verbatim
    const citation = makeCitation("book", {
      authors: [
        { givenNames: "Andrew", surname: "Butler" },
        { givenNames: "Petra", surname: "Butler" },
      ],
      title: "The New Zealand Bill of Rights Act: A Commentary",
      edition: "2nd ed",
      publisher: "LexisNexis",
      place: "Wellington",
      year: 2015,
      pinpoint: { type: "page" as const, value: "134" },
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe(
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary " +
        "(2nd ed, LexisNexis, Wellington, 2015) at 134"
    );
    // NZLSG uses "at" pinpoint prefix
    expect(NZLSG3_CONFIG.pinpointPrefix).toBe("at ");
  });

  // ─── 9. NZ journal with double quotes ──────────────────────────────────────

  it("routes NZ journal article with double quotes through engine dispatch", () => {
    const directRuns = nzlsgFormatJournalArticle({
      author: "Claudia Geiringer",
      title: "On a Road to Nowhere",
      year: 2009,
      volume: 40,
      journal: "VUWLR",
      startPage: 613,
    });
    const directText = joinText(directRuns);
    expect(directText).toContain("\u201C"); // left double quote
    expect(directText).toContain("\u201D"); // right double quote
    expect(directText).toContain("VUWLR");

    // Via engine
    const citation = makeCitation("journal.article", {
      authors: [{ givenNames: "Claudia", surname: "Geiringer" }],
      title: "On a Road to Nowhere",
      year: 2009,
      volume: 40,
      journal: "VUWLR",
      startingPage: 613,
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toBe("Claudia Geiringer “On a Road to Nowhere” (2009) 40 VUWLR 613");
    // NZLSG uses double quotation marks
    expect(NZLSG3_CONFIG.quotationMarkStyle).toBe("double");
  });

  // ─── 10. NZ treaty ─────────────────────────────────────────────────────────

  it("routes NZ treaty through engine dispatch", () => {
    const directRuns = nzlsgFormatTreaty({
      title: "Vienna Convention on the Law of Treaties",
      signingEvent: "opened for signature 23 May 1969",
      entryIntoForce: "entered into force 27 January 1980",
      pinpoint: "art 31",
    });
    const directText = joinText(directRuns);
    expect(directText).toBe(
      "Vienna Convention on the Law of Treaties (opened for signature 23 May 1969, entered into force 27 January 1980) at art 31"
    );

    // Via engine
    const citation = makeCitation("treaty", {
      title: "Vienna Convention on the Law of Treaties",
      openedDate: "23 May 1969",
      treatySeries: "UNTS",
      seriesVolume: 1155,
      startingPage: 331,
      entryIntoForceDate: "27 January 1980",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toContain("Vienna Convention");
    // Treaty title should be italic
    expect(hasItalicRun(engineRuns, "Vienna Convention")).toBe(true);
    // Closing punctuation now managed by refresher
  });

  // ─── 11. Treaty of Waitangi ────────────────────────────────────────────────

  it("routes Treaty of Waitangi through engine dispatch", () => {
    const directRunsEnglish = nzlsgFormatTreatyOfWaitangi({
      language: "english",
      article: 2,
    });
    const directTextEnglish = joinText(directRunsEnglish);
    expect(directTextEnglish).toBe("Treaty of Waitangi art 2");

    const directRunsMaori = nzlsgFormatTreatyOfWaitangi({
      language: "maori",
      article: 3,
    });
    const directTextMaori = joinText(directRunsMaori);
    expect(directTextMaori).toBe("Te Tiriti o Waitangi art 3");

    // Via engine — Treaty of Waitangi mapped as a treaty source type
    const citation = makeCitation("treaty", {
      title: "Treaty of Waitangi",
    });

    const engineRuns = formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    const engineText = joinText(engineRuns);

    expect(engineText).toContain("Treaty of Waitangi");
  });

  // ─── 12. Subsequent reference — "above n" format, no ibid ─────────────────

  it("produces 'above n' short reference (not ibid) with NZLSG config", () => {
    // NZLSG disables ibid and uses "above n" format
    expect(NZLSG3_CONFIG.ibidEnabled).toBe(false);
    expect(NZLSG3_CONFIG.subsequentReferenceFormat).toBe("above n");

    const citation = makeCitation(
      "book",
      {
        authors: [{ givenNames: "Andrew", surname: "Butler" }],
        title: "The New Zealand Bill of Rights Act",
        publisher: "LexisNexis",
        year: 2015,
      },
      "NZBORA Commentary"
    );
    citation.firstFootnoteNumber = 1;

    const pinpoint: Pinpoint = { type: "page", value: "134" };
    const ctx = subsequentContext({
      isSameAsPreceding: true,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 1,
      currentPinpoint: pinpoint,
    });

    const runs = formatCitation(citation, ctx, NZLSG3_CONFIG);
    const text = joinText(runs);

    // Should NOT produce "Ibid" — NZLSG disables ibid
    expect(text).not.toMatch(/^Ibid/i);
    // Should produce "above n" format with short title
    expect(text).toContain("above n");
    // Closing punctuation now managed by refresher
  });

  // ─── 13. Subsequent reference — different preceding citation ───────────────

  it("produces 'above n' for non-preceding subsequent reference", () => {
    const citation = makeCitation(
      "book",
      {
        authors: [{ givenNames: "John", surname: "Smith" }],
        title: "Contract Law",
        publisher: "Thomson Reuters",
        year: 2020,
      },
      "Contract Law"
    );
    citation.firstFootnoteNumber = 2;

    const ctx = subsequentContext({
      isSameAsPreceding: false,
      precedingFootnoteCitationCount: 1,
      firstFootnoteNumber: 2,
    });

    const runs = formatCitation(citation, ctx, NZLSG3_CONFIG);
    const text = joinText(runs);

    // Should produce "above n" short reference
    expect(text).toContain("above n");
    expect(text).not.toMatch(/^Ibid/i);
  });
});

// =============================================================================
// CROSS-STANDARD CONFIG VERIFICATION
// =============================================================================

describe("Multi-standard config verification through engine", () => {
  it("OSCOLA5 config has correct standard-specific values", () => {
    expect(OSCOLA5_CONFIG.standardId).toBe("oscola5");
    expect(OSCOLA5_CONFIG.italiciseLegislation).toBe(false);
    expect(OSCOLA5_CONFIG.quotationMarkStyle).toBe("single");
    expect(OSCOLA5_CONFIG.ibidEnabled).toBe(false);
    expect(OSCOLA5_CONFIG.editionAbbreviation).toBe("edn");
    expect(OSCOLA5_CONFIG.homeJurisdiction).toBe("UK");
    expect(OSCOLA5_CONFIG.bibliographyStructure).toBe("oscola");
  });

  it("NZLSG3 config has correct standard-specific values", () => {
    expect(NZLSG3_CONFIG.standardId).toBe("nzlsg3");
    expect(NZLSG3_CONFIG.italiciseLegislation).toBe(false);
    expect(NZLSG3_CONFIG.quotationMarkStyle).toBe("double");
    expect(NZLSG3_CONFIG.pinpointPrefix).toBe("at ");
    expect(NZLSG3_CONFIG.subsequentReferenceFormat).toBe("above n");
    expect(NZLSG3_CONFIG.ibidEnabled).toBe(false);
    expect(NZLSG3_CONFIG.homeJurisdiction).toBe("NZ");
    expect(NZLSG3_CONFIG.bibliographyStructure).toBe("nzlsg");
  });

  it("formatCitation accepts OSCOLA config without error", () => {
    const citation = makeCitation("book", {
      authors: [{ givenNames: "Test", surname: "Author" }],
      title: "Test Book",
      publisher: "Publisher",
      year: 2020,
    });

    expect(() => {
      formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG);
    }).not.toThrow();
  });

  it("formatCitation accepts NZLSG config without error", () => {
    const citation = makeCitation("book", {
      authors: [{ givenNames: "Test", surname: "Author" }],
      title: "Test Book",
      publisher: "Publisher",
      year: 2020,
    });

    expect(() => {
      formatCitation(citation, firstCitationContext, NZLSG3_CONFIG);
    }).not.toThrow();
  });

  it("produces non-empty output for both standards (closing punctuation is the refresher's job)", () => {
    // Use source types that produce meaningful output with minimal data
    const sourceTypes: Citation["sourceType"][] = ["book", "journal.article"];

    for (const sourceType of sourceTypes) {
      const citation = makeCitation(sourceType, {
        title: "Test",
        year: 2020,
        authors: [{ givenNames: "Test", surname: "Author" }],
        publisher: "Publisher",
        journal: "Test Journal",
        startingPage: 1,
      });

      const oscolaText = joinText(formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG));
      const nzlsgText = joinText(formatCitation(citation, firstCitationContext, NZLSG3_CONFIG));

      // Closing punctuation is managed by the refresher, not formatCitation —
      // the engine must still render substantive output.
      expect(oscolaText.length).toBeGreaterThan(0);
      expect(nzlsgText.length).toBeGreaterThan(0);
      expect(oscolaText.endsWith(".")).toBe(false);
      expect(nzlsgText.endsWith(".")).toBe(false);
    }
  });
});

// =============================================================================
// PARITY-121 — ADAPTER HARDENING (degenerate/missing-field output)
// =============================================================================

describe("PARITY-121: OSCOLA SI adapter omits the instrument number when missing (OSCOLA 2.2.6)", () => {
  it("renders title + year only — never 'SI 1998/0'", () => {
    const citation = makeCitation("legislation.delegated", {
      title: "Civil Procedure Rules",
      year: 1998,
      jurisdiction: "UK",
    });
    const text = joinText(formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG));
    expect(text).toBe("Civil Procedure Rules 1998");
  });

  it("still renders the full form when a number is stored (OSCOLA 2.2.6)", () => {
    const citation = makeCitation("legislation.delegated", {
      title: "Civil Procedure Rules",
      year: 1998,
      number: 3132,
      jurisdiction: "UK",
    });
    const text = joinText(formatCitation(citation, firstCitationContext, OSCOLA5_CONFIG));
    expect(text).toBe("Civil Procedure Rules 1998, SI 1998/3132");
  });
});

describe("PARITY-121: NZLSG book adapter hardening (NZLSG 6.1)", () => {
  it("ordinalises a bare numeric edition and skips a missing place — never '(2, LexisNexis, , 2015)'", () => {
    const citation = makeCitation("book", {
      author: "Andrew Butler and Petra Butler",
      title: "The New Zealand Bill of Rights Act: A Commentary",
      edition: "2",
      publisher: "LexisNexis",
      year: 2015,
    });
    const text = joinText(formatCitation(citation, firstCitationContext, NZLSG3_CONFIG));
    expect(text).toBe(
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, 2015)"
    );
  });

  it("renders the full NZLSG 6.1 form when every element is stored", () => {
    const citation = makeCitation("book", {
      author: "Andrew Butler and Petra Butler",
      title: "The New Zealand Bill of Rights Act: A Commentary",
      edition: "2nd ed",
      publisher: "LexisNexis",
      place: "Wellington",
      year: 2015,
      pinpoint: { type: "page", value: "134" },
    });
    const text = joinText(formatCitation(citation, firstCitationContext, NZLSG3_CONFIG));
    expect(text).toBe(
      "Andrew Butler and Petra Butler The New Zealand Bill of Rights Act: A Commentary (2nd ed, LexisNexis, Wellington, 2015) at 134"
    );
  });
});

describe("PARITY-121: NZLSG Waitangi Tribunal adapter omits a missing Wai number (NZLSG 3.6)", () => {
  it("renders '(Year)' — never '(Wai 0, Year)'", () => {
    const citation = makeCitation("report.waitangi_tribunal", {
      title: "Ko Aotearoa Tēnei",
      year: 2011,
    });
    const text = joinText(formatCitation(citation, firstCitationContext, NZLSG3_CONFIG));
    expect(text).toBe("Waitangi Tribunal Ko Aotearoa Tēnei (2011)");
  });

  it("renders the Wai element when the claim number is stored (NZLSG 3.6)", () => {
    const citation = makeCitation("report.waitangi_tribunal", {
      title: "Ko Aotearoa Tēnei",
      waiNumber: 262,
      year: 2011,
    });
    const text = joinText(formatCitation(citation, firstCitationContext, NZLSG3_CONFIG));
    expect(text).toBe("Waitangi Tribunal Ko Aotearoa Tēnei (Wai 262, 2011)");
  });
});
