/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for Citation Parser & MNC Tokeniser (Story 17.52).
 */

import {
  parseCitation,
  tokeniseMNC,
  findAllCitations,
} from "../../src/api/citationParser";
import type {
  MNCToken,
  ReportCitation,
  StatuteCitation,
  HansardCitation,
  ParsedCitation,
} from "../../src/api/citationParser";

describe("Citation Parser (Story 17.52)", () => {
  // -----------------------------------------------------------------------
  // tokeniseMNC
  // -----------------------------------------------------------------------

  describe("tokeniseMNC", () => {
    it("parses HCA MNC", () => {
      const t = tokeniseMNC("[2024] HCA 5");
      expect(t).not.toBeNull();
      expect(t!.type).toBe("mnc");
      expect(t!.year).toBe(2024);
      expect(t!.court).toBe("HCA");
      expect(t!.number).toBe(5);
    });

    it("parses FCA MNC", () => {
      const t = tokeniseMNC("[2023] FCA 100");
      expect(t).not.toBeNull();
      expect(t!.court).toBe("FCA");
      expect(t!.number).toBe(100);
    });

    it("parses NSWSC MNC", () => {
      const t = tokeniseMNC("[2023] NSWSC 1234");
      expect(t).not.toBeNull();
      expect(t!.court).toBe("NSWSC");
      expect(t!.number).toBe(1234);
    });

    it("parses VSC MNC", () => {
      const t = tokeniseMNC("[2022] VSC 42");
      expect(t).not.toBeNull();
      expect(t!.court).toBe("VSC");
      expect(t!.number).toBe(42);
    });

    it("parses MNC embedded in longer text", () => {
      const t = tokeniseMNC("See Smith v Jones [2021] FCAFC 88 at [12]");
      expect(t).not.toBeNull();
      expect(t!.court).toBe("FCAFC");
      expect(t!.number).toBe(88);
    });

    it("returns null for non-MNC text", () => {
      expect(tokeniseMNC("No citation here")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(tokeniseMNC("")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // parseCitation — MNC
  // -----------------------------------------------------------------------

  describe("parseCitation — MNC", () => {
    it("returns MNC type for medium neutral citation", () => {
      const c = parseCitation("[1992] HCA 23");
      expect(c).not.toBeNull();
      expect(c!.type).toBe("mnc");
      const mnc = c as MNCToken;
      expect(mnc.year).toBe(1992);
      expect(mnc.court).toBe("HCA");
      expect(mnc.number).toBe(23);
    });
  });

  // -----------------------------------------------------------------------
  // parseCitation — Authorised Reports
  // -----------------------------------------------------------------------

  describe("parseCitation — Authorised Reports", () => {
    it("parses CLR report", () => {
      const c = parseCitation("(1992) 175 CLR 1");
      expect(c).not.toBeNull();
      expect(c!.type).toBe("report");
      const rpt = c as ReportCitation;
      expect(rpt.year).toBe(1992);
      expect(rpt.volume).toBe(175);
      expect(rpt.series).toBe("CLR");
      expect(rpt.page).toBe(1);
    });

    it("parses ALR report", () => {
      const c = parseCitation("(2001) 208 ALR 124");
      expect(c).not.toBeNull();
      const rpt = c as ReportCitation;
      expect(rpt.series).toBe("ALR");
      expect(rpt.volume).toBe(208);
      expect(rpt.page).toBe(124);
    });

    it("parses ALJR report", () => {
      const c = parseCitation("(2003) 77 ALJR 1598");
      expect(c).not.toBeNull();
      const rpt = c as ReportCitation;
      expect(rpt.series).toBe("ALJR");
      expect(rpt.volume).toBe(77);
    });

    it("parses multi-word report series", () => {
      const c = parseCitation("(1999) 46 NSWLR 207");
      expect(c).not.toBeNull();
      const rpt = c as ReportCitation;
      expect(rpt.series).toBe("NSWLR");
    });
  });

  // -----------------------------------------------------------------------
  // parseCitation — Statutes
  // -----------------------------------------------------------------------

  describe("parseCitation — Statutes", () => {
    const jurisdictions = [
      { abbr: "Cth", title: "Competition and Consumer Act" },
      { abbr: "NSW", title: "Conveyancing Act" },
      { abbr: "Vic", title: "Charter of Human Rights and Responsibilities Act" },
      { abbr: "Qld", title: "Criminal Code Act" },
      { abbr: "WA", title: "Mining Act" },
      { abbr: "SA", title: "Summary Offences Act" },
      { abbr: "Tas", title: "Evidence Act" },
      { abbr: "ACT", title: "Discrimination Act" },
      { abbr: "NT", title: "Information Act" },
    ];

    for (const { abbr, title } of jurisdictions) {
      it(`parses statute with jurisdiction ${abbr}`, () => {
        const text = `${title} 2010 (${abbr})`;
        const c = parseCitation(text);
        expect(c).not.toBeNull();
        expect(c!.type).toBe("statute");
        const stat = c as StatuteCitation;
        expect(stat.title).toBe(title);
        expect(stat.year).toBe(2010);
        expect(stat.jurisdiction).toBe(abbr);
      });
    }
  });

  // -----------------------------------------------------------------------
  // parseCitation — Hansard
  // -----------------------------------------------------------------------

  describe("parseCitation — Hansard", () => {
    it("parses Commonwealth Hansard reference", () => {
      const text =
        "Commonwealth, Parliamentary Debates, House of Representatives, 12 March 2020, 4567 (Scott Morrison)";
      const c = parseCitation(text);
      expect(c).not.toBeNull();
      expect(c!.type).toBe("hansard");
      const h = c as HansardCitation;
      expect(h.parliament).toBe("Commonwealth");
      expect(h.chamber).toBe("House of Representatives");
      expect(h.date).toBe("12 March 2020");
      expect(h.page).toBe("4567");
      expect(h.speaker).toBe("Scott Morrison");
    });

    it("parses Hansard without speaker", () => {
      const text =
        "New South Wales, Parliamentary Debates, Legislative Assembly, 5 June 2019, 123";
      const c = parseCitation(text);
      expect(c).not.toBeNull();
      const h = c as HansardCitation;
      expect(h.parliament).toBe("New South Wales");
      expect(h.speaker).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // findAllCitations
  // -----------------------------------------------------------------------

  describe("findAllCitations", () => {
    it("finds multiple citations in mixed text", () => {
      const text = [
        "In Mabo v Queensland (No 2) [1992] HCA 23; (1992) 175 CLR 1,",
        "the High Court considered the Competition and Consumer Act 2010 (Cth).",
        "See also [2023] FCA 100.",
      ].join(" ");

      const all = findAllCitations(text);

      // Should find: [1992] HCA 23, (1992) 175 CLR 1, statute, [2023] FCA 100
      expect(all.length).toBeGreaterThanOrEqual(4);

      const types = all.map((c) => c.type);
      expect(types).toContain("mnc");
      expect(types).toContain("report");
      expect(types).toContain("statute");
    });

    it("returns citations in document order", () => {
      const text = "[2023] FCA 100 and then (2001) 208 ALR 124";
      const all = findAllCitations(text);
      expect(all.length).toBe(2);
      expect(all[0].type).toBe("mnc");
      expect(all[1].type).toBe("report");
    });

    it("returns empty array for text with no citations", () => {
      const all = findAllCitations("Just some ordinary text with no legal references.");
      expect(all).toEqual([]);
    });

    it("handles multiple MNCs", () => {
      const text = "[2020] HCA 1 and [2021] NSWCA 200 and [2022] VSC 55";
      const all = findAllCitations(text);
      const mncs = all.filter((c) => c.type === "mnc");
      expect(mncs.length).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe("Edge cases", () => {
    it("parseCitation returns null for empty string", () => {
      expect(parseCitation("")).toBeNull();
    });

    it("parseCitation returns null for unrecognised text", () => {
      expect(parseCitation("Hello world")).toBeNull();
    });

    it("parseCitation returns null for partial MNC", () => {
      expect(parseCitation("[2024]")).toBeNull();
      expect(parseCitation("[2024] HCA")).toBeNull();
    });

    it("parseCitation prefers MNC over report when both present", () => {
      // Text that contains both an MNC and a report citation
      const c = parseCitation("[1992] HCA 23; (1992) 175 CLR 1");
      expect(c).not.toBeNull();
      expect(c!.type).toBe("mnc");
    });
  });
});
