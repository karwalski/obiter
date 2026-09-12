/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-002: the DOM-free XML reader used by the EndNote and Word codecs.
 */

import {
  child,
  children,
  decodeEntities,
  descend,
  element,
  encodeEntities,
  find,
  findAll,
  parseXml,
  textOf,
} from "../../../src/api/interchange/codecs/xmlLite";

describe("xmlLite", () => {
  test("parses nested elements, attributes and entities", () => {
    const doc = parseXml(
      '<?xml version="1.0"?><xml><records><record><ref-type name="Case (Reported)">17</ref-type>' +
        '<titles><title><style face="normal">Mabo &amp; Ors v Queensland &#40;No 2&#41;</style></title></titles>' +
        "</record></records></xml>"
    );
    const record = descend(doc, "xml", "records", "record");
    expect(record).toBeDefined();
    expect(child(record, "ref-type")?.attrs.name).toBe("Case (Reported)");
    expect(textOf(child(record, "ref-type"))).toBe("17");
    expect(textOf(descend(record, "titles", "title"))).toBe("Mabo & Ors v Queensland (No 2)");
  });

  test("handles CDATA, comments, self-closing tags and repeated children", () => {
    const doc = parseXml("<a><!-- comment --><b/><b>x</b><c><![CDATA[<raw> & text]]></c></a>");
    const a = child(doc, "a");
    expect(children(a, "b")).toHaveLength(2);
    expect(textOf(child(a, "c"))).toBe("<raw> & text");
    expect(find(doc, "c")?.name).toBe("c");
    expect(findAll(doc, "b")).toHaveLength(2);
  });

  test("never throws on malformed input", () => {
    expect(() => parseXml("<a><b>unclosed")).not.toThrow();
    expect(textOf(find(parseXml("<a><b>unclosed"), "b"))).toBe("unclosed");
    expect(() => parseXml("<a></b></a>")).not.toThrow();
    expect(() => parseXml("just text < not a tag")).not.toThrow();
    expect(parseXml("").children).toHaveLength(0);
  });

  test("quoted > inside attributes does not end the tag", () => {
    const doc = parseXml('<a title="x > y">t</a>');
    expect(child(doc, "a")?.attrs.title).toBe("x > y");
  });

  test("entities encode and decode symmetrically", () => {
    const raw = 'R & D <"x"> é';
    expect(decodeEntities(encodeEntities(raw))).toBe(raw);
    expect(decodeEntities("&#x41;&#66;&unknown;")).toBe("AB&unknown;");
  });

  test("element serialises with encoded content and attributes", () => {
    expect(element("title", "R & D", { face: "normal" })).toBe(
      '<title face="normal">R &amp; D</title>'
    );
    expect(element("a", [element("b", "1"), undefined, element("c", "2")])).toBe(
      "<a><b>1</b><c>2</c></a>"
    );
  });
});
