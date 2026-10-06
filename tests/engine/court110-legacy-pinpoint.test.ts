/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-110 follow-up (owner, 7 Oct 2026; DECISION-043 owner follow-ups).
 *
 * COURT-110 made a "para-only" report pinpoint keep the report's starting
 * page, as AGLC4 r 2.2.5 requires (a page must always appear in a report
 * pinpoint; derived reference §2.2.5, PDF p 77). An existing court document
 * keeps the form it was written with until its user accepts the
 * per-document "Update court profile" prompt (DECISION-043 item 4). New
 * documents get the corrected form. Academic AGLC4 output never changes.
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { formatStartingPageAndPinpoint } from "../../src/engine/rules/v4/domestic/cases";
import {
  REPORT_STARTING_PAGE_DETAIL,
  applyProfileUpdate,
  createCourtProfile,
  createMigratedProfile,
  diffCourtProfile,
  formatToggleValue,
  freezeEffectiveToggles,
  getPresetToggles,
  isProfileUpdateAvailable,
} from "../../src/engine/court/profile";
import { getFieldProvenance } from "../../src/engine/court/provenance";
import { freezeCourtProfileMigration } from "../../src/store/migrations";
import {
  buildCourtConfig,
  buildDocumentConfig,
  getStandardConfig,
} from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { Citation, CitationStoreData } from "../../src/types/citation";

const NOW = new Date("2026-10-07T00:00:00Z");
const text = (runs: Array<{ text: string }>): string => runs.map((r) => r.text).join("");

const PAPE: Citation = {
  id: "pape",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Pape",
    party2: "Commissioner of Taxation",
    yearType: "round",
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
    pinpoint: { type: "paragraph", value: "[45]" },
  },
  shortTitle: "Pape",
  tags: [],
  createdAt: "2026-10-07T00:00:00Z",
  modifiedAt: "2026-10-07T00:00:00Z",
} as Citation;

const FIRST: CitationContext = {
  footnoteNumber: 1,
  isFirstCitation: true,
  isSameAsPreceding: false,
  precedingFootnoteCitationCount: 0,
  firstFootnoteNumber: 1,
  isWithinSameFootnote: false,
  formatPreference: "auto",
};

function render(config: CitationConfig, citation: Citation = PAPE): string {
  return text(formatCitation(citation, FIRST, config));
}

function courtConfig(jurisdiction: string, toggles: Record<string, string>): CitationConfig {
  return buildDocumentConfig({
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: jurisdiction,
    courtToggles: toggles,
  });
}

describe("COURT-110 follow-up: the starting-page form in the formatter (AGLC4 r 2.2.5)", () => {
  test("para-only keeps the starting page by default (the corrected form)", () => {
    expect(
      text(formatStartingPageAndPinpoint(1, { type: "paragraph", value: "[45]" }, "para-only"))
    ).toBe("1 [45]");
  });

  test("'legacy' gives the pre-COURT-110 para-only form without the starting page", () => {
    const legacy = (p: Parameters<typeof formatStartingPageAndPinpoint>[1]): string =>
      text(formatStartingPageAndPinpoint(1, p, "para-only", "aglc", "legacy"));
    expect(legacy({ type: "paragraph", value: "[45]" })).toBe("[45]");
    expect(legacy({ type: "page", value: "6" })).toBe("6");
    expect(
      legacy({ type: "page", value: "6", subPinpoint: { type: "paragraph", value: "[23]" } })
    ).toBe("6 [23]");
    // No pinpoint: the starting page, as before.
    expect(legacy(undefined)).toBe("1");
  });

  test("'legacy' changes nothing for page-only, para-and-page or the 'at' connector", () => {
    const pin = { type: "paragraph" as const, value: "[45]" };
    expect(text(formatStartingPageAndPinpoint(1, pin, "page-only", "aglc", "legacy"))).toBe(
      text(formatStartingPageAndPinpoint(1, pin, "page-only"))
    );
    expect(text(formatStartingPageAndPinpoint(1, pin, "para-and-page", "aglc", "legacy"))).toBe(
      "1, [45]"
    );
    expect(text(formatStartingPageAndPinpoint(1, pin, "para-only", "at", "legacy"))).toBe(
      "1 at [45]"
    );
  });

  test("only an explicit 'legacy' toggle reaches the config; academic mode ignores it", () => {
    const base = getStandardConfig("aglc4");
    const court = { ...base, writingMode: "court" as const };
    expect(buildCourtConfig(court, { reportStartingPage: "legacy" }).reportStartingPage).toBe(
      "legacy"
    );
    expect(buildCourtConfig(court, { reportStartingPage: "always" })).not.toHaveProperty(
      "reportStartingPage"
    );
    expect(buildCourtConfig(court, {})).not.toHaveProperty("reportStartingPage");
    expect(buildCourtConfig(base, { reportStartingPage: "legacy" })).toBe(base);
  });

  test("academic AGLC4 output is unchanged whatever the stored toggle", () => {
    const academic = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "academic",
      courtToggles: { pinpointStyle: "para-only", reportStartingPage: "legacy" },
    });
    expect(render(academic)).toBe(render(getStandardConfig("aglc4")));
    expect(render(academic)).toContain("238 CLR 1 [45]");
  });
});

describe("COURT-110 follow-up: existing documents keep their output until they accept the update", () => {
  test("a pre-v3 NSW document is frozen at the form it was written with", () => {
    const stored = { pinpointStyle: "para-only", ibidSuppression: "on" };
    const frozen = freezeEffectiveToggles(getStandardConfig("aglc4"), "NSWCA", stored);
    expect(frozen.reportStartingPage).toBe("legacy");
    expect(render(courtConfig("NSWCA", frozen))).toContain("238 CLR [45]");
  });

  test("the v2 to v3 migration freezes 'legacy' for a court document", () => {
    const data: CitationStoreData = {
      metadata: {
        schemaVersion: "2",
        aglcVersion: "4",
        standardId: "aglc4",
        writingMode: "court",
        courtJurisdiction: "QCA",
        courtToggles: { pinpointStyle: "para-only" },
      },
      citations: [],
    };
    const migrated = freezeCourtProfileMigration(data, { now: NOW });
    expect(migrated.metadata.courtToggles?.reportStartingPage).toBe("legacy");
  });

  test("a new document selecting a para-only court gets the corrected form", () => {
    for (const id of ["NSWCA", "NSWSC", "QCA", "QSC", "ART", "STATE_TRIBUNAL"]) {
      const toggles = getPresetToggles(id)!;
      expect(toggles.reportStartingPage).toBe("always");
      expect(render(courtConfig(id, toggles))).toContain("238 CLR 1 [45]");
      expect(isProfileUpdateAvailable(toggles, createCourtProfile(id, NOW), id)).toBe(false);
    }
  });

  test("a document frozen after the fix without the key renders the corrected form", () => {
    const toggles = { ...getPresetToggles("NSWCA")! };
    delete (toggles as Record<string, string>).reportStartingPage;
    expect(render(courtConfig("NSWCA", toggles))).toContain("238 CLR 1 [45]");
    expect(diffCourtProfile(toggles, createCourtProfile("NSWCA", NOW), "NSWCA")).toEqual([]);
  });

  test("the update prompt lists the change in plain words, and accepting it applies the fix", () => {
    const frozen = freezeEffectiveToggles(
      getStandardConfig("aglc4"),
      "NSWCA",
      getPresetToggles("NSWCA")
    );
    // Only the starting page differs from the current preset.
    frozen.reportStartingPage = "legacy";
    const profile = createMigratedProfile("NSWCA", NOW);
    expect(isProfileUpdateAvailable(frozen, profile, "NSWCA")).toBe(true);

    const changes = diffCourtProfile(frozen, profile, "NSWCA");
    expect(changes.map((c) => c.key)).toEqual(["reportStartingPage"]);
    const [row] = changes;
    expect(row.label).toBe("Report starting page with a paragraph pinpoint");
    expect(formatToggleValue(row.key, row.current)).toBe("Left out (earlier Obiter form)");
    expect(formatToggleValue(row.key, row.proposed)).toBe("Always shown (AGLC4 r 2.2.5)");
    expect(row.detail).toBe(REPORT_STARTING_PAGE_DETAIL);
    expect(row.detail).toContain("238 CLR 1 [45] instead of 238 CLR [45]");
    expect(row.detail).not.toContain("!");

    // Until accepted, the document keeps its output.
    expect(render(courtConfig("NSWCA", frozen))).toContain("238 CLR [45]");
    const accepted = applyProfileUpdate(frozen, profile, "NSWCA", ["reportStartingPage"], NOW);
    expect(accepted.toggles.reportStartingPage).toBe("always");
    expect(render(courtConfig("NSWCA", accepted.toggles))).toContain("238 CLR 1 [45]");
    expect(isProfileUpdateAvailable(accepted.toggles, accepted.profile, "NSWCA")).toBe(false);
  });

  test("unticking the row keeps the earlier form as the user's choice", () => {
    const frozen = { ...getPresetToggles("QCA")!, reportStartingPage: "legacy" };
    const profile = createMigratedProfile("QCA", NOW);
    const kept = applyProfileUpdate(frozen, profile, "QCA", [], NOW);
    expect(kept.toggles.reportStartingPage).toBe("legacy");
    expect(kept.profile.overridden).toContain("reportStartingPage");
    expect(isProfileUpdateAvailable(kept.toggles, kept.profile, "QCA")).toBe(false);
    expect(render(courtConfig("QCA", kept.toggles))).toContain("238 CLR [45]");
  });

  test("a document whose style is not para-only is not prompted for a change it cannot see", () => {
    const frozen = { ...getPresetToggles("VSC")!, reportStartingPage: "legacy" };
    const profile = createMigratedProfile("VSC", NOW);
    expect(diffCourtProfile(frozen, profile, "VSC")).toEqual([]);
    expect(isProfileUpdateAvailable(frozen, profile, "VSC")).toBe(false);
    // Output is unchanged for para-and-page either way.
    expect(render(courtConfig("VSC", frozen))).toBe(
      render(courtConfig("VSC", getPresetToggles("VSC")!))
    );
  });

  test("an update that leaves the style not para-only moves the toggle to the preset value", () => {
    const frozen = {
      ...getPresetToggles("VSC")!,
      ibidSuppression: "off",
      reportStartingPage: "legacy",
    };
    const profile = createMigratedProfile("VSC", NOW);
    const result = applyProfileUpdate(frozen, profile, "VSC", ["ibidSuppression"], NOW);
    expect(result.toggles.reportStartingPage).toBe("always");
    expect(result.profile.overridden).not.toContain("reportStartingPage");
  });

  test("every preset cites AGLC4 r 2.2.5 for the starting page", () => {
    for (const id of ["HCA", "NSWCA", "QCA", "STATE_TRIBUNAL"]) {
      const prov = getFieldProvenance(id, "reportStartingPage");
      expect(prov?.sourceIds).toEqual(["AGLC4"]);
      expect(prov?.clause).toBe("r 2.2.5");
    }
  });
});
