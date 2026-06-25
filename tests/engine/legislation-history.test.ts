/*
 * Obiter -- AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Rule 3.8: Legislative History -- Enactments, Amendments, Repeals and
 * Insertions (AGLC4 p 78).
 *
 * Pins the opt-in hybrid "provision + history" construction against the worked
 * examples in the guide (fns 61-68) and the worked Patents Act / Raising the
 * Bar Act pair. The non-goal cases enforce DECISION-008: the formatter never
 * synthesises a connector and does no harm on incomplete input.
 */

import {
  formatStatute,
  formatBill,
  formatLegislationPinpoint,
} from "../../src/engine/rules/v4/domestic/legislation";

import {
  formatLegislativeHistory,
  LegislativeHistory,
} from "../../src/engine/rules/v4/domestic/legislation-supplementary";

import { Pinpoint } from "../../src/types/citation";
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

/** Build a lead statute citation (italic title/year), optional pinpoint. */
function leadStatute(
  data: { title: string; year: number; jurisdiction: string; number?: string },
  pinpoint?: Pinpoint,
): FormattedRun[] {
  const runs = formatStatute(data);
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }
  return runs;
}

/** Build a lead Bill citation (roman title/year), optional pinpoint. */
function leadBill(
  data: { title: string; year: number; jurisdiction: string; number?: string },
  pinpoint?: Pinpoint,
): FormattedRun[] {
  const runs = formatBill(data);
  if (pinpoint) {
    runs.push({ text: " " });
    runs.push(...formatLegislationPinpoint(pinpoint));
  }
  return runs;
}

/** sch <n> item <m> pinpoint (the operative pinpoint for amending Acts). */
function schItem(sch: string, item: string): Pinpoint {
  return { type: "schedule", value: sch, subPinpoint: { type: "item", value: item } };
}

// =============================================================================
// Worked pair -- Patents Act 1990 (Cth) s 7 <-> Raising the Bar Act 2012 (Cth)
// =============================================================================

describe("Rule 3.8 -- worked Patents Act / Raising the Bar Act pair", () => {
  it("primary-lead 'as amended by' (the affected provision is the anchor)", () => {
    const lead = leadStatute(
      { title: "Patents Act", year: 1990, jurisdiction: "Cth" },
      { type: "section", value: "7" },
    );
    const history: LegislativeHistory = {
      connector: "as amended by",
      relatedAct: {
        title: "Intellectual Property Laws Amendment (Raising the Bar) Act",
        year: 2012,
        jurisdiction: "Cth",
      },
    };
    const runs = formatLegislativeHistory(lead, history);

    expect(toPlainText(runs)).toBe(
      "Patents Act 1990 (Cth) s 7, as amended by " +
        "Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth)",
    );
    // Both Act titles + years italicised; connector, jurisdiction, pinpoint roman.
    expect(italicText(runs)).toBe(
      "Patents Act 1990" +
        "Intellectual Property Laws Amendment (Raising the Bar) Act 2012",
    );
  });

  it("amending-lead 'amending' with a range pinpoint promotes s -> ss", () => {
    const lead = leadStatute({
      title: "Intellectual Property Laws Amendment (Raising the Bar) Act",
      year: 2012,
      jurisdiction: "Cth",
    });
    const history: LegislativeHistory = {
      connector: "amending",
      relatedAct: {
        title: "Patents Act",
        year: 1990,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "7(2)–(4)" },
      },
    };
    const runs = formatLegislativeHistory(lead, history);

    expect(toPlainText(runs)).toBe(
      "Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth), " +
        "amending Patents Act 1990 (Cth) ss 7(2)–(4)",
    );
  });
});

// =============================================================================
// AGLC4 worked examples (fns 61-68)
// =============================================================================

describe("Rule 3.8 -- AGLC4 examples fns 61-68", () => {
  it("fn 61 -- 'as at <Full Date>' (solo, no related Act)", () => {
    const lead = leadStatute(
      { title: "Anti-Discrimination Act", year: 1977, jurisdiction: "NSW" },
      { type: "section", value: "4(1)" },
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "as at",
      asAtDate: "28 June 1994",
    });
    expect(toPlainText(runs)).toBe(
      "Anti-Discrimination Act 1977 (NSW) s 4(1), as at 28 June 1994",
    );
  });

  it("fn 62 -- 'later amended by' with sch/item pinpoint", () => {
    const lead = leadStatute(
      { title: "Copyright Act", year: 1968, jurisdiction: "Cth" },
      { type: "section", value: "40(3)" },
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "later amended by",
      relatedAct: {
        title: "Copyright Amendment Act",
        year: 2006,
        jurisdiction: "Cth",
        pinpoint: schItem("6", "11"),
      },
    });
    expect(toPlainText(runs)).toBe(
      "Copyright Act 1968 (Cth) s 40(3), later amended by " +
        "Copyright Amendment Act 2006 (Cth) sch 6 item 11",
    );
  });

  it("fn 63 -- 'as repealed by' with a numbered related Act", () => {
    const lead = leadStatute(
      { title: "Crimes Act", year: 1914, jurisdiction: "Cth" },
      { type: "section", value: "24A(g)" },
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "as repealed by",
      relatedAct: {
        title: "Anti-Terrorism Act",
        number: "(No 2)",
        year: 2005,
        jurisdiction: "Cth",
        pinpoint: schItem("7", "2"),
      },
    });
    expect(toPlainText(runs)).toBe(
      "Crimes Act 1914 (Cth) s 24A(g), as repealed by " +
        "Anti-Terrorism Act (No 2) 2005 (Cth) sch 7 item 2",
    );
  });

  it("fn 64 -- reverse direction 'repealing'", () => {
    const lead = leadStatute(
      {
        title: "Anti-Terrorism Act",
        number: "(No 2)",
        year: 2005,
        jurisdiction: "Cth",
      },
      schItem("7", "2"),
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "repealing",
      relatedAct: {
        title: "Crimes Act",
        year: 1914,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "24A(g)" },
      },
    });
    expect(toPlainText(runs)).toBe(
      "Anti-Terrorism Act (No 2) 2005 (Cth) sch 7 item 2, repealing " +
        "Crimes Act 1914 (Cth) s 24A(g)",
    );
  });

  it("fn 65 -- 'as inserted by' (title with its own parentheses)", () => {
    const lead = leadStatute(
      { title: "Crimes Act", year: 1958, jurisdiction: "Vic" },
      { type: "section", value: "3B" },
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "as inserted by",
      relatedAct: {
        title: "Crimes (Homicide) Act",
        year: 2005,
        jurisdiction: "Vic",
        pinpoint: { type: "section", value: "3" },
      },
    });
    expect(toPlainText(runs)).toBe(
      "Crimes Act 1958 (Vic) s 3B, as inserted by " +
        "Crimes (Homicide) Act 2005 (Vic) s 3",
    );
  });

  it("fn 66 -- Bill leads (not italicised); active 'repealing' an Act", () => {
    const lead = leadBill(
      {
        title:
          "Family Assistance and Other Legislation Amendment " +
          "(2008 Budget and Other Measures) Bill",
        year: 2009,
        jurisdiction: "Cth",
      },
      schItem("2", "1"),
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "repealing",
      relatedAct: {
        title: "Social Security (Administration) Act",
        year: 1999,
        jurisdiction: "Cth",
        pinpoint: { type: "section", value: "144(ka)" },
      },
    });
    expect(toPlainText(runs)).toBe(
      "Family Assistance and Other Legislation Amendment " +
        "(2008 Budget and Other Measures) Bill 2009 (Cth) sch 2 item 1, " +
        "repealing Social Security (Administration) Act 1999 (Cth) s 144(ka)",
    );
    // Lead Bill is roman; only the related Act title/year is italic (Rule 3.2).
    expect(italicText(runs)).toBe("Social Security (Administration) Act 1999");
  });

  it("fn 68 -- related instrument is a Bill: 'repealed by' (no 'as')", () => {
    const lead = leadStatute(
      { title: "Social Security (Administration) Act", year: 1999, jurisdiction: "Cth" },
      { type: "section", value: "144(ka)" },
    );
    const runs = formatLegislativeHistory(lead, {
      connector: "repealed by",
      relatedAct: {
        title:
          "Family Assistance and Other Legislation Amendment " +
          "(2008 Budget and Other Measures) Bill",
        year: 2009,
        jurisdiction: "Cth",
        isBill: true,
        pinpoint: schItem("2", "1"),
      },
    });
    expect(toPlainText(runs)).toBe(
      "Social Security (Administration) Act 1999 (Cth) s 144(ka), repealed by " +
        "Family Assistance and Other Legislation Amendment " +
        "(2008 Budget and Other Measures) Bill 2009 (Cth) sch 2 item 1",
    );
    // Lead Act is italic; related Bill is roman (Rule 3.2).
    expect(italicText(runs)).toBe("Social Security (Administration) Act 1999");
  });

  it("fn 67 -- 'as enacted' (solo, no related Act)", () => {
    const lead = leadStatute({
      title: "Restrictive Trade Practices Act",
      year: 1971,
      jurisdiction: "Cth",
    });
    const runs = formatLegislativeHistory(lead, { connector: "as enacted" });
    expect(toPlainText(runs)).toBe(
      "Restrictive Trade Practices Act 1971 (Cth), as enacted",
    );
  });
});

// =============================================================================
// DECISION-008 non-goals -- the formatter never synthesises a hybrid
// =============================================================================

describe("Rule 3.8 -- DECISION-008 non-goals (do no harm)", () => {
  const lead = (): FormattedRun[] =>
    leadStatute(
      { title: "Patents Act", year: 1990, jurisdiction: "Cth" },
      { type: "section", value: "7" },
    );

  it("emits no dangling connector when a related Act is required but absent", () => {
    const runs = formatLegislativeHistory(lead(), { connector: "as amended by" });
    expect(toPlainText(runs)).toBe("Patents Act 1990 (Cth) s 7");
  });

  it("'as at' without a date returns the lead unchanged", () => {
    const runs = formatLegislativeHistory(lead(), { connector: "as at" });
    expect(toPlainText(runs)).toBe("Patents Act 1990 (Cth) s 7");
  });

  it("'as enacted' ignores a stray related Act (solo connector)", () => {
    const runs = formatLegislativeHistory(lead(), {
      connector: "as enacted",
      relatedAct: { title: "Some Amendment Act", year: 2000, jurisdiction: "Cth" },
    });
    expect(toPlainText(runs)).toBe("Patents Act 1990 (Cth) s 7, as enacted");
  });
});
