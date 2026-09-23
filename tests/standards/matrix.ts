/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-004 / STD-005 / STD-007 — the shared table driver for the standards
 * feature-matrix suites (references, pinpoints, bibliography).
 *
 * `runScenario` maps a scenario name from tests/fixtures/standards/README.md
 * onto the runner's rendering surfaces with the context the STD-002 capture
 * used; `runTable` turns every row of an expectation table into a Jest test:
 *
 * - `pending` rows become `test.todo` (a decision is awaited; never failed);
 * - rows whose `note` starts with "currently renders" become `test.failing`
 *   named for the Wave 2/3 story that must close the delta (`storyFor`);
 * - every other row is a plain `test` asserting the exact text.
 *
 * The `aglc4` and `aglc4-court` tables are engine captures (byte-identical
 * guards) and carry no "currently renders" notes, so every row there is a
 * plain test: a failure under those tables is a regression or a capture
 * error, never something to mark failing.
 *
 * Not a Jest test file — jest.config.js only matches *.test.ts.
 */

import type { Citation, Pinpoint } from "../../src/types/citation";
import { getFixture, maboReported, ukCorr } from "../fixtures/standards/citations";
import { AGLC4_EXPECTATIONS } from "../fixtures/standards/aglc4";
import { OSCOLA5_EXPECTATIONS } from "../fixtures/standards/oscola5";
import { OSCOLA4_EXPECTATIONS } from "../fixtures/standards/oscola4";
import { NZLSG3_EXPECTATIONS } from "../fixtures/standards/nzlsg3";
import { AGLC4_COURT_EXPECTATIONS } from "../fixtures/standards/aglc4-court";
import type { ExpectationRow, ExpectationTable } from "../fixtures/standards/types";
import {
  bibliographyTexts,
  renderBibliography,
  renderFirst,
  renderSubsequent,
  reportPending,
} from "./runner";
import type { CourtOptions, CourtPresetKey, ExpectationTableKey, StandardKey } from "./runner";

// ─── Tables ─────────────────────────────────────────────────────────────────

/**
 * The tables, imported statically so `runTable` can register tests
 * synchronously (Jest collects `test`/`describe` at module load; the
 * runner's async `loadExpectations` cannot feed that phase).
 */
const TABLES: Record<ExpectationTableKey, ExpectationTable> = {
  aglc4: AGLC4_EXPECTATIONS,
  oscola5: OSCOLA5_EXPECTATIONS,
  oscola4: OSCOLA4_EXPECTATIONS,
  nzlsg3: NZLSG3_EXPECTATIONS,
  "aglc4-court": AGLC4_COURT_EXPECTATIONS,
};

export const TABLE_KEYS: readonly ExpectationTableKey[] = [
  "aglc4",
  "oscola5",
  "oscola4",
  "nzlsg3",
  "aglc4-court",
];

/** The rows of a table (the static import behind the runner's `loadExpectations`). */
export function tableRows(key: ExpectationTableKey): ExpectationTable {
  return TABLES[key];
}

/** The standard a table renders under (the court table is AGLC4 in court mode). */
export function standardFor(key: ExpectationTableKey): StandardKey {
  return key === "aglc4-court" ? "aglc4" : key;
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

/** The occurrence-pinpoint suffixes a scenario may carry (`first+page`, …). */
export type PinpointKind = "page" | "paragraph" | "section" | "article" | "regulation";

/** The base scenarios (a scenario is `<base>` or `<base>+<PinpointKind>`). */
export type BaseScenario =
  | "first"
  | "parallel"
  | "subsequent-short"
  | "subsequent-ibid"
  | "bibliography-entry";

export interface ParsedScenario {
  /** Court preset when the row is keyed `PRESET:scenario` (court table only). */
  preset?: CourtPresetKey;
  base: BaseScenario;
  pinpoint?: PinpointKind;
}

const BASES: readonly BaseScenario[] = [
  "first",
  "parallel",
  "subsequent-short",
  "subsequent-ibid",
  "bibliography-entry",
];
const KINDS: readonly PinpointKind[] = ["page", "paragraph", "section", "article", "regulation"];

/** Splits `HCA:subsequent-short+page` into preset, base and pinpoint kind. Throws on an unknown name. */
export function parseScenario(scenario: string): ParsedScenario {
  const colon = scenario.indexOf(":");
  const preset = colon === -1 ? undefined : (scenario.slice(0, colon) as CourtPresetKey);
  const rest = colon === -1 ? scenario : scenario.slice(colon + 1);
  const plus = rest.indexOf("+");
  const base = (plus === -1 ? rest : rest.slice(0, plus)) as BaseScenario;
  const pinpoint = plus === -1 ? undefined : (rest.slice(plus + 1) as PinpointKind);
  if (!BASES.includes(base)) throw new Error(`Unknown scenario base in "${scenario}"`);
  if (pinpoint !== undefined && !KINDS.includes(pinpoint)) {
    throw new Error(`Unknown pinpoint kind in "${scenario}"`);
  }
  return { preset, base, pinpoint };
}

/** True when the scenario carries an occurrence pinpoint (`+page`, `+section`, …). */
export function hasPinpoint(scenario: string): boolean {
  return parseScenario(scenario).pinpoint !== undefined;
}

/**
 * The occurrence pinpoint each kind stands for (README "Scenarios": `42`,
 * `[42]`, `6`, `7`, `3`). Page and paragraph are the strings an occurrence
 * title stores (the runner decodes them by type); section, article and
 * regulation are typed, as the Insert form's pinpoint type picker stores
 * them — a bare "6" would decode as a page.
 */
export function scenarioPinpoint(kind: PinpointKind): string | Pinpoint {
  switch (kind) {
    case "page":
      return "42";
    case "paragraph":
      return "[42]";
    case "section":
      return { type: "section", value: "6" };
    case "article":
      return { type: "article", value: "7" };
    case "regulation":
      return { type: "regulation", value: "3" };
  }
}

/** Footnote numbers the README scenarios use. */
const FIRST_FOOTNOTE = 1;
const IBID_FOOTNOTE = 2;
const SHORT_FOOTNOTE = 3;

/**
 * The source cited in footnote 2 for a `subsequent-short` scenario ("a
 * different source cited in between"): Mabo, or Corr when the row is Mabo.
 */
export function interveningSource(citation: Citation): Citation {
  return citation.id === maboReported.id ? ukCorr : maboReported;
}

/**
 * Renders `row` under `standard` (or under `courtPreset` in court mode) with
 * the context the README describes for its scenario, and returns the plain
 * text. `courtPreset` overrides a preset carried in the scenario name.
 */
export function runScenario(
  row: ExpectationRow,
  standard: StandardKey,
  courtPreset?: CourtPresetKey
): string {
  const parsed = parseScenario(row.scenario);
  const preset = courtPreset ?? parsed.preset;
  const court: CourtOptions | undefined = preset ? { preset } : undefined;
  const citation = getFixture(row.fixture);
  const pinpoint = parsed.pinpoint === undefined ? undefined : scenarioPinpoint(parsed.pinpoint);

  switch (parsed.base) {
    case "first":
    case "parallel":
      // README: `parallel` is the first citation of a case stored with both a
      // report and an MNC — the same context as `first`; the standard (or the
      // court preset) decides whether the parallel citation is emitted.
      return renderFirst(citation, standard, { pinpoint, court }).text;

    case "subsequent-ibid":
      // Footnote 2, immediately after the full citation in footnote 1, which
      // cited this one source.
      return renderSubsequent(citation, standard, {
        previous: [citation],
        footnoteNumber: IBID_FOOTNOTE,
        firstFootnoteNumber: FIRST_FOOTNOTE,
        pinpoint,
        court,
      }).text;

    case "subsequent-short":
      // Footnote 3; footnote 2 cited a different source; preference "auto".
      return renderSubsequent(citation, standard, {
        previous: [interveningSource(citation)],
        footnoteNumber: SHORT_FOOTNOTE,
        firstFootnoteNumber: FIRST_FOOTNOTE,
        pinpoint,
        formatPreference: "auto",
        court,
      }).text;

    case "bibliography-entry": {
      // The single entry generateBibliographyForStandard produces for the
      // fixture alone (its section heading is described in `rule`).
      const texts = bibliographyTexts(renderBibliography([citation], standard, court));
      return texts.join("\n");
    }
  }
}

// ─── Story mapping ──────────────────────────────────────────────────────────

/** The Wave 2/3 stories a "currently renders" delta is assigned to. */
export type FixStory =
  | "STD-013"
  | "STD-014"
  | "STD-015"
  | "STD-016"
  | "STD-017"
  | "STD-018"
  | "STD-021";

/** Secondary source types STD-016 restyles per standard. */
const SECONDARY_TYPES: ReadonlySet<string> = new Set([
  "book",
  "book.chapter",
  "journal.article",
  "thesis",
  "internet_material",
]);

/** Source types whose per-standard formatter exists but is never wired (STD-017). */
const ORPHAN_TYPES: ReadonlySet<string> = new Set(["internet_material", "social_media"]);

/**
 * The plan story that owns a row's current delta, derived from the scenario
 * and the fixture's source type (one place, so the failing-test names stay
 * consistent across the three suites):
 *
 * - any `subsequent-*` scenario → STD-015 (standard-aware subsequent references);
 * - any remaining scenario with a pinpoint suffix → STD-014 (standard-aware pinpoints);
 * - `bibliography-entry` → STD-018 (bibliography entries per standard);
 * - `parallel` → STD-013 (config resolver / parallelOrder) in the court
 *   table, STD-014 under OSCOLA and NZLSG (the parallel form is composed
 *   with the pinpoint/comma rules of §2.1.3 / §3.2.2);
 * - `first` of an orphan-formatter type (website, social media; a thesis
 *   under OSCOLA) → STD-017 (wire the orphaned formatters);
 * - `first` of a secondary source (book, chapter, article, thesis, website)
 *   → STD-016 (standard-aware secondary sources);
 * - every other `first` → STD-021 (field mapping for UK/NZ cases and legislation).
 */
export function storyFor(row: ExpectationRow, table: ExpectationTableKey): FixStory {
  const { base, pinpoint } = parseScenario(row.scenario);
  const sourceType = getFixture(row.fixture).sourceType;
  if (base === "subsequent-short" || base === "subsequent-ibid") return "STD-015";
  if (pinpoint !== undefined) return "STD-014";
  if (base === "bibliography-entry") return "STD-018";
  if (base === "parallel") return table === "aglc4-court" ? "STD-013" : "STD-014";
  const isOscola = table === "oscola5" || table === "oscola4";
  if (ORPHAN_TYPES.has(sourceType) || (isOscola && sourceType === "thesis")) return "STD-017";
  if (SECONDARY_TYPES.has(sourceType)) return "STD-016";
  return "STD-021";
}

// ─── Row classification ─────────────────────────────────────────────────────

export type RowKind = "pending" | "failing" | "test";

const DELTA_PREFIX = "currently renders";

/** How `runTable` registers a row. A pending row is a todo even if it also records a delta. */
export function classifyRow(row: ExpectationRow, table: ExpectationTableKey): RowKind {
  if (typeof row.pending === "string" && row.pending.trim() !== "") return "pending";
  // The AGLC and court tables are captures; a delta note there would be a
  // table error, and a failure must surface as a real failure.
  if (table === "aglc4" || table === "aglc4-court") return "test";
  if (row.note?.startsWith(DELTA_PREFIX)) return "failing";
  return "test";
}

// ─── Table driver ───────────────────────────────────────────────────────────

/**
 * Registers one Jest test per row of `tableKey` whose scenario passes
 * `include` (default: every row), inside a `describe` named for the table.
 * Every test name carries the fixture, the scenario and `row.rule`; failing
 * tests are prefixed with the owning story. Pending rows are reported once
 * per table through the runner's `reportPending`.
 */
export function runTable(
  tableKey: ExpectationTableKey,
  include: (scenario: string) => boolean = () => true
): void {
  const standard = standardFor(tableKey);
  const rows = tableRows(tableKey).filter((row) => include(row.scenario));

  describe(`${tableKey} expectations`, () => {
    if (rows.length === 0) {
      test.todo(`${tableKey}: no rows for this suite's scenarios`);
      return;
    }

    test(`${tableKey}: pending rows are reported, never failed`, () => {
      const pending = reportPending(rows, tableKey);
      expect(pending.every((row) => typeof row.pending === "string")).toBe(true);
    });

    for (const row of rows) {
      const label = `${row.fixture} ${row.scenario}`;
      switch (classifyRow(row, tableKey)) {
        case "pending":
          test.todo(`${label}: ${row.pending ?? ""} — ${row.rule}`);
          break;
        case "failing":
          test.failing(`${storyFor(row, tableKey)}: ${label} — ${row.rule}`, () => {
            expect(runScenario(row, standard)).toBe(row.expected);
          });
          break;
        case "test":
          test(`${label} — ${row.rule}`, () => {
            expect(runScenario(row, standard)).toBe(row.expected);
          });
          break;
      }
    }
  });
}
