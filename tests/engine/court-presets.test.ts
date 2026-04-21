/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-002 / COURT-003: Jurisdictional preset mappings.
 *
 * Verifies that every court jurisdiction maps to the correct toggle defaults
 * as defined in the court submission mode backlog table.
 */

import {
  COURT_PRESETS,
  COURT_GROUPS,
  getCourtPreset,
  getJurisdictionsByGroup,
  isCourtJurisdiction,
  type CourtJurisdiction,
  type CourtPreset,
} from "../../src/engine/court/presets";

// ─── Helper ─────────────────────────────────────────────────────────────────

function expectPreset(
  id: CourtJurisdiction,
  expected: {
    parallelCitations: CourtPreset["parallelCitations"];
    pinpointStyle: CourtPreset["pinpointStyle"];
    authorisedReportHierarchy: string[];
    unreportedGate: CourtPreset["unreportedGate"];
    ibidSuppression: CourtPreset["ibidSuppression"];
    loaType: CourtPreset["loaType"];
  },
): void {
  const preset = COURT_PRESETS[id];
  expect(preset).toBeDefined();
  expect(preset.parallelCitations).toBe(expected.parallelCitations);
  expect(preset.pinpointStyle).toBe(expected.pinpointStyle);
  expect(preset.authorisedReportHierarchy).toEqual(expected.authorisedReportHierarchy);
  expect(preset.unreportedGate).toBe(expected.unreportedGate);
  expect(preset.ibidSuppression).toBe(expected.ibidSuppression);
  expect(preset.loaType).toBe(expected.loaType);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("COURT-002: Jurisdictional preset structure", () => {
  test("COURT_PRESETS contains exactly 20 jurisdictions", () => {
    expect(Object.keys(COURT_PRESETS)).toHaveLength(20);
  });

  test("every jurisdiction has a non-empty label and a valid group", () => {
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(COURT_GROUPS).toContain(preset.group);
    }
  });

  test("COURT_GROUPS lists all six groups in correct order", () => {
    expect(COURT_GROUPS).toEqual([
      "Federal",
      "New South Wales",
      "Victoria",
      "Queensland",
      "Other States/Territories",
      "Tribunals",
    ]);
  });

  test("getJurisdictionsByGroup returns correct Federal courts", () => {
    const federal = getJurisdictionsByGroup("Federal");
    expect(federal).toEqual(["HCA", "FCA", "FCFCOA"]);
  });

  test("getJurisdictionsByGroup returns correct NSW courts", () => {
    const nsw = getJurisdictionsByGroup("New South Wales");
    expect(nsw).toEqual(["NSWCA", "NSWSC", "NSW_DISTRICT_LOCAL"]);
  });

  test("getJurisdictionsByGroup returns correct Vic courts", () => {
    const vic = getJurisdictionsByGroup("Victoria");
    expect(vic).toEqual(["VSCA", "VSC", "VIC_COUNTY_MAG"]);
  });

  test("getJurisdictionsByGroup returns correct Qld courts", () => {
    const qld = getJurisdictionsByGroup("Queensland");
    expect(qld).toEqual(["QCA", "QSC", "QLD_DISTRICT_MAG"]);
  });

  test("getJurisdictionsByGroup returns correct Other States/Territories", () => {
    const other = getJurisdictionsByGroup("Other States/Territories");
    expect(other).toEqual(["WASC", "SASC", "TASCSC", "ACTSC", "NTSC"]);
  });

  test("getJurisdictionsByGroup returns correct Tribunals", () => {
    const tribunals = getJurisdictionsByGroup("Tribunals");
    expect(tribunals).toEqual(["ART", "FWC", "STATE_TRIBUNAL"]);
  });

  test("every jurisdiction is covered by exactly one group", () => {
    const allFromGroups = COURT_GROUPS.flatMap((g) => getJurisdictionsByGroup(g));
    const allKeys = Object.keys(COURT_PRESETS);
    expect(allFromGroups.sort()).toEqual(allKeys.sort());
  });
});

describe("COURT-002: getCourtPreset helper", () => {
  test("returns preset for valid jurisdiction ID", () => {
    const preset = getCourtPreset("HCA");
    expect(preset).toBeDefined();
    expect(preset!.label).toBe("High Court of Australia");
  });

  test("returns undefined for invalid jurisdiction ID", () => {
    expect(getCourtPreset("INVALID")).toBeUndefined();
    expect(getCourtPreset("")).toBeUndefined();
  });
});

describe("COURT-002: isCourtJurisdiction type guard", () => {
  test("returns true for all valid jurisdiction IDs", () => {
    for (const id of Object.keys(COURT_PRESETS)) {
      expect(isCourtJurisdiction(id)).toBe(true);
    }
  });

  test("returns false for invalid strings", () => {
    expect(isCourtJurisdiction("INVALID")).toBe(false);
    expect(isCourtJurisdiction("")).toBe(false);
    expect(isCourtJurisdiction("hca")).toBe(false);
  });
});

describe("COURT-003: Jurisdictional default mappings", () => {
  // ── Federal ─────────────────────────────────────────────────────────────

  test("HCA: mandatory parallel, para-and-page, CLR first, no unreported gate, ibid on, Part A-B (JBA)", () => {
    expectPreset("HCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["CLR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("FCA: mandatory parallel, para-and-page, FCR > CLR > ALR, no unreported gate, ibid on, Part A-B", () => {
    expectPreset("FCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["FCR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("FCFCOA: mandatory parallel, para-and-page, FamCAFC > FLC > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("FCFCOA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["FamCAFC", "FLC", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  // ── New South Wales ─────────────────────────────────────────────────────

  test("NSWCA: mandatory parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, Part A-B", () => {
    expectPreset("NSWCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("NSWSC: mandatory parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("NSWSC", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("NSW District/Local: preferred parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, no LOA", () => {
    expectPreset("NSW_DISTRICT_LOCAL", {
      parallelCitations: "preferred",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "off",
    });
  });

  // ── Victoria ────────────────────────────────────────────────────────────

  test("VSCA: mandatory parallel, para-and-page, VR > CLR > ALR, no unreported gate, ibid on, Part A-B", () => {
    expectPreset("VSCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["VR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("VSC: mandatory parallel, para-and-page, VR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("VSC", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["VR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("Vic County/Mag: preferred parallel, para-and-page, VR > CLR > ALR, no unreported gate, ibid on, no LOA", () => {
    expectPreset("VIC_COUNTY_MAG", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["VR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "off",
    });
  });

  // ── Queensland ──────────────────────────────────────────────────────────

  test("QCA: mandatory parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, Part A-B", () => {
    expectPreset("QCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("QSC: mandatory parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("QSC", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("Qld District/Mag: mandatory parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("QLD_DISTRICT_MAG", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  // ── Other States/Territories ────────────────────────────────────────────

  test("WASC: preferred parallel, para-and-page, WAR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("WASC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["WAR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("SASC: preferred parallel, para-and-page, SASR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("SASC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("TASCSC: preferred parallel, para-and-page, Tas R > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("TASCSC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["Tas R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("ACTSC: preferred parallel, para-and-page, ACTLR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("ACTSC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["ACTLR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("NTSC: preferred parallel, para-and-page, NTLR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    expectPreset("NTSC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["NTLR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  // ── Tribunals ───────────────────────────────────────────────────────────

  test("ART: off parallel, para-only, MNC only, no unreported gate, ibid on, no LOA", () => {
    expectPreset("ART", {
      parallelCitations: "off",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: [],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "off",
    });
  });

  test("FWC: off parallel, para-only, MNC only, no unreported gate, ibid on, no LOA", () => {
    expectPreset("FWC", {
      parallelCitations: "off",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: [],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "off",
    });
  });

  test("State Tribunal: off parallel, para-only, MNC only, no unreported gate, ibid on, no LOA", () => {
    expectPreset("STATE_TRIBUNAL", {
      parallelCitations: "off",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: [],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "off",
    });
  });
});

describe("COURT-003: Cross-cutting toggle invariants", () => {
  test("all court mode presets have ibid suppression on", () => {
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      expect(preset.ibidSuppression).toBe("on");
    }
  });

  test("tribunals all have parallel citations off and LOA off", () => {
    const tribunals: CourtJurisdiction[] = ["ART", "FWC", "STATE_TRIBUNAL"];
    for (const id of tribunals) {
      expect(COURT_PRESETS[id].parallelCitations).toBe("off");
      expect(COURT_PRESETS[id].loaType).toBe("off");
    }
  });

  test("unreported gate warn is active for NSW, Qld, and Tas courts only", () => {
    const warnJurisdictions = new Set<CourtJurisdiction>([
      "NSWCA", "NSWSC", "NSW_DISTRICT_LOCAL",
      "QCA", "QSC", "QLD_DISTRICT_MAG",
      "TASCSC",
    ]);
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (warnJurisdictions.has(id as CourtJurisdiction)) {
        expect(preset.unreportedGate).toBe("warn");
      } else {
        expect(preset.unreportedGate).toBe("off");
      }
    }
  });

  test("Part A-B LOA is used by HCA, FCA, NSWCA, VSCA, and QCA only", () => {
    const partAbJurisdictions = new Set<CourtJurisdiction>(["HCA", "FCA", "NSWCA", "VSCA", "QCA"]);
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (partAbJurisdictions.has(id as CourtJurisdiction)) {
        expect(preset.loaType).toBe("part-ab");
      } else {
        expect(preset.loaType).not.toBe("part-ab");
      }
    }
  });
});
