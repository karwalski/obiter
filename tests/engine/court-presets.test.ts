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
  test("COURT_PRESETS contains exactly 22 jurisdictions (COURT-119 added NSWCCA and SA District / Magistrates civil)", () => {
    expect(Object.keys(COURT_PRESETS)).toHaveLength(22);
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
    expect(nsw).toEqual(["NSWCA", "NSWCCA", "NSWSC", "NSW_DISTRICT_LOCAL"]);
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
    expect(other).toEqual(["WASC", "SASC", "SA_DISTRICT_MAG_CIVIL", "TASSC", "ACTSC", "NTSC"]);
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

  test("FCA: mandatory parallel (MNC first), para-and-page, FCR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    // COURT-111: GPN-AUTH cl 2.5 example is MNC first (register FCA-1,
    // O-R2; DECISION-043 item 3); the 7 May 2025 reissue has no Part A / B
    // (O-R1), so a simple list until COURT-117.
    expectPreset("FCA", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["FCR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
    expect(COURT_PRESETS.FCA.parallelOrder).toBe("mnc-first");
  });

  test("FCFCOA: no parallel (report replaces MNC), para-and-page, FLC > ALR, no unreported gate, ibid on, two-part LOA", () => {
    // FCFCOA FAM-APPEALS (updated 10 Jun 2025): appeals LOA is two parts —
    // Part 1 cited in argument, Part 2 possibly referred but not cited.
    // COURT-111: cl 5.8 cites the report; the MNC only for unreported
    // judgments (register FCF-1, O-R6). FamCAFC is an MNC identifier.
    expectPreset("FCFCOA", {
      parallelCitations: "off",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["FLC", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "two-part-read",
    });
    expect(COURT_PRESETS.FCFCOA.reportedCaseMnc).toBe("omit");
  });

  // ── New South Wales ─────────────────────────────────────────────────────

  // CRIT-004 §4 sign-off (2026-07-23): NSWCA/NSWSC parallelCitations softened
  // "mandatory" -> "preferred" to match SC Gen 20's "should, as far as
  // possible" wording. Part A/B LOA re-sourced to SC CA 1 (loaType unchanged).
  test("NSWCA: preferred parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, Part A-B (SC CA 1)", () => {
    expectPreset("NSWCA", {
      parallelCitations: "preferred",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("NSWCCA (COURT-119): preferred parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, single list", () => {
    // SC Gen 20 cl 3–4 (register NSW-1) and SC CCA 1 cl 27–28 (NSW-3).
    expectPreset("NSWCCA", {
      parallelCitations: "preferred",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["NSWLR", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("NSWSC: preferred parallel, para-only, NSWLR > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("NSWSC", {
      parallelCitations: "preferred",
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

  test("VSCA: no parallel (report replaces MNC), para-and-page, VR > CLR > ALR, no unreported gate, ibid on, Part A-B-C", () => {
    // Vic SC PN CA 3 (reissued 10 Mar 2026): Court of Appeal civil LOA is
    // three parts — A read from at hearing, B referred to but not read
    // from, C textbooks/articles/extrinsic materials.
    // COURT-111: SC CA 3 cl 14.4, SC Gen 3 cl 5.2 (register VIC-1, VIC-2, O-R5).
    expect(COURT_PRESETS.VSCA.reportedCaseMnc).toBe("omit");
    expectPreset("VSCA", {
      parallelCitations: "off",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["VR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "part-abc",
    });
  });

  test("VSC: no parallel (report replaces MNC), para-and-page, VR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    // COURT-111: SC Gen 3 cl 5.2 (register VIC-1, O-R5).
    expect(COURT_PRESETS.VSC.reportedCaseMnc).toBe("omit");
    expectPreset("VSC", {
      parallelCitations: "off",
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

  // CRIT-004 §4 sign-off (2026-07-23): QCA/QSC parallelCitations softened
  // "mandatory" -> "preferred" to match PD 1 of 2024's "should, as far as
  // possible" wording.
  test("QCA: preferred parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, Part A-B", () => {
    expectPreset("QCA", {
      parallelCitations: "preferred",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "part-ab",
    });
  });

  test("QSC: preferred parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    expectPreset("QSC", {
      parallelCitations: "preferred",
      pinpointStyle: "para-only",
      authorisedReportHierarchy: ["Qd R", "CLR", "ALR"],
      unreportedGate: "warn",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("Qld District/Mag: preferred parallel, para-only, Qd R > CLR > ALR, warn unreported, ibid on, simple LOA", () => {
    // COURT-111: Magistrates Courts PD 7 of 2024 cl 3 "should, as far as
    // possible" (register QLD-3, O-R11).
    expectPreset("QLD_DISTRICT_MAG", {
      parallelCitations: "preferred",
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

  test("SASC: mandatory parallel, para-and-page, SASR > CLR > ALR, no unreported gate, ibid on, two-part LOA", () => {
    // SA Uniform Civil Rules 2020 r 217.8 (current to 15 Mar 2026):
    // appeals LOA is two parts — expected to be read / not expected
    // to be read (Form 91). COURT-111: r 217.8(3), r 101.8(4) — report and
    // MNC "must" both be given (register SA-1, O-R7).
    expectPreset("SASC", {
      parallelCitations: "mandatory",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["SASR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "two-part-read",
    });
  });

  test("SA District/Mag civil (COURT-119): the Uniform Civil Rules apply, so the SASC values", () => {
    // Register SA-1, O-R7.
    expectPreset("SA_DISTRICT_MAG_CIVIL", {
      parallelCitations: "mandatory",
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

  test("ACTSC: no parallel (report only), para-and-page, ACTLR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    // COURT-111: PD 2 of 2022 cl 3–4, silent on the MNC (register ACT-1, O-R10).
    expect(COURT_PRESETS.ACTSC.reportedCaseMnc).toBe("omit");
    expectPreset("ACTSC", {
      parallelCitations: "off",
      pinpointStyle: "para-and-page",
      authorisedReportHierarchy: ["ACTLR", "CLR", "ALR"],
      unreportedGate: "off",
      ibidSuppression: "on",
      loaType: "simple",
    });
  });

  test("NTSC: no parallel (report only), para-and-page, NTLR > CLR > ALR, no unreported gate, ibid on, simple LOA", () => {
    // COURT-111: PD 2 of 2007 "is to be cited", no MNC (register NT-1, O-R10).
    expect(COURT_PRESETS.NTSC.reportedCaseMnc).toBe("omit");
    expectPreset("NTSC", {
      parallelCitations: "off",
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
      "NSWCA", "NSWCCA", "NSWSC", "NSW_DISTRICT_LOCAL",
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

  test("Part A-B LOA is used by HCA, NSWCA, and QCA only", () => {
    // VSCA moved to "part-abc" per Vic SC PN CA 3 (reissued 10 Mar 2026).
    // COURT-111: FCA left Part A-B (GPN-AUTH 7 May 2025; register O-R1).
    const partAbJurisdictions = new Set<CourtJurisdiction>(["HCA", "NSWCA", "QCA"]);
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

  test("COURT-111: the report replaces the MNC exactly where an instrument says so", () => {
    // VIC-1 cl 5.2, VIC-2 cl 14.4, FCF-1 cl 5.8, ACT-1 cl 3–4, NT-1 (O-R5,
    // O-R6, O-R10). Every other preset keeps the MNC (absent = include).
    const omit = Object.entries(COURT_PRESETS)
      .filter(([, p]) => p.reportedCaseMnc === "omit")
      .map(([id]) => id)
      .sort();
    expect(omit).toEqual(["ACTSC", "FCFCOA", "NTSC", "VSC", "VSCA"]);
    for (const id of omit) {
      expect(COURT_PRESETS[id as CourtJurisdiction].parallelCitations).toBe("off");
    }
  });

  test("parallelOrder: mnc-first where the court's instrument shows it (DECISION-043 item 3)", () => {
    // WA CPD PD 8.2.2 cl 4 (WA-1), FCA GPN-AUTH cl 2.5 (FCA-1), Tas PD 3 of
    // 2014 cl 3(a) (TAS-1).
    const mncFirst = new Set(["WASC", "FCA", "TASSC"]);
    for (const [id, preset] of Object.entries(COURT_PRESETS)) {
      if (mncFirst.has(id)) {
        expect(preset.parallelOrder).toBe("mnc-first");
      } else {
        // Omitted parallelOrder means report-first (authorised report,
        // then MNC).
        expect(preset.parallelOrder).toBeUndefined();
      }
    }
  });
});
