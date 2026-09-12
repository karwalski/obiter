/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-005: Word Source Manager XML — import only.
 */

import * as fs from "fs";
import * as path from "path";

import { getCodec, hasCodec, listExportCodecs } from "../../../src/api/interchange/codec";
import {
  parseWordSourcesXml,
  wordSourcesXmlCodec,
} from "../../../src/api/interchange/codecs/wordSourcesXml";

const FIXTURES = path.resolve(__dirname, "../../fixtures/interchange/word");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf-8");
}

describe("wordSourcesXmlCodec registration and sniffing", () => {
  test("registers itself on load as an import-only codec", () => {
    expect(hasCodec("word-sources-xml")).toBe(true);
    expect(getCodec("word-sources-xml")).toBe(wordSourcesXmlCodec);
    expect(wordSourcesXmlCodec.format).toBe("word-sources-xml");
    expect(wordSourcesXmlCodec.label).toBe("Word Source Manager");
    expect(wordSourcesXmlCodec.extensions).toEqual([".xml"]);
    expect(wordSourcesXmlCodec.mimeType).toBe("application/xml");
    expect(wordSourcesXmlCodec.canExport).toBe(false);
    expect(listExportCodecs()).not.toContain(wordSourcesXmlCodec);
  });

  test("serialise throws", () => {
    expect(() => wordSourcesXmlCodec.serialise([])).toThrow(
      "Word Source Manager export is not supported"
    );
  });

  test("sniff scores a Source Manager file at 0.95 and other formats at 0", () => {
    expect(wordSourcesXmlCodec.sniff(fixture("sources.xml"))).toBe(0.95);
    expect(wordSourcesXmlCodec.sniff("<b:Sources><b:Source/></b:Sources>")).toBe(0.95);
    expect(
      wordSourcesXmlCodec.sniff(
        '<Sources xmlns="http://schemas.openxmlformats.org/officeDocument/2006/bibliography"/>'
      )
    ).toBe(0.95);
    expect(
      wordSourcesXmlCodec.sniff(
        fs.readFileSync(path.resolve(FIXTURES, "../endnote/uts-case-reported.xml"), "utf-8")
      )
    ).toBe(0);
    expect(wordSourcesXmlCodec.sniff("TY  - JOUR\nER  - \n")).toBe(0);
    expect(wordSourcesXmlCodec.sniff("")).toBe(0);
  });
});

describe("wordSourcesXmlCodec.parse", () => {
  test("a Book with person authors, an editor and Word's housekeeping elements", () => {
    const { records, issues } = wordSourcesXmlCodec.parse(fixture("sources.xml"));
    expect(issues).toEqual([]);
    expect(records).toHaveLength(4);
    const [book] = records;
    expect(book.kind).toBe("book");
    expect(book.title).toBe("Unjust Enrichment");
    expect(book.creators).toEqual([
      { role: "author", raw: "Edelman, James", family: "Edelman", given: "James" },
      { role: "author", raw: "Bant, Elise", family: "Bant", given: "Elise" },
      { role: "editor", raw: "Degeling, Simone J", family: "Degeling", given: "Simone J" },
    ]);
    expect(book.issued).toEqual({ year: 2016 });
    expect(book.publisher).toBe("Hart Publishing");
    expect(book.place).toBe("Oxford");
    expect(book.edition).toBe("2");
    expect(book.identifiers).toEqual({ isbn: "9781849464017" });
    expect(book.passthrough).toEqual({
      guid: "{7B1A2C3D-0000-4000-8000-000000000001}",
      lcid: "en-AU",
      reforder: "1",
    });
    expect(book.provenance).toEqual({
      format: "word-sources-xml",
      rawType: "Book",
      rawId: "Ede16",
      sourceLabel: "Word",
    });
  });

  test("a JournalArticle with journal, volume, issue, pages, ISSN, URL and comments", () => {
    const [, article] = wordSourcesXmlCodec.parse(fixture("sources.xml")).records;
    expect(article.kind).toBe("article");
    expect(article.creators).toEqual([
      { role: "author", raw: "Luntz, Harold", family: "Luntz", given: "Harold" },
    ]);
    expect(article.containerTitle).toBe("Sydney Law Review");
    expect(article.volume).toBe("27");
    expect(article.issue).toBe("3");
    expect(article).toMatchObject({ pageFirst: "393", pageLast: "420", pageRange: "393-420" });
    expect(article.identifiers).toEqual({
      issn: "0036-6250",
      url: "https://www.austlii.edu.au/au/journals/SydLawRw/2005/20.html",
      urls: ["https://www.austlii.edu.au/au/journals/SydLawRw/2005/20.html"],
    });
    expect(article.notes).toEqual(["Peer reviewed"]);
    expect(article.provenance.rawId).toBe("Lun05");
  });

  test("a Case maps court, reporter, volume, pages, case number and the full date", () => {
    const [, , mabo] = wordSourcesXmlCodec.parse(fixture("sources.xml")).records;
    expect(mabo.kind).toBe("case");
    expect(mabo.title).toBe("Mabo v Queensland (No 2)");
    expect(mabo.shortTitle).toBe("Mabo");
    expect(mabo.creators).toEqual([]);
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      courtName: "High Court of Australia",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      docket: "B12/1991",
    });
    expect(mabo.containerTitle).toBe("CLR");
    expect(mabo.volume).toBe("175");
    expect(mabo.pageFirst).toBe("1");
    expect(mabo.issued).toEqual({ year: 1992, month: 6, day: 3 });
    expect(mabo.passthrough).toEqual({ abbreviatedcasenumber: "B12", reforder: "3" });
  });

  test("a Report with a corporate author becomes a literal creator", () => {
    const [, , , report] = wordSourcesXmlCodec.parse(fixture("sources.xml")).records;
    expect(report.kind).toBe("report");
    expect(report.creators).toEqual([
      {
        role: "author",
        raw: "Australian Law Reform Commission",
        literal: "Australian Law Reform Commission",
      },
    ]);
    expect(report.institution).toBe("Australian Law Reform Commission");
    expect(report.publisher).toBe("Commonwealth of Australia");
    expect(report.place).toBe("Sydney");
    expect(report.genre).toBe("Report 99");
    expect(report.issued).toEqual({ year: 2004, month: 6 });
  });

  test("elements without the b: prefix are read the same way", () => {
    const xml =
      '<Sources xmlns="http://schemas.openxmlformats.org/officeDocument/2006/bibliography">' +
      "<Source><Tag>Smi20</Tag><SourceType>InternetSite</SourceType>" +
      "<Author><Author><NameList><Person><Last>Smith</Last><First>Jane</First></Person></NameList></Author>" +
      "<Interviewer><NameList><Person><Last>Jones</Last><First>Bob</First></Person></NameList></Interviewer></Author>" +
      "<Title>A Page</Title><InternetSiteTitle>Example Site</InternetSiteTitle><Year>2020</Year><Month>3</Month><Day>7</Day>" +
      "<YearAccessed>2021</YearAccessed><MonthAccessed>January</MonthAccessed><DayAccessed>2</DayAccessed>" +
      "<URL>https://example.org/page</URL><Medium>Online</Medium></Source></Sources>";
    const { records, issues } = wordSourcesXmlCodec.parse(xml);
    expect(issues).toEqual([]);
    const [page] = records;
    expect(page.kind).toBe("web");
    expect(page.creators).toEqual([
      { role: "author", raw: "Smith, Jane", family: "Smith", given: "Jane" },
      { role: "interviewer", raw: "Jones, Bob", family: "Jones", given: "Bob" },
    ]);
    expect(page.containerTitle).toBe("Example Site");
    expect(page.issued).toEqual({ year: 2020, month: 3, day: 7 });
    expect(page.accessed).toEqual({ year: 2021, month: 1, day: 2 });
    expect(page.identifiers.url).toBe("https://example.org/page");
    expect(page.medium).toBe("Online");
    expect(page.passthrough).toEqual({});
  });

  test("every Word source type maps to a kind; an unknown type is generic with a warning", () => {
    const kinds = (type: string): string =>
      wordSourcesXmlCodec.parse(
        `<b:Sources><b:Source><b:SourceType>${type}</b:SourceType></b:Source></b:Sources>`
      ).records[0].kind;
    expect(kinds("BookSection")).toBe("chapter");
    expect(kinds("Report")).toBe("report");
    expect(kinds("DocumentFromInternetSite")).toBe("web");
    expect(kinds("ElectronicSource")).toBe("web");
    expect(kinds("ConferenceProceedings")).toBe("conference");
    expect(kinds("SoundRecording")).toBe("podcast");
    expect(kinds("Film")).toBe("film");
    expect(kinds("ArticleInAPeriodical")).toBe("periodical");
    expect(kinds("Patent")).toBe("generic");
    expect(kinds("Interview")).toBe("interview");
    expect(kinds("Art")).toBe("generic");
    expect(kinds("Performance")).toBe("generic");
    expect(kinds("Misc")).toBe("generic");

    const unknown = wordSourcesXmlCodec.parse(
      "<b:Sources><b:Source><b:Tag>x</b:Tag><b:SourceType>Hologram</b:SourceType><b:Title>T</b:Title></b:Source></b:Sources>"
    );
    expect(unknown.records[0].kind).toBe("generic");
    expect(unknown.records[0].title).toBe("T");
    expect(unknown.issues).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "unsupported-type",
        field: "SourceType",
      }),
    ]);
    expect(unknown.issues[0].message).toContain("Hologram");
  });

  test("an unknown contributor role is kept as a contributor and noted in passthrough", () => {
    const [rec] = wordSourcesXmlCodec.parse(
      "<b:Sources><b:Source><b:SourceType>Film</b:SourceType><b:Author><b:Director><b:NameList><b:Person><b:Last>Weir</b:Last><b:First>Peter</b:First></b:Person></b:NameList></b:Director>" +
        "<b:Choreographer><b:Corporate>Dance Co</b:Corporate></b:Choreographer></b:Author></b:Source></b:Sources>"
    ).records;
    expect(rec.creators).toEqual([
      { role: "director", raw: "Weir, Peter", family: "Weir", given: "Peter" },
      { role: "contributor", raw: "Dance Co", literal: "Dance Co" },
    ]);
    expect(rec.passthrough).toEqual({ "contributor-role": "choreographer" });
  });

  test("dates: a month name, an unusable month and a missing year", () => {
    const parse = (fields: string): ReturnType<typeof wordSourcesXmlCodec.parse> =>
      wordSourcesXmlCodec.parse(
        `<b:Sources><b:Source><b:SourceType>Book</b:SourceType>${fields}</b:Source></b:Sources>`
      );
    expect(parse("<b:Year>2020</b:Year><b:Month>March</b:Month>").records[0].issued).toEqual({
      year: 2020,
      month: 3,
    });
    expect(parse("<b:Year>2020</b:Year><b:Month>Spring</b:Month>").records[0].issued).toEqual({
      year: 2020,
      raw: "Spring 2020",
    });
    expect(parse("<b:Month>March</b:Month><b:Day>3</b:Day>").records[0].issued).toEqual({
      raw: "3 March",
    });
    expect(parse("<b:Year>c 1990</b:Year>").records[0].issued).toEqual({
      year: 1990,
      raw: "c 1990",
    });
    expect(parse("").records[0].issued).toBeUndefined();
  });

  test("malformed XML never throws", () => {
    expect(() => wordSourcesXmlCodec.parse("")).not.toThrow();
    expect(wordSourcesXmlCodec.parse("")).toEqual({ records: [], issues: [] });
    expect(() => wordSourcesXmlCodec.parse("<b:Sources><b:Source><b:Title>unclosed")).not.toThrow();
    expect(() => wordSourcesXmlCodec.parse("<<<>>> & nonsense")).not.toThrow();
    expect(() => parseWordSourcesXml("just words")).not.toThrow();

    const truncated = wordSourcesXmlCodec.parse(
      "<b:Sources><b:Source><b:SourceType>Book</b:SourceType><b:Title>Unfinished"
    );
    expect(truncated.records).toHaveLength(1);
    expect(truncated.records[0].title).toBe("Unfinished");

    const noSources = wordSourcesXmlCodec.parse("<html><body>Not Word</body></html>");
    expect(noSources.records).toEqual([]);
    expect(noSources.issues).toEqual([
      expect.objectContaining({ severity: "warning", code: "parse-error" }),
    ]);
  });

  test("issue messages use the Obiter voice", () => {
    const { issues } = wordSourcesXmlCodec.parse(
      "<b:Sources><b:Source><b:SourceType>Zzz</b:SourceType></b:Source><b:Source/></b:Sources>"
    );
    expect(issues.length).toBeGreaterThan(1);
    for (const i of issues) {
      expect(i.message).not.toContain("!");
      expect(i.message).toMatch(/\.$/);
    }
  });
});
