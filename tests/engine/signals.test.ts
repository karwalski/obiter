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

import { formatCitation, getFormattedPreview, applySignalAndCommentary } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";
import { INTRODUCTORY_SIGNALS } from "../../src/types/citation";

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
