/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * RE-AUDIT closure tests — resolver-routed short-title/subsequent-reference
 * rules for Part IV international materials (Rules 8.8, 9.5, 10.5, 11.3,
 * 12.4, 13.4, 14.6), plus the resolver-side halves of Rules 2.1.15 and
 * 16.4.2. Expected strings are the guide's own illustrations (example
 * numbers in test names); quotation marks follow the resolver's curly-quote
 * convention.
 */

import {
  formatShortReference,
  formatShortTitleIntroduction,
  resolveIbid,
  resolveSubsequentReference,
} from "../../src/engine/resolver";
import type { SubsequentReferenceContext } from "../../src/engine/resolver";
import type { Citation, Pinpoint, SourceData, SourceType } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

/** Helper: flatten FormattedRun[] to plain text. */
function toText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Helper: concatenated italic text. */
function italicText(runs: FormattedRun[]): string {
  return runs
    .filter((r) => r.italic)
    .map((r) => r.text)
    .join("");
}

/** Helper: build a minimal Citation. */
function makeCitation(sourceType: SourceType, data: SourceData, shortTitle?: string): Citation {
  return {
    id: "test",
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  };
}

/**
 * Helper: build an ibid-eligible resolution context (rule 1.4.3 — same
 * single source in the immediately preceding footnote).
 */
function ibidContext(
  firstFootnoteNumber: number,
  currentPinpoint?: Pinpoint,
  precedingPinpoint?: Pinpoint
): SubsequentReferenceContext {
  return {
    isFirstCitation: false,
    isSameAsPreceding: true,
    precedingFootnoteCitationCount: 1,
    precedingPinpoint,
    currentPinpoint,
    firstFootnoteNumber,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
}

// =============================================================================
// Rule 8.8 — Treaties: short title and subsequent references
// =============================================================================

describe("Rule 8.8 — treaty short titles and subsequent references", () => {
  test("introduces an italic treaty short title per AGLC4 ex 20 (rule 8.8)", () => {
    // 20. … ('Timor Gap Treaty') — short title italic, quotes/parens roman
    const runs = formatShortTitleIntroduction("Timor Gap Treaty", "treaty");
    expect(toText(runs)).toBe("(‘Timor Gap Treaty’)");
    expect(italicText(runs)).toBe("Timor Gap Treaty");
  });

  test("subsequent reference to a treaty portion per AGLC4 ex 25 (rule 8.8)", () => {
    // 25. Annex on Chemicals (n 23) pt B sch 2 para 2.
    const citation = makeCitation(
      "treaty",
      { title: "Convention on the Prohibition of Chemical Weapons" },
      "Annex on Chemicals"
    );
    const pinpoint: Pinpoint = {
      type: "part",
      value: "B",
      subPinpoint: {
        type: "schedule",
        value: "2",
        subPinpoint: { type: "paragraph", value: "para 2" },
      },
    };
    const runs = formatShortReference(citation, 23, pinpoint);
    expect(toText(runs)).toBe("Annex on Chemicals (n 23) pt B sch 2 para 2");
    expect(italicText(runs)).toBe("Annex on Chemicals");
  });

  test("subsequent reference to a treaty without a pinpoint (rules 8.8/1.4.1)", () => {
    const citation = makeCitation(
      "treaty",
      {
        title:
          "Treaty on the Zone of Cooperation in an Area between the Indonesian Province of East Timor and Northern Australia",
      },
      "Timor Gap Treaty"
    );
    const runs = formatShortReference(citation, 20);
    expect(toText(runs)).toBe("Timor Gap Treaty (n 20)");
    expect(italicText(runs)).toBe("Timor Gap Treaty");
  });

  test("immediately-following reference with the same pinpoint resolves to bare Ibid (rules 8.8/1.4.3)", () => {
    const citation = makeCitation("treaty", { title: "Timor Gap Treaty" }, "Timor Gap Treaty");
    const pinpoint: Pinpoint = { type: "article", value: "4(2)(a)" };
    const runs = resolveSubsequentReference(citation, ibidContext(20, pinpoint, pinpoint));
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid");
  });

  test("immediately-following reference with a new pinpoint resolves to Ibid plus pinpoint (rules 8.8/1.4.3)", () => {
    const citation = makeCitation("treaty", { title: "Timor Gap Treaty" }, "Timor Gap Treaty");
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(20, { type: "article", value: "4(2)(a)" }, { type: "article", value: "2" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid art 4(2)(a)");
  });

  test("dropped pinpoint blocks ibid and falls back to the short form (rules 8.8/1.4.3)", () => {
    // Rule 1.4.3: if the preceding footnote has a pinpoint but the new
    // footnote needs none, do not use ibid — use the rule 1.4.1 form.
    const citation = makeCitation("treaty", { title: "Timor Gap Treaty" }, "Timor Gap Treaty");
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(20, undefined, { type: "article", value: "4(2)(a)" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Timor Gap Treaty (n 20)");
    expect(italicText(runs as FormattedRun[])).toBe("Timor Gap Treaty");
  });
});

// =============================================================================
// Rule 9.5 — UN materials: short title and subsequent references
// =============================================================================

describe("Rule 9.5 — UN short titles and subsequent references", () => {
  test("introduces an italic UN document short title per AGLC4 ex 45 (rules 9.5/1.4.4)", () => {
    // 45. … ('Resolution 1325') — short title italic, quotes/parens roman
    const runs = formatShortTitleIntroduction("Resolution 1325", "un.document");
    expect(toText(runs)).toBe("(‘Resolution 1325’)");
    expect(italicText(runs)).toBe("Resolution 1325");
  });

  test("UN document subsequent reference without a pinpoint keeps the UN Doc number (rule 9.5 template)", () => {
    const citation = makeCitation(
      "un.document",
      { resolutionNumber: "SC Res 1325", documentNumber: "S/RES/1325" },
      "Resolution 1325"
    );
    const runs = formatShortReference(citation, 45);
    expect(toText(runs)).toBe("Resolution 1325, UN Doc S/RES/1325 (n 45)");
    expect(italicText(runs)).toBe("Resolution 1325");
  });

  test("immediately-following UN reference with a new pinpoint resolves to Ibid plus pinpoint (rules 9.5/1.4.3)", () => {
    const citation = makeCitation(
      "un.document",
      { resolutionNumber: "SC Res 1325", documentNumber: "S/RES/1325" },
      "Resolution 1325"
    );
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(
        45,
        { type: "paragraph", value: "para 7" },
        { type: "paragraph", value: "para 5" }
      )
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid para 7");
  });

  test("UN document subsequent reference includes the UN Doc number per AGLC4 ex 48 (rule 9.5)", () => {
    // 48. Resolution 1325, UN Doc S/RES/1325 (n 45) para 7.
    const citation = makeCitation(
      "un.document",
      { resolutionNumber: "SC Res 1325", documentNumber: "S/RES/1325" },
      "Resolution 1325"
    );
    const pinpoint: Pinpoint = { type: "paragraph", value: "para 7" };
    const runs = formatShortReference(citation, 45, pinpoint);
    expect(toText(runs)).toBe("Resolution 1325, UN Doc S/RES/1325 (n 45) para 7");
    // Only the short title is italic; 'UN Doc S/RES/1325' stays roman
    expect(italicText(runs)).toBe("Resolution 1325");
  });

  test("UN yearbook subsequent reference keeps the quoted title per AGLC4 ex 51 (rules 9.4/9.5)", () => {
    // 51. 'Legal Aspects of International Political Relations' (n 49) 797.
    const citation = makeCitation("un.yearbook", {
      title: "Legal Aspects of International Political Relations",
      yearbook: "Yearbook of the United Nations",
    });
    const pinpoint: Pinpoint = { type: "page", value: "797" };
    const runs = formatShortReference(citation, 49, pinpoint);
    expect(toText(runs)).toBe("‘Legal Aspects of International Political Relations’ (n 49) 797");
    expect(italicText(runs)).toBe("");
  });

  test("introduces an italic committee-decision short title per AGLC4 ex 38 (rules 9.3.1/9.5)", () => {
    // 38. … ('Madafferi v Australia') — rule 9.3.1: decisions of UN treaty
    // committees must always carry a short title (Complainant v State)
    const runs = formatShortTitleIntroduction("Madafferi v Australia", "un.communication");
    expect(toText(runs)).toBe("(‘Madafferi v Australia’)");
    expect(italicText(runs)).toBe("Madafferi v Australia");
  });

  test("committee-decision subsequent reference keeps the UN Doc number per AGLC4 ex 40 (rules 9.3.1/9.5)", () => {
    // 40. Madafferi v Australia, UN Doc CCPR/C/81/D/1011/2001 (n 38) 22 [10].
    const citation = makeCitation(
      "un.communication",
      {
        committee: "Human Rights Committee",
        communicationNumber: "1011/2001",
        documentNumber: "CCPR/C/81/D/1011/2001",
      },
      "Madafferi v Australia"
    );
    const pinpoint: Pinpoint = {
      type: "page",
      value: "22",
      subPinpoint: { type: "paragraph", value: "[10]" },
    };
    const runs = formatShortReference(citation, 38, pinpoint);
    expect(toText(runs)).toBe("Madafferi v Australia, UN Doc CCPR/C/81/D/1011/2001 (n 38) 22 [10]");
    // Only the short title is italic; the UN Doc number stays roman
    expect(italicText(runs)).toBe("Madafferi v Australia");
  });

  test("committee decision with complainant in the author field is still short-title-led (rules 9.3.1/9.5)", () => {
    // The form stores the applicant/parties in `author`; a rule 9.3.1
    // decision nevertheless leads with its mandatory short title (ex 40),
    // not the rule 1.4.1 author-surname form.
    const citation = makeCitation(
      "un.communication",
      {
        author: "Ángela Poma Poma v Peru",
        committee: "Human Rights Committee",
        docNumber: "CCPR/C/95/D/1457/2006",
      },
      "Poma Poma v Peru"
    );
    const runs = formatShortReference(citation, 12);
    expect(toText(runs)).toBe("Poma Poma v Peru, UN Doc CCPR/C/95/D/1457/2006 (n 12)");
    expect(italicText(runs)).toBe("Poma Poma v Peru");
  });

  test("authored party submission takes the rule 1.4.1 author form (rules 9.3.2/9.5)", () => {
    // Rule 9.5: individual communications (rule 9.3.2) follow rule 1.4.1 —
    // the body author leads (guide ex 41 author, rule 9.3.2)
    const citation = makeCitation("un.communication", {
      author: "Human Rights Law Resource Centre",
      documentTitle:
        "Individual Communication under the Optional Protocol to the International Covenant on Civil and Political Rights — Original Communication",
      documentType: "Communication",
      committee: "Human Rights Committee",
      caseName: "Nystrom v Australia",
      date: "4 April 2007",
    });
    const runs = formatShortReference(citation, 41);
    expect(toText(runs)).toBe("Human Rights Law Resource Centre (n 41)");
    expect(italicText(runs)).toBe("");
  });
});

// =============================================================================
// Rule 10.5 — ICJ/PCIJ: short title and subsequent references
// =============================================================================

describe("Rule 10.5 — ICJ/PCIJ short titles and subsequent references", () => {
  test("introduces an italic decision short title per AGLC4 ex 36 (rule 10.5)", () => {
    // 36. … ('Reparations')
    const runs = formatShortTitleIntroduction("Reparations", "icj.decision");
    expect(toText(runs)).toBe("(‘Reparations’)");
    expect(italicText(runs)).toBe("Reparations");
  });

  test("ICJ decision subsequent reference per AGLC4 ex 41 (rule 10.5)", () => {
    // 41. Reparations (n 36) 198 (Judge Hackworth). — judge parenthetical
    // is discursive footnote text outside the resolver's output
    const citation = makeCitation(
      "icj.decision",
      {
        caseName: "Reparation for Injuries Suffered in the Service of the United Nations",
        phase: "Advisory Opinion",
      },
      "Reparations"
    );
    const pinpoint: Pinpoint = { type: "page", value: "198" };
    const runs = formatShortReference(citation, 36, pinpoint);
    expect(toText(runs)).toBe("Reparations (n 36) 198");
    expect(italicText(runs)).toBe("Reparations");
  });

  test("ICJ pleading subsequent reference keeps the quoted document title per AGLC4 ex 42 (rule 10.5)", () => {
    // 42. 'Memorial of Nicaragua' (n 38) 17.
    const citation = makeCitation("icj.pleading", {
      documentTitle: "Memorial of Nicaragua",
      caseName: "Border and Transborder Armed Actions",
      parties: "Nicaragua v Costa Rica",
    });
    const pinpoint: Pinpoint = { type: "page", value: "17" };
    const runs = formatShortReference(citation, 38, pinpoint);
    expect(toText(runs)).toBe("‘Memorial of Nicaragua’ (n 38) 17");
    expect(italicText(runs)).toBe("");
  });

  test("ICJ decision subsequent reference without a pinpoint (rules 10.5/1.4.1)", () => {
    const citation = makeCitation(
      "icj.decision",
      {
        caseName: "Reparation for Injuries Suffered in the Service of the United Nations",
        phase: "Advisory Opinion",
      },
      "Reparations"
    );
    const runs = formatShortReference(citation, 36);
    expect(toText(runs)).toBe("Reparations (n 36)");
    expect(italicText(runs)).toBe("Reparations");
  });

  test("immediately-following ICJ reference with a new pinpoint resolves to Ibid plus pinpoint (rules 10.5/1.4.3)", () => {
    const citation = makeCitation("icj.decision", { caseName: "Reparations" }, "Reparations");
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(36, { type: "page", value: "198" }, { type: "page", value: "178" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid 198");
  });
});

// =============================================================================
// Rule 11.3 — Arbitral/tribunal decisions: short title and subsequent refs
// =============================================================================

describe("Rule 11.3 — arbitral short titles and subsequent references", () => {
  test("introduces an italic phase-bearing arbitral short title per AGLC4 ex 16 (rules 11.3/2.1.14)", () => {
    // 16. … ('Boundary Disputes (Decisions)') — the phase is built into the
    // short title to distinguish decisions between the same parties
    const runs = formatShortTitleIntroduction(
      "Boundary Disputes (Decisions)",
      "arbitral.state_state"
    );
    expect(toText(runs)).toBe("(‘Boundary Disputes (Decisions)’)");
    expect(italicText(runs)).toBe("Boundary Disputes (Decisions)");
  });

  test("immediately-following arbitral reference with a new pinpoint resolves to Ibid plus pinpoint (rules 11.3/1.4.3)", () => {
    const citation = makeCitation(
      "arbitral.state_state",
      { caseName: "Boundary Disputes", phase: "Decisions" },
      "Boundary Disputes (Decisions)"
    );
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(16, { type: "page", value: "15" }, { type: "page", value: "13" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid 15");
  });

  test("state–state arbitration subsequent reference per AGLC4 ex 19 (rule 11.3)", () => {
    // 19. Boundary Disputes (Decisions) (n 16) 15.
    const citation = makeCitation(
      "arbitral.state_state",
      {
        caseName:
          "Boundary Disputes between India and Pakistan Relating to the Interpretation of the Report of the Bengal Boundary Commission, 12 and 13 August 1947",
        parties: "India v Pakistan",
        phase: "Decisions",
      },
      "Boundary Disputes (Decisions)"
    );
    const pinpoint: Pinpoint = { type: "page", value: "15" };
    const runs = formatShortReference(citation, 16, pinpoint);
    expect(toText(runs)).toBe("Boundary Disputes (Decisions) (n 16) 15");
    expect(italicText(runs)).toBe("Boundary Disputes (Decisions)");
  });

  test("investor–state arbitration short title falls back to the case name (rules 11.3/2.1.14)", () => {
    const citation = makeCitation("arbitral.individual_state", {
      caseName: "Enron Corporation v Argentina (Jurisdiction)",
    });
    const runs = formatShortReference(citation, 7);
    expect(toText(runs)).toBe("Enron Corporation v Argentina (Jurisdiction) (n 7)");
    expect(italicText(runs)).toBe("Enron Corporation v Argentina (Jurisdiction)");
  });
});

// =============================================================================
// Rule 12.4 — International criminal tribunals: short title and subsequent refs
// =============================================================================

describe("Rule 12.4 — criminal tribunal short titles and subsequent references", () => {
  test("introduces an italic tribunal-rules short title per AGLC4 ex 26 (rules 12.4/1.4.4)", () => {
    // 26. … ('ICTY Rules')
    const runs = formatShortTitleIntroduction("ICTY Rules", "icc_tribunal.case");
    expect(toText(runs)).toBe("(‘ICTY Rules’)");
    expect(italicText(runs)).toBe("ICTY Rules");
  });

  test("introduces an italic phase-bearing decision short title per AGLC4 ex 29 (rules 12.4/2.1.14)", () => {
    // 29. … ('Serushago Appeal') — trial/appellate status built into the
    // short title to distinguish decisions between the same parties
    const runs = formatShortTitleIntroduction("Serushago Appeal", "icc_tribunal.case");
    expect(toText(runs)).toBe("(‘Serushago Appeal’)");
    expect(italicText(runs)).toBe("Serushago Appeal");
  });

  test("tribunal decision subsequent reference without a pinpoint (rules 12.4/1.4.1)", () => {
    const citation = makeCitation(
      "icc_tribunal.case",
      { caseName: "Serushago v Prosecutor", phase: "Reasons for Judgment" },
      "Serushago Appeal"
    );
    const runs = formatShortReference(citation, 29);
    expect(toText(runs)).toBe("Serushago Appeal (n 29)");
    expect(italicText(runs)).toBe("Serushago Appeal");
  });

  test("tribunal rules subsequent reference per AGLC4 ex 28 (rule 12.4)", () => {
    // 28. ICTY Rules (n 26) r 3(F).
    const citation = makeCitation(
      "icc_tribunal.case",
      {
        title: "Rules of Procedure and Evidence",
        documentNumber: "IT/32/Rev.44",
      },
      "ICTY Rules"
    );
    const pinpoint: Pinpoint = { type: "rule", value: "3(F)" };
    const runs = formatShortReference(citation, 26, pinpoint);
    expect(toText(runs)).toBe("ICTY Rules (n 26) r 3(F)");
    expect(italicText(runs)).toBe("ICTY Rules");
  });

  test("ibid with new paragraph pinpoint per AGLC4 ex 30 (rules 12.4/1.4.3)", () => {
    // 30. Ibid [21]–[22].
    const runs = resolveIbid({ type: "paragraph", value: "[21]–[22]" }, undefined);
    expect(toText(runs)).toBe("Ibid [21]–[22]");
  });

  test("tribunal decision subsequent reference per AGLC4 ex 32 (rule 12.4)", () => {
    // 32. Serushago Appeal (n 29) [27].
    const citation = makeCitation(
      "icc_tribunal.case",
      { caseName: "Serushago v Prosecutor", phase: "Reasons for Judgment" },
      "Serushago Appeal"
    );
    const pinpoint: Pinpoint = { type: "paragraph", value: "[27]" };
    const runs = formatShortReference(citation, 29, pinpoint);
    expect(toText(runs)).toBe("Serushago Appeal (n 29) [27]");
    expect(italicText(runs)).toBe("Serushago Appeal");
  });
});

// =============================================================================
// Rule 13.4 — International economic materials: short title and subsequent refs
// =============================================================================

describe("Rule 13.4 — WTO/GATT short titles and subsequent references", () => {
  test("introduces an italic annexed-agreement short title per AGLC4 ex 23 (rules 13.1.1/13.4)", () => {
    // 23. … ('Agreement on Technical Barriers to Trade') ('TBT Agreement')
    // — annexed WTO agreements are cited as treaty annexes (rule 13.1.1)
    const runs = formatShortTitleIntroduction("TBT Agreement", "treaty");
    expect(toText(runs)).toBe("(‘TBT Agreement’)");
    expect(italicText(runs)).toBe("TBT Agreement");
  });

  test("introduces an italic WTO report short title per AGLC4 ex 30 (rules 13.4/1.4.4)", () => {
    // 30. … ('US — Zeroing (Article 21.5 — Japan)')
    const runs = formatShortTitleIntroduction(
      "US — Zeroing (Article 21.5 — Japan)",
      "wto.decision"
    );
    expect(toText(runs)).toBe("(‘US — Zeroing (Article 21.5 — Japan)’)");
    expect(italicText(runs)).toBe("US — Zeroing (Article 21.5 — Japan)");
  });

  test("immediately-following WTO reference with a new pinpoint resolves to Ibid plus pinpoint (rules 13.4/1.4.3)", () => {
    const citation = makeCitation(
      "wto.document",
      { title: "Doha Work Programme", documentNumber: "WT/MIN(05)/DEC" },
      "Doha Work Programme"
    );
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(12, { type: "paragraph", value: "[162]" }, { type: "paragraph", value: "[45]" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid [162]");
  });

  test("annexed WTO agreement cited as a treaty per AGLC4 ex 25 (rules 13.1.1/13.4)", () => {
    // 25. TBT Agreement (n 23) art 2.1.
    const citation = makeCitation(
      "treaty",
      { title: "Marrakesh Agreement Establishing the World Trade Organization" },
      "TBT Agreement"
    );
    const pinpoint: Pinpoint = { type: "article", value: "2.1" };
    const runs = formatShortReference(citation, 23, pinpoint);
    expect(toText(runs)).toBe("TBT Agreement (n 23) art 2.1");
    expect(italicText(runs)).toBe("TBT Agreement");
  });

  test("WTO decision subsequent reference keeps the reporting body and WTO Doc number per AGLC4 ex 33 (rule 13.4)", () => {
    // 33. Appellate Body Report, US — Zeroing (Article 21.5 — Japan),
    //     WTO Doc WT/DS322/AB/RW (n 30) [162].
    const citation = makeCitation(
      "wto.decision",
      {
        documentDescription: "Appellate Body Report",
        title:
          "United States — Measures Relating to Zeroing and Sunset Reviews — Recourse to Article 21.5 of the DSU by Japan",
        documentNumber: "WT/DS322/AB/RW",
      },
      "US — Zeroing (Article 21.5 — Japan)"
    );
    const pinpoint: Pinpoint = { type: "paragraph", value: "[162]" };
    const runs = formatShortReference(citation, 30, pinpoint);
    expect(toText(runs)).toBe(
      "Appellate Body Report, US — Zeroing (Article 21.5 — Japan), WTO Doc WT/DS322/AB/RW (n 30) [162]"
    );
    // Description and document number roman; only the short title italic
    expect(italicText(runs)).toBe("US — Zeroing (Article 21.5 — Japan)");
  });

  test("WTO document subsequent reference includes the WTO Doc number (rule 13.4 template)", () => {
    const citation = makeCitation(
      "wto.document",
      { title: "Doha Work Programme", documentNumber: "WT/MIN(05)/DEC" },
      "Doha Work Programme"
    );
    const runs = formatShortReference(citation, 12);
    expect(toText(runs)).toBe("Doha Work Programme, WTO Doc WT/MIN(05)/DEC (n 12)");
    expect(italicText(runs)).toBe("Doha Work Programme");
  });

  test("GATT panel report subsequent reference includes the document description (rule 13.4)", () => {
    const citation = makeCitation(
      "gatt.document",
      {
        documentDescription: "GATT Panel Report",
        title: "United States — Restrictions on Imports of Tuna",
        documentNumber: "DS21/R",
      },
      "US — Tuna"
    );
    const runs = formatShortReference(citation, 14);
    expect(toText(runs)).toBe("GATT Panel Report, US — Tuna, GATT Doc DS21/R (n 14)");
    expect(italicText(runs)).toBe("US — Tuna");
  });
});

// =============================================================================
// Rule 14.6 — Supranational materials: short title and subsequent references
// =============================================================================

describe("Rule 14.6 — supranational short titles and subsequent references", () => {
  test("introduces an italic supranational document short title per AGLC4 ex 52 (rules 14.6/1.4.4)", () => {
    // 52. … ('Guidelines to a Fair Trial')
    const runs = formatShortTitleIntroduction(
      "Guidelines to a Fair Trial",
      "supranational.document"
    );
    expect(toText(runs)).toBe("(‘Guidelines to a Fair Trial’)");
    expect(italicText(runs)).toBe("Guidelines to a Fair Trial");
  });

  test("introduces an italic ECtHR decision short title per AGLC4 ex 56 (rules 14.6/2.1.14)", () => {
    // 56. … ('El Boujaïdi')
    const runs = formatShortTitleIntroduction("El Boujaïdi", "echr.decision");
    expect(toText(runs)).toBe("(‘El Boujaïdi’)");
    expect(italicText(runs)).toBe("El Boujaïdi");
  });

  test("ECtHR decision subsequent reference without a pinpoint (rules 14.6/1.4.1)", () => {
    const citation = makeCitation(
      "echr.decision",
      { caseName: "El Boujaïdi v France" },
      "El Boujaïdi"
    );
    const runs = formatShortReference(citation, 56);
    expect(toText(runs)).toBe("El Boujaïdi (n 56)");
    expect(italicText(runs)).toBe("El Boujaïdi");
  });

  test("immediately-following supranational reference with a new pinpoint resolves to Ibid plus pinpoint (rules 14.6/1.4.3)", () => {
    const citation = makeCitation(
      "echr.decision",
      { caseName: "El Boujaïdi v France" },
      "El Boujaïdi"
    );
    const runs = resolveSubsequentReference(
      citation,
      ibidContext(56, { type: "page", value: "1992–3" }, { type: "page", value: "1994" })
    );
    expect(runs).not.toBeNull();
    expect(toText(runs as FormattedRun[])).toBe("Ibid 1992–3");
  });

  test("supranational document subsequent reference per AGLC4 ex 55 (rule 14.6)", () => {
    // 55. Guidelines to a Fair Trial (n 52) 4. — title-led despite the
    // body author (African Union, African Commission on Human and
    // Peoples' Rights)
    const citation = makeCitation(
      "supranational.document",
      {
        body: "African Union, African Commission on Human and Peoples’ Rights",
        title:
          "Principles and Guidelines on the Right to a Fair Trial and Legal Assistance in Africa",
        documentNumber: "DOC/OS(XXX)247",
      },
      "Guidelines to a Fair Trial"
    );
    const pinpoint: Pinpoint = { type: "page", value: "4" };
    const runs = formatShortReference(citation, 52, pinpoint);
    expect(toText(runs)).toBe("Guidelines to a Fair Trial (n 52) 4");
    expect(italicText(runs)).toBe("Guidelines to a Fair Trial");
  });

  test("ECtHR decision subsequent reference per AGLC4 ex 58 (rule 14.6)", () => {
    // 58. El Boujaïdi (n 56) 1992–3.
    const citation = makeCitation(
      "echr.decision",
      { caseName: "El Boujaïdi v France" },
      "El Boujaïdi"
    );
    const pinpoint: Pinpoint = { type: "page", value: "1992–3" };
    const runs = formatShortReference(citation, 56, pinpoint);
    expect(toText(runs)).toBe("El Boujaïdi (n 56) 1992–3");
    expect(italicText(runs)).toBe("El Boujaïdi");
  });

  test("EU court decision short title falls back to the case name (rules 14.6/2.1.14)", () => {
    const citation = makeCitation("eu.court", {
      caseName: "Google Spain SL v Agencia Española de Protección de Datos",
    });
    const runs = formatShortReference(citation, 9);
    expect(toText(runs)).toBe("Google Spain SL v Agencia Española de Protección de Datos (n 9)");
    expect(italicText(runs)).toBe("Google Spain SL v Agencia Española de Protección de Datos");
  });
});

// =============================================================================
// Rule 2.1.15 — Omitting the case name (subsequent-reference exception)
// =============================================================================

describe("Rule 2.1.15 — case name always retained in subsequent references", () => {
  test("subsequent reference keeps the short title even when the name is in text per AGLC4 ex 51 (rule 2.1.15)", () => {
    // 51. Tasmanian Dam Case (n 49) 260. — the name may never be omitted
    // from a subsequent reference, even where it appears in the sentence
    const citation = makeCitation(
      "case.reported",
      { caseName: "Commonwealth v Tasmania" },
      "Tasmanian Dam Case"
    );
    const pinpoint: Pinpoint = { type: "page", value: "260" };
    const runs = formatShortReference(citation, 49, pinpoint);
    expect(toText(runs)).toBe("Tasmanian Dam Case (n 49) 260");
    expect(italicText(runs)).toBe("Tasmanian Dam Case");
  });
});

// =============================================================================
// Rule 16.4.2 — Chinese-script authors keep the full name in subsequent refs
// =============================================================================

describe("Rule 16.4.2 — full author name in subsequent references to Chinese sources", () => {
  test("structured Chinese-character author keeps the full name (rule 16.4.2)", () => {
    // Per the AGLC4 ex 16 author 蔡永彤 [Cai Yongtong] (rule 16.4.1):
    // subsequent references never reduce a Chinese-character name to a
    // surname; characters and pinyin ride along in full.
    const citation = makeCitation("journal.article", {
      authors: [{ surname: "蔡", givenNames: "永彤 [Cai Yongtong]" }],
      title: "WTO服务市场开放研究及相关法律问题探析",
    });
    const pinpoint: Pinpoint = { type: "page", value: "63" };
    const runs = formatShortReference(citation, 12, pinpoint);
    expect(toText(runs)).toBe("蔡永彤 [Cai Yongtong] (n 12) 63");
  });

  test("Western structured author still reduces to the surname (rule 1.4.1)", () => {
    const citation = makeCitation("journal.article", {
      authors: [{ givenNames: "Kim", surname: "Rubenstein" }],
      title: "Meanings of Membership",
    });
    const runs = formatShortReference(citation, 58);
    expect(toText(runs)).toBe("Rubenstein (n 58)");
  });
});
