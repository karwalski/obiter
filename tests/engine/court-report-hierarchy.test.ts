/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-006: Authorised-Report Hierarchy Engine Tests
 *
 * Validates jurisdiction-aware report series preference ordering per
 * AGLC4 Rule 2.2.2 and court practice directions.
 */

import {
  REPORT_HIERARCHY,
  getPreferredReportOrder,
  suggestPreferredReport,
} from "../../src/engine/court/reportHierarchy";
import type { ReportJurisdiction } from "../../src/engine/court/reportHierarchy";
import { getReportSeriesPreference } from "../../src/engine/rules/v4/domestic/cases";

// ─── Hierarchy Data Tests ────────────────────────────────────────────────────

describe("COURT-006: Report Hierarchy Data", () => {
  test("HCA hierarchy: CLR > ALJR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.HCA).toEqual(["CLR", "ALJR", "ALR", "MNC"]);
  });

  test("FCA hierarchy: FCR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.FCA).toEqual(["FCR", "ALR", "MNC"]);
  });

  test("FCFCOA hierarchy: FamCAFC > FLC > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.FCFCOA).toEqual(["FamCAFC", "FLC", "ALR", "MNC"]);
  });

  test("NSW hierarchy: NSWLR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.NSW).toEqual(["NSWLR", "ALR", "MNC"]);
  });

  test("VIC hierarchy: VR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.VIC).toEqual(["VR", "ALR", "MNC"]);
  });

  test("QLD hierarchy: Qd R > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.QLD).toEqual(["Qd R", "ALR", "MNC"]);
  });

  test("WA hierarchy: WAR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.WA).toEqual(["WAR", "ALR", "MNC"]);
  });

  test("SA hierarchy: SASR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.SA).toEqual(["SASR", "ALR", "MNC"]);
  });

  test("TAS hierarchy: Tas R > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.TAS).toEqual(["Tas R", "ALR", "MNC"]);
  });

  test("ACT hierarchy: ACTLR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.ACT).toEqual(["ACTLR", "ALR", "MNC"]);
  });

  test("NT hierarchy: NTR > ALR > MNC", () => {
    expect(REPORT_HIERARCHY.NT).toEqual(["NTR", "ALR", "MNC"]);
  });

  test("every hierarchy ends with MNC", () => {
    for (const [jurisdiction, hierarchy] of Object.entries(REPORT_HIERARCHY)) {
      expect(hierarchy[hierarchy.length - 1]).toBe("MNC");
    }
  });

  test("every hierarchy has at least 3 entries (state report, ALR, MNC)", () => {
    for (const [jurisdiction, hierarchy] of Object.entries(REPORT_HIERARCHY)) {
      expect(hierarchy.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ─── getPreferredReportOrder Tests ───────────────────────────────────────────

describe("COURT-006: getPreferredReportOrder", () => {
  test("returns hierarchy for a direct jurisdiction key", () => {
    expect(getPreferredReportOrder("HCA")).toEqual(["CLR", "ALJR", "ALR", "MNC"]);
  });

  test("resolves court identifier to parent jurisdiction (NSWSC -> NSW)", () => {
    expect(getPreferredReportOrder("NSWSC")).toEqual(["NSWLR", "ALR", "MNC"]);
  });

  test("resolves court identifier to parent jurisdiction (NSWCA -> NSW)", () => {
    expect(getPreferredReportOrder("NSWCA")).toEqual(["NSWLR", "ALR", "MNC"]);
  });

  test("resolves VSCA to VIC hierarchy", () => {
    expect(getPreferredReportOrder("VSCA")).toEqual(["VR", "ALR", "MNC"]);
  });

  test("resolves VSC to VIC hierarchy", () => {
    expect(getPreferredReportOrder("VSC")).toEqual(["VR", "ALR", "MNC"]);
  });

  test("resolves QCA to QLD hierarchy", () => {
    expect(getPreferredReportOrder("QCA")).toEqual(["Qd R", "ALR", "MNC"]);
  });

  test("resolves QSC to QLD hierarchy", () => {
    expect(getPreferredReportOrder("QSC")).toEqual(["Qd R", "ALR", "MNC"]);
  });

  test("resolves WASC to WA hierarchy", () => {
    expect(getPreferredReportOrder("WASC")).toEqual(["WAR", "ALR", "MNC"]);
  });

  test("resolves SASC to SA hierarchy", () => {
    expect(getPreferredReportOrder("SASC")).toEqual(["SASR", "ALR", "MNC"]);
  });

  test("resolves TASCSC to TAS hierarchy", () => {
    expect(getPreferredReportOrder("TASCSC")).toEqual(["Tas R", "ALR", "MNC"]);
  });

  test("resolves ACTSC to ACT hierarchy", () => {
    expect(getPreferredReportOrder("ACTSC")).toEqual(["ACTLR", "ALR", "MNC"]);
  });

  test("resolves NTSC to NT hierarchy", () => {
    expect(getPreferredReportOrder("NTSC")).toEqual(["NTR", "ALR", "MNC"]);
  });

  test("resolves FCAFC to FCA hierarchy", () => {
    expect(getPreferredReportOrder("FCAFC")).toEqual(["FCR", "ALR", "MNC"]);
  });

  test("returns empty array for unknown jurisdiction", () => {
    expect(getPreferredReportOrder("UNKNOWN")).toEqual([]);
  });

  test("returns empty array for empty string", () => {
    expect(getPreferredReportOrder("")).toEqual([]);
  });
});

// ─── suggestPreferredReport Tests ────────────────────────────────────────────

describe("COURT-006: suggestPreferredReport", () => {
  test("HCA: suggests CLR over ALJR and ALR", () => {
    expect(suggestPreferredReport("HCA", ["ALR", "CLR", "ALJR"])).toBe("CLR");
  });

  test("HCA: suggests ALJR over ALR when CLR unavailable", () => {
    expect(suggestPreferredReport("HCA", ["ALR", "ALJR"])).toBe("ALJR");
  });

  test("HCA: suggests ALR over MNC", () => {
    expect(suggestPreferredReport("HCA", ["MNC", "ALR"])).toBe("ALR");
  });

  test("FCA: suggests FCR over ALR", () => {
    expect(suggestPreferredReport("FCA", ["ALR", "FCR"])).toBe("FCR");
  });

  test("FCA: suggests ALR over MNC", () => {
    expect(suggestPreferredReport("FCA", ["MNC", "ALR"])).toBe("ALR");
  });

  test("NSW: suggests NSWLR over ALR", () => {
    expect(suggestPreferredReport("NSW", ["ALR", "NSWLR"])).toBe("NSWLR");
  });

  test("VIC: suggests VR over ALR", () => {
    expect(suggestPreferredReport("VIC", ["ALR", "VR"])).toBe("VR");
  });

  test("QLD: suggests Qd R over ALR", () => {
    expect(suggestPreferredReport("QLD", ["ALR", "Qd R"])).toBe("Qd R");
  });

  test("WA: suggests WAR over ALR", () => {
    expect(suggestPreferredReport("WA", ["ALR", "WAR"])).toBe("WAR");
  });

  test("SA: suggests SASR over ALR", () => {
    expect(suggestPreferredReport("SA", ["ALR", "SASR"])).toBe("SASR");
  });

  test("TAS: suggests Tas R over ALR", () => {
    expect(suggestPreferredReport("TAS", ["ALR", "Tas R"])).toBe("Tas R");
  });

  test("ACT: suggests ACTLR over ALR", () => {
    expect(suggestPreferredReport("ACT", ["ALR", "ACTLR"])).toBe("ACTLR");
  });

  test("NT: suggests NTR over ALR", () => {
    expect(suggestPreferredReport("NT", ["ALR", "NTR"])).toBe("NTR");
  });

  test("returns undefined for empty available series", () => {
    expect(suggestPreferredReport("HCA", [])).toBeUndefined();
  });

  test("returns single available series when only one provided", () => {
    expect(suggestPreferredReport("HCA", ["MNC"])).toBe("MNC");
  });

  test("unknown series ranked below named series but above MNC", () => {
    // "IPR" is a subject-specific series not in the HCA hierarchy.
    // It should be preferred over MNC but not over CLR.
    expect(suggestPreferredReport("HCA", ["MNC", "IPR"])).toBe("IPR");
    expect(suggestPreferredReport("HCA", ["CLR", "IPR"])).toBe("CLR");
  });
});

// ─── Cross-Jurisdictional Citation Tests ─────────────────────────────────────

describe("COURT-006: Cross-jurisdictional citations", () => {
  test("citing a Vic case in a Federal Court submission uses VIC hierarchy", () => {
    // The cited case's home jurisdiction (VIC) determines ordering,
    // not the filing court (FCA).
    const vicOrder = getPreferredReportOrder("VSC");
    expect(vicOrder[0]).toBe("VR");
    expect(suggestPreferredReport("VSC", ["ALR", "VR"])).toBe("VR");
  });

  test("citing an HCA case in a NSW submission uses HCA hierarchy", () => {
    const hcaOrder = getPreferredReportOrder("HCA");
    expect(hcaOrder[0]).toBe("CLR");
    expect(suggestPreferredReport("HCA", ["ALR", "CLR", "ALJR"])).toBe("CLR");
  });

  test("citing a Qld case in a Federal Court submission uses QLD hierarchy", () => {
    expect(suggestPreferredReport("QSC", ["ALR", "Qd R"])).toBe("Qd R");
  });

  test("citing an NSW case in a Victorian submission uses NSW hierarchy", () => {
    expect(suggestPreferredReport("NSWSC", ["ALR", "NSWLR"])).toBe("NSWLR");
  });

  test("citing a SA case in a WA submission uses SA hierarchy", () => {
    expect(suggestPreferredReport("SASC", ["ALR", "SASR"])).toBe("SASR");
  });
});

// ─── AGLC4 Default Ordering Fallback Tests ───────────────────────────────────

describe("COURT-006: Unknown jurisdiction falls back to AGLC4 default ordering", () => {
  test("unknown jurisdiction: authorised report preferred over generalist unauthorised", () => {
    expect(suggestPreferredReport("UNKNOWN", ["ALR", "CLR"])).toBe("CLR");
  });

  test("unknown jurisdiction: generalist unauthorised preferred over subject-specific", () => {
    expect(suggestPreferredReport("UNKNOWN", ["IPR", "ALR"])).toBe("ALR");
  });

  test("unknown jurisdiction: subject-specific preferred over MNC", () => {
    expect(suggestPreferredReport("UNKNOWN", ["MNC", "IPR"])).toBe("IPR");
  });

  test("unknown jurisdiction: authorised report preferred over MNC", () => {
    expect(suggestPreferredReport("UNKNOWN", ["MNC", "FCR"])).toBe("FCR");
  });
});

// ─── getReportSeriesPreference with jurisdiction Tests ───────────────────────

describe("COURT-006: getReportSeriesPreference with jurisdiction parameter", () => {
  test("without jurisdiction: returns AGLC4 tier (CLR = 1, ALR = 2, MNC = 4)", () => {
    expect(getReportSeriesPreference("CLR")).toBe(1);
    expect(getReportSeriesPreference("ALR")).toBe(2);
    expect(getReportSeriesPreference("MNC")).toBe(4);
  });

  test("with HCA jurisdiction: CLR has rank 0 (most preferred)", () => {
    expect(getReportSeriesPreference("CLR", "HCA")).toBe(0);
  });

  test("with HCA jurisdiction: ALJR has rank 1", () => {
    expect(getReportSeriesPreference("ALJR", "HCA")).toBe(1);
  });

  test("with HCA jurisdiction: ALR has rank 2", () => {
    expect(getReportSeriesPreference("ALR", "HCA")).toBe(2);
  });

  test("with HCA jurisdiction: MNC has rank 3 (last)", () => {
    expect(getReportSeriesPreference("MNC", "HCA")).toBe(3);
  });

  test("with FCA jurisdiction: FCR = 0, ALR = 1, MNC = 2", () => {
    expect(getReportSeriesPreference("FCR", "FCA")).toBe(0);
    expect(getReportSeriesPreference("ALR", "FCA")).toBe(1);
    expect(getReportSeriesPreference("MNC", "FCA")).toBe(2);
  });

  test("with NSW jurisdiction via court identifier NSWSC", () => {
    expect(getReportSeriesPreference("NSWLR", "NSWSC")).toBe(0);
    expect(getReportSeriesPreference("ALR", "NSWSC")).toBe(1);
    expect(getReportSeriesPreference("MNC", "NSWSC")).toBe(2);
  });

  test("unknown series gets rank between last named series and MNC", () => {
    // HCA hierarchy: CLR(0), ALJR(1), ALR(2), MNC(3)
    // Unknown series should be 2.5 (between ALR and MNC)
    const rank = getReportSeriesPreference("IPR", "HCA");
    expect(rank).toBeGreaterThan(2); // after ALR
    expect(rank).toBeLessThan(3);    // before MNC
  });

  test("unknown jurisdiction falls back to AGLC4 defaults", () => {
    expect(getReportSeriesPreference("CLR", "UNKNOWN")).toBe(1);
    expect(getReportSeriesPreference("ALR", "UNKNOWN")).toBe(2);
    expect(getReportSeriesPreference("MNC", "UNKNOWN")).toBe(4);
  });
});
