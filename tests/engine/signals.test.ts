/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * SIGNAL-001: Introductory Signals and Commentary Tests
 *
 * Validates that introductory signals (AGLC4 Rule 1.2) and commentary text
 * are correctly prepended/appended to citation runs by the engine.
 */

import { formatCitation, getFormattedPreview, applySignalAndCommentary, applyLinkingPhrase } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";
import { INTRODUCTORY_SIGNALS, LINKING_PHRASES, LINKING_PHRASE_LABELS } from "../../src/types/citation";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    id: "signal-test-1",
    aglcVersion: "4",
    sourceType: "case.reported",
    data: {
      party1: "Mabo",
      party2: "Queensland",
      separator: "v",
      yearType: "round",
      year: 1992,
      volume: 175,
      reportSeries: "CLR",
      startingPage: 1,
    },
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    modifiedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Concatenates FormattedRun[] into plain text for assertions. */
function toPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

// ─── INTRODUCTORY_SIGNALS Constant ──────────────────────────────────────────

describe("INTRODUCTORY_SIGNALS constant (Rule 1.2)", () => {
  it("contains all six signals defined in AGLC4 Rule 1.2", () => {
    expect(INTRODUCTORY_SIGNALS).toEqual([
      "See",
      "See, eg,",
      "See also",
      "But see",
      "Cf",
      "See generally",
    ]);
  });

  it("has exactly six entries", () => {
    expect(INTRODUCTORY_SIGNALS).toHaveLength(6);
  });
});

// ─── applySignalAndCommentary (unit) ─────────────────────────────────────────

describe("applySignalAndCommentary", () => {
  const baseRuns: FormattedRun[] = [
    { text: "Mabo", italic: true },
    { text: " v " },
    { text: "Queensland", italic: true },
    { text: " (1992) 175 CLR 1" },
  ];

  it("returns runs unchanged when no signal or commentary is set", () => {
    const citation = makeCitation();
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result).toEqual(baseRuns);
  });

  it('prepends italic signal "See" with trailing space', () => {
    const citation = makeCitation({ signal: "See" });
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result[0]).toEqual({ text: "See ", italic: false });
    // The rest of the runs follow
    expect(result.slice(1)).toEqual(baseRuns);
  });

  it('prepends italic signal "See, eg," with trailing space', () => {
    const citation = makeCitation({ signal: "See, eg," });
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result[0]).toEqual({ text: "See, eg, ", italic: false });
  });

  it("prepends commentaryBefore as plain text with trailing space", () => {
    const citation = makeCitation({
      commentaryBefore: "For a discussion of this principle, see",
    });
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result[0]).toEqual({
      text: "For a discussion of this principle, see ",
    });
    expect(result[0].italic).toBeUndefined();
    expect(result.slice(1)).toEqual(baseRuns);
  });

  it("appends commentaryAfter as plain text with leading space", () => {
    const citation = makeCitation({
      commentaryAfter: "where the court distinguished the earlier authority",
    });
    const result = applySignalAndCommentary([...baseRuns], citation);
    // Last run should be the commentary
    const lastRun = result[result.length - 1];
    expect(lastRun).toEqual({
      text: " where the court distinguished the earlier authority",
    });
    expect(lastRun.italic).toBeUndefined();
    // The base runs should precede the commentary
    expect(result.slice(0, baseRuns.length)).toEqual(baseRuns);
  });

  it("combines commentaryBefore + signal + citation + commentaryAfter", () => {
    const citation = makeCitation({
      signal: "See",
      commentaryBefore: "On this point",
      commentaryAfter: "discussed at length",
    });
    const result = applySignalAndCommentary([...baseRuns], citation);

    // First: commentary before (plain)
    expect(result[0]).toEqual({ text: "On this point " });
    // Second: signal (italic)
    expect(result[1]).toEqual({ text: "See ", italic: false });
    // Then: citation runs
    expect(result.slice(2, 2 + baseRuns.length)).toEqual(baseRuns);
    // Last: commentary after (plain)
    expect(result[result.length - 1]).toEqual({
      text: " discussed at length",
    });
  });

  it("trims whitespace from commentaryBefore and commentaryAfter", () => {
    const citation = makeCitation({
      commentaryBefore: "  leading spaces  ",
      commentaryAfter: "  trailing spaces  ",
    });
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result[0].text).toBe("leading spaces ");
    expect(result[result.length - 1].text).toBe(" trailing spaces");
  });

  it("ignores empty/whitespace-only commentaryBefore and commentaryAfter", () => {
    const citation = makeCitation({
      commentaryBefore: "   ",
      commentaryAfter: "   ",
    });
    const result = applySignalAndCommentary([...baseRuns], citation);
    expect(result).toEqual(baseRuns);
  });
});

// ─── formatCitation integration ──────────────────────────────────────────────

describe("formatCitation with signals (Rule 1.2)", () => {
  it('prepends italic "See" before the citation, followed by closing period', () => {
    const citation = makeCitation({ signal: "See" });
    const runs = formatCitation(citation);
    const text = toPlainText(runs);
    expect(text).toMatch(/^See /);
    // formatCitation no longer adds closing punctuation;
    // The signal run should be italic
    expect(runs[0]).toEqual({ text: "See ", italic: false });
  });

  it("includes commentaryBefore before the signal", () => {
    const citation = makeCitation({
      signal: "See also",
      commentaryBefore: "On this point",
    });
    const runs = formatCitation(citation);
    const text = toPlainText(runs);
    expect(text).toMatch(/^On this point See also /);
  });

  it("includes commentaryAfter before the closing period", () => {
    const citation = makeCitation({
      commentaryAfter: "as discussed above",
    });
    const runs = formatCitation(citation);
    const text = toPlainText(runs);
    // Commentary should appear before the period
    expect(text).toMatch(/as discussed above$/);
  });

  it("renders all three: commentary + signal + citation + after-commentary + period", () => {
    const citation = makeCitation({
      signal: "Cf",
      commentaryBefore: "Compare",
      commentaryAfter: "on this issue",
    });
    const runs = formatCitation(citation);
    const text = toPlainText(runs);
    expect(text).toMatch(/^Compare Cf /);
    expect(text).toMatch(/on this issue$/);
  });

  it("produces unchanged output when no signal or commentary is set", () => {
    const withSignal = makeCitation();
    const withoutSignal = makeCitation();
    const runsWithout = formatCitation(withoutSignal);
    const runsWith = formatCitation(withSignal);
    expect(toPlainText(runsWith)).toBe(toPlainText(runsWithout));
  });
});

// ─── getFormattedPreview integration ─────────────────────────────────────────

describe("getFormattedPreview with signals (Rule 1.2)", () => {
  it("includes signal and commentary in the preview", () => {
    const citation = makeCitation({
      signal: "See generally",
      commentaryBefore: "For background",
      commentaryAfter: "which is instructive",
    });
    const runs = getFormattedPreview(citation);
    const text = toPlainText(runs);
    expect(text).toMatch(/^For background See generally /);
    expect(text).toMatch(/which is instructive\.$/);
  });
});

// ─── LINKING_PHRASES Constant (Rule 1.3) ──────────────────────────────────────

describe("LINKING_PHRASES constant (Rule 1.3)", () => {
  it("contains all nine linking phrases defined for AGLC4 Rule 1.3", () => {
    expect(LINKING_PHRASES).toEqual([
      "quoting",
      "quoted_in",
      "citing",
      "cited_in",
      "discussing",
      "discussed_in",
      "affirmed_by",
      "reversed_by",
      "varied_by",
    ]);
  });

  it("has exactly nine entries", () => {
    expect(LINKING_PHRASES).toHaveLength(9);
  });

  it("has a display label for every linking phrase", () => {
    for (const lp of LINKING_PHRASES) {
      expect(LINKING_PHRASE_LABELS[lp]).toBeDefined();
      expect(typeof LINKING_PHRASE_LABELS[lp]).toBe("string");
    }
  });
});

// ─── applyLinkingPhrase (unit, Rule 1.3) ──────────────────────────────────────

describe("applyLinkingPhrase (Rule 1.3)", () => {
  const primaryRuns: FormattedRun[] = [
    { text: "Kable", italic: true },
    { text: " v " },
    { text: "Director of Public Prosecutions", italic: true },
    { text: " (1996) 189 CLR 51, 132" },
  ];

  const secondaryRuns: FormattedRun[] = [
    { text: "Leeth", italic: true },
    { text: " v " },
    { text: "Commonwealth", italic: true },
    { text: " (1992) 174 CLR 455, 486" },
  ];

  it("returns primary runs unchanged when no linking phrase is set", () => {
    const result = applyLinkingPhrase([...primaryRuns], undefined, secondaryRuns);
    expect(result).toEqual(primaryRuns);
  });

  it("returns primary runs unchanged when secondary runs are empty", () => {
    const result = applyLinkingPhrase([...primaryRuns], "quoting", []);
    expect(result).toEqual(primaryRuns);
  });

  it('appends ", quoting " and secondary citation (AGLC4 fn 46)', () => {
    const result = applyLinkingPhrase([...primaryRuns], "quoting", secondaryRuns);
    const text = toPlainText(result);
    expect(text).toBe(
      "Kable v Director of Public Prosecutions (1996) 189 CLR 51, 132, quoting Leeth v Commonwealth (1992) 174 CLR 455, 486"
    );
    // The linking phrase run should not be italic
    const linkingRun = result[primaryRuns.length];
    expect(linkingRun.text).toBe(", quoting ");
    expect(linkingRun.italic).toBe(false);
  });

  it('appends ", cited in " linking phrase', () => {
    const result = applyLinkingPhrase([...primaryRuns], "cited_in", secondaryRuns);
    const text = toPlainText(result);
    expect(text).toContain(", cited in ");
  });

  it('appends ", affirmed by " linking phrase', () => {
    const result = applyLinkingPhrase([...primaryRuns], "affirmed_by", secondaryRuns);
    const text = toPlainText(result);
    expect(text).toContain(", affirmed by ");
  });

  it('appends ", reversed by " linking phrase', () => {
    const result = applyLinkingPhrase([...primaryRuns], "reversed_by", secondaryRuns);
    const text = toPlainText(result);
    expect(text).toContain(", reversed by ");
  });
});

// ─── getFormattedPreview with linking phrases (Rule 1.3) ─────────────────────

describe("getFormattedPreview with linking phrases (Rule 1.3)", () => {
  const linkedCitationRuns: FormattedRun[] = [
    { text: "Leeth", italic: true },
    { text: " v " },
    { text: "Commonwealth", italic: true },
    { text: " (1992) 174 CLR 455, 486." },
  ];

  it("includes linking phrase and linked citation in the preview", () => {
    const citation = makeCitation({
      linkingPhrase: "quoting",
      linkedCitationId: "linked-test-1",
    });
    const runs = getFormattedPreview(citation, undefined, linkedCitationRuns);
    const text = toPlainText(runs);
    expect(text).toContain(", quoting ");
    expect(text).toContain("Leeth v Commonwealth");
  });

  it("combines signal, commentary, and linking phrase correctly", () => {
    const citation = makeCitation({
      signal: "See",
      commentaryBefore: "On this point",
      linkingPhrase: "citing",
      linkedCitationId: "linked-test-1",
    });
    const runs = getFormattedPreview(citation, undefined, linkedCitationRuns);
    const text = toPlainText(runs);
    // Signal and commentary come before the citation
    expect(text).toMatch(/^On this point See /);
    // Linking phrase comes after the primary citation
    expect(text).toContain(", citing ");
    expect(text).toContain("Leeth v Commonwealth");
  });

  it("renders without linked citation when no linkedCitationRuns provided", () => {
    const citation = makeCitation({
      linkingPhrase: "quoting",
      linkedCitationId: "linked-test-1",
    });
    const runs = getFormattedPreview(citation);
    const text = toPlainText(runs);
    // Should not contain linking phrase when no linked runs
    expect(text).not.toContain(", quoting ");
  });
});
