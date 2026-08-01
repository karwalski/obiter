/**
 * CRIT-004 — Court-practice validation matrix.
 *
 * A regression matrix that pins court-mode output to each jurisdiction's
 * documented practice. For every one of the COURT_PRESETS it:
 *   1. asserts the preset shape is internally valid (toggles drawn from the
 *      documented option sets), and
 *   2. builds the court-mode CitationConfig from the preset and formats a
 *      reported case carrying a medium-neutral citation and a paragraph
 *      pinpoint, asserting the rendered pinpoint STYLE and parallel-citation
 *      ORDER match what that jurisdiction's practice direction requires.
 *
 * The intent is that a change to any preset (e.g. a practice-direction update)
 * forces a corresponding, visible change here — so court mode cannot silently
 * drift away from the documented practice recorded in docs/court-practices-review.md.
 */

import { COURT_PRESETS, CourtJurisdiction, CourtPreset } from "../../src/engine/court/presets";
import {
  AI_USE_REMINDERS,
  getAiUseReminderForJurisdiction,
  getAllAiUseReminders,
  type AiReminderFamily,
} from "../../src/engine/court/practiceDirections";
import { buildCourtConfig } from "../../src/engine/standards";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";
import { generateListOfAuthorities } from "../../src/engine/rules/v4/general/bibliography";
import type { Citation } from "../../src/types/citation";
import type { CitationConfig } from "../../src/engine/standards/types";

const { formatCitation } = require("../../src/engine/engine");

const PINPOINT_STYLES = new Set(["page-only", "para-only", "para-and-page"]);
const PARALLEL_MODES = new Set(["off", "preferred", "mandatory"]);
const PARALLEL_ORDERS = new Set(["report-first", "mnc-first"]);
const LOA_TYPES = new Set([
  "off",
  "simple",
  "part-ab",
  "part-abc",
  "two-part-read",
  "three-part-tas",
]);

const JURISDICTIONS = Object.keys(COURT_PRESETS) as CourtJurisdiction[];

/** A reported HCA-style case carrying an MNC and a paragraph pinpoint. */
function makeReportedCaseWithMnc(): Citation {
  return {
    id: "matrix-case",
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
      mnc: "[2009] HCA 23",
      pinpoint: { type: "paragraph", value: "[45]" },
    },
    shortTitle: "Pape",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
  };
}

/** Build the court-mode config a given preset would produce. */
function configFor(preset: CourtPreset): CitationConfig {
  const base: CitationConfig = { ...STANDARD_PROFILES.aglc4.config, writingMode: "court" };
  return buildCourtConfig(base, {
    parallelCitations: preset.parallelCitations,
    pinpointStyle: preset.pinpointStyle,
    unreportedGate: preset.unreportedGate,
    ibidSuppression: preset.ibidSuppression,
    loaType: preset.loaType,
    parallelOrder: preset.parallelOrder,
  });
}

function render(config: CitationConfig): string {
  const runs = formatCitation(makeReportedCaseWithMnc(), undefined, config) as { text: string }[];
  return runs.map((r) => r.text).join("");
}

describe("CRIT-004: court-practice validation matrix", () => {
  test("all 20 court jurisdictions have a preset", () => {
    expect(JURISDICTIONS.length).toBe(20);
  });

  describe.each(JURISDICTIONS)("%s", (jurisdiction) => {
    const preset = COURT_PRESETS[jurisdiction];

    test("preset shape is drawn from the documented option sets", () => {
      expect(PINPOINT_STYLES.has(preset.pinpointStyle)).toBe(true);
      expect(PARALLEL_MODES.has(preset.parallelCitations)).toBe(true);
      expect(LOA_TYPES.has(preset.loaType)).toBe(true);
      if (preset.parallelOrder !== undefined) {
        expect(PARALLEL_ORDERS.has(preset.parallelOrder)).toBe(true);
      }
      expect(typeof preset.label).toBe("string");
      expect(preset.label.length).toBeGreaterThan(0);
      expect(Array.isArray(preset.authorisedReportHierarchy)).toBe(true);
    });

    test("court-mode pinpoint style matches the preset", () => {
      const text = render(configFor(preset));
      // Rendered forms are pinned by the COURT-005 engine-dispatch tests:
      //   para-only      -> "CLR [45]"    (series + paragraph, no page)
      //   para-and-page  -> "CLR 1, [45]" (series + page + ", " + paragraph)
      //   page-only      -> "CLR 1 [45]"  (series + page + " " + paragraph)
      if (preset.pinpointStyle === "para-only") {
        expect(text).toContain("CLR [45]");
      } else if (preset.pinpointStyle === "para-and-page") {
        expect(text).toContain("CLR 1, [45]");
      } else {
        expect(text).toContain("CLR 1 [45]");
      }
    });

    test("court-mode parallel-citation order matches the preset", () => {
      const text = render(configFor(preset));
      const mncIdx = text.indexOf("[2009] HCA 23");
      const reportIdx = text.indexOf("CLR");
      // The MNC is always emitted in court mode (auto-parallel); the order
      // is what varies. WA (mnc-first) prints the MNC before the report;
      // every other jurisdiction prints the authorised report first.
      expect(mncIdx).toBeGreaterThanOrEqual(0);
      expect(reportIdx).toBeGreaterThanOrEqual(0);
      if (preset.parallelOrder === "mnc-first") {
        expect(mncIdx).toBeLessThan(reportIdx);
      } else {
        expect(reportIdx).toBeLessThan(mncIdx);
      }
    });
  });

  test("WA Supreme Court is the only mnc-first jurisdiction (Consolidated PD 8.2.2)", () => {
    const mncFirst = JURISDICTIONS.filter((j) => COURT_PRESETS[j].parallelOrder === "mnc-first");
    expect(mncFirst).toEqual(["WASC"]);
  });

  test("List of Authorities generation is available in court mode", () => {
    const sections = generateListOfAuthorities([makeReportedCaseWithMnc()]);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
    const totalEntries = sections.reduce((n, s) => n + s.entries.length, 0);
    expect(totalEntries).toBeGreaterThan(0);
  });

  // ── CRIT-004 §4 / A5-CM-2: softened parallel-citation presets ──────────────
  // A future practice-direction change to any of these presets forces a
  // visible diff here. These four jurisdictions were softened "mandatory" ->
  // "preferred" to match the "should, as far as possible" wording verified in
  // CRIT-004 (SC Gen 20; PD 1 of 2024). The Part A/B LOA is unchanged
  // (NSW Part A/B is re-sourced to SC CA 1, but loaType stays "part-ab").
  describe("A5-CM-2: softened parallelCitations presets", () => {
    test.each([
      ["NSWCA", "part-ab"],
      ["NSWSC", "simple"],
      ["QCA", "part-ab"],
      ["QSC", "simple"],
    ] as [CourtJurisdiction, string][])(
      "%s parallelCitations is 'preferred' (loaType %s unchanged)",
      (jurisdiction, expectedLoa) => {
        expect(COURT_PRESETS[jurisdiction].parallelCitations).toBe("preferred");
        expect(COURT_PRESETS[jurisdiction].loaType).toBe(expectedLoa);
      }
    );

    test("no jurisdiction other than the tribunals reports parallelCitations 'off'", () => {
      // Guard: the softening must not have flipped any preset to "off".
      const off = JURISDICTIONS.filter((j) => COURT_PRESETS[j].parallelCitations === "off");
      expect(off.sort()).toEqual(["ART", "FWC", "STATE_TRIBUNAL"]);
    });
  });

  // ── A5-CM-1 / A5-CM-3: court-mode AI-use reminders (practice-direction) ────
  // These are court-mode practice-direction guidance, NOT AGLC citation rules.
  // The matrix pins the family classification and instrument set so a future
  // practice-direction change forces a visible diff.
  describe("A5-CM-1: jurisdiction-keyed AI-use reminders", () => {
    const FAMILY_1: CourtJurisdiction[] = ["QSC", "QCA", "QLD_DISTRICT_MAG", "SASC"];
    const FAMILY_2_PRESET: CourtJurisdiction[] = [
      "NSWSC",
      "NSWCA",
      "NSW_DISTRICT_LOCAL",
      "VSC",
      "VSCA",
      "VIC_COUNTY_MAG",
      "FCA",
      "FCFCOA",
      "WASC",
    ];

    test("every AI reminder carries an instrument with a link and lastVerified 2026-07-23", () => {
      for (const r of getAllAiUseReminders()) {
        expect(r.instruments.length).toBeGreaterThan(0);
        for (const i of r.instruments) {
          expect(i.name.length).toBeGreaterThan(0);
          expect(i.date.length).toBeGreaterThan(0);
          expect(i.url).toMatch(/^https:\/\//);
        }
        expect(r.lastVerified).toBe("2026-07-23");
      }
    });

    test("reminder labels always mark this as court-mode guidance, never an AGLC rule", () => {
      for (const r of getAllAiUseReminders()) {
        expect(r.label.toLowerCase()).toContain("court-mode");
        expect(r.reminder.toLowerCase()).toContain("practice direction");
        // The reminder must explicitly disclaim being an AGLC citation rule.
        expect(r.reminder.toLowerCase()).toContain("not an aglc rule");
      }
    });

    test.each(FAMILY_1)(
      "%s surfaces a Family 1 accuracy/verification reminder (no disclosure addendum)",
      (jurisdiction) => {
        const r = getAiUseReminderForJurisdiction(jurisdiction);
        expect(r).toBeDefined();
        expect(r!.family).toBe<AiReminderFamily>("accuracy-verification");
        expect(r!.reminder).toContain("verify the accuracy");
        // Family 1 has no disclosure/affidavit addendum.
        expect(r!.reminder).not.toContain("affidavit");
      }
    );

    test.each(FAMILY_2_PRESET)(
      "%s surfaces a Family 2 disclosure + restriction reminder (accuracy + affidavit warning)",
      (jurisdiction) => {
        const r = getAiUseReminderForJurisdiction(jurisdiction);
        expect(r).toBeDefined();
        expect(r!.family).toBe<AiReminderFamily>("disclosure-restriction");
        // Family 2 = accuracy reminder PLUS disclosure + affidavit warning.
        expect(r!.reminder).toContain("verify the accuracy");
        expect(r!.reminder).toContain("disclosure");
        expect(r!.reminder).toContain("affidavit");
      }
    );

    test("A5-CM-3: Victoria supreme/appeal reminders cite PN SC Gen 25 (14 May 2026), not the superseded May 2024 guidelines", () => {
      for (const j of ["VSC", "VSCA"]) {
        const r = getAiUseReminderForJurisdiction(j);
        expect(r).toBeDefined();
        const names = r!.instruments.map((i) => i.name).join(" ");
        const dates = r!.instruments.map((i) => i.date).join(" ");
        expect(names).toContain("SC Gen 25");
        expect(dates).toContain("14 May 2026");
        expect(names).not.toContain("May 2024");
      }
    });

    test("A5-CM-3: County Court 2024 guidelines remain as a separate current entry", () => {
      const r = getAiUseReminderForJurisdiction("VIC_COUNTY_MAG");
      expect(r).toBeDefined();
      const names = r!.instruments.map((i) => i.name).join(" ");
      expect(names).toContain("County Court");
      expect(r!.instruments.some((i) => i.date.includes("2024"))).toBe(true);
    });

    test("the full AI-reminder family split matches CRIT-004 / feedback Part B.3", () => {
      const byFamily = (fam: AiReminderFamily) =>
        AI_USE_REMINDERS.filter((r) => r.family === fam)
          .map((r) => r.jurisdiction)
          .sort();
      expect(byFamily("accuracy-verification")).toEqual(
        [...FAMILY_1].sort()
      );
      expect(byFamily("disclosure-restriction")).toEqual(
        [...FAMILY_2_PRESET].sort()
      );
    });
  });
});
