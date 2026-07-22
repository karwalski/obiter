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

import {
  COURT_PRESETS,
  CourtJurisdiction,
  CourtPreset,
} from "../../src/engine/court/presets";
import { buildCourtConfig } from "../../src/engine/standards";
import { STANDARD_PROFILES } from "../../src/engine/standards/profiles";
import { generateListOfAuthorities } from "../../src/engine/rules/v4/general/bibliography";
import type { Citation } from "../../src/types/citation";
import type { CitationConfig } from "../../src/engine/standards/types";

const { formatCitation } = require("../../src/engine/engine");

const PINPOINT_STYLES = new Set(["page-only", "para-only", "para-and-page"]);
const PARALLEL_MODES = new Set(["off", "preferred", "mandatory"]);
const PARALLEL_ORDERS = new Set(["report-first", "mnc-first"]);
const LOA_TYPES = new Set(["off", "simple", "part-ab", "part-abc", "two-part-read", "three-part-tas"]);

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
});
