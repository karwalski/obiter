/**
 * @jest-environment jsdom
 *
 * STD-001 — the standards runner reproduces the add-in's own rendering.
 *
 * The runner is the foundation of the standards suites, so its own contract
 * is pinned here: `configFor` builds the refresher's config; `renderFirst`
 * matches the existing AGLC4 golden for Mabo (Rule 2.2.5 examples in
 * tests/engine/chapter1-occurrence-pinpoint.test.ts); `refreshDocument`
 * yields the same footnote texts the refresher suites expect (Rules 1.4.1,
 * 1.4.3, 1.4.4; court mode COURT-FIX-004).
 */

import { getStandardConfig } from "../../src/engine/standards";
import type { Citation } from "../../src/types/citation";
import {
  configFor,
  presetToggles,
  refreshDocument,
  renderBibliography,
  renderFirst,
  renderSubsequent,
  reportPending,
} from "./runner";
import type { ExpectationRow } from "./runner";

// The Mabo fixture used by the refresher and occurrence-pinpoint suites
// (Mabo v Queensland [No 2] (1992) 175 CLR 1).
const mabo: Citation = {
  id: "mabo",
  aglcVersion: "4",
  sourceType: "case.reported",
  data: {
    party1: "Mabo",
    party2: "Queensland [No 2]",
    yearType: "round",
    year: 1992,
    volume: 175,
    reportSeries: "CLR",
    startingPage: 1,
  },
  tags: [],
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
};

/** Mabo with the short title the refresher suites give it (Rule 1.4.4). */
const maboShort: Citation = { ...mabo, shortTitle: "Mabo" };

const MABO_FULL = "Mabo v Queensland [No 2] (1992) 175 CLR 1";

beforeEach(() => {
  localStorage.clear();
});

describe("configFor", () => {
  test("academic mode is the standard's own config", () => {
    expect(configFor("aglc4")).toEqual(getStandardConfig("aglc4"));
    expect(configFor("oscola5")).toEqual(getStandardConfig("oscola5"));
    expect(configFor("nzlsg3")).toEqual(getStandardConfig("nzlsg3"));
  });

  test("HCA preset under AGLC4 applies the preset toggles the way the refresher does", () => {
    const config = configFor("aglc4", { preset: "HCA" });
    expect(config).toMatchObject({
      standardId: "aglc4",
      writingMode: "court",
      parallelCitationMode: "mandatory",
      pinpointStyle: "para-and-page",
      ibidSuppressionMode: "on",
      unreportedGateMode: "off",
      loaType: "part-ab",
    });
  });

  test("overrides layer over the preset toggles (Settings' per-toggle controls)", () => {
    const config = configFor("aglc4", { preset: "HCA", overrides: { ibidSuppression: "off" } });
    expect(config.ibidSuppressionMode).toBe("off");
    expect(config.parallelCitationMode).toBe("mandatory");
  });

  test("presetToggles carries parallelOrder only when the preset declares it (WA)", () => {
    expect(presetToggles("WASC").parallelOrder).toBe("mnc-first");
    expect(presetToggles("HCA")).not.toHaveProperty("parallelOrder");
  });

  test("STD-013: a court preset under a non-AGLC standard leaves the academic config untouched", () => {
    // Court mode is an AGLC-only invariant (buildCourtConfig ignores the
    // toggles unless the standard is AGLC); only the Settings UI stops a
    // non-AGLC document entering court mode, so the engine guards it too and
    // flags the store diagnostic for callers.
    for (const standard of ["oscola5", "oscola4", "nzlsg3"] as const) {
      const config = configFor(standard, { preset: "HCA" });
      expect(config).toEqual({ ...getStandardConfig(standard), courtModeIgnored: true });
      expect(config.writingMode).toBe("academic");
    }
  });

  test("STD-013: the HCA preset carries its authorised report hierarchy", () => {
    expect(configFor("aglc4", { preset: "HCA" }).authorisedReportHierarchy).toEqual(["CLR"]);
    expect(configFor("aglc4").authorisedReportHierarchy).toBeUndefined();
  });
});

describe("renderFirst", () => {
  test("Mabo under aglc4 equals the existing golden", () => {
    expect(renderFirst(mabo, "aglc4").text).toBe(MABO_FULL);
  });

  test("a string pinpoint is decoded by type like an occurrence title", () => {
    expect(renderFirst(mabo, "aglc4", { pinpoint: "42" }).text).toBe(`${MABO_FULL}, 42`);
    expect(renderFirst(mabo, "aglc4", { pinpoint: "[42]" }).text).toBe(`${MABO_FULL} [42]`);
    expect(renderFirst(mabo, "aglc4", { pinpoint: { type: "page", value: "42" } }).text).toBe(
      `${MABO_FULL}, 42`
    );
  });
});

describe("renderSubsequent", () => {
  test("same source in the preceding footnote resolves to Ibid (Rule 1.4.3)", () => {
    const out = renderSubsequent(maboShort, "aglc4", {
      previous: [maboShort],
      footnoteNumber: 2,
      firstFootnoteNumber: 1,
    });
    expect(out.text).toBe("Ibid");
  });

  test("an explicit short preference gives the (n X) form (Rule 1.4.1)", () => {
    const out = renderSubsequent(maboShort, "aglc4", {
      previous: [maboShort],
      footnoteNumber: 2,
      firstFootnoteNumber: 1,
      pinpoint: "42",
      formatPreference: "short",
    });
    expect(out.text).toBe("Mabo (n 1) 42");
  });
});

describe("renderBibliography", () => {
  test("AGLC4 academic mode lists the case under its section", () => {
    const sections = renderBibliography([mabo], "aglc4");
    expect(sections.length).toBeGreaterThan(0);
    const texts = sections.flatMap((s) => s.entries.map((e) => e.map((r) => r.text).join("")));
    expect(texts.some((t) => t.includes("Mabo v Queensland"))).toBe(true);
  });
});

describe("refreshDocument", () => {
  test("aglc4: full then short with pinpoint 42 yields 'Mabo (n 1) 42.'", async () => {
    const { footnotes, rendered, result } = await refreshDocument(
      [
        { citationId: "mabo", pref: "full" },
        { citationId: "mabo", pref: "short", pinpoint: "42" },
      ],
      [maboShort],
      "aglc4"
    );
    expect(result.failures).toEqual([]);
    expect(result.updated).toBe(2);
    // Rule 1.4.4: the short title is introduced after the first citation.
    expect(footnotes[0]).toBe(`${MABO_FULL} (‘Mabo’).`);
    expect(footnotes[1]).toBe("Mabo (n 1) 42.");
    expect(rendered.map((r) => r.renderedFormat)).toEqual(["full", "short"]);
    expect(rendered[1].effectivePinpoint).toEqual({ type: "page", value: "42" });
  });

  test("aglc4 under the HCA preset yields the court short form with no ibid and no (n X)", async () => {
    const { footnotes, rendered } = await refreshDocument(
      [
        { citationId: "mabo", pref: "full" },
        { citationId: "mabo", pref: "auto", pinpoint: "42" },
      ],
      [maboShort],
      "aglc4",
      { preset: "HCA" }
    );
    expect(footnotes[1]).not.toContain("Ibid");
    expect(footnotes[1]).not.toContain("(n 1)");
    expect(footnotes[1]).toBe("Mabo 42.");
    expect(rendered[1].renderedFormat).toBe("short");
  });

  test("the store carries the seeded metadata the refresher reads", async () => {
    const { store } = await refreshDocument([{ citationId: "mabo" }], [mabo], "nzlsg3", {
      preset: "QSC",
    });
    expect(store.getStandardId()).toBe("nzlsg3");
    expect(store.getWritingMode()).toBe("court");
    expect(store.getCourtJurisdiction()).toBe("QSC");
    expect(store.getCourtToggles()).toEqual(presetToggles("QSC"));
  });
});

describe("reportPending", () => {
  const rows: ExpectationRow[] = [
    { fixture: "mabo", scenario: "first", expected: MABO_FULL, rule: "AGLC4 2.2", source: "repo" },
    {
      fixture: "ukCase",
      scenario: "first",
      expected: "",
      rule: "OSCOLA 5 2.1.1",
      source: "OSCOLA 5 PDF p 15",
      pending: "DECISION-040 item 1",
    },
  ];

  test("prints only the pending rows and returns them", () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      const pending = reportPending(rows, "oscola5");
      expect(pending).toEqual([rows[1]]);
      expect(info).toHaveBeenCalledTimes(1);
      const message = info.mock.calls[0][0] as string;
      expect(message).toContain("DECISION-040 item 1");
      expect(message).toContain("ukCase");
      expect(message).not.toContain("mabo");
    } finally {
      info.mockRestore();
    }
  });

  test("prints nothing when no row is pending", () => {
    const info = jest.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      expect(reportPending([rows[0]])).toEqual([]);
      expect(info).not.toHaveBeenCalled();
    } finally {
      info.mockRestore();
    }
  });
});
