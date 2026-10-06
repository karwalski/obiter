/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-105 (OBI-402): golden citation strings from the court instruments.
 *
 * Each golden string is the example an instrument itself gives (register
 * IDs in docs/research/court-interop/EVIDENCE-REGISTER.md). The config is
 * built exactly as a new court document freezes it: `getPresetToggles`
 * (COURT-106) for the court, through `buildDocumentConfig` (STD-013), the
 * path the refresher renders with.
 *
 *  - FCA-1: GPN-AUTH (7 May 2025) cl 2.5, MNC first:
 *    "D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479".
 *  - VIC-1: SC Gen 3 (1 Dec 2025) cl 5.5, report replaces the MNC (cl 5.2),
 *    commencing page kept with a page and paragraph pinpoint (AGLC4
 *    r 2.2.5): "(2023) 72 VR 394, 410 [60]".
 *  - WA-1: Consolidated PD 8.2.2, MNC first with page, paragraph and
 *    judicial attribution (AGLC4 r 2.4):
 *    "Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15] (Smith J)".
 *  - TAS-1: PD 3 of 2014 (21 Feb 2014) cl 3(a), MNC first:
 *    "Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1".
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { buildDocumentConfig } from "../../src/engine/standards";
import { getPresetToggles } from "../../src/engine/court/profile";
import { runsToPlainText } from "../../src/actions/citationService";
import type { Citation } from "../../src/types/citation";

const FIRST: CitationContext = {
  footnoteNumber: 1,
  isFirstCitation: true,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 0,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "auto",
};

/** The config a new court document renders with (frozen preset toggles). */
function courtConfig(jurisdiction: string): ReturnType<typeof buildDocumentConfig> {
  return buildDocumentConfig({
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: jurisdiction,
    courtToggles: getPresetToggles(jurisdiction),
  });
}

function reported(data: Record<string, unknown>): Citation {
  return {
    id: "golden",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: { yearType: "round", ...data },
    tags: [],
    createdAt: "2026-10-07T00:00:00.000Z",
    modifiedAt: "2026-10-07T00:00:00.000Z",
  };
}

function render(citation: Citation, jurisdiction: string): string {
  return runsToPlainText(formatCitation(citation, FIRST, courtConfig(jurisdiction)));
}

describe("COURT-105 — golden citation strings from the court instruments", () => {
  it("FCA-1 GPN-AUTH cl 2.5: neutral citation first, then the authorised report", () => {
    const text = render(
      reported({
        party1: "D'Arcy",
        party2: "Myriad Genetics Inc",
        year: 2014,
        volume: 224,
        reportSeries: "FCR",
        startingPage: 479,
        mnc: "[2014] FCAFC 115",
      }),
      "FCA"
    );
    expect(text.replace(/’/g, "'")).toBe(
      "D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479"
    );
  });

  it("VIC-1 SC Gen 3 cl 5.5: the report alone, commencing page with page and paragraph", () => {
    // The instrument quotes only the citation, not a case name; the
    // party names below are synthetic. cl 5.2: the report is cited
    // "instead of" the unreported version, so no MNC follows.
    const text = render(
      reported({
        party1: "Example Pty Ltd",
        party2: "Sample Council",
        year: 2023,
        volume: 72,
        reportSeries: "VR",
        startingPage: 394,
        mnc: "[2023] VSCA 1",
        pinpoint: { type: "page", value: "410", subPinpoint: { type: "paragraph", value: "[60]" } },
      }),
      "VSC"
    );
    expect(text).toBe("Example Pty Ltd v Sample Council (2023) 72 VR 394, 410 [60]");
  });

  it("WA-1 PD 8.2.2: neutral citation first, page and paragraph, judicial attribution", () => {
    const text = render(
      reported({
        party1: "Lee",
        party2: "The Queen",
        year: 1999,
        volume: 18,
        reportSeries: "WAR",
        startingPage: 23,
        mnc: "[1999] WASCA 14",
        pinpoint: { type: "page", value: "34", subPinpoint: { type: "paragraph", value: "[15]" } },
        judicialOfficers: [{ name: "Smith", title: "J" }],
      }),
      "WASC"
    );
    expect(text).toBe("Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15] (Smith J)");
  });

  it("TAS-1 PD 3 of 2014 cl 3(a): neutral citation first, then the authorised report", () => {
    const text = render(
      reported({
        party1: "Jackson",
        party2: "Building Appeal Board",
        year: 2010,
        volume: 20,
        reportSeries: "Tas R",
        startingPage: 1,
        mnc: "[2010] TASSC 29",
      }),
      "TASSC"
    );
    expect(text).toBe("Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1");
  });

  it("an academic AGLC4 document renders the report alone, unchanged (AGLC4 r 2.2.7)", () => {
    const config = buildDocumentConfig({ standardId: "aglc4", writingMode: "academic" });
    const text = runsToPlainText(
      formatCitation(
        reported({
          party1: "Jackson",
          party2: "Building Appeal Board",
          year: 2010,
          volume: 20,
          reportSeries: "Tas R",
          startingPage: 1,
          mnc: "[2010] TASSC 29",
        }),
        FIRST,
        config
      )
    );
    expect(text).toBe("Jackson v Building Appeal Board (2010) 20 Tas R 1");
  });
});
