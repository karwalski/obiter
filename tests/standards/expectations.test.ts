/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-002 — Structural checks on the standards expectation tables.
 *
 * Nothing here renders a citation. It asserts that every row in every table
 * is well formed (fixture id exists, non-empty scenario / expected / rule /
 * source), that no table repeats a (fixture, scenario) pair, and it prints
 * the pending (DECISION-040) rows and a per-table count summary. The
 * rendering assertions live in the STD-004…STD-008 suites via
 * `tests/standards/runner.ts`.
 */

import { STANDARD_FIXTURE_IDS } from "../fixtures/standards/citations";
import { AGLC4_EXPECTATIONS } from "../fixtures/standards/aglc4";
import { OSCOLA5_EXPECTATIONS } from "../fixtures/standards/oscola5";
import { OSCOLA4_EXPECTATIONS } from "../fixtures/standards/oscola4";
import { NZLSG3_EXPECTATIONS } from "../fixtures/standards/nzlsg3";
import { AGLC4_COURT_EXPECTATIONS } from "../fixtures/standards/aglc4-court";
import type { ExpectationRow, ExpectationTable } from "../fixtures/standards/types";

const TABLES: ReadonlyArray<[string, ExpectationTable]> = [
  ["aglc4", AGLC4_EXPECTATIONS],
  ["oscola5", OSCOLA5_EXPECTATIONS],
  ["oscola4", OSCOLA4_EXPECTATIONS],
  ["nzlsg3", NZLSG3_EXPECTATIONS],
  ["aglc4-court", AGLC4_COURT_EXPECTATIONS],
];

const FIXTURE_IDS = new Set(STANDARD_FIXTURE_IDS);
const PENDING_PREFIX = "DECISION-040";

function label(row: ExpectationRow): string {
  return `${row.fixture} / ${row.scenario}`;
}

describe("STD-002: standards expectation tables are well formed", () => {
  test("the fixture library has unique ids", () => {
    expect(FIXTURE_IDS.size).toBe(STANDARD_FIXTURE_IDS.length);
    expect(STANDARD_FIXTURE_IDS.length).toBeGreaterThan(0);
  });

  describe.each(TABLES)("%s", (name, table) => {
    test("has at least one row", () => {
      expect(table.length).toBeGreaterThan(0);
    });

    test("every row names a known fixture", () => {
      const unknown = table.filter((r) => !FIXTURE_IDS.has(r.fixture)).map(label);
      expect(unknown).toEqual([]);
    });

    test("every row has a non-empty scenario, expected, rule and source", () => {
      const bad = table
        .filter(
          (r) =>
            r.scenario.trim() === "" ||
            r.expected.trim() === "" ||
            r.rule.trim() === "" ||
            r.source.trim() === ""
        )
        .map(label);
      expect(bad).toEqual([]);
    });

    test("no (fixture, scenario) pair is repeated", () => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const r of table) {
        const key = label(r);
        if (seen.has(key)) dupes.push(key);
        seen.add(key);
      }
      expect(dupes).toEqual([]);
    });

    test("pending rows carry a DECISION-040 question", () => {
      const bad = table
        .filter((r) => r.pending !== undefined && !r.pending.startsWith(PENDING_PREFIX))
        .map(label);
      expect(bad).toEqual([]);
    });

    test(`${name}: court scenarios are preset-keyed only in the court table`, () => {
      const keyed = table.filter((r) => r.scenario.includes(":"));
      if (name === "aglc4-court") {
        expect(keyed.length).toBe(table.length);
      } else {
        expect(keyed).toEqual([]);
      }
    });
  });

  test("pending rows are reported and the tables are summarised", () => {
    const lines: string[] = [];
    for (const [name, table] of TABLES) {
      const pending = table.filter((r) => r.pending !== undefined);
      const deltas = table.filter((r) => r.note?.startsWith("currently renders:")).length;
      lines.push(
        `${name}: ${table.length} rows, ${pending.length} pending, ${deltas} with a current-output delta`
      );
      for (const r of pending) {
        lines.push(`  pending decision — ${name} ${label(r)}: ${r.pending}`);
      }
    }
    console.info(["STD-002 expectation tables", ...lines].join("\n"));
    expect(lines.length).toBeGreaterThan(0);
  });
});
