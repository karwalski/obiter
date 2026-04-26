/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Story 17.6 — Source Preference & Jurisdictional Ordering: unit tests.
 */

import {
  registerAdapter,
  unregisterAdapter,
  getRegisteredAdapters,
  getPreferredAdapters,
  setPreference,
  clearPreference,
  exportPreferences,
  importPreferences,
  resetRegistry,
} from "../../src/api/sourcePreferences";
import type { AdapterMeta, ContentType } from "../../src/api/sourcePreferences";

/*
 * Mock devicePreferences so tests don't touch real localStorage.
 */
const mockStore: Record<string, unknown> = {};

jest.mock("../../src/store/devicePreferences", () => ({
  getDevicePref: (key: string) => mockStore[key],
  setDevicePref: (key: string, value: unknown) => {
    if (value === undefined) {
      delete mockStore[key];
    } else {
      mockStore[key] = value;
    }
  },
}));

beforeEach(() => {
  // Clear mock store
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  resetRegistry();
});

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

describe("adapter registry", () => {
  it("registers and retrieves adapters", () => {
    const meta: AdapterMeta = {
      id: "austlii",
      kind: "scraper",
      contentTypes: ["case", "legislation"],
      jurisdictions: ["AU"],
    };
    registerAdapter(meta);
    expect(getRegisteredAdapters()).toEqual([meta]);
  });

  it("unregisters an adapter", () => {
    registerAdapter({
      id: "jade",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: ["AU"],
    });
    unregisterAdapter("jade");
    expect(getRegisteredAdapters()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Default ordering
// ---------------------------------------------------------------------------

describe("getPreferredAdapters — default ordering", () => {
  beforeEach(() => {
    registerAdapter({
      id: "austlii",
      kind: "scraper",
      contentTypes: ["case", "legislation"],
      jurisdictions: ["AU"],
    });
    registerAdapter({
      id: "jade",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: ["AU"],
    });
    registerAdapter({
      id: "corpus-cases",
      kind: "corpus",
      contentTypes: ["case"],
      jurisdictions: [],
    });
    registerAdapter({
      id: "link-provider",
      kind: "link-only",
      contentTypes: ["case"],
      jurisdictions: [],
    });
  });

  it("orders by kind priority: corpus > live-api > scraper > link-only", () => {
    const order = getPreferredAdapters("case");
    expect(order).toEqual([
      "corpus-cases",
      "jade",
      "austlii",
      "link-provider",
    ]);
  });

  it("returns only adapters that support the requested content type", () => {
    const order = getPreferredAdapters("legislation");
    expect(order).toEqual(["austlii"]);
  });

  it("returns empty array when no adapters support the content type", () => {
    const order = getPreferredAdapters("hansard");
    expect(order).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Jurisdictional affinity
// ---------------------------------------------------------------------------

describe("getPreferredAdapters — jurisdictional affinity", () => {
  beforeEach(() => {
    registerAdapter({
      id: "nsw-caselaw",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: ["NSW"],
    });
    registerAdapter({
      id: "jade",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: ["AU"],
    });
    registerAdapter({
      id: "austlii",
      kind: "scraper",
      contentTypes: ["case"],
      jurisdictions: [],
    });
  });

  it("prefers jurisdiction-matching adapters within the same kind", () => {
    const order = getPreferredAdapters("case", "NSW");
    // Both live-api: nsw-caselaw matches NSW, jade does not
    expect(order.indexOf("nsw-caselaw")).toBeLessThan(
      order.indexOf("jade"),
    );
  });

  it("universal adapters (empty jurisdictions) match any jurisdiction", () => {
    const order = getPreferredAdapters("case", "NSW");
    // austlii has empty jurisdictions -> matches NSW
    expect(order).toContain("austlii");
  });
});

// ---------------------------------------------------------------------------
// Custom preferences
// ---------------------------------------------------------------------------

describe("setPreference / getPreferredAdapters — custom ordering", () => {
  beforeEach(() => {
    registerAdapter({
      id: "austlii",
      kind: "scraper",
      contentTypes: ["case"],
      jurisdictions: [],
    });
    registerAdapter({
      id: "jade",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: [],
    });
  });

  it("returns custom ordering when a global preference is set", () => {
    setPreference("case", undefined, ["jade", "austlii"]);
    const order = getPreferredAdapters("case");
    expect(order).toEqual(["jade", "austlii"]);
  });

  it("returns jurisdiction-specific ordering over global", () => {
    setPreference("case", undefined, ["austlii", "jade"]);
    setPreference("case", "NSW", ["jade", "austlii"]);

    const nsw = getPreferredAdapters("case", "NSW");
    expect(nsw).toEqual(["jade", "austlii"]);

    const global = getPreferredAdapters("case");
    expect(global).toEqual(["austlii", "jade"]);
  });

  it("falls back to global when no jurisdiction-specific preference exists", () => {
    setPreference("case", undefined, ["austlii", "jade"]);
    const vic = getPreferredAdapters("case", "VIC");
    expect(vic).toEqual(["austlii", "jade"]);
  });

  it("normalises jurisdiction to uppercase", () => {
    setPreference("case", "nsw", ["jade"]);
    const order = getPreferredAdapters("case", "NSW");
    expect(order).toEqual(["jade"]);
  });
});

describe("clearPreference", () => {
  it("reverts to default ordering after clearing", () => {
    registerAdapter({
      id: "austlii",
      kind: "scraper",
      contentTypes: ["case"],
      jurisdictions: [],
    });
    registerAdapter({
      id: "jade",
      kind: "live-api",
      contentTypes: ["case"],
      jurisdictions: [],
    });

    setPreference("case", undefined, ["austlii", "jade"]);
    clearPreference("case");

    const order = getPreferredAdapters("case");
    // Default: live-api before scraper
    expect(order).toEqual(["jade", "austlii"]);
  });
});

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

describe("exportPreferences / importPreferences", () => {
  it("round-trips preferences through JSON", () => {
    setPreference("case", undefined, ["jade", "austlii"]);
    setPreference("legislation", "CTH", ["frl"]);

    const json = exportPreferences();
    // Clear and re-import
    for (const key of Object.keys(mockStore)) delete mockStore[key];

    importPreferences(json);

    // Verify the imported preferences are used
    const caseOrder = getPreferredAdapters("case");
    expect(caseOrder).toEqual(["jade", "austlii"]);
  });

  it("throws on invalid JSON", () => {
    expect(() => importPreferences("not json")).toThrow();
  });

  it("throws when JSON is not an array", () => {
    expect(() => importPreferences('{"foo": "bar"}')).toThrow(
      "Expected a JSON array",
    );
  });

  it("throws when entries are missing required fields", () => {
    expect(() => importPreferences('[{"foo": "bar"}]')).toThrow(
      "Invalid preference entry",
    );
  });

  it("accepts valid entries", () => {
    const valid = JSON.stringify([
      { contentType: "case", adapterIds: ["jade"] },
    ]);
    expect(() => importPreferences(valid)).not.toThrow();
  });
});
