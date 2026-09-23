/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-004: source links derived from a stored citation's own data.
 */

import {
  buildBailiiUrl,
  buildNzliiUrl,
  caseJurisdiction,
  casesCitingLookup,
  jurisdictionOfCourtCode,
  jurisdictionOfText,
  lawCiteUrl,
  linksForCitation,
} from "../../src/api/sourceLinks";
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

// ─── STD-020: jurisdiction-gated institute links ────────────────────────────

describe("caseJurisdiction (STD-020)", () => {
  test("an explicit jurisdiction wins over the court code", () => {
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "NZ", courtId: "CA" }))).toBe(
      "NZ"
    );
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "Cth", court: "HCA" }))).toBe(
      "AU"
    );
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "Scot", court: "CSIH" }))).toBe(
      "UK"
    );
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "(NSW)" }))).toBe("AU");
  });

  test("the court identifier or neutral-citation court code decides when no jurisdiction is stored", () => {
    expect(
      caseJurisdiction(cite("case.unreported.mnc", { court: "NZCA", caseNumber: "188" }))
    ).toBe("NZ");
    expect(caseJurisdiction(cite("case.reported", { neutralCitationCourt: "UKHL" }))).toBe("UK");
    expect(caseJurisdiction(cite("case.reported", { mnc: "[2008] EWCA Civ 12" }))).toBe("UK");
    expect(caseJurisdiction(cite("case.unreported.mnc", { court: "HCA", caseNumber: "41" }))).toBe(
      "AU"
    );
  });

  test("a case that says nothing is Australian; an unknown jurisdiction is other", () => {
    expect(caseJurisdiction(cite("case.reported", { party1: "Mabo", party2: "Queensland" }))).toBe(
      "AU"
    );
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "US" }))).toBe("other");
    expect(caseJurisdiction(cite("case.reported", { jurisdiction: "IE", court: "IESC" }))).toBe(
      "other"
    );
  });

  test("jurisdiction text and court code mappings", () => {
    expect(jurisdictionOfText("United Kingdom")).toBe("UK");
    expect(jurisdictionOfText("England and Wales")).toBe("UK");
    expect(jurisdictionOfText("New Zealand")).toBe("NZ");
    expect(jurisdictionOfText("Vic")).toBe("AU");
    expect(jurisdictionOfText("")).toBeUndefined();
    expect(jurisdictionOfText("Canada")).toBe("other");
    expect(jurisdictionOfCourtCode("EWCA Civ")).toBe("UK");
    expect(jurisdictionOfCourtCode("NICA")).toBe("UK");
    expect(jurisdictionOfCourtCode("NZSC")).toBe("NZ");
    expect(jurisdictionOfCourtCode("NSWCA")).toBe("AU");
    expect(jurisdictionOfCourtCode("XYZ")).toBeUndefined();
  });
});

describe("BAILII and NZLII builders (STD-020)", () => {
  test("canonical BAILII paths for the courts that can be mapped", () => {
    expect(buildBailiiUrl("UKHL", 2008, 13)).toBe(
      "https://www.bailii.org/uk/cases/UKHL/2008/13.html"
    );
    expect(buildBailiiUrl("UKSC", 2010, 1)).toBe(
      "https://www.bailii.org/uk/cases/UKSC/2010/1.html"
    );
    expect(buildBailiiUrl("EWCA Civ", 2004, 234)).toBe(
      "https://www.bailii.org/ew/cases/EWCA/Civ/2004/234.html"
    );
    expect(buildBailiiUrl("EWCA Crim", 2004, 5)).toBe(
      "https://www.bailii.org/ew/cases/EWCA/Crim/2004/5.html"
    );
    expect(buildBailiiUrl("EWHC (Ch)", 2011, 9)).toBe(
      "https://www.bailii.org/ew/cases/EWHC/Ch/2011/9.html"
    );
    expect(buildBailiiUrl("EWHC (Admin)", 2011, 9)).toBe(
      "https://www.bailii.org/ew/cases/EWHC/Admin/2011/9.html"
    );
  });

  test("other UK courts fall back to the BAILII citation search", () => {
    expect(buildBailiiUrl("CSIH", 2011, 31)).toBe(
      `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=${encodeURIComponent("[2011] CSIH 31")}`
    );
    expect(buildBailiiUrl("UKUT (AAC)", 2012, 4)).toContain("lucy_search_1.cgi?query=");
  });

  test("canonical NZLII paths for the senior courts, search for the rest", () => {
    expect(buildNzliiUrl("NZCA", 2007, 188)).toBe(
      "https://www.nzlii.org/nz/cases/NZCA/2007/188.html"
    );
    expect(buildNzliiUrl("NZSC", 2007, 30)).toBe(
      "https://www.nzlii.org/nz/cases/NZSC/2007/30.html"
    );
    expect(buildNzliiUrl("NZHC", 2015, 100)).toBe(
      "https://www.nzlii.org/nz/cases/NZHC/2015/100.html"
    );
    expect(buildNzliiUrl("NZEmpC", 2015, 7)).toBe(
      `https://www.nzlii.org/cgi-bin/sinosrch.cgi?query=${encodeURIComponent("[2015] NZEmpC 7")}`
    );
  });
});

describe("linksForCitation by jurisdiction (STD-020)", () => {
  test("a UK case by neutral citation yields BAILII only, labelled as an aggregator", () => {
    const links = linksForCitation(
      cite("case.reported", {
        party1: "Corr",
        party2: "IBC Vehicles Ltd",
        year: "2008",
        reportSeries: "AC",
        startingPage: "884",
        neutralCitationYear: "2008",
        neutralCitationCourt: "UKHL",
        neutralCitationNumber: "13",
      })
    );
    expect(links.map((l) => l.url)).toEqual(["https://www.bailii.org/uk/cases/UKHL/2008/13.html"]);
    expect(links[0].label).toBe("View on bailii.org");
    expect(links[0].icon).toBe("aggregator");
  });

  test("an NZ case by neutral citation yields NZLII only; no Jade", () => {
    const links = linksForCitation(
      cite("case.unreported.mnc", {
        party1: "R",
        party2: "Fonotia",
        year: "2007",
        court: "NZCA",
        caseNumber: "188",
      })
    );
    expect(links.map((l) => l.url)).toEqual(["https://www.nzlii.org/nz/cases/NZCA/2007/188.html"]);
  });

  test("an MNC string in the mnc field drives the AU links", () => {
    const links = linksForCitation(
      cite("case.reported", {
        party1: "Mabo",
        party2: "Queensland",
        year: 1992,
        volume: 175,
        reportSeries: "CLR",
        startingPage: 1,
        courtId: "HCA",
        mnc: "[1992] HCA 23",
        jurisdiction: "Cth",
      })
    );
    expect(links.map((l) => l.url)).toEqual([
      "https://www.austlii.edu.au/cgi-bin/viewdoc/au/cases/cth/HCA/1992/23.html",
      "https://jade.io/article/HCA/1992/23",
    ]);
  });

  test("a case from a jurisdiction without a linked institute yields no institute links", () => {
    const links = linksForCitation(
      cite("case.unreported.mnc", {
        jurisdiction: "US",
        court: "SCOTUS",
        year: "2020",
        caseNumber: "1",
      })
    );
    expect(links).toEqual([]);
  });
});

describe("casesCitingLookup (STD-020)", () => {
  const text = "Mabo v Queensland (No 2) [1992] HCA 23";

  test("LawCite on the citation text for an AU case", () => {
    const lookup = casesCitingLookup(
      cite("case.unreported.mnc", { court: "HCA", year: "1992", caseNumber: "23" }),
      text
    );
    expect(lookup).toEqual({ label: "LawCite", url: lawCiteUrl(text) });
  });

  test("LawCite for a case with no court or jurisdiction at all", () => {
    expect(casesCitingLookup(cite("case.reported", { party1: "Mabo" }), text)?.label).toBe(
      "LawCite"
    );
  });

  test("BAILII search on the neutral citation for a UK case, NZLII search for an NZ case", () => {
    expect(
      casesCitingLookup(
        cite("case.reported", {
          neutralCitationCourt: "UKHL",
          neutralCitationYear: "2008",
          neutralCitationNumber: "13",
        }),
        "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884"
      )
    ).toEqual({
      label: "BAILII",
      url: `https://www.bailii.org/cgi-bin/lucy_search_1.cgi?query=${encodeURIComponent("[2008] UKHL 13")}`,
    });
    expect(
      casesCitingLookup(
        cite("case.reported", { jurisdiction: "NZ", year: "1984" }),
        "Taylor v NZ Poultry Board [1984] 1 NZLR 394"
      )
    ).toEqual({
      label: "NZLII",
      url: `https://www.nzlii.org/cgi-bin/sinosrch.cgi?query=${encodeURIComponent("Taylor v NZ Poultry Board [1984] 1 NZLR 394")}`,
    });
  });

  test("nothing for a non-case or an unlinked jurisdiction", () => {
    expect(casesCitingLookup(cite("book", { title: "Torts" }), "Torts")).toBeUndefined();
    expect(
      casesCitingLookup(cite("case.reported", { jurisdiction: "US" }), "Roe v Wade")
    ).toBeUndefined();
  });
});
