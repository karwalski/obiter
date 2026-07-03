/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * Rule exporter consistency tests (PARITY-118, RESEARCH-005).
 *
 * The exported SOURCE_TYPE_METADATA is the machine-readable contract other
 * tools (and the Copilot action catalogue) rely on, so it must stay in sync
 * with the engine dispatcher. These tests statically parse
 * src/engine/engine.ts to verify:
 *
 *   1. every SOURCE_DISPATCH key has a metadata entry, and vice versa;
 *   2. every declared required/optional field is actually read by the
 *      dispatch function that handles the type (so data shaped per the
 *      published schema cannot be silently ignored at the dispatch boundary);
 *   3. structural invariants (no duplicates, no required/optional overlap,
 *      non-empty rule numbers/labels/templates);
 *   4. docs/aglc4-rules.json was regenerated after the last metadata change.
 */

import * as fs from "fs";
import * as path from "path";
import { exportRuleReference } from "../../src/engine/ruleExporter";

const ENGINE_PATH = path.resolve(__dirname, "../../src/engine/engine.ts");
const RULES_JSON_PATH = path.resolve(__dirname, "../../docs/aglc4-rules.json");

const engineSource = fs.readFileSync(ENGINE_PATH, "utf-8");
const reference = exportRuleReference();
const sourceTypes = reference.sourceTypes;

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

/**
 * Shared helper functions whose field reads count towards a dispatch
 * function's consumed fields (the foreign dispatcher delegates to these).
 */
const SHARED_HELPERS: Record<string, string[]> = {
  dispatchForeign: ["dispatchForeignCase", "dispatchForeignLegislation", "parseForeignCaseCore"],
};

function consumedFields(handler: string): Set<string> {
  let body = functionBody(engineSource, handler);
  for (const helper of SHARED_HELPERS[handler] ?? []) {
    body += functionBody(engineSource, helper);
  }
  return fieldsRead(body);
}

describe("SOURCE_TYPE_METADATA <-> SOURCE_DISPATCH consistency (PARITY-118)", () => {
  test("parses a non-trivial dispatch map from engine.ts", () => {
    expect(dispatchMap.size).toBeGreaterThan(70);
  });

  test("every dispatch key has a metadata entry", () => {
    const metadataTypes = new Set(sourceTypes.map((st) => st.type));
    const missing = [...dispatchMap.keys()].filter((k) => !metadataTypes.has(k));
    expect(missing).toEqual([]);
  });

  test("every metadata entry has a dispatch key", () => {
    const orphaned = sourceTypes.map((st) => st.type).filter((t) => !dispatchMap.has(t));
    expect(orphaned).toEqual([]);
  });

  test("metadata has no duplicate source types", () => {
    const types = sourceTypes.map((st) => st.type);
    expect(new Set(types).size).toBe(types.length);
  });

  test.each(sourceTypes.map((st) => [st.type, st] as const))(
    "%s: declared fields are read by its dispatch function",
    (type, meta) => {
      const handler = dispatchMap.get(type);
      expect(handler).toBeDefined();
      const consumed = consumedFields(handler!);

      const declared = [...meta.requiredFields, ...meta.optionalFields];
      const unread = declared.filter((f) => !consumed.has(f));
      expect(unread).toEqual([]);
    }
  );

  test.each(sourceTypes.map((st) => [st.type, st] as const))(
    "%s: structural invariants hold",
    (type, meta) => {
      expect(meta.ruleNumber.trim()).not.toBe("");
      expect(meta.label.trim()).not.toBe("");
      expect(meta.category.trim()).not.toBe("");
      expect(meta.formatTemplate.trim()).not.toBe("");
      // A field must not be both required and optional.
      const overlap = meta.requiredFields.filter((f) => meta.optionalFields.includes(f));
      expect(overlap).toEqual([]);
      // No duplicate field declarations.
      const all = [...meta.requiredFields, ...meta.optionalFields];
      expect(new Set(all).size).toBe(all.length);
    }
  );

  test("placeholder templates have been eliminated", () => {
    const placeholders = sourceTypes.filter((st) =>
      /^See AGLC4 Rule .* for format details\.$/.test(st.formatTemplate)
    );
    expect(placeholders).toEqual([]);
  });

  test("non-AGLC4 types are labelled honestly", () => {
    const byType = new Map(sourceTypes.map((st) => [st.type, st]));
    expect(byType.get("genai_output")!.ruleNumber).toBe("MULR interim guidance (non-AGLC4)");
    expect(byType.get("book.ebook")!.ruleNumber).toContain("Obiter extension");
    expect(byType.get("report.waitangi_tribunal")!.ruleNumber).toContain("NZLSG");
  });

  test("previously missing types are now exported", () => {
    const types = new Set(sourceTypes.map((st) => st.type));
    for (const t of ["book.ebook", "report.waitangi_tribunal", "treaty.mou", "periodical"]) {
      expect(types.has(t)).toBe(true);
    }
  });
});

describe("docs/aglc4-rules.json regeneration (scripts/export-rules.ts)", () => {
  test("checked-in JSON matches the current metadata (run npm run export-rules after edits)", () => {
    const json = JSON.parse(fs.readFileSync(RULES_JSON_PATH, "utf-8")) as {
      sourceTypes: typeof sourceTypes;
    };
    expect(json.sourceTypes).toEqual(sourceTypes);
  });
});
