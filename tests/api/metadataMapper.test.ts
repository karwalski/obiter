/**
 * ENP-007: adapter metadata onto the Edit form's keys per source type.
 */

import {
  contentTypeForSourceType,
  metadataToFields,
  parseAuthorName,
  parseMnc,
  parseStatuteTitle,
  splitParties,
} from "../../src/api/metadataMapper";

describe("contentTypeForSourceType", () => {
  test.each([
    ["case.reported", "case"],
    ["case.unreported.mnc", "case"],
    ["legislation.statute", "legislation"],
    ["legislation.bill", "legislation"],
    ["journal.article", "journal"],
    ["treaty", "treaty"],
    ["treaty.mou", "treaty"],
    ["hansard", "hansard"],
    ["report.law_reform", "lrc-report"],
  ])("%s -> %s", (sourceType, expected) => {
    expect(contentTypeForSourceType(sourceType)).toBe(expected);
  });

  test("types no adapter covers map to null", () => {
    expect(contentTypeForSourceType("book")).toBeNull();
    expect(contentTypeForSourceType("report.parliamentary")).toBeNull();
    expect(contentTypeForSourceType("internet_material")).toBeNull();
  });
});

describe("helpers", () => {
  test("parseAuthorName accepts both name orders", () => {
    expect(parseAuthorName("Joseph Raz")).toEqual({ givenNames: "Joseph", surname: "Raz" });
    expect(parseAuthorName("Raz, Joseph")).toEqual({ givenNames: "Joseph", surname: "Raz" });
    expect(parseAuthorName("Mary Anne Smith")).toEqual({
      givenNames: "Mary Anne",
      surname: "Smith",
    });
    expect(parseAuthorName("Plato")).toEqual({ givenNames: "", surname: "Plato" });
    expect(parseAuthorName("   ")).toBeNull();
  });

  test("splitParties splits at the first v", () => {
    expect(splitParties("Mabo v Queensland")).toEqual(["Mabo", "Queensland"]);
    expect(splitParties("Donoghue v. Stevenson")).toEqual(["Donoghue", "Stevenson"]);
    expect(splitParties("Re Wakim; Ex parte McNally")).toBeNull();
  });

  test("parseMnc and parseStatuteTitle pull the structured parts out", () => {
    expect(parseMnc("[1992] HCA 23")).toEqual({ year: "1992", court: "HCA", number: "23" });
    expect(parseMnc("175 CLR 1")).toBeNull();
    expect(parseStatuteTitle("Competition and Consumer Act 2010 (Cth)")).toEqual({
      title: "Competition and Consumer Act",
      year: "2010",
      jurisdiction: "Cth",
    });
    expect(parseStatuteTitle("Crimes Act 1900")).toEqual({
      title: "Crimes Act",
      year: "1900",
      jurisdiction: undefined,
    });
    expect(parseStatuteTitle("Constitution")).toEqual({ title: "Constitution" });
  });
});

describe("metadataToFields", () => {
  test("reported case: parties split, numbers become strings, court lands on courtId", () => {
    const fields = metadataToFields("case.reported", {
      title: "Mabo v Queensland (No 2)",
      parties: "Mabo v Queensland",
      year: 1992,
      court: "HCA",
      mnc: "[1992] HCA 23",
      reportSeries: "CLR",
      volume: 175,
      startingPage: 1,
      jurisdiction: "AU",
    });
    expect(fields).toEqual({
      party1: "Mabo",
      party2: "Queensland",
      year: "1992",
      volume: "175",
      reportSeries: "CLR",
      startingPage: "1",
      courtId: "HCA",
      mnc: "[1992] HCA 23",
    });
  });

  test("MNC case: court and judgment number come from the medium neutral citation", () => {
    const fields = metadataToFields("case.unreported.mnc", {
      parties: "Mabo v Queensland",
      mnc: "[1992] HCA 23",
    });
    expect(fields).toEqual({
      party1: "Mabo",
      party2: "Queensland",
      year: "1992",
      court: "HCA",
      caseNumber: "23",
      mnc: "[1992] HCA 23",
    });
  });

  test("statute: the title carries year and jurisdiction; the ISO code maps to Cth", () => {
    expect(
      metadataToFields("legislation.statute", {
        title: "Competition and Consumer Act 2010 (Cth)",
        year: 2010,
        jurisdiction: "AU",
        frliId: "C2004A00109",
        status: "in force",
      })
    ).toEqual({
      title: "Competition and Consumer Act",
      year: "2010",
      jurisdiction: "Cth",
      frliId: "C2004A00109",
    });
    expect(
      metadataToFields("legislation.statute", {
        title: "Crimes Act",
        year: 1900,
        jurisdiction: "NSW",
      })
    ).toEqual({ title: "Crimes Act", year: "1900", jurisdiction: "NSW" });
  });

  test("journal article: authors become structured names and page falls back to startingPage", () => {
    const fields = metadataToFields("journal.article", {
      title: "The Rule of Law and Its Virtue",
      authors: ["Raz, Joseph", "Jane Smith"],
      year: 1977,
      journal: "Law Quarterly Review",
      volume: 93,
      issue: "2",
      page: "195",
      doi: "10.1000/lqr.1977",
    });
    expect(fields).toEqual({
      authors: [
        { givenNames: "Joseph", surname: "Raz" },
        { givenNames: "Jane", surname: "Smith" },
      ],
      title: "The Rule of Law and Its Virtue",
      year: "1977",
      volume: "93",
      issue: "2",
      journal: "Law Quarterly Review",
      startingPage: "195",
      doi: "10.1000/lqr.1977",
    });
  });

  test("treaty: series volume and starting page; unrelated metadata is dropped", () => {
    expect(
      metadataToFields("treaty", {
        title: "Vienna Convention on the Law of Treaties",
        year: 1969,
        treatySeries: "UNTS",
        volume: 1155,
        startingPage: 331,
        speaker: "nobody",
      })
    ).toEqual({
      title: "Vienna Convention on the Law of Treaties",
      treatySeries: "UNTS",
      seriesVolume: "1155",
      startingPage: "331",
    });
  });

  test("blank and unknown values are omitted; a bare year never fills a full date", () => {
    expect(
      metadataToFields("case.unreported.no_mnc", {
        parties: "  ",
        title: "",
        year: 2020,
        court: "Supreme Court of New South Wales",
        volume: Number.NaN,
      })
    ).toEqual({ court: "Supreme Court of New South Wales" });
    expect(metadataToFields("case.reported", {})).toEqual({});
  });
});
