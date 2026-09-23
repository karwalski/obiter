/**
 * Standards runner (STD-001): one entry point per rendering surface, so the
 * standards suites (references, pinpoints, quotations, bibliography,
 * validator, refresh) exercise exactly the code paths the add-in uses and
 * never re-implement them.
 *
 * - `configFor` builds the CitationConfig the way `refreshAllCitations` does
 *   (STD-013 `buildDocumentConfig`: `buildCourtConfig({ ...getStandardConfig(id),
 *   writingMode }, toggles)` plus the preset's report hierarchy), with the
 *   toggles a court preset writes through Settings' `handleJurisdictionChange`.
 * - `renderFirst` / `renderSubsequent` go through `formatCitation` with the
 *   same CitationContext the refresher assembles per occurrence.
 * - `renderBibliography` goes through `generateBibliographyForStandard`.
 * - `refreshDocument` runs the real `refreshAllCitations` over the shared
 *   fake footnote harness with the store seeded as Settings would seed it.
 * - `loadExpectations` / `reportPending` read the expectation tables in
 *   tests/fixtures/standards/*.ts; a `pending` row is reported, never failed.
 *
 * Suites that call `refreshDocument` should declare `@jest-environment jsdom`
 * (the refresher reads device preferences from localStorage; the harness
 * falls back gracefully without it, but the DOM parse of the rebuilt HTML
 * is the reference decoder).
 *
 * Not a Jest test file — jest.config.js only matches *.test.ts.
 */

import { formatCitation } from "../../src/engine/engine";
import type { CitationContext } from "../../src/engine/engine";
import { buildDocumentConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import { COURT_PRESETS } from "../../src/engine/court/presets";
import { generateBibliographyForStandard } from "../../src/engine/rules/v4/general/bibliography";
import type { BibliographySection } from "../../src/engine/rules/v4/general/bibliography";
import { runsToPlainText } from "../../src/actions/citationService";
import {
  refreshAllCitations,
  renderFootnoteCitations,
  resolveOccurrencePinpoint,
} from "../../src/word/citationRefresher";
import type {
  FootnoteEntry,
  RefreshResult,
  RenderedCitation,
} from "../../src/word/citationRefresher";
import { buildOccurrenceTitle, parseOccurrenceTitle } from "../../src/word/footnoteManager";
import { CitationStore } from "../../src/store/citationStore";
import { serializeStore } from "../../src/store/xmlSerializer";
import type { Citation, Pinpoint } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";
import { FakeDocState, installFakeWord } from "../store/fakeWordHarness";
import { footnoteTexts, makeRefreshContext } from "../store/fakeFootnoteHarness";
import type { FootnoteSpec, OccurrencePreference } from "../store/fakeFootnoteHarness";

export type { FootnoteSpec, OccurrencePreference } from "../store/fakeFootnoteHarness";
export type { RenderedCitation, RefreshResult } from "../../src/word/citationRefresher";
export type { BibliographySection } from "../../src/engine/rules/v4/general/bibliography";

// ─── Keys ───────────────────────────────────────────────────────────────────

/** The standards under review (the store's `standardId`). */
export type StandardKey = "aglc4" | "oscola5" | "oscola4" | "nzlsg3";

/** The court presets the suite covers (a representative of each toggle mix). */
export type CourtPresetKey = "HCA" | "NSWCA" | "WASC" | "QSC" | "STATE_TRIBUNAL";

/** Court mode for a run: the jurisdiction preset plus any user toggle overrides. */
export interface CourtOptions {
  preset: CourtPresetKey;
  /** Toggle overrides layered over the preset (Settings' per-toggle controls). */
  overrides?: Record<string, string>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

/**
 * The toggle record Settings writes into the document for a preset
 * (`handleJurisdictionChange`), with any overrides layered on top the way
 * `handleToggleOverride` does. `parallelOrder` is present only when the
 * preset declares it (WA).
 */
export function presetToggles(
  preset: CourtPresetKey,
  overrides?: Record<string, string>
): Record<string, string> {
  const p = COURT_PRESETS[preset];
  return {
    parallelCitations: p.parallelCitations,
    pinpointStyle: p.pinpointStyle,
    unreportedGate: p.unreportedGate,
    ibidSuppression: p.ibidSuppression,
    loaType: p.loaType,
    ...(p.parallelOrder ? { parallelOrder: p.parallelOrder } : {}),
    ...(overrides ?? {}),
  };
}

/**
 * The CitationConfig the refresher builds for a document on `standard`,
 * in academic mode (no `court`) or in court mode under the given preset.
 * Mirrors `refreshAllCitations` exactly: STD-013 `buildDocumentConfig` with
 * the preset id as the jurisdiction (the preset keys are jurisdiction ids).
 */
export function configFor(standard: StandardKey, court?: CourtOptions): CitationConfig {
  return buildDocumentConfig({
    standardId: standard,
    writingMode: court ? "court" : "academic",
    courtJurisdiction: court?.preset,
    courtToggles: court ? presetToggles(court.preset, court.overrides) : undefined,
  });
}

// ─── Single-citation rendering ──────────────────────────────────────────────

/** Formatted runs plus their plain text (italic/bold markers dropped). */
export interface Rendered {
  runs: FormattedRun[];
  text: string;
}

/**
 * The typed pinpoint an occurrence renders with, resolved the way the
 * refresher resolves it: a string is decoded by type (`[42]` paragraph,
 * `s 5` section, bare `42` page) and wins over the citation's stored
 * pinpoint; no pinpoint falls back to the stored one.
 */
function occurrencePinpoint(
  citation: Citation,
  pinpoint: string | Pinpoint | undefined
): Pinpoint | undefined {
  if (typeof pinpoint === "object") return pinpoint;
  return resolveOccurrencePinpoint(pinpoint, citation.data.pinpoint);
}

function render(citation: Citation, context: CitationContext, config: CitationConfig): Rendered {
  const runs = formatCitation(citation, context, config);
  return { runs, text: runsToPlainText(runs) };
}

/**
 * Renders the first occurrence of `citation` (footnote 1) under `standard`,
 * without closing punctuation — exactly what the refresher writes into the
 * child CC of a first-cited footnote.
 */
export function renderFirst(
  citation: Citation,
  standard: StandardKey,
  opts: { pinpoint?: string | Pinpoint; court?: CourtOptions } = {}
): Rendered {
  const context: CitationContext = {
    footnoteNumber: 1,
    isFirstCitation: true,
    isSameAsPreceding: false,
    precedingFootnoteCitationCount: 0,
    currentPinpoint: occurrencePinpoint(citation, opts.pinpoint),
    firstFootnoteNumber: 1,
    isWithinSameFootnote: false,
    formatPreference: "auto",
  };
  return render(citation, context, configFor(standard, opts.court));
}

export interface SubsequentOptions {
  /**
   * The citations of the footnotes before this one, one per footnote in
   * document order; the last entry is the immediately preceding footnote.
   * Ibid eligibility follows from it (same source in the preceding
   * footnote, which cites one source).
   */
  previous: Citation[];
  /** This occurrence's footnote number. */
  footnoteNumber: number;
  /** The footnote where `citation` was first cited (the `(n X)` target). */
  firstFootnoteNumber: number;
  pinpoint?: string | Pinpoint;
  /** The pinpoint the preceding footnote rendered with (ibid comparison). */
  precedingPinpoint?: string | Pinpoint;
  formatPreference?: OccurrencePreference;
  /** True when the immediately preceding citation in the same footnote is this source. */
  withinSameFootnote?: boolean;
  court?: CourtOptions;
}

/**
 * Renders a subsequent occurrence of `citation` under `standard` with the
 * CitationContext the refresher would assemble for it.
 */
export function renderSubsequent(
  citation: Citation,
  standard: StandardKey,
  opts: SubsequentOptions
): Rendered {
  const preceding = opts.previous[opts.previous.length - 1];
  const context: CitationContext = {
    footnoteNumber: opts.footnoteNumber,
    isFirstCitation: false,
    isSameAsPreceding: preceding !== undefined && preceding.id === citation.id,
    precedingFootnoteCitationCount: preceding === undefined ? 0 : 1,
    precedingPinpoint:
      preceding === undefined ? undefined : occurrencePinpoint(preceding, opts.precedingPinpoint),
    currentPinpoint: occurrencePinpoint(citation, opts.pinpoint),
    firstFootnoteNumber: opts.firstFootnoteNumber,
    isWithinSameFootnote: opts.withinSameFootnote ?? false,
    formatPreference: opts.formatPreference ?? "auto",
  };
  return render(citation, context, configFor(standard, opts.court));
}

// ─── Bibliography ───────────────────────────────────────────────────────────

/**
 * The bibliography (or, in court mode, the List of Authorities) for
 * `citations` under `standard`, through the same entry point the
 * Bibliography view and the export use.
 */
export function renderBibliography(
  citations: Citation[],
  standard: StandardKey,
  court?: CourtOptions
): BibliographySection[] {
  const config = configFor(standard, court);
  return generateBibliographyForStandard(
    citations,
    config.bibliographyStructure,
    config.writingMode,
    config.loaType,
    config
  );
}

/** Plain text of every entry in every section, in order. */
export function bibliographyTexts(sections: BibliographySection[]): string[] {
  return sections.flatMap((section) => section.entries.map(runsToPlainText));
}

// ─── Document refresh ───────────────────────────────────────────────────────

/** The refresher never rebuilds without a snapshot; the runner supplies a no-op hook. */
const noopHook = async (): Promise<void> => undefined;

export interface RefreshedDocument {
  /** The text of each footnote after the refresh (closing punctuation included). */
  footnotes: string[];
  /**
   * Every rendered occurrence in document order, as the refresher's pure
   * render phase produces it (runs without closing punctuation, the
   * `renderedFormat` label, the effective pinpoint).
   */
  rendered: RenderedCitation[];
  /** The refresher's own counts and reports. */
  result: RefreshResult;
  /** The store the refresh ran against (first-footnote numbers updated). */
  store: CitationStore;
}

/**
 * Runs the real `refreshAllCitations` over a fake document whose footnotes
 * are `specs`, with the store seeded with `citations` and the document
 * metadata (standard, writing mode, jurisdiction, toggles) exactly as
 * Settings writes it.
 */
export async function refreshDocument(
  specs: FootnoteSpec[],
  citations: Citation[],
  standard: StandardKey,
  court?: CourtOptions
): Promise<RefreshedDocument> {
  const doc = new FakeDocState();
  doc.addPart(serializeStore(citations));
  installFakeWord(doc);

  const store = new CitationStore();
  await store.initStore();
  await store.setStandardId(standard);
  await store.setWritingMode(court ? "court" : "academic");
  if (court) {
    await store.setCourtJurisdiction(court.preset);
    await store.setCourtToggles(presetToggles(court.preset, court.overrides));
  }

  const fake = makeRefreshContext(doc, specs);
  const result = await refreshAllCitations(fake.context, store, noopHook);

  return {
    footnotes: footnoteTexts(fake),
    rendered: renderPure(specs, store, configFor(standard, court)),
    result,
    store,
  };
}

/**
 * The refresher's pure render phase over `specs` (renderFootnoteCitations
 * threaded footnote by footnote as `renderAndRebuild` threads it), so a
 * suite can inspect the per-occurrence `RenderedCitation` the refresh wrote.
 */
function renderPure(
  specs: FootnoteSpec[],
  store: CitationStore,
  config: CitationConfig
): RenderedCitation[] {
  const entries: FootnoteEntry[] = specs.map((spec, i) => {
    const footnoteNumber = i + 1;
    const occurrences = [spec, ...(spec.additional ?? [])];
    return {
      parentCC: {} as Word.ContentControl,
      footnoteNumber,
      isLocked: false,
      children: occurrences.map((occ) => {
        const ccTitle = buildOccurrenceTitle(occ.pref ?? "auto", occ.pinpoint);
        const parsed = parseOccurrenceTitle(ccTitle);
        return {
          citationId: occ.citationId,
          footnoteNumber,
          pinpoint: parsed.pinpoint,
          formatPreference: parsed.formatPreference,
          ccTitle,
        };
      }),
    };
  });

  const footnoteMap = new Map<string, number>();
  for (const entry of entries) {
    for (const child of entry.children) {
      if (!footnoteMap.has(child.citationId))
        footnoteMap.set(child.citationId, entry.footnoteNumber);
    }
  }

  const seen = new Set<string>();
  let prevNumber = 0;
  let prevIds: string[] = [];
  let prevPinpoint: Pinpoint | undefined;
  const out: RenderedCitation[] = [];
  for (const entry of entries) {
    const currentIds: string[] = [];
    const rendered = renderFootnoteCitations(
      entry,
      store,
      config,
      footnoteMap,
      seen,
      currentIds,
      prevNumber,
      prevIds,
      prevPinpoint
    );
    prevNumber = entry.footnoteNumber;
    prevIds = [...currentIds];
    if (rendered.length === 0) continue;
    prevPinpoint = rendered[rendered.length - 1].effectivePinpoint;
    out.push(...rendered);
  }
  return out;
}

// ─── Expectation tables ─────────────────────────────────────────────────────

/** One row of an expectation table in tests/fixtures/standards/<key>.ts. */
export interface ExpectationRow {
  /** Name of the fixture citation in tests/fixtures/standards/citations.ts. */
  fixture: string;
  /** What is rendered: e.g. "first", "subsequent", "ibid", "bibliography". */
  scenario: string;
  /** The exact expected plain text. */
  expected: string;
  /** The rule relied on (e.g. "OSCOLA 5 r 2.1.1", "NZLSG 3 r 3.2"). */
  rule: string;
  /** Where the expectation was verified (PDF page, URL, repo file). */
  source: string;
  /**
   * When set, the row is a pending decision (e.g. "DECISION-040 item 3"):
   * the runner reports it and a suite must not fail on it.
   */
  pending?: string;
}

/** The expectation tables: one per standard, plus the court presets under AGLC4. */
export type ExpectationTableKey = StandardKey | "aglc4-court";

function isExpectationRow(value: unknown): value is ExpectationRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.fixture === "string" &&
    typeof row.scenario === "string" &&
    typeof row.expected === "string" &&
    typeof row.rule === "string" &&
    typeof row.source === "string"
  );
}

/**
 * Loads the expectation table for `key` from tests/fixtures/standards/<key>.ts.
 * The module's default export is used when present, otherwise its first
 * exported array of rows.
 */
export async function loadExpectations(key: ExpectationTableKey): Promise<ExpectationRow[]> {
  const mod = (await import(`../fixtures/standards/${key}`)) as Record<string, unknown>;
  const candidates = [mod.default, ...Object.values(mod)];
  const table = candidates.find((value) => Array.isArray(value) && value.every(isExpectationRow));
  if (!table) {
    throw new Error(
      `tests/fixtures/standards/${key}.ts exports no ExpectationRow[] table (default or named export)`
    );
  }
  return table as ExpectationRow[];
}

/** The rows of `rows` that carry a `pending` decision. */
export function pendingRows(rows: ExpectationRow[]): ExpectationRow[] {
  return rows.filter((row) => typeof row.pending === "string" && row.pending.trim() !== "");
}

/**
 * Prints the pending rows of a table with `console.info` as a text table
 * (fixture | scenario | pending | rule) so the run shows every expectation
 * awaiting a decision. Returns the pending rows; prints nothing when there
 * are none.
 */
export function reportPending(rows: ExpectationRow[], label = "expectations"): ExpectationRow[] {
  const pending = pendingRows(rows);
  if (pending.length === 0) return pending;

  const columns: Array<[string, (row: ExpectationRow) => string]> = [
    ["fixture", (row) => row.fixture],
    ["scenario", (row) => row.scenario],
    ["pending", (row) => row.pending ?? ""],
    ["rule", (row) => row.rule],
  ];
  const widths = columns.map(([heading, cell]) =>
    Math.max(heading.length, ...pending.map((row) => cell(row).length))
  );
  const line = (cells: string[]): string =>
    cells.map((cell, i) => cell.padEnd(widths[i])).join(" | ");
  const table = [
    line(columns.map(([heading]) => heading)),
    widths.map((w) => "-".repeat(w)).join("-+-"),
    ...pending.map((row) => line(columns.map(([, cell]) => cell(row)))),
  ].join("\n");

  console.info(`Pending decisions in ${label} (${pending.length} row(s), not failed):\n${table}`);
  return pending;
}
