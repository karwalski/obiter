/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Stories 17.51, 17.53, 17.54, 17.55 — Verification Core unit tests.
 */

import {
  calculateConfidence,
  verifySingleCitation,
  verifyAllCitations,
  type CitationInput,
  type VerificationReport,
} from "../../src/api/citationVerifier";
import type { ParsedCitation } from "../../src/api/citationParser";
import type {
  SourceAdapter,
  SourceAdapterDescriptor,
  SourceMetadata,
  AdapterHealth,
  LookupResult,
  SearchFilters,
} from "../../src/api/sourceAdapter";
import {
  createAuditLog,
  exportAuditLogAsText,
  sha256,
  type AuditLog,
} from "../../src/api/auditLog";
import {
  getPracticeNoteReminder,
  getAllReminders,
  SUPPORTED_JURISDICTIONS,
} from "../../src/api/practiceNoteReminder";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeDescriptor(id: string): SourceAdapterDescriptor {
  return {
    id,
    displayName: id,
    jurisdictions: ["AU"],
    contentTypes: ["case"],
    accessTier: "open",
    licence: "test",
    requiresKey: false,
    rateLimitHint: { requestsPerSecond: 10, burst: 20 },
    fragile: false,
  };
}

function makeAdapter(
  id: string,
  resolveResult: SourceMetadata | null,
): SourceAdapter {
  return {
    descriptor: makeDescriptor(id),
    search: async (_query: string, _filters?: SearchFilters): Promise<LookupResult[]> => [],
    resolve: async (_citation: string): Promise<SourceMetadata | null> => resolveResult,
    getMetadata: async (_id: string): Promise<SourceMetadata | null> => null,
    healthcheck: async (): Promise<AdapterHealth> => "healthy",
  };
}

function makeErrorAdapter(id: string, errorMsg: string): SourceAdapter {
  return {
    descriptor: makeDescriptor(id),
    search: async (_query: string, _filters?: SearchFilters): Promise<LookupResult[]> => [],
    resolve: async (): Promise<SourceMetadata | null> => {
      throw new Error(errorMsg);
    },
    getMetadata: async (_id: string): Promise<SourceMetadata | null> => null,
    healthcheck: async (): Promise<AdapterHealth> => "healthy",
  };
}

// ---------------------------------------------------------------------------
// 17.53 — Confidence scoring
// ---------------------------------------------------------------------------

describe("calculateConfidence", () => {
  describe("MNC citations", () => {
    const parsed: ParsedCitation = {
      type: "mnc",
      year: 2023,
      court: "HCA",
      number: 42,
      raw: "[2023] HCA 42",
    };

    it("returns 1.0 for exact match (year + court + number in MNC)", () => {
      const meta: SourceMetadata = {
        year: 2023,
        court: "HCA",
        mnc: "[2023] HCA 42",
        parties: "Smith v Jones",
      };
      expect(calculateConfidence(parsed, meta)).toBe(1.0);
    });

    it("returns 0.9 for year + court match without MNC number", () => {
      const meta: SourceMetadata = {
        year: 2023,
        court: "HCA",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.9);
    });

    it("returns 0.5 for partial match (year only)", () => {
      const meta: SourceMetadata = {
        year: 2023,
        court: "FCA",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.5);
    });

    it("returns -1 for mismatched (no year or court match)", () => {
      const meta: SourceMetadata = {
        year: 2019,
        court: "FCA",
      };
      expect(calculateConfidence(parsed, meta)).toBe(-1);
    });

    it("returns 0.0 for null metadata (unresolved)", () => {
      expect(calculateConfidence(parsed, null)).toBe(0.0);
    });
  });

  describe("report citations", () => {
    const parsed: ParsedCitation = {
      type: "report",
      year: 2020,
      volume: 270,
      series: "CLR",
      page: 1,
      raw: "(2020) 270 CLR 1",
    };

    it("returns 1.0 for exact match", () => {
      const meta: SourceMetadata = {
        year: 2020,
        volume: 270,
        reportSeries: "CLR",
        startingPage: 1,
      };
      expect(calculateConfidence(parsed, meta)).toBe(1.0);
    });

    it("returns 0.9 for year + series + volume without page", () => {
      const meta: SourceMetadata = {
        year: 2020,
        volume: 270,
        reportSeries: "CLR",
        startingPage: 99,
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.9);
    });

    it("returns 0.5 for year + series only", () => {
      const meta: SourceMetadata = {
        year: 2020,
        reportSeries: "CLR",
        volume: 999,
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.5);
    });

    it("returns -1 when nothing matches", () => {
      const meta: SourceMetadata = {
        year: 1999,
        reportSeries: "ALR",
      };
      expect(calculateConfidence(parsed, meta)).toBe(-1);
    });
  });

  describe("statute citations", () => {
    const parsed: ParsedCitation = {
      type: "statute",
      title: "Competition and Consumer Act",
      year: 2010,
      jurisdiction: "Cth",
      raw: "Competition and Consumer Act 2010 (Cth)",
    };

    it("returns 1.0 for exact title + year + jurisdiction", () => {
      const meta: SourceMetadata = {
        title: "Competition and Consumer Act",
        year: 2010,
        jurisdiction: "Cth",
      };
      expect(calculateConfidence(parsed, meta)).toBe(1.0);
    });

    it("returns 0.9 for fuzzy title match", () => {
      const meta: SourceMetadata = {
        title: "Competition and Consumer Act 2010",
        year: 2010,
        jurisdiction: "Cth",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.9);
    });

    it("returns 0.5 for year + jurisdiction only", () => {
      const meta: SourceMetadata = {
        title: "Totally Different Act",
        year: 2010,
        jurisdiction: "Cth",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.5);
    });

    it("returns -1 when key fields differ", () => {
      const meta: SourceMetadata = {
        title: "Totally Different Act",
        year: 1999,
        jurisdiction: "NSW",
      };
      expect(calculateConfidence(parsed, meta)).toBe(-1);
    });
  });

  describe("hansard citations", () => {
    const parsed: ParsedCitation = {
      type: "hansard",
      parliament: "Commonwealth",
      chamber: "House of Representatives",
      date: "15 March 2023",
      page: "1234",
      speaker: "Jane Smith",
      raw: "Commonwealth, Parliamentary Debates, House of Representatives, 15 March 2023, 1234 (Jane Smith)",
    };

    it("returns 1.0 for chamber + page + speaker match", () => {
      const meta: SourceMetadata = {
        chamber: "House of Representatives",
        page: "1234",
        speaker: "Jane Smith",
      };
      expect(calculateConfidence(parsed, meta)).toBe(1.0);
    });

    it("returns 0.9 for chamber + page without speaker", () => {
      const meta: SourceMetadata = {
        chamber: "House of Representatives",
        page: "1234",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.9);
    });

    it("returns 0.5 for chamber only", () => {
      const meta: SourceMetadata = {
        chamber: "House of Representatives",
        page: "9999",
      };
      expect(calculateConfidence(parsed, meta)).toBe(0.5);
    });

    it("returns -1 when nothing matches", () => {
      const meta: SourceMetadata = {
        chamber: "Senate",
        page: "9999",
      };
      expect(calculateConfidence(parsed, meta)).toBe(-1);
    });
  });
});

// ---------------------------------------------------------------------------
// 17.51 — Verification report generation
// ---------------------------------------------------------------------------

describe("verifySingleCitation", () => {
  it("returns verified for a resolved citation with high confidence", async () => {
    const citation: CitationInput = {
      id: "c1",
      text: "[2023] HCA 42",
      footnoteIndex: 1,
    };
    const adapter = makeAdapter("austlii", {
      year: 2023,
      court: "HCA",
      mnc: "[2023] HCA 42",
      parties: "Smith v Jones",
    });

    const result = await verifySingleCitation(citation, [adapter]);
    expect(result.status).toBe("verified");
    expect(result.confidence).toBe(1.0);
    expect(result.sourceAdapterId).toBe("austlii");
  });

  it("returns unresolved when no adapter resolves", async () => {
    const citation: CitationInput = {
      id: "c2",
      text: "[2023] HCA 42",
      footnoteIndex: 2,
    };
    const adapter = makeAdapter("austlii", null);

    const result = await verifySingleCitation(citation, [adapter]);
    expect(result.status).toBe("unresolved");
    expect(result.confidence).toBe(0.0);
  });

  it("returns mismatched when metadata conflicts", async () => {
    const citation: CitationInput = {
      id: "c3",
      text: "[2023] HCA 42",
      footnoteIndex: 3,
    };
    const adapter = makeAdapter("austlii", {
      year: 2019,
      court: "FCA",
    });

    const result = await verifySingleCitation(citation, [adapter]);
    expect(result.status).toBe("mismatched");
    expect(result.confidence).toBe(-1);
    expect(result.mismatchDetails).toBeDefined();
  });

  it("returns error when citation cannot be parsed", async () => {
    const citation: CitationInput = {
      id: "c4",
      text: "not a citation at all",
      footnoteIndex: 4,
    };
    const adapter = makeAdapter("austlii", null);

    const result = await verifySingleCitation(citation, [adapter]);
    expect(result.status).toBe("error");
    expect(result.error).toContain("could not be parsed");
  });

  it("returns error when adapter throws", async () => {
    const citation: CitationInput = {
      id: "c5",
      text: "[2023] HCA 42",
      footnoteIndex: 5,
    };
    const adapter = makeErrorAdapter("broken", "Network timeout");

    const result = await verifySingleCitation(citation, [adapter]);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Network timeout");
  });

  it("tries adapters in order, stops at first resolution", async () => {
    const citation: CitationInput = {
      id: "c6",
      text: "[2023] HCA 42",
      footnoteIndex: 6,
    };
    const adapterA = makeAdapter("first", null);
    const adapterB = makeAdapter("second", {
      year: 2023,
      court: "HCA",
      mnc: "[2023] HCA 42",
      parties: "Test",
    });
    const adapterC = makeAdapter("third", {
      year: 2023,
      court: "HCA",
      mnc: "[2023] HCA 42",
      parties: "Other",
    });

    const result = await verifySingleCitation(citation, [adapterA, adapterB, adapterC]);
    expect(result.sourceAdapterId).toBe("second");
  });
});

describe("verifyAllCitations", () => {
  it("produces a correct report with mixed results", async () => {
    const citations: CitationInput[] = [
      { id: "c1", text: "[2023] HCA 42", footnoteIndex: 1 },
      { id: "c2", text: "[2020] FCA 100", footnoteIndex: 2 },
      { id: "c3", text: "not a citation", footnoteIndex: 3 },
    ];

    const adapter: SourceAdapter = {
      descriptor: makeDescriptor("test"),
      search: async (_q: string, _f?: SearchFilters): Promise<LookupResult[]> => [],
      resolve: async (citation: string): Promise<SourceMetadata | null> => {
        if (citation.includes("HCA")) {
          return { year: 2023, court: "HCA", mnc: "[2023] HCA 42", parties: "X v Y" };
        }
        return null;
      },
      getMetadata: async (_id: string): Promise<SourceMetadata | null> => null,
      healthcheck: async (): Promise<AdapterHealth> => "healthy",
    };

    const report = await verifyAllCitations(citations, [adapter], "Test Document");

    expect(report.documentTitle).toBe("Test Document");
    expect(report.totalCitations).toBe(3);
    expect(report.verified).toBe(1);
    expect(report.unresolved).toBe(1);
    expect(report.errors).toBe(1); // unparseable
    expect(report.verifiedAt).toBeTruthy();
    expect(report.results).toHaveLength(3);
  });

  it("returns empty report for zero citations", async () => {
    const report = await verifyAllCitations([], [], "Empty Doc");
    expect(report.totalCitations).toBe(0);
    expect(report.verified).toBe(0);
    expect(report.results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 17.54 — Audit log
// ---------------------------------------------------------------------------

describe("createAuditLog", () => {
  const report: VerificationReport = {
    documentTitle: "Test Brief",
    verifiedAt: "2026-04-25T10:00:00.000Z",
    totalCitations: 2,
    verified: 1,
    unresolved: 1,
    mismatched: 0,
    errors: 0,
    results: [
      {
        citationId: "c1",
        citationText: "[2023] HCA 42",
        footnoteIndex: 1,
        status: "verified",
        confidence: 1.0,
        resolvedMetadata: {
          title: "Smith v Jones",
          parties: "Smith v Jones",
          year: 2023,
          court: "HCA",
        },
        sourceAdapterId: "austlii",
      },
      {
        citationId: "c2",
        citationText: "[2020] FCA 100",
        footnoteIndex: 2,
        status: "unresolved",
        confidence: 0.0,
      },
    ],
  };

  it("creates a log with correct structure", () => {
    const log = createAuditLog(report, "abc123def456");

    expect(log.version).toBe(1);
    expect(log.documentTitle).toBe("Test Brief");
    expect(log.documentHash).toBe("abc123def456");
    expect(log.totalCitations).toBe(2);
    expect(log.summary.verified).toBe(1);
    expect(log.summary.unresolved).toBe(1);
    expect(log.entries).toHaveLength(2);
  });

  it("maps result fields to entry fields correctly", () => {
    const log = createAuditLog(report, "hash");
    const entry = log.entries[0];

    expect(entry.citationText).toBe("[2023] HCA 42");
    expect(entry.footnoteIndex).toBe(1);
    expect(entry.status).toBe("verified");
    expect(entry.confidence).toBe(1.0);
    expect(entry.sourceAdapterId).toBe("austlii");
    expect(entry.resolvedParties).toBe("Smith v Jones");
    expect(entry.resolvedYear).toBe(2023);
    expect(entry.resolvedCourt).toBe("HCA");
  });
});

describe("exportAuditLogAsText", () => {
  it("produces human-readable text with all sections", () => {
    const log: AuditLog = {
      version: 1,
      documentTitle: "Submission",
      documentHash: "deadbeef",
      verifiedAt: "2026-04-25T10:00:00.000Z",
      totalCitations: 1,
      summary: { verified: 1, unresolved: 0, mismatched: 0, errors: 0 },
      entries: [
        {
          citationText: "[2023] HCA 42",
          footnoteIndex: 1,
          status: "verified",
          confidence: 1.0,
          sourceAdapterId: "austlii",
          resolvedTitle: "Smith v Jones",
          resolvedYear: 2023,
          resolvedCourt: "HCA",
        },
      ],
    };

    const text = exportAuditLogAsText(log);

    expect(text).toContain("OBITER CITATION VERIFICATION AUDIT LOG");
    expect(text).toContain("Document:      Submission");
    expect(text).toContain("Document Hash: deadbeef");
    expect(text).toContain("Verified:    1");
    expect(text).toContain("DETAILS");
    expect(text).toContain("Footnote 1: [2023] HCA 42");
    expect(text).toContain("VERIFIED");
    expect(text).toContain("End of audit log");
  });
});

describe("sha256", () => {
  it("returns a hex string", async () => {
    const hash = await sha256("hello world");
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^[0-9a-f]+$/);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("returns different hashes for different inputs", async () => {
    const h1 = await sha256("document one");
    const h2 = await sha256("document two");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// 17.55 — Practice note reminders
// ---------------------------------------------------------------------------

describe("getPracticeNoteReminder", () => {
  it("returns reminder for NSW Supreme Court", () => {
    const reminder = getPracticeNoteReminder("NSW_SC");
    expect(reminder).not.toBeNull();
    expect(reminder!.jurisdiction).toBe("NSW");
    expect(reminder!.courtName).toContain("Supreme Court");
    expect(reminder!.practiceNote).toContain("Gen 23");
    expect(reminder!.reminderText).toContain("Practice Note Gen 23");
  });

  it("returns reminder for Victorian Supreme Court", () => {
    const reminder = getPracticeNoteReminder("VIC_SC");
    expect(reminder).not.toBeNull();
    expect(reminder!.jurisdiction).toBe("VIC");
    expect(reminder!.practiceNote).toContain("SC Gen 1");
  });

  it("returns reminder for Federal Court", () => {
    const reminder = getPracticeNoteReminder("FCA");
    expect(reminder).not.toBeNull();
    expect(reminder!.jurisdiction).toBe("CTH");
    expect(reminder!.practiceNote).toContain("CPN-1");
  });

  it("returns reminder for Queensland Supreme Court", () => {
    const reminder = getPracticeNoteReminder("QLD_SC");
    expect(reminder).not.toBeNull();
    expect(reminder!.jurisdiction).toBe("QLD");
    expect(reminder!.practiceNote).toContain("Practice Direction");
  });

  it("returns reminder for NCAT", () => {
    const reminder = getPracticeNoteReminder("NCAT");
    expect(reminder).not.toBeNull();
    expect(reminder!.jurisdiction).toBe("NSW");
    expect(reminder!.courtName).toContain("Tribunal");
  });

  it("returns null for unsupported jurisdiction", () => {
    expect(getPracticeNoteReminder("WA_SC")).toBeNull();
    expect(getPracticeNoteReminder("unknown")).toBeNull();
    expect(getPracticeNoteReminder("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(getPracticeNoteReminder("nsw_sc")).not.toBeNull();
    expect(getPracticeNoteReminder("fca")).not.toBeNull();
    expect(getPracticeNoteReminder("Ncat")).not.toBeNull();
  });
});

describe("getAllReminders", () => {
  it("returns all five supported jurisdictions", () => {
    const all = getAllReminders();
    expect(all).toHaveLength(5);
  });
});

describe("SUPPORTED_JURISDICTIONS", () => {
  it("contains the five expected keys", () => {
    expect(SUPPORTED_JURISDICTIONS).toContain("NSW_SC");
    expect(SUPPORTED_JURISDICTIONS).toContain("VIC_SC");
    expect(SUPPORTED_JURISDICTIONS).toContain("FCA");
    expect(SUPPORTED_JURISDICTIONS).toContain("QLD_SC");
    expect(SUPPORTED_JURISDICTIONS).toContain("NCAT");
    expect(SUPPORTED_JURISDICTIONS).toHaveLength(5);
  });
});
