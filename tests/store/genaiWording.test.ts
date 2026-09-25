/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * A5-EXP-9 — the wording of the experimental generative AI form ("Output
 * from" by default, "Correspondence from" to keep the earlier Obiter form)
 * is DOCUMENT metadata. It reads as "output" when absent and reaches the
 * engine through `buildDocumentConfig` only under an AGLC standard.
 */

import { CitationStore } from "../../src/store/citationStore";
import { serializeStore, deserializeStore } from "../../src/store/xmlSerializer";
import { buildDocumentConfig, getStandardConfig } from "../../src/engine/standards";
import { formatCitation } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import { FakeDocState, installFakeWord, makeCitation, storeXmlWith } from "./fakeWordHarness";

const genai: Citation = {
  ...makeCitation("g"),
  sourceType: "genai_output",
  data: { platform: "ChatGPT", model: "GPT-5", developer: "OpenAI", outputDate: "2026-07-07" },
};
const text = (c: Citation, config = getStandardConfig("aglc4")): string =>
  formatCitation(c, undefined, config)
    .map((r) => r.text)
    .join("");

describe("xmlSerializer genaiWording attribute (A5-EXP-9)", () => {
  const serialise = (wording?: "output" | "correspondence"): string =>
    serializeStore(
      [makeCitation("a")],
      "2",
      "4",
      "aglc4",
      "academic",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      wording
    );

  test("correspondence round-trips", () => {
    const xml = serialise("correspondence");
    expect(xml).toContain('genaiWording="correspondence"');
    expect(deserializeStore(xml).metadata.genaiWording).toBe("correspondence");
  });

  test("an absent or unknown attribute deserialises to undefined", () => {
    expect(serialise()).not.toContain("genaiWording");
    expect(deserializeStore(serialise()).metadata.genaiWording).toBeUndefined();
    const odd = serialise().replace(
      'standardId="aglc4"',
      'standardId="aglc4" genaiWording="email"'
    );
    expect(deserializeStore(odd).metadata.genaiWording).toBeUndefined();
  });
});

describe("CitationStore genaiWording (A5-EXP-9)", () => {
  test("defaults to output, and a set value survives a fresh store instance", async () => {
    const doc = new FakeDocState();
    doc.addPart(storeXmlWith("a"));
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    expect(store.getGenaiWording()).toBe("output");

    await store.setGenaiWording("correspondence");
    expect(doc.obiterParts()[0].xml).toContain('genaiWording="correspondence"');

    const reopened = new CitationStore();
    await reopened.initStore();
    expect(reopened.getGenaiWording()).toBe("correspondence");
  });
});

describe("buildDocumentConfig genaiWording (A5-EXP-9)", () => {
  test("default AGLC documents render 'Output from'", () => {
    const config = buildDocumentConfig({ standardId: "aglc4", writingMode: "academic" });
    expect(config.genaiWording).toBeUndefined();
    expect(text(genai, config)).toMatch(/^Output from ChatGPT \(GPT-5\), OpenAI to the author/);
  });

  test("a correspondence document renders 'Correspondence from'", () => {
    const config = buildDocumentConfig({
      standardId: "aglc4",
      writingMode: "academic",
      genaiWording: "correspondence",
    });
    expect(text(genai, config)).toMatch(/^Correspondence from ChatGPT/);
  });

  test("the setting is ignored under OSCOLA and NZLSG", () => {
    for (const standardId of ["oscola5", "nzlsg3"] as const) {
      const config = buildDocumentConfig({
        standardId,
        writingMode: "academic",
        genaiWording: "correspondence",
      });
      expect(config.genaiWording).toBeUndefined();
    }
  });
});
