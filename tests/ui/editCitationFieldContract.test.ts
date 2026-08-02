/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Edit-view field contract tests (BUG-005 (d)).
 *
 * The Edit Citation view's per-type field definitions must only use data keys
 * the engine dispatch for that source type actually reads — a mismatched key
 * renders an empty field and silently drops the user's edits (the original
 * BUG-005: `case.reported` used `caseName`, which dispatchReportedCase never
 * reads, so the parties vanished on edit; `case.unreported.no_mnc` had the
 * same class of mismatch with caseName/judgeName/date vs party1/party2 +
 * judges + fullDate).
 *
 * The dispatcher is parsed statically, mirroring
 * tests/engine/rule-exporter.test.ts (the SOURCE_TYPE_METADATA contract
 * tests), so any future edit-field key the dispatch does not consume fails
 * here rather than in a user's document.
 */

import * as fs from "fs";
import * as path from "path";
import {
  EDIT_FIELDS_BY_SOURCE_TYPE,
  applyFieldAliases,
} from "../../src/ui/views/editCitationFields";
import type { SourceType } from "../../src/types/citation";

const ENGINE_PATH = path.resolve(__dirname, "../../src/engine/engine.ts");
const engineSource = fs.readFileSync(ENGINE_PATH, "utf-8");

/**
 * Extracts the SOURCE_DISPATCH registry from engine.ts as a map of
 * sourceType -> dispatch function name.
 */
function parseDispatchMap(source: string): Map<string, string> {
  const start = source.indexOf("const SOURCE_DISPATCH");
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("\n};", start);
  expect(end).toBeGreaterThan(start);
  const block = source.slice(start, end);

  const map = new Map<string, string>();
  // Matches `"case.reported": dispatchReportedCase,` and `book: dispatchBook,`
  const entryRe = /^\s*(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*)):\s*([A-Za-z_][A-Za-z0-9_]*),\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(block)) !== null) {
    map.set(m[1] ?? m[2], m[3]);
  }
  return map;
}

/**
 * Extracts the source of a top-level function from engine.ts. Functions in
 * engine.ts are declared at column 0 and terminated by a `}` at column 0.
 */
function functionBody(source: string, name: string): string {
  const declRe = new RegExp(`^function ${name}\\(`, "m");
  const match = declRe.exec(source);
  expect(match).not.toBeNull();
  const start = match!.index;
  const end = source.indexOf("\n}", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 2);
}

/**
 * Collects the citation-data field names a stretch of dispatcher code reads
 * (`d.foo`, `data.foo`, `citation.data.foo`).
 */
function fieldsRead(body: string): Set<string> {
  const fields = new Set<string>();
  const readRe = /\b(?:d|data|citation\.data)\.([A-Za-z_][A-Za-z0-9_]*)/g;
  let m: RegExpExecArray | null;
  while ((m = readRe.exec(body)) !== null) {
    fields.add(m[1]);
  }
  return fields;
}

const dispatchMap = parseDispatchMap(engineSource);

const editEntries = Object.entries(EDIT_FIELDS_BY_SOURCE_TYPE) as Array<
  [SourceType, NonNullable<(typeof EDIT_FIELDS_BY_SOURCE_TYPE)[SourceType]>]
>;

describe("EditCitation field keys <-> SOURCE_DISPATCH consistency (BUG-005 (d))", () => {
  test("the edit view defines explicit fields for a non-trivial set of types", () => {
    expect(editEntries.length).toBeGreaterThan(10);
  });

  test("every explicitly-defined edit type has a dispatch function", () => {
    const orphaned = editEntries.map(([type]) => type).filter((t) => !dispatchMap.has(t));
    expect(orphaned).toEqual([]);
  });

  test.each(editEntries.map(([type, fields]) => [type, fields] as const))(
    "%s: every edit-view field key is read by its engine dispatch",
    (type, fields) => {
      const handler = dispatchMap.get(type);
      expect(handler).toBeDefined();
      const consumed = fieldsRead(functionBody(engineSource, handler!));

      const unread = fields.map((f) => f.key).filter((key) => !consumed.has(key));
      expect(unread).toEqual([]);
    }
  );

  test.each(editEntries.map(([type, fields]) => [type, fields] as const))(
    "%s: field keys are unique and labelled",
    (type, fields) => {
      const keys = fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const field of fields) {
        expect(field.label.trim()).not.toBe("");
      }
    }
  );

  test("case.unreported.no_mnc uses the dispatch keys, not the pre-BUG-005 ones", () => {
    const keys = EDIT_FIELDS_BY_SOURCE_TYPE["case.unreported.no_mnc"]!.map((f) => f.key);
    // Regression pin for the known mismatch: caseName/judgeName were never
    // read by dispatchUnreportedNoMnc (it reads party1/party2 + judges +
    // fullDate|date, Rule 2.3.2).
    expect(keys).not.toContain("caseName");
    expect(keys).not.toContain("judgeName");
    expect(keys).toEqual(expect.arrayContaining(["party1", "party2", "judges", "date", "court"]));
  });

  test("case.reported exposes both parties (the original BUG-005 repro)", () => {
    const keys = EDIT_FIELDS_BY_SOURCE_TYPE["case.reported"]!.map((f) => f.key);
    expect(keys).toEqual(
      expect.arrayContaining(["party1", "party2", "year", "reportSeries", "startingPage"])
    );
    expect(keys).not.toContain("caseName");
  });
});

/**
 * Alias resolution (unreported-case court loaded blank regression).
 *
 * The edit form reads canonical keys (`court`, `caseNumber`), but other insert
 * paths store the same values under aliases the dispatcher also reads
 * (`courtId`/`courtIdentifier`, `decisionNumber`). applyFieldAliases must
 * surface those so the field loads its value instead of blank.
 */
describe("applyFieldAliases", () => {
  const mncFields = EDIT_FIELDS_BY_SOURCE_TYPE["case.unreported.mnc"]!;

  test("populates court from a courtId alias (paste-parsed unreported MNC case)", () => {
    const data = { party1: "Kyluk Pty Ltd", year: "2013", courtId: "NSWCCA", caseNumber: "114" };
    const resolved = applyFieldAliases(data, mncFields);
    expect(resolved.court).toBe("NSWCCA");
    // Canonical value already present must not be overwritten by an alias.
    expect(resolved.caseNumber).toBe("114");
  });

  test("does not overwrite a present canonical value with an alias", () => {
    const data = { court: "FCA", courtId: "HCA" };
    expect(applyFieldAliases(data, mncFields).court).toBe("FCA");
  });

  test("leaves fields without aliases untouched and returns a copy", () => {
    const data = { party1: "A" };
    const resolved = applyFieldAliases(data, mncFields);
    expect(resolved).not.toBe(data);
    expect(resolved.party1).toBe("A");
    expect(resolved.court).toBeUndefined();
  });

  test("every alias is a key the dispatcher for that type actually reads", () => {
    // Guards against reintroducing the BUG-005 class via an alias the engine
    // never consumes. Aliases must appear in the engine source as `d.<alias>`.
    for (const fields of Object.values(EDIT_FIELDS_BY_SOURCE_TYPE)) {
      for (const field of fields ?? []) {
        for (const alias of field.aliases ?? []) {
          expect(engineSource.includes(`d.${alias}`)).toBe(true);
        }
      }
    }
  });
});
