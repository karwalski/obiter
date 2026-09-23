/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-004 — First and subsequent references per standard.
 *
 * Table-driven over tests/fixtures/standards/{aglc4,oscola5,oscola4,nzlsg3,
 * aglc4-court}.ts: the `first`, `parallel`, `subsequent-short` and
 * `subsequent-ibid` scenarios without an occurrence pinpoint (the pinpointed
 * variants are STD-005, tests/standards/pinpoints.test.ts). Each row is one
 * test named for its fixture, scenario and rule; rows whose `note` records a
 * current delta run as `test.failing` under the story that must close it,
 * and `pending` rows are todos (see tests/standards/matrix.ts).
 *
 * Under `aglc4` and `aglc4-court` every row is a plain test: those tables
 * are engine captures and are the byte-identical guard for the AGLC output.
 */

import { hasPinpoint, parseScenario, runTable, TABLE_KEYS } from "./matrix";

/** The reference scenarios: no pinpoint suffix, not a bibliography entry. */
function isReferenceScenario(scenario: string): boolean {
  return !hasPinpoint(scenario) && parseScenario(scenario).base !== "bibliography-entry";
}

describe("STD-004: first and subsequent references per standard", () => {
  for (const key of TABLE_KEYS) {
    runTable(key, isReferenceScenario);
  }
});
