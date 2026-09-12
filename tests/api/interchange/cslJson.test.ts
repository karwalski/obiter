/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-003: the CSL-JSON codec (Zotero, Mendeley, Better BibTeX).
 */

import * as fs from "fs";
import * as path from "path";

import { getCodec, hasCodec } from "../../../src/api/interchange/codec";
import { cslJsonCodec, normaliseJurisdiction } from "../../../src/api/interchange/codecs/cslJson";
import type { InterchangeRecord } from "../../../src/api/interchange/model";
import { createRecord } from "../../../src/api/interchange/model";

const FIXTURES = path.resolve(__dirname, "../../fixtures/interchange/csl");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf-8");
}

function parseFixture(name: string): InterchangeRecord[] {
  const result = cslJsonCodec.parse(fixture(name));
  expect(result.issues.filter((i) => i.severity === "error")).toEqual([]);
  return result.records;
}

describe("cslJsonCodec contract", () => {
  test("describes itself and registers on load", () => {
    expect(cslJsonCodec.format).toBe("csl-json");
    expect(cslJsonCodec.label).toBe("CSL-JSON");
    expect(cslJsonCodec.extensions).toEqual([".json"]);
    expect(cslJsonCodec.mimeType).toBe("application/json");
    expect(cslJsonCodec.canExport).toBe(true);
    expect(hasCodec("csl-json")).toBe(true);
    expect(getCodec("csl-json")).toBe(cslJsonCodec);
  });
});

describe("sniff", () => {
  test("scores a CSL array or object with type and title or id at 0.9", () => {
    expect(cslJsonCodec.sniff(fixture("zotero-legal_case.json"))).toBe(0.9);
    expect(cslJsonCodec.sniff(fixture("single-item.json"))).toBe(0.9);
    expect(cslJsonCodec.sniff('  \n[{"id": "x", "type": "book"}]')).toBe(0.9);
  });

  test("scores bare JSON at 0.3 and excludes Obiter library JSON", () => {
    expect(cslJsonCodec.sniff('{"foo": "bar"}')).toBe(0.3);
    expect(cslJsonCodec.sniff("[1, 2, 3]")).toBe(0.3);
    expect(
      cslJsonCodec.sniff('[{"id": "c1", "sourceType": "book", "type": "x", "title": "y"}]')
    ).toBe(0.3);
  });

  test("scores non-JSON at 0", () => {
    expect(cslJsonCodec.sniff("TY  - JOUR\nTI  - Title\nER  - ")).toBe(0);
    expect(cslJsonCodec.sniff("@article{key, title = {x}}")).toBe(0);
    expect(cslJsonCodec.sniff("")).toBe(0);
  });
});

describe("parse: legal fixtures", () => {
  test("Zotero legal_case maps to a case with the legal block filled", () => {
    const [record] = parseFixture("zotero-legal_case.json");
    expect(record.kind).toBe("case");
    expect(record.provenance).toMatchObject({
      format: "csl-json",
      rawType: "legal_case",
      rawId: "mabo1992",
    });
    expect(record.title).toBe("Mabo v Queensland (No 2)");
    expect(record.legal).toMatchObject({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      courtName: "High Court of Australia",
      jurisdiction: "Cth",
      docket: "F.C. 92/014",
    });
    expect(record.issued).toEqual({ year: 1992, month: 6, day: 3 });
    expect(record.identifiers).toMatchObject({
      url: "http://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html",
      citeKey: "mabo1992",
    });
    expect(record.notes).toEqual(["Landmark native title decision."]);
    expect(record.containerTitle).toBeUndefined();
    expect(record.volume).toBeUndefined();
  });

  test("Zotero legislation maps container-title to code and jurisdiction", () => {
    const [record] = parseFixture("zotero-legislation.json");
    expect(record.kind).toBe("legislation");
    expect(record.title).toBe("Native Title Act 1993");
    expect(record.passthrough.code).toBe("Cth");
    expect(record.legal).toMatchObject({
      jurisdiction: "Cth",
      section: "223",
      actNumber: "110",
    });
    expect(record.issued).toEqual({ year: 1993 });
    expect(record.passthrough.authority).toBe("Parliament of Australia");
    expect(record.containerTitle).toBeUndefined();
  });

  test("Zotero bill maps authority to legislature and number to documentNumber", () => {
    const [record] = parseFixture("zotero-bill.json");
    expect(record.kind).toBe("bill");
    expect(record.legal).toMatchObject({
      legislature: "House of Representatives",
      documentNumber: "93/1",
      session: "37th Parliament",
      jurisdiction: "Cth",
    });
    expect(record.issued).toEqual({ year: 1993, month: 11, day: 16 });
  });
});

describe("parse: secondary sources", () => {
  const records = parseFixture("zotero-mixed.json");
  const byId = (id: string): InterchangeRecord => {
    const found = records.find((r) => r.provenance.rawId === id);
    if (!found) throw new Error(`No record ${id}`);
    return found;
  };

  test("reads every item with its kind", () => {
    expect(records.map((r) => r.kind)).toEqual([
      "article",
      "book",
      "chapter",
      "web",
      "report",
      "thesis",
    ]);
  });

  test("journal article: container, volume, issue, page range, keywords", () => {
    const article = byId("luntz2005");
    expect(article.creators).toEqual([
      { role: "author", family: "Luntz", given: "Harold", raw: "Harold Luntz" },
    ]);
    expect(article.containerTitle).toBe("Melbourne University Law Review");
    expect(article.containerTitleShort).toBe("MULR");
    expect(article.volume).toBe("27");
    expect(article.issue).toBe("3");
    expect(article.pageRange).toBe("393-420");
    expect(article.pageFirst).toBe("393");
    expect(article.pageLast).toBe("420");
    expect(article.issued).toEqual({ year: 2005 });
    expect(article.keywords).toEqual(["negligence", "policy", "torts"]);
    expect(article.abstract).toBe("Examines the role of policy in negligence.");
    expect(article.identifiers).toMatchObject({ issn: "0025-8938", doi: "10.1000/example" });
    expect(article.legal).toBeUndefined();
  });

  test("book: two authors, numeric edition stringified, publisher and place", () => {
    const book = byId("edelman2016");
    expect(book.creators.map((c) => c.family)).toEqual(["Edelman", "Bant"]);
    expect(book.edition).toBe("2");
    expect(book.publisher).toBe("Hart Publishing");
    expect(book.place).toBe("Oxford");
    expect(book.identifiers.isbn).toBe("9781849466493");
  });

  test("chapter: editor role and en-dash page range", () => {
    const chapter = byId("gardner2011");
    expect(chapter.creators).toEqual([
      { role: "author", family: "Gardner", given: "John", raw: "John Gardner" },
      { role: "editor", family: "Oberdiek", given: "John", raw: "John Oberdiek" },
    ]);
    expect(chapter.containerTitle).toBe("Philosophical Foundations of the Law of Torts");
    expect(chapter.pageRange).toBe("5–35");
    expect(chapter.pageFirst).toBe("5");
    expect(chapter.pageLast).toBe("35");
  });

  test("webpage: literal author, URL and accessed date", () => {
    const web = byId("hca-about");
    expect(web.creators).toEqual([
      { role: "author", literal: "High Court of Australia", raw: "High Court of Australia" },
    ]);
    expect(web.identifiers.url).toBe("https://www.hcourt.gov.au/about/about-the-court");
    expect(web.accessed).toEqual({ year: 2026, month: 9, day: 12 });
  });

  test("report: body author, number and month precision", () => {
    const report = byId("alrc99");
    expect(report.creators[0]).toMatchObject({ literal: "Australian Law Reform Commission" });
    expect(report.number).toBe("99");
    expect(report.genre).toBe("Report");
    expect(report.issued).toEqual({ year: 2004, month: 6 });
    expect(report.place).toBe("Sydney");
  });

  test("thesis: raw date, unknown keys kept in passthrough", () => {
    const thesis = byId("watt2020");
    expect(thesis.genre).toBe("PhD Thesis");
    expect(thesis.issued).toEqual({ year: 2020, raw: "Spring 2020" });
    expect(thesis.passthrough.archive_location).toBe("Box 3");
    expect(thesis.passthrough.custom).toBe('{"obiter":true}');
  });
});

describe("parse: shapes and errors", () => {
  test("accepts a single item object", () => {
    const result = cslJsonCodec.parse(fixture("single-item.json"));
    expect(result.records).toHaveLength(1);
    expect(result.records[0].kind).toBe("article");
    expect(result.records[0].title).toBe("A Single Item");
  });

  test("lifts obiter-id, obiter-type and formatted lines out of the note", () => {
    const [record] = parseFixture("single-item.json");
    expect(record.provenance.obiterId).toBe("cit-123");
    expect(record.provenance.obiterSourceType).toBe("journal.article");
    expect(record.passthrough["formatted-footnote"]).toBe(
      "Jane Smith, 'A Single Item' (2018) 40 Sydney Law Review."
    );
    expect(record.notes).toEqual(["Keep this note."]);
  });

  test("truncated JSON yields a parse-error issue, not a throw", () => {
    const result = cslJsonCodec.parse(fixture("invalid.json"));
    expect(result.records).toEqual([]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ severity: "error", code: "parse-error" });
    expect(result.issues[0].message).toMatch(/^Could not read the CSL-JSON: /);
    expect(result.issues[0].message).toMatch(
      /Export the library again from Zotero or Mendeley and try again\.$/
    );
  });

  test("a top-level scalar is a parse error", () => {
    const result = cslJsonCodec.parse("42");
    expect(result.records).toEqual([]);
    expect(result.issues[0]).toMatchObject({ severity: "error", code: "parse-error" });
  });

  test("non-object entries are skipped with a warning", () => {
    const result = cslJsonCodec.parse('[{"id":"a","type":"book","title":"A"}, "junk", null]');
    expect(result.records).toHaveLength(1);
    expect(result.issues.filter((i) => i.severity === "warning")).toHaveLength(2);
    expect(result.issues[0]).toMatchObject({ code: "parse-error", recordIndex: 1 });
  });

  test("unknown or missing type falls back to generic with a warning", () => {
    const result = cslJsonCodec.parse('[{"id":"a","type":"hologram","title":"A"},{"id":"b"}]');
    expect(result.records.map((r) => r.kind)).toEqual(["generic", "generic"]);
    expect(result.records[0].provenance.rawType).toBe("hologram");
    expect(result.issues.map((i) => i.code)).toEqual(["unsupported-type", "unsupported-type"]);
    expect(result.issues[0].recordIndex).toBe(0);
    expect(result.issues[1].recordIndex).toBe(1);
  });

  test("strips a BOM and reads issued given as a string", () => {
    const result = cslJsonCodec.parse(
      '\uFEFF{"id":"x","type":"book","title":"T","issued":"21 October 2020"}'
    );
    expect(result.records[0].issued).toEqual({ year: 2020, month: 10, day: 21 });
  });

  test("normalises jurisdiction codes and keeps unknown text", () => {
    expect(normaliseJurisdiction("au")).toBe("Cth");
    expect(normaliseJurisdiction("au-nsw")).toBe("NSW");
    expect(normaliseJurisdiction("AU-VIC")).toBe("Vic");
    expect(normaliseJurisdiction("au-qld")).toBe("Qld");
    expect(normaliseJurisdiction("au-wa")).toBe("WA");
    expect(normaliseJurisdiction("au-sa")).toBe("SA");
    expect(normaliseJurisdiction("au-tas")).toBe("Tas");
    expect(normaliseJurisdiction("au-act")).toBe("ACT");
    expect(normaliseJurisdiction("au-nt")).toBe("NT");
    expect(normaliseJurisdiction("gb")).toBe("UK");
    expect(normaliseJurisdiction("uk")).toBe("UK");
    expect(normaliseJurisdiction("nz")).toBe("NZ");
    expect(normaliseJurisdiction("us")).toBe("US");
    expect(normaliseJurisdiction("ca")).toBe("Canada");
    expect(normaliseJurisdiction("Cth")).toBe("Cth");
    expect(normaliseJurisdiction("Papua New Guinea")).toBe("Papua New Guinea");
  });
});

describe("serialise", () => {
  function fullRecord(): InterchangeRecord {
    const record = createRecord("article", {
      format: "csl-json",
      rawType: "article-journal",
      rawId: "luntz2005",
      obiterId: "cit-42",
      obiterSourceType: "journal.article",
    });
    record.title = "The Use of Policy in Negligence Cases";
    record.shortTitle = "Policy in Negligence";
    record.creators = [
      { role: "author", family: "Luntz", given: "Harold", raw: "Harold Luntz" },
      { role: "editor", literal: "Melbourne Law School", raw: "Melbourne Law School" },
      {
        role: "translator",
        family: "Roberts",
        given: "John",
        suffix: "Jr",
        raw: "John Roberts Jr",
      },
    ];
    record.containerTitle = "Melbourne University Law Review";
    record.containerTitleShort = "MULR";
    record.collectionTitle = "Torts Series";
    record.issued = { year: 2005, month: 3, day: 1 };
    record.accessed = { year: 2026, month: 9, day: 12 };
    record.eventDate = { year: 2004, month: 11 };
    record.volume = "27";
    record.issue = "3";
    record.number = "7";
    record.pageRange = "393-420";
    record.pageFirst = "393";
    record.pageLast = "420";
    record.publisher = "Melbourne University Press";
    record.place = "Melbourne";
    record.edition = "2";
    record.genre = "Article";
    record.medium = "Print";
    record.event = "Torts Conference";
    record.eventPlace = "Sydney";
    record.language = "en-AU";
    record.legal = { jurisdiction: "Vic", section: "4", history: "Reprinted", session: "2005" };
    record.identifiers = {
      url: "https://example.org/luntz",
      doi: "10.1000/example",
      isbn: "9780000000000",
      issn: "0025-8938",
      citeKey: "luntz2005",
    };
    record.keywords = ["negligence", "policy"];
    record.abstract = "Examines the role of policy.";
    record.notes = ["First note", "Second note"];
    record.passthrough = {
      archive: "Trove",
      custom: '{"obiter":true}',
      "call-number": ["KM 1", "KM 2"],
    };
    return record;
  }

  test("writes keys in CSL order with formatted lines in the note", () => {
    const record = fullRecord();
    record.formatted = {
      standard: "AGLC4",
      footnote: "Harold Luntz, 'Policy' (2005) 27(3) MULR 393.",
      bibliography: "Luntz, Harold, 'Policy' (2005) 27(3) MULR 393",
    };
    const text = cslJsonCodec.serialise([record]);
    const items = JSON.parse(text) as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    const item = items[0];
    expect(Object.keys(item)).toEqual([
      "id",
      "type",
      "citation-key",
      "title",
      "title-short",
      "author",
      "editor",
      "translator",
      "container-title",
      "container-title-short",
      "collection-title",
      "issued",
      "accessed",
      "event-date",
      "volume",
      "issue",
      "number",
      "page",
      "publisher",
      "publisher-place",
      "edition",
      "genre",
      "medium",
      "event",
      "event-place",
      "jurisdiction",
      "section",
      "references",
      "chapter-number",
      "URL",
      "DOI",
      "ISBN",
      "ISSN",
      "language",
      "abstract",
      "keyword",
      "note",
      "archive",
      "custom",
      "call-number",
    ]);
    expect(item.id).toBe("luntz2005");
    expect(item.type).toBe("article-journal");
    expect(item.author).toEqual([{ family: "Luntz", given: "Harold" }]);
    expect(item.editor).toEqual([{ literal: "Melbourne Law School" }]);
    expect(item.translator).toEqual([{ family: "Roberts", given: "John", suffix: "Jr" }]);
    expect(item.issued).toEqual({ "date-parts": [[2005, 3, 1]] });
    expect(item["event-date"]).toEqual({ "date-parts": [[2004, 11]] });
    expect(item.page).toBe("393-420");
    expect(item.keyword).toBe("negligence, policy");
    expect(item.note).toBe(
      [
        "First note",
        "Second note",
        "obiter-id: cit-42",
        "obiter-type: journal.article",
        "AGLC4 footnote: Harold Luntz, 'Policy' (2005) 27(3) MULR 393.",
        "AGLC4 bibliography: Luntz, Harold, 'Policy' (2005) 27(3) MULR 393",
      ].join("\n")
    );
    expect(item.custom).toEqual({ obiter: true });
    expect(item["call-number"]).toEqual(["KM 1", "KM 2"]);
    expect(text).toBe(JSON.stringify(items, null, 2));
  });

  test("omits formatted lines when includeFormatted is false", () => {
    const record = fullRecord();
    record.formatted = { standard: "AGLC4", footnote: "Footnote text." };
    const [item] = JSON.parse(
      cslJsonCodec.serialise([record], { includeFormatted: false })
    ) as Record<string, unknown>[];
    expect(item.note).toBe(
      ["First note", "Second note", "obiter-id: cit-42", "obiter-type: journal.article"].join("\n")
    );
  });

  test("round trip: serialise then parse yields an equal full record", () => {
    const record = fullRecord();
    const text = cslJsonCodec.serialise([record]);
    const result = cslJsonCodec.parse(text);
    expect(result.issues).toEqual([]);
    expect(result.records).toEqual([record]);
  });

  test("round trip: a case keeps its legal block", () => {
    const [original] = parseFixture("zotero-legal_case.json");
    const text = cslJsonCodec.serialise([original]);
    const [item] = JSON.parse(text) as Record<string, unknown>[];
    expect(item["container-title"]).toBe("CLR");
    expect(item.volume).toBe("175");
    expect(item.page).toBe("1");
    expect(item.number).toBe("F.C. 92/014");
    expect(item.authority).toBe("High Court of Australia");
    expect(item.jurisdiction).toBe("Cth");
    const [again] = cslJsonCodec.parse(text).records;
    expect(again).toEqual(original);
  });

  test("round trip: legislation and bill re-emit code and legislature", () => {
    const [act] = parseFixture("zotero-legislation.json");
    const [bill] = parseFixture("zotero-bill.json");
    const items = JSON.parse(cslJsonCodec.serialise([act, bill])) as Record<string, unknown>[];
    expect(items[0]["container-title"]).toBe("Cth");
    expect(items[0].volume).toBe("110");
    expect(items[0].section).toBe("223");
    expect(items[0].authority).toBe("Parliament of Australia");
    expect(items[0].code).toBeUndefined();
    expect(items[1].authority).toBe("House of Representatives");
    expect(items[1].number).toBe("93/1");
    expect(items[1]["chapter-number"]).toBe("37th Parliament");
    const again = cslJsonCodec.parse(JSON.stringify(items)).records;
    expect(again).toEqual([act, bill]);
  });

  test("round trip: the mixed library survives intact", () => {
    const originals = parseFixture("zotero-mixed.json");
    const again = cslJsonCodec.parse(cslJsonCodec.serialise(originals)).records;
    expect(again).toEqual(originals);
  });

  test("uses obiterId as the id when there is no raw id, and CRLF on request", () => {
    const record = createRecord("book", {
      format: "csl-json",
      rawType: "book",
      obiterId: "cit-9",
    });
    record.title = "T";
    const text = cslJsonCodec.serialise([record], { lineEnding: "\r\n" });
    expect(text).toContain("\r\n");
    const [item] = JSON.parse(text) as Record<string, unknown>[];
    expect(item.id).toBe("cit-9");
    expect(item.note).toBe("obiter-id: cit-9");
  });
});
