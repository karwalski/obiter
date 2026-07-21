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
    expect(other).toEqual(["WASC", "SASC", "TASSC", "ACTSC", "NTSC"]);
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

  test("FCFCOA: mandatory parallel, para-and-page, FamCAFC > FLC > ALR, no unreported gate, ibid on, two-part LOA", () => {
    // FCFCOA FAM-APPEALS (updated 10 Jun 2025): appeals LOA is two parts —
    // Part 1 cited in argument, Part 2 possibly referred but not cited.
    expectPreset("FCFCOA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["FamCAFC", "FLC", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "two-part-read",
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

  test("VSCA: mandatory parallel, para-and-page, VR > CLR > ALR, no unreported gate, ibid on, Part A-B-C", () => {
    // Vic SC PN CA 3 (reissued 10 Mar 2026): Court of Appeal civil LOA is
    // three parts — A read from at hearing, B referred to but not read
    // from, C textbooks/articles/extrinsic materials.
    expectPreset("VSCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["VR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "part-abc",
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

  test("WASC: mandatory parallel (MNC first), para-and-page, WAR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    // WA SC Consolidated Practice Directions (updated 20 Jun 2025)
    // PD 8.2.2: parallel citation required when reported, MNC first.
    expectPreset("WASC", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["WAR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
    expect(COURT_PRESETS.WASC.parallelOrder).toBe("mnc-first");
  });

  test("SASC: preferred parallel, para-and-page, SASR > CLR > ALR, no unreported gate, ibid on, two-part LOA", () => {
    // SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026):
    // appeals LOA is two parts — expected to be read / not expected
    // to be read (Form 91).
    expectPreset("SASC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "two-part-read",
    });
  });

  test("TASSC: preferred parallel, para-and-page, Tas R > CLR > ALR, warn unreported, ibid on, Tas three-part LOA", () => {
    // Tas SC PD 3 of 2022: LOA is three parts — Part 1 authorities
    // counsel intends to cite, Part 2 might be referred to but not
    // cited, Part 3 legislation with sections.
    expectPreset("TASSC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["Tas R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "three-part-tas",
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
      "TASSC",
    ]);
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (warnJurisdictions.has(id as CourtJurisdiction)) {
        expect(preset.unreportedGate).toBe("warn");
      } else {
        expect(preset.unreportedGate).toBe("off");
      }
    }
  });

  test("Part A-B LOA is used by HCA, FCA, NSWCA, and QCA only", () => {
    // VSCA moved to "part-abc" per Vic SC PN CA 3 (reissued 10 Mar 2026).
    const partAbJurisdictions = new Set<CourtJurisdiction>(["HCA", "FCA", "NSWCA", "QCA"]);
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (partAbJurisdictions.has(id as CourtJurisdiction)) {
        expect(preset.loaType).toBe("part-ab");
      } else {
        expect(preset.loaType).not.toBe("part-ab");
      }
    }
  });

  test("2026-07-21 PD refresh: LOA variants per jurisdiction", () => {
    // Vic SC PN CA 3 (10 Mar 2026)
    expect(COURT_PRESETS.VSCA.loaType).toBe("part-abc");
    // SA UCR 2020 r 217.8 (Form 91) and FCFCOA FAM-APPEALS (10 Jun 2025)
    expect(COURT_PRESETS.SASC.loaType).toBe("two-part-read");
    expect(COURT_PRESETS.FCFCOA.loaType).toBe("two-part-read");
    // Tas SC PD 3 of 2022
    expect(COURT_PRESETS.TASSC.loaType).toBe("three-part-tas");
  });

  test("parallelOrder: only WASC uses mnc-first (WA Consolidated PD 8.2.2, 20 Jun 2025)", () => {
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (id === "WASC") {
        expect(preset.parallelOrder).toBe("mnc-first");
      } else {
        // Omitted parallelOrder means report-first (authorised report,
        // then MNC).
        expect(preset.parallelOrder).toBeUndefined();
      }
    }
  });
});
