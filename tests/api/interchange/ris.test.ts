/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-003: the RIS codec — parse, serialise, sniff and round trip.
 */

import * as fs from "fs";
import * as path from "path";

import { getCodec, hasCodec } from "../../../src/api/interchange/codec";
import type { InterchangeRecord } from "../../../src/api/interchange/model";
import { parseRisRecords, risCodec } from "../../../src/api/interchange/codecs/ris";

const FIXTURES = path.resolve(__dirname, "../../fixtures/interchange/ris");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf-8");
}

function parseFixture(name: string): ReturnType<typeof risCodec.parse> {
  return risCodec.parse(fixture(name));
}

describe("risCodec registration and sniffing", () => {
  test("registers itself on load", () => {
    expect(hasCodec("ris")).toBe(true);
    expect(getCodec("ris")).toBe(risCodec);
    expect(risCodec.format).toBe("ris");
    expect(risCodec.label).toBe("RIS");
    expect(risCodec.extensions).toEqual([".ris"]);
    expect(risCodec.mimeType).toBe("application/x-research-info-systems");
    expect(risCodec.canExport).toBe(true);
  });

  test("sniff scores a well-formed file at 1.0 and lower-case tags at 0.75", () => {
    expect(risCodec.sniff(fixture("primo-article.ris"))).toBe(1);
    expect(risCodec.sniff("TY  - JOUR\nTI  - Title\n")).toBe(0.95);
    expect(risCodec.sniff("TY - JOUR\nTI - Title\nER -\n")).toBe(1);
    // The edge fixture's second record has an upper-case TY, so it scores fully.
    expect(risCodec.sniff(fixture("edge-cases.ris"))).toBe(1);
    expect(risCodec.sniff("ty  - JOUR\nti  - Title\ner  - \n")).toBe(0.75);
    expect(risCodec.sniff("ty  - JOUR\nti  - Title\n")).toBe(0.7);
  });

  test("sniff returns 0 for other formats", () => {
    expect(risCodec.sniff("@article{key, title = {x}}")).toBe(0);
    expect(risCodec.sniff('[{"id": "x", "type": "book"}]')).toBe(0);
    expect(risCodec.sniff("")).toBe(0);
    expect(risCodec.sniff("A paragraph that mentions TY  - JOUR mid-line")).toBe(0);
  });
});

describe("risCodec.parse fixtures", () => {
  test("Trove book", () => {
    const { records, issues } = parseFixture("trove-book.ris");
    expect(issues).toEqual([]);
    expect(records).toHaveLength(1);
    const [book] = records;
    expect(book.kind).toBe("book");
    expect(book.title).toBe("Unjust Enrichment");
    expect(book.creators).toEqual([
      { role: "author", raw: "Edelman, James", family: "Edelman", given: "James" },
      { role: "author", raw: "Bant, Elise", family: "Bant", given: "Elise" },
    ]);
    expect(book.publisher).toBe("Hart Publishing");
    expect(book.place).toBe("Oxford");
    expect(book.issued).toEqual({ year: 2016 });
    expect(book.edition).toBe("2");
    expect(book.identifiers.isbn).toBe("9781849464017");
    expect(book.identifiers.issn).toBeUndefined();
    expect(book.keywords).toEqual(["Restitution -- Australia", "Unjust enrichment -- Australia"]);
    expect(book.provenance).toEqual({
      format: "ris",
      rawType: "BOOK",
      rawId: "trove-218374651",
      sourceLabel: "Trove",
    });
    expect(book.passthrough).toEqual({});
  });

  test("Primo journal article", () => {
    const { records, issues } = parseFixture("primo-article.ris");
    expect(issues).toEqual([]);
    const [article] = records;
    expect(article.kind).toBe("article");
    expect(article.creators).toEqual([
      { role: "author", raw: "Luntz, Harold", family: "Luntz", given: "Harold" },
    ]);
    expect(article.title).toBe("Loss of Chance in Medical Negligence");
    expect(article.containerTitle).toBe("Sydney Law Review");
    expect(article.volume).toBe("27");
    expect(article.issue).toBe("3");
    expect(article.pageFirst).toBe("393");
    expect(article.pageLast).toBe("420");
    expect(article.pageRange).toBe("393-420");
    expect(article.issued).toEqual({ year: 2005 });
    expect(article.identifiers).toEqual({
      issn: "0036-6250",
      doi: "10.1234/slr.2005.27.3",
      url: "https://www.austlii.edu.au/au/journals/SydLawRw/2005/20.html",
      urls: ["https://www.austlii.edu.au/au/journals/SydLawRw/2005/20.html"],
    });
    expect(article.notes).toEqual(["Also available on AustLII", "Peer reviewed"]);
    expect(article.abstract).toMatch(/^Considers the availability/);
    // DP names the database; it is kept as passthrough as well as the label.
    expect(article.provenance.sourceLabel).toBe("Primo");
    expect(article.passthrough).toEqual({ DP: "Primo" });
  });

  test("Zotero case with the reporter in A2", () => {
    const { records, issues } = parseFixture("zotero-case-mabo.ris");
    expect(issues).toEqual([]);
    const [mabo] = records;
    expect(mabo.kind).toBe("case");
    expect(mabo.title).toBe("Mabo v Queensland (No 2)");
    expect(mabo.creators).toEqual([]);
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      courtName: "High Court of Australia",
      decidedDate: { year: 1992, month: 6, day: 3 },
    });
    expect(mabo.containerTitle).toBe("CLR");
    expect(mabo.volume).toBe("175");
    expect(mabo.pageFirst).toBe("1");
    expect(mabo.publisher).toBeUndefined();
    expect(mabo.issued).toEqual({ year: 1992, month: 6, day: 3 });
    expect(mabo.identifiers.url).toBe("https://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html");
    expect(mabo.provenance.rawType).toBe("CASE");
  });

  test("Zotero statute keeps the full title for the mapper and reads SE as a section", () => {
    const { records, issues } = parseFixture("zotero-statute-native-title.ris");
    expect(issues).toEqual([]);
    const [act] = records;
    expect(act.kind).toBe("legislation");
    expect(act.title).toBe("Native Title Act 1993 (Cth)");
    expect(act.issued).toEqual({ year: 1993 });
    expect(act.legal).toEqual({ section: "223" });
  });

  test("EndNote CRLF export with case, statute, Hansard and article", () => {
    const text = fixture("endnote-uts-mixed.ris");
    expect(text).toContain("\r\n");
    const { records, issues } = risCodec.parse(text);
    expect(issues).toEqual([]);
    expect(records.map((r) => r.kind)).toEqual(["case", "legislation", "hansard", "article"]);

    const [mabo, act, hansard, article] = records;
    expect(mabo.title).toBe("Mabo v Queensland (No 2)");
    expect(mabo.issued).toEqual({ year: 1992 });
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      courtName: "Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ",
    });
    expect(mabo.collectionTitle).toBe("Commonwealth Law Reports");
    expect(mabo.shortTitle).toBe("Mabo");

    expect(act.title).toBe("Native Title Act 1993 (Cth)");
    expect(act.legal).toEqual({ jurisdiction: "Cth" });
    expect(act.containerTitle).toBeUndefined();
    expect(act.passthrough).toEqual({ T2: "Commonwealth" });
    expect(act.issued).toEqual({ year: 1993 });

    expect(hansard.provenance.rawType).toBe("HEAR");
    expect(hansard.title).toBe("House of Representatives");
    expect(hansard.containerTitle).toBe("Parliamentary Debates");
    expect(hansard.legal).toEqual({
      jurisdiction: "Commonwealth",
      chamber: "House of Representatives",
    });
    expect(hansard.creators).toEqual([
      { role: "speaker", raw: "Anthony Albanese", family: "Albanese", given: "Anthony" },
    ]);
    expect(hansard.issued).toEqual({ year: 2020, month: 3, day: 12 });
    expect(hansard.pageFirst).toBe("2345");

    expect(article.creators[0]).toMatchObject({ family: "Stone", given: "Adrienne" });
    expect(article.containerTitle).toBe("Melbourne University Law Review");
    expect(article.pageRange).toBe("668-708");
    expect(article.issued).toEqual({ year: 1999 });
  });

  test("a HEAR record without the debates title stays a hearing with a committee", () => {
    const { records } = risCodec.parse(
      "TY  - HEAR\nTI  - Inquiry into Family Violence\nT2  - Senate Legal and Constitutional Affairs References Committee\nT3  - Parliament of Australia\nER  - \n"
    );
    expect(records[0].kind).toBe("hearing");
    expect(records[0].legal).toEqual({
      committee: "Senate Legal and Constitutional Affairs References Committee",
      legislature: "Parliament of Australia",
    });
  });
});

describe("risCodec.parse tolerance", () => {
  test("edge cases: BOM, lower-case tags, continuation, missing ER, multiple URLs", () => {
    const text = fixture("edge-cases.ris");
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const { records, issues } = risCodec.parse(text);
    expect(records).toHaveLength(2);

    const [kirby, finn] = records;
    expect(kirby.kind).toBe("article");
    expect(kirby.creators).toEqual([
      { role: "author", raw: "Kirby, Michael", family: "Kirby", given: "Michael" },
    ]);
    expect(kirby.title).toBe(
      "Judicial Activism: Authority, Principle and Policy in the Judicial Method"
    );
    expect(kirby.containerTitle).toBe("Hamlyn Lectures");
    expect(kirby.issued).toEqual({ year: 2004 });
    expect(kirby.identifiers.url).toBe("https://example.org/kirby");
    expect(kirby.identifiers.urls).toEqual([
      "https://example.org/kirby",
      "https://example.org/kirby-alt",
    ]);
    expect(kirby.passthrough).toEqual({ XX: "custom value" });

    expect(finn.kind).toBe("book");
    expect(finn.title).toBe("Fiduciary Obligations");
    expect(finn.publisher).toBe("Law Book Co");

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "info", code: "parse-error", recordIndex: 0 });
    expect(issues[0].message).toMatch(/before the previous record's ER/);
  });

  test("unknown TY becomes generic with a warning", () => {
    const { records, issues } = risCodec.parse("TY  - ZZZZ\nTI  - Mystery\nER  - \n");
    expect(records[0].kind).toBe("generic");
    expect(records[0].title).toBe("Mystery");
    expect(records[0].provenance.rawType).toBe("ZZZZ");
    expect(issues).toEqual([
      expect.objectContaining({ severity: "warning", code: "unsupported-type", field: "TY" }),
    ]);
    expect(issues[0].message).toContain("ZZZZ");
  });

  test("tags before TY, stray ER, and a missing final ER all become issues", () => {
    const { records, issues } = risCodec.parse("ER  - \nTI  - Orphan\nAU  - Nobody\n");
    expect(records).toHaveLength(1);
    expect(records[0].kind).toBe("generic");
    expect(records[0].title).toBe("Orphan");
    // Structural issues come from the tokeniser first; the type warning follows.
    expect(issues.map((i) => i.code)).toEqual([
      "parse-error",
      "parse-error",
      "parse-error",
      "unsupported-type",
    ]);
  });

  test("unparseable dates are kept as text with a warning", () => {
    const { records, issues } = risCodec.parse("TY  - JOUR\nPY  - forthcoming\nER  - \n");
    expect(records[0].issued).toEqual({ raw: "forthcoming" });
    expect(issues).toEqual([expect.objectContaining({ code: "date-unparsed", field: "PY" })]);
  });

  test("a page range in SP is split; EP builds the range", () => {
    const a = risCodec.parse("TY  - JOUR\nSP  - 393–420\nER  - \n").records[0];
    expect(a).toMatchObject({ pageFirst: "393", pageLast: "420", pageRange: "393–420" });
    const b = risCodec.parse("TY  - JOUR\nSP  - 393\nEP  - 420\nER  - \n").records[0];
    expect(b).toMatchObject({ pageFirst: "393", pageLast: "420", pageRange: "393-420" });
  });

  test("BT is the title of a book but the container of a chapter", () => {
    const book = risCodec.parse("TY  - BOOK\nBT  - Equity\nER  - \n").records[0];
    expect(book.title).toBe("Equity");
    const chap = risCodec.parse("TY  - CHAP\nTI  - Tracing\nBT  - Equity\nER  - \n").records[0];
    expect(chap.title).toBe("Tracing");
    expect(chap.containerTitle).toBe("Equity");
  });

  test("AB is preferred over N2, and N2 moves to notes when both exist", () => {
    const rec = risCodec.parse("TY  - JOUR\nN2  - Second\nAB  - First\nER  - \n").records[0];
    expect(rec.abstract).toBe("First");
    expect(rec.notes).toEqual(["Second"]);
    const only = risCodec.parse("TY  - JOUR\nN2  - Only\nER  - \n").records[0];
    expect(only.abstract).toBe("Only");
  });

  test("a case SE holding a year sets the square year type", () => {
    const rec = risCodec.parse("TY  - CASE\nTI  - R v Smith\nT2  - QB\nSE  - 1998\nER  - \n")
      .records[0];
    expect(rec.legal?.yearType).toBe("square");
    expect(rec.issued).toEqual({ year: 1998 });
    expect(rec.legal?.section).toBeUndefined();
  });

  test("a case A2 that differs from T2 is kept in passthrough, not as an editor", () => {
    const rec = risCodec.parse("TY  - CASE\nTI  - X v Y\nT2  - CLR\nA2  - ALR\nER  - \n")
      .records[0];
    expect(rec.legal?.reporter).toBe("CLR");
    expect(rec.creators).toEqual([]);
    expect(rec.passthrough).toEqual({ A2: "ALR" });
  });

  test("Obiter identity tags are read back", () => {
    const rec = risCodec.parse(
      "TY  - JOUR\nDB  - Obiter\nAN  - obiter:cit-42\nC8  - obiter-type:journal.article\nC8  - other\nL1  - file.pdf\nL3  - related\nER  - \n"
    ).records[0];
    expect(rec.provenance).toEqual({
      format: "ris",
      rawType: "JOUR",
      sourceLabel: "Obiter",
      obiterId: "cit-42",
      obiterSourceType: "journal.article",
    });
    expect(rec.identifiers.accessionNumber).toBe("obiter:cit-42");
    expect(rec.attachments).toEqual(["file.pdf"]);
    expect(rec.passthrough).toEqual({ C8: "other", L3: "related" });
  });

  test("never throws on garbage", () => {
    expect(() => risCodec.parse("")).not.toThrow();
    expect(risCodec.parse("")).toEqual({ records: [], issues: [] });
    expect(() => risCodec.parse("  nonsense \r\n\r\n")).not.toThrow();
    expect(parseRisRecords("just words")).toEqual({ records: [], issues: [] });
  });

  test("issue messages use the Obiter voice", () => {
    const { issues } = risCodec.parse(
      "TI  - Orphan\nTY  - ZZZ\nPY  - soon\nTY  - JOUR\nER  - \nER  - \nTY  - BOOK\n"
    );
    expect(issues.length).toBeGreaterThan(3);
    for (const i of issues) {
      expect(i.message).not.toContain("!");
      expect(i.message).toMatch(/\.$/);
    }
  });
});

describe("risCodec.serialise", () => {
  test("writes CRLF by default, TY first and ER last, blank line between records", () => {
    const { records } = parseFixture("trove-book.ris");
    const { records: more } = parseFixture("primo-article.ris");
    const out = risCodec.serialise([...records, ...more]);
    expect(out.startsWith("TY  - BOOK\r\n")).toBe(true);
    expect(out.endsWith("ER  - \r\n")).toBe(true);
    expect(out).toContain("ER  - \r\n\r\nTY  - JOUR\r\n");
    expect(out).not.toMatch(/[^\r]\n/);

    const lf = risCodec.serialise(records, { lineEnding: "\n" });
    expect(lf).not.toContain("\r");
    expect(lf.split("\n")[0]).toBe("TY  - BOOK");
  });

  test("an empty list serialises to an empty string", () => {
    expect(risCodec.serialise([])).toBe("");
  });

  test("case export writes the reporter in T2 and A2 for Zotero, and the court in PB", () => {
    const { records } = parseFixture("zotero-case-mabo.ris");
    const lines = risCodec.serialise(records, { lineEnding: "\n" }).split("\n");
    expect(lines).toEqual([
      "TY  - CASE",
      "TI  - Mabo v Queensland (No 2)",
      "T2  - CLR",
      "A2  - CLR",
      "PY  - 1992///",
      "DA  - 1992/06/03/",
      "VL  - 175",
      "SP  - 1",
      "PB  - High Court of Australia",
      "UR  - https://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html",
      "ER  - ",
      "",
    ]);
  });

  test("formatted citations and Obiter identity are written as notes and tags", () => {
    const { records } = parseFixture("primo-article.ris");
    const rec: InterchangeRecord = {
      ...records[0],
      formatted: {
        standard:
          "Harold Luntz, 'Loss of Chance in Medical Negligence' (2005) 27(3) Sydney Law Review 393.",
        footnote:
          "Harold Luntz, 'Loss of Chance in Medical Negligence' (2005) 27(3) Sydney Law Review 393.",
        bibliography:
          "Luntz, Harold, 'Loss of Chance in Medical Negligence' (2005) 27(3) Sydney Law Review 393",
      },
      provenance: {
        ...records[0].provenance,
        obiterId: "cit-7",
        obiterSourceType: "journal.article",
      },
    };
    const out = risCodec.serialise([rec], { lineEnding: "\n" });
    expect(out).toContain("N1  - AGLC4 footnote: Harold Luntz, 'Loss of Chance");
    expect(out).toContain("N1  - AGLC4 bibliography: Luntz, Harold, 'Loss of Chance");
    expect(out).toContain("DB  - Obiter\n");
    expect(out).toContain("AN  - obiter:cit-7\n");
    expect(out).toContain("C8  - obiter-type:journal.article\n");
    // The DP passthrough from Primo still comes through.
    expect(out).toContain("DP  - Primo\n");
  });

  test("newlines inside values are flattened to spaces", () => {
    const { records } = parseFixture("trove-book.ris");
    const rec = { ...records[0], abstract: "Line one\nLine two\r\n  Line three" };
    const out = risCodec.serialise([rec], { lineEnding: "\n" });
    expect(out).toContain("AB  - Line one Line two Line three\n");
  });

  test("unknown tags survive a parse and export unchanged", () => {
    const { records } = risCodec.parse(
      "TY  - JOUR\nTI  - T\nXX  - custom\nXX  - second\nC3  - c3 value\nzz - continuation\nER  - \n"
    );
    // "zz" is not a known tag, so its line continues C3.
    expect(records[0].passthrough).toEqual({
      XX: ["custom", "second"],
      C3: "c3 value zz - continuation",
    });
    const out = risCodec.serialise(records, { lineEnding: "\n" });
    expect(out).toContain("XX  - custom\nXX  - second\n");
    expect(out).toContain("C3  - c3 value zz - continuation\n");
    // Non-tag keys are not emitted.
    const odd = { ...records[0], passthrough: { ...records[0].passthrough, "long-key": "x" } };
    expect(risCodec.serialise([odd])).not.toContain("long-key");
  });

  test("Hansard export writes the jurisdiction as AU and the speaker as PB", () => {
    const { records } = parseFixture("endnote-uts-mixed.ris");
    const hansard = records[2];
    const out = risCodec.serialise([hansard], { lineEnding: "\n" });
    expect(out).toContain("TY  - HEAR\n");
    expect(out).toContain("TI  - House of Representatives\n");
    expect(out).toContain("T2  - Parliamentary Debates\n");
    expect(out).toContain("AU  - Commonwealth\n");
    expect(out).toContain("PB  - Albanese, Anthony\n");
    expect(out).toContain("DA  - 2020/03/12/\n");
    expect(out).toContain("SP  - 2345\n");
    const again = risCodec.parse(out).records[0];
    expect(again.kind).toBe("hansard");
    expect(again.legal).toEqual(hansard.legal);
  });
});

describe("serialise -> parse round trip", () => {
  test("a journal article carrying every generic field is identical after a round trip", () => {
    const record: InterchangeRecord = {
      kind: "article",
      title: "Loss of Chance in Medical Negligence",
      shortTitle: "Loss of Chance",
      containerTitle: "Sydney Law Review",
      containerTitleShort: "Syd L Rev",
      collectionTitle: "Torts Series",
      creators: [
        { role: "author", raw: "Luntz, Harold", family: "Luntz", given: "Harold" },
        {
          role: "author",
          raw: "Phillips, Albert John, Jr",
          family: "Phillips",
          given: "Albert John",
          suffix: "Jr",
        },
        { role: "editor", raw: "Bant, Elise", family: "Bant", given: "Elise" },
        { role: "series-editor", raw: "Edelman, James", family: "Edelman", given: "James" },
        {
          role: "translator",
          raw: "Australian Law Reform Commission",
          literal: "Australian Law Reform Commission",
        },
      ],
      issued: { year: 2005, month: 3, day: 14 },
      accessed: { year: 2024, month: 1, day: 2 },
      volume: "27",
      issue: "3",
      number: "7",
      pageFirst: "393",
      pageLast: "420",
      pageRange: "393-420",
      edition: "2nd",
      publisher: "Hart Publishing",
      place: "Oxford",
      genre: "Lecture",
      language: "en",
      legal: { section: "s 5", docket: "D-2005-1", history: "Reversed on appeal" },
      identifiers: {
        doi: "10.1234/slr.2005.27.3",
        isbn: "978-1-84946-401-7",
        url: "https://example.org/a",
        urls: ["https://example.org/a", "https://example.org/b"],
        accessionNumber: "ACC-1",
      },
      keywords: ["Torts", "Damages"],
      abstract: "An abstract.",
      notes: ["Note one", "Note two"],
      attachments: ["paper.pdf"],
      passthrough: { C1: "custom one", XX: ["first", "second"] },
      provenance: { format: "ris", rawType: "JOUR", rawId: "rec-1" },
    };
    const text = risCodec.serialise([record]);
    const { records, issues } = risCodec.parse(text);
    expect(issues).toEqual([]);
    expect(records).toHaveLength(1);
    const back = {
      ...records[0],
      provenance: { ...records[0].provenance, format: "ris" as const },
    };
    expect(back).toEqual(record);
  });

  test("a reported case is identical after a round trip", () => {
    const record: InterchangeRecord = {
      kind: "case",
      title: "Mabo v Queensland (No 2)",
      shortTitle: "Mabo",
      containerTitle: "CLR",
      creators: [],
      issued: { year: 1992, month: 6, day: 3 },
      volume: "175",
      pageFirst: "1",
      legal: {
        caseName: "Mabo v Queensland (No 2)",
        reporter: "CLR",
        reporterVolume: "175",
        firstPage: "1",
        courtName: "High Court of Australia",
        decidedDate: { year: 1992, month: 6, day: 3 },
        docket: "B12/1991",
      },
      identifiers: { url: "https://example.org/mabo", urls: ["https://example.org/mabo"] },
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: {},
      provenance: { format: "ris", rawType: "CASE" },
    };
    const { records, issues } = risCodec.parse(risCodec.serialise([record]));
    expect(issues).toEqual([]);
    expect(records[0]).toEqual(record);
  });

  test("a statute keeps its jurisdiction T2 and act number", () => {
    const record: InterchangeRecord = {
      kind: "legislation",
      title: "Native Title Act 1993 (Cth)",
      creators: [],
      issued: { year: 1993 },
      number: "110",
      legal: { jurisdiction: "Cth", actNumber: "110", section: "223", documentNumber: "110" },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: { T2: "Commonwealth" },
      provenance: { format: "ris", rawType: "STAT" },
    };
    const text = risCodec.serialise([record], { lineEnding: "\n" });
    expect(text).toContain("VL  - 110\n");
    expect(text).toContain("SE  - 223\n");
    expect(text).toContain("T2  - Commonwealth\n");
    const { records } = risCodec.parse(text);
    expect(records[0]).toEqual(record);
  });
});

describe("performance", () => {
  test("parses 1000 records in under a second", () => {
    const one = fixture("primo-article.ris").replace(/\r?\n/g, "\r\n");
    const text = Array.from({ length: 1000 }, (_, i) => one.replace("393", String(i))).join("\r\n");
    const started = Date.now();
    const { records, issues } = risCodec.parse(text);
    const elapsed = Date.now() - started;
    expect(records).toHaveLength(1000);
    expect(issues).toEqual([]);
    expect(elapsed).toBeLessThan(1000);
  });
});
