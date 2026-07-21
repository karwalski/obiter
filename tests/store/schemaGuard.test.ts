/**
 * @jest-environment jsdom
 *
 * Schema forward-compatibility guard tests (SAFE-008).
 *
 * A store part written by a FUTURE Obiter (version > 2) must be reported
 * unreadable and quarantined — never half-parsed and then overwritten as v2
 * by the next persist. v1 and v2 parsing behaviour is unchanged.
 */

let hasDOMParser = typeof DOMParser !== "undefined";
try {
  if (!hasDOMParser) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = eval("require")("jsdom");
    const jsdom = new JSDOM();
    (global as Record<string, unknown>).DOMParser = jsdom.window.DOMParser;
    (global as Record<string, unknown>).XMLSerializer = jsdom.window.XMLSerializer;
    hasDOMParser = true;
  }
} catch {
  // jsdom not available — tests will be skipped
}

const describeIfDOMParser = hasDOMParser ? describe : describe.skip;

import { CitationStore } from "../../src/store/citationStore";
import {
  MAX_SUPPORTED_SCHEMA_VERSION,
  OBITER_NAMESPACE,
  StoreXmlError,
  deserializeStore,
  serializeStore,
} from "../../src/store/xmlSerializer";
import { FakeDocState, installFakeWord, makeCitation, storeXmlWith } from "./fakeWordHarness";

/** A plausible future-schema part: same root, higher version, unknown children. */
const V3_XML =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="3" aglcVersion="5">` +
  `<obiter:citation id="future-a" sourceType="case.reported" aglcVersion="5">` +
  `<obiter:field name="caseName">Future v Past</obiter:field>` +
  `<obiter:futureConcept kind="unknown-to-v2"/>` +
  `</obiter:citation>` +
  `</obiter:citationStore>`;

/** Legacy v1 layout: child elements inside <obiter:data>, scalars as siblings. */
const V1_XML =
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="1.0" aglcVersion="4">` +
  `<obiter:citation id="legacy-a" sourceType="case.reported">` +
  `<obiter:data><obiter:caseName>Mabo v Queensland</obiter:caseName></obiter:data>` +
  `<obiter:shortTitle>Mabo</obiter:shortTitle>` +
  `</obiter:citation>` +
  `</obiter:citationStore>`;

// ─── Deserializer guard ─────────────────────────────────────────────────────

describeIfDOMParser("deserializeStore newer-schema guard (SAFE-008)", () => {
  test('version="3" throws StoreXmlError with reason "newer-schema"', () => {
    expect.assertions(3);
    try {
      deserializeStore(V3_XML);
    } catch (err) {
      expect(err).toBeInstanceOf(StoreXmlError);
      expect((err as StoreXmlError).reason).toBe("newer-schema");
      expect((err as StoreXmlError).message).toContain("newer version of Obiter");
    }
  });

  test("any integer version above the supported maximum is rejected", () => {
    const xmlForVersion = (v: string): string =>
      `<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="${v}"></obiter:citationStore>`;
    expect(() => deserializeStore(xmlForVersion(String(MAX_SUPPORTED_SCHEMA_VERSION + 1)))).toThrow(
      StoreXmlError
    );
    expect(() => deserializeStore(xmlForVersion("99"))).toThrow(StoreXmlError);
  });

  test("v2 parsing is unchanged", () => {
    const xml = serializeStore([makeCitation("a"), makeCitation("b")]);
    const data = deserializeStore(xml);
    expect(data.metadata.schemaVersion).toBe("2");
    expect(data.citations.map((c) => c.id)).toEqual(["a", "b"]);
  });

  test('v1 parsing (including the historic "1.0" version string) is unchanged', () => {
    const data = deserializeStore(V1_XML);
    expect(data.metadata.schemaVersion).toBe("1.0");
    expect(data.citations).toHaveLength(1);
    expect(data.citations[0].id).toBe("legacy-a");
    expect(data.citations[0].data.caseName).toBe("Mabo v Queensland");
    expect(data.citations[0].shortTitle).toBe("Mabo");
  });
});

// ─── Store-level quarantine ─────────────────────────────────────────────────

describeIfDOMParser("future-schema part quarantine (SAFE-008)", () => {
  test('a v3 part is unreadable and quarantined, with errorReason "newer-schema" in diagnostics', async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const futurePart = doc.addPart(V3_XML);

    const store = new CitationStore();
    await store.initStore();

    const diag = store.getDiagnostics();
    expect(diag.status).toBe("unreadable");
    expect(diag.unreadableParts).toBe(1);
    // The structured reason lets the Recovery UI say "created by a newer
    // version of Obiter" instead of a generic corruption message.
    expect(diag.parts[0].errorReason).toBe("newer-schema");
    expect(diag.parts[0].error).toContain("newer version of Obiter");

    // Quarantined in place — never deleted, never adopted for writes.
    expect(doc.obiterParts()).toEqual([futurePart]);
    expect(futurePart.xml).toBe(V3_XML);
  });

  test("a v3 part is never persisted over: writes go to a new part, the v3 part survives byte-identical", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const futurePart = doc.addPart(V3_XML);

    const store = new CitationStore();
    await store.initStore();
    await store.add(makeCitation("mine"));

    const parts = doc.obiterParts();
    expect(parts).toContain(futurePart);
    expect(futurePart.xml).toBe(V3_XML);
    const otherParts = parts.filter((p) => p !== futurePart);
    expect(otherParts).toHaveLength(1);
    expect(deserializeStore(otherParts[0].xml).citations.map((c) => c.id)).toEqual(["mine"]);
  });

  test("a v3 part alongside a v2 part: v2 is selected, v3 stays quarantined", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const futurePart = doc.addPart(V3_XML);
    doc.addPart(storeXmlWith("a", "b"));

    const store = new CitationStore();
    await store.initStore();

    expect(store.getAll().map((c) => c.id).sort()).toEqual(["a", "b"]);
    const diag = store.getDiagnostics();
    expect(diag.status).toBe("recovered");
    expect(diag.parts.find((p) => p.partId === futurePart.id)?.errorReason).toBe("newer-schema");
    expect(doc.obiterParts()).toContain(futurePart);
  });
});
