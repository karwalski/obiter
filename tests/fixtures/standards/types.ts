/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — Expectation-table row shape.
 *
 * Kept identical to `ExpectationRow` exported by `tests/standards/runner.ts`
 * so the fixture tables compile without importing the runner (the two
 * files are owned by different stories). If one changes, change both.
 */
export interface ExpectationRow {
  /** Fixture id from `citations.ts` (`fx-…`). */
  fixture: string;
  /**
   * Scenario name understood by the runner:
   * `first`, `first+page`, `first+paragraph`, `first+section`,
   * `first+article`, `first+regulation`, `subsequent-short`,
   * `subsequent-short+pinpoint`, `subsequent-ibid`, `bibliography-entry`,
   * `parallel`. Court tables prefix the preset: `HCA:first+paragraph`.
   */
  scenario: string;
  /** Plain text of the rendered runs (italics are not asserted here). */
  expected: string;
  /** Rule number(s) in the standard, plus a one-line paraphrased note. */
  rule: string;
  /** Where the expected string was confirmed. */
  source: string;
  /** Set when the value could not be confirmed; the row never fails. */
  pending?: string;
  /**
   * Reviewer aid for the non-AGLC tables: what the engine renders TODAY
   * when it differs from `expected` (`currently renders: …`). Absent when
   * the engine already matches.
   */
  note?: string;
}

/** A standard's whole table. */
export type ExpectationTable = ExpectationRow[];
