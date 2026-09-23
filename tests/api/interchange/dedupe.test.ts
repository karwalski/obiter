/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-002: duplicate clusters over the library. Each citation joins at most
 * one cluster, on the strongest key it shares (doi → isbn → citeKey → legal
 * → loose); singletons are dropped; a `dedupe:ignore:<key>` tag suppresses
 * the pairs a citation would form on that key.
 */

import {
  DedupeIndex,
  DEDUPE_IGNORE_TAG_PREFIX,
  buildDedupeKeyFromCitation,
  findDuplicateClusters,
  legalKeyFromText,
} from "../../../src/api/interchange/dedupe";
import type { Citation, SourceType } from "../../../src/types/citation";

function cite(
  id: string,
  sourceType: SourceType,
  data: Record<string, unknown>,
  createdAt = "2026-01-01T00:00:00.000Z",
  tags: string[] = []
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType,
    data,
    tags,
    createdAt,
    modifiedAt: createdAt,
  };
}

const ids = (c: { members: Citation[] }): string[] => c.members.map((m) => m.id);

describe("findDuplicateClusters (ENP-002)", () => {
  test("MNC match survives a different party spelling", () => {
    const a = cite("a", "case.unreported.mnc", {
      party1: "Smith",
      party2: "Jones",
      court: "HCA",
      year: 2020,
      caseNumber: 41,
    });
    const b = cite(
      "b",
      "case.unreported.mnc",
      { party1: "Smyth", party2: "Jones", court: "HCA", year: "2020", caseNumber: "41" },
      "2026-01-02T00:00:00.000Z"
    );
    const clusters = findDuplicateClusters([b, a]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("mnc|2020|hca|41");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("DOI match survives a different title casing and a doi.org prefix", () => {
    const a = cite("a", "journal.article", {
      authors: [{ givenNames: "Harold", surname: "Luntz" }],
      title: "A Personal Journey through the Law of Torts",
      year: 2005,
      doi: "10.1000/SLR.393",
    });
    const b = cite("b", "journal.article", {
      authors: [{ givenNames: "H", surname: "Luntz" }],
      title: "a personal journey THROUGH the law of torts",
      year: 2005,
      doi: "https://doi.org/10.1000/slr.393",
    });
    const clusters = findDuplicateClusters([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("doi");
    expect(clusters[0].key).toBe("10.1000/slr.393");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("report citation match on year, series and starting page", () => {
    const a = cite("mabo-1", "case.reported", {
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
    });
    const b = cite("mabo-2", "case.reported", {
      party1: "Mabo",
      party2: "Queensland [No 2]",
      year: "1992",
      volume: "175",
      reportSeries: "CLR",
      startingPage: "1",
    });
    const other = cite("wik", "case.reported", {
      party1: "Wik Peoples",
      party2: "Queensland",
      year: 1996,
      volume: 187,
      reportSeries: "CLR",
      startingPage: 1,
    });
    const clusters = findDuplicateClusters([a, other, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("report|1992|clr|1");
    expect(ids(clusters[0])).toEqual(["mabo-1", "mabo-2"]);
  });

  test("loose title + year + surname match ignores punctuation and diacritics", () => {
    const a = cite("a", "book", {
      authors: [{ givenNames: "Émile", surname: "Durkheim" }],
      title: "The Rules of Sociological Method",
      year: 1895,
      publisher: "Alcan",
    });
    const b = cite("b", "book", {
      authors: [{ givenNames: "E", surname: "Durkheim" }],
      title: "The Rules of Sociological Method.",
      year: "1895",
      publisher: "Free Press",
    });
    const clusters = findDuplicateClusters([a, b]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("loose");
    expect(clusters[0].key).toBe("the rules of sociological method|1895|durkheim");
  });

  test("a citation matched by two keys lands in one cluster, on the strongest", () => {
    const shared = {
      authors: [{ givenNames: "Harold", surname: "Luntz" }],
      title: "Torts",
      year: 2005,
    };
    const a = cite("a", "journal.article", { ...shared, doi: "10.1000/x" });
    const b = cite("b", "journal.article", { ...shared, doi: "10.1000/x" });
    const c = cite("c", "journal.article", { ...shared });
    const clusters = findDuplicateClusters([a, b, c]);
    // a and b share the DOI and the loose key; c shares only the loose key
    // and is left alone once a and b are spoken for.
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("doi");
    expect(ids(clusters[0])).toEqual(["a", "b"]);
  });

  test("singletons produce no cluster", () => {
    const a = cite("a", "journal.article", { title: "One", year: 2001, doi: "10.1000/1" });
    const b = cite("b", "journal.article", { title: "Two", year: 2002, doi: "10.1000/2" });
    const c = cite("c", "book", { title: "Three", year: 2003 });
    expect(findDuplicateClusters([a, b, c])).toEqual([]);
    expect(findDuplicateClusters([])).toEqual([]);
    expect(DedupeIndex.clusters([a])).toEqual([]);
  });

  test("an ignore tag on either member suppresses the pair for that key", () => {
    const a = cite("a", "journal.article", { title: "One", year: 2001, doi: "10.1000/1" });
    const b = cite(
      "b",
      "journal.article",
      { title: "Uno", year: 2001, doi: "10.1000/1" },
      "2026-01-02T00:00:00.000Z",
      [`${DEDUPE_IGNORE_TAG_PREFIX}10.1000/1`]
    );
    const c = cite(
      "c",
      "journal.article",
      { title: "Eins", year: 2001, doi: "10.1000/1" },
      "2026-01-03T00:00:00.000Z"
    );
    expect(findDuplicateClusters([a, b])).toEqual([]);
    // b is dropped from the DOI grouping; a and c still cluster.
    const clusters = findDuplicateClusters([a, b, c]);
    expect(clusters).toHaveLength(1);
    expect(ids(clusters[0])).toEqual(["a", "c"]);
    // A tag for a different key does not suppress the DOI pair.
    const tagged = { ...a, tags: [`${DEDUPE_IGNORE_TAG_PREFIX}other`] };
    expect(findDuplicateClusters([tagged, c])).toHaveLength(1);
  });

  test("ordering is deterministic: members by createdAt then id, clusters by earliest member", () => {
    const late = cite("z", "book", { title: "Alpha", year: 2000 }, "2026-03-01T00:00:00.000Z");
    const early = cite("y", "book", { title: "Alpha", year: 2000 }, "2026-01-01T00:00:00.000Z");
    const sameTimeB = cite("b", "book", { title: "Beta", year: 2000 }, "2026-02-01T00:00:00.000Z");
    const sameTimeA = cite("a", "book", { title: "Beta", year: 2000 }, "2026-02-01T00:00:00.000Z");
    const expected = [
      ["y", "z"],
      ["a", "b"],
    ];
    const inputs = [
      [late, early, sameTimeB, sameTimeA],
      [sameTimeA, sameTimeB, early, late],
      [sameTimeB, late, sameTimeA, early],
    ];
    for (const input of inputs) {
      expect(findDuplicateClusters(input).map(ids)).toEqual(expected);
    }
  });
});

// ─── STD-020: legal key set (MNC, report and parallel citations) ────────────

describe("findDuplicateClusters legal key set (STD-020)", () => {
  const maboByReport = cite("mabo-rep", "case.reported", {
    party1: "Mabo",
    party2: "Queensland (No 2)",
    year: "1992",
    volume: "175",
    reportSeries: "CLR",
    startingPage: "1",
    courtId: "HCA",
    mnc: "[1992] HCA 23",
  });
  const maboByMnc = cite(
    "mabo-mnc",
    "case.unreported.mnc",
    { party1: "Mabo", party2: "Queensland", year: "1992", court: "HCA", caseNumber: "23" },
    "2026-01-02T00:00:00.000Z"
  );

  test("Mabo by report (with its MNC) and Mabo by MNC cluster as legal on the MNC key", () => {
    const clusters = findDuplicateClusters([maboByMnc, maboByReport]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("mnc|1992|hca|23");
    expect(ids(clusters[0])).toEqual(["mabo-rep", "mabo-mnc"]);
  });

  test("a report record carrying the MNC as a court-mode parallel citation matches an MNC-only record", () => {
    const withParallel = cite("mabo-par", "case.reported", {
      party1: "Mabo",
      party2: "Queensland (No 2)",
      year: "1992",
      volume: "175",
      reportSeries: "CLR",
      startingPage: "1",
      parallelCitations: [
        { yearType: "square", year: 1992, reportSeries: "HCA", startingPage: 23 },
      ],
    });
    const key = buildDedupeKeyFromCitation(withParallel);
    expect(key.legal).toBe("report|1992|clr|1");
    expect(key.legalKeys).toEqual(["report|1992|clr|1", "mnc|1992|hca|23"]);
    const clusters = findDuplicateClusters([withParallel, maboByMnc]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("mnc|1992|hca|23");
  });

  test("a UK case by neutral citation and the same case by law report cluster as legal", () => {
    const byReport = cite("corr-rep", "case.reported", {
      party1: "Corr",
      party2: "IBC Vehicles Ltd",
      year: "2008",
      yearType: "square",
      volume: "1",
      reportSeries: "AC",
      startingPage: "884",
      neutralCitationYear: "2008",
      neutralCitationCourt: "UKHL",
      neutralCitationNumber: "13",
    });
    const byNeutral = cite(
      "corr-nc",
      "case.unreported.mnc",
      { party1: "Corr", party2: "IBC Vehicles", year: "2008", court: "UKHL", caseNumber: "13" },
      "2026-01-02T00:00:00.000Z"
    );
    expect(buildDedupeKeyFromCitation(byReport).legalKeys).toEqual([
      "mnc|2008|ukhl|13",
      "report|2008|ac|884",
    ]);
    const clusters = findDuplicateClusters([byNeutral, byReport]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(clusters[0].key).toBe("mnc|2008|ukhl|13");
  });

  test("an NZ case by neutral citation and the same case with its NZLR parallel report cluster as legal", () => {
    const neutral = cite("brooker-nc", "case.unreported.mnc", {
      party1: "Brooker",
      party2: "Police",
      year: "2007",
      court: "NZSC",
      caseNumber: "30",
    });
    const reported = cite(
      "brooker-rep",
      "case.reported",
      {
        party1: "Brooker",
        party2: "Police",
        year: 2007,
        courtIdentifier: "NZSC",
        decisionNumber: 30,
        parallelReport: { year: 2007, volume: 3, reportSeries: "NZLR", startPage: 91 },
      },
      "2026-01-02T00:00:00.000Z"
    );
    expect(buildDedupeKeyFromCitation(reported).legalKeys).toEqual([
      "mnc|2007|nzsc|30",
      "report|2007|nzlr|91",
    ]);
    // The NZLR report alone also matches a record stored by that report.
    const byNzlr = cite(
      "brooker-nzlr",
      "case.reported",
      {
        party1: "Brooker",
        party2: "Police",
        year: "2007",
        volume: "3",
        reportSeries: "NZLR",
        startingPage: "91",
      },
      "2026-01-03T00:00:00.000Z"
    );
    const clusters = findDuplicateClusters([byNzlr, reported, neutral]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].kind).toBe("legal");
    expect(ids(clusters[0])).toEqual(["brooker-nc", "brooker-rep", "brooker-nzlr"]);
  });

  test("unrelated cases sharing a court and year do not cluster", () => {
    const wik = cite("wik", "case.reported", {
      party1: "Wik Peoples",
      party2: "Queensland",
      year: "1996",
      volume: "187",
      reportSeries: "CLR",
      startingPage: "1",
      mnc: "[1996] HCA 40",
    });
    const kartinyeri = cite("kartinyeri", "case.unreported.mnc", {
      party1: "Kartinyeri",
      party2: "Commonwealth",
      year: "1996",
      court: "HCA",
      caseNumber: "52",
    });
    expect(findDuplicateClusters([wik, kartinyeri, maboByReport, maboByMnc]).map(ids)).toEqual([
      ["mabo-rep", "mabo-mnc"],
    ]);
  });

  test("an ignore tag on the shared MNC key suppresses the pair even though a second key is shared", () => {
    const twin = cite(
      "mabo-rep-2",
      "case.reported",
      { ...maboByReport.data, party2: "Queensland" },
      "2026-01-05T00:00:00.000Z",
      [`${DEDUPE_IGNORE_TAG_PREFIX}mnc|1992|hca|23`]
    );
    // Both records carry the MNC and the CLR report; ignoring the cluster
    // key must not resurface the pair on the report key. (The party
    // spelling differs so the loose title key stays out of it.)
    expect(findDuplicateClusters([maboByReport, twin])).toEqual([]);
    // Without the tag the same pair clusters on the MNC.
    expect(findDuplicateClusters([maboByReport, { ...twin, tags: [] }])[0]?.key).toBe(
      "mnc|1992|hca|23"
    );
  });

  test("legalKeyFromText parses MNC and report strings, including UK divisions", () => {
    expect(legalKeyFromText("[1992] HCA 23")).toBe("mnc|1992|hca|23");
    expect(legalKeyFromText("[2008] EWCA Civ 12")).toBe("mnc|2008|ewca civ|12");
    expect(legalKeyFromText("(1992) 175 CLR 1")).toBe("report|1992|clr|1");
    expect(legalKeyFromText("[2008] 1 AC 884")).toBe("report|2008|ac|884");
    expect(legalKeyFromText("Mabo v Queensland")).toBeUndefined();
  });

  test("an incoming record with parallel citation strings matches on any of them", () => {
    const index = new DedupeIndex([maboByMnc]);
    const match = index.findRecord({
      kind: "case",
      title: "Mabo v Queensland (No 2)",
      creators: [],
      identifiers: {},
      legal: {
        reporter: "CLR",
        reporterVolume: "175",
        firstPage: "1",
        parallelCitations: ["[1992] HCA 23"],
      },
      issued: { year: 1992 },
      provenance: { format: "ris", rawType: "CASE" },
    });
    expect(match?.kind).toBe("legal");
    expect(match?.citation.id).toBe("mabo-mnc");
  });
});
