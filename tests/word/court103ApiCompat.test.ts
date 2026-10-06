/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-103: the API capability layer. Minimum versions follow the
 * Microsoft Learn requirement-set tables retrieved 6 Oct 2026 (MS-1, MS-2,
 * MS-4; R08 §3). fieldsWritable is a behaviour flag: Windows or Mac AND a
 * guarded probe, never isSetSupported alone (web reports 1.5 but fields are
 * "mainly read-only", MS-4).
 */

import {
  FEATURE_FLAGS,
  formatCapabilitySnapshot,
  getApiVersion,
  getCapabilitySnapshot,
  isFeatureAvailable,
  probeFieldsWritable,
  resetCapabilityCache,
} from "../../src/word/apiCompat";

function installOffice(
  sets: Record<string, number>,
  platform: string = "PC",
  version = "16.0.19127.20000"
): void {
  (globalThis as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, v: string) =>
          sets[set] !== undefined && parseFloat(v) <= sets[set],
      },
      diagnostics: { platform, version },
    },
  };
}

function fieldContext(fail = false) {
  const load = jest.fn();
  return {
    context: {
      sync: fail
        ? jest.fn().mockRejectedValue(new Error("ApiNotFound"))
        : jest.fn().mockResolvedValue(undefined),
      document: { body: { fields: { load } } },
    } as unknown as Word.RequestContext,
    load,
  };
}

beforeEach(() => resetCapabilityCache());
afterEach(() => {
  delete (globalThis as Record<string, unknown>).Office;
});

describe("COURT-103: FEATURE_FLAGS minimum versions (R08 §3)", () => {
  it.each([
    ["addStyle", "WordApi", "1.5"],
    ["comments", "WordApi", "1.4"],
    ["changeTrackingMode", "WordApi", "1.4"],
    ["trackedChanges", "WordApi", "1.6"],
    ["customProperties", "WordApi", "1.3"],
    ["bookmarks", "WordApi", "1.4"],
    ["fieldsRead", "WordApi", "1.4"],
    ["listApi", "WordApi", "1.3"],
    ["tablesOfAuthorities", "WordApiDesktop", "1.4"],
  ])("%s requires %s %s", (key, set, version) => {
    expect(FEATURE_FLAGS[key]).toMatchObject({ apiSet: set, version });
  });

  it("on a WordApi 1.5 host, addStyle and customProperties are available", () => {
    installOffice({ WordApi: 1.5 });
    expect(isFeatureAvailable("addStyle")).toBe(true);
    expect(isFeatureAvailable("customProperties")).toBe(true);
    expect(isFeatureAvailable("comments")).toBe(true);
    expect(isFeatureAvailable("trackedChanges")).toBe(false);
  });

  it("unknown features and missing Office.js read as unavailable", () => {
    expect(isFeatureAvailable("addStyle")).toBe(false);
    installOffice({ WordApi: 1.9 });
    expect(isFeatureAvailable("noSuchFeature")).toBe(false);
  });
});

describe("COURT-103: requirement-set probes", () => {
  it("detects WordApi 1.9 (the probe no longer stops at 1.8)", () => {
    installOffice({ WordApi: 1.9 });
    expect(getApiVersion()).toBe("1.9");
  });

  it("returns 'unknown' without any WordApi", () => {
    installOffice({});
    expect(getApiVersion()).toBe("unknown");
  });

  it("snapshot records platform, build, WordApiDesktop and hidden-document sets", () => {
    // Windows LTSC 2024 (MS-1): WordApi 1.8, Desktop 1.1, HiddenDocument 1.5.
    installOffice(
      { WordApi: 1.8, WordApiDesktop: 1.1, WordApiHiddenDocument: 1.5 },
      "PC",
      "16.0.17932"
    );
    const snap = getCapabilitySnapshot();
    expect(snap).toMatchObject({
      platform: "PC",
      hostVersion: "16.0.17932",
      wordApi: "1.8",
      wordApiDesktop: "1.1",
      wordApiHiddenDocument: "1.5",
      fieldsWritable: "not probed",
    });
    expect(snap.features.tablesOfAuthorities).toBe(false);
    expect(snap.features.listTemplates).toBe(true);
    const text = formatCapabilitySnapshot(snap);
    expect(text).toContain("WordApi: 1.8");
    expect(text).toContain("WordApiDesktop: 1.1");
  });

  it("web reports no desktop sets", () => {
    installOffice({ WordApi: 1.9 }, "OfficeOnline");
    const snap = getCapabilitySnapshot();
    expect(snap.wordApiDesktop).toBe("none");
    expect(snap.wordApiHiddenDocument).toBe("none");
  });
});

describe("COURT-103: fieldsWritable behaviour flag (MS-4)", () => {
  it("is false on Word for the web even though WordApi 1.5 is reported", async () => {
    installOffice({ WordApi: 1.9 }, "OfficeOnline");
    const { context, load } = fieldContext();
    expect(await probeFieldsWritable(context)).toBe(false);
    expect(load).not.toHaveBeenCalled();
  });

  it("is false on iPad", async () => {
    installOffice({ WordApi: 1.9 }, "iOS");
    expect(await probeFieldsWritable(fieldContext().context)).toBe(false);
  });

  it("is true on Windows when the guarded probe succeeds", async () => {
    installOffice({ WordApi: 1.5 }, "PC");
    const { context, load } = fieldContext();
    expect(await probeFieldsWritable(context)).toBe(true);
    expect(load).toHaveBeenCalledWith("items/type");
    expect(getCapabilitySnapshot().fieldsWritable).toBe(true);
  });

  it("is false on Mac when the probe throws", async () => {
    installOffice({ WordApi: 1.5 }, "Mac");
    expect(await probeFieldsWritable(fieldContext(true).context)).toBe(false);
  });

  it("is cached: one probe sync per session", async () => {
    installOffice({ WordApi: 1.5 }, "Mac");
    const { context } = fieldContext();
    await probeFieldsWritable(context);
    await probeFieldsWritable(context);
    expect((context.sync as jest.Mock).mock.calls).toHaveLength(1);
  });
});
