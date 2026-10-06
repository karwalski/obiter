/**
 * @jest-environment jsdom
 *
 * COURT-106: store schema v3 — the frozen court profile.
 *
 * - v3 adds the `courtProfile` root attribute; a store is written as v3 only
 *   when it carries a profile, so academic documents stay v2 (builds before
 *   v3 quarantine any newer schema, SAFE-008).
 * - The v2 -> v3 migration freezes what a court document renders with today
 *   (no output change on upgrade) and touches nothing else.
 * - Unknown keys in the profile and the toggle bag round-trip unchanged.
 */

// jsdom supplies DOMParser (test environment above).
const describeIfDOMParser = describe;

import { CitationStore } from "../../src/store/citationStore";
import {
  applyMigrations,
  freezeCourtProfileMigration,
  schemaVersionToWrite,
} from "../../src/store/migrations";
import {
  MAX_SUPPORTED_SCHEMA_VERSION,
  StoreXmlError,
  deserializeStore,
  serializeStore,
} from "../../src/store/xmlSerializer";
import { getPresetToggles } from "../../src/engine/court/profile";
import type { CitationStoreData, CourtProfileRecord } from "../../src/types/citation";
import { FakeDocState, installFakeWord, makeCitation } from "./fakeWordHarness";

const NOW = new Date("2026-10-06T00:00:00Z");

function v2Court(
  courtJurisdiction: string | undefined,
  courtToggles?: Record<string, string>
): CitationStoreData {
  return {
    metadata: {
      schemaVersion: "2",
      aglcVersion: "4",
      standardId: "aglc4",
      writingMode: "court",
      courtJurisdiction,
      courtToggles,
    },
    citations: [],
  };
}

// ─── Migration (pure) ───────────────────────────────────────────────────────

describe("COURT-106: v2 -> v3 migration", () => {
  test("a court document with a jurisdiction and no toggles freezes what it renders with (base config)", () => {
    const migrated = applyMigrations(v2Court("WASC"), undefined, { now: NOW });
    expect(migrated.metadata.schemaVersion).toBe("3");
    // No stored toggles: the engine fell back to the AGLC4 base config, not
    // the preset, so that is what is frozen; the hierarchy came from the preset.
    expect(migrated.metadata.courtToggles).toEqual({
      parallelCitations: "off",
      parallelOrder: "report-first",
      pinpointStyle: "page-only",
      pinpointConnector: "aglc",
      authorisedReportHierarchy: "WAR,CLR,ALR",
      unreportedGate: "off",
      ibidSuppression: "off",
      loaType: "off",
    });
    expect(migrated.metadata.courtProfile).toEqual({
      presetId: "WASC",
      presetVersion: "legacy",
      origin: "migrated",
      frozenAt: NOW.toISOString(),
      overridden: [],
      overridesKnown: false,
    });
  });

  test("stored toggles are kept and the gaps filled; the legacy device pref is used only when the document has none", () => {
    const stored = { ibidSuppression: "on", futureToggle: "x" };
    const migrated = applyMigrations(v2Court("HCA", stored), undefined, {
      legacyCourtToggles: { ibidSuppression: "off" },
    });
    expect(migrated.metadata.courtToggles?.ibidSuppression).toBe("on");
    expect(migrated.metadata.courtToggles?.futureToggle).toBe("x");

    const fromDevice = applyMigrations(v2Court("HCA"), undefined, {
      legacyCourtToggles: { ibidSuppression: "on", pinpointStyle: "para-and-page" },
    });
    expect(fromDevice.metadata.courtToggles?.ibidSuppression).toBe("on");
    expect(fromDevice.metadata.courtToggles?.pinpointStyle).toBe("para-and-page");
  });

  test("academic, non-AGLC, no-jurisdiction and already-profiled documents are untouched", () => {
    const academic: CitationStoreData = {
      metadata: {
        schemaVersion: "2",
        aglcVersion: "4",
        standardId: "aglc4",
        writingMode: "academic",
      },
      citations: [makeCitation("a")],
    };
    expect(freezeCourtProfileMigration(academic)).toBe(academic);
    const migrated = applyMigrations(academic);
    expect({ ...migrated.metadata, schemaVersion: "2" }).toEqual(academic.metadata);
    expect(migrated.citations).toEqual(academic.citations);

    const oscola: CitationStoreData = {
      metadata: { ...v2Court("HCA").metadata, standardId: "oscola5" },
      citations: [],
    };
    expect(freezeCourtProfileMigration(oscola)).toBe(oscola);
    const noCourt = v2Court(undefined, { ibidSuppression: "on" });
    expect(freezeCourtProfileMigration(noCourt)).toBe(noCourt);
    const unknownCourt = v2Court("NOT_A_COURT");
    expect(freezeCourtProfileMigration(unknownCourt)).toBe(unknownCourt);
  });

  test("a v1 store passes through v2 to v3", () => {
    const v1 = {
      ...v2Court("NSWCA"),
      metadata: { ...v2Court("NSWCA").metadata, schemaVersion: "1.0" },
    };
    const migrated = applyMigrations(v1);
    expect(migrated.metadata.schemaVersion).toBe("3");
    expect(migrated.metadata.courtProfile?.presetId).toBe("NSWCA");
  });

  test("only a store with a court profile is written as v3", () => {
    expect(schemaVersionToWrite({ schemaVersion: "3", aglcVersion: "4" })).toBe("2");
    expect(schemaVersionToWrite({ schemaVersion: "2", aglcVersion: "4" })).toBe("2");
    expect(schemaVersionToWrite({ schemaVersion: "1.0", aglcVersion: "4" })).toBe("1.0");
    expect(
      schemaVersionToWrite({
        schemaVersion: "2",
        aglcVersion: "4",
        courtProfile: {
          presetId: "HCA",
          presetVersion: "x",
          origin: "selected",
          frozenAt: "",
          overridden: [],
        },
      })
    ).toBe("3");
  });
});

// ─── Serialization ──────────────────────────────────────────────────────────

describeIfDOMParser("COURT-106: schema v3 serialization", () => {
  const profile: CourtProfileRecord = {
    presetId: "FCA",
    presetVersion: "2026-10-06",
    origin: "selected",
    frozenAt: NOW.toISOString(),
    overridden: ["ibidSuppression"],
    futureKey: { nested: true },
  };

  test("the profile round-trips, including unknown keys, and the store is marked v3", () => {
    const toggles = { ...getPresetToggles("FCA")!, futureToggle: "kept" };
    const xml = serializeStore(
      [makeCitation("a")],
      "2",
      "4",
      "aglc4",
      "court",
      "FCA",
      undefined,
      "9.9.9",
      undefined,
      toggles,
      undefined,
      undefined,
      profile
    );
    expect(xml).toContain('version="3"');
    const data = deserializeStore(xml);
    expect(data.metadata.schemaVersion).toBe("3");
    expect(data.metadata.courtProfile).toEqual(profile);
    expect(data.metadata.courtToggles).toEqual(toggles);
  });

  test("an academic store is written exactly as before (v2, no profile attribute)", () => {
    const xml = serializeStore([makeCitation("a")], "2");
    expect(xml).toContain('version="2"');
    expect(xml).not.toContain("courtProfile");
    expect(deserializeStore(xml).metadata).not.toHaveProperty("courtProfile");
  });

  test("a malformed profile reads as absent; v3 is accepted and v4 still quarantined", () => {
    const base = serializeStore([], "2", "4", "aglc4", "court", "HCA");
    const broken = base.replace(
      'courtJurisdiction="HCA"',
      'courtJurisdiction="HCA" courtProfile="{&quot;nope&quot;:1}"'
    );
    expect(deserializeStore(broken).metadata.courtProfile).toBeUndefined();
    expect(MAX_SUPPORTED_SCHEMA_VERSION).toBe(3);
    expect(() => deserializeStore(base.replace('version="2"', 'version="3"'))).not.toThrow();
    expect(() => deserializeStore(base.replace('version="2"', 'version="4"'))).toThrow(
      StoreXmlError
    );
  });

  test("a numeric preset version from a hand edit is read as text", () => {
    const base = serializeStore([], "3", "4", "aglc4", "court", "HCA");
    const xml = base.replace(
      'courtJurisdiction="HCA"',
      'courtJurisdiction="HCA" courtProfile="{&quot;presetId&quot;:&quot;HCA&quot;,&quot;presetVersion&quot;:20261006,&quot;overridden&quot;:[]}"'
    );
    expect(deserializeStore(xml).metadata.courtProfile?.presetVersion).toBe("20261006");
  });
});

// ─── Store integration ──────────────────────────────────────────────────────

describeIfDOMParser("COURT-106: CitationStore loads, freezes and writes the profile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("opening a v2 court document freezes its toggles in memory without writing", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const xml = serializeStore(
      [makeCitation("a")],
      "2",
      "4",
      "aglc4",
      "court",
      "TASSC",
      undefined,
      "1.17.7",
      undefined,
      {
        parallelCitations: "preferred",
        pinpointStyle: "para-and-page",
        unreportedGate: "warn",
        ibidSuppression: "on",
        loaType: "three-part-tas",
      }
    );
    const part = doc.addPart(xml);

    const store = new CitationStore();
    await store.initStore();

    // Nothing written on open (read-only documents degrade gracefully).
    expect(part.xml).toBe(xml);
    expect(store.getCourtProfile()?.origin).toBe("migrated");
    // Saved before COURT-112: keeps the AGLC connector until the user accepts the update.
    expect(store.getCourtToggles()?.pinpointConnector).toBe("aglc");
    expect(store.getCourtToggles()?.authorisedReportHierarchy).toBe("Tas R,CLR,ALR");

    // The next write persists the profile as v3.
    await store.setCourtToggles(store.getCourtToggles());
    const written = doc.obiterParts()[0].xml;
    expect(written).toContain('version="3"');
    expect(deserializeStore(written).metadata.courtProfile?.presetId).toBe("TASSC");
  });

  test("an academic document is persisted as v2 with no profile", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(serializeStore([makeCitation("a")], "2"));

    const store = new CitationStore();
    await store.initStore();
    expect(store.getCourtProfile()).toBeUndefined();
    await store.add(makeCitation("b"));

    const written = doc.obiterParts()[0].xml;
    expect(written).toContain('version="2"');
    expect(written).not.toContain("courtProfile");
  });

  test("clearing or changing the court drops the profile; a staged profile for the new court is kept", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    doc.addPart(serializeStore([makeCitation("a")], "2", "4", "aglc4", "court", "HCA"));
    const store = new CitationStore();
    await store.initStore();
    expect(store.getCourtProfile()?.presetId).toBe("HCA");

    await store.setCourtProfile(
      {
        presetId: "FCA",
        presetVersion: "2026-10-06",
        origin: "selected",
        frozenAt: "",
        overridden: [],
      },
      { persist: false }
    );
    await store.setCourtJurisdiction("FCA");
    expect(store.getCourtProfile()?.presetId).toBe("FCA");

    await store.setCourtJurisdiction(undefined);
    expect(store.getCourtProfile()).toBeUndefined();
  });
});
