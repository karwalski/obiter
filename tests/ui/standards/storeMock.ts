/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * STD-009: the shared store mock and fixture citations for the
 * standard-parameterised UI suites in tests/ui/standards/.
 *
 * `mockStoreFor` returns the object shape the Library, Edit, Quote and
 * Settings views read from the shared CitationStore (every `store.*` member
 * `src/ui` calls, per `grep -rhoE "store\??\.[a-zA-Z]+\(" src/ui`), seeded
 * with a standard, a writing mode and the court toggles Settings writes for
 * a jurisdiction preset. Suites use it inside
 * `jest.mock("../../../src/store/singleton", …)` through a `mock`-prefixed
 * variable (the babel-jest factory rule), and mock
 * `src/store/devicePreferences` to return undefined so the views' device
 * `courtToggles` fallback never masks the store's value.
 *
 * Not a Jest test file — jest.config.js only matches *.test.ts(x).
 */

import type { Citation, SourceType } from "../../../src/types/citation";
import type { CitationStandardId, WritingMode } from "../../../src/engine/standards/types";
import { COURT_PRESETS } from "../../../src/engine/court/presets";

// ─── Store mock ─────────────────────────────────────────────────────────────

export interface MockStoreOptions {
  standardId: CitationStandardId;
  writingMode?: WritingMode;
  courtJurisdiction?: string;
  courtToggles?: Record<string, string>;
  citations: Citation[];
}

/** The members of CitationStore the views read, as jest mocks over a mutable list. */
export interface MockStore {
  getAll: jest.Mock<Citation[], []>;
  getById: jest.Mock<Citation | undefined, [string]>;
  getStandardId: jest.Mock<CitationStandardId, []>;
  getWritingMode: jest.Mock<WritingMode, []>;
  getCourtJurisdiction: jest.Mock<string | undefined, []>;
  getCourtToggles: jest.Mock<Record<string, string> | undefined, []>;
  getAglcVersion: jest.Mock<"4", []>;
  getDiagnostics: jest.Mock<{ status: string }, []>;
  getHeadingListId: jest.Mock<string | undefined, []>;
  getQuarantinedPartXml: jest.Mock<string | null, []>;
  isReadOnly: jest.Mock<boolean, []>;
  add: jest.Mock<Promise<void>, [Citation]>;
  addMany: jest.Mock<Promise<number>, [Citation[]]>;
  update: jest.Mock<Promise<void>, [Citation]>;
  updateMany: jest.Mock<Promise<number>, [Citation[]]>;
  remove: jest.Mock<Promise<void>, [string]>;
  setStandardId: jest.Mock<Promise<void>, [CitationStandardId]>;
  setWritingMode: jest.Mock<Promise<void>, [WritingMode]>;
  setCourtJurisdiction: jest.Mock<Promise<void>, [string | undefined]>;
  setCourtToggles: jest.Mock<Promise<void>, [Record<string, string> | undefined]>;
  setAglcVersion: jest.Mock<Promise<void>, [string]>;
  setHeadingListId: jest.Mock<Promise<void>, [string | undefined]>;
  takeSnapshot: jest.Mock<Promise<void>, [string?]>;
  restoreFromSnapshot: jest.Mock<Promise<void>, [unknown]>;
  /** The live citation list the getters read; suites may inspect it after a write. */
  citations: Citation[];
}

/**
 * A store seeded as Settings would seed it for `standardId` (academic by
 * default) or, with `writingMode: "court"`, for the jurisdiction and toggles
 * given. Writes mutate the seeded list so a view's reload sees them.
 */
export function mockStoreFor(opts: MockStoreOptions): MockStore {
  const state = {
    citations: [...opts.citations],
    standardId: opts.standardId,
    writingMode: opts.writingMode ?? "academic",
    courtJurisdiction: opts.courtJurisdiction,
    courtToggles: opts.courtToggles,
  };
  const store: MockStore = {
    citations: state.citations,
    getAll: jest.fn(() => state.citations),
    getById: jest.fn((id: string) => state.citations.find((c) => c.id === id)),
    getStandardId: jest.fn(() => state.standardId),
    getWritingMode: jest.fn(() => state.writingMode),
    getCourtJurisdiction: jest.fn(() => state.courtJurisdiction),
    getCourtToggles: jest.fn(() => state.courtToggles),
    getAglcVersion: jest.fn((): "4" => "4"),
    getDiagnostics: jest.fn(() => ({ status: "ok" })),
    getHeadingListId: jest.fn((): string | undefined => undefined),
    getQuarantinedPartXml: jest.fn((): string | null => null),
    isReadOnly: jest.fn(() => false),
    add: jest.fn(async (c: Citation) => {
      state.citations.push(c);
    }),
    addMany: jest.fn(async (cs: Citation[]) => {
      state.citations.push(...cs);
      return cs.length;
    }),
    update: jest.fn(async (c: Citation) => {
      const i = state.citations.findIndex((x) => x.id === c.id);
      if (i >= 0) state.citations[i] = c;
    }),
    updateMany: jest.fn(async (cs: Citation[]) => {
      for (const c of cs) {
        const i = state.citations.findIndex((x) => x.id === c.id);
        if (i >= 0) state.citations[i] = c;
      }
      return cs.length;
    }),
    remove: jest.fn(async (id: string) => {
      const i = state.citations.findIndex((x) => x.id === id);
      if (i >= 0) state.citations.splice(i, 1);
    }),
    setStandardId: jest.fn(async (id: CitationStandardId) => {
      state.standardId = id;
    }),
    setWritingMode: jest.fn(async (mode: WritingMode) => {
      state.writingMode = mode;
    }),
    setCourtJurisdiction: jest.fn(async (j: string | undefined) => {
      state.courtJurisdiction = j;
    }),
    setCourtToggles: jest.fn(async (t: Record<string, string> | undefined) => {
      state.courtToggles = t;
    }),
    setAglcVersion: jest.fn(async () => undefined),
    setHeadingListId: jest.fn(async () => undefined),
    takeSnapshot: jest.fn(async () => undefined),
    restoreFromSnapshot: jest.fn(async () => undefined),
  };
  return store;
}

// ─── Standards under test ───────────────────────────────────────────────────

/** The academic standards the STD-009 suites parameterise over. */
export type StandardKey = "aglc4" | "oscola5" | "nzlsg3";
export const STANDARDS: readonly StandardKey[] = ["aglc4", "oscola5", "nzlsg3"];

/**
 * The toggle record Settings writes for a court preset
 * (`handleJurisdictionChange`), mirroring tests/standards/runner.ts
 * `presetToggles` without pulling the refresher into a UI suite.
 */
export function presetToggles(preset: keyof typeof COURT_PRESETS): Record<string, string> {
  const p = COURT_PRESETS[preset];
  return {
    parallelCitations: p.parallelCitations,
    pinpointStyle: p.pinpointStyle,
    unreportedGate: p.unreportedGate,
    ibidSuppression: p.ibidSuppression,
    loaType: p.loaType,
    ...(p.parallelOrder ? { parallelOrder: p.parallelOrder } : {}),
  };
}

/** Store options for an AGLC4 document in court mode under the HCA preset. */
export function courtHca(citations: Citation[]): MockStoreOptions {
  return {
    standardId: "aglc4",
    writingMode: "court",
    courtJurisdiction: "HCA",
    courtToggles: presetToggles("HCA"),
    citations,
  };
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const STAMP = "2026-01-01T00:00:00.000Z";

function cite(
  id: string,
  sourceType: SourceType,
  data: Record<string, unknown>,
  overrides: Partial<Citation> = {}
): Citation {
  return {
    id,
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: STAMP,
    modifiedAt: STAMP,
    ...overrides,
  };
}

/** The same citation carrying a short title (AGLC 1.4.4 introduces it on first cite). */
export function withShortTitle(citation: Citation, shortTitle: string): Citation {
  return { ...citation, shortTitle };
}

/**
 * Mabo by authorised report, carrying the HCA medium neutral citation as a
 * parallel citation: academic AGLC4 renders the report alone (Rule 2.2.7);
 * court mode under HCA appends "; [1992] HCA 23".
 */
export const MABO_REPORTED: Citation = cite("mabo-rep", "case.reported", {
  party1: "Mabo",
  party2: "Queensland (No 2)",
  year: "1992",
  yearType: "round",
  volume: "175",
  reportSeries: "CLR",
  startingPage: "1",
  parallelCitations: [{ yearType: "square", year: 1992, reportSeries: "HCA", startingPage: 23 }],
});

/** Mabo by medium neutral citation, added a month later. */
export const MABO_MNC: Citation = cite(
  "mabo-mnc",
  "case.unreported.mnc",
  { party1: "Mabo", party2: "Queensland (No 2)", year: "1992", court: "HCA", caseNumber: "23" },
  { createdAt: "2026-02-01T00:00:00.000Z", modifiedAt: "2026-02-01T00:00:00.000Z" }
);

/**
 * A UK case with neutral citation and law report, in the flat form fields
 * the OSCOLA dispatcher reads (`neutralCitationYear/Court/Number` plus the
 * AGLC report fields). OSCOLA 5 rr 2.1.1–2.1.3 (rule quote in
 * src/engine/rules/oscola/cases.ts): "Corr v IBC Vehicles Ltd [2008] UKHL 15,
 * [2008] 1 AC 884", case name italic with a roman "v".
 */
export const CORR_REPORTED: Citation = cite("corr-rep", "case.reported", {
  party1: "Corr",
  party2: "IBC Vehicles Ltd",
  year: "2008",
  yearType: "square",
  volume: "1",
  reportSeries: "AC",
  startingPage: "884",
  neutralCitationYear: "2008",
  neutralCitationCourt: "UKHL",
  neutralCitationNumber: "15",
});

/** The same UK case by neutral citation alone (OSCOLA 2.1.2). */
export const CORR_NEUTRAL: Citation = cite(
  "corr-nc",
  "case.unreported.mnc",
  {
    party1: "Corr",
    party2: "IBC Vehicles Ltd",
    year: "2008",
    court: "UKHL",
    caseNumber: "15",
    neutralCitationYear: "2008",
    neutralCitationCourt: "UKHL",
    neutralCitationNumber: "15",
  },
  { createdAt: "2026-02-01T00:00:00.000Z", modifiedAt: "2026-02-01T00:00:00.000Z" }
);

/**
 * An NZ case by neutral citation, in the AGLC form fields (`court`,
 * `caseNumber`). NZLSG 3 r 3.2 (rule quote in src/engine/rules/nzlsg/cases.ts):
 * "R v Fonotia [2007] NZCA 188"; with the parallel report, ", [2007] 3 NZLR 338".
 */
export const FONOTIA: Citation = cite("fonotia", "case.unreported.mnc", {
  party1: "R",
  party2: "Fonotia",
  year: "2007",
  court: "NZCA",
  caseNumber: "188",
});

/**
 * A Waitangi Tribunal report. NZLSG 3 r 3.6 (rule quote in
 * src/engine/rules/nzlsg/waitangi.ts): "Waitangi Tribunal Ko Aotearoa Tēnei
 * (Wai 262, 2011)".
 */
export const WAITANGI_REPORT: Citation = cite("wai-262", "report.waitangi_tribunal", {
  title: "Ko Aotearoa Tēnei",
  waiNumber: "262",
  year: "2011",
});

/**
 * A Maori Land Court decision. NZLSG 3 r 3.5 (rule quote in
 * src/engine/rules/nzlsg/maori-land-court.ts): "Pomare – Peter Here Pomare
 * (2015) 103 Taitokerau MB 95".
 */
export const MLC_DECISION: Citation = cite("mlc-pomare", "case.quasi_judicial", {
  caseName: "Pomare – Peter Here Pomare",
  year: "2015",
  blockNumber: "103",
  minuteBookDistrict: "Taitokerau",
  minuteBookAbbrev: "MB",
  page: "95",
});

/** A book, standard-neutral filler for the library. */
export const EDELMAN_BOOK: Citation = cite("edelman", "book", {
  authors: [{ givenNames: "James", surname: "Edelman" }],
  title: "Unjust Enrichment",
  publisher: "Hart Publishing",
  year: 2016,
});

// ─── Expected renderings (full first citation, no closing stop) ─────────────

/** The case each standard's card scenario renders, with its expected text. */
export const CARD_CASE: Record<StandardKey, { citation: Citation; expected: string; rule: string }> = {
  aglc4: {
    citation: MABO_REPORTED,
    expected: "Mabo v Queensland (No 2) (1992) 175 CLR 1",
    rule: "AGLC4 r 2.2.1 (existing golden output; parallel MNC omitted, r 2.2.7)",
  },
  oscola5: {
    citation: CORR_REPORTED,
    expected: "Corr v IBC Vehicles Ltd [2008] UKHL 15, [2008] 1 AC 884",
    rule: "OSCOLA 5 rr 2.1.1–2.1.3 (src/engine/rules/oscola/cases.ts)",
  },
  nzlsg3: {
    citation: FONOTIA,
    expected: "R v Fonotia [2007] NZCA 188",
    rule: "NZLSG 3 r 3.2 (src/engine/rules/nzlsg/cases.ts)",
  },
};

/** Mabo with its parallel citation under court mode, HCA preset. */
export const MABO_COURT_HCA_TEXT = "Mabo v Queensland (No 2) (1992) 175 CLR 1; [1992] HCA 23";

/** Plain text of formatted runs. */
export function runsText(runs: ReadonlyArray<{ text: string }>): string {
  return runs.map((r) => r.text).join("");
}
