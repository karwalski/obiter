/**
 * @jest-environment jsdom
 *
 * COURT-122 follow-up (owner, 7 Oct 2026): a property the user removes in
 * the pre-handover check stays removed. The opt-out is document metadata in
 * the Obiter store (it travels with the file); writeObiterProperties honours
 * it and still always removes Obiter.Author (DECISION-043 item 1).
 */

import {
  OBITER_PROPERTY_KEYS,
  WRITTEN_PROPERTY_KEYS,
  writeObiterProperties,
} from "../../src/word/documentProperties";
import { runStartupDocumentTasks } from "../../src/word/startupSetup";
import { deserializeStore, serializeStore } from "../../src/store/xmlSerializer";

/** In-memory custom properties with the WordApi 1.3 surface Obiter uses. */
function makeDoc(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  const customProperties = {
    getItemOrNullObject: jest.fn((key: string) => ({
      isNullObject: !store.has(key),
      value: store.get(key),
      load: jest.fn(),
      delete: jest.fn(() => {
        store.delete(key);
      }),
    })),
    add: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
  const context = {
    sync: jest.fn().mockResolvedValue(undefined),
    document: {
      properties: { customProperties },
      body: { load: jest.fn(), text: "Some text" },
    },
  };
  return { context: context as unknown as Word.RequestContext, store, customProperties };
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).Office = {
    context: {
      requirements: {
        isSetSupported: (set: string, v: string) => set === "WordApi" && parseFloat(v) <= 1.5,
      },
    },
  };
});
afterEach(() => {
  delete (globalThis as Record<string, unknown>).Office;
});

describe("COURT-122: writeObiterProperties honours the document's opt-out", () => {
  it("does not write back a property the user removed", async () => {
    const { context, store, customProperties } = makeDoc();
    const result = await writeObiterProperties(context, "1.17.8", "aglc4", 3, [
      OBITER_PROPERTY_KEYS.version,
    ]);
    expect(store.has(OBITER_PROPERTY_KEYS.version)).toBe(false);
    expect(store.get(OBITER_PROPERTY_KEYS.citationStyle)).toBe("aglc4");
    expect(result.written).not.toContain(OBITER_PROPERTY_KEYS.version);
    expect(customProperties.add.mock.calls.map((c) => c[0])).not.toContain(
      OBITER_PROPERTY_KEYS.version
    );
  });

  it("with every written key opted out, writes nothing but still removes Obiter.Author", async () => {
    const { context, store, customProperties } = makeDoc({ "Obiter.Author": "[placeholder]" });
    const result = await writeObiterProperties(
      context,
      "1.17.8",
      "aglc4",
      3,
      WRITTEN_PROPERTY_KEYS
    );
    expect(customProperties.add).not.toHaveBeenCalled();
    expect(store.has("Obiter.Author")).toBe(false);
    expect(result).toEqual({ written: [], removed: ["Obiter.Author"] });
  });

  it("leaves an existing opted-out value as it is (never overwritten)", async () => {
    const { context, store } = makeDoc({ [OBITER_PROPERTY_KEYS.citationStyle]: "aglc5" });
    await writeObiterProperties(context, "1.17.8", "aglc4", 1, [
      OBITER_PROPERTY_KEYS.citationStyle,
    ]);
    expect(store.get(OBITER_PROPERTY_KEYS.citationStyle)).toBe("aglc5");
  });

  it("an empty opt-out (properties turned back on) writes as before", async () => {
    const { context, store } = makeDoc();
    await writeObiterProperties(context, "1.17.8", "aglc4", 1, []);
    for (const key of WRITTEN_PROPERTY_KEYS) expect(store.has(key)).toBe(true);
  });

  it("the startup tasks pass the store's opt-out through", async () => {
    const { context, store } = makeDoc();
    await runStartupDocumentTasks(
      context,
      {
        getAll: () => [{}],
        getStandardId: () => "aglc4",
        getWritingMode: () => "court",
        getPropertyOptOut: () => [OBITER_PROPERTY_KEYS.createdDate],
      },
      "1.17.8"
    );
    expect(store.has(OBITER_PROPERTY_KEYS.createdDate)).toBe(false);
    expect(store.get(OBITER_PROPERTY_KEYS.version)).toBe("1.17.8");
  });

  it("a store view without the accessor (older partial store) writes as before", async () => {
    const { context, store } = makeDoc();
    await runStartupDocumentTasks(
      context,
      { getAll: () => [{}], getStandardId: () => "aglc4", getWritingMode: () => "court" },
      "1.17.8"
    );
    expect(store.has(OBITER_PROPERTY_KEYS.createdDate)).toBe(true);
  });
});

describe("COURT-122: the opt-out travels with the document (custom XML part)", () => {
  const serialize = (optOut?: string[]): string =>
    serializeStore(
      [],
      "2",
      "4",
      "aglc4",
      "academic",
      undefined,
      undefined,
      "1.17.8",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      optOut
    );

  it("round-trips through the store XML", () => {
    const xml = serialize([OBITER_PROPERTY_KEYS.version, OBITER_PROPERTY_KEYS.createdDate]);
    expect(deserializeStore(xml).metadata.propertyOptOut).toEqual([
      OBITER_PROPERTY_KEYS.version,
      OBITER_PROPERTY_KEYS.createdDate,
    ]);
  });

  it("an empty or absent opt-out writes no attribute, so other stores are unchanged", () => {
    expect(serialize([])).not.toContain("propertyOptOut");
    expect(serialize(undefined)).not.toContain("propertyOptOut");
    expect(deserializeStore(serialize(undefined)).metadata).not.toHaveProperty("propertyOptOut");
  });

  it("reads hand-edited entries through toText (numeric round-trip hazard) and drops junk", () => {
    const xml = serialize(["x"]).replace(
      /propertyOptOut="[^"]*"/,
      `propertyOptOut="${'[" Obiter.Version ", 42, "", null]'.replace(/"/g, "&quot;")}"`
    );
    expect(deserializeStore(xml).metadata.propertyOptOut).toEqual(["Obiter.Version", "42"]);
    const malformed = serialize(["x"]).replace(/propertyOptOut="[^"]*"/, 'propertyOptOut="{"');
    expect(deserializeStore(malformed).metadata.propertyOptOut).toBeUndefined();
  });
});
