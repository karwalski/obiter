/**
 * XML Serializer/Deserializer Tests (Schema v2)
 *
 * Validates round-trip fidelity of the citation XML serialization system.
 * Tests cover:
 * - v2 format: attributes + <obiter:field> elements
 * - v1 backward compatibility: child elements + <obiter:data>
 * - v1 -> v2 migration (read v1, write v2, read back)
 * - Nested-encoded v1 data (HTML-encoded XML layers)
 */

// DOMParser/XMLSerializer polyfill for Node.js test environment
// jsdom provides these browser APIs in Node
let hasDOMParser = typeof DOMParser !== "undefined";
try {
  if (!hasDOMParser) {
    // Dynamic require to avoid ESM issues with jsdom
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = eval('require')("jsdom");
    const jsdom = new JSDOM();
    (global as Record<string, unknown>).DOMParser = jsdom.window.DOMParser;
    (global as Record<string, unknown>).XMLSerializer = jsdom.window.XMLSerializer;
    hasDOMParser = true;
  }
} catch {
  // jsdom not available — tests will be skipped
}

const describeIfDOMParser = hasDOMParser ? describe : describe.skip;

import {
  serializeCitation,
  deserializeCitation,
  serializeStore,
  deserializeStore,
} from "../../src/store/xmlSerializer";
import type { Citation } from "../../src/types/citation";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: "test-uuid-001",
    sourceType: "legislation.statute",
    aglcVersion: "4",
    data: {
      title: "Motorcycle Lane Filtering Trial: Final Evaluation Report",
      shortTitle: "Centre for Road Safety",
      year: 2018,
      jurisdiction: "NSW",
    },
    shortTitle: "Lane Filtering",
    firstFootnoteNumber: 3,
    tags: ["transport", "road-safety"],
    createdAt: "2026-01-15T10:30:00.000Z",
    modifiedAt: "2026-03-20T14:45:00.000Z",
    ...overrides,
  };
}

// ─── v2 Round-Trip Tests ────────────────────────────────────────────────────

describeIfDOMParser("xmlSerializer v2 round-trip", () => {
  test("citation-level shortTitle is preserved distinct from data.shortTitle", () => {
    const original = makeCitation();
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    // citation.shortTitle should be the citation-level value
    expect(restored.shortTitle).toBe("Lane Filtering");
    // data.shortTitle should be the data-level value
    expect(restored.data.shortTitle).toBe("Centre for Road Safety");
    // They must be different
    expect(restored.shortTitle).not.toBe(restored.data.shortTitle);
  });

  test("data fields (title, year, jurisdiction) survive round-trip", () => {
    const original = makeCitation();
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.data.title).toBe("Motorcycle Lane Filtering Trial: Final Evaluation Report");
    expect(restored.data.year).toBe(2018);
    expect(restored.data.jurisdiction).toBe("NSW");
  });

  test("citation-level timestamps are not confused with data fields", () => {
    const original = makeCitation({
      data: {
        title: "Some Act",
        createdAt: "this-is-data-createdAt",
      },
    });
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    // citation.createdAt should be the citation-level ISO timestamp
    expect(restored.createdAt).toBe("2026-01-15T10:30:00.000Z");
    // data.createdAt should be the data-level value
    expect(restored.data.createdAt).toBe("this-is-data-createdAt");
  });

  test("citation with no shortTitle returns undefined, not data.shortTitle", () => {
    const original = makeCitation({
      shortTitle: undefined,
      data: {
        title: "Some Long Title",
        shortTitle: "Short Version In Data",
      },
    });
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.shortTitle).toBeUndefined();
    expect(restored.data.shortTitle).toBe("Short Version In Data");
  });

  test("firstFootnoteNumber is correctly extracted at citation level", () => {
    const original = makeCitation();
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.firstFootnoteNumber).toBe(3);
  });

  test("tags survive round-trip", () => {
    const original = makeCitation();
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.tags).toEqual(["transport", "road-safety"]);
  });

  test("sourceType and id survive round-trip", () => {
    const original = makeCitation();
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.id).toBe("test-uuid-001");
    expect(restored.sourceType).toBe("legislation.statute");
  });

  test("aglcVersion at citation level is not confused with data.aglcVersion", () => {
    const original = makeCitation({
      aglcVersion: "4",
      data: {
        title: "Some Act",
        aglcVersion: "5",
      },
    });
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.aglcVersion).toBe("4");
    expect(String(restored.data.aglcVersion)).toBe("5");
  });

  test("XML special characters in values survive round-trip", () => {
    const original = makeCitation({
      data: {
        title: 'Smith & Jones <Partners> "Attorneys"',
        note: "It's a test",
      },
      shortTitle: "S&J <Test>",
    });
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.data.title).toBe('Smith & Jones <Partners> "Attorneys"');
    expect(restored.data.note).toBe("It's a test");
    expect(restored.shortTitle).toBe("S&J <Test>");
  });

  test("JSON objects in data survive round-trip", () => {
    const original = makeCitation({
      data: {
        authors: [{ givenNames: "Jane", surname: "Doe" }],
        title: "Test",
      },
    });
    const xml = serializeCitation(original);
    const restored = deserializeCitation(xml);

    expect(restored.data.authors).toEqual([{ givenNames: "Jane", surname: "Doe" }]);
  });
});

// ─── v2 Serialization Format Tests ──────────────────────────────────────────

describeIfDOMParser("xmlSerializer v2 format", () => {
  test("serialized XML uses field elements, not nested child elements", () => {
    const citation = makeCitation();
    const xml = serializeCitation(citation);

    // Should contain <obiter:field name="title">
    expect(xml).toContain('<obiter:field name="title">');
    // Should NOT contain <obiter:data>
    expect(xml).not.toContain("<obiter:data>");
    // Should NOT contain <obiter:title>
    expect(xml).not.toContain("<obiter:title>");
  });

  test("citation-level scalars are attributes, not child elements", () => {
    const citation = makeCitation();
    const xml = serializeCitation(citation);

    // shortTitle should be an attribute
    expect(xml).toContain('shortTitle="Lane Filtering"');
    // aglcVersion should be an attribute
    expect(xml).toContain('aglcVersion="4"');
    // firstFootnoteNumber should be an attribute
    expect(xml).toContain('firstFootnoteNumber="3"');
    // createdAt should be an attribute
    expect(xml).toContain('createdAt="2026-01-15T10:30:00.000Z"');

    // Should NOT have child element versions of these
    expect(xml).not.toContain("<obiter:shortTitle>");
    expect(xml).not.toContain("<obiter:aglcVersion>");
    expect(xml).not.toContain("<obiter:createdAt>");
    expect(xml).not.toContain("<obiter:modifiedAt>");
    expect(xml).not.toContain("<obiter:firstFootnoteNumber>");
  });

  test("store uses schemaVersion 2", () => {
    const xml = serializeStore([makeCitation()]);
    expect(xml).toContain('version="2"');
  });
});

// ─── Full Store v2 Round-Trip ───────────────────────────────────────────────

describeIfDOMParser("xmlSerializer store round-trip", () => {
  test("full store with multiple citations survives round-trip", () => {
    const c1 = makeCitation({
      id: "uuid-1",
      shortTitle: "Lane Filtering",
      data: {
        title: "Long Title One",
        shortTitle: "Data Short One",
      },
    });
    const c2 = makeCitation({
      id: "uuid-2",
      sourceType: "case.reported",
      shortTitle: "Smith v Jones",
      data: {
        caseName: "Smith v Jones",
        shortTitle: "Smith",
        year: 2020,
      },
    });

    const xml = serializeStore([c1, c2]);
    const store = deserializeStore(xml);

    expect(store.citations).toHaveLength(2);

    const r1 = store.citations[0];
    expect(r1.shortTitle).toBe("Lane Filtering");
    expect(r1.data.shortTitle).toBe("Data Short One");
    expect(r1.data.title).toBe("Long Title One");

    const r2 = store.citations[1];
    expect(r2.shortTitle).toBe("Smith v Jones");
    expect(r2.data.shortTitle).toBe("Smith");
    expect(r2.data.caseName).toBe("Smith v Jones");
  });

  test("store metadata attributes are preserved", () => {
    const xml = serializeStore(
      [makeCitation()],
      "2",
      "4",
      "aglc4",
      "court",
      "hca",
      42,
      "1.0.0",
      "parent-child",
    );
    const store = deserializeStore(xml);

    expect(store.metadata.schemaVersion).toBe("2");
    expect(store.metadata.aglcVersion).toBe("4");
    expect(store.metadata.standardId).toBe("aglc4");
    expect(store.metadata.writingMode).toBe("court");
    expect(store.metadata.courtJurisdiction).toBe("hca");
    expect(store.metadata.headingListId).toBe(42);
    expect(store.metadata.ccModel).toBe("parent-child");
  });

  test("generator info is preserved", () => {
    const xml = serializeStore([], "2", "4", "aglc4", "academic", undefined, undefined, "1.2.3");
    const store = deserializeStore(xml);

    expect(store.generator).toBeDefined();
    expect(store.generator?.name).toBe("Obiter");
    expect(store.generator?.version).toBe("1.2.3");
  });
});

// ─── v1 Backward Compatibility ──────────────────────────────────────────────

describeIfDOMParser("xmlSerializer v1 backward compatibility", () => {
  test("manually constructed v1 XML with duplicate field names at different levels", () => {
    const xml = `<obiter:citation xmlns:obiter="urn:obiter:aglc" id="manual-001" sourceType="legislation.statute">
    <obiter:data>
      <obiter:title>Road Transport Act 2013</obiter:title>
      <obiter:shortTitle>RTA</obiter:shortTitle>
      <obiter:jurisdiction>NSW</obiter:jurisdiction>
      <obiter:year>2013</obiter:year>
    </obiter:data>
    <obiter:shortTitle>Road Transport</obiter:shortTitle>
    <obiter:firstFootnoteNumber>5</obiter:firstFootnoteNumber>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-02T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
  </obiter:citation>`;

    const citation = deserializeCitation(xml);

    // Citation-level fields
    expect(citation.id).toBe("manual-001");
    expect(citation.sourceType).toBe("legislation.statute");
    expect(citation.shortTitle).toBe("Road Transport");
    expect(citation.firstFootnoteNumber).toBe(5);
    expect(citation.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(citation.modifiedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(citation.aglcVersion).toBe("4");

    // Data-level fields
    expect(citation.data.title).toBe("Road Transport Act 2013");
    expect(citation.data.shortTitle).toBe("RTA");
    expect(citation.data.jurisdiction).toBe("NSW");
    expect(citation.data.year).toBe(2013);
  });

  test("v1 citation with no citation-level shortTitle does not inherit data.shortTitle", () => {
    const xml = `<obiter:citation xmlns:obiter="urn:obiter:aglc" id="manual-002" sourceType="report">
    <obiter:data>
      <obiter:title>Lane Filtering Evaluation</obiter:title>
      <obiter:shortTitle>Centre for Road Safety</obiter:shortTitle>
    </obiter:data>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-02T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
  </obiter:citation>`;

    const citation = deserializeCitation(xml);

    expect(citation.shortTitle).toBeUndefined();
    expect(citation.data.shortTitle).toBe("Centre for Road Safety");
    expect(citation.data.title).toBe("Lane Filtering Evaluation");
  });

  test("v1 store XML with version 1.0 is deserialized correctly", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<obiter:citationStore xmlns:obiter="urn:obiter:aglc" version="1.0" aglcVersion="4" standardId="aglc4" writingMode="academic">
  <obiter:citation id="v1-001" sourceType="legislation.statute">
    <obiter:data>
      <obiter:title>Road Rules 2014</obiter:title>
      <obiter:shortTitle>Road Rules</obiter:shortTitle>
    </obiter:data>
    <obiter:shortTitle>Road Rules Short</obiter:shortTitle>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-01T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
    <obiter:tags>
      <obiter:tag>transport</obiter:tag>
    </obiter:tags>
  </obiter:citation>
</obiter:citationStore>`;

    const store = deserializeStore(xml);
    expect(store.metadata.schemaVersion).toBe("1.0");
    expect(store.citations).toHaveLength(1);

    const c = store.citations[0];
    expect(c.id).toBe("v1-001");
    expect(c.shortTitle).toBe("Road Rules Short");
    expect(c.data.shortTitle).toBe("Road Rules");
    expect(c.data.title).toBe("Road Rules 2014");
    expect(c.tags).toEqual(["transport"]);
  });
});

// ─── v1 -> v2 Migration ────────────────────────────────────────────────────

describeIfDOMParser("xmlSerializer v1 -> v2 migration", () => {
  test("read v1, write v2, read back — all data preserved", () => {
    // v1 format XML
    const v1Xml = `<obiter:citation xmlns:obiter="urn:obiter:aglc" id="migrate-001" sourceType="legislation.statute">
    <obiter:data>
      <obiter:title>Road Transport Act 2013</obiter:title>
      <obiter:shortTitle>RTA</obiter:shortTitle>
      <obiter:jurisdiction>NSW</obiter:jurisdiction>
      <obiter:year>2013</obiter:year>
    </obiter:data>
    <obiter:shortTitle>Road Transport</obiter:shortTitle>
    <obiter:firstFootnoteNumber>5</obiter:firstFootnoteNumber>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-02T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
    <obiter:tags>
      <obiter:tag>transport</obiter:tag>
      <obiter:tag>nsw</obiter:tag>
    </obiter:tags>
  </obiter:citation>`;

    // Step 1: Read v1
    const fromV1 = deserializeCitation(v1Xml);

    // Step 2: Write v2
    const v2Xml = serializeCitation(fromV1);

    // Verify it is v2 format
    expect(v2Xml).toContain('<obiter:field name="title">');
    expect(v2Xml).not.toContain("<obiter:data>");

    // Step 3: Read v2 back
    // Wrap in a namespace-aware root for DOMParser
    const restored = deserializeCitation(v2Xml);

    // All fields preserved
    expect(restored.id).toBe("migrate-001");
    expect(restored.sourceType).toBe("legislation.statute");
    expect(restored.aglcVersion).toBe("4");
    expect(restored.shortTitle).toBe("Road Transport");
    expect(restored.firstFootnoteNumber).toBe(5);
    expect(restored.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(restored.modifiedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(restored.data.title).toBe("Road Transport Act 2013");
    expect(restored.data.shortTitle).toBe("RTA");
    expect(restored.data.jurisdiction).toBe("NSW");
    expect(restored.data.year).toBe(2013);
    expect(restored.tags).toEqual(["transport", "nsw"]);
  });

  test("full store migration: v1 store -> deserialize -> serialize v2 -> deserialize", () => {
    const v1Store = `<?xml version="1.0" encoding="UTF-8"?>
<obiter:citationStore xmlns:obiter="urn:obiter:aglc" version="1.0" aglcVersion="4" standardId="aglc4" writingMode="academic">
  <obiter:generator name="Obiter" version="0.9.0" standard="aglc4" mode="academic" />
  <obiter:citation id="v1-a" sourceType="case.reported">
    <obiter:data>
      <obiter:caseName>Smith v Jones</obiter:caseName>
      <obiter:shortTitle>Smith</obiter:shortTitle>
      <obiter:year>2020</obiter:year>
    </obiter:data>
    <obiter:shortTitle>Smith v Jones</obiter:shortTitle>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-01T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
  </obiter:citation>
</obiter:citationStore>`;

    // Read v1 store
    const store = deserializeStore(v1Store);
    expect(store.citations).toHaveLength(1);
    expect(store.citations[0].shortTitle).toBe("Smith v Jones");
    expect(store.citations[0].data.shortTitle).toBe("Smith");

    // Write v2 store
    const v2StoreXml = serializeStore(
      store.citations,
      "2",
      store.metadata.aglcVersion,
      store.metadata.standardId,
      store.metadata.writingMode,
    );

    // Read v2 store back
    const v2Store = deserializeStore(v2StoreXml);
    expect(v2Store.metadata.schemaVersion).toBe("2");
    expect(v2Store.citations).toHaveLength(1);
    expect(v2Store.citations[0].shortTitle).toBe("Smith v Jones");
    expect(v2Store.citations[0].data.shortTitle).toBe("Smith");
    expect(v2Store.citations[0].data.caseName).toBe("Smith v Jones");
  });
});

// ─── Nested-Encoded v1 Data ─────────────────────────────────────────────────

describeIfDOMParser("xmlSerializer nested-encoded v1 data", () => {
  test("HTML-encoded XML inside <obiter:data> is decoded and parsed", () => {
    // Simulates a double-save bug where the data content got HTML-encoded
    const xml = `<obiter:citation xmlns:obiter="urn:obiter:aglc" id="encoded-001" sourceType="legislation.statute">
    <obiter:data>&lt;obiter:title&gt;Road Rules 2014&lt;/obiter:title&gt;&lt;obiter:year&gt;2014&lt;/obiter:year&gt;</obiter:data>
    <obiter:shortTitle>Road Rules</obiter:shortTitle>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-01T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
  </obiter:citation>`;

    const citation = deserializeCitation(xml);

    expect(citation.data.title).toBe("Road Rules 2014");
    expect(citation.data.year).toBe(2014);
    expect(citation.shortTitle).toBe("Road Rules");
  });

  test("double-encoded XML inside <obiter:data> is decoded", () => {
    // Two layers of HTML encoding
    const xml = `<obiter:citation xmlns:obiter="urn:obiter:aglc" id="encoded-002" sourceType="legislation.statute">
    <obiter:data>&amp;lt;obiter:title&amp;gt;Test Act&amp;lt;/obiter:title&amp;gt;</obiter:data>
    <obiter:createdAt>2026-01-01T00:00:00.000Z</obiter:createdAt>
    <obiter:modifiedAt>2026-01-01T00:00:00.000Z</obiter:modifiedAt>
    <obiter:aglcVersion>4</obiter:aglcVersion>
  </obiter:citation>`;

    const citation = deserializeCitation(xml);

    expect(citation.data.title).toBe("Test Act");
  });
});
