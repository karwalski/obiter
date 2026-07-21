/**
 * @jest-environment jsdom
 *
 * SAFE-007 — Quarantined-part salvage (pure module).
 *
 * Fixture corpus per the AC: truncated XML, invalid control characters, a
 * half-written part, a wrong-root document, and an all-corrupt payload —
 * each must yield exactly the parseable subset of citations. Also covers
 * per-element failure isolation, v1-shape elements, id-dedup inside a
 * part, purity (same input, same output; input never modified), and the
 * merge-dedup helper (`filterNewCitations`).
 *
 * No Office mocks anywhere: salvage.ts is pure by design.
 */

import { salvageCitations, filterNewCitations } from "../../src/store/salvage";
import { OBITER_NAMESPACE, serializeCitation, serializeStore } from "../../src/store/xmlSerializer";
import { makeCitation } from "./fakeWordHarness";
import type { Citation } from "../../src/types/citation";

const STORE_OPEN = `<?xml version="1.0" encoding="UTF-8"?>\n<obiter:citationStore xmlns:obiter="${OBITER_NAMESPACE}" version="2" aglcVersion="4" standardId="aglc4" writingMode="academic">`;

describe("SAFE-007 — salvageCitations", () => {
  test("a fully readable part takes the strict path: every citation, no errors", () => {
    const xml = serializeStore([makeCitation("a"), makeCitation("b")]);

    const result = salvageCitations(xml);

    expect(result.citations.map((c) => c.id)).toEqual(["a", "b"]);
    expect(result.errors).toEqual([]);
  });

  test("truncated XML (crashed save) yields the citations before the cut", () => {
    const full = serializeStore([makeCitation("a"), makeCitation("b"), makeCitation("c")]);
    // Cut in the middle of citation "c": strict parse fails, salvage
    // truncates at the last complete </obiter:citation> (end of "b").
    const cutAt = full.lastIndexOf(`<obiter:citation id="c"`) + 40;
    const truncated = full.slice(0, cutAt);

    const result = salvageCitations(truncated);

    expect(result.citations.map((c) => c.id)).toEqual(["a", "b"]);
    // Field data survives intact on the salvaged subset.
    expect(result.citations[0].data.caseName).toBe("Case a");
    expect(result.citations[1].sourceType).toBe("case.reported");
  });

  test("XML-invalid control characters are stripped; tab is kept", () => {
    const dirty = makeCitation("dirty", {
      // NUL and BEL are invalid in XML 1.0 and must be stripped; the tab
      // in the middle is valid and must survive.
      data: { caseName: "Mabo \u0000v\tQueensland\u0007", year: "1992" },
    });
    // Serialized store with raw control chars in a field value plus a
    // dangling tail so the strict parse cannot succeed by other means.
    const xml = serializeStore([dirty, makeCitation("clean")]) + '\n<obiter:citation id="half';

    const result = salvageCitations(xml);

    expect(result.citations.map((c) => c.id)).toEqual(["dirty", "clean"]);
    expect(result.citations[0].data.caseName).toBe("Mabo v\tQueensland");
    expect(result.errors).toEqual([]);
  });

  test("a half-written part (no closing root, dangling element) yields the complete elements only", () => {
    const halfWritten =
      STORE_OPEN +
      "\n" +
      serializeCitation(makeCitation("done")) +
      `\n  <obiter:citation id="partial" sourceType="case.reported" aglcVersion="4">` +
      `\n    <obiter:field name="caseName">Unfinis`;

    const result = salvageCitations(halfWritten);

    expect(result.citations.map((c) => c.id)).toEqual(["done"]);
  });

  test("a wrong-root document still yields its complete citation elements", () => {
    const wrongRoot =
      `<?xml version="1.0"?><notObiter xmlns:obiter="${OBITER_NAMESPACE}">` +
      serializeCitation(makeCitation("x")) +
      serializeCitation(makeCitation("y")) +
      `</notObiter>`;

    const result = salvageCitations(wrongRoot);

    expect(result.citations.map((c) => c.id)).toEqual(["x", "y"]);
  });

  test("an all-corrupt payload yields no citations and reports the failure", () => {
    const result = salvageCitations("<<<< not xml at all >>>>");

    expect(result.citations).toEqual([]);
    expect(result.errors).toEqual(["No complete citation elements were found in the stored data."]);
  });

  test("an empty payload yields no citations and reports the failure", () => {
    const result = salvageCitations("");

    expect(result.citations).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("one unparseable element costs only itself, never its neighbours", () => {
    // "bad" contains a raw ampersand — invalid XML inside an otherwise
    // complete element. The document is left unclosed so strict parse fails.
    const corpus =
      STORE_OPEN +
      "\n" +
      serializeCitation(makeCitation("good-1")) +
      `\n  <obiter:citation id="bad" sourceType="case.reported" aglcVersion="4">` +
      `<obiter:field name="caseName">Smith & Jones</obiter:field></obiter:citation>` +
      "\n" +
      serializeCitation(makeCitation("good-2"));

    const result = salvageCitations(corpus);

    expect(result.citations.map((c) => c.id)).toEqual(["good-1", "good-2"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Citation element 2 could not be read");
  });

  test("v1-shape citation elements (child elements + <obiter:data>) are salvaged", () => {
    const v1Element =
      `  <obiter:citation id="v1-cit">` +
      `<obiter:data><obiter:caseName>Mabo v Queensland (No 2)</obiter:caseName>` +
      `<obiter:year>1992</obiter:year></obiter:data>` +
      `<obiter:shortTitle>Mabo</obiter:shortTitle>` +
      `<obiter:sourceType>case.reported</obiter:sourceType>` +
      `</obiter:citation>`;
    // Unclosed root forces the element-wise path.
    const corpus = STORE_OPEN + "\n" + v1Element;

    const result = salvageCitations(corpus);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].id).toBe("v1-cit");
    expect(result.citations[0].data.caseName).toBe("Mabo v Queensland (No 2)");
    expect(result.citations[0].shortTitle).toBe("Mabo");
  });

  test("duplicate copies of the same citation id within a part are collapsed to one", () => {
    const dupe = serializeCitation(makeCitation("dup"));
    const corpus = STORE_OPEN + "\n" + dupe + "\n" + dupe;

    const result = salvageCitations(corpus);

    expect(result.citations.map((c) => c.id)).toEqual(["dup"]);
    expect(result.errors).toEqual([]);
  });

  test("an element without an id is skipped and reported", () => {
    const corpus =
      STORE_OPEN +
      `\n  <obiter:citation sourceType="case.reported" aglcVersion="4">` +
      `<obiter:field name="caseName">No Id Case</obiter:field></obiter:citation>` +
      "\n" +
      serializeCitation(makeCitation("with-id"));

    const result = salvageCitations(corpus);

    expect(result.citations.map((c) => c.id)).toEqual(["with-id"]);
    expect(result.errors).toEqual(["Citation element 1 has no id and was skipped."]);
  });

  test("salvage is pure: repeated calls on the same input give identical results", () => {
    const full = serializeStore([makeCitation("a"), makeCitation("b")]);
    const corrupt = full.slice(0, full.length - 10);

    const first = salvageCitations(corrupt);
    const second = salvageCitations(corrupt);

    expect(second).toEqual(first);
  });
});

describe("SAFE-007 — filterNewCitations (merge-dedup rule)", () => {
  const salvaged: Citation[] = [
    makeCitation("already-present"),
    makeCitation("new-1"),
    makeCitation("new-1"), // duplicate within the salvaged set
    makeCitation("new-2"),
    makeCitation(""), // empty id — never mergeable
  ];

  test("keeps only citations whose id is new to the library, deduplicated", () => {
    const fresh = filterNewCitations(salvaged, new Set(["already-present"]));

    expect(fresh.map((c) => c.id)).toEqual(["new-1", "new-2"]);
  });

  test("with an empty library everything with a distinct non-empty id passes", () => {
    const fresh = filterNewCitations(salvaged, new Set());

    expect(fresh.map((c) => c.id)).toEqual(["already-present", "new-1", "new-2"]);
  });

  test("does not mutate its inputs", () => {
    const existing = new Set(["already-present"]);
    const before = salvaged.map((c) => c.id);

    filterNewCitations(salvaged, existing);

    expect(salvaged.map((c) => c.id)).toEqual(before);
    expect(Array.from(existing)).toEqual(["already-present"]);
  });
});
