/**
 * @jest-environment jsdom
 *
 * SAFE-007 — CitationStore quarantine access and salvage merge.
 *
 * Covers `getQuarantinedPartXml` (read-only, byte-exact) and `addMany`
 * (single-persist batch merge that skips existing ids) over the shared
 * namespace-aware fake Word harness, plus the end-to-end guarantee that a
 * salvage merge never deletes or modifies the quarantined part itself.
 */

import { CitationStore } from "../../src/store/citationStore";
import { salvageCitations, filterNewCitations } from "../../src/store/salvage";
import { deserializeStore, serializeStore } from "../../src/store/xmlSerializer";
import {
  CORRUPT_XML,
  FakeDocState,
  FakePart,
  installFakeWord,
  makeCitation,
  storeXmlWith,
} from "./fakeWordHarness";

/** Init a store over a doc holding one readable and one corrupt part. */
async function initWithQuarantine(): Promise<{
  doc: FakeDocState;
  store: CitationStore;
  corruptPart: FakePart;
  corruptPartId: string;
}> {
  const doc = new FakeDocState();
  doc.addPart(storeXmlWith("a"));
  const corruptPart = doc.addPart(CORRUPT_XML);
  installFakeWord(doc);

  const store = new CitationStore();
  await store.initStore();

  const quarantined = store.getDiagnostics().parts.filter((p) => p.citationCount === null);
  expect(quarantined).toHaveLength(1);
  return { doc, store, corruptPart, corruptPartId: quarantined[0].partId };
}

describe("SAFE-007 — CitationStore.getQuarantinedPartXml", () => {
  test("returns the part XML byte-exactly, by the diagnostics part id", async () => {
    const { store, corruptPartId } = await initWithQuarantine();

    const xml = await store.getQuarantinedPartXml(corruptPartId);

    expect(xml).toBe(CORRUPT_XML);
  });

  test("returns null for an unknown part id", async () => {
    const { store } = await initWithQuarantine();

    expect(await store.getQuarantinedPartXml("no-such-part")).toBeNull();
  });

  test("returns null when the document has no Obiter parts at all", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const store = new CitationStore();

    // Works without initStore(): it is a standalone read-only scan.
    expect(await store.getQuarantinedPartXml("part-1")).toBeNull();
  });

  test("is strictly read-only: no part is deleted, modified, or added", async () => {
    const { doc, store, corruptPart, corruptPartId } = await initWithQuarantine();
    const partsBefore = [...doc.parts];
    const xmlsBefore = doc.parts.map((p) => p.xml);

    await store.getQuarantinedPartXml(corruptPartId);
    await store.getQuarantinedPartXml("no-such-part");

    expect(doc.parts).toEqual(partsBefore);
    expect(doc.parts.map((p) => p.xml)).toEqual(xmlsBefore);
    expect(doc.parts).toContain(corruptPart);
  });
});

describe("SAFE-007 — CitationStore.addMany", () => {
  test("adds new citations in one persist and skips existing ids", async () => {
    const { doc, store } = await initWithQuarantine();

    const added = await store.addMany([
      makeCitation("a"), // already in the library — skipped
      makeCitation("b"),
      makeCitation("c"),
      makeCitation("b"), // duplicate within the batch — skipped
      makeCitation(""), // empty id — skipped
    ]);

    expect(added).toBe(2);
    expect(
      store
        .getAll()
        .map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c"]);

    // Persisted once: exactly one readable part holding all three.
    const readable = doc.obiterParts().filter((p) => p.xml !== CORRUPT_XML);
    expect(readable).toHaveLength(1);
    expect(
      deserializeStore(readable[0].xml)
        .citations.map((c) => c.id)
        .sort()
    ).toEqual(["a", "b", "c"]);
  });

  test("an all-duplicate batch adds nothing and does not persist", async () => {
    const { doc, store } = await initWithQuarantine();
    const partsBefore = [...doc.parts];

    const added = await store.addMany([makeCitation("a")]);

    expect(added).toBe(0);
    expect(store.getAll().map((c) => c.id)).toEqual(["a"]);
    // No persist means the document parts are untouched.
    expect(doc.parts).toEqual(partsBefore);
  });

  test("salvage merge end-to-end never deletes or modifies the quarantined part", async () => {
    const { doc, store, corruptPart, corruptPartId } = await initWithQuarantine();

    // Build a quarantined payload holding one new and one known citation,
    // then run the full Recovery-panel flow: read, salvage, filter, merge.
    const salvageable =
      serializeStore([makeCitation("a"), makeCitation("recovered")]) +
      '\n<obiter:citation id="dangling';
    corruptPart.xml = salvageable;

    const xml = await store.getQuarantinedPartXml(corruptPartId);
    expect(xml).toBe(salvageable);

    const result = salvageCitations(xml!);
    expect(result.citations.map((c) => c.id)).toEqual(["a", "recovered"]);

    const fresh = filterNewCitations(result.citations, new Set(store.getAll().map((c) => c.id)));
    expect(fresh.map((c) => c.id)).toEqual(["recovered"]);

    const added = await store.addMany(fresh);
    expect(added).toBe(1);
    expect(
      store
        .getAll()
        .map((c) => c.id)
        .sort()
    ).toEqual(["a", "recovered"]);

    // The quarantined part survives the merge persist, byte for byte.
    expect(doc.parts).toContain(corruptPart);
    expect(corruptPart.xml).toBe(salvageable);
  });
});
