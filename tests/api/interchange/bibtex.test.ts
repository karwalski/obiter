/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-003: the BibTeX / BibLaTeX codec — parse, map, serialise.
 */

import fs from "fs";
import path from "path";

import {
  bibtexCodec,
  convertLatexToUnicode,
  parseBibTeX,
} from "../../../src/api/interchange/codecs/bibtex";
import { getCodec, hasCodec } from "../../../src/api/interchange/codec";
import { createRecord } from "../../../src/api/interchange/model";
import type { InterchangeRecord } from "../../../src/api/interchange/model";

const FIXTURE_DIR = path.resolve(__dirname, "../../fixtures/interchange/bibtex");

function fixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf-8");
}

describe("registration and sniffing", () => {
  test("registers itself on load", () => {
    expect(hasCodec("bibtex")).toBe(true);
    expect(getCodec("bibtex")).toBe(bibtexCodec);
    expect(bibtexCodec.label).toBe("BibTeX");
    expect(bibtexCodec.extensions).toEqual([".bib", ".bibtex"]);
    expect(bibtexCodec.mimeType).toBe("application/x-bibtex");
    expect(bibtexCodec.canExport).toBe(true);
  });

  test("scores entries, directives-only and non-BibTeX text", () => {
    expect(bibtexCodec.sniff(fixture("zotero-export.bib"))).toBe(0.9);
    expect(bibtexCodec.sniff("@Article(key, title = {x})")).toBe(0.9);
    expect(bibtexCodec.sniff('@string{mulr = "MULR"}\n@comment{nothing}')).toBe(0.6);
    expect(bibtexCodec.sniff("TY  - JOUR\nAU  - Luntz, Harold\nER  -")).toBe(0);
    expect(bibtexCodec.sniff("plain text with an email@example.com in it")).toBe(0);
    expect(bibtexCodec.sniff("")).toBe(0);
  });

  test("XML with an @ inside scores zero", () => {
    expect(bibtexCodec.sniff("<xml><record><notes>@book{x, y = {z}}</notes></record></xml>")).toBe(
      0
    );
  });
});

describe("zotero-export.bib", () => {
  const result = bibtexCodec.parse(fixture("zotero-export.bib"));

  test("reads five records with no issues", () => {
    expect(result.issues).toEqual([]);
    expect(result.records).toHaveLength(5);
    expect(result.records.map((r) => r.kind)).toEqual([
      "book",
      "article",
      "chapter",
      "case",
      "web",
    ]);
  });

  test("@book: authors, edition, place, isbn, keywords, cite key", () => {
    const book = result.records[0];
    expect(book.creators).toEqual([
      { role: "author", raw: "Edelman, James", family: "Edelman", given: "James" },
      { role: "author", raw: "Bant, Elise", family: "Bant", given: "Elise" },
    ]);
    expect(book.title).toBe("Unjust Enrichment");
    expect(book.edition).toBe("2");
    expect(book.publisher).toBe("Hart Publishing");
    expect(book.place).toBe("Oxford");
    expect(book.issued).toEqual({ year: 2016 });
    expect(book.identifiers).toEqual({ citeKey: "edelman_unjust_2016", isbn: "978-1-84946-573-5" });
    expect(book.keywords).toEqual(["restitution", "unjust enrichment"]);
    expect(book.provenance).toEqual({
      format: "bibtex",
      rawType: "book",
      rawId: "edelman_unjust_2016",
    });
  });

  test("@article: journal, volume, issue, pages split, escapes, note braces", () => {
    const article = result.records[1];
    expect(article.containerTitle).toBe("University of New South Wales Law Journal");
    expect(article.volume).toBe("25");
    expect(article.issue).toBe("3");
    expect(article.number).toBeUndefined();
    expect(article.pageRange).toBe("393–420");
    expect(article.pageFirst).toBe("393");
    expect(article.pageLast).toBe("420");
    expect(article.abstract).toBe("The author considers the Ipp Review & its consequences.");
    expect(article.notes).toEqual(["Reviewed in the UNSWLJ forum"]);
  });

  test("@incollection: booktitle and editors", () => {
    const chapter = result.records[2];
    expect(chapter.containerTitle).toBe("The Common Law of Obligations: Divergence and Unity");
    expect(chapter.creators.map((c) => `${c.role}:${c.family}`)).toEqual([
      "author:Gardner",
      "editor:Robertson",
      "editor:Wu",
    ]);
    expect(chapter.creators[2].given).toBe("Tang Hang");
    expect(chapter.pageFirst).toBe("17");
    expect(chapter.pageLast).toBe("44");
  });

  test("@misc with a case citation in the note becomes a case", () => {
    const mabo = result.records[3];
    expect(mabo.kind).toBe("case");
    expect(mabo.title).toBe("Mabo v Queensland (No 2)");
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      yearType: "round",
      reporterVolume: "175",
      reporter: "CLR",
      firstPage: "1",
    });
    expect(mabo.passthrough).toEqual({ citation: "(1992) 175 CLR 1" });
    expect(mabo.issued).toEqual({ year: 1992 });
    expect(mabo.provenance.rawType).toBe("misc");
  });

  test("@online: corporate author, url, dates, obiter lines in note", () => {
    const web = result.records[4];
    expect(web.creators).toEqual([
      { role: "author", raw: "{Oxfam International}", literal: "Oxfam International" },
    ]);
    expect(web.identifiers.url).toBe("https://www.oxfam.org/en/research/survival-richest");
    expect(web.issued).toEqual({ year: 2023, month: 1, day: 16 });
    expect(web.accessed).toEqual({ year: 2023, month: 3, day: 14 });
    expect(web.provenance.obiterId).toBe("4f2c1a2e-1111-4bbb-8ccc-0123456789ab");
    expect(web.provenance.obiterSourceType).toBe("internet_material");
    expect(web.notes).toEqual([]);
  });
});

describe("biblatex-legal.bib", () => {
  const result = bibtexCodec.parse(fixture("biblatex-legal.bib"));

  test("@jurisdiction maps reporter, volume, first page and court", () => {
    expect(result.issues).toEqual([]);
    const mabo = result.records[0];
    expect(mabo.kind).toBe("case");
    expect(mabo.provenance.rawType).toBe("jurisdiction");
    expect(mabo.legal).toEqual({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      courtName: "High Court of Australia",
    });
    expect(mabo.containerTitle).toBe("CLR");
    expect(mabo.volume).toBe("175");
    expect(mabo.pageFirst).toBe("1");
    expect(mabo.pageLast).toBeUndefined();
    expect(mabo.issued).toEqual({ year: 1992 });
  });

  test("@legislation maps location to jurisdiction and keeps section", () => {
    const nta = result.records[1];
    expect(nta.kind).toBe("legislation");
    expect(nta.title).toBe("Native Title Act 1993");
    expect(nta.legal).toEqual({ jurisdiction: "Cth", section: "223" });
    expect(nta.place).toBeUndefined();
    expect(nta.issued).toEqual({ year: 1993 });
  });
});

describe("strings-and-accents.bib", () => {
  const result = bibtexCodec.parse(fixture("strings-and-accents.bib"));
  const article = result.records[0];

  test("skips @preamble and @comment and expands @string with # concatenation", () => {
    expect(result.issues).toEqual([]);
    expect(result.records).toHaveLength(1);
    expect(article.containerTitle).toBe("Melbourne University Law Review");
    expect(article.publisher).toBe("Melbourne University Press Ltd");
  });

  test("accents convert after the names are split", () => {
    expect(article.creators[0]).toEqual({
      role: "author",
      raw: "Dupr{\\'e}, Ren{\\'e}",
      family: "Dupré",
      given: "René",
    });
    expect(article.creators[1]).toMatchObject({ family: "Möller", given: "Søren" });
  });

  test("corporate braces are preserved as a literal and others becomes etal", () => {
    expect(article.creators).toHaveLength(3);
    expect(article.creators[2]).toEqual({
      role: "author",
      raw: "{Law Council of Australia}",
      literal: "Law Council of Australia",
    });
    expect(article.passthrough).toEqual({ etal: "true" });
  });

  test("title and subtitle join, month macro and bare numbers", () => {
    expect(article.title).toBe("François and the Über-Case: A Study");
    expect(article.issued).toEqual({ year: 2019, month: 3 });
    expect(article.volume).toBe("42");
    expect(article.issue).toBe("2");
    expect(article.pageRange).toBe("1013–1045");
  });
});

describe("malformed.bib", () => {
  const result = bibtexCodec.parse(fixture("malformed.bib"));

  test("a missing comma after the cite key still parses, with a warning naming the line", () => {
    expect(result.records).toHaveLength(2);
    const first = result.records[0];
    expect(first.identifiers.citeKey).toBe("missingcomma2001");
    expect(first.title).toBe("An Entry Without a Comma");
    expect(first.creators[0]).toMatchObject({ family: "Smith", given: "Jane" });
    expect(first.issued).toEqual({ year: 2001 });
    expect(result.issues[0]).toMatchObject({
      severity: "warning",
      code: "parse-error",
      line: 1,
      recordIndex: 0,
    });
    expect(result.issues[0].message).toContain("no comma after its cite key");
  });

  test("an unclosed entry at end of file is read to the end, with a warning", () => {
    const second = result.records[1];
    expect(second.identifiers.citeKey).toBe("unbalanced2003");
    expect(second.title).toBe("An Entry That Never Closes");
    expect(second.issued).toEqual({ year: 2003 });
    expect(result.issues[1]).toMatchObject({ severity: "warning", code: "parse-error", line: 7 });
    expect(result.issues).toHaveLength(2);
  });
});

describe("parse edge cases", () => {
  test("never throws on garbage", () => {
    const garbage = [
      "",
      "@",
      "@@@{{{",
      "@article",
      "@article{",
      "@article{key,",
      "@article{key, title = ",
      "@article{key, title = {unclosed",
      '@article{key, = {no name}, title = "quoted',
      "@string{",
      "@string{a = }",
      " �@misc(",
      "}}}}@book{x, author = {A and}, year = {}}",
    ];
    for (const text of garbage) {
      expect(() => bibtexCodec.parse(text)).not.toThrow();
    }
    expect(bibtexCodec.parse("no entries here").records).toEqual([]);
  });

  test("unknown entry types become generic with a warning", () => {
    const result = bibtexCodec.parse("@widget{w1, title = {A Widget}}");
    expect(result.records[0].kind).toBe("generic");
    expect(result.issues[0]).toMatchObject({ code: "unsupported-type", recordIndex: 0 });
  });

  test("@misc heuristics: citation embedded at the end of the title, legislation, bill, url", () => {
    const text = [
      "@misc{a, title = {Mabo v Queensland (No 2) (1992) 175 CLR 1}}",
      "@misc{b, title = {Wik Peoples v Queensland [1996] HCA 40}}",
      "@misc{c, title = {Crimes Act 1900 (NSW)}}",
      "@misc{d, title = {Voice Referendum Bill 2023 (Cth)}}",
      "@misc{e, title = {A page}, url = {https://example.org}}",
      "@misc{f, title = {Nothing special}}",
    ].join("\n");
    const { records } = bibtexCodec.parse(text);
    expect(records.map((r) => r.kind)).toEqual([
      "case",
      "case",
      "legislation",
      "bill",
      "web",
      "generic",
    ]);
    expect(records[0].title).toBe("Mabo v Queensland (No 2)");
    expect(records[0].legal?.caseName).toBe("Mabo v Queensland (No 2)");
    expect(records[0].passthrough.citation).toBe("(1992) 175 CLR 1");
    expect(records[1].legal).toMatchObject({
      yearType: "square",
      reporter: "HCA",
      firstPage: "40",
    });
    expect(records[2].legal).toEqual({ jurisdiction: "NSW" });
    expect(records[3].legal).toEqual({ jurisdiction: "Cth" });
  });

  test("dates: year/month/day, ranges, urldate, free text", () => {
    const text = [
      "@book{a, year = {2002}, month = {November}, day = {21}}",
      "@book{b, date = {1992/1993}}",
      "@book{c, year = {forthcoming}}",
      "@book{d, date = {2020-05}, year = {1999}}",
      "@book{e, year = 1988, month = jan}",
    ].join("\n");
    const { records } = bibtexCodec.parse(text);
    expect(records[0].issued).toEqual({ year: 2002, month: 11, day: 21 });
    expect(records[1].issued).toEqual({ year: 1992, raw: "1992/1993" });
    expect(records[2].issued).toEqual({ raw: "forthcoming" });
    expect(records[3].issued).toEqual({ year: 2020, month: 5 });
    expect(records[4].issued).toEqual({ year: 1988, month: 1 });
  });

  test("field routing: howpublished, institution, entrysubtype, file, keywords, custom", () => {
    const text = [
      "@misc{a, howpublished = {https://example.org/x}, title = {T}}",
      "@misc{b, howpublished = {Self-published}, title = {T}}",
      "@techreport{c, institution = {ALRC}, title = {T}, type = {Final Report}, number = {108}}",
      "@article{d, entrysubtype = {newspaper}, title = {T}, journaltitle = {The Age}}",
      "@article{e, entrysubtype = {magazine}, title = {T}}",
      "@book{f, file = {Full Text PDF:files/1/a.pdf:application/pdf;files/2/b.pdf}, keywords = {x; y, z}, obiterid = {id-9}, obitertype = {book}, myfield = {kept}, version = {3}}",
    ].join("\n");
    const { records } = bibtexCodec.parse(text);
    expect(records[0].identifiers.url).toBe("https://example.org/x");
    expect(records[0].kind).toBe("web");
    expect(records[1].passthrough).toEqual({ howpublished: "Self-published" });
    expect(records[2].institution).toBe("ALRC");
    expect(records[2].publisher).toBe("ALRC");
    expect(records[2].genre).toBe("Final Report");
    expect(records[2].number).toBe("108");
    expect(records[3].kind).toBe("newspaper");
    expect(records[3].containerTitle).toBe("The Age");
    expect(records[4].kind).toBe("periodical");
    expect(records[5].attachments).toEqual(["files/1/a.pdf", "files/2/b.pdf"]);
    expect(records[5].keywords).toEqual(["x", "y", "z"]);
    expect(records[5].provenance.obiterId).toBe("id-9");
    expect(records[5].provenance.obiterSourceType).toBe("book");
    expect(records[5].passthrough).toEqual({ myfield: "kept", version: "3" });
  });

  test("parenthesised entries, quoted values and CRLF input", () => {
    const text = '@Article(key1,\r\n  title = "A {Quoted} Title",\r\n  year = "2001"\r\n)';
    const { records, issues } = bibtexCodec.parse(text);
    expect(issues).toEqual([]);
    expect(records[0].title).toBe("A Quoted Title");
    expect(records[0].issued).toEqual({ year: 2001 });
  });
});

describe("parseBibTeX (legacy shape)", () => {
  test("returns entryType, citeKey and converted fields", () => {
    const entries = parseBibTeX(fixture("strings-and-accents.bib"));
    expect(entries).toHaveLength(1);
    expect(entries[0].entryType).toBe("article");
    expect(entries[0].citeKey).toBe("dupre2019");
    expect(entries[0].fields.journal).toBe("Melbourne University Law Review");
    expect(entries[0].fields.author).toBe(
      "Dupré, René and Möller, Søren and Law Council of Australia and others"
    );
    expect(entries[0].fields.month).toBe("3");
    expect(entries[0].fields.pages).toBe("1013--1045");
  });

  test("convertLatexToUnicode handles escapes, accents and unknown commands", () => {
    expect(convertLatexToUnicode("Smith \\& Jones \\_ 100\\%")).toBe("Smith & Jones _ 100%");
    expect(convertLatexToUnicode("{\\'E}mile \\c{c} \\\"{o} \\~n \\v{s}")).toBe("Émile ç ö ñ š");
    expect(convertLatexToUnicode("\\textbf{Bold} and \\emph{it}")).toBe("Bold and it");
    expect(convertLatexToUnicode("Braces \\{kept\\} but {these} go")).toBe(
      "Braces {kept} but these go"
    );
    expect(convertLatexToUnicode("Multi\n  line   text")).toBe("Multi line text");
  });
});

// ─── Export ─────────────────────────────────────────────────────────────────

function bookRecord(): InterchangeRecord {
  const record = createRecord("book", { format: "bibtex", rawType: "book" });
  record.creators = [
    { role: "author", raw: "James Edelman", family: "Edelman", given: "James" },
    { role: "author", raw: "Elise Bant", family: "Bant", given: "Elise" },
  ];
  record.title = "Unjust Enrichment";
  record.edition = "2";
  record.publisher = "Hart Publishing";
  record.place = "Oxford";
  record.issued = { year: 2016 };
  record.identifiers = { isbn: "978-1-84946-573-5" };
  record.keywords = ["restitution", "unjust enrichment"];
  record.notes = ["Ch 3 & 4"];
  record.formatted = {
    standard: "James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)",
    footnote: "James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)",
    bibliography:
      "Edelman, James and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)",
  };
  return record;
}

function caseRecord(): InterchangeRecord {
  const record = createRecord("case", {
    format: "bibtex",
    rawType: "jurisdiction",
    obiterId: "abc-123",
    obiterSourceType: "case.reported",
  });
  record.title = "Mabo v Queensland (No 2)";
  record.issued = { year: 1992 };
  record.identifiers = { citeKey: "mabo1992" };
  record.legal = {
    caseName: "Mabo v Queensland (No 2)",
    reporter: "CLR",
    reporterVolume: "175",
    firstPage: "1",
    courtName: "High Court of Australia",
  };
  return record;
}

function legislationRecord(): InterchangeRecord {
  const record = createRecord("legislation", { format: "bibtex", rawType: "legislation" });
  record.title = "Native Title Act 1993";
  record.issued = { year: 1993 };
  record.legal = { jurisdiction: "Cth", section: "223" };
  return record;
}

const EXPECTED_EXPORT = [
  "@book{edelman2016unjust,",
  "  author = {Edelman, James and Bant, Elise},",
  "  title = {Unjust Enrichment},",
  "  publisher = {Hart Publishing},",
  "  location = {Oxford},",
  "  edition = {2},",
  "  date = {2016},",
  "  isbn = {978-1-84946-573-5},",
  "  keywords = {restitution, unjust enrichment},",
  "  note = {Ch 3 \\& 4; AGLC4 footnote: James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016); AGLC4 bibliography: Edelman, James and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)}",
  "}",
  "",
  "@jurisdiction{mabo1992,",
  "  title = {Mabo v Queensland (No 2)},",
  "  journaltitle = {CLR},",
  "  volume = {175},",
  "  pages = {1},",
  "  date = {1992},",
  "  court = {High Court of Australia},",
  "  obiterid = {abc-123},",
  "  obitertype = {case.reported}",
  "}",
  "",
  "@legislation{1993native,",
  "  title = {Native Title Act 1993},",
  "  location = {Cth},",
  "  date = {1993},",
  "  jurisdiction = {Cth},",
  "  section = {223}",
  "}",
  "",
].join("\n");

describe("serialise", () => {
  test("writes the documented BibLaTeX shape", () => {
    const text = bibtexCodec.serialise([bookRecord(), caseRecord(), legislationRecord()]);
    expect(text).toBe(EXPECTED_EXPORT);
  });

  test("includeFormatted: false drops the AGLC4 lines and CRLF is honoured", () => {
    const text = bibtexCodec.serialise([bookRecord()], {
      includeFormatted: false,
      lineEnding: "\r\n",
    });
    expect(text).toContain("  note = {Ch 3 \\& 4}\r\n}\r\n");
    expect(text).not.toContain("AGLC4");
    expect(text.split("\r\n")).toHaveLength(12);
  });

  test("empty input serialises to an empty string", () => {
    expect(bibtexCodec.serialise([])).toBe("");
  });

  test("generated cite keys are ASCII and deduplicated with letter suffixes", () => {
    const make = (given: string): InterchangeRecord => {
      const record = createRecord("article", { format: "bibtex", rawType: "article" });
      record.creators = [{ role: "author", raw: "", family: "Möller-Dupré", given }];
      record.title = "The Reform of Negligence";
      record.issued = { year: 2002 };
      return record;
    };
    const explicit = make("D");
    explicit.identifiers.citeKey = "mollerdupre2002reform";
    const text = bibtexCodec.serialise([make("A"), make("B"), make("C"), explicit]);
    expect(text.match(/^@article\{([^,]+),/gm)).toEqual([
      "@article{mollerdupre2002reform,",
      "@article{mollerdupre2002reforma,",
      "@article{mollerdupre2002reformb,",
      "@article{mollerdupre2002reformc,",
    ]);
  });

  test("a record with no creators, date or title still gets a key", () => {
    const record = createRecord("generic", { format: "bibtex", rawType: "misc" });
    expect(bibtexCodec.serialise([record])).toBe("@misc{ref,\n}\n");
  });

  test("and others is written back from the etal passthrough", () => {
    const record = createRecord("article", { format: "bibtex", rawType: "article" });
    record.creators = [{ role: "author", raw: "", family: "Luntz", given: "Harold" }];
    record.passthrough.etal = "true";
    const text = bibtexCodec.serialise([record]);
    expect(text).toContain("  author = {Luntz, Harold and others}");
    expect(text).not.toContain("etal");
  });
});

describe("round trip", () => {
  test("serialise then parse returns an equal record for every supported field", () => {
    const record: InterchangeRecord = {
      kind: "article",
      title: "Reform of the Law of Negligence",
      shortTitle: "Reform",
      containerTitle: "University of New South Wales Law Journal",
      collectionTitle: "Special Series",
      creators: [
        { role: "author", raw: "Luntz, Harold", family: "Luntz", given: "Harold" },
        {
          role: "author",
          raw: "Roberts, Jr, John G",
          family: "Roberts",
          suffix: "Jr",
          given: "John G",
        },
        { role: "editor", raw: "Robertson, Andrew", family: "Robertson", given: "Andrew" },
        {
          role: "translator",
          raw: "{Law Council of Australia}",
          literal: "Law Council of Australia",
        },
      ],
      issued: { year: 2002, month: 3, day: 5 },
      accessed: { year: 2024, month: 1, day: 2 },
      eventDate: { year: 2001, month: 11 },
      volume: "25",
      issue: "3",
      pageFirst: "393",
      pageLast: "420",
      pageRange: "393–420",
      edition: "2",
      publisher: "UNSW Press",
      place: "Sydney",
      institution: "UNSW Law",
      genre: "Review",
      event: "Torts Conference",
      eventPlace: "Sydney",
      language: "english",
      legal: {
        courtName: "High Court of Australia",
        jurisdiction: "NSW",
        docket: "S123/2002",
        section: "5",
      },
      identifiers: {
        citeKey: "luntz2002",
        url: "https://example.org/a_b?x=1&y=2",
        doi: "10.1000/xyz_1",
        isbn: "978-1-86287-000-0",
        issn: "0313-0096",
      },
      keywords: ["torts", "negligence"],
      abstract: "The Ipp Review & 100% of its consequences, #1 in $ terms",
      notes: ["Reviewed in the forum; see also Ch 2"],
      attachments: [],
      passthrough: { version: "2", custom: "hello_world" },
      provenance: {
        format: "bibtex",
        rawType: "article",
        rawId: "luntz2002",
        obiterId: "id-1",
        obiterSourceType: "journal.article",
      },
    };

    const text = bibtexCodec.serialise([record]);
    const parsed = bibtexCodec.parse(text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0]).toEqual(record);
  });

  test("a case record round trips its legal fields", () => {
    const record = caseRecord();
    record.creators = [];
    const parsed = bibtexCodec.parse(bibtexCodec.serialise([record])).records[0];
    expect(parsed.kind).toBe("case");
    expect(parsed.legal).toEqual(record.legal);
    expect(parsed.provenance.obiterId).toBe("abc-123");
    expect(parsed.provenance.obiterSourceType).toBe("case.reported");
    expect(parsed.identifiers.citeKey).toBe("mabo1992");
  });
});
