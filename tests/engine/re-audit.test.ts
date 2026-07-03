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
} from "../../src/engine/resolver";
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
});

// =============================================================================
// Rule 9.5 — UN materials: short title and subsequent references
// =============================================================================

describe("Rule 9.5 — UN short titles and subsequent references", () => {
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
    expect(toText(runs)).toBe(
      "‘Legal Aspects of International Political Relations’ (n 49) 797"
    );
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
});

// =============================================================================
// Rule 11.3 — Arbitral/tribunal decisions: short title and subsequent refs
// =============================================================================

describe("Rule 11.3 — arbitral short titles and subsequent references", () => {
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
  test("supranational document subsequent reference per AGLC4 ex 55 (rule 14.6)", () => {
    // 55. Guidelines to a Fair Trial (n 52) 4. — title-led despite the
    // body author (African Union, African Commission on Human and
    // Peoples' Rights)
    const citation = makeCitation(
      "supranational.document",
      {
        body: "African Union, African Commission on Human and Peoples’ Rights",
        title: "Principles and Guidelines on the Right to a Fair Trial and Legal Assistance in Africa",
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
    expect(toText(runs)).toBe(
      "Google Spain SL v Agencia Española de Protección de Datos (n 9)"
    );
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
      title:
        "WTO服务市场开放研究及相关法律问题探析",
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
