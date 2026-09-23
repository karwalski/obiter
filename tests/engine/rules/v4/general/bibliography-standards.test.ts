/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-018 — Bibliography entries per standard.
 *
 * `formatBibliographyEntry(citation, config)` renders the entry in the
 * document's standard: OSCOLA 5 §1.6.2 (table of cases, names not italic,
 * EU cases `Name (Case C-…) EU:C:…`), §1.6.3 (table of legislation) and
 * §1.7 (bibliography, `Surname Initials`, no terminal full stop); NZLSG 3
 * Appendix 7 (footnote form minus pinpoints, names not inverted, full
 * stop). The no-config path is the AGLC4 Rule 1.13 entry, byte-identical
 * to before (tests/fixtures/standards/aglc4.ts is the full guard).
 *
 * The expected strings are the `bibliography-entry` rows of
 * tests/fixtures/standards/{oscola5,oscola4,nzlsg3}.ts whose delta STD-018
 * closed; rows still open there wait on STD-016/017/021.
 */

import type { Citation } from "../../../../../src/types/citation";
import { getStandardConfig } from "../../../../../src/engine/standards";
import {
  formatBibliographyEntry,
  generateBibliographyForStandard,
  generateNzlsgBibliography,
  generateOscolaBibliography,
} from "../../../../../src/engine/rules/v4/general/bibliography";
import { generateTableOfLegislation } from "../../../../../src/engine/rules/oscola/tables";
import {
  articleYoung,
  bookLuntz,
  cjeuHellenic,
  nzBrooker,
  treatyRomeStatute,
  ukCorr,
  ukHra,
} from "../../../../fixtures/standards/citations";

const OSCOLA5 = getStandardConfig("oscola5");
const OSCOLA4 = getStandardConfig("oscola4");
const NZLSG3 = getStandardConfig("nzlsg3");
const AGLC4 = getStandardConfig("aglc4");

function text(runs: Array<{ text: string }>): string {
  return runs.map((r) => r.text).join("");
}

const AGLC_LUNTZ =
  "Luntz, Harold, Assessment of Damages for Personal Injury and Death (Sydney, LexisNexis Butterworths, 4 ed, 2002)";

describe("STD-018: the AGLC path is unchanged", () => {
  test("no config renders the Rule 1.13 entry as before", () => {
    expect(text(formatBibliographyEntry(bookLuntz))).toBe(AGLC_LUNTZ);
    expect(text(formatBibliographyEntry(articleYoung))).toBe(
      "Young, Alison L, ‘In Defence of Due Deference’ (2009) 72 MLR 554"
    );
  });

  test("an AGLC config renders exactly what no config renders", () => {
    for (const citation of [bookLuntz, articleYoung, ukCorr, ukHra]) {
      expect(formatBibliographyEntry(citation, AGLC4)).toEqual(formatBibliographyEntry(citation));
    }
  });

  test("court mode still produces the List of Authorities whatever config is passed", () => {
    const withConfig = generateBibliographyForStandard(
      [ukCorr, ukHra],
      "aglc",
      "court",
      "simple",
      AGLC4
    );
    expect(withConfig).toEqual(
      generateBibliographyForStandard([ukCorr, ukHra], "aglc", "court", "simple")
    );
  });
});

describe("STD-018: OSCOLA entries (§1.6.2, §1.6.3, §1.7)", () => {
  test("§1.7: a journal article leads with surname then initials and has no closing full stop", () => {
    const runs = formatBibliographyEntry(articleYoung, OSCOLA5);
    expect(text(runs)).toBe("Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554");
    expect(runs[0].italic).toBeUndefined();
  });

  test("§1.7: co-authors are inverted too ('Hart HLA and Honoré AM')", () => {
    const causation: Citation = {
      ...bookLuntz,
      id: "hart-honore",
      shortTitle: undefined,
      data: {
        ...bookLuntz.data,
        authors: [
          { givenNames: "HLA", surname: "Hart" },
          { givenNames: "AM", surname: "Honoré" },
        ],
        title: "Causation in the Law",
      },
    };
    expect(text(formatBibliographyEntry(causation, OSCOLA5))).toMatch(
      /^Hart HLA and Honoré AM, Causation in the Law/
    );
  });

  test("§1.6.2: a case keeps the full footnote citation, names not italic, no short-title suffix", () => {
    const runs = formatBibliographyEntry(ukCorr, OSCOLA5);
    expect(text(runs)).toBe("Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884");
    expect(runs.every((r) => !r.italic)).toBe(true);
  });

  test("§1.6.2: no pinpoint in a table entry", () => {
    const pinpointed: Citation = {
      ...ukCorr,
      data: { ...ukCorr.data, pinpoint: { type: "paragraph", value: "42" } },
    };
    expect(text(formatBibliographyEntry(pinpointed, OSCOLA5))).toBe(
      text(formatBibliographyEntry(ukCorr, OSCOLA5))
    );
  });

  test("§1.6.2: an EU case is tabled by name, then the case number in round brackets, then the ECLI without its prefix", () => {
    expect(text(formatBibliographyEntry(cjeuHellenic, OSCOLA5))).toBe(
      "European Commission v Hellenic Republic (Case C-363/16) EU:C:2018:12"
    );
  });

  test("§1.6.3: legislation drops the AGLC short-title introduction", () => {
    expect(text(formatBibliographyEntry(ukHra, OSCOLA5))).toBe("Human Rights Act 1998");
  });

  test("OSCOLA 4 takes the same table and bibliography forms", () => {
    expect(text(formatBibliographyEntry(ukCorr, OSCOLA4))).toBe(
      "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884"
    );
    expect(text(formatBibliographyEntry(articleYoung, OSCOLA4))).toBe(
      "Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554"
    );
  });

  test("generateOscolaBibliography: cases by jurisdiction, legislation and treaties in the tables, secondary sources in the bibliography", () => {
    const sections = generateOscolaBibliography(
      [articleYoung, cjeuHellenic, treatyRomeStatute, ukHra, ukCorr],
      OSCOLA5
    );
    expect(sections.map((s) => s.heading)).toEqual([
      "UK Cases",
      "EU Cases",
      "Primary Legislation",
      "Treaties and International Instruments",
      "Bibliography",
    ]);
    const entries = (heading: string): string[] =>
      (sections.find((s) => s.heading === heading)?.entries ?? []).map(text);
    expect(entries("UK Cases")).toEqual([
      "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884",
    ]);
    expect(entries("EU Cases")).toEqual([
      "European Commission v Hellenic Republic (Case C-363/16) EU:C:2018:12",
    ]);
    expect(entries("Primary Legislation")).toEqual(["Human Rights Act 1998"]);
    expect(
      entries("Treaties and International Instruments").every((t) => t.startsWith("Rome Statute"))
    ).toBe(true);
    expect(entries("Bibliography")).toEqual([
      "Young AL, ‘In Defence of Due Deference’ (2009) 72 MLR 554",
    ]);
    // Tables are roman throughout (§1.6.2, §1.6.3).
    for (const heading of ["UK Cases", "EU Cases", "Primary Legislation"]) {
      const section = sections.find((s) => s.heading === heading);
      expect(section?.entries.flat().every((r) => !r.italic)).toBe(true);
    }
  });

  test("generateOscolaBibliography without a config keeps the AGLC entries", () => {
    const sections = generateOscolaBibliography([articleYoung]);
    expect(text(sections[0].entries[0])).toBe(
      "Young, Alison L, ‘In Defence of Due Deference’ (2009) 72 MLR 554"
    );
  });
});

describe("STD-018: NZLSG entries (Appendix 7)", () => {
  test("a journal article is the footnote form, names not inverted, ending with a full stop", () => {
    expect(text(formatBibliographyEntry(articleYoung, NZLSG3))).toBe(
      "Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554."
    );
  });

  test("a case is the footnote form with a full stop and no pinpoint", () => {
    const pinpointed: Citation = {
      ...nzBrooker,
      data: { ...nzBrooker.data, pinpoint: { type: "paragraph", value: "12" } },
    };
    expect(text(formatBibliographyEntry(pinpointed, NZLSG3))).toBe(
      "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91."
    );
  });

  test("legislation drops the AGLC short-title introduction and takes the full stop", () => {
    expect(text(formatBibliographyEntry(ukHra, NZLSG3))).toBe("Human Rights Act 1998 (UK).");
  });

  test("generateNzlsgBibliography threads the config; without it the entries stay AGLC", () => {
    const withConfig = generateNzlsgBibliography([articleYoung, nzBrooker], NZLSG3);
    expect(withConfig.map((s) => s.heading)).toEqual(["Cases", "Secondary Sources"]);
    expect(withConfig.flatMap((s) => s.entries.map(text)).every((t) => t.endsWith("."))).toBe(true);
    const without = generateNzlsgBibliography([articleYoung]);
    expect(text(without[0].entries[0])).toBe(
      "Young, Alison L, ‘In Defence of Due Deference’ (2009) 72 MLR 554"
    );
  });

  test("generateBibliographyForStandard passes the config to the NZLSG generator", () => {
    const sections = generateBibliographyForStandard(
      [articleYoung],
      "nzlsg",
      "academic",
      undefined,
      NZLSG3
    );
    expect(text(sections[0].entries[0])).toBe(
      "Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554."
    );
  });
});

describe("STD-018: tables.ts pre-rendered legislation entries", () => {
  test("an entry with runs prints them verbatim and sorts by title", () => {
    const sections = generateTableOfLegislation([
      {
        title: "Privacy Act 2020 (NZ)",
        category: "primary",
        runs: [{ text: "Privacy Act 2020 (NZ)" }],
      },
      {
        title: "Human Rights Act 1998",
        category: "primary",
        runs: [{ text: "Human Rights Act 1998" }],
      },
      { title: "Test Act", year: 2020, category: "primary" },
    ]);
    expect(sections[0].entries.map(text)).toEqual([
      "Human Rights Act 1998",
      "Privacy Act 2020 (NZ)",
      "Test Act 2020",
    ]);
  });
});
