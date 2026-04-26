/**
 * XML Serializer/Deserializer Tests
 *
 * Validates round-trip fidelity of the citation XML serialization system.
 * Specifically tests for the duplicate field name bug where fields like
 * shortTitle, createdAt, etc. inside <obiter:data> would shadow the
 * citation-level fields of the same name.
 */

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

// ─── Round-Trip Tests ────────────────────────────────────────────────────────

describe("xmlSerializer round-trip", () => {
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

// ─── Full Store Round-Trip ───────────────────────────────────────────────────

describe("xmlSerializer store round-trip", () => {
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
});

// ─── Regression: Manually constructed XML ────────────────────────────────────

describe("xmlSerializer manual XML parsing", () => {
  test("manually constructed XML with duplicate field names at different levels", () => {
    const xml = `<obiter:citation id="manual-001" sourceType="legislation.statute">
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

  test("citation with no citation-level shortTitle does not inherit data.shortTitle", () => {
    const xml = `<obiter:citation id="manual-002" sourceType="report">
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
});
