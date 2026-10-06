/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * COURT-102 / DECISION-043 item 1: Obiter writes only Obiter.Version and the
 * document's actual citation standard; never a person's name (an existing
 * Obiter.Author is removed on open); Obiter.CreatedDate is set once and never
 * overwritten; Obiter.Website is not written. Properties are written only
 * when the document's Obiter store holds at least one citation.
 *
 * customProperties is WordApi 1.3 (R08 §3.3), not 1.6 (O-K11).
 */

import { OBITER_PROPERTY_KEYS, writeObiterProperties } from "../../src/word/documentProperties";
import { getDocumentMetadata } from "../../src/word/documentMeta";

/** In-memory custom properties with the 1.3 API surface Obiter uses. */
function makeDoc(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const deleted: string[] = [];
  const customProperties = {
    getItemOrNullObject: jest.fn((key: string) => ({
      isNullObject: !store.has(key),
      value: store.get(key),
      load: jest.fn(),
      delete: jest.fn(() => {
        store.delete(key);
        deleted.push(key);
      }),
    })),
    add: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
    items: [] as Array<{ key: string; value: unknown }>,
    load: jest.fn(function (this: { items: Array<{ key: string; value: unknown }> }) {
      this.items = [...store.entries()].map(([key, value]) => ({ key, value }));
    }),
  };
  const context = {
    sync: jest.fn().mockResolvedValue(undefined),
    document: { properties: { customProperties } },
  };
  return { context: context as unknown as Word.RequestContext, store, deleted, customProperties };
}

function installOffice(maxWordApi: number): void {
  (globalThis as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, v: string) =>
          set === "WordApi" && parseFloat(v) <= maxWordApi,
      },
    },
  };
}

beforeEach(() => installOffice(1.5));
afterEach(() => {
  delete (globalThis as Record<string, unknown>).Office;
});

describe("COURT-102: Obiter custom document properties (DECISION-043 item 1)", () => {
  it("blank document (no citations): writes nothing", async () => {
    const { context, customProperties } = makeDoc();
    const result = await writeObiterProperties(context, "1.17.7", "aglc4", 0);
    expect(customProperties.add).not.toHaveBeenCalled();
    expect(result).toEqual({ written: [], removed: [] });
    // Only the lookup sync; no write sync.
    expect((context.sync as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("document with citations: writes version, the actual standard id and CreatedDate", async () => {
    const { context, store } = makeDoc();
    await writeObiterProperties(context, "1.17.7", "oscola5", 2);
    expect(store.get(OBITER_PROPERTY_KEYS.version)).toBe("1.17.7");
    expect(store.get(OBITER_PROPERTY_KEYS.citationStyle)).toBe("oscola5");
    expect(typeof store.get(OBITER_PROPERTY_KEYS.createdDate)).toBe("string");
  });

  it("never writes a person's name, Obiter.Website or Obiter.ManagedDocument", async () => {
    const { context, customProperties } = makeDoc();
    await writeObiterProperties(context, "1.17.7", "aglc4", 1);
    const keys = customProperties.add.mock.calls.map((c) => c[0]);
    expect(keys.sort()).toEqual(
      ["Obiter.CitationStyle", "Obiter.CreatedDate", "Obiter.Version"].sort()
    );
    for (const call of customProperties.add.mock.calls) {
      expect(String(call[1])).not.toMatch(/Watt/);
    }
  });

  it("second open: CreatedDate unchanged", async () => {
    const { context, store } = makeDoc({
      "Obiter.Version": "1.17.6",
      "Obiter.CitationStyle": "aglc4",
      "Obiter.CreatedDate": "2026-01-01T00:00:00.000Z",
    });
    const result = await writeObiterProperties(context, "1.17.7", "aglc4", 5);
    expect(store.get("Obiter.CreatedDate")).toBe("2026-01-01T00:00:00.000Z");
    expect(result.written).toEqual(["Obiter.Version"]);
  });

  it("unchanged values are not rewritten (no write sync)", async () => {
    const { context, customProperties } = makeDoc({
      "Obiter.Version": "1.17.7",
      "Obiter.CitationStyle": "aglc4",
      "Obiter.CreatedDate": "2026-01-01T00:00:00.000Z",
    });
    await writeObiterProperties(context, "1.17.7", "aglc4", 5);
    expect(customProperties.add).not.toHaveBeenCalled();
    expect((context.sync as jest.Mock).mock.calls).toHaveLength(1);
  });

  it("replaces the old hard-coded 'AGLC4' CitationStyle with the actual id", async () => {
    const { context, store } = makeDoc({ "Obiter.CitationStyle": "AGLC4" });
    await writeObiterProperties(context, "1.17.7", "nzlsg3", 1);
    expect(store.get("Obiter.CitationStyle")).toBe("nzlsg3");
  });

  it("removes an existing Obiter.Author on open, even with no citations", async () => {
    const { context, store, deleted } = makeDoc({ "Obiter.Author": "Watt, Matthew" });
    const result = await writeObiterProperties(context, "1.17.7", "aglc4", 0);
    expect(store.has("Obiter.Author")).toBe(false);
    expect(deleted).toEqual(["Obiter.Author"]);
    expect(result.removed).toEqual(["Obiter.Author"]);
  });

  it("leaves other existing Obiter keys (eg Obiter.Website) in place", async () => {
    const { context, store } = makeDoc({ "Obiter.Website": "https://obiter.com.au" });
    await writeObiterProperties(context, "1.17.7", "aglc4", 1);
    expect(store.get("Obiter.Website")).toBe("https://obiter.com.au");
  });

  it("compares numeric round-tripped values as text (toText)", async () => {
    const { context, customProperties } = makeDoc({
      "Obiter.Version": 2,
      "Obiter.CitationStyle": "aglc4",
      "Obiter.CreatedDate": "x",
    });
    await writeObiterProperties(context, "2", "aglc4", 1);
    expect(customProperties.add).not.toHaveBeenCalled();
  });

  it("runs on WordApi 1.3 (guard lowered from 1.6)", async () => {
    installOffice(1.3);
    const { context, store } = makeDoc();
    await writeObiterProperties(context, "1.17.7", "aglc4", 1);
    expect(store.get("Obiter.Version")).toBe("1.17.7");
  });

  it("skips below WordApi 1.3", async () => {
    installOffice(1.2);
    const { context, customProperties } = makeDoc({ "Obiter.Author": "x" });
    await writeObiterProperties(context, "1.17.7", "aglc4", 1);
    expect(customProperties.getItemOrNullObject).not.toHaveBeenCalled();
  });

  it("read-only document: a NotAllowed sync is swallowed", async () => {
    const { context } = makeDoc({ "Obiter.Author": "x" });
    (context.sync as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error("NotAllowed"), { code: "NotAllowed" }));
    await expect(writeObiterProperties(context, "1.17.7", "aglc4", 1)).resolves.toEqual({
      written: [],
      removed: [],
    });
  });

  it("host reports the document read-only: no lookup and no write", async () => {
    const office = (globalThis as Record<string, unknown>).Office as Record<string, unknown>;
    office.DocumentMode = { ReadOnly: "readOnly", ReadWrite: "readWrite" };
    (office.context as Record<string, unknown>).document = { mode: "readOnly" };
    const { context, customProperties } = makeDoc({ "Obiter.Author": "x" });
    await expect(writeObiterProperties(context, "1.17.7", "aglc4", 1)).resolves.toEqual({
      written: [],
      removed: [],
    });
    expect(customProperties.getItemOrNullObject).not.toHaveBeenCalled();
    expect(context.sync).not.toHaveBeenCalled();
  });

  it("getDocumentMetadata no longer reports an author", async () => {
    const { context } = makeDoc({ "Obiter.Version": 1, "Obiter.CitationStyle": "aglc4" });
    expect(await getDocumentMetadata(context)).toEqual({ version: "1", style: "aglc4" });
  });
});
