/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-004: source links derived from a stored citation's own data.
 */

import { lawCiteUrl, linksForCitation } from "../../src/api/sourceLinks";
import type { Citation, SourceType } from "../../src/types/citation";

function cite(sourceType: SourceType, data: Record<string, unknown>): Citation {
  return {
    id: "c1",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("linksForCitation (ENP-004)", () => {
  test("a case with an MNC yields AustLII and Jade links, labelled as aggregators", () => {
    const links = linksForCitation(
      cite("case.unreported.mnc", {
        party1: "Smith",
        party2: "Jones",
        court: "HCA",
        year: "2020",
        caseNumber: "41",
      })
    );
    expect(links.map((l) => l.url)).toEqual([
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/2020/41.html",
      "https://jade.io/article/HCA/2020/41",
    ]);
    expect(links.every((l) => l.icon === "aggregator")).toBe(true);
    expect(links[0].label).toBe("View on austlii.edu.au");
  });

  test("a journal article with a DOI yields the DOI link first", () => {
    const links = linksForCitation(
      cite("journal.article", {
        title: "Torts",
        year: 2005,
        doi: "doi:10.1000/slr.393",
        interchange: {
          v: 1,
          provenance: { format: "ris", rawType: "JOUR", sourceUrl: "https://www.austlii.edu.au/x" },
          identifiers: { doi: "10.1000/slr.393", url: "https://example.org/torts" },
        },
      })
    );
    expect(links.map((l) => l.url)).toEqual([
      "https://doi.org/10.1000/slr.393",
      "https://example.org/torts",
      "https://www.austlii.edu.au/x",
    ]);
    expect(links[0].icon).toBe("primary");
    expect(links[0].label).toBe("View on doi.org");
  });

  test("a citation with only a URL yields one link", () => {
    const links = linksForCitation(
      cite("internet.webpage", { title: "Page", url: " https://example.org/page " })
    );
    expect(links).toEqual([
      { url: "https://example.org/page", label: "View on example.org", icon: "primary" },
    ]);
  });

  test("duplicates collapse across url, persistentId, doi and interchange fields", () => {
    const links = linksForCitation(
      cite("journal.article", {
        title: "Torts",
        url: "https://doi.org/10.1000/abc",
        persistentId: "10.1000/abc",
        doi: "https://doi.org/10.1000/abc",
        interchange: {
          v: 1,
          provenance: { format: "csl-json", rawType: "article-journal" },
          identifiers: { doi: "10.1000/abc", urls: ["https://doi.org/10.1000/abc"] },
        },
      })
    );
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://doi.org/10.1000/abc");
  });

  test("numeric year and case number from the XML store survive", () => {
    const links = linksForCitation(
      cite("case.unreported.mnc", { courtId: "NSWSC", year: 2019, judgmentNumber: 7 })
    );
    expect(links.map((l) => l.url)).toEqual([
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/nsw/NSWSC/2019/7.html",
      "https://jade.io/article/NSWSC/2019/7",
    ]);
  });

  test("an unknown court still yields the Jade link; a non-URL persistentId is ignored", () => {
    const links = linksForCitation(
      cite("case.unreported.mnc", {
        court: "XYZC",
        year: 2019,
        caseNumber: 7,
        persistentId: "hdl:1234/5678",
      })
    );
    expect(links.map((l) => l.url)).toEqual(["https://jade.io/article/XYZC/2019/7"]);
  });

  test("no usable data yields no links", () => {
    expect(linksForCitation(cite("book", { title: "Book", year: 2001 }))).toEqual([]);
    expect(linksForCitation(cite("book", { url: 42, doi: null, persistentId: {} }))).toEqual([]);
    expect(
      linksForCitation(cite("case.unreported.mnc", { court: "HCA", year: "n/a", caseNumber: 41 }))
    ).toEqual([]);
  });
});

describe("lawCiteUrl (ENP-004)", () => {
  test("encodes spaces and brackets", () => {
    expect(lawCiteUrl("[2020] HCA 41")).toBe(
      "https://www.austlii.edu.au/cgi-bin/LawCite?cit=%5B2020%5D%20HCA%2041"
    );
    expect(lawCiteUrl(" (1992) 175 CLR 1 ")).toBe(
      "https://www.austlii.edu.au/cgi-bin/LawCite?cit=(1992)%20175%20CLR%201"
    );
  });
});
