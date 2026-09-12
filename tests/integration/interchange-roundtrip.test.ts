/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-016: golden renderings for imported fixtures, and library round
 * trips through every export format.
 */

import * as fs from "fs";
import * as path from "path";
import { getFormattedPreview } from "../../src/engine/engine";
import {
  citationsToRecords,
  exportCitations,
  mapRecordToCitation,
  prepareImport,
} from "../../src/api/interchange";
import type { ExportFormat, ImportSource } from "../../src/api/interchange";
import type { Citation } from "../../src/types/citation";

const FIXTURES = path.resolve(__dirname, "../fixtures/interchange");
const read = (rel: string): string => fs.readFileSync(path.join(FIXTURES, rel), "utf-8");
const plain = (c: Citation): string =>
  getFormattedPreview(c)
    .map((r) => r.text)
    .join("");
const OPTS = {
  existing: [] as Citation[],
  aglcVersion: "4" as const,
  now: "2026-09-12T00:00:00.000Z",
};

function importAll(sources: ImportSource[]): Citation[] {
  return prepareImport(sources, OPTS).rows.map((r) => r.citation);
}

describe("golden AGLC4 renderings from real-shaped exports", () => {
  test("Zotero RIS case and statute", () => {
    const [mabo] = importAll([
      { text: read("ris/zotero-case-mabo.ris"), fileName: "zotero-case-mabo.ris" },
    ]);
    expect(mabo.sourceType).toBe("case.reported");
    expect(plain(mabo)).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    const [nta] = importAll([
      { text: read("ris/zotero-statute-native-title.ris"), fileName: "x.ris" },
    ]);
    expect(nta.sourceType).toBe("legislation.statute");
    expect(plain(nta)).toMatch(/^Native Title Act 1993 \(Cth\)/);
  });

  test("Trove book and Primo article", () => {
    const [book] = importAll([{ text: read("ris/trove-book.ris"), fileName: "trove-book.ris" }]);
    expect(book.sourceType).toBe("book");
    expect(plain(book)).toBe(
      "James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)."
    );
    const [article] = importAll([
      { text: read("ris/primo-article.ris"), fileName: "primo-article.ris" },
    ]);
    expect(article.sourceType).toBe("journal.article");
    expect(plain(article)).toMatch(/^Harold Luntz, ‘.+’ \(2005\) 27\(3\) Sydney Law Review 393\.$/);
  });

  test("UTS EndNote XML cases, statute, Hansard and treaty", () => {
    const cases = [
      [
        "endnote/uts-case-reported.xml",
        "Mabo v Queensland (No 2) (1992) 175 CLR 1 (Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ).",
      ],
      ["endnote/uts-case-square-year.xml", "Smith v Jones [1998] 1 Qd R 1."],
      ["endnote/uts-case-mnc.xml", "Comcare v Banerji [2019] HCA 23."],
      [
        "endnote/uts-case-unreported.xml",
        "Barton v Chibber (Supreme Court of Victoria, Hampel J, 29 June 1989).",
      ],
      [
        "endnote/uts-hansard.xml",
        "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese).",
      ],
      [
        "endnote/uts-treaty.xml",
        "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002).",
      ],
    ] as const;
    for (const [file, expected] of cases) {
      const [citation] = importAll([{ text: read(file), fileName: path.basename(file) }]);
      expect({ file, text: plain(citation) }).toEqual({ file, text: expected });
    }
    const [statute] = importAll([
      { text: read("endnote/uts-statute.xml"), fileName: "uts-statute.xml" },
    ]);
    expect(statute.sourceType).toBe("legislation.statute");
    expect(plain(statute)).toMatch(/^Native Title Act 1993 \(Cth\)/);
  });

  test("UTS EndNote XML secondary sources", () => {
    const [article] = importAll([
      { text: read("endnote/uts-journal-article.xml"), fileName: "a.xml" },
    ]);
    expect(plain(article)).toMatch(/^Harold Luntz, ‘.+’ \(2005\) 27\(3\) Sydney Law Review 393/);
    const [book] = importAll([{ text: read("endnote/uts-book.xml"), fileName: "b.xml" }]);
    expect(plain(book)).toMatch(
      /^James Edelman and Elise Bant, Unjust Enrichment \(Hart Publishing, 2nd ed, 2016\)/
    );
    const [chapter] = importAll([
      { text: read("endnote/uts-book-chapter.xml"), fileName: "c.xml" },
    ]);
    expect(chapter.sourceType).toBe("book.chapter");
    expect(plain(chapter)).toMatch(
      /^John Gardner, ‘.+’ in .+ \(eds\), .+ \(Hart Publishing, \d{4}\)/
    );
    const [report] = importAll([{ text: read("endnote/uts-law-reform.xml"), fileName: "r.xml" }]);
    expect(report.sourceType).toBe("report.law_reform");
    expect(plain(report)).toMatch(
      /^Australian Law Reform Commission, Genes and Ingenuity.*\(Report No 99, (June )?2004\)/
    );
  });

  test("CSL-JSON legal case and legislation, BibTeX legal entries", () => {
    const [caseItem] = importAll([
      { text: read("csl/zotero-legal_case.json"), fileName: "case.json" },
    ]);
    expect(caseItem.sourceType).toBe("case.reported");
    expect(plain(caseItem)).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    const [legislation] = importAll([
      { text: read("csl/zotero-legislation.json"), fileName: "leg.json" },
    ]);
    expect(legislation.sourceType).toBe("legislation.statute");
    expect(plain(legislation)).toMatch(/^Native Title Act 1993 \(Cth\)/);
    const bib = importAll([{ text: read("bibtex/biblatex-legal.bib"), fileName: "legal.bib" }]);
    expect(bib.map((c) => c.sourceType)).toEqual(
      expect.arrayContaining(["case.reported", "legislation.statute"])
    );
    const zotero = importAll([{ text: read("bibtex/zotero-export.bib"), fileName: "zotero.bib" }]);
    const misc = zotero.find((c) => String(c.data.party1 ?? "").startsWith("Mabo"));
    expect(misc?.sourceType).toBe("case.reported");
  });
});

describe("library round trips through every export format", () => {
  const library: Citation[] = [
    {
      id: "l1",
      aglcVersion: "4",
      sourceType: "case.reported",
      data: {
        party1: "Mabo",
        party2: "Queensland (No 2)",
        year: 1992,
        reportSeries: "CLR",
        volume: 175,
        startingPage: 1,
        courtId: "HCA",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l2",
      aglcVersion: "4",
      sourceType: "case.unreported.mnc",
      data: { party1: "Comcare", party2: "Banerji", year: 2019, court: "HCA", caseNumber: 23 },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l3",
      aglcVersion: "4",
      sourceType: "legislation.statute",
      data: { title: "Native Title Act", year: 1993, jurisdiction: "Cth", pinpoint: "s 223" },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l4",
      aglcVersion: "4",
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "Harold", surname: "Luntz" }],
        title: "A Personal Journey through the Law of Torts",
        journal: "Sydney Law Review",
        year: 2005,
        volume: 27,
        issue: "3",
        startingPage: 393,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l5",
      aglcVersion: "4",
      sourceType: "book",
      data: {
        authors: [
          { givenNames: "James", surname: "Edelman" },
          { givenNames: "Elise", surname: "Bant" },
        ],
        title: "Unjust Enrichment",
        publisher: "Hart Publishing",
        edition: 2,
        year: 2016,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l6",
      aglcVersion: "4",
      sourceType: "book.chapter",
      data: {
        chapterAuthors: [{ givenNames: "John", surname: "Gardner" }],
        chapterTitle: "The Purity and Priority of Private Law",
        editors: [
          { givenNames: "Andrew", surname: "Robertson" },
          { givenNames: "Tang Hang", surname: "Wu" },
        ],
        bookTitle: "The Goals of Private Law",
        publisher: "Hart Publishing",
        year: 2009,
        startingPage: 1,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l7",
      aglcVersion: "4",
      sourceType: "report.law_reform",
      data: {
        commissionName: "Australian Law Reform Commission",
        title: "Genes and Ingenuity: Gene Patenting and Human Health",
        documentType: "Report",
        number: "99",
        date: "2004",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l8",
      aglcVersion: "4",
      sourceType: "hansard",
      data: {
        jurisdiction: "Commonwealth",
        chamber: "House of Representatives",
        date: "12 March 2020",
        page: "2345",
        speaker: "Anthony Albanese",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l9",
      aglcVersion: "4",
      sourceType: "internet_material",
      data: {
        authors: [{ givenNames: "", surname: "Oxfam Australia" }],
        title: "What We Do",
        websiteName: "Oxfam Australia",
        documentType: "Web Page",
        date: "2020",
        url: "https://www.oxfam.org.au/what-we-do/",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l10",
      aglcVersion: "4",
      sourceType: "treaty",
      data: {
        title: "Rome Statute of the International Criminal Court",
        openedDate: "17 July 1998",
        treatySeries: "UNTS",
        seriesVolume: 2187,
        startingPage: 3,
        entryIntoForceDate: "1 July 2002",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l11",
      aglcVersion: "4",
      sourceType: "speech",
      data: {
        speaker: "Justice Dyson Heydon",
        title: "Threats to Judicial Independence: The Enemy Within",
        event: "Inner Temple",
        date: "23 January 2012",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
    {
      id: "l12",
      aglcVersion: "4",
      sourceType: "newspaper",
      data: {
        authors: [{ givenNames: "Jane", surname: "Smith" }],
        title: "Story",
        newspaper: "The Age",
        place: "Melbourne",
        date: "1 May 2020",
        page: "3",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    },
  ];
  const formatCitation = (c: Citation): { footnote: string } => ({ footnote: plain(c) });

  test.each(["ris", "bibtex", "csl-json", "endnote-xml"] as ExportFormat[])(
    "%s: export then import finds every record as a round trip and renders the same",
    (format) => {
      const exported = exportCitations(library, {
        format,
        formatCitation,
        dateStamp: "2026-09-12",
      });
      expect(exported.records).toBe(library.length);
      const preview = prepareImport(
        [{ text: exported.text, formatHint: format as Exclude<ExportFormat, "formatted-text"> }],
        {
          ...OPTS,
          existing: library,
        }
      );
      expect(preview.rows).toHaveLength(library.length);
      for (const row of preview.rows) {
        expect({ id: row.duplicateOf?.id, roundTrip: row.roundTrip }).toEqual({
          id: row.record.provenance.obiterId,
          roundTrip: true,
        });
        const original = library.find((c) => c.id === row.duplicateOf?.id) as Citation;
        expect({ format, id: original.id, text: plain(row.citation) }).toEqual({
          format,
          id: original.id,
          text: plain(original),
        });
      }
    }
  );

  test("records carry the formatted note and Obiter provenance", () => {
    const { records } = citationsToRecords(library, {
      format: "ris",
      formatCitation,
      standardLabel: "AGLC4",
    });
    expect(records[0].formatted?.footnote).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
    expect(records[0].provenance).toMatchObject({
      obiterId: "l1",
      obiterSourceType: "case.reported",
    });
    const again = mapRecordToCitation(records[0], { aglcVersion: "4" }).citation;
    expect(again.id).toBe("l1");
  });
});
