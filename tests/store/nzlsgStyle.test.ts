/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-022 — the NZLSG citation style (NZLSG 3 r 2.3, general / commercial)
 * is DOCUMENT metadata: it is serialised alongside the court toggles, reads
 * as "general" when absent (documents saved before the field existed), and
 * reaches the engine through `buildDocumentConfig` / `resolveDocumentConfig`
 * only when the document is on an NZLSG standard.
 */

import { CitationStore } from "../../src/store/citationStore";
import { serializeStore, deserializeStore } from "../../src/store/xmlSerializer";
import {
  buildDocumentConfig,
  getStandardConfig,
  resolveDocumentConfig,
} from "../../src/engine/standards";
import { FakeDocState, installFakeWord, makeCitation, storeXmlWith } from "./fakeWordHarness";

// ─── Serialiser ─────────────────────────────────────────────────────────────

describe("xmlSerializer nzlsgStyle attribute (STD-022)", () => {
  test("a commercial style round-trips next to the court toggles", () => {
    const toggles = { ibidSuppression: "on" };
    const xml = serializeStore(
      [makeCitation("a")],
      "2",
      "4",
      "nzlsg3",
      "academic",
      undefined,
      undefined,
      "1.0.0",
      "parent-child",
      toggles,
      "commercial"
    );
    expect(xml).toContain('nzlsgStyle="commercial"');
    const store = deserializeStore(xml);
    expect(store.metadata.nzlsgStyle).toBe("commercial");
    expect(store.metadata.courtToggles).toEqual(toggles);
    expect(store.metadata.standardId).toBe("nzlsg3");
  });

  test("an absent attribute deserialises to undefined (backward compatibility)", () => {
    const xml = serializeStore([makeCitation("a")], "2", "4", "nzlsg3");
    expect(xml).not.toContain("nzlsgStyle");
    expect(deserializeStore(xml).metadata.nzlsgStyle).toBeUndefined();
  });

  test("an unrecognised value deserialises to undefined instead of failing the read", () => {
    const xml = serializeStore([], "2", "4", "nzlsg3").replace(
      'standardId="nzlsg3"',
      'standardId="nzlsg3" nzlsgStyle="informal"'
    );
    expect(deserializeStore(xml).metadata.nzlsgStyle).toBeUndefined();
  });

  test("re-serialising a deserialised store preserves the style (open elsewhere, save, reopen)", () => {
    const first = serializeStore(
      [makeCitation("a")],
      "2",
      "4",
      "nzlsg3",
      "academic",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "commercial"
    );
    const loaded = deserializeStore(first);
    const second = serializeStore(
      loaded.citations,
      loaded.metadata.schemaVersion,
      loaded.metadata.aglcVersion,
      loaded.metadata.standardId,
      loaded.metadata.writingMode,
      loaded.metadata.courtJurisdiction,
      loaded.metadata.headingListId,
      undefined,
      loaded.metadata.ccModel,
      loaded.metadata.courtToggles,
      loaded.metadata.nzlsgStyle
    );
    expect(deserializeStore(second).metadata.nzlsgStyle).toBe("commercial");
  });
});

// ─── Store ──────────────────────────────────────────────────────────────────

describe("CitationStore nzlsgStyle (STD-022)", () => {
  test("defaults to general when the document carries no style", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(store.getNzlsgStyle()).toBe("general");
  });

  test("setNzlsgStyle persists into the document and survives a fresh store instance", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.setStandardId("nzlsg3");
    await store.setNzlsgStyle("commercial");
    expect(store.getNzlsgStyle()).toBe("commercial");
    expect(doc.obiterParts()[0].xml).toContain('nzlsgStyle="commercial"');

    // A second store instance over the same document (another device).
    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getNzlsgStyle()).toBe("commercial");
    expect(reopened.getStandardId()).toBe("nzlsg3");

    await reopened.setNzlsgStyle("general");
    const third = new CitationStore();
    await third.initStore();
    expect(third.getNzlsgStyle()).toBe("general");
  });
});

// ─── Document config ────────────────────────────────────────────────────────

describe("buildDocumentConfig / resolveDocumentConfig nzlsgStyle (STD-022)", () => {
  test("an NZLSG document's style is mapped into the config", () => {
    const config = buildDocumentConfig({
      standardId: "nzlsg3",
      writingMode: "academic",
      nzlsgStyle: "commercial",
    });
    expect(config.nzlsgStyle).toBe("commercial");
    expect(config.standardId).toBe("nzlsg3");
  });

  test("without a stored style the NZLSG config carries none (the engine reads general)", () => {
    const config = buildDocumentConfig({ standardId: "nzlsg3", writingMode: "academic" });
    expect(config).toEqual(getStandardConfig("nzlsg3"));
    expect(config.nzlsgStyle).toBeUndefined();
  });

  test("under AGLC and OSCOLA a stray stored style leaves the profile config untouched", () => {
    for (const standardId of ["aglc4", "oscola5"] as const) {
      const config = buildDocumentConfig({
        standardId,
        writingMode: "academic",
        nzlsgStyle: "commercial",
      });
      expect(config).toStrictEqual({ ...getStandardConfig(standardId), writingMode: "academic" });
    }
  });

  test("resolveDocumentConfig reads the store's accessor when it exposes one", () => {
    const config = resolveDocumentConfig({
      getStandardId: () => "nzlsg3",
      getNzlsgStyle: () => "commercial",
    });
    expect(config.nzlsgStyle).toBe("commercial");
  });

  test("a partial store without the accessor resolves without a style", () => {
    const config = resolveDocumentConfig({ getStandardId: () => "nzlsg3" });
    expect(config.nzlsgStyle).toBeUndefined();
  });
});
