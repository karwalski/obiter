/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-106 and COURT-115: court profile freezing, provenance and the
 * per-document "Update court profile" prompt (DECISION-043 item 4).
 *
 * Provenance assertions cite the court-interop evidence register
 * (docs/research/court-interop/EVIDENCE-REGISTER.md, 6 Oct 2026): FCA GPN-AUTH
 * cl 2.6 (FCA-1, O-R2), Tas SC PD 3 of 2014 cl 3 (TAS-1, O-R8), WA SC CPD
 * PD 8.2.2 cl 4 (WA-1, O-R9), Vic SC Gen 3 cl 5.2 (VIC-1, O-R5), and the
 * absence of any ibid rule (O-R14; DECISION-043 item 2).
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { COURT_PRESETS, type CourtJurisdiction } from "../../src/engine/court/presets";
import {
  COURT_PRESET_PROVENANCE,
  PROFILE_SOURCES,
  experimentalLabel,
  getPresetVersion,
} from "../../src/engine/court/provenance";
import {
  COURT_TOGGLE_KEYS,
  LEGACY_PRESET_VERSION,
  applyProfileUpdate,
  createCourtProfile,
  createMigratedProfile,
  declineProfileUpdate,
  diffCourtProfile,
  freezeEffectiveToggles,
  getPresetToggles,
  isProfileUpdateAvailable,
  recordOverride,
} from "../../src/engine/court/profile";
import { buildDocumentConfig, getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { Citation } from "../../src/types/citation";

const JURISDICTIONS = Object.keys(COURT_PRESETS) as CourtJurisdiction[];
const NOW = new Date("2026-10-06T00:00:00Z");

const text = (runs: Array<{ text: string }>): string => runs.map((r) => r.text).join("");

function citation(
  sourceType: string,
  data: Record<string, unknown>,
  shortTitle?: string
): Citation {
  return {
    id: `c-${sourceType}`,
    aglcVersion: "4",
    sourceType: sourceType as Citation["sourceType"],
    data,
    shortTitle,
    tags: [],
    createdAt: "2026-10-06T00:00:00Z",
    modifiedAt: "2026-10-06T00:00:00Z",
  } as Citation;
}

/** A reported case with an MNC (parallel), an MNC-only case, and a report-only case. */
const SAMPLES: Citation[] = [
  citation(
    "case.reported",
    {
      party1: "Lee",
      party2: "The Queen",
      yearType: "round",
      year: 1999,
      volume: 18,
      reportSeries: "WAR",
      startingPage: 23,
      pinpoint: "34 [15]",
      mnc: "[1999] WASCA 14",
    },
    "Lee"
  ),
  citation(
    "case.unreported.mnc",
    {
      party1: "Smith",
      party2: "Brown",
      year: 1997,
      court: "TASSC",
      caseNumber: 161,
      pinpoint: "[15]",
    },
    "Smith"
  ),
  citation(
    "case.reported",
    {
      party1: "Pape",
      party2: "Commissioner of Taxation",
      yearType: "round",
      year: 2009,
      volume: 238,
      reportSeries: "CLR",
      startingPage: 1,
      pinpoint: "45",
    },
    "Pape"
  ),
];

function context(first: boolean, sameAsPreceding: boolean): CitationContext {
  return {
    footnoteNumber: first ? 1 : 3,
    isFirstCitation: first,
    isSameAsPreceding: sameAsPreceding,
    precedingFootnoteCitationCount: first ? 0 : 1,
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
}

/** Every rendering of the samples a config produces (first, ibid, subsequent). */
function renderAll(config: CitationConfig): string[] {
  const out: string[] = [];
  for (const c of SAMPLES) {
    out.push(text(formatCitation(c, context(true, false), config)));
    out.push(text(formatCitation(c, context(false, true), config)));
    out.push(text(formatCitation(c, context(false, false), config)));
  }
  return out;
}

/** The config a pre-v3 document renders with (refresher: document toggles, else legacy device pref). */
function configBefore(
  jurisdiction: string,
  stored: Record<string, string> | undefined,
  legacy?: Record<string, string>
): CitationConfig {
  return buildDocumentConfig({
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: jurisdiction,
    courtToggles: stored ?? legacy,
  });
}

function configAfter(jurisdiction: string, frozen: Record<string, string>): CitationConfig {
  return buildDocumentConfig({
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: jurisdiction,
    courtToggles: frozen,
  });
}

/** Configs compare equal once an absent order reads as report-first (engine default). */
function normalise(config: CitationConfig): CitationConfig {
  return { ...config, parallelOrder: config.parallelOrder ?? "report-first" };
}

// ─── Freezing (COURT-106 migration: no output change on upgrade) ────────────

describe("COURT-106: freezing a pre-v3 court document changes nothing it renders", () => {
  const base = getStandardConfig("aglc4");

  const scenarios: Array<[string, (id: CourtJurisdiction) => Record<string, string> | undefined]> =
    [
      ["no stored toggles", () => undefined],
      [
        "toggles written by Settings before COURT-106 (no order, connector or hierarchy)",
        (id) => {
          const p = COURT_PRESETS[id];
          return {
            parallelCitations: p.parallelCitations,
            pinpointStyle: p.pinpointStyle,
            unreportedGate: p.unreportedGate,
            ibidSuppression: p.ibidSuppression,
            loaType: p.loaType,
            ...(p.parallelOrder ? { parallelOrder: p.parallelOrder } : {}),
          };
        },
      ],
      ["a partial user override", () => ({ ibidSuppression: "off", pinpointStyle: "para-only" })],
      ["a full current preset record", (id) => getPresetToggles(id)],
    ];

  test.each(scenarios)("every preset, %s", (_label, storedFor) => {
    for (const id of JURISDICTIONS) {
      const stored = storedFor(id);
      const frozen = freezeEffectiveToggles(base, id, stored);
      expect(normalise(configAfter(id, frozen))).toEqual(normalise(configBefore(id, stored)));
      expect(renderAll(configAfter(id, frozen))).toEqual(renderAll(configBefore(id, stored)));
      // The frozen set is complete.
      for (const key of COURT_TOGGLE_KEYS) expect(frozen).toHaveProperty(key);
    }
  });

  test("a document without stored toggles freezes the legacy device toggles it renders with", () => {
    const legacy = {
      ibidSuppression: "on",
      pinpointStyle: "para-and-page",
      parallelOrder: "mnc-first",
    };
    for (const id of JURISDICTIONS) {
      const frozen = freezeEffectiveToggles(base, id, legacy);
      expect(renderAll(configAfter(id, frozen))).toEqual(
        renderAll(configBefore(id, undefined, legacy))
      );
    }
  });

  test("the frozen record keeps keys this build does not know (opaque bag rule)", () => {
    const frozen = freezeEffectiveToggles(base, "HCA", {
      futureToggle: "x",
      ibidSuppression: "off",
    });
    expect(frozen.futureToggle).toBe("x");
    expect(frozen.ibidSuppression).toBe("off");
  });

  test("a frozen WASC document keeps rendering MNC first (WA-1 PD 8.2.2 cl 4)", () => {
    const frozen = freezeEffectiveToggles(base, "WASC", getPresetToggles("WASC"));
    expect(
      text(formatCitation(SAMPLES[0], context(true, false), configAfter("WASC", frozen)))
    ).toContain("[1999] WASCA 14; (1999) 18 WAR 23");
  });
});

// ─── Selection (new documents) ───────────────────────────────────────────────

describe("COURT-106: selecting a court freezes the full preset toggle set", () => {
  test("every preset yields all eight toggles, engine defaults written out", () => {
    for (const id of JURISDICTIONS) {
      const toggles = getPresetToggles(id)!;
      expect(Object.keys(toggles).sort()).toEqual([...COURT_TOGGLE_KEYS].sort());
      expect(toggles.authorisedReportHierarchy).toBe(
        COURT_PRESETS[id].authorisedReportHierarchy.join(",")
      );
    }
    expect(getPresetToggles("HCA")!.parallelOrder).toBe("report-first");
    expect(getPresetToggles("HCA")!.pinpointConnector).toBe("aglc");
    // FCA GPN-AUTH cl 2.6 (FCA-1); Tas PD 3 of 2014 cl 3 (TAS-1).
    expect(getPresetToggles("FCA")!.pinpointConnector).toBe("at");
    expect(getPresetToggles("TASSC")!.pinpointConnector).toBe("at");
    expect(getPresetToggles("NOPE")).toBeUndefined();
  });

  test("the selection profile records the preset id and current version", () => {
    const profile = createCourtProfile("VSC", NOW);
    expect(profile).toEqual({
      presetId: "VSC",
      presetVersion: getPresetVersion("VSC"),
      origin: "selected",
      frozenAt: NOW.toISOString(),
      overridden: [],
    });
  });

  test("rendering from the frozen set equals rendering from the live preset", () => {
    for (const id of JURISDICTIONS) {
      const viaFrozen = configAfter(id, getPresetToggles(id)!);
      expect(renderAll(viaFrozen)).toHaveLength(SAMPLES.length * 3);
      expect(viaFrozen.authorisedReportHierarchy ?? []).toEqual(
        COURT_PRESETS[id].authorisedReportHierarchy
      );
    }
  });
});

// ─── Overrides ───────────────────────────────────────────────────────────────

describe("COURT-106: overridden values are recorded", () => {
  test("changing a value marks it overridden; changing it back to the preset value clears the mark", () => {
    let profile = createCourtProfile("HCA", NOW);
    profile = recordOverride(profile, "ibidSuppression", "off");
    expect(profile.overridden).toEqual(["ibidSuppression"]);
    profile = recordOverride(profile, "ibidSuppression", "on");
    expect(profile.overridden).toEqual([]);
  });

  test("a migrated (legacy) profile cannot compare with the preset, so any change is an override", () => {
    let profile = createMigratedProfile("HCA", NOW);
    profile = recordOverride(profile, "ibidSuppression", "on");
    expect(profile.overridden).toEqual(["ibidSuppression"]);
  });
});

// ─── Update prompt (DECISION-043 item 4) ─────────────────────────────────────

describe("COURT-106: the Update court profile prompt", () => {
  test("no prompt when the document matches the current preset", () => {
    const profile = createCourtProfile("FCA", NOW);
    expect(diffCourtProfile(getPresetToggles("FCA"), profile, "FCA")).toEqual([]);
    expect(isProfileUpdateAvailable(getPresetToggles("FCA"), profile, "FCA")).toBe(false);
  });

  test("an FCA document frozen before COURT-112 is offered the 'at' connector, with the change listed", () => {
    const stored = { ...getPresetToggles("FCA")!, pinpointConnector: "aglc" };
    const profile = createMigratedProfile("FCA", NOW);
    const diff = diffCourtProfile(stored, profile, "FCA");
    expect(diff).toEqual([
      {
        key: "pinpointConnector",
        label: "Pinpoint connector",
        current: "aglc",
        proposed: "at",
        overridden: false,
      },
    ]);
    expect(isProfileUpdateAvailable(stored, profile, "FCA")).toBe(true);
  });

  test("differences the user chose are listed but do not raise the prompt on their own", () => {
    let profile = createCourtProfile("HCA", NOW);
    profile = recordOverride(profile, "ibidSuppression", "off");
    const toggles = { ...getPresetToggles("HCA")!, ibidSuppression: "off" };
    expect(diffCourtProfile(toggles, profile, "HCA")).toHaveLength(1);
    expect(diffCourtProfile(toggles, profile, "HCA")[0].overridden).toBe(true);
    expect(isProfileUpdateAvailable(toggles, profile, "HCA")).toBe(false);
  });

  test("no prompt without a frozen profile, and none after the user declines this version", () => {
    const stored = { ...getPresetToggles("FCA")!, pinpointConnector: "aglc" };
    expect(isProfileUpdateAvailable(stored, undefined, "FCA")).toBe(false);
    const declined = declineProfileUpdate(createMigratedProfile("FCA", NOW), "FCA");
    expect(declined.declinedVersion).toBe(getPresetVersion("FCA"));
    expect(isProfileUpdateAvailable(stored, declined, "FCA")).toBe(false);
  });

  test("applying changes only the accepted keys and moves the profile to the current version", () => {
    const stored = {
      ...getPresetToggles("FCA")!,
      pinpointConnector: "aglc",
      ibidSuppression: "off",
      futureToggle: "kept",
    };
    const profile = { ...createMigratedProfile("FCA", NOW), futureKey: 42 };
    const { toggles, profile: next } = applyProfileUpdate(
      stored,
      profile,
      "FCA",
      ["pinpointConnector"],
      NOW
    );
    expect(toggles.pinpointConnector).toBe("at");
    expect(toggles.ibidSuppression).toBe("off");
    expect(toggles.futureToggle).toBe("kept");
    expect(next.presetVersion).toBe(getPresetVersion("FCA"));
    expect(next.origin).toBe("updated");
    // A value left unchanged now differs from the preset by the user's choice.
    expect(next.overridden).toEqual(["ibidSuppression"]);
    expect(next.overridesKnown).toBeUndefined();
    expect(next.futureKey).toBe(42);
    expect(isProfileUpdateAvailable(toggles, next, "FCA")).toBe(false);
  });

  test("the legacy marker is distinct from every preset version", () => {
    for (const id of JURISDICTIONS) expect(getPresetVersion(id)).not.toBe(LEGACY_PRESET_VERSION);
  });
});

// ─── Provenance (COURT-106 typed data; COURT-115 display) ───────────────────

describe("COURT-106 / COURT-115: typed provenance for every preset value", () => {
  test("every preset has provenance for all eight toggles, with known source ids", () => {
    for (const id of JURISDICTIONS) {
      const prov = COURT_PRESET_PROVENANCE[id];
      expect(prov.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const key of COURT_TOGGLE_KEYS) {
        const field = prov.fields[key];
        expect(field).toBeDefined();
        for (const src of field.sourceIds) expect(PROFILE_SOURCES[src]).toBeDefined();
        if (field.kind === "official") {
          expect(field.sourceIds.length).toBeGreaterThan(0);
          expect(field.checked).not.toBeNull();
        }
        if (field.kind === "unsourced") expect(field.note).toBeTruthy();
      }
      for (const src of prov.checkedAgainst) expect(PROFILE_SOURCES[src]).toBeDefined();
    }
  });

  test("ibid suppression is recorded as an Obiter default everywhere (O-R14; DECISION-043 item 2)", () => {
    for (const id of JURISDICTIONS) {
      expect(COURT_PRESET_PROVENANCE[id].fields.ibidSuppression.kind).toBe("preference");
      // Behaviour unchanged (DECISION-043 item 2).
      expect(COURT_PRESETS[id].ibidSuppression).toBe("on");
    }
  });

  test("instrument-backed values cite their instrument", () => {
    // FCA GPN-AUTH cl 2.6 (FCA-1, O-R2)
    expect(COURT_PRESET_PROVENANCE.FCA.fields.pinpointConnector).toMatchObject({
      kind: "official",
      sourceIds: ["FCA-1"],
      clause: "cl 2.6",
    });
    // Tas SC PD 3 of 2014 cl 3 (TAS-1, O-R8)
    expect(COURT_PRESET_PROVENANCE.TASSC.fields.pinpointConnector).toMatchObject({
      kind: "official",
      sourceIds: ["TAS-1"],
    });
    // WA SC CPD PD 8.2.2 cl 4 (WA-1, O-R9)
    expect(COURT_PRESET_PROVENANCE.WASC.fields.parallelOrder).toMatchObject({
      kind: "official",
      sourceIds: ["WA-1"],
      clause: "PD 8.2.2 cl 4",
    });
  });

  test("values the register found contradicted are not labelled official", () => {
    // Vic SC Gen 3 cl 5.2 (VIC-1, O-R5): report instead of MNC.
    expect(COURT_PRESET_PROVENANCE.VSC.fields.parallelCitations.kind).toBe("unsourced");
    // FCA GPN-AUTH 2025 has no Part A / B (O-R1).
    expect(COURT_PRESET_PROVENANCE.FCA.fields.loaType.kind).toBe("unsourced");
    // HCA PD 2 of 2024 five-part JBA (O-R3).
    expect(COURT_PRESET_PROVENANCE.HCA.fields.loaType.kind).toBe("unsourced");
    // FCA cl 2.5 example is MNC first (O-R2); the current report-first value awaits COURT-111.
    expect(COURT_PRESETS.FCA.parallelOrder ?? "report-first").toBe("report-first");
    expect(COURT_PRESET_PROVENANCE.FCA.fields.parallelOrder.kind).toBe("unsourced");
  });

  test("every court shows an experimental label naming its instrument and check date", () => {
    expect(experimentalLabel("WASC")).toBe(
      "Experimental: checked against WA SC Consolidated Practice Directions (PD 2.1, PD 8.2.2) (updated 23 Sep 2026) on 6 Oct 2026; not endorsed by the court."
    );
    expect(experimentalLabel("ART")).toBe(
      "Experimental: not checked against a court instrument (none found); not endorsed by the court."
    );
    for (const id of JURISDICTIONS) {
      expect(experimentalLabel(id)).toMatch(/^Experimental: .*not endorsed by the court\.$/);
      expect(experimentalLabel(id)).not.toContain("!");
    }
  });
});

// ─── Generated docs (COURT-115) ──────────────────────────────────────────────

describe("COURT-115: docs/court-profiles.md is generated from the preset data", () => {
  test("the committed file matches the generator (run scripts/generate-court-profiles.ts)", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const { renderCourtProfilesMarkdown } = require("../../src/engine/court/profileDocs");
    const committed = fs.readFileSync(
      path.resolve(__dirname, "../../docs/court-profiles.md"),
      "utf-8"
    );
    expect(committed).toBe(renderCourtProfilesMarkdown());
  });

  test("the file lists every court, its review date and the review process", () => {
    const { renderCourtProfilesMarkdown } = require("../../src/engine/court/profileDocs");
    const md: string = renderCourtProfilesMarkdown();
    for (const id of JURISDICTIONS) expect(md).toContain(`(\`${id}\`)`);
    expect(md).toContain("## Review process");
    expect(md).toContain("each quarter");
    expect(md).toContain("Known exceptions:");
    expect(md.replace("<!--", "")).not.toContain("!");
  });
});

// ─── Version guard (COURT-106) ───────────────────────────────────────────────

/**
 * The values each preset had at version 2026-10-06, in key order
 * parallelCitations | parallelOrder | pinpointStyle | pinpointConnector |
 * hierarchy | unreportedGate | ibidSuppression | loaType. A preset whose
 * values change must bump its version in provenance.ts (and update this
 * table), so existing documents are offered the change (DECISION-043 item 4).
 */
const VALUES_AT_2026_10_06: Record<string, string> = {
  HCA: "mandatory|report-first|para-and-page|aglc|CLR|off|on|part-ab",
  FCA: "mandatory|report-first|para-and-page|at|FCR,CLR,ALR|off|on|part-ab",
  FCFCOA: "mandatory|report-first|para-and-page|aglc|FamCAFC,FLC,ALR|off|on|two-part-read",
  NSWCA: "preferred|report-first|para-only|aglc|NSWLR,CLR,ALR|warn|on|part-ab",
  NSWSC: "preferred|report-first|para-only|aglc|NSWLR,CLR,ALR|warn|on|simple",
  NSW_DISTRICT_LOCAL: "preferred|report-first|para-only|aglc|NSWLR,CLR,ALR|warn|on|off",
  VSCA: "mandatory|report-first|para-and-page|aglc|VR,CLR,ALR|off|on|part-abc",
  VSC: "mandatory|report-first|para-and-page|aglc|VR,CLR,ALR|off|on|simple",
  VIC_COUNTY_MAG: "preferred|report-first|para-and-page|aglc|VR,CLR,ALR|off|on|off",
  QCA: "preferred|report-first|para-only|aglc|Qd R,CLR,ALR|warn|on|part-ab",
  QSC: "preferred|report-first|para-only|aglc|Qd R,CLR,ALR|warn|on|simple",
  QLD_DISTRICT_MAG: "mandatory|report-first|para-only|aglc|Qd R,CLR,ALR|warn|on|simple",
  WASC: "mandatory|mnc-first|para-and-page|aglc|WAR,CLR,ALR|off|on|simple",
  SASC: "preferred|report-first|para-and-page|aglc|SASR,CLR,ALR|off|on|two-part-read",
  TASSC: "preferred|report-first|para-and-page|at|Tas R,CLR,ALR|warn|on|three-part-tas",
  ACTSC: "preferred|report-first|para-and-page|aglc|ACTLR,CLR,ALR|off|on|simple",
  NTSC: "preferred|report-first|para-and-page|aglc|NTLR,CLR,ALR|off|on|simple",
  ART: "off|report-first|para-only|aglc||off|on|off",
  FWC: "off|report-first|para-only|aglc||off|on|off",
  STATE_TRIBUNAL: "off|report-first|para-only|aglc||off|on|off",
};

describe("COURT-106: a preset value change must bump the preset version", () => {
  test.each(JURISDICTIONS)("%s", (id) => {
    if (getPresetVersion(id) !== "2026-10-06") return; // bumped: a newer table applies
    const t = getPresetToggles(id)!;
    expect(COURT_TOGGLE_KEYS.map((k) => t[k]).join("|")).toBe(VALUES_AT_2026_10_06[id]);
  });
});
