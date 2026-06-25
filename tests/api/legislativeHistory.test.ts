/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Deterministic parsing of AGLC4 Rule 3.8 legislative-history hybrids:
 * connector detection, jurisdiction-anchoring, "(No N)" extraction, and
 * leading-"the" stripping (DECISION-008).
 */

import {
  parseStatuteRef,
  parseLegislativeHistory,
} from "../../src/api/citationParser";

describe("parseStatuteRef", () => {
  it("anchors jurisdiction after the year, keeping title-internal parentheses", () => {
    const ref = parseStatuteRef(
      "Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth)",
    );
    expect(ref).toEqual({
      title: "Intellectual Property Laws Amendment (Raising the Bar) Act",
      year: 2012,
      jurisdiction: "Cth",
    });
  });

  it("captures a trailing pinpoint", () => {
    expect(parseStatuteRef("Patents Act 1990 (Cth) s 7")).toEqual({
      title: "Patents Act",
      year: 1990,
      jurisdiction: "Cth",
      pinpoint: "s 7",
    });
  });

  it("lifts a trailing (No N) into number", () => {
    expect(
      parseStatuteRef("Anti-Terrorism Act (No 2) 2005 (Cth) sch 7 item 2"),
    ).toEqual({
      title: "Anti-Terrorism Act",
      year: 2005,
      jurisdiction: "Cth",
      number: "(No 2)",
      pinpoint: "sch 7 item 2",
    });
  });

  it("strips a leading article", () => {
    const ref = parseStatuteRef("the Copyright Amendment Act 2006 (Cth)");
    expect(ref?.title).toBe("Copyright Amendment Act");
  });

  it("returns null for a non-statute string", () => {
    expect(parseStatuteRef("not a statute reference")).toBeNull();
  });
});

describe("parseLegislativeHistory", () => {
  it("worked input 1 — primary lead, 'as amended by', strips 'the'", () => {
    const result = parseLegislativeHistory(
      "Patents Act 1990 (Cth) s 7, as amended by the Intellectual Property " +
        "Laws Amendment (Raising the Bar) Act 2012 (Cth)",
    );
    expect(result).not.toBeNull();
    expect(result!.connector).toBe("as amended by");
    expect(result!.lead).toEqual({
      title: "Patents Act",
      year: 1990,
      jurisdiction: "Cth",
      pinpoint: "s 7",
    });
    expect(result!.related).toEqual({
      title: "Intellectual Property Laws Amendment (Raising the Bar) Act",
      year: 2012,
      jurisdiction: "Cth",
    });
    // The article "the" is dropped (AGLC4 omits it).
    expect(result!.related!.title.startsWith("the")).toBe(false);
  });

  it("worked input 2 — amending lead, 'amending', range pinpoint, trailing period", () => {
    const result = parseLegislativeHistory(
      "Intellectual Property Laws Amendment (Raising the Bar) Act 2012 (Cth)," +
        " amending Patents Act 1990 (Cth) ss 7(2)–(4).",
    );
    expect(result).not.toBeNull();
    expect(result!.connector).toBe("amending");
    expect(result!.lead.title).toBe(
      "Intellectual Property Laws Amendment (Raising the Bar) Act",
    );
    expect(result!.lead.pinpoint).toBeUndefined();
    expect(result!.related).toEqual({
      title: "Patents Act",
      year: 1990,
      jurisdiction: "Cth",
      pinpoint: "ss 7(2)–(4)",
    });
  });

  it("distinguishes 'later amended by' from 'amended by'", () => {
    const result = parseLegislativeHistory(
      "Copyright Act 1968 (Cth) s 40(3), later amended by Copyright " +
        "Amendment Act 2006 (Cth) sch 6 item 11",
    );
    expect(result!.connector).toBe("later amended by");
    expect(result!.related!.title).toBe("Copyright Amendment Act");
    expect(result!.related!.pinpoint).toBe("sch 6 item 11");
  });

  it("'as repealed by' with a numbered related Act", () => {
    const result = parseLegislativeHistory(
      "Crimes Act 1914 (Cth) s 24A(g), as repealed by Anti-Terrorism Act " +
        "(No 2) 2005 (Cth) sch 7 item 2",
    );
    expect(result!.connector).toBe("as repealed by");
    expect(result!.related).toEqual({
      title: "Anti-Terrorism Act",
      year: 2005,
      jurisdiction: "Cth",
      number: "(No 2)",
      pinpoint: "sch 7 item 2",
    });
  });

  it("solo 'as enacted' — no related Act, no date", () => {
    const result = parseLegislativeHistory(
      "Restrictive Trade Practices Act 1971 (Cth), as enacted",
    );
    expect(result!.connector).toBe("as enacted");
    expect(result!.related).toBeUndefined();
    expect(result!.asAtDate).toBeUndefined();
  });

  it("solo 'as at' — captures the Full Date, no related Act", () => {
    const result = parseLegislativeHistory(
      "Anti-Discrimination Act 1977 (NSW) s 4(1), as at 28 June 1994",
    );
    expect(result!.connector).toBe("as at");
    expect(result!.lead.pinpoint).toBe("s 4(1)");
    expect(result!.asAtDate).toBe("28 June 1994");
    expect(result!.related).toBeUndefined();
  });

  it("returns null for a plain single-Act citation (no connector)", () => {
    expect(parseLegislativeHistory("Patents Act 1990 (Cth) s 7")).toBeNull();
  });
});
