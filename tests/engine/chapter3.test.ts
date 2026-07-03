/*
 * Obiter -- AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Chapter 3: Legislative Materials -- AGLC4 Audit Tests
 *
 * Tests every rule section (3.1.1 through 3.9.4) using examples drawn
 * directly from the AGLC4 guide.
 */

import {
  formatStatute,
  formatLegislationPinpoint,
  formatLegislativeDefinition,
  formatBill,
} from "../../src/engine/rules/v4/domestic/legislation";

import {
  validateStatuteOrder,
  formatDelegatedLegislation,
  formatLegislationShortTitle,
  formatLegislationSubsequentRef,
  formatCommonwealthConstitution,
  formatStateConstitution,
  formatExplanatoryMemorandum,
  formatGazette,
  formatQuasiLegislative,
  formatPracticeDirection,
  formatLegislativeHistory,
  trimIssuingBodyName,
} from "../../src/engine/rules/v4/domestic/legislation-supplementary";

import { FormattedRun } from "../../src/types/formattedRun";

/** Helper: concatenate FormattedRun[] into plain text. */
function toPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: extract only italic runs as text. */
function italicText(runs: FormattedRun[]): string {
  return runs
    .filter((r) => r.italic)
    .map((r) => r.text)
    .join("");
}

/** Helper: extract only non-italic runs as text. */
function romanText(runs: FormattedRun[]): string {
  return runs
    .filter((r) => !r.italic)
    .map((r) => r.text)
    .join("");
}

// =============================================================================
// Rule 3.1: Statutes (Acts of Parliament)
// =============================================================================

describe("Rule 3.1 -- Statute Citation Format", () => {
  // ---- 3.1.1 Title ----

  describe("Rule 3.1.1 -- Title", () => {
    it("should render title in italics (AGLC4 Example 1: Evidence Act 1995 (NSW))", () => {
      const runs = formatStatute({
        title: "Evidence Act",
        year: 1995,
        jurisdiction: "NSW",
      });
      expect(toPlainText(runs)).toBe("Evidence Act 1995 (NSW)");
      expect(italicText(runs)).toBe("Evidence Act 1995");
    });

    it("should render ordinance title correctly (AGLC4 Example 2)", () => {
      const runs = formatStatute({
        title: "Social Welfare Ordinance",
        year: 1964,
        jurisdiction: "NT",
      });
      expect(toPlainText(runs)).toBe("Social Welfare Ordinance 1964 (NT)");
    });

    it("should include (No 2) numbering in italics (AGLC4 Example 3)", () => {
      const runs = formatStatute({
        title: "Financial Framework Legislation Amendment Act",
        year: 2012,
        jurisdiction: "Cth",
        number: "(No 2)",
      });
      expect(toPlainText(runs)).toBe(
        "Financial Framework Legislation Amendment Act (No 2) 2012 (Cth)"
      );
      expect(italicText(runs)).toBe("Financial Framework Legislation Amendment Act (No 2) 2012");
    });

    it("should include (No 3) numbering (AGLC4 Example 4)", () => {
      const runs = formatStatute({
        title: "Financial Framework Legislation Amendment Act",
        year: 2012,
        jurisdiction: "Cth",
        number: "(No 3)",
      });
      expect(toPlainText(runs)).toBe(
        "Financial Framework Legislation Amendment Act (No 3) 2012 (Cth)"
      );
    });

    it("should handle complex title with nested parens (AGLC4 Example 5)", () => {
      const runs = formatStatute({
        title: "A New Tax System (Family Assistance) (Consequential Related Measures) Act",
        year: 1999,
        jurisdiction: "Cth",
        number: "(No 1)",
      });
      expect(toPlainText(runs)).toBe(
        "A New Tax System (Family Assistance) (Consequential Related Measures) Act (No 1) 1999 (Cth)"
      );
    });
  });

  // ---- 3.1.2 Year ----

  describe("Rule 3.1.2 -- Year", () => {
    it("should render year in italics (AGLC4 Example 6: Meteorites Act 1973 (Tas))", () => {
      const runs = formatStatute({
        title: "Meteorites Act",
        year: 1973,
        jurisdiction: "Tas",
      });
      expect(italicText(runs)).toBe("Meteorites Act 1973");
      expect(romanText(runs)).toBe(" (Tas)");
    });
  });

  // ---- 3.1.3 Jurisdiction ----

  describe("Rule 3.1.3 -- Jurisdiction", () => {
    it("should render jurisdiction in parentheses, not italic (AGLC4 Example 7)", () => {
      const runs = formatStatute({
        title: "Misrepresentation Act",
        year: 1972,
        jurisdiction: "SA",
      });
      const jurisdictionRun = runs.find((r) => r.text.includes("(SA)"));
      expect(jurisdictionRun).toBeDefined();
      expect(jurisdictionRun!.italic).toBeUndefined();
    });

    it("should render Vic jurisdiction correctly (AGLC4 Example 8)", () => {
      const runs = formatStatute({
        title: "Charter of Human Rights and Responsibilities Act",
        year: 2006,
        jurisdiction: "Vic",
      });
      expect(toPlainText(runs)).toBe("Charter of Human Rights and Responsibilities Act 2006 (Vic)");
    });

    it("should use correct abbreviation for Commonwealth", () => {
      const runs = formatStatute({
        title: "Competition and Consumer Act",
        year: 2010,
        jurisdiction: "Cth",
      });
      expect(toPlainText(runs)).toBe("Competition and Consumer Act 2010 (Cth)");
    });
  });
});

// =============================================================================
// Rule 3.1.4: Legislation Pinpoints
// =============================================================================

describe("Rule 3.1.4 -- Pinpoint References", () => {
  it("should format section singular: s 3", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "3",
    });
    expect(toPlainText(runs)).toBe("s 3");
  });

  it("should format section with subsection: s 5(1)", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "5(1)",
    });
    expect(toPlainText(runs)).toBe("s 5(1)");
  });

  it("should format section with nested subsections: s 14(1)(a)", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "14(1)(a)",
    });
    expect(toPlainText(runs)).toBe("s 14(1)(a)");
  });

  it("should format plural sections with en-dash: ss 5--6", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "5\u20136",
    });
    expect(toPlainText(runs)).toBe("ss 5\u20136");
  });

  it("should format part: pt V", () => {
    const runs = formatLegislationPinpoint({
      type: "part",
      value: "V",
    });
    expect(toPlainText(runs)).toBe("pt V");
  });

  it("should format division: div 2", () => {
    const runs = formatLegislationPinpoint({
      type: "division",
      value: "2",
    });
    expect(toPlainText(runs)).toBe("div 2");
  });

  it("should format plural divisions: divs 2--3", () => {
    const runs = formatLegislationPinpoint({
      type: "division",
      value: "2\u20133",
    });
    expect(toPlainText(runs)).toBe("divs 2\u20133");
  });

  it("should format schedule: sch 1", () => {
    const runs = formatLegislationPinpoint({
      type: "schedule",
      value: "1",
    });
    expect(toPlainText(runs)).toBe("sch 1");
  });

  it("should format clause: cl 14(3)(a)", () => {
    const runs = formatLegislationPinpoint({
      type: "clause",
      value: "14(3)(a)",
    });
    expect(toPlainText(runs)).toBe("cl 14(3)(a)");
  });

  it("should format plural clauses: cls (1)--(3)", () => {
    const runs = formatLegislationPinpoint({
      type: "clause",
      value: "(1)\u2013(3)",
    });
    expect(toPlainText(runs)).toBe("cls (1)\u2013(3)");
  });

  it("should format regulation: reg 5(1)", () => {
    const runs = formatLegislationPinpoint({
      type: "regulation",
      value: "5(1)",
    });
    expect(toPlainText(runs)).toBe("reg 5(1)");
  });

  it("should format plural regulations: regs 2.01--2.02", () => {
    const runs = formatLegislationPinpoint({
      type: "regulation",
      value: "2.01\u20132.02",
    });
    expect(toPlainText(runs)).toBe("regs 2.01\u20132.02");
  });

  it("should format rule: r 6.2(1)", () => {
    const runs = formatLegislationPinpoint({
      type: "rule",
      value: "6.2(1)",
    });
    expect(toPlainText(runs)).toBe("r 6.2(1)");
  });

  it("should format chapter: ch III", () => {
    const runs = formatLegislationPinpoint({
      type: "chapter",
      value: "III",
    });
    expect(toPlainText(runs)).toBe("ch III");
  });

  it("should format appendix: app 1", () => {
    const runs = formatLegislationPinpoint({
      type: "appendix",
      value: "1",
    });
    expect(toPlainText(runs)).toBe("app 1");
  });

  it("should format subdivision: sub-div 2", () => {
    const runs = formatLegislationPinpoint({
      type: "subdivision",
      value: "2",
    });
    expect(toPlainText(runs)).toBe("sub-div 2");
  });

  it("should format subsection: sub-s (3)", () => {
    const runs = formatLegislationPinpoint({
      type: "subsection",
      value: "(3)",
    });
    expect(toPlainText(runs)).toBe("sub-s (3)");
  });

  it("should format plural subsections: sub-ss (2)--(7)", () => {
    const runs = formatLegislationPinpoint({
      type: "subsection",
      value: "(2)\u2013(7)",
    });
    expect(toPlainText(runs)).toBe("sub-ss (2)\u2013(7)");
  });

  it("should format order: ord 9", () => {
    const runs = formatLegislationPinpoint({
      type: "order",
      value: "9",
    });
    expect(toPlainText(runs)).toBe("ord 9");
  });

  it("should format item: item 46", () => {
    const runs = formatLegislationPinpoint({
      type: "item",
      value: "46",
    });
    expect(toPlainText(runs)).toBe("item 46");
  });

  it("should format paragraph: para (a)(i)", () => {
    const runs = formatLegislationPinpoint({
      type: "paragraph",
      value: "(a)(i)",
    });
    expect(toPlainText(runs)).toBe("para (a)(i)");
  });

  // ---- 3.1.4: Compound pinpoints (subPinpoint) ----

  it("should format compound pinpoint: pt 3 div 2 (AGLC4 Example 11)", () => {
    const runs = formatLegislationPinpoint({
      type: "part",
      value: "3A",
      subPinpoint: { type: "division", value: "2" },
    });
    expect(toPlainText(runs)).toBe("pt 3A div 2");
  });

  it("should format compound pinpoint: ch 2 pt 1 div 4 (AGLC4 Example 12)", () => {
    const runs = formatLegislationPinpoint({
      type: "chapter",
      value: "2",
      subPinpoint: {
        type: "part",
        value: "1",
        subPinpoint: { type: "division", value: "4" },
      },
    });
    expect(toPlainText(runs)).toBe("ch 2 pt 1 div 4");
  });

  it("should format compound pinpoint: sch 1 cl 2 (AGLC4 Example 13)", () => {
    const runs = formatLegislationPinpoint({
      type: "schedule",
      value: "1",
      subPinpoint: { type: "clause", value: "2" },
    });
    expect(toPlainText(runs)).toBe("sch 1 cl 2");
  });

  it("should format compound pinpoint: sch 1 item 46 (AGLC4 Example 14)", () => {
    const runs = formatLegislationPinpoint({
      type: "schedule",
      value: "1",
      subPinpoint: { type: "item", value: "46" },
    });
    expect(toPlainText(runs)).toBe("sch 1 item 46");
  });

  it("should format decimal sections: s 20-110(1)(a) (AGLC4 Example 15)", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "20-110(1)(a)",
    });
    expect(toPlainText(runs)).toBe("s 20-110(1)(a)");
  });

  it("should format decimal sections: s 3.2.1 (AGLC4 Example 16)", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "3.2.1",
    });
    expect(toPlainText(runs)).toBe("s 3.2.1");
  });

  it("should format pt 2.3 (AGLC4 Example 17)", () => {
    const runs = formatLegislationPinpoint({
      type: "part",
      value: "2.3",
    });
    expect(toPlainText(runs)).toBe("pt 2.3");
  });

  // ---- 3.1.5: Multiple pinpoint references (plurals) ----

  it("should use plural for range with comma: ss 92(1), (4), (7)", () => {
    const runs = formatLegislationPinpoint({
      type: "section",
      value: "92(1), (4), (7)",
    });
    expect(toPlainText(runs)).toBe("ss 92(1), (4), (7)");
  });

  it("should format pt 7 div 3 sub-div 8 (AGLC4 Rule 3.1.4 example)", () => {
    const runs = formatLegislationPinpoint({
      type: "part",
      value: "7",
      subPinpoint: {
        type: "division",
        value: "3",
        subPinpoint: { type: "subdivision", value: "8" },
      },
    });
    expect(toPlainText(runs)).toBe("pt 7 div 3 sub-div 8");
  });
});

// =============================================================================
// Rule 3.1.6: Legislative Definitions
// =============================================================================

describe("Rule 3.1.6 -- Legislative Definitions", () => {
  it("should format definition citation (AGLC4 Example 24)", () => {
    const statute = formatStatute({
      title: "Property Law Act",
      year: 1958,
      jurisdiction: "Vic",
    });
    const runs = formatLegislativeDefinition(statute, "3", "legal practitioner");
    const text = toPlainText(runs);
    expect(text).toBe(
      "Property Law Act 1958 (Vic) s 3 (definition of \u2018legal practitioner\u2019)"
    );
  });

  it("formats definition housed in a portion of the Act per AGLC4 ex 25 (rule 3.1.6)", () => {
    // Rule 3.1.6: the portion of the Act containing the definition replaces
    // the whole `s <n>` element verbatim — no abbreviation prefix.
    const statute = formatStatute({
      title: "Evidence Act",
      year: 2008,
      jurisdiction: "Vic",
    });
    const runs = formatLegislativeDefinition(
      statute,
      "Dictionary pt 1",
      "civil proceeding",
      "portion"
    );
    expect(toPlainText(runs)).toBe(
      "Evidence Act 2008 (Vic) Dictionary pt 1 (definition of \u2018civil proceeding\u2019)"
    );
  });

  it("AUDIT2-019: defaults to section prefix when no pinpointType given", () => {
    const statute = formatStatute({
      title: "Test Act",
      year: 2020,
      jurisdiction: "Cth",
    });
    const runs = formatLegislativeDefinition(statute, "10", "widget");
    expect(toPlainText(runs)).toBe("Test Act 2020 (Cth) s 10 (definition of \u2018widget\u2019)");
  });

  it("formats definition with paragraph reference per AGLC4 ex 26 (rule 3.1.6)", () => {
    // Rule 3.1.6: a particular definition paragraph is appended inside the
    // parenthetical, preceded by 'para', with no comma after the term.
    const statute = formatStatute({
      title: "Corporations Act",
      year: 2001,
      jurisdiction: "Cth",
    });
    const runs = formatLegislativeDefinition(statute, "9", "administrator", "section", "(a)(i)");
    expect(toPlainText(runs)).toBe(
      "Corporations Act 2001 (Cth) s 9 (definition of \u2018administrator\u2019 para (a)(i))"
    );
  });

  it("should wrap defined term in single quotation marks", () => {
    const statute = formatStatute({
      title: "Competition and Consumer Act",
      year: 2010,
      jurisdiction: "Cth",
    });
    const runs = formatLegislativeDefinition(statute, "4", "market");
    const text = toPlainText(runs);
    expect(text).toContain("\u2018market\u2019");
  });
});

// =============================================================================
// Rule 3.2: Bills
// =============================================================================

describe("Rule 3.2 -- Bills", () => {
  it("should NOT italicise title and year (AGLC4 Example 33)", () => {
    const runs = formatBill({
      title: "Corporations Amendment (Crowd-Sourced Funding) Bill",
      year: 2015,
      jurisdiction: "Cth",
    });
    expect(toPlainText(runs)).toBe(
      "Corporations Amendment (Crowd-Sourced Funding) Bill 2015 (Cth)"
    );
    // Per AGLC4 Rule 3.2: title and year should NOT be italicised
    expect(italicText(runs)).toBe("");
  });

  it("should format bill with pinpoint context (AGLC4 Example 34)", () => {
    const runs = formatBill({
      title: "Carbon Pollution Reduction Scheme Bill",
      year: 2009,
      jurisdiction: "Cth",
    });
    expect(toPlainText(runs)).toBe("Carbon Pollution Reduction Scheme Bill 2009 (Cth)");
    // Bill title should not be italic
    const italicRuns = runs.filter((r) => r.italic);
    expect(italicRuns).toHaveLength(0);
  });

  it("should include (No 2) numbering (AGLC4 Example 36)", () => {
    const runs = formatBill({
      title: "Law and Justice Amendment Bill",
      year: 1995,
      jurisdiction: "Cth",
      number: "(No 2)",
    });
    expect(toPlainText(runs)).toBe("Law and Justice Amendment Bill (No 2) 1995 (Cth)");
  });

  it("should not italicise jurisdiction", () => {
    const runs = formatBill({
      title: "Migration Amendment (Immigration Detention Reform) Bill",
      year: 2009,
      jurisdiction: "Cth",
    });
    const jurisdictionRun = runs.find((r) => r.text.includes("(Cth)"));
    expect(jurisdictionRun).toBeDefined();
    expect(jurisdictionRun!.italic).toBeUndefined();
  });
});

// =============================================================================
// Rule 3.3: Order of Parallel Australian Statutes
// =============================================================================

describe("Rule 3.3 -- Order of Parallel Australian Statutes", () => {
  it("should validate correct order: Cth first, then alphabetical (AGLC4 Example 37)", () => {
    const result = validateStatuteOrder([
      "Cth",
      "ACT",
      "NSW",
      "NT",
      "Qld",
      "SA",
      "Tas",
      "Vic",
      "WA",
    ]);
    expect(result.valid).toBe(true);
  });

  it("should detect incorrect order", () => {
    const result = validateStatuteOrder(["NSW", "Cth", "Vic"]);
    expect(result.valid).toBe(false);
    expect(result.suggested).toEqual(["Cth", "NSW", "Vic"]);
  });

  it("should validate partial list in correct order (AGLC4 Example 38)", () => {
    const result = validateStatuteOrder(["ACT", "NT", "Qld", "SA", "WA"]);
    expect(result.valid).toBe(true);
  });

  it("should handle single jurisdiction", () => {
    const result = validateStatuteOrder(["Vic"]);
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// Rule 3.4: Delegated Legislation
// =============================================================================

describe("Rule 3.4 -- Delegated Legislation", () => {
  it("should format same as primary legislation (AGLC4 Example 39)", () => {
    const runs = formatDelegatedLegislation({
      title: "Heritage Regulation",
      year: 2006,
      jurisdiction: "ACT",
    });
    expect(toPlainText(runs)).toBe("Heritage Regulation 2006 (ACT)");
    expect(italicText(runs)).toBe("Heritage Regulation 2006");
  });

  it("should format rules (AGLC4 Example 40)", () => {
    const runs = formatDelegatedLegislation({
      title: "Uniform Civil Procedure Rules",
      year: 2005,
      jurisdiction: "NSW",
    });
    expect(toPlainText(runs)).toBe("Uniform Civil Procedure Rules 2005 (NSW)");
    expect(italicText(runs)).toBe("Uniform Civil Procedure Rules 2005");
  });

  it("should not italicise jurisdiction", () => {
    const runs = formatDelegatedLegislation({
      title: "Migration Regulations",
      year: 1994,
      jurisdiction: "Cth",
    });
    const jurisdictionRun = runs.find((r) => r.text.includes("(Cth)"));
    expect(jurisdictionRun).toBeDefined();
    expect(jurisdictionRun!.italic).toBeUndefined();
  });
});

// =============================================================================
// Rule 3.5: Short Titles and Subsequent References
// =============================================================================

describe("Rule 3.5 -- Short Title and Subsequent References", () => {
  it("formats short title introduction per AGLC4 ex 45 (rule 3.5)", () => {
    // Rule 3.5: only the short title itself is italicised — the
    // parentheses and quotation marks stay roman.
    const runs = formatLegislationShortTitle("Property Act");
    expect(toPlainText(runs)).toBe(" (\u2018Property Act\u2019)");
    expect(italicText(runs)).toBe("Property Act");
    expect(romanText(runs)).toBe(" (\u2018\u2019)");
  });

  it("formats a Bill short title introduction in roman (rules 3.2, 3.5)", () => {
    // Rule 3.5: the short title is italicised according to this chapter's
    // rules — roman for Bills (rule 3.2).
    const runs = formatLegislationShortTitle("Human Rights Bill", false);
    expect(toPlainText(runs)).toBe(" (\u2018Human Rights Bill\u2019)");
    expect(italicText(runs)).toBe("");
  });

  it("should format subsequent reference with footnote xref (AGLC4 Example 48)", () => {
    const runs = formatLegislationSubsequentRef("ADJR Act", 46);
    expect(toPlainText(runs)).toBe("ADJR Act (n 46)");
    // The short title part should be italic
    expect(runs[0].italic).toBe(true);
    expect(runs[0].text).toBe("ADJR Act");
  });

  it("should format subsequent reference with pinpoint (AGLC4 Example 48 s 7)", () => {
    const runs = formatLegislationSubsequentRef("ADJR Act", 46, {
      type: "section",
      value: "7",
    });
    expect(toPlainText(runs)).toBe("ADJR Act (n 46) s 7");
  });

  it("should format ibid-style with short title and pinpoint", () => {
    const runs = formatLegislationSubsequentRef("CCA", 1, {
      type: "section",
      value: "52",
    });
    expect(toPlainText(runs)).toBe("CCA (n 1) s 52");
  });

  it("formats a Bill short-title subsequent reference in roman (rules 3.2, 3.5)", () => {
    const runs = formatLegislationSubsequentRef(
      "Human Rights Bill",
      12,
      { type: "clause", value: "7" },
      false
    );
    expect(toPlainText(runs)).toBe("Human Rights Bill (n 12) cl 7");
    expect(italicText(runs)).toBe("");
  });
});

// =============================================================================
// Rule 3.6: Australian Constitutions
// =============================================================================

describe("Rule 3.6 -- Australian Constitutions", () => {
  describe("Commonwealth Constitution", () => {
    it("should format as 'Australian Constitution' in italics (AGLC4 Example 49)", () => {
      const runs = formatCommonwealthConstitution({
        type: "section",
        value: "51(ii)",
      });
      expect(toPlainText(runs)).toBe("Australian Constitution s 51(ii)");
      expect(italicText(runs)).toBe("Australian Constitution");
    });

    it("should format without pinpoint", () => {
      const runs = formatCommonwealthConstitution();
      expect(toPlainText(runs)).toBe("Australian Constitution");
      expect(runs[0].italic).toBe(true);
    });

    it("should render pinpoint in roman (not italic)", () => {
      const runs = formatCommonwealthConstitution({
        type: "section",
        value: "51(i)",
      });
      // The pinpoint part should not be italic
      const pinpointRuns = runs.filter((r) => r.text.includes("s 51") || r.text.includes("51(i)"));
      pinpointRuns.forEach((r) => {
        expect(r.italic).toBeUndefined();
      });
    });
  });

  describe("State Constitutions", () => {
    it("should format as normal statute (AGLC4 Example 52)", () => {
      const runs = formatStateConstitution({
        title: "Constitution Act",
        year: 1902,
        jurisdiction: "NSW",
        pinpoint: { type: "section", value: "5" },
      });
      expect(toPlainText(runs)).toBe("Constitution Act 1902 (NSW) s 5");
      expect(italicText(runs)).toBe("Constitution Act 1902");
    });

    it("should format Constitution of Queensland (AGLC4 Example 53)", () => {
      const runs = formatStateConstitution({
        title: "Constitution of Queensland",
        year: 2001,
        jurisdiction: "Qld",
        pinpoint: { type: "section", value: "3" },
      });
      expect(toPlainText(runs)).toBe("Constitution of Queensland 2001 (Qld) s 3");
    });

    it("should format Constitution Act 1975 (Vic) (AGLC4 Example 56)", () => {
      const runs = formatStateConstitution({
        title: "Constitution Act",
        year: 1975,
        jurisdiction: "Vic",
        pinpoint: { type: "section", value: "16" },
      });
      expect(toPlainText(runs)).toBe("Constitution Act 1975 (Vic) s 16");
    });

    it("should format Constitution Act 1889 (WA) with subsection (AGLC4 Example 57)", () => {
      const runs = formatStateConstitution({
        title: "Constitution Act",
        year: 1889,
        jurisdiction: "WA",
        pinpoint: { type: "section", value: "2(1)" },
      });
      expect(toPlainText(runs)).toBe("Constitution Act 1889 (WA) s 2(1)");
    });

    it("should format without pinpoint", () => {
      const runs = formatStateConstitution({
        title: "Constitution Act",
        year: 1934,
        jurisdiction: "SA",
      });
      expect(toPlainText(runs)).toBe("Constitution Act 1934 (SA)");
    });
  });

  describe("Self-government Acts (AGLC4 Examples 50-51)", () => {
    it("should cite ACT self-government act as normal statute (AGLC4 Example 50)", () => {
      const runs = formatStateConstitution({
        title: "Australian Capital Territory (Self-Government) Act",
        year: 1988,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "22(1)" },
      });
      expect(toPlainText(runs)).toBe(
        "Australian Capital Territory (Self-Government) Act 1988 (Cth) s 22(1)"
      );
    });

    it("should cite NT self-government act as normal statute (AGLC4 Example 51)", () => {
      const runs = formatStateConstitution({
        title: "Northern Territory (Self-Government) Act",
        year: 1978,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "6" },
      });
      expect(toPlainText(runs)).toBe("Northern Territory (Self-Government) Act 1978 (Cth) s 6");
    });
  });
});

// =============================================================================
// Rule 3.7: Explanatory Memoranda
// =============================================================================

describe("Rule 3.7 -- Explanatory Memoranda", () => {
  it("formats Explanatory Memorandum per AGLC4 ex 58 (rule 3.7)", () => {
    // Rule 3.7: the Bill citation follows rule 3.2, so nothing is italicised.
    const runs = formatExplanatoryMemorandum({
      type: "Explanatory Memorandum",
      billTitle: "Charter of Human Rights and Responsibilities Bill",
      billYear: 2006,
      jurisdiction: "Vic",
    });
    expect(toPlainText(runs)).toBe(
      "Explanatory Memorandum, Charter of Human Rights and Responsibilities Bill 2006 (Vic)"
    );
    expect(italicText(runs)).toBe("");
  });

  it("formats Explanatory Notes with pinpoint per AGLC4 ex 59 (rule 3.7)", () => {
    const runs = formatExplanatoryMemorandum({
      type: "Explanatory Notes",
      billTitle: "Adoption Bill",
      billYear: 2009,
      jurisdiction: "Qld",
      pinpoint: { type: "page", value: "5\u20136, 29" },
    });
    expect(toPlainText(runs)).toBe("Explanatory Notes, Adoption Bill 2009 (Qld) 5\u20136, 29");
    expect(italicText(runs)).toBe("");
  });

  it("formats Explanatory Statement per AGLC4 ex 60 (rule 3.7)", () => {
    const runs = formatExplanatoryMemorandum({
      type: "Explanatory Statement",
      billTitle: "Human Rights Bill",
      billYear: 2003,
      jurisdiction: "ACT",
      pinpoint: { type: "page", value: "3" },
    });
    expect(toPlainText(runs)).toBe("Explanatory Statement, Human Rights Bill 2003 (ACT) 3");
    expect(italicText(runs)).toBe("");
  });

  it("should not italicise the document type label", () => {
    const runs = formatExplanatoryMemorandum({
      type: "Explanatory Memorandum",
      billTitle: "Test Bill",
      billYear: 2020,
      jurisdiction: "Cth",
    });
    const typeRun = runs.find((r) => r.text.includes("Explanatory Memorandum"));
    expect(typeRun).toBeDefined();
    expect(typeRun!.italic).toBeUndefined();
  });
});

// =============================================================================
// Rule 3.8: Legislative History
// =============================================================================

describe("Rule 3.8 -- Legislative History", () => {
  it("should have guidance constant defined", () => {
    const {
      LEGISLATIVE_HISTORY_GUIDANCE,
    } = require("../../src/engine/rules/v4/domestic/legislation-supplementary");
    expect(LEGISLATIVE_HISTORY_GUIDANCE).toBeDefined();
    expect(typeof LEGISLATIVE_HISTORY_GUIDANCE).toBe("string");
  });

  // Exhaustive connector coverage (AGLC4 fns 61-68) lives in
  // tests/engine/legislation-history.test.ts; these two pin the hybrid
  // form end-to-end at the chapter level (DECISION-008).
  it("formats amended provision per AGLC4 ex 62 (rule 3.8)", () => {
    const lead = [
      ...formatStatute({ title: "Copyright Act", year: 1968, jurisdiction: "Cth" }),
      { text: " " },
      ...formatLegislationPinpoint({ type: "section", value: "40(3)" }),
    ];
    const runs = formatLegislativeHistory(lead, {
      connector: "later amended by",
      relatedAct: {
        title: "Copyright Amendment Act",
        year: 2006,
        jurisdiction: "Cth",
        pinpoint: {
          type: "schedule",
          value: "6",
          subPinpoint: { type: "item", value: "11" },
        },
      },
    });
    expect(toPlainText(runs)).toBe(
      "Copyright Act 1968 (Cth) s 40(3), later amended by Copyright Amendment Act 2006 (Cth) sch 6 item 11"
    );
  });

  it("formats as-enacted citation per AGLC4 ex 67 (rule 3.8)", () => {
    const lead = formatStatute({
      title: "Restrictive Trade Practices Act",
      year: 1971,
      jurisdiction: "Cth",
    });
    const runs = formatLegislativeHistory(lead, { connector: "as enacted" });
    expect(toPlainText(runs)).toBe("Restrictive Trade Practices Act 1971 (Cth), as enacted");
  });
});

// =============================================================================
// Rule 3.9.1: Gazettes
// =============================================================================

describe("Rule 3.9.1 -- Gazettes", () => {
  it("should format gazette citation (AGLC4 Example 69)", () => {
    const runs = formatGazette({
      jurisdiction: "Commonwealth",
      gazetteType: "Gazette: Special",
      number: "S 489",
      date: "1 December 2004",
    });
    const text = toPlainText(runs);
    expect(text).toBe("Commonwealth, Gazette: Special, No S 489, 1 December 2004");
  });

  it("should italicise gazette type", () => {
    const runs = formatGazette({
      jurisdiction: "Commonwealth",
      gazetteType: "Government Gazette",
      date: "5 March 2020",
    });
    const gazetteRun = runs.find((r) => r.text === "Government Gazette");
    expect(gazetteRun).toBeDefined();
    expect(gazetteRun!.italic).toBe(true);
  });

  it("formats notice without author per AGLC4 ex 70 (rule 3.9.1)", () => {
    // Rule 3.9.1: the notice's author is included only if available.
    const runs = formatGazette({
      noticeTitle: "Australian Capital Territory Teaching Service",
      jurisdiction: "Australian Capital Territory",
      gazetteType: "Australian Capital Territory Gazette",
      number: "1",
      date: "24 May 1989",
      page: 3,
    });
    expect(toPlainText(runs)).toBe(
      "\u2018Australian Capital Territory Teaching Service\u2019 in Australian Capital Territory, " +
        "Australian Capital Territory Gazette, No 1, 24 May 1989, 3"
    );
  });

  it("formats individual notice per AGLC4 ex 71 (rule 3.9.1)", () => {
    // Rule 3.9.1: author, roman quoted notice title, 'in', then the basic
    // form, starting page, and page pinpoint.
    const runs = formatGazette({
      noticeAuthor: "Minister for Lands (WA)",
      noticeTitle:
        "Land Acquisition and Public Works Act 1902 — Native Title Act 1993 " +
        "(Commonwealth) — Notice of Intention to Take Land for a Public Work",
      jurisdiction: "Western Australia",
      gazetteType: "Western Australian Government Gazette",
      number: "27",
      date: "18 February 1997",
      page: 1142,
      pinpoint: "1143",
    });
    expect(toPlainText(runs)).toBe(
      "Minister for Lands (WA), \u2018Land Acquisition and Public Works Act 1902 — " +
        "Native Title Act 1993 (Commonwealth) — Notice of Intention to Take Land " +
        "for a Public Work\u2019 in Western Australia, Western Australian Government Gazette, " +
        "No 27, 18 February 1997, 1142, 1143"
    );
    // Only the gazette title is italic; the notice title is roman
    expect(italicText(runs)).toBe("Western Australian Government Gazette");
  });

  it("should not italicise jurisdiction", () => {
    const runs = formatGazette({
      jurisdiction: "Commonwealth",
      gazetteType: "Gazette: Special",
      date: "1 January 2020",
    });
    const jurisdictionRun = runs.find((r) => r.text.includes("Commonwealth"));
    expect(jurisdictionRun).toBeDefined();
    expect(jurisdictionRun!.italic).toBeUndefined();
  });
});

// =============================================================================
// Rule 3.9.2: Orders and Rulings (ASIC Class Orders, Taxation Rulings)
// =============================================================================

describe("Rule 3.9.2 -- Orders and Rulings", () => {
  it("formats ATO taxation ruling per AGLC4 ex 72 (rule 3.9.2)", () => {
    // Rule 3.9.2 template: Instrumentality, Title (Number, Date) Pinpoint
    const runs = formatQuasiLegislative({
      issuingBody: "Australian Taxation Office",
      title: "Income Tax: Carrying on a Business as a Professional Artist",
      number: "TR 2005/1",
      date: "12 January 2005",
    });
    expect(toPlainText(runs)).toBe(
      "Australian Taxation Office, Income Tax: Carrying on a Business as a " +
        "Professional Artist (TR 2005/1, 12 January 2005)"
    );
    expect(italicText(runs)).toBe("Income Tax: Carrying on a Business as a Professional Artist");
  });

  it("formats ASIC class order with paragraph pinpoint per AGLC4 ex 73 (rule 3.9.2)", () => {
    const runs = formatQuasiLegislative({
      issuingBody: "Australian Securities and Investments Commission",
      title: "ASIC Class Order — Credit Rating Agencies",
      number: "CO 05/1230",
      date: "31 December 2005",
      pinpoint: { type: "paragraph", value: "[4]" },
    });
    expect(toPlainText(runs)).toBe(
      "Australian Securities and Investments Commission, ASIC Class Order — " +
        "Credit Rating Agencies (CO 05/1230, 31 December 2005) [4]"
    );
  });

  it("formats officer instrument with jurisdiction and no number per AGLC4 ex 74 (rule 3.9.2)", () => {
    // Rule 3.9.2: an officer's jurisdiction follows the officer name in
    // parentheses; a document number is included only if one appears.
    const runs = formatQuasiLegislative({
      issuingBody: "Minister for Immigration and Border Protection",
      bodyJurisdiction: "Cth",
      title:
        "Direction No 65: Visa Refusal and Cancellation under s501 and " +
        "Revocation of a Mandatory Cancellation of a Visa under s501CA",
      date: "22 December 2014",
    });
    expect(toPlainText(runs)).toBe(
      "Minister for Immigration and Border Protection (Cth), Direction No 65: " +
        "Visa Refusal and Cancellation under s501 and Revocation of a Mandatory " +
        "Cancellation of a Visa under s501CA (22 December 2014)"
    );
    expect(romanText(runs)).toBe(
      "Minister for Immigration and Border Protection (Cth),  (22 December 2014)"
    );
  });

  it("should italicise title when present", () => {
    const runs = formatQuasiLegislative({
      issuingBody: "Australian Taxation Office",
      title: "Income Tax: Residency Tests",
      number: "TR 2010/1",
      date: "14 July 2010",
    });
    const titleRun = runs.find((r) => r.text === "Income Tax: Residency Tests");
    expect(titleRun).toBeDefined();
    expect(titleRun!.italic).toBe(true);
  });
});

// =============================================================================
// Rule 3.9.3: Delegated Legislation to Non-Government Entities
// =============================================================================

describe("Rule 3.9.3 -- Non-Government Delegated Legislation", () => {
  it("formats ASX Listing Rules per AGLC4 ex 75 (rule 3.9.3)", () => {
    // Rule 3.9.3: with no document number (or a frequently updated source),
    // the parenthetical takes the version date as (at Full Date).
    const runs = formatQuasiLegislative({
      issuingBody: "ASX",
      title: "Listing Rules",
      atDate: "19 December 2016",
    });
    expect(toPlainText(runs)).toBe("ASX, Listing Rules (at 19 December 2016)");
    expect(italicText(runs)).toBe("Listing Rules");
  });

  it("formats conduct rules with rule pinpoint per AGLC4 ex 76 (rule 3.9.3)", () => {
    const runs = formatQuasiLegislative({
      issuingBody: "Law Society of the Australian Capital Territory",
      title: "ACT Legal Profession (Solicitors) Conduct Rules 2015",
      atDate: "20 November 2015",
      pinpoint: { type: "rule", value: "8.1" },
    });
    expect(toPlainText(runs)).toBe(
      "Law Society of the Australian Capital Territory, ACT Legal Profession " +
        "(Solicitors) Conduct Rules 2015 (at 20 November 2015) r 8.1"
    );
  });

  it("trims company designators from the issuing body per AGLC4 ex 77 (rule 3.9.3)", () => {
    // Rule 3.9.3: omit 'Pty'/'Ltd'/'Co'/'Inc' and a leading 'The'
    // (ex 77: not 'The Victorian Bar Inc').
    const runs = formatQuasiLegislative({
      issuingBody: "The Victorian Bar Inc",
      title: "Compulsory Continuing Professional Development Rules",
      atDate: "1 April 2011",
      pinpoint: { type: "rule", value: "4\u20135" },
    });
    expect(toPlainText(runs)).toBe(
      "Victorian Bar, Compulsory Continuing Professional Development Rules " +
        "(at 1 April 2011) rr 4\u20135"
    );
  });

  it("trimIssuingBodyName strips designators and leading 'The' (rule 3.9.3)", () => {
    expect(trimIssuingBodyName("The Victorian Bar Inc")).toBe("Victorian Bar");
    expect(trimIssuingBodyName("Acme Holdings Pty Ltd")).toBe("Acme Holdings");
    // Internal 'the' and ordinary words are untouched
    expect(trimIssuingBodyName("Law Society of the Australian Capital Territory")).toBe(
      "Law Society of the Australian Capital Territory"
    );
  });
});

// =============================================================================
// Rule 3.9.4: Court Practice Directions
// =============================================================================

describe("Rule 3.9.4 -- Court Practice Directions", () => {
  it("formats practice note in report series per AGLC4 ex 78 (rule 3.9.4)", () => {
    // Rule 3.9.4: designation, identifier and title are one italic unit;
    // 'No' is inserted before an identifier clearly specified as a number;
    // the report-series citation is roman.
    const runs = formatPracticeDirection({
      court: "Supreme Court of Victoria",
      designation: "Practice Note",
      identifier: "8 of 2010",
      title: "Management of Group Proceedings",
      reportCitation: "(2010) 30 VR 693",
    });
    expect(toPlainText(runs)).toBe(
      "Supreme Court of Victoria, Practice Note No 8 of 2010: Management of " +
        "Group Proceedings (2010) 30 VR 693"
    );
    expect(italicText(runs)).toBe("Practice Note No 8 of 2010: Management of Group Proceedings");
  });

  it("omits 'No' before a non-numeric identifier per AGLC4 ex 79 (rule 3.9.4)", () => {
    // Ex 79: not '... Practice Note No SC Gen 10: Conduct ...'
    const runs = formatPracticeDirection({
      court: "Supreme Court of Victoria",
      designation: "Practice Note",
      identifier: "SC Gen 10",
      title: "Conduct of Group Proceedings (Class Actions)",
      date: "30 January 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Supreme Court of Victoria, Practice Note SC Gen 10: Conduct of Group " +
        "Proceedings (Class Actions), 30 January 2017"
    );
  });

  it("formats dated practice direction per AGLC4 ex 80 (rule 3.9.4)", () => {
    const runs = formatPracticeDirection({
      court: "High Court of Australia",
      designation: "Practice Direction",
      identifier: "2 of 2010",
      title: "Use of Initials or Pseudonyms in Applications",
      date: "2 November 2010",
    });
    expect(toPlainText(runs)).toBe(
      "High Court of Australia, Practice Direction No 2 of 2010: Use of " +
        "Initials or Pseudonyms in Applications, 2 November 2010"
    );
    expect(italicText(runs)).toBe(
      "Practice Direction No 2 of 2010: Use of Initials or Pseudonyms in Applications"
    );
  });

  it("formats identifier-less practice note with pinpoint per AGLC4 ex 81 (rule 3.9.4)", () => {
    const runs = formatPracticeDirection({
      court: "Federal Court of Australia",
      designation: "Central Practice Note",
      title: "National Court Framework and Case Management",
      date: "25 October 2016",
      pinpoint: { type: "paragraph", value: "para 4.1" },
    });
    expect(toPlainText(runs)).toBe(
      "Federal Court of Australia, Central Practice Note: National Court " +
        "Framework and Case Management, 25 October 2016, para 4.1"
    );
  });
});

// =============================================================================
// Integration: Full citation assembly
// =============================================================================

describe("Integration -- Full statute with pinpoint", () => {
  it("should produce Crimes Act 1958 (Vic) s 3 (AGLC4 Rule 3.1 header example)", () => {
    const statute = formatStatute({
      title: "Crimes Act",
      year: 1958,
      jurisdiction: "Vic",
    });
    const pinpoint = formatLegislationPinpoint({
      type: "section",
      value: "3",
    });
    const combined = [...statute, { text: " " }, ...pinpoint];
    expect(toPlainText(combined)).toBe("Crimes Act 1958 (Vic) s 3");
    expect(italicText(combined)).toBe("Crimes Act 1958");
  });

  it("should produce Aboriginal and Torres Strait Islander Act 2005 (Cth) pt 3A div 2 (AGLC4 Example 11)", () => {
    const statute = formatStatute({
      title: "Aboriginal and Torres Strait Islander Act",
      year: 2005,
      jurisdiction: "Cth",
    });
    const pinpoint = formatLegislationPinpoint({
      type: "part",
      value: "3A",
      subPinpoint: { type: "division", value: "2" },
    });
    const combined = [...statute, { text: " " }, ...pinpoint];
    expect(toPlainText(combined)).toBe(
      "Aboriginal and Torres Strait Islander Act 2005 (Cth) pt 3A div 2"
    );
  });

  it("should produce Civil Liability Act 2003 (Qld) ch 2 pt 1 div 4 (AGLC4 Example 12)", () => {
    const statute = formatStatute({
      title: "Civil Liability Act",
      year: 2003,
      jurisdiction: "Qld",
    });
    const pinpoint = formatLegislationPinpoint({
      type: "chapter",
      value: "2",
      subPinpoint: {
        type: "part",
        value: "1",
        subPinpoint: { type: "division", value: "4" },
      },
    });
    const combined = [...statute, { text: " " }, ...pinpoint];
    expect(toPlainText(combined)).toBe("Civil Liability Act 2003 (Qld) ch 2 pt 1 div 4");
  });
});
