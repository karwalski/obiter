/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-004: the EndNote XML codec — UTS AGLC4 reference types, EndNote's
 * default types, parse, serialise, sniff and round trip.
 */

import * as fs from "fs";
import * as path from "path";

import { getCodec, hasCodec } from "../../../src/api/interchange/codec";
import type { InterchangeRecord } from "../../../src/api/interchange/model";
import { endnoteXmlCodec, parseEndnoteXml } from "../../../src/api/interchange/codecs/endnoteXml";
import {
  GENERIC_ROLES,
  rolesFor,
  utsRefTypeId,
  utsRolesFor,
} from "../../../src/api/interchange/codecs/endnoteRefTypes";

const FIXTURES = path.resolve(__dirname, "../../fixtures/interchange/endnote");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), "utf-8");
}

function parseFixture(name: string): ReturnType<typeof endnoteXmlCodec.parse> {
  return endnoteXmlCodec.parse(fixture(name));
}

/** A record with the provenance fields a round trip is allowed to change removed. */
function comparable(record: InterchangeRecord): InterchangeRecord {
  const provenance = { ...record.provenance };
  delete provenance.sourceLabel;
  delete provenance.rawId;
  return { ...record, provenance };
}

const STYLE = '<style face="normal" font="default" size="100%">';

function styled(text: string): string {
  return `${STYLE}${text}</style>`;
}

describe("endnoteXmlCodec registration and sniffing", () => {
  test("registers itself on load", () => {
    expect(hasCodec("endnote-xml")).toBe(true);
    expect(getCodec("endnote-xml")).toBe(endnoteXmlCodec);
    expect(endnoteXmlCodec.format).toBe("endnote-xml");
    expect(endnoteXmlCodec.label).toBe("EndNote XML");
    expect(endnoteXmlCodec.extensions).toEqual([".xml"]);
    expect(endnoteXmlCodec.mimeType).toBe("application/xml");
    expect(endnoteXmlCodec.canExport).toBe(true);
  });

  test("sniff scores an EndNote export at 0.95 and other formats at 0", () => {
    expect(endnoteXmlCodec.sniff(fixture("uts-case-reported.xml"))).toBe(0.95);
    expect(endnoteXmlCodec.sniff(fixture("generic-endnote-x9.xml"))).toBe(0.95);
    expect(endnoteXmlCodec.sniff('<record><ref-type name="Book">1</ref-type></record>')).toBe(0.85);
    expect(endnoteXmlCodec.sniff("TY  - JOUR\nTI  - Title\nER  - \n")).toBe(0);
    expect(endnoteXmlCodec.sniff("@article{key, title = {x}}")).toBe(0);
    expect(endnoteXmlCodec.sniff('[{"id": "x", "type": "book"}]')).toBe(0);
    expect(endnoteXmlCodec.sniff("")).toBe(0);
    expect(
      endnoteXmlCodec.sniff(fs.readFileSync(path.resolve(FIXTURES, "../word/sources.xml"), "utf-8"))
    ).toBe(0);
  });
});

describe("endnoteRefTypes", () => {
  test("utsRolesFor returns the relabellings for a UTS type and nothing for an unknown one", () => {
    const roles = utsRolesFor("case (reported)");
    expect(roles["secondary-title"]).toBe("legal.reporter");
    expect(roles.publisher).toBe("legal.judgesOrCourt");
    expect(roles.section).toBe("legal.yearSquare");
    expect(utsRolesFor("Not A Type")).toEqual({});
    expect(utsRefTypeId("Case (Reported)")).toBe(18);
    expect(utsRefTypeId("Parl. Debate")).toBe(36);
    expect(utsRefTypeId("Not A Type")).toBe(31);
  });

  test("rolesFor merges a type's relabellings over the generic map", () => {
    const roles = rolesFor("Statute");
    expect(roles["secondary-title"]).toBe("legal.jurisdiction");
    expect(roles.notes).toBe(GENERIC_ROLES.notes);
    expect(rolesFor("Unknown")).toEqual(GENERIC_ROLES);
  });
});

describe("endnoteXmlCodec.parse UTS AGLC4 fixtures", () => {
  test("Case (Reported): reporter, judges, round year, decided date and passthrough", () => {
    const { records, issues } = parseFixture("uts-case-reported.xml");
    expect(issues).toEqual([]);
    expect(records).toHaveLength(1);
    const [mabo] = records;
    expect(mabo.kind).toBe("case");
    expect(mabo.title).toBe("Mabo v Queensland (No 2)");
    expect(mabo.shortTitle).toBe("Mabo");
    expect(mabo.containerTitle).toBe("CLR");
    expect(mabo.volume).toBe("175");
    expect(mabo.pageFirst).toBe("1");
    expect(mabo.issued).toEqual({ year: 1992 });
    expect(mabo.creators).toEqual([]);
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      yearType: "round",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      judges: "Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ",
      decidedDate: { year: 1992, month: 6, day: 3 },
    });
    expect(mabo.keywords).toEqual(["Native title", "Terra nullius"]);
    expect(mabo.notes).toEqual(["Landmark native title decision."]);
    expect(mabo.identifiers.url).toBe("https://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html");
    expect(mabo.passthrough).toEqual({
      "reporter-full-name": "Commonwealth Law Reports",
      label: "mabo1992",
    });
    expect(mabo.provenance).toEqual({
      format: "endnote-xml",
      rawType: "Case (Reported)",
      rawId: "1",
      sourceLabel: "UTS AGLC4.enl",
    });
  });

  test("Case (Reported) with the year in <section> is a square-bracket year and a court", () => {
    const { records, issues } = parseFixture("uts-case-square-year.xml");
    expect(issues).toEqual([]);
    const [smith] = records;
    expect(smith.kind).toBe("case");
    expect(smith.issued).toEqual({ year: 1998 });
    expect(smith.legal).toEqual({
      caseName: "Smith v Jones",
      yearType: "square",
      reporter: "Qd R",
      reporterVolume: "1",
      firstPage: "1",
      courtName: "Supreme Court of Queensland",
      decidedDate: { year: 1998, month: 2, day: 14 },
    });
    expect(smith.passthrough).toEqual({ "reporter-full-name": "Queensland Reports" });
  });

  test("Case (Medium Neutral): court code, judgment number and the assembled MNC", () => {
    const { records, issues } = parseFixture("uts-case-mnc.xml");
    expect(issues).toEqual([]);
    const [banerji] = records;
    expect(banerji.kind).toBe("case");
    expect(banerji.title).toBe("Comcare v Banerji");
    expect(banerji.issued).toEqual({ year: 2019 });
    expect(banerji.legal).toEqual({
      caseName: "Comcare v Banerji",
      courtCode: "HCA",
      docket: "23",
      mnc: { year: 2019, court: "HCA", number: 23, raw: "[2019] HCA 23" },
      decidedDate: { year: 2019, month: 8, day: 7 },
    });
    expect(banerji.containerTitle).toBeUndefined();
  });

  test("Case (Unreported no Medium Neutral): court, judge, proceeding number and date", () => {
    const { records, issues } = parseFixture("uts-case-unreported.xml");
    expect(issues).toEqual([]);
    const [barton] = records;
    expect(barton.kind).toBe("case");
    expect(barton.legal).toEqual({
      caseName: "Barton v Chibber",
      courtName: "Supreme Court of Victoria",
      judges: "Hampel J",
      proceedingNumber: "No 4321 of 1988",
      decidedDate: { year: 1989, month: 6, day: 29 },
    });
    expect(barton.issued).toEqual({ year: 1989, month: 6, day: 29 });
  });

  test("Statute: title kept whole, act year, jurisdiction as given, dates in passthrough", () => {
    const { records, issues } = parseFixture("uts-statute.xml");
    expect(issues).toEqual([]);
    const [act] = records;
    expect(act.kind).toBe("legislation");
    expect(act.title).toBe("Native Title Act 1993 (Cth)");
    expect(act.shortTitle).toBe("Native Title Act");
    expect(act.issued).toEqual({ year: 1993 });
    expect(act.legal).toEqual({
      actTitle: "Native Title Act 1993 (Cth)",
      actYear: 1993,
      jurisdiction: "Commonwealth",
    });
    expect(act.containerTitle).toBeUndefined();
    expect(act.passthrough).toEqual({
      "date-in-force": "1 January 1994",
      "date-enacted": "24 December 1993",
    });
  });

  test("regulations under the Statute type and a Bill", () => {
    const [regs] = parseFixture("uts-regulations.xml").records;
    expect(regs.kind).toBe("legislation");
    expect(regs.title).toBe("Native Title (Federal Court) Regulations 1998 (Cth)");
    expect(regs.legal).toEqual({
      actTitle: "Native Title (Federal Court) Regulations 1998 (Cth)",
      actYear: 1998,
      jurisdiction: "Commonwealth",
    });

    const [bill] = parseFixture("uts-bill.xml").records;
    expect(bill.kind).toBe("bill");
    expect(bill.title).toBe("Native Title Amendment Bill 1997 (Cth)");
    expect(bill.legal?.jurisdiction).toBe("Commonwealth");
    expect(bill.issued).toEqual({ year: 1997 });
  });

  test("Parl. Debate: jurisdiction from the author, chamber, speaker and column date", () => {
    const { records, issues } = parseFixture("uts-hansard.xml");
    expect(issues).toEqual([]);
    const [hansard] = records;
    expect(hansard.kind).toBe("hansard");
    expect(hansard.legal).toEqual({
      jurisdiction: "Commonwealth",
      chamber: "House of Representatives",
    });
    expect(hansard.creators).toEqual([
      { role: "speaker", raw: "Anthony Albanese", family: "Albanese", given: "Anthony" },
    ]);
    expect(hansard.issued).toEqual({ year: 2020, month: 3, day: 12 });
    expect(hansard.pageFirst).toBe("2345");
    expect(hansard.title).toBeUndefined();
    expect(hansard.passthrough).toEqual({ "speaker-position": "Prime Minister" });
  });

  test("Treaty: opened, in-force and series details", () => {
    const { records, issues } = parseFixture("uts-treaty.xml");
    expect(issues).toEqual([]);
    const [rome] = records;
    expect(rome.kind).toBe("treaty");
    expect(rome.title).toBe("Rome Statute of the International Criminal Court");
    expect(rome.issued).toEqual({ year: 1998 });
    expect(rome.legal).toEqual({
      openedDate: { year: 1998, month: 7, day: 17 },
      inForceDate: { year: 2002, month: 7, day: 1 },
      treatySeries: "2187 UNTS 3",
    });
  });

  test("Journal Article: generic fields, ISSN by shape, DOI, notes split, unknown elements kept", () => {
    const { records, issues } = parseFixture("uts-journal-article.xml");
    expect(issues).toEqual([]);
    const [luntz] = records;
    expect(luntz.kind).toBe("article");
    expect(luntz.creators).toEqual([
      { role: "author", raw: "Luntz, Harold", family: "Luntz", given: "Harold" },
    ]);
    expect(luntz.title).toBe("Loss of Chance in Medical Negligence");
    expect(luntz.containerTitle).toBe("Sydney Law Review");
    expect(luntz.containerTitleShort).toBe("Syd L Rev");
    expect(luntz.volume).toBe("27");
    expect(luntz.issue).toBe("3");
    expect(luntz).toMatchObject({ pageFirst: "393", pageLast: "420", pageRange: "393-420" });
    expect(luntz.issued).toEqual({ year: 2005 });
    expect(luntz.identifiers).toEqual({ issn: "0036-6250", doi: "10.1234/slr.2005.27.3" });
    expect(luntz.abstract).toBe("Considers the availability of damages for loss of a chance.");
    expect(luntz.notes).toEqual(["Also available on AustLII", "Peer reviewed"]);
    // <custom1> is a known element; <caption> is not. Both survive as passthrough.
    expect(luntz.passthrough).toEqual({ custom1: "Peer reviewed", caption: "Figure 1" });
    expect(luntz.legal).toBeUndefined();
  });

  test("Book and Book Chapter", () => {
    const [book] = parseFixture("uts-book.xml").records;
    expect(book.kind).toBe("book");
    expect(book.creators.map((c) => c.family)).toEqual(["Edelman", "Bant"]);
    expect(book.title).toBe("Unjust Enrichment");
    expect(book.edition).toBe("2");
    expect(book.publisher).toBe("Hart Publishing");
    expect(book.place).toBe("Oxford");
    expect(book.issued).toEqual({ year: 2016 });
    expect(book.identifiers.isbn).toBe("9781849464017");
    expect(book.numberOfPages).toBe("512");
    expect(book.keywords).toEqual(["Restitution", "Unjust enrichment"]);

    const [chapter] = parseFixture("uts-book-chapter.xml").records;
    expect(chapter.kind).toBe("chapter");
    expect(chapter.title).toBe("Obligations and Outcomes in the Law of Torts");
    expect(chapter.containerTitle).toMatch(/^Relating to Responsibility/);
    expect(chapter.creators.map((c) => `${c.role}:${c.family}`)).toEqual([
      "author:Gardner",
      "editor:Cane",
      "editor:Gardner",
    ]);
    expect(chapter.pageFirst).toBe("111");
    expect(chapter.issued).toEqual({ year: 2001 });
  });

  test("Royal or Law Reform Commission: the commission becomes the author and the report title the title", () => {
    const { records, issues } = parseFixture("uts-law-reform.xml");
    expect(issues).toEqual([]);
    const [alrc] = records;
    expect(alrc.kind).toBe("report");
    expect(alrc.title).toBe("Genes and Ingenuity: Gene Patenting and Human Health");
    expect(alrc.creators).toEqual([
      {
        role: "author",
        raw: "Australian Law Reform Commission",
        literal: "Australian Law Reform Commission",
      },
    ]);
    expect(alrc.genre).toBe("Report");
    expect(alrc.number).toBe("99");
    expect(alrc.issued).toEqual({ year: 2004, month: 6 });
    expect(alrc.passthrough).toEqual({ commission: "Australian Law Reform Commission" });
  });

  test("Internet Material: Obiter identity in accession-num, custom8 and notes lifts to provenance", () => {
    const { records, issues } = parseFixture("uts-internet.xml");
    expect(issues).toEqual([]);
    const [page] = records;
    expect(page.kind).toBe("web");
    expect(page.creators).toEqual([
      { role: "author", raw: "High Court of Australia", literal: "High Court of Australia" },
    ]);
    expect(page.title).toBe("Judgment Summaries");
    expect(page.containerTitle).toBe("High Court of Australia");
    expect(page.publisher).toBe("High Court of Australia");
    expect(page.genre).toBe("Web Page");
    expect(page.issued).toEqual({ year: 2021, month: 3, day: 15 });
    expect(page.accessed).toEqual({ year: 2021, month: 4, day: 1 });
    expect(page.provenance).toEqual({
      format: "endnote-xml",
      rawType: "Internet Material with Author",
      rawId: "14",
      sourceLabel: "Obiter",
      obiterId: "cit-9",
      obiterSourceType: "internet_material",
    });
    expect(page.identifiers.accessionNumber).toBe("obiter:cit-9");
    expect(page.notes).toEqual(["Checked by librarian"]);
    expect(page.passthrough).toEqual({
      "formatted-footnote":
        "High Court of Australia, 'Judgment Summaries' (Web Page, 15 March 2021).",
      "formatted-bibliography":
        "High Court of Australia, 'Judgment Summaries' (Web Page, 15 March 2021)",
    });
  });
});

describe("endnoteXmlCodec.parse EndNote default types", () => {
  test("an X9 export with a numeric-only ref-type and EndNote's own Case type", () => {
    const { records, issues } = parseFixture("generic-endnote-x9.xml");
    expect(issues).toEqual([]);
    expect(records.map((r) => r.kind)).toEqual(["article", "case"]);

    const [stone, mabo] = records;
    expect(stone.provenance).toEqual({
      format: "endnote-xml",
      rawType: "0",
      rawId: "1",
      sourceLabel: "My EndNote Library.enl",
    });
    expect(stone.creators[0]).toMatchObject({ family: "Stone", given: "Adrienne" });
    expect(stone.containerTitle).toBe("Melbourne University Law Review");
    expect(stone.pageRange).toBe("668-708");
    expect(stone.issue).toBe("3");

    expect(mabo.provenance.rawType).toBe("Case");
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      courtName: "High Court of Australia",
      docket: "B12/1991",
      decidedDate: { year: 1992, month: 6, day: 3 },
    });
    expect(mabo.issued).toEqual({ year: 1992 });
  });

  test("an unknown type name falls back on the numeric id, then on Generic, with a warning", () => {
    const byNumber = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Mystery">17</ref-type><titles><title>X v Y</title></titles></record></records></xml>'
    );
    expect(byNumber.records[0].kind).toBe("case");
    expect(byNumber.records[0].legal?.caseName).toBe("X v Y");
    expect(byNumber.records[0].provenance.rawType).toBe("Mystery");
    expect(byNumber.issues).toEqual([
      expect.objectContaining({ severity: "warning", code: "unsupported-type", field: "ref-type" }),
    ]);
    expect(byNumber.issues[0].message).toContain('"Case"');

    const generic = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Mystery">999</ref-type><titles><title>T</title></titles></record></records></xml>'
    );
    expect(generic.records[0].kind).toBe("generic");
    expect(generic.records[0].title).toBe("T");
    expect(generic.issues[0].message).toMatch(/generic source/);

    const none = endnoteXmlCodec.parse(
      "<xml><records><record><titles><title>T</title></titles></record></records></xml>"
    );
    expect(none.records[0].kind).toBe("generic");
    expect(none.issues[0].message).toMatch(/no reference type/);
  });
});

describe("endnoteXmlCodec.parse tolerance", () => {
  test("malformed XML never throws", () => {
    expect(() => endnoteXmlCodec.parse("")).not.toThrow();
    expect(endnoteXmlCodec.parse("")).toEqual({ records: [], issues: [] });
    expect(() =>
      endnoteXmlCodec.parse("<xml><records><record><titles><title>unclosed")
    ).not.toThrow();
    expect(() => endnoteXmlCodec.parse("<<<>>> & nonsense")).not.toThrow();
    expect(() => endnoteXmlCodec.parse("just words")).not.toThrow();
    expect(() => parseEndnoteXml("<xml></records></xml>")).not.toThrow();

    const truncated = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Book">1</ref-type><titles><title><style>Unfinished'
    );
    expect(truncated.records).toHaveLength(1);
    expect(truncated.records[0].kind).toBe("book");
    expect(truncated.records[0].title).toBe("Unfinished");

    const noRecords = endnoteXmlCodec.parse("<html><body>Not EndNote</body></html>");
    expect(noRecords.records).toEqual([]);
    expect(noRecords.issues).toEqual([
      expect.objectContaining({ severity: "warning", code: "parse-error" }),
    ]);
  });

  test("a BOM, CRLF line endings and CR-separated notes are handled", () => {
    const text = `\uFEFF<?xml version="1.0"?>\r\n<xml><records><record><ref-type name="Book">1</ref-type>\r\n<titles><title>${styled("T")}</title></titles><notes>${styled("First&#xD;Second&#xD;obiter-id: cit-3&#xD;obiter-type: book")}</notes></record></records></xml>\r\n`;
    const { records, issues } = endnoteXmlCodec.parse(text);
    expect(issues).toEqual([]);
    expect(records[0].notes).toEqual(["First", "Second"]);
    expect(records[0].provenance.obiterId).toBe("cit-3");
    expect(records[0].provenance.obiterSourceType).toBe("book");
  });

  test("unparseable dates are kept as text with a warning", () => {
    const { records, issues } = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Journal Article">0</ref-type><dates><year>2005</year><pub-dates><date>forthcoming</date></pub-dates></dates></record></records></xml>'
    );
    expect(records[0].issued).toEqual({ year: 2005, raw: "forthcoming" });
    expect(issues).toEqual([expect.objectContaining({ code: "date-unparsed", field: "date" })]);
  });

  test("a Journal Article with the year in <section> flags square brackets", () => {
    const [rec] = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Journal Article">0</ref-type><section>2019</section><publisher>Pt 2</publisher></record></records></xml>'
    ).records;
    expect(rec.issued).toEqual({ year: 2019 });
    expect(rec.part).toBe("Pt 2");
    expect(rec.passthrough).toEqual({ "year-square-brackets": "true" });
  });

  test("the periodical full-title fills the container when secondary-title is empty", () => {
    const [rec] = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Journal Article">0</ref-type><periodical><full-title>Sydney Law Review</full-title><abbr-1>Syd L Rev</abbr-1></periodical></record></records></xml>'
    ).records;
    expect(rec.containerTitle).toBe("Sydney Law Review");
    expect(rec.containerTitleShort).toBe("Syd L Rev");
  });

  test("Treaty with a shared signed and in-force date and a not-yet-in-force note", () => {
    const [bilateral] = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Treaty">32</ref-type><titles><title>Closer Economic Relations</title></titles><publisher>Australia; New Zealand</publisher><num-vols>28 March 1983</num-vols></record></records></xml>'
    ).records;
    expect(bilateral.legal).toEqual({
      parties: ["Australia", "New Zealand"],
      signedDate: { year: 1983, month: 3, day: 28 },
      inForceDate: { year: 1983, month: 3, day: 28 },
    });

    const [pending] = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Treaty">32</ref-type><pages>not yet in force</pages></record></records></xml>'
    ).records;
    expect(pending.legal).toEqual({});
    expect(pending.passthrough).toEqual({ "not-yet-in-force": "not yet in force" });
  });

  test("issue messages use the Obiter voice", () => {
    const { issues } = endnoteXmlCodec.parse(
      '<xml><records><record><ref-type name="Zzz">999</ref-type><dates><pub-dates><date>soon</date></pub-dates></dates></record><record/></records></xml>'
    );
    expect(issues.length).toBeGreaterThan(1);
    for (const i of issues) {
      expect(i.message).not.toContain("!");
      expect(i.message).toMatch(/\.$/);
    }
  });
});

describe("endnoteXmlCodec.serialise", () => {
  const mabo: InterchangeRecord = {
    kind: "case",
    title: "Mabo v Queensland (No 2)",
    shortTitle: "Mabo",
    containerTitle: "CLR",
    creators: [],
    issued: { year: 1992 },
    volume: "175",
    pageFirst: "1",
    legal: {
      caseName: "Mabo v Queensland (No 2)",
      yearType: "round",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      judges: "Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ",
      decidedDate: { year: 1992, month: 6, day: 3 },
    },
    identifiers: {
      accessionNumber: "obiter:cit-1",
      url: "https://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html",
      urls: ["https://www.austlii.edu.au/au/cases/cth/HCA/1992/23.html"],
    },
    keywords: ["Native title"],
    abstract: "An abstract.",
    notes: ["Note one", "Note two"],
    attachments: ["mabo.pdf"],
    passthrough: {
      "reporter-full-name": "Commonwealth Law Reports",
      phase: "Judgment",
      label: "mabo1992",
      custom1: "Custom one",
    },
    provenance: {
      format: "endnote-xml",
      rawType: "Case (Reported)",
      obiterId: "cit-1",
      obiterSourceType: "case.reported",
    },
  };

  const smith: InterchangeRecord = {
    kind: "case",
    title: "Smith v Jones",
    containerTitle: "Qd R",
    creators: [],
    issued: { year: 1998 },
    volume: "1",
    pageFirst: "1",
    legal: {
      caseName: "Smith v Jones",
      yearType: "square",
      reporter: "Qd R",
      reporterVolume: "1",
      firstPage: "1",
      courtName: "Supreme Court of Queensland",
    },
    identifiers: {},
    keywords: [],
    notes: [],
    attachments: [],
    passthrough: {},
    provenance: { format: "endnote-xml", rawType: "Case (Reported)" },
  };

  test("writes the UTS type, reporter in secondary-title, judges in publisher and the Obiter identity", () => {
    const xml = endnoteXmlCodec.serialise([mabo]);
    expect(
      xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<xml>\n<records>\n<record>')
    ).toBe(true);
    expect(xml.endsWith("</record>\n</records>\n</xml>\n")).toBe(true);
    expect(xml).toContain('<database name="Obiter.enl" path="Obiter.enl">Obiter.enl</database>');
    expect(xml).toContain('<source-app name="Obiter" version="1">Obiter</source-app>');
    expect(xml).toContain("<rec-number>1</rec-number>");
    expect(xml).toContain('<ref-type name="Case (Reported)">18</ref-type>');
    expect(xml).toContain(`<title>${styled("Mabo v Queensland (No 2)")}</title>`);
    expect(xml).toContain(`<secondary-title>${styled("CLR")}</secondary-title>`);
    expect(xml).toContain(`<tertiary-title>${styled("Commonwealth Law Reports")}</tertiary-title>`);
    expect(xml).toContain(`<short-title>${styled("Mabo")}</short-title>`);
    expect(xml).toContain(`<volume>${styled("175")}</volume>`);
    expect(xml).toContain(`<pages>${styled("1")}</pages>`);
    expect(xml).toContain(`<year>${styled("1992")}</year>`);
    expect(xml).toContain(`<pub-dates><date>${styled("3 June 1992")}</date></pub-dates>`);
    expect(xml).toContain(
      `<publisher>${styled("Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ")}</publisher>`
    );
    expect(xml).toContain(`<work-type>${styled("Judgment")}</work-type>`);
    expect(xml).toContain(`<notes>${styled("Note one&#xD;Note two")}</notes>`);
    expect(xml).toContain(`<accession-num>${styled("obiter:cit-1")}</accession-num>`);
    expect(xml).toContain(`<custom8>${styled("obiter-type:case.reported")}</custom8>`);
    expect(xml).toContain(`<remote-database-name>${styled("Obiter")}</remote-database-name>`);
    expect(xml).toContain(`<pdf-urls><url>${styled("mabo.pdf")}</url></pdf-urls>`);
    expect(xml).not.toContain("<section>");
    expect(xml).not.toContain("<edition>");
  });

  test("a square-bracket year goes to <section> and the court to <publisher>", () => {
    const xml = endnoteXmlCodec.serialise([smith]);
    expect(xml).toContain(`<section>${styled("1998")}</section>`);
    expect(xml).not.toContain("<year>");
    expect(xml).toContain(`<publisher>${styled("Supreme Court of Queensland")}</publisher>`);
  });

  test("the generic profile writes EndNote's own type names and ids", () => {
    const xml = endnoteXmlCodec.serialise([mabo], { endnoteStyle: "generic" });
    expect(xml).toContain('<ref-type name="Case">17</ref-type>');
    expect(xml).toContain(`<secondary-title>${styled("CLR")}</secondary-title>`);
    const back = endnoteXmlCodec.parse(xml).records[0];
    expect(back.kind).toBe("case");
    expect(back.legal?.reporter).toBe("CLR");
    expect(back.legal?.judges).toBe("Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ");
    expect(back.legal?.courtName).toBeUndefined();

    const article = endnoteXmlCodec.serialise(
      [
        {
          ...mabo,
          kind: "article",
          legal: undefined,
          provenance: { format: "ris", rawType: "JOUR" },
        },
      ],
      { endnoteStyle: "generic" }
    );
    expect(article).toContain('<ref-type name="Journal Article">0</ref-type>');
  });

  test("type names fall back from the Obiter source type to the kind", () => {
    const withoutType: InterchangeRecord = {
      ...smith,
      provenance: { format: "ris", rawType: "CASE" },
    };
    expect(endnoteXmlCodec.serialise([withoutType])).toContain(
      '<ref-type name="Case (Reported)">18'
    );
    const mnc: InterchangeRecord = {
      ...withoutType,
      legal: {
        caseName: "Comcare v Banerji",
        courtCode: "HCA",
        docket: "23",
        mnc: { year: 2019, court: "HCA", number: 23, raw: "[2019] HCA 23" },
      },
    };
    expect(endnoteXmlCodec.serialise([mnc])).toContain('<ref-type name="Case (Medium Neutral)">24');
    expect(
      endnoteXmlCodec.serialise([{ ...withoutType, kind: "hansard", legal: undefined }])
    ).toContain('<ref-type name="Parl. Debate">36');
    expect(
      endnoteXmlCodec.serialise([{ ...withoutType, kind: "legislation", legal: undefined }])
    ).toContain('<ref-type name="Statute">22');
    expect(
      endnoteXmlCodec.serialise([{ ...withoutType, kind: "blog", legal: undefined }])
    ).toContain('<ref-type name="Blog Post">43');
    expect(
      endnoteXmlCodec.serialise([{ ...withoutType, kind: "genai", legal: undefined }])
    ).toContain('<ref-type name="Generic">31');
    // A record that arrived as a UTS type keeps that type on the way out.
    const [unreported] = parseFixture("uts-case-unreported.xml").records;
    expect(endnoteXmlCodec.serialise([unreported])).toContain(
      '<ref-type name="Case (Unreported no Medium Neutral)">14'
    );
  });

  test("formatted citations are written as notes and gated by includeFormatted", () => {
    const rec: InterchangeRecord = {
      ...mabo,
      formatted: {
        standard: "AGLC4",
        footnote: "Mabo v Queensland (No 2) (1992) 175 CLR 1.",
        bibliography: "Mabo v Queensland (No 2) (1992) 175 CLR 1",
      },
    };
    const xml = endnoteXmlCodec.serialise([rec]);
    expect(xml).toContain(
      styled(
        "Note one&#xD;Note two&#xD;AGLC4 footnote: Mabo v Queensland (No 2) (1992) 175 CLR 1.&#xD;AGLC4 bibliography: Mabo v Queensland (No 2) (1992) 175 CLR 1"
      )
    );
    const back = endnoteXmlCodec.parse(xml).records[0];
    expect(back.notes).toEqual(["Note one", "Note two"]);
    expect(back.passthrough["formatted-footnote"]).toBe(
      "Mabo v Queensland (No 2) (1992) 175 CLR 1."
    );
    expect(back.passthrough["formatted-bibliography"]).toBe(
      "Mabo v Queensland (No 2) (1992) 175 CLR 1"
    );

    const gated = endnoteXmlCodec.serialise([rec], { includeFormatted: false });
    expect(gated).not.toContain("AGLC4 footnote");
    expect(gated).toContain(`<notes>${styled("Note one&#xD;Note two")}</notes>`);
  });

  test("Hansard writes the jurisdiction as the author and the speaker as the publisher", () => {
    const hansard: InterchangeRecord = {
      kind: "hansard",
      creators: [
        { role: "speaker", raw: "Albanese, Anthony", family: "Albanese", given: "Anthony" },
      ],
      issued: { year: 2020, month: 3, day: 12 },
      pageFirst: "2345",
      legal: { jurisdiction: "Commonwealth", chamber: "House of Representatives" },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: { "speaker-position": "Prime Minister" },
      provenance: { format: "endnote-xml", rawType: "Parl. Debate", obiterSourceType: "hansard" },
    };
    const xml = endnoteXmlCodec.serialise([hansard]);
    expect(xml).toContain('<ref-type name="Parl. Debate">36</ref-type>');
    expect(xml).toContain(`<authors><author>${styled("Commonwealth")}</author></authors>`);
    expect(xml).toContain(`<title>${styled("House of Representatives")}</title>`);
    expect(xml).toContain(`<publisher>${styled("Albanese, Anthony")}</publisher>`);
    expect(xml).toContain(`<volume>${styled("Prime Minister")}</volume>`);
    expect(xml).toContain(`<pages>${styled("2345")}</pages>`);
    expect(xml).toContain(`<date>${styled("12 March 2020")}</date>`);
    expect(comparable(endnoteXmlCodec.parse(xml).records[0])).toEqual(comparable(hansard));
  });

  test("entities are encoded and an empty list yields an empty document", () => {
    const xml = endnoteXmlCodec.serialise([
      {
        ...smith,
        title: 'R & D <"x"> v Y',
        legal: { ...smith.legal, caseName: 'R & D <"x"> v Y' },
      },
    ]);
    expect(xml).toContain(styled("R &amp; D &lt;&quot;x&quot;&gt; v Y"));
    expect(endnoteXmlCodec.parse(xml).records[0].title).toBe('R & D <"x"> v Y');
    expect(endnoteXmlCodec.serialise([])).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<xml>\n<records>\n</records>\n</xml>\n'
    );
    expect(endnoteXmlCodec.serialise([], { lineEnding: "\r\n" })).toContain("\r\n<xml>\r\n");
  });
});

describe("serialise -> parse round trip", () => {
  test("a reported case with every field is identical after a round trip", () => {
    const record: InterchangeRecord = {
      kind: "case",
      title: "Mabo v Queensland (No 2)",
      shortTitle: "Mabo",
      containerTitle: "CLR",
      creators: [],
      issued: { year: 1992 },
      volume: "175",
      pageFirst: "1",
      legal: {
        caseName: "Mabo v Queensland (No 2)",
        yearType: "round",
        reporter: "CLR",
        reporterVolume: "175",
        firstPage: "1",
        judges: "Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ",
        decidedDate: { year: 1992, month: 6, day: 3 },
      },
      identifiers: {
        accessionNumber: "obiter:cit-1",
        url: "https://example.org/mabo",
        urls: ["https://example.org/mabo", "https://example.org/mabo-alt"],
      },
      keywords: ["Native title", "Terra nullius"],
      abstract: "An abstract.",
      notes: ["Note one", "Note two"],
      attachments: ["mabo.pdf"],
      passthrough: {
        "reporter-full-name": "Commonwealth Law Reports",
        phase: "Judgment",
        label: "mabo1992",
        custom1: "Custom one",
      },
      provenance: {
        format: "endnote-xml",
        rawType: "Case (Reported)",
        obiterId: "cit-1",
        obiterSourceType: "case.reported",
      },
    };
    const { records, issues } = endnoteXmlCodec.parse(endnoteXmlCodec.serialise([record]));
    expect(issues).toEqual([]);
    expect(records).toHaveLength(1);
    expect(records[0].provenance.sourceLabel).toBe("Obiter");
    expect(records[0].provenance.rawId).toBe("1");
    expect(comparable(records[0])).toEqual(comparable(record));
  });

  test("square-year case, medium neutral case, statute and treaty round trip", () => {
    const square: InterchangeRecord = {
      kind: "case",
      title: "Smith v Jones",
      containerTitle: "Qd R",
      creators: [],
      issued: { year: 1998 },
      volume: "1",
      pageFirst: "1",
      legal: {
        caseName: "Smith v Jones",
        yearType: "square",
        reporter: "Qd R",
        reporterVolume: "1",
        firstPage: "1",
        courtName: "Supreme Court of Queensland",
      },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: {},
      provenance: {
        format: "endnote-xml",
        rawType: "Case (Reported)",
        obiterSourceType: "case.reported",
      },
    };
    const mnc: InterchangeRecord = {
      kind: "case",
      title: "Comcare v Banerji",
      creators: [],
      issued: { year: 2019 },
      legal: {
        caseName: "Comcare v Banerji",
        courtCode: "HCA",
        docket: "23",
        mnc: { year: 2019, court: "HCA", number: 23, raw: "[2019] HCA 23" },
        decidedDate: { year: 2019, month: 8, day: 7 },
      },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: {},
      provenance: {
        format: "endnote-xml",
        rawType: "Case (Medium Neutral)",
        obiterSourceType: "case.unreported.mnc",
      },
    };
    const statute: InterchangeRecord = {
      kind: "legislation",
      title: "Native Title Act 1993 (Cth)",
      creators: [],
      issued: { year: 1993 },
      legal: {
        actTitle: "Native Title Act 1993 (Cth)",
        actYear: 1993,
        jurisdiction: "Commonwealth",
      },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: { "date-in-force": "1 January 1994" },
      provenance: {
        format: "endnote-xml",
        rawType: "Statute",
        obiterSourceType: "legislation.statute",
      },
    };
    const treaty: InterchangeRecord = {
      kind: "treaty",
      title: "Rome Statute of the International Criminal Court",
      creators: [],
      issued: { year: 1998 },
      legal: {
        parties: ["Australia", "New Zealand"],
        openedDate: { year: 1998, month: 7, day: 17 },
        inForceDate: { year: 2002, month: 7, day: 1 },
        treatySeries: "2187 UNTS 3",
      },
      identifiers: {},
      keywords: [],
      notes: [],
      attachments: [],
      passthrough: {},
      provenance: { format: "endnote-xml", rawType: "Treaty", obiterSourceType: "treaty" },
    };
    const input = [square, mnc, statute, treaty];
    const xml = endnoteXmlCodec.serialise(input);
    expect(xml).toContain('<ref-type name="Case (Medium Neutral)">24</ref-type>');
    expect(xml).toContain(`<secondary-title>${styled("HCA")}</secondary-title>`);
    expect(xml).toContain(`<secondary-title>${styled("Commonwealth")}</secondary-title>`);
    expect(xml).toContain(`<publisher>${styled("Australia; New Zealand")}</publisher>`);
    expect(xml).toContain(`<number>${styled("17 July 1998")}</number>`);
    expect(xml).toContain(`<section>${styled("2187 UNTS 3")}</section>`);
    const { records, issues } = endnoteXmlCodec.parse(xml);
    expect(issues).toEqual([]);
    expect(records.map(comparable)).toEqual(input.map(comparable));
    expect(records.map((r) => r.provenance.rawId)).toEqual(["1", "2", "3", "4"]);
  });

  test("every UTS fixture survives a round trip", () => {
    const names = [
      "uts-case-reported.xml",
      "uts-case-square-year.xml",
      "uts-case-mnc.xml",
      "uts-case-unreported.xml",
      "uts-statute.xml",
      "uts-regulations.xml",
      "uts-bill.xml",
      "uts-treaty.xml",
      "uts-book.xml",
      "uts-book-chapter.xml",
      "uts-law-reform.xml",
      "uts-internet.xml",
    ];
    for (const name of names) {
      const { records } = parseFixture(name);
      const again = endnoteXmlCodec.parse(endnoteXmlCodec.serialise(records));
      expect(again.issues).toEqual([]);
      expect(again.records.map(comparable)).toEqual(records.map(comparable));
    }
  });
});

describe("performance", () => {
  test("parses 1000 records in under two seconds", () => {
    const one = fixture("uts-journal-article.xml");
    const start = one.indexOf("<record>");
    const end = one.indexOf("</record>") + "</record>".length;
    const record = one.slice(start, end);
    const text = `<xml><records>${Array.from({ length: 1000 }, () => record).join("")}</records></xml>`;
    const started = Date.now();
    const { records, issues } = endnoteXmlCodec.parse(text);
    expect(records).toHaveLength(1000);
    expect(issues).toEqual([]);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
