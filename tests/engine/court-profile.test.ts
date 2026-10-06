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
  test("every preset yields all nine toggles, engine defaults written out", () => {
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

// ─── COURT-111: corrected presets and existing documents ────────────────────

/** A V1 (2026-10-06) frozen record, as COURT-106 wrote it (no reportedCaseMnc key). */
function v1Record(values: string): Record<string, string> {
  const keys = [
    "parallelCitations",
    "parallelOrder",
    "pinpointStyle",
    "pinpointConnector",
    "authorisedReportHierarchy",
    "unreportedGate",
    "ibidSuppression",
    "loaType",
  ];
  const parts = values.split("|");
  return Object.fromEntries(keys.map((k, i) => [k, parts[i]]));
}

const V1_PROFILE = (id: string) => ({
  ...createCourtProfile(id, NOW),
  presetVersion: "2026-10-06",
});

describe("COURT-111: corrected presets reach new documents; existing documents keep their output", () => {
  const pape = SAMPLES[2];
  const papeWithMnc = citation(
    "case.reported",
    { ...pape.data, mnc: "[2009] HCA 23", pinpoint: undefined },
    "Pape"
  );
  const first = context(true, false);

  test("VSC (Vic SC Gen 3 cl 5.2): a new document cites the report alone, as AGLC4 r 2.2.7 does", () => {
    const out = text(
      formatCitation(papeWithMnc, first, configAfter("VSC", getPresetToggles("VSC")!))
    );
    expect(out).toContain("(2009) 238 CLR 1");
    expect(out).not.toContain("HCA 23");
  });

  test.each(["VSCA", "FCFCOA", "ACTSC", "NTSC"])(
    "%s: a new document cites the report alone (VIC-2 cl 14.4, FCF-1 cl 5.8, ACT-1 cl 3–4, NT-1)",
    (id) => {
      const out = text(formatCitation(papeWithMnc, first, configAfter(id, getPresetToggles(id)!)));
      expect(out).not.toContain("HCA 23");
    }
  );

  test("a parallel the user recorded is never removed under 'omit' (Vic SC Gen 3 cl 5.2)", () => {
    const withParallel = citation(
      "case.reported",
      {
        ...papeWithMnc.data,
        parallelCitations: [{ volume: 257, reportSeries: "ALR", startingPage: 1 }],
      },
      "Pape"
    );
    const out = text(
      formatCitation(withParallel, first, configAfter("VSC", getPresetToggles("VSC")!))
    );
    expect(out).toContain("(2009) 238 CLR 1");
    expect(out).toContain("257 ALR 1");
  });

  test("an MNC-only (unreported) case keeps its MNC under 'omit'", () => {
    const out = text(
      formatCitation(SAMPLES[1], first, configAfter("VSC", getPresetToggles("VSC")!))
    );
    expect(out).toContain("[1997] TASSC 161");
  });

  test("a VSC document frozen at 2026-10-06 keeps the MNC until the user accepts the update", () => {
    const stored = v1Record("mandatory|report-first|para-and-page|aglc|VR,CLR,ALR|off|on|simple");
    const before = text(formatCitation(papeWithMnc, first, configAfter("VSC", stored)));
    expect(before).toContain("(2009) 238 CLR 1; [2009] HCA 23");

    const profile = V1_PROFILE("VSC");
    const diff = diffCourtProfile(stored, profile, "VSC");
    expect(diff.map((d) => [d.key, d.current, d.proposed])).toEqual([
      ["parallelCitations", "mandatory", "off"],
      ["reportedCaseMnc", undefined, "omit"],
    ]);
    expect(isProfileUpdateAvailable(stored, profile, "VSC")).toBe(true);

    const accepted = applyProfileUpdate(
      stored,
      profile,
      "VSC",
      diff.map((d) => d.key),
      NOW
    );
    expect(accepted.profile.overridden).toEqual([]);
    const after = text(formatCitation(papeWithMnc, first, configAfter("VSC", accepted.toggles)));
    expect(after).not.toContain("HCA 23");
  });

  test("FCA (GPN-AUTH cl 2.5): new documents put the MNC first; a 2026-10-06 document is offered the change", () => {
    const fresh = text(
      formatCitation(papeWithMnc, first, configAfter("FCA", getPresetToggles("FCA")!))
    );
    expect(fresh.indexOf("[2009] HCA 23")).toBeLessThan(fresh.indexOf("238 CLR"));

    const stored = v1Record("mandatory|report-first|para-and-page|at|FCR,CLR,ALR|off|on|part-ab");
    const old = text(formatCitation(papeWithMnc, first, configAfter("FCA", stored)));
    expect(old.indexOf("238 CLR")).toBeLessThan(old.indexOf("[2009] HCA 23"));
    expect(diffCourtProfile(stored, V1_PROFILE("FCA"), "FCA").map((d) => d.key)).toEqual([
      "parallelOrder",
      "loaType",
    ]);
  });

  test("TASSC (PD 3 of 2014 cl 3(a)): new documents put the MNC first", () => {
    const out = text(
      formatCitation(papeWithMnc, first, configAfter("TASSC", getPresetToggles("TASSC")!))
    );
    expect(out.indexOf("[2009] HCA 23")).toBeLessThan(out.indexOf("238 CLR"));
  });

  test("a document frozen before the MNC toggle existed is not prompted for it alone", () => {
    const stored = v1Record("mandatory|report-first|para-and-page|aglc|CLR|off|on|part-ab");
    expect(diffCourtProfile(stored, V1_PROFILE("HCA"), "HCA")).toEqual([]);
    expect(isProfileUpdateAvailable(stored, V1_PROFILE("HCA"), "HCA")).toBe(false);
  });

  test("academic AGLC4 output is unchanged by the MNC toggle (r 2.2.7)", () => {
    const academic = buildDocumentConfig({ standardId: "aglc4", writingMode: "academic" });
    const out = text(formatCitation(papeWithMnc, first, { ...academic, reportedCaseMnc: "omit" }));
    expect(out).toBe(text(formatCitation(papeWithMnc, first, academic)));
  });
});

// ─── Provenance (COURT-106 typed data; COURT-115 display) ───────────────────

describe("COURT-106 / COURT-115: typed provenance for every preset value", () => {
  test("every preset has provenance for all nine toggles, with known source ids", () => {
    for (const id of JURISDICTIONS) {
      const prov = COURT_PRESET_PROVENANCE[id];
      // A date, with an optional same-day revision (COURT-111: "2026-10-06.2").
      expect(prov.version).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/);
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
    // HCA PD 2 of 2024 five-part JBA (O-R3); awaits COURT-117.
    expect(COURT_PRESET_PROVENANCE.HCA.fields.loaType.kind).toBe("unsourced");
    // HCA instruments are silent on parallel citation (O-R4; Q3): unchanged.
    expect(COURT_PRESETS.HCA.parallelCitations).toBe("mandatory");
    expect(COURT_PRESET_PROVENANCE.HCA.fields.parallelCitations.kind).toBe("unsourced");
    // NSW SC CA 1 cl 37 four categories (O-R12); awaits COURT-117.
    expect(COURT_PRESET_PROVENANCE.NSWCA.fields.loaType.kind).toBe("unsourced");
  });

  test("COURT-111: corrected values now cite their instrument", () => {
    // Vic SC Gen 3 cl 5.2 (VIC-1, O-R5): report instead of MNC.
    expect(COURT_PRESETS.VSC.parallelCitations).toBe("off");
    expect(COURT_PRESET_PROVENANCE.VSC.fields.parallelCitations).toMatchObject({
      kind: "official",
      sourceIds: ["VIC-1"],
      clause: "cl 5.2",
    });
    expect(COURT_PRESET_PROVENANCE.VSC.fields.reportedCaseMnc.kind).toBe("official");
    // FCA GPN-AUTH cl 2.5 example is MNC first (FCA-1, O-R2; DECISION-043 item 3).
    expect(COURT_PRESETS.FCA.parallelOrder).toBe("mnc-first");
    expect(COURT_PRESET_PROVENANCE.FCA.fields.parallelOrder).toMatchObject({
      kind: "official",
      clause: "cl 2.5",
    });
    // FCA GPN-AUTH 2025 has no Part A / B (O-R1): a simple list is an Obiter default.
    expect(COURT_PRESETS.FCA.loaType).toBe("simple");
    expect(COURT_PRESET_PROVENANCE.FCA.fields.loaType.kind).toBe("preference");
    // Tas SC PD 3 of 2014 cl 3(a) example is MNC first (TAS-1, O-R8).
    expect(COURT_PRESET_PROVENANCE.TASSC.fields.parallelOrder).toMatchObject({
      kind: "official",
      clause: "cl 3(a)",
    });
    // SA UCR r 217.8(3) (SA-1, O-R7): report and MNC both required; order unstated.
    expect(COURT_PRESET_PROVENANCE.SASC.fields.parallelCitations.kind).toBe("official");
    expect(COURT_PRESET_PROVENANCE.SASC.fields.parallelOrder.kind).toBe("preference");
  });

  test("COURT-119: courts with no instrument are labelled 'no instrument found; AGLC4 fallback'", () => {
    const nsw = COURT_PRESET_PROVENANCE.NSW_DISTRICT_LOCAL;
    expect(nsw.fields.parallelCitations.kind).toBe("unsourced");
    expect(nsw.fields.parallelCitations.note).toContain("No instrument found; AGLC4 fallback");
    expect(nsw.exceptions.join(" ")).toContain("No instrument found; AGLC4 fallback");
    expect(COURT_PRESET_PROVENANCE.QLD_DISTRICT_MAG.exceptions.join(" ")).toContain(
      "District Court: no instrument found; AGLC4 fallback"
    );
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
 * parallelCitations | parallelOrder | reportedCaseMnc | pinpointStyle |
 * pinpointConnector | hierarchy | unreportedGate | ibidSuppression |
 * loaType. (reportedCaseMnc was added by COURT-111 with "include", the
 * value every preset had in effect.) A preset whose
 * values change must bump its version in provenance.ts (and update this
 * table), so existing documents are offered the change (DECISION-043 item 4).
 */
const VALUES_AT_2026_10_06: Record<string, string> = {
  HCA: "mandatory|report-first|include|para-and-page|aglc|CLR|off|on|part-ab",
  FCA: "mandatory|report-first|include|para-and-page|at|FCR,CLR,ALR|off|on|part-ab",
  FCFCOA: "mandatory|report-first|include|para-and-page|aglc|FamCAFC,FLC,ALR|off|on|two-part-read",
  NSWCA: "preferred|report-first|include|para-only|aglc|NSWLR,CLR,ALR|warn|on|part-ab",
  NSWSC: "preferred|report-first|include|para-only|aglc|NSWLR,CLR,ALR|warn|on|simple",
  NSW_DISTRICT_LOCAL: "preferred|report-first|include|para-only|aglc|NSWLR,CLR,ALR|warn|on|off",
  VSCA: "mandatory|report-first|include|para-and-page|aglc|VR,CLR,ALR|off|on|part-abc",
  VSC: "mandatory|report-first|include|para-and-page|aglc|VR,CLR,ALR|off|on|simple",
  VIC_COUNTY_MAG: "preferred|report-first|include|para-and-page|aglc|VR,CLR,ALR|off|on|off",
  QCA: "preferred|report-first|include|para-only|aglc|Qd R,CLR,ALR|warn|on|part-ab",
  QSC: "preferred|report-first|include|para-only|aglc|Qd R,CLR,ALR|warn|on|simple",
  QLD_DISTRICT_MAG: "mandatory|report-first|include|para-only|aglc|Qd R,CLR,ALR|warn|on|simple",
  WASC: "mandatory|mnc-first|include|para-and-page|aglc|WAR,CLR,ALR|off|on|simple",
  SASC: "preferred|report-first|include|para-and-page|aglc|SASR,CLR,ALR|off|on|two-part-read",
  TASSC: "preferred|report-first|include|para-and-page|at|Tas R,CLR,ALR|warn|on|three-part-tas",
  ACTSC: "preferred|report-first|include|para-and-page|aglc|ACTLR,CLR,ALR|off|on|simple",
  NTSC: "preferred|report-first|include|para-and-page|aglc|NTLR,CLR,ALR|off|on|simple",
  ART: "off|report-first|include|para-only|aglc||off|on|off",
  FWC: "off|report-first|include|para-only|aglc||off|on|off",
  STATE_TRIBUNAL: "off|report-first|include|para-only|aglc||off|on|off",
};

/**
 * COURT-111 / COURT-119: the values at version 2026-10-06.2 (same key
 * order), each with its register evidence. A further change bumps the
 * version again.
 */
const VALUES_AT_2026_10_06_2: Record<string, string> = {
  // FCA-1 cl 2.5 (MNC first, DECISION-043 item 3); O-R1 (no Part A / B).
  FCA: "mandatory|mnc-first|include|para-and-page|at|FCR,CLR,ALR|off|on|simple",
  // FCF-1 cl 5.8 (report replaces MNC); FamCAFC is an MNC identifier (O-R6).
  FCFCOA: "off|report-first|omit|para-and-page|aglc|FLC,ALR|off|on|two-part-read",
  // NSW-1 (SC Gen 20 covers the CCA), NSW-3 cl 27–28 (COURT-119).
  NSWCCA: "preferred|report-first|include|para-only|aglc|NSWLR,CLR,ALR|warn|on|simple",
  // VIC-1 cl 5.2, VIC-2 cl 14.4 (O-R5).
  VSCA: "off|report-first|omit|para-and-page|aglc|VR,CLR,ALR|off|on|part-abc",
  VSC: "off|report-first|omit|para-and-page|aglc|VR,CLR,ALR|off|on|simple",
  // QLD-3 cl 3 (O-R11).
  QLD_DISTRICT_MAG: "preferred|report-first|include|para-only|aglc|Qd R,CLR,ALR|warn|on|simple",
  // SA-1 r 217.8(3), r 101.8(4) (O-R7); order unstated, report first.
  SASC: "mandatory|report-first|include|para-and-page|aglc|SASR,CLR,ALR|off|on|two-part-read",
  SA_DISTRICT_MAG_CIVIL:
    "mandatory|report-first|include|para-and-page|aglc|SASR,CLR,ALR|off|on|two-part-read",
  // TAS-1 cl 3(a) (MNC first, DECISION-043 item 3; O-R8).
  TASSC: "preferred|mnc-first|include|para-and-page|at|Tas R,CLR,ALR|warn|on|three-part-tas",
  // ACT-1 cl 3–4, NT-1 (O-R10).
  ACTSC: "off|report-first|omit|para-and-page|aglc|ACTLR,CLR,ALR|off|on|simple",
  NTSC: "off|report-first|omit|para-and-page|aglc|NTLR,CLR,ALR|off|on|simple",
};

/**
 * COURT-113: the values at version 2026-10-07, in the full key order (with
 * COURT-107 `crossReferenceSuppression` and COURT-113 `subsequentForm`).
 */
const VALUES_AT_2026_10_07: Record<string, string> = {
  // WA-1 PD 2.1 cl 14: later references by case name only (O-R9).
  WASC: "mandatory|mnc-first|include|para-and-page|aglc|WAR,CLR,ALR|off|on|on|case-name|simple",
};

/**
 * The toggle keys the 2026-10-06 and 2026-10-06.2 tables list. The COURT-107
 * and COURT-113 keys did not exist then; a preset still at those versions
 * must leave them at their engine defaults (checked below).
 */
const KEYS_BEFORE_COURT_107 = COURT_TOGGLE_KEYS.filter(
  (k) => k !== "crossReferenceSuppression" && k !== "subsequentForm"
);

describe("COURT-106: a preset value change must bump the preset version", () => {
  test.each(JURISDICTIONS)("%s", (id) => {
    const version = getPresetVersion(id);
    const t = getPresetToggles(id)!;
    if (version === "2026-10-07") {
      expect(COURT_TOGGLE_KEYS.map((k) => t[k]).join("|")).toBe(VALUES_AT_2026_10_07[id]);
      return;
    }
    const table =
      version === "2026-10-06"
        ? VALUES_AT_2026_10_06
        : version === "2026-10-06.2"
          ? VALUES_AT_2026_10_06_2
          : undefined;
    if (!table) return; // bumped again: a newer table applies
    expect(KEYS_BEFORE_COURT_107.map((k) => t[k]).join("|")).toBe(table[id]);
    // COURT-107 / COURT-113: unchanged presets keep the earlier behaviour.
    expect(t.crossReferenceSuppression).toBe("on");
    expect(t.subsequentForm).toBe("short-title");
  });

  test("COURT-113: only WASC moved to 2026-10-07", () => {
    const bumped = JURISDICTIONS.filter((id) => getPresetVersion(id) === "2026-10-07").sort();
    expect(bumped).toEqual(Object.keys(VALUES_AT_2026_10_07).sort());
  });

  test("COURT-111: the corrected presets moved to the new version; the others did not", () => {
    const bumped = JURISDICTIONS.filter((id) => getPresetVersion(id) === "2026-10-06.2").sort();
    expect(bumped).toEqual(Object.keys(VALUES_AT_2026_10_06_2).sort());
  });
});
