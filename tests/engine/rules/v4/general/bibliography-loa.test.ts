/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for LOA-002, LOA-003, LOA-004, LOA-005 — List of Authorities generation.
 */

import { Citation, SourceType } from "../../../../../src/types/citation";
import {
  generatePartABListOfAuthorities,
  generateJBA,
  generateLoaWithOptions,
  generateListOfAuthorities,
  LoaGenerationOptions,
  JbaCaseDetails,
} from "../../../../../src/engine/rules/v4/general/bibliography";

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeCitation(
  overrides: Partial<Citation> & { id: string; sourceType: SourceType },
): Citation {
  return {
    aglcVersion: "4",
    data: {},
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const papeCase = makeCitation({
  id: "case-pape",
  sourceType: "case.reported",
  data: {
    title: "Pape v Commissioner of Taxation",
    party1: "Pape",
    party2: "Commissioner of Taxation",
    year: 2009,
    volume: 238,
    reportSeries: "CLR",
    startingPage: 1,
    mnc: "[2009] HCA 23",
  },
});

const roachCase = makeCitation({
  id: "case-roach",
  sourceType: "case.reported",
  data: {
    title: "Roach v Electoral Commissioner",
    party1: "Roach",
    party2: "Electoral Commissioner",
    year: 2007,
    volume: 233,
    reportSeries: "CLR",
    startingPage: 162,
    mnc: "[2007] HCA 43",
  },
});

const mcdonaldCase = makeCitation({
  id: "case-mcdonald",
  sourceType: "case.unreported.mnc",
  data: {
    title: "McDonald v Director-General of Social Security",
    party1: "McDonald",
    party2: "Director-General of Social Security",
    mnc: "[1984] FCA 57",
  },
});

const ccaAct = makeCitation({
  id: "leg-cca",
  sourceType: "legislation.statute",
  data: {
    title: "Competition and Consumer Act 2010",
    year: 2010,
    jurisdiction: "Cth",
  },
});

const constitutionAct = makeCitation({
  id: "leg-constitution",
  sourceType: "legislation.constitution",
  data: {
    title: "Australian Constitution",
  },
});

const frenchArticle = makeCitation({
  id: "sec-french",
  sourceType: "journal.article",
  data: {
    title: "The Rule of Law as a Constitutional Principle",
    authors: [{ givenNames: "Robert", surname: "French" }],
    year: 2010,
    volume: 21,
    journalName: "Public Law Review",
    startingPage: 101,
  },
});

const gleesonBook = makeCitation({
  id: "sec-gleeson",
  sourceType: "book",
  data: {
    title: "The Rule of Law and the Constitution",
    authors: [{ givenNames: "Murray", surname: "Gleeson" }],
    year: 2000,
  },
});

// ─── LOA-002: Part A / Part B Split ─────────────────────────────────────────

describe("LOA-002: generatePartABListOfAuthorities", () => {
  it("splits citations into Part A and Part B based on loaPart field", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      { ...roachCase, loaPart: "B" },
      { ...ccaAct, loaPart: "A" },
      constitutionAct, // defaults to Part B
    ];

    const result = generatePartABListOfAuthorities(citations);

    // Part A should have Pape (case) and CCA (legislation).
    expect(result.partA).toHaveLength(2);
    expect(result.partA[0].heading).toBe("Cases");
    expect(result.partA[0].entries).toHaveLength(1);
    expect(result.partA[1].heading).toBe("Legislation");
    expect(result.partA[1].entries).toHaveLength(1);

    // Part B should have Roach (case) and Constitution (legislation).
    expect(result.partB).toHaveLength(2);
    expect(result.partB[0].heading).toBe("Cases");
    expect(result.partB[0].entries).toHaveLength(1);
    expect(result.partB[1].heading).toBe("Legislation");
    expect(result.partB[1].entries).toHaveLength(1);
  });

  it("defaults citations without loaPart to Part B", () => {
    const citations: Citation[] = [papeCase, roachCase, ccaAct];

    const result = generatePartABListOfAuthorities(citations);

    expect(result.partA).toHaveLength(0);
    expect(result.partB.length).toBeGreaterThan(0);
  });

  it("warns when Part A is empty", () => {
    const citations: Citation[] = [papeCase, ccaAct];

    const result = generatePartABListOfAuthorities(citations);

    const emptyWarning = result.warnings.find(
      (w) => w.code === "LOA_PART_A_EMPTY",
    );
    expect(emptyWarning).toBeDefined();
    expect(emptyWarning!.level).toBe("warning");
  });

  it("does not warn when Part A has entries", () => {
    const citations: Citation[] = [{ ...papeCase, loaPart: "A" }];

    const result = generatePartABListOfAuthorities(citations);

    const emptyWarning = result.warnings.find(
      (w) => w.code === "LOA_PART_A_EMPTY",
    );
    expect(emptyWarning).toBeUndefined();
  });

  it("warns when total authorities exceed 30", () => {
    // Create 31 unique citations.
    const manyCitations: Citation[] = [];
    for (let i = 0; i < 31; i++) {
      manyCitations.push(
        makeCitation({
          id: `case-${i}`,
          sourceType: "case.reported",
          loaPart: i < 5 ? "A" : "B",
          data: {
            title: `Case ${String(i).padStart(2, "0")}`,
            party1: `Party${String(i).padStart(2, "0")}`,
            year: 2020,
          },
        }),
      );
    }

    const result = generatePartABListOfAuthorities(manyCitations);

    const countWarning = result.warnings.find(
      (w) => w.code === "LOA_AUTHORITY_COUNT_HIGH",
    );
    expect(countWarning).toBeDefined();
    expect(countWarning!.message).toContain("31");
  });

  it("does not warn when total is 30 or fewer", () => {
    const result = generatePartABListOfAuthorities([
      { ...papeCase, loaPart: "A" },
      roachCase,
      ccaAct,
    ]);

    const countWarning = result.warnings.find(
      (w) => w.code === "LOA_AUTHORITY_COUNT_HIGH",
    );
    expect(countWarning).toBeUndefined();
  });

  it("excludes secondary sources from Part A", () => {
    const citations: Citation[] = [
      { ...frenchArticle, loaPart: "A" },
      { ...papeCase, loaPart: "A" },
    ];

    const result = generatePartABListOfAuthorities(citations, false);

    // Part A should only have the case, not the article.
    expect(result.partA).toHaveLength(1);
    expect(result.partA[0].heading).toBe("Cases");
  });

  it("includes secondary sources in Part B when includeSecondary is true", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      frenchArticle,
      gleesonBook,
    ];

    const result = generatePartABListOfAuthorities(citations, true);

    const secondarySection = result.partB.find(
      (s) => s.heading === "Secondary Sources",
    );
    expect(secondarySection).toBeDefined();
    expect(secondarySection!.entries).toHaveLength(2);
  });

  it("excludes secondary sources from Part B by default", () => {
    const citations: Citation[] = [papeCase, frenchArticle];

    const result = generatePartABListOfAuthorities(citations, false);

    const secondarySection = result.partB.find(
      (s) => s.heading === "Secondary Sources",
    );
    expect(secondarySection).toBeUndefined();
  });

  it("sorts cases alphabetically by first party name", () => {
    const citations: Citation[] = [
      { ...roachCase, loaPart: "A" },
      { ...papeCase, loaPart: "A" },
      { ...mcdonaldCase, loaPart: "A" },
    ];

    const result = generatePartABListOfAuthorities(citations);
    const casesSection = result.partA.find((s) => s.heading === "Cases");
    expect(casesSection).toBeDefined();

    const entryTexts = casesSection!.entries.map((e) =>
      e.map((r) => r.text).join(""),
    );

    // McDonald < Pape < Roach alphabetically.
    expect(entryTexts[0]).toContain("McDonald");
    expect(entryTexts[1]).toContain("Pape");
    expect(entryTexts[2]).toContain("Roach");
  });

  it("deduplicates citations by ID", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      { ...papeCase, loaPart: "A" }, // duplicate
    ];

    const result = generatePartABListOfAuthorities(citations);
    const casesSection = result.partA.find((s) => s.heading === "Cases");
    expect(casesSection).toBeDefined();
    expect(casesSection!.entries).toHaveLength(1);
  });
});

// ─── LOA-003: HCA Joint Book of Authorities ─────────────────────────────────

describe("LOA-003: generateJBA", () => {
  const caseDetails: JbaCaseDetails = {
    caseName: "Smith v Jones",
    fileNumber: "S123/2026",
    hearingDate: "2026-06-15",
  };

  it("generates a title page with case name and file number", () => {
    const citations: Citation[] = [{ ...papeCase, loaPart: "A" }];

    const result = generateJBA(citations, caseDetails);

    expect(result.titlePage.heading).toBe("Joint Book of Authorities");
    const titleTexts = result.titlePage.entries.map((e) =>
      e.map((r) => r.text).join(""),
    );
    expect(titleTexts).toContain("Joint Book of Authorities");
    expect(titleTexts).toContain("Smith v Jones");
    expect(titleTexts).toContain("HCA File No: S123/2026");
  });

  it("generates a certificate placeholder section", () => {
    const citations: Citation[] = [{ ...papeCase, loaPart: "A" }];

    const result = generateJBA(citations, caseDetails);

    expect(result.certificatePlaceholder.heading).toBe("Certificate");
    const certTexts = result.certificatePlaceholder.entries.map((e) =>
      e.map((r) => r.text).join(""),
    );
    expect(certTexts.some((t) => t.includes("Senior Practitioners"))).toBe(true);
    expect(certTexts.some((t) => t.includes("Appellant"))).toBe(true);
    expect(certTexts.some((t) => t.includes("Respondent"))).toBe(true);
  });

  it("generates an index with volume and page ranges", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      { ...roachCase, loaPart: "B" },
      { ...ccaAct, loaPart: "B" },
    ];

    const result = generateJBA(citations, caseDetails);

    expect(result.index.length).toBeGreaterThan(0);
    for (const entry of result.index) {
      expect(entry.volume).toBeGreaterThanOrEqual(1);
      expect(entry.pageRange).toMatch(/^\d+\u2013\d+$/);
      expect(entry.authorityLabel).toBeTruthy();
    }
  });

  it("includes Part A and Part B from LOA-002", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      { ...roachCase, loaPart: "B" },
    ];

    const result = generateJBA(citations, caseDetails);

    expect(result.partA.length).toBeGreaterThan(0);
    expect(result.partB.length).toBeGreaterThan(0);
  });

  it("warns if JBA filing deadline is overdue", () => {
    const pastDetails: JbaCaseDetails = {
      caseName: "Smith v Jones",
      fileNumber: "S123/2026",
      replyFilingDate: "2025-01-01", // well in the past
    };

    const citations: Citation[] = [{ ...papeCase, loaPart: "A" }];
    const result = generateJBA(citations, pastDetails);

    const filingWarning = result.warnings.find(
      (w) => w.code === "JBA_FILING_OVERDUE",
    );
    expect(filingWarning).toBeDefined();
  });

  it("does not warn about filing when no reply date is set", () => {
    const noReplyDetails: JbaCaseDetails = {
      caseName: "Smith v Jones",
      fileNumber: "S123/2026",
    };

    const citations: Citation[] = [{ ...papeCase, loaPart: "A" }];
    const result = generateJBA(citations, noReplyDetails);

    const filingWarning = result.warnings.find(
      (w) => w.code === "JBA_FILING_OVERDUE",
    );
    expect(filingWarning).toBeUndefined();
  });

  it("propagates LOA-002 warnings (Part A empty, count)", () => {
    // All in Part B — should get Part A empty warning.
    const citations: Citation[] = [papeCase, roachCase];

    const result = generateJBA(citations, caseDetails);

    const emptyWarning = result.warnings.find(
      (w) => w.code === "LOA_PART_A_EMPTY",
    );
    expect(emptyWarning).toBeDefined();
  });
});

// ─── LOA-004: Key Authority Marker ──────────────────────────────────────────

describe("LOA-004: Key authority asterisk rendering", () => {
  it("prepends asterisk to key authority entries in LOA output", () => {
    const citations: Citation[] = [
      { ...papeCase, loaPart: "A", isKeyAuthority: true },
      { ...roachCase, loaPart: "A", isKeyAuthority: false },
    ];

    const result = generatePartABListOfAuthorities(citations);
    const casesSection = result.partA.find((s) => s.heading === "Cases");
    expect(casesSection).toBeDefined();

    // Pape is key authority — first run should be "* ".
    const papeEntry = casesSection!.entries.find((e) =>
      e.some((r) => r.text.includes("Pape")),
    );
    expect(papeEntry).toBeDefined();
    expect(papeEntry![0].text).toBe("* ");

    // Roach is not key authority — no asterisk.
    const roachEntry = casesSection!.entries.find((e) =>
      e.some((r) => r.text.includes("Roach")),
    );
    expect(roachEntry).toBeDefined();
    expect(roachEntry![0].text).not.toBe("* ");
  });

  it("warns when more than 5 key authorities are marked", () => {
    const citations: Citation[] = [];
    for (let i = 0; i < 6; i++) {
      citations.push(
        makeCitation({
          id: `key-${i}`,
          sourceType: "case.reported",
          loaPart: "A",
          isKeyAuthority: true,
          data: {
            title: `Key Case ${i}`,
            party1: `KeyParty${i}`,
          },
        }),
      );
    }

    const result = generatePartABListOfAuthorities(citations);

    const keyWarning = result.warnings.find(
      (w) => w.code === "LOA_KEY_AUTHORITY_LIMIT",
    );
    expect(keyWarning).toBeDefined();
    expect(keyWarning!.message).toContain("6");
  });

  it("does not warn when 5 or fewer key authorities are marked", () => {
    const citations: Citation[] = [];
    for (let i = 0; i < 5; i++) {
      citations.push(
        makeCitation({
          id: `key-${i}`,
          sourceType: "case.reported",
          loaPart: "A",
          isKeyAuthority: true,
          data: {
            title: `Key Case ${i}`,
            party1: `KeyParty${i}`,
          },
        }),
      );
    }

    const result = generatePartABListOfAuthorities(citations);

    const keyWarning = result.warnings.find(
      (w) => w.code === "LOA_KEY_AUTHORITY_LIMIT",
    );
    expect(keyWarning).toBeUndefined();
  });

  it("renders asterisks for key legislation entries too", () => {
    const citations: Citation[] = [
      { ...ccaAct, loaPart: "A", isKeyAuthority: true },
    ];

    const result = generatePartABListOfAuthorities(citations);
    const legSection = result.partA.find((s) => s.heading === "Legislation");
    expect(legSection).toBeDefined();
    expect(legSection!.entries[0][0].text).toBe("* ");
  });
});

// ─── LOA-005: Export Formats ────────────────────────────────────────────────

describe("LOA-005: generateLoaWithOptions", () => {
  it("generates simple LOA with insert-section target", () => {
    const options: LoaGenerationOptions = {
      loaType: "simple",
      includeSecondary: false,
      exportTarget: "insert-section",
    };

    const result = generateLoaWithOptions([papeCase, ccaAct], options);

    expect(result.exportTarget).toBe("insert-section");
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.partA).toBeUndefined();
    expect(result.partB).toBeUndefined();
    expect(result.pdfExportNote).toBeUndefined();
  });

  it("generates Part A/B LOA with new-document target", () => {
    const options: LoaGenerationOptions = {
      loaType: "part-ab",
      includeSecondary: false,
      exportTarget: "new-document",
    };

    const citations: Citation[] = [
      { ...papeCase, loaPart: "A" },
      roachCase,
    ];

    const result = generateLoaWithOptions(citations, options);

    expect(result.exportTarget).toBe("new-document");
    expect(result.partA).toBeDefined();
    expect(result.partB).toBeDefined();
    // Combined sections should include Part A and Part B heading sections.
    const headings = result.sections.map((s) => s.heading);
    expect(headings.some((h) => h.includes("Part A"))).toBe(true);
    expect(headings.some((h) => h.includes("Part B"))).toBe(true);
  });

  it("adds PDF export note when target is pdf", () => {
    const options: LoaGenerationOptions = {
      loaType: "simple",
      includeSecondary: false,
      exportTarget: "pdf",
    };

    const result = generateLoaWithOptions([papeCase], options);

    expect(result.pdfExportNote).toBeDefined();
    expect(result.pdfExportNote).toContain("Save As PDF");
    expect(result.pdfExportNote).toContain("eLodgment");
  });

  it("adds PDF export note for Part A/B mode too", () => {
    const options: LoaGenerationOptions = {
      loaType: "part-ab",
      includeSecondary: false,
      exportTarget: "pdf",
    };

    const result = generateLoaWithOptions(
      [{ ...papeCase, loaPart: "A" }],
      options,
    );

    expect(result.pdfExportNote).toBeDefined();
  });

  it("propagates warnings from Part A/B generation", () => {
    const options: LoaGenerationOptions = {
      loaType: "part-ab",
      includeSecondary: false,
      exportTarget: "new-document",
    };

    // All Part B — should warn about empty Part A.
    const result = generateLoaWithOptions([papeCase], options);

    const emptyWarning = result.warnings.find(
      (w) => w.code === "LOA_PART_A_EMPTY",
    );
    expect(emptyWarning).toBeDefined();
  });
});

// ─── Existing LOA-001 (simple) — regression ─────────────────────────────────

describe("LOA-001: generateListOfAuthorities (regression)", () => {
  it("produces Cases and Legislation sections", () => {
    const sections = generateListOfAuthorities([papeCase, ccaAct]);

    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Cases");
    expect(sections[1].heading).toBe("Legislation");
  });

  it("excludes secondary sources", () => {
    const sections = generateListOfAuthorities([
      papeCase,
      frenchArticle,
      ccaAct,
    ]);

    const headings = sections.map((s) => s.heading);
    expect(headings).not.toContain("Secondary Sources");
    expect(headings).not.toContain("A Articles/Books/Reports");
  });

  it("appends MNC to case entries when available", () => {
    const sections = generateListOfAuthorities([papeCase]);

    const caseEntry = sections[0].entries[0];
    const fullText = caseEntry.map((r) => r.text).join("");
    expect(fullText).toContain("[2009] HCA 23");
  });
});
