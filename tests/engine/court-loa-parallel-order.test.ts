/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Defect B1 from live testing in Word for the web (Federal Court
 * profile, court submission mode), 7 Oct 2026.
 *
 * - B1 / COURT-117: the List of Authorities case entry follows the
 *   profile's parallel order, as the footnote does.
 *
 * Sources: FCA GPN-AUTH (7 May 2025) cl 2.4–2.6 (register FCA-1, O-R2);
 * AGLC4 rr 2.2.5, 2.2.7 (derived reference, PDF pp 77, 79).
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import {
  generateBibliographyForStandard,
  generateCourtListOfAuthorities,
  generateListOfAuthorities,
  generateLoaWithOptions,
} from "../../src/engine/rules/v4/general/bibliography";
import { getPresetToggles } from "../../src/engine/court/profile";
import type { CourtJurisdiction } from "../../src/engine/court/presets";
import { buildCourtConfig, getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { Citation } from "../../src/types/citation";

const text = (runs: Array<{ text: string }>): string => runs.map((r) => r.text).join("");

const academic: CitationConfig = getStandardConfig("aglc4");

function courtConfig(jurisdiction: CourtJurisdiction): CitationConfig {
  return buildCourtConfig(
    { ...academic, writingMode: "court" },
    getPresetToggles(jurisdiction) as Record<string, string>
  );
}

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

const firstContext: CitationContext = {
  footnoteNumber: 1,
  isFirstCitation: true,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 0,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "auto",
} as CitationContext;

function loaCaseText(citation: Citation, config?: CitationConfig): string {
  const sections = generateListOfAuthorities([citation], config);
  return text(sections[0].entries[0]);
}

describe("B1 / COURT-117: List of Authorities follows the parallel order", () => {
  test("FCA (MNC first): the LOA entry matches the footnote order", () => {
    const config = courtConfig("FCA");
    const footnote = text(formatCitation(kozarov(), firstContext, config));
    expect(footnote).toBe("Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115 at [45]");
    expect(loaCaseText(kozarov(), config)).toBe(
      "Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115"
    );
  });

  test("FCA through generateBibliographyForStandard (the Bibliography view path)", () => {
    const config = courtConfig("FCA");
    const sections = generateBibliographyForStandard(
      [kozarov()],
      config.bibliographyStructure,
      "court",
      config.loaType,
      config
    );
    const all = sections.flatMap((s) => s.entries.map((e) => text(e)));
    expect(all).toContain("Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115");
  });

  test("FCA through generateCourtListOfAuthorities and generateLoaWithOptions", () => {
    const config = courtConfig("FCA");
    const layout = generateCourtListOfAuthorities([kozarov()], "simple", false, config);
    expect(text(layout.sections[0].entries[0])).toBe(
      "Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115"
    );
    const result = generateLoaWithOptions(
      [kozarov()],
      { loaType: "part-ab", includeSecondary: false, exportTarget: "new-document" },
      config
    );
    const all = result.sections.flatMap((s) => s.entries.map((e) => text(e)));
    expect(all).toContain("Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115");
  });

  test("the key-authority asterisk stays in front of the case name", () => {
    const config = courtConfig("FCA");
    const cite = { ...kozarov(), isKeyAuthority: true } as Citation;
    expect(loaCaseText(cite, config)).toBe(
      "* Kozarov v Victoria [2022] HCA 12; (2022) 273 CLR 115"
    );
  });

  test("report-first presets are unchanged", () => {
    for (const id of ["HCA", "NSWCA", "QCA", "SASC"] as CourtJurisdiction[]) {
      expect(loaCaseText(kozarov(), courtConfig(id))).toBe(
        "Kozarov v Victoria (2022) 273 CLR 115; [2022] HCA 12"
      );
    }
  });

  test("no config keeps the earlier entry (report first)", () => {
    expect(loaCaseText(kozarov())).toBe("Kozarov v Victoria (2022) 273 CLR 115; [2022] HCA 12");
  });

  test("a profile whose report replaces the MNC gives the report alone, as the footnote does", () => {
    const config = courtConfig("VSC");
    const footnote = text(formatCitation(kozarov({ pinpoint: "" }), firstContext, config));
    expect(footnote).not.toContain("HCA 12");
    expect(loaCaseText(kozarov(), config)).toBe("Kozarov v Victoria (2022) 273 CLR 115");
  });

  test("an MNC-only entry (no report series) still gives the MNC", () => {
    const cite = kozarov({ reportSeries: "", volume: undefined, startingPage: undefined });
    expect(loaCaseText(cite, courtConfig("FCA"))).toContain("[2022] HCA 12");
  });
});
