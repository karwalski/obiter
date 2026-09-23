/**
 * STD-013 — the one document config resolver.
 *
 * `buildDocumentConfig` is how every view, the insert service and the
 * refresher build a CitationConfig: the standard's profile, the document's
 * writing mode, and in court mode the stored court toggles plus the
 * jurisdiction preset's authorised report hierarchy. Court mode is an
 * AGLC-only feature (no other standard has court presets), so a non-AGLC
 * document carrying writing mode "court" resolves to its academic config
 * with the `courtModeIgnored` diagnostic set. `resolveDocumentConfig` reads
 * the store the way the refresher always has: document toggles first, the
 * caller's device preference only when the document has none.
 */

import {
  buildCourtConfig,
  buildDocumentConfig,
  getStandardConfig,
  resolveDocumentConfig,
  STANDARD_PROFILES,
} from "../../src/engine/standards";
import type { DocumentStandardSource } from "../../src/engine/standards";
import { COURT_PRESETS } from "../../src/engine/court/presets";

/** The toggle record Settings writes for a preset (`handleJurisdictionChange`). */
function presetToggles(preset: keyof typeof COURT_PRESETS): Record<string, string> {
  const p = COURT_PRESETS[preset];
  return {
    parallelCitations: p.parallelCitations,
    pinpointStyle: p.pinpointStyle,
    unreportedGate: p.unreportedGate,
    ibidSuppression: p.ibidSuppression,
    loaType: p.loaType,
    ...(p.parallelOrder ? { parallelOrder: p.parallelOrder } : {}),
  };
}

function storeOf(state: {
  standardId: "aglc4" | "oscola5" | "nzlsg3";
  writingMode?: "academic" | "court";
  courtJurisdiction?: string;
  courtToggles?: Record<string, string>;
}): DocumentStandardSource {
  return {
    getStandardId: () => state.standardId,
    getWritingMode: () => state.writingMode ?? "academic",
    getCourtJurisdiction: () => state.courtJurisdiction,
    getCourtToggles: () => state.courtToggles,
  };
}

describe("buildDocumentConfig", () => {
  test("AGLC4 academic is the profile config, byte for byte", () => {
    const config = buildDocumentConfig({ standardId: "aglc4", writingMode: "academic" });
    expect(config).toEqual(STANDARD_PROFILES.aglc4.config);
    expect(config).toEqual(getStandardConfig("aglc4"));
    expect(config.courtModeIgnored).toBeUndefined();
    expect(config.authorisedReportHierarchy).toBeUndefined();
  });

  test("academic mode ignores stray court toggles and a jurisdiction", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "academic",
      courtJurisdiction: "HCA",
      courtToggles: presetToggles("HCA"),
    });
    expect(config).toEqual(getStandardConfig("aglc4"));
  });

  test("AGLC4 court under the HCA preset applies the toggles and the report hierarchy", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "HCA",
      courtToggles: presetToggles("HCA"),
    });
    expect(config).toMatchObject({
      standardId: "aglc4",
      writingMode: "court",
      parallelCitationMode: "mandatory",
      pinpointStyle: "para-and-page",
      ibidSuppressionMode: "on",
      unreportedGateMode: "off",
      loaType: "part-ab",
      authorisedReportHierarchy: ["CLR"],
    });
    expect(config.courtModeIgnored).toBeUndefined();
  });

  test("the hierarchy toggle (comma-separated) overrides the preset's", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "NSWCA",
      courtToggles: { ...presetToggles("NSWCA"), authorisedReportHierarchy: "NSWLR, ALR" },
    });
    expect(config.authorisedReportHierarchy).toEqual(["NSWLR", "ALR"]);
  });

  test("a tribunal preset with no authorised reports leaves the hierarchy unset", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "STATE_TRIBUNAL",
      courtToggles: presetToggles("STATE_TRIBUNAL"),
    });
    expect(config.writingMode).toBe("court");
    expect(config.authorisedReportHierarchy).toBeUndefined();
  });

  test("WA carries parallelOrder mnc-first from its toggles", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "WASC",
      courtToggles: presetToggles("WASC"),
    });
    expect(config.parallelOrder).toBe("mnc-first");
    expect(config.authorisedReportHierarchy).toEqual(["WAR", "CLR", "ALR"]);
  });

  test("OSCOLA 5 with court toggles resolves to the academic config with courtModeIgnored", () => {
    const config = buildDocumentConfig({
      standardId: "oscola5",
      writingMode: "court",
      courtJurisdiction: "HCA",
      courtToggles: presetToggles("HCA"),
    });
    expect(config).toEqual({ ...getStandardConfig("oscola5"), courtModeIgnored: true });
    expect(config.writingMode).toBe("academic");
    expect(config.ibidSuppressionMode).toBe(getStandardConfig("oscola5").ibidSuppressionMode);
  });

  test("NZLSG 3 in court mode without toggles is likewise academic", () => {
    const config = buildDocumentConfig({ standardId: "nzlsg3", writingMode: "court" });
    expect(config).toEqual({ ...getStandardConfig("nzlsg3"), courtModeIgnored: true });
  });

  test("buildCourtConfig itself enforces the AGLC-only invariant", () => {
    const base = { ...getStandardConfig("oscola5"), writingMode: "court" as const };
    expect(buildCourtConfig(base, presetToggles("HCA"))).toEqual({
      ...getStandardConfig("oscola5"),
      courtModeIgnored: true,
    });
    // An AGLC court base without toggles is returned as is (preset defaults apply).
    const aglcCourt = { ...getStandardConfig("aglc4"), writingMode: "court" as const };
    expect(buildCourtConfig(aglcCourt)).toBe(aglcCourt);
  });
});

describe("resolveDocumentConfig", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    warn.mockRestore();
  });

  test("reads the document's toggles when the store has them", () => {
    const store = storeOf({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "HCA",
      courtToggles: { ...presetToggles("HCA"), ibidSuppression: "off" },
    });
    const config = resolveDocumentConfig(store, { ...presetToggles("HCA"), ibidSuppression: "on" });
    expect(config.ibidSuppressionMode).toBe("off");
    expect(config.authorisedReportHierarchy).toEqual(["CLR"]);
  });

  test("falls back to the device toggles when the store has none", () => {
    const store = storeOf({
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction: "NSWCA",
    });
    const config = resolveDocumentConfig(store, presetToggles("NSWCA"));
    expect(config).toMatchObject({
      writingMode: "court",
      pinpointStyle: "para-only",
      parallelCitationMode: COURT_PRESETS.NSWCA.parallelCitations,
      loaType: COURT_PRESETS.NSWCA.loaType,
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
    });
  });

  test("academic documents resolve to the profile regardless of the device toggles", () => {
    const store = storeOf({ standardId: "aglc4" });
    expect(resolveDocumentConfig(store, presetToggles("HCA"))).toEqual(getStandardConfig("aglc4"));
    expect(warn).not.toHaveBeenCalled();
  });

  test("a partial store (no writing-mode accessors) resolves as academic", () => {
    const store: DocumentStandardSource = { getStandardId: () => "oscola5" };
    expect(resolveDocumentConfig(store)).toEqual(getStandardConfig("oscola5"));
  });

  test("logs a diagnostic when a non-AGLC document carries writing mode court", () => {
    const store = storeOf({
      standardId: "oscola5",
      writingMode: "court",
      courtToggles: presetToggles("HCA"),
    });
    const config = resolveDocumentConfig(store);
    expect(config.courtModeIgnored).toBe(true);
    expect(config.writingMode).toBe("academic");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("oscola5");
  });
});
