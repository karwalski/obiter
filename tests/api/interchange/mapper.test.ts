/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-008/009: the mapper between interchange records and citations.
 * Source-type inference, legal string rules, the primary-key contract,
 * golden AGLC4 renderings and record <-> citation round trips.
 */

import { getFormattedPreview } from "../../../src/engine/engine";
import { exportRuleReference } from "../../../src/engine/ruleExporter";
import { createRecord } from "../../../src/api/interchange/model";
import type { InterchangeRecord } from "../../../src/api/interchange/model";
import { inferSourceType } from "../../../src/api/interchange/mapper/inferSourceType";
import { mapRecordToCitation } from "../../../src/api/interchange/mapper/toCitation";
import { mapCitationToRecord } from "../../../src/api/interchange/mapper/fromCitation";
import {
  classifyCourtOrJudges,
  formatJudicialOfficers,
  normaliseJurisdiction,
  parseEdition,
  parseJudicialOfficers,
  parseReportCitation,
  parseStatuteTitle,
  parseTreatySeries,
  resolveSeries,
  splitPages,
  splitParties,
  stripCitationFromTitle,
} from "../../../src/api/interchange/mapper/legal";
import { parseCommaName } from "../../../src/api/interchange/mapper/names";
import type { Citation } from "../../../src/types/citation";

const plain = (c: Citation): string =>
  getFormattedPreview(c)
    .map((r) => r.text)
    .join("");

function rec(
  kind: InterchangeRecord["kind"],
  patch: Partial<InterchangeRecord>
): InterchangeRecord {
  const base = createRecord(kind, { format: "ris", rawType: kind.toUpperCase() });
  return { ...base, ...patch, legal: patch.legal, creators: patch.creators ?? [] };
}

const OPTS = { aglcVersion: "4" as const, now: "2026-09-12T00:00:00.000Z" };

describe("legal string rules", () => {
  test("parties split on the first v and keep (No 2)", () => {
    expect(splitParties("Mabo v Queensland (No 2)")).toMatchObject({
      party1: "Mabo",
      party2: "Queensland (No 2)",
      split: true,
    });
    expect(splitParties("Re Wakim; Ex parte McNally")).toMatchObject({ split: false });
  });

  test("report citations, round and square", () => {
    expect(parseReportCitation("(1992) 175 CLR 1")).toMatchObject({
      year: 1992,
      yearType: "round",
      volume: "175",
      series: "CLR",
      page: "1",
    });
    expect(parseReportCitation("[1998] 1 Qd R 1")).toMatchObject({
      year: 1998,
      yearType: "square",
      volume: "1",
      series: "Qd R",
      page: "1",
    });
    expect(parseReportCitation("[2020] HCA 41")).toBeUndefined();
    expect(stripCitationFromTitle("Mabo v Queensland (No 2) (1992) 175 CLR 1")).toEqual({
      title: "Mabo v Queensland (No 2)",
      citation: "(1992) 175 CLR 1",
    });
  });

  test("series and court resolution", () => {
    expect(resolveSeries("C.L.R.")?.abbreviation).toBe("CLR");
    expect(resolveSeries("Commonwealth Law Reports")?.abbreviation).toBe("CLR");
    expect(resolveSeries("HCA")?.isCourtCode).toBe(true);
    expect(resolveSeries("XYZ")?.known).toBe(false);
    expect(classifyCourtOrJudges("High Court of Australia")).toMatchObject({ courtCode: "HCA" });
    expect(classifyCourtOrJudges("Gleeson CJ, Gummow and Hayne JJ (HCA)")).toMatchObject({
      judges: "Gleeson CJ, Gummow and Hayne JJ",
      courtCode: "HCA",
    });
  });

  test("judicial officers parse and format", () => {
    const officers = parseJudicialOfficers("Gleeson CJ, Gummow and Hayne JJ");
    expect(officers).toEqual([
      { name: "Gleeson", title: "CJ", role: "majority" },
      { name: "Gummow", title: "J", role: "majority" },
      { name: "Hayne", title: "J", role: "majority" },
    ]);
    expect(formatJudicialOfficers(officers ?? [])).toBe("Gleeson CJ, Gummow and Hayne JJ");
    expect(parseJudicialOfficers("Some unreadable text")).toBeNull();
  });

  test("statute titles and jurisdictions", () => {
    expect(parseStatuteTitle("Native Title Act 1993 (Cth)")).toMatchObject({
      title: "Native Title Act",
      year: 1993,
      jurisdiction: "Cth",
    });
    expect(parseStatuteTitle("Native Title Act 1993 (Commonwealth)")).toMatchObject({
      jurisdiction: "Cth",
    });
    expect(parseStatuteTitle("Human Rights Act 1998 (UK)")).toMatchObject({
      title: "Human Rights Act",
      year: 1998,
      jurisdiction: "UK",
    });
    expect(parseStatuteTitle("Competition and Consumer Regulations 2010 (Cth)")?.form).toBe(
      "delegated"
    );
    expect(parseStatuteTitle("Migration Amendment Bill 2024 (Cth)")?.form).toBe("bill");
    expect(normaliseJurisdiction("au-nsw")).toBe("NSW");
    expect(normaliseJurisdiction("New South Wales")).toBe("NSW");
  });

  test("treaty series, pages and editions", () => {
    expect(parseTreatySeries("2187 UNTS 3")).toEqual({
      seriesVolume: "2187",
      treatySeries: "UNTS",
      startingPage: "3",
    });
    expect(splitPages("393--420")).toEqual({ first: "393", last: "420", range: "393–420" });
    expect(splitPages("¶93-198")).toEqual({ first: "¶93-198", range: "¶93-198" });
    expect(parseEdition("Second")).toMatchObject({ edition: 2 });
    expect(parseEdition("2nd rev ed")).toMatchObject({ edition: 2, revised: true });
    expect(parseEdition("Special")).toEqual({ raw: "Special" });
  });
});

describe("source-type inference", () => {
  test("cases by content", () => {
    expect(
      inferSourceType(
        rec("case", {
          title: "Mabo v Queensland (No 2)",
          legal: { reporter: "CLR", firstPage: "1" },
        })
      ).sourceType
    ).toBe("case.reported");
    expect(
      inferSourceType(
        rec("case", { title: "Comcare v Banerji", legal: { courtCode: "HCA", docket: "23" } })
      ).sourceType
    ).toBe("case.unreported.mnc");
    expect(
      inferSourceType(rec("case", { title: "X v Y [2019] HCA 23", legal: {} })).sourceType
    ).toBe("case.unreported.mnc");
    expect(
      inferSourceType(
        rec("case", {
          title: "Barton v Chibber",
          issued: { year: 1989, month: 6, day: 29 },
          legal: { courtName: "Supreme Court of Victoria", judges: "Hampel J" },
        })
      ).sourceType
    ).toBe("case.unreported.no_mnc");
    expect(
      inferSourceType(
        rec("case", { title: "R v Smith", legal: { reporter: "AC", firstPage: "1" } })
      ).sourceType
    ).toBe("foreign.uk");
  });

  test("legislation by title", () => {
    expect(
      inferSourceType(rec("legislation", { title: "Native Title Act 1993 (Cth)" })).sourceType
    ).toBe("legislation.statute");
    expect(
      inferSourceType(
        rec("legislation", { title: "Competition and Consumer Regulations 2010 (Cth)" })
      ).sourceType
    ).toBe("legislation.delegated");
    expect(
      inferSourceType(rec("legislation", { title: "Migration Amendment Bill 2024 (Cth)" }))
        .sourceType
    ).toBe("legislation.bill");
    expect(
      inferSourceType(rec("legislation", { title: "Human Rights Act 1998 (UK)" })).sourceType
    ).toBe("foreign.uk");
    expect(
      inferSourceType(
        rec("legislation", { title: "Explanatory Memorandum, Migration Bill 2024 (Cth)" })
      ).sourceType
    ).toBe("legislation.explanatory");
  });

  test("reports by body and generic fallbacks", () => {
    expect(
      inferSourceType(
        rec("report", {
          title: "Genes and Ingenuity",
          creators: [{ role: "author", raw: "ALRC", literal: "Australian Law Reform Commission" }],
        })
      ).sourceType
    ).toBe("report.law_reform");
    expect(
      inferSourceType(rec("generic", { title: "Mabo v Queensland (No 2) (1992) 175 CLR 1" }))
        .sourceType
    ).toBe("case.reported");
    const custom = inferSourceType(rec("generic", { title: "Some Standard" }));
    expect(custom.sourceType).toBe("custom");
    expect(custom.issues.some((i) => i.code === "type-fallback-custom")).toBe(true);
  });

  test("round-trip and EndNote names win", () => {
    const roundTrip = rec("generic", { title: "x" });
    roundTrip.provenance.obiterSourceType = "speech";
    expect(inferSourceType(roundTrip).sourceType).toBe("speech");
    const endnote = rec("case", { title: "Comcare v Banerji" });
    endnote.provenance = { format: "endnote-xml", rawType: "Case (Medium Neutral)" };
    expect(inferSourceType(endnote).sourceType).toBe("case.unreported.mnc");
  });
});

describe("record to citation: golden AGLC4 renderings", () => {
  test("reported case from Zotero-style fields", () => {
    const { citation, missingFields } = mapRecordToCitation(
      rec("case", {
        title: "Mabo v Queensland (No 2)",
        issued: { year: 1992, month: 6, day: 3 },
        legal: {
          caseName: "Mabo v Queensland (No 2)",
          reporter: "CLR",
          reporterVolume: "175",
          firstPage: "1",
          courtName: "High Court of Australia",
        },
      }),
      OPTS
    );
    expect(missingFields).toEqual([]);
    expect(citation.data).toMatchObject({
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
      courtId: "HCA",
    });
    expect(plain(citation)).toBe("Mabo v Queensland (No 2) (1992) 175 CLR 1.");
  });

  test("square-year case and judges from EndNote-style fields", () => {
    const { citation } = mapRecordToCitation(
      rec("case", {
        title: "Smith v Jones",
        issued: { year: 1998 },
        legal: {
          reporter: "Qd R",
          reporterVolume: "1",
          firstPage: "1",
          yearType: "square",
          judges: "Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ",
        },
      }),
      OPTS
    );
    expect(citation.data.yearType).toBe("square");
    expect(Array.isArray(citation.data.judicialOfficers)).toBe(true);
    expect(plain(citation)).toBe(
      "Smith v Jones [1998] 1 Qd R 1 (Mason CJ, Brennan, Deane, Toohey, Gaudron and McHugh JJ)."
    );
  });

  test("medium neutral and unreported cases", () => {
    const mnc = mapRecordToCitation(
      rec("case", {
        title: "Comcare v Banerji",
        issued: { year: 2019 },
        legal: { courtCode: "HCA", docket: "23" },
      }),
      OPTS
    );
    expect(mnc.citation.data).toMatchObject({ court: "HCA", year: 2019, caseNumber: 23 });
    expect(plain(mnc.citation)).toBe("Comcare v Banerji [2019] HCA 23.");

    const unreported = mapRecordToCitation(
      rec("case", {
        title: "Barton v Chibber",
        issued: { year: 1989, month: 6, day: 29 },
        legal: { courtName: "Supreme Court of Victoria", judges: "Hampel J" },
      }),
      OPTS
    );
    expect(plain(unreported.citation)).toBe(
      "Barton v Chibber (Supreme Court of Victoria, Hampel J, 29 June 1989)."
    );
  });

  test("statute with a section pinpoint", () => {
    const { citation, missingFields } = mapRecordToCitation(
      rec("legislation", { title: "Native Title Act 1993 (Cth)", legal: { section: "223" } }),
      OPTS
    );
    expect(missingFields).toEqual([]);
    expect(citation.data).toMatchObject({
      title: "Native Title Act",
      year: 1993,
      jurisdiction: "Cth",
      pinpoint: "s 223",
    });
    expect(plain(citation)).toBe("Native Title Act 1993 (Cth) s 223.");
  });

  test("journal article, book with a word edition, and chapter", () => {
    const article = mapRecordToCitation(
      rec("article", {
        title: "A Personal Journey through the Law of Torts",
        creators: [parseCommaName("Luntz, Harold", "author")],
        containerTitle: "Sydney Law Review",
        issued: { year: 2005 },
        volume: "27",
        issue: "3",
        pageFirst: "393",
        pageLast: "420",
      }),
      OPTS
    );
    expect(article.citation.data.journal).toBe("Sydney Law Review");
    expect(plain(article.citation)).toBe(
      "Harold Luntz, ‘A Personal Journey through the Law of Torts’ (2005) 27(3) Sydney Law Review 393."
    );

    const book = mapRecordToCitation(
      rec("book", {
        title: "Unjust Enrichment",
        creators: [
          parseCommaName("Edelman, James", "author"),
          parseCommaName("Bant, Elise", "author"),
        ],
        publisher: "Hart Publishing",
        issued: { year: 2016 },
        edition: "Second",
      }),
      OPTS
    );
    expect(book.citation.data.edition).toBe(2);
    expect(plain(book.citation)).toBe(
      "James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)."
    );

    const chapter = mapRecordToCitation(
      rec("chapter", {
        title: "The Purity and Priority of Private Law",
        creators: [
          parseCommaName("Gardner, John", "author"),
          parseCommaName("Robertson, Andrew", "editor"),
          parseCommaName("Wu, Tang Hang", "editor"),
        ],
        containerTitle: "The Goals of Private Law",
        publisher: "Hart Publishing",
        issued: { year: 2009 },
        pageFirst: "1",
      }),
      OPTS
    );
    expect(plain(chapter.citation)).toBe(
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1."
    );
  });

  test("law reform report and web page", () => {
    const report = mapRecordToCitation(
      rec("report", {
        title: "Genes and Ingenuity: Gene Patenting and Human Health",
        creators: [{ role: "author", raw: "ALRC", literal: "Australian Law Reform Commission" }],
        number: "99",
        issued: { year: 2004 },
      }),
      OPTS
    );
    expect(report.sourceType).toBe("report.law_reform");
    expect(plain(report.citation)).toBe(
      "Australian Law Reform Commission, Genes and Ingenuity: Gene Patenting and Human Health (Report No 99, 2004)."
    );

    const web = mapRecordToCitation(
      rec("web", {
        title: "What We Do",
        creators: [{ role: "author", raw: "Oxfam Australia", literal: "Oxfam Australia" }],
        containerTitle: "Oxfam Australia",
        genre: "Web Page",
        issued: { year: 2020 },
        identifiers: { url: "https://www.oxfam.org.au/what-we-do/" },
      }),
      OPTS
    );
    // Rule 7.15: the author is omitted where it repeats the web page title.
    expect(plain(web.citation)).toBe(
      "‘What We Do’, Oxfam Australia (Web Page, 2020) <https://www.oxfam.org.au/what-we-do/>."
    );
  });

  test("hansard and treaty", () => {
    const hansard = mapRecordToCitation(
      rec("hansard", {
        creators: [
          { role: "speaker", raw: "Anthony Albanese", given: "Anthony", family: "Albanese" },
        ],
        legal: { jurisdiction: "Commonwealth", chamber: "House of Representatives" },
        issued: { year: 2020, month: 3, day: 12 },
        pageFirst: "2345",
      }),
      OPTS
    );
    expect(plain(hansard.citation)).toBe(
      "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 2345 (Anthony Albanese)."
    );

    const treaty = mapRecordToCitation(
      rec("treaty", {
        title: "Rome Statute of the International Criminal Court",
        legal: {
          openedDate: { year: 1998, month: 7, day: 17 },
          inForceDate: { year: 2002, month: 7, day: 1 },
          treatySeries: "2187 UNTS 3",
        },
      }),
      OPTS
    );
    expect(treaty.citation.data).toMatchObject({
      treatySeries: "UNTS",
      seriesVolume: 2187,
      startingPage: 3,
    });
    expect(plain(treaty.citation)).toBe(
      "Rome Statute of the International Criminal Court, opened for signature 17 July 1998, 2187 UNTS 3 (entered into force 1 July 2002)."
    );
  });

  test("missing fields, passthrough bag and tags", () => {
    const { citation, missingFields, issues } = mapRecordToCitation(
      rec("article", {
        title: "Untitled",
        keywords: ["tort"],
        abstract: "A",
        identifiers: { doi: "10.1/x" },
      }),
      OPTS
    );
    expect(missingFields).toEqual(
      expect.arrayContaining(["authors", "year", "journal", "startingPage"])
    );
    expect(issues.some((i) => i.code === "missing-required")).toBe(true);
    expect(citation.tags).toEqual(
      expect.arrayContaining(["import", "import:ris", "import:needs-details"])
    );
    const bag = citation.data.interchange as {
      v: number;
      identifiers?: { doi?: string };
      keywords?: string[];
    };
    expect(bag.v).toBe(1);
    expect(bag.identifiers?.doi).toBe("10.1/x");
    expect(bag.keywords).toEqual(["tort"]);
  });

  test("writes only contract keys for the mapped types", () => {
    const contract = new Map(
      exportRuleReference().sourceTypes.map((s) => [
        s.type,
        new Set([...s.requiredFields, ...s.optionalFields]),
      ])
    );
    const samples = [
      rec("case", {
        title: "A v B",
        legal: { reporter: "CLR", reporterVolume: "1", firstPage: "1" },
        issued: { year: 2000 },
      }),
      rec("legislation", { title: "Some Act 2000 (NSW)" }),
      rec("article", { title: "T", containerTitle: "J", issued: { year: 2000 }, pageFirst: "1" }),
      rec("book", { title: "T", publisher: "P", issued: { year: 2000 } }),
    ];
    for (const sample of samples) {
      const { citation, sourceType } = mapRecordToCitation(sample, OPTS);
      const allowed = contract.get(sourceType);
      expect(allowed).toBeDefined();
      for (const key of Object.keys(citation.data)) {
        if (key === "interchange") continue;
        expect({ sourceType, key, allowed: allowed?.has(key) }).toEqual({
          sourceType,
          key,
          allowed: true,
        });
      }
    }
  });
});

describe("citation to record and back", () => {
  test("reported case round trip preserves the legal block", () => {
    const original = mapRecordToCitation(
      rec("case", {
        title: "Mabo v Queensland (No 2)",
        issued: { year: 1992 },
        legal: {
          reporter: "CLR",
          reporterVolume: "175",
          firstPage: "1",
          judges: "Mason CJ and Brennan J",
        },
      }),
      OPTS
    ).citation;
    const record = mapCitationToRecord(original, { format: "ris" });
    expect(record.kind).toBe("case");
    expect(record.legal).toMatchObject({
      caseName: "Mabo v Queensland (No 2)",
      reporter: "CLR",
      reporterVolume: "175",
      firstPage: "1",
      judges: "Mason CJ and Brennan J",
    });
    expect(record.provenance.obiterId).toBe(original.id);
    const again = mapRecordToCitation(record, OPTS).citation;
    expect(again.sourceType).toBe("case.reported");
    expect(plain(again)).toBe(plain(original));
  });

  test("legacy alias keys still export", () => {
    const legacy: Citation = {
      id: "legacy",
      aglcVersion: "4",
      sourceType: "journal.article",
      data: {
        authors: [{ givenNames: "H", surname: "Luntz" }],
        title: "T",
        journalName: "Sydney Law Review",
        year: 2005,
        startingPage: 393,
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    };
    const record = mapCitationToRecord(legacy, { format: "bibtex" });
    expect(record.containerTitle).toBe("Sydney Law Review");
    expect(record.creators[0]).toMatchObject({ family: "Luntz", given: "H" });
  });

  test("statute and hansard round trips", () => {
    const statute = mapRecordToCitation(
      rec("legislation", { title: "Native Title Act 1993 (Cth)", legal: { section: "223" } }),
      OPTS
    ).citation;
    const record = mapCitationToRecord(statute, { format: "csl-json" });
    expect(record.title).toBe("Native Title Act 1993 (Cth)");
    expect(record.legal?.section).toBe("223");
    expect(plain(mapRecordToCitation(record, OPTS).citation)).toBe(plain(statute));

    const hansard = mapRecordToCitation(
      rec("hansard", {
        creators: [
          { role: "speaker", raw: "Anthony Albanese", given: "Anthony", family: "Albanese" },
        ],
        legal: { jurisdiction: "Commonwealth", chamber: "House of Representatives" },
        issued: { year: 2020, month: 3, day: 12 },
        pageFirst: "2345",
      }),
      OPTS
    ).citation;
    const hRecord = mapCitationToRecord(hansard, { format: "ris" });
    expect(hRecord.kind).toBe("hansard");
    expect(plain(mapRecordToCitation(hRecord, OPTS).citation)).toBe(plain(hansard));
  });
});
