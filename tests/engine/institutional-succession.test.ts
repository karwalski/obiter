/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * A5-DATA-1 / A5-DATA-2 — Institutional-succession data and NZ dual-year
 * reference metadata (AGLC5 feedback-package Parts B.2 and B.5).
 *
 * These are official-record factual assertions (court/tribunal identifiers
 * with their enabling Acts and machinery-of-government dates), pinned so that
 * a future edit to the data forces a visible diff. The NZ dual-year table is
 * reference metadata only; the tests here also assert the validator's
 * behaviour is unchanged (AGLC4 rule 21.1.3 years still govern).
 */

import {
  COURT_IDENTIFIERS,
  getByCode,
} from "../../src/engine/data/court-identifiers";
import type { CourtIdentifier } from "../../src/engine/data/court-identifiers";
import {
  NZ_NEUTRAL_CITATION_YEARS,
  getNZNeutralCitationYears,
} from "../../src/engine/data/nz-neutral-citation-years";
import { getNZCourtByCode } from "../../src/engine/data/nz-court-identifiers";
import { checkMncYearValidity } from "../../src/engine/validator";
import type { Citation } from "../../src/types/citation";

function makeMnc(overrides: {
  court: string;
  year: number;
  caseNumber?: number;
}): Citation {
  return {
    id: "test-mnc",
    aglcVersion: "4",
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    sourceType: "case.unreported.mnc",
    data: { party1: "A", party2: "B", ...overrides },
  } as Citation;
}

describe("A5-DATA-1 — post-2018 institutional succession (feedback-package B.2)", () => {
  it("has globally unique court-identifier codes", () => {
    const codes = COURT_IDENTIFIERS.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  describe("FCFCOA — commenced 1 Sep 2021, Act No 12 of 2021", () => {
    const divisions = ["FedCFamC1A", "FedCFamC1F", "FedCFamC2F", "FedCFamC2G"];

    it.each(divisions)(
      "%s exists, commences 2021-09-01, and cites the FCFCOA Act",
      (code) => {
        const ci = getByCode(code) as CourtIdentifier;
        expect(ci).toBeDefined();
        expect(ci.commencedOn).toBe("2021-09-01");
        expect(ci.mncFrom).toBe(2021);
        expect(ci.enablingAct).toBe(
          "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021"
        );
      }
    );

    it("Division 1 continues the Family Court, Division 2 the Federal Circuit Court", () => {
      expect(getByCode("FedCFamC1F")!.succeeds).toBe("FamCA");
      expect(getByCode("FedCFamC1A")!.succeeds).toBe("FamCAFC");
      expect(getByCode("FedCFamC2F")!.succeeds).toBe("FCCA");
      expect(getByCode("FedCFamC2G")!.succeeds).toBe("FCCA");
    });

    it("keeps legacy FamCA/FCCA for pre-2021 decisions, end-dated 2021-09-01", () => {
      const famca = getByCode("FamCA")!;
      expect(famca.mncFrom).toBe(1998);
      expect(famca.endedOn).toBe("2021-09-01");
      expect(famca.succeededBy).toBe("FedCFamC1F");

      const fcca = getByCode("FCCA")!;
      expect(fcca.endedOn).toBe("2021-09-01");
      expect(fcca.succeededBy).toBe("FedCFamC2G");
    });
  });

  describe("ART — replaced AAT on 14 Oct 2024, Act No 40 of 2024", () => {
    it("adds the ART/ARTA identifier keyed to 14 Oct 2024", () => {
      const arta = getByCode("ARTA")!;
      expect(arta).toBeDefined();
      expect(arta.commencedOn).toBe("2024-10-14");
      expect(arta.mncFrom).toBe(2024);
      expect(arta.succeeds).toBe("AATA");
      expect(arta.enablingAct).toBe(
        "Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024"
      );
      expect(getByCode("ART")).toBeDefined();
    });

    it("keys the AAT→ART legacy transition on 14 Oct 2024 (AATA persists for earlier decisions)", () => {
      const aata = getByCode("AATA")!;
      expect(aata).toBeDefined();
      expect(aata.endedOn).toBe("2024-10-14");
      expect(aata.succeededBy).toBe("ARTA");
    });
  });

  it("PIC (NSW) — commenced 1 Mar 2021, Personal Injury Commission Act 2020 (NSW) No 18 of 2020", () => {
    const pic = getByCode("NSWPIC")!;
    expect(pic).toBeDefined();
    expect(pic.jurisdiction).toBe("NSW");
    expect(pic.commencedOn).toBe("2021-03-01");
    expect(pic.enablingAct).toBe(
      "Personal Injury Commission Act 2020 (NSW) No 18 of 2020"
    );
  });

  it("TASCAT — commenced 5 Nov 2021, Tasmanian Civil and Administrative Tribunal Act 2020 (Tas) No 24 of 2020", () => {
    const tascat = getByCode("TASCAT")!;
    expect(tascat.commencedOn).toBe("2021-11-05");
    expect(tascat.mncFrom).toBe(2021);
    expect(tascat.enablingAct).toBe(
      "Tasmanian Civil and Administrative Tribunal Act 2020 (Tas) No 24 of 2020"
    );
  });

  it("VOCAT (Vic) — authorship end-dated 18 Nov 2024, Act No 21 of 2022", () => {
    const vocat = getByCode("VOCAT")!;
    expect(vocat).toBeDefined();
    expect(vocat.jurisdiction).toBe("VIC");
    expect(vocat.endedOn).toBe("2024-11-18");
    expect(vocat.enablingAct).toBe(
      "Victims of Crime (Financial Assistance Scheme) Act 2022 (Vic) No 21 of 2022"
    );
  });
});

describe("A5-DATA-2 — NZ dual-year reference metadata (feedback-package B.5)", () => {
  const expected = [
    { code: "NZSC", year: 2005 },
    { code: "NZCA", year: 2007 },
    { code: "NZHC", year: 2012 },
    { code: "NZEmpC", year: 2010 },
    { code: "NZEnvC", year: 2010 },
    { code: "NZFC", year: 2012 },
  ];

  it("records all six courts with aligned AGLC4 and NZLII years", () => {
    expect(NZ_NEUTRAL_CITATION_YEARS).toHaveLength(6);
    for (const { code, year } of expected) {
      const ref = getNZNeutralCitationYears(code)!;
      expect(ref).toBeDefined();
      expect(ref.aglc4Year).toBe(year);
      // B.5: for these six the two years happen to align.
      expect(ref.nzliiYear).toBe(year);
    }
  });

  it("keeps the AGLC4 rule 21.1.3 year as the authority (matches nz-court-identifiers)", () => {
    for (const { code, year } of expected) {
      expect(getNZCourtByCode(code)!.neutralCitationFrom).toBe(year);
      expect(getNZNeutralCitationYears(code)!.aglc4Year).toBe(year);
    }
  });

  it("does NOT change validator behaviour — AGLC4 years still govern MNC-year checks", () => {
    // The AU validator path is unchanged: a pre-mncFrom MNC is still flagged
    // and an at-or-after one is still accepted, regardless of the new NZ
    // reference table (which is not wired into validation at all).
    const tooEarly = makeMnc({ court: "TASCAT", year: 2020, caseNumber: 1 });
    expect(checkMncYearValidity([tooEarly])).toHaveLength(1);

    const onTime = makeMnc({ court: "TASCAT", year: 2021, caseNumber: 1 });
    expect(checkMncYearValidity([onTime])).toEqual([]);
  });
});
