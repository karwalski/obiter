/**
 * @jest-environment jsdom
 *
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-006: the adapter provenance bag a lookup hit leaves under
 * `data.interchange` survives a Custom XML Part round trip. The bag is a
 * nested object, which the serializer JSON-encodes, so a store persisted
 * through the fake Word harness and read back by a fresh store must hand
 * the same bag to the Record details panel and the export mapper.
 */

import { CitationStore } from "../../src/store/citationStore";
import { INTERCHANGE_DATA_KEY } from "../../src/api/interchange/model";
import type { CitationInterchangeBag } from "../../src/api/interchange/model";
import { FakeDocState, installFakeWord, makeCitation } from "./fakeWordHarness";

const BAG: CitationInterchangeBag = {
  v: 1,
  provenance: {
    format: "adapter",
    rawType: "case",
    sourceLabel: "Open Australian Legal Corpus",
    rawId: "corpus:mabo-1992",
    adapterId: "corpus",
    sourceUrl: "https://example.test/corpus/mabo",
    retrievedAt: "2026-09-14T01:02:03.000Z",
  },
};

describe("ENP-006: interchange bag store round trip", () => {
  test("a citation with an adapter provenance bag reads back unchanged", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);

    const store = new CitationStore();
    await store.initStore();
    await store.add(
      makeCitation("mabo", {
        data: {
          party1: "Mabo",
          party2: "Queensland (No 2)",
          year: "1992",
          volume: "175",
          reportSeries: "CLR",
          startingPage: "1",
          [INTERCHANGE_DATA_KEY]: BAG,
        },
      })
    );

    // A fresh store over the same document parts, as on the next open.
    const reopened = new CitationStore();
    await reopened.initStore();
    const stored = reopened.getAll();
    expect(stored.map((c) => c.id)).toEqual(["mabo"]);
    const data = stored[0].data;
    expect(data[INTERCHANGE_DATA_KEY]).toEqual(BAG);
    // The engine-facing fields are untouched by the bag.
    expect(data.party1).toBe("Mabo");
    expect(data.reportSeries).toBe("CLR");
  });
});
