/**
 * @jest-environment jsdom
 *
 * STD-012 — Refresher end to end per standard.
 *
 * One nine-footnote document is refreshed through the real
 * `refreshAllCitations` (via the standards runner over the fake footnote
 * harness) under AGLC4, OSCOLA 5, OSCOLA 4, NZLSG 3, and AGLC4 in court mode
 * under the HCA and NSWCA presets:
 *
 *   fn1  the case, first citation (full)
 *   fn2  the case again, `auto` — ibid where the standard allows it
 *   fn3  the case, `short` with paragraph pinpoint [42]
 *   fn4  the book, first citation (full)
 *   fn5  the book, `short` with page pinpoint 12
 *   fn6  the case twice in one footnote ([42] then [50]) — AGLC 1.4.6 `at`
 *   fn7  an explanatory note (plain text child, never reformatted)
 *   fn8  the case, forced `full` — no short-title introduction repeated
 *   fn9  the case, `auto` with [42] immediately after the forced full
 *
 * Every test asserts the CORRECT rendering per the rule authority
 * (tests/fixtures/standards/<standard>.ts expectation tables and
 * docs/standards-rule-notes.md). Where the engine rendered something else
 * when the suite was written the assertion was kept and the test marked
 * `test.failing` with the fix story named in a comment: STD-014
 * (standard-aware pinpoints), STD-015 (standard-aware subsequent references
 * and first-citation suffix gating), STD-016 (standard-aware secondary
 * sources); the marks are removed as each story lands. Points the rule
 * authority does not settle are `test.todo("DECISION-040: …")`.
 *
 * The refresher's config path is already correct for court mode (it spreads
 * the store's court toggles through buildCourtConfig), so nothing here is
 * owned by STD-013; the HCA and NSWCA runs prove that path.
 */

import type { Citation, Pinpoint } from "../../src/types/citation";
import { refreshDocument } from "./runner";
import type {
  CourtOptions,
  FootnoteSpec,
  OccurrencePreference,
  RefreshedDocument,
  RenderedCitation,
  StandardKey,
} from "./runner";
import { bookLuntz, maboReported, nzBrooker, ukCorr } from "../fixtures/standards/citations";

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** The explanatory note the fixture library does not carry (plain text child). */
const NOTE_TEXT = "See generally the discussion in Part II.";
const explanatoryNote: Citation = {
  id: "fx-note",
  aglcVersion: "4",
  sourceType: "explanatory_note",
  data: { noteText: NOTE_TEXT },
  tags: [],
  createdAt: "2026-09-22T00:00:00Z",
  modifiedAt: "2026-09-22T00:00:00Z",
};

const PARA_42: Pinpoint = { type: "paragraph", value: "[42]" };
const PARA_50: Pinpoint = { type: "paragraph", value: "[50]" };
const PAGE_12: Pinpoint = { type: "page", value: "12" };

/** The document: nine footnotes, ten citation occurrences (fn6 holds two). */
function buildSpecs(caseId: string, bookId: string): FootnoteSpec[] {
  return [
    { citationId: caseId },
    { citationId: caseId, pref: "auto" },
    { citationId: caseId, pref: "short", pinpoint: "[42]" },
    { citationId: bookId },
    { citationId: bookId, pref: "short", pinpoint: "12" },
    {
      citationId: caseId,
      pinpoint: "[42]",
      additional: [{ citationId: caseId, pinpoint: "[50]" }],
    },
    { citationId: explanatoryNote.id },
    { citationId: caseId, pref: "full" },
    { citationId: caseId, pinpoint: "[42]" },
  ];
}

/** Occurrence index (into `rendered`) of each footnote's first citation. */
const FN = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 6.2: 6, 7: 7, 8: 8, 9: 9 } as const;

interface Run {
  label: string;
  standard: StandardKey;
  court?: CourtOptions;
  case: Citation;
}

const RUNS: Run[] = [
  { label: "aglc4", standard: "aglc4", case: maboReported },
  { label: "oscola5", standard: "oscola5", case: ukCorr },
  { label: "oscola4", standard: "oscola4", case: ukCorr },
  { label: "nzlsg3", standard: "nzlsg3", case: nzBrooker },
  { label: "aglc4 + HCA", standard: "aglc4", court: { preset: "HCA" }, case: maboReported },
  { label: "aglc4 + NSWCA", standard: "aglc4", court: { preset: "NSWCA" }, case: maboReported },
];

async function refresh(run: Run, specs = buildSpecs(run.case.id, bookLuntz.id)) {
  return refreshDocument(specs, [run.case, bookLuntz, explanatoryNote], run.standard, run.court);
}

/**
 * Re-seeds footnote specs from what the refresh rendered: the rebuild writes
 * `buildOccurrenceTitle(rendered.formatPreference, rendered.pinpoint)` into
 * every child CC (citationRefresher.executeRebuildChunk), so the next refresh
 * reads exactly these two fields back. Footnote text is left empty so the
 * second pass rebuilds rather than short-circuiting on an unchanged match.
 */
function reseed(specs: FootnoteSpec[], rendered: RenderedCitation[]): FootnoteSpec[] {
  let i = 0;
  const next = (citationId: string) => {
    const r = rendered[i++];
    if (r.citationId !== citationId) {
      throw new Error(`rendered occurrence ${i - 1} is ${r.citationId}, expected ${citationId}`);
    }
    return { citationId, pref: r.formatPreference as OccurrencePreference, pinpoint: r.pinpoint };
  };
  return specs.map((spec) => ({
    ...next(spec.citationId),
    additional: spec.additional?.map((occ) => next(occ.citationId)),
  }));
}

/** The `renderedFormat` label of every occurrence, in document order. */
function labels(doc: RefreshedDocument): string[] {
  return doc.rendered.map((r) => r.renderedFormat);
}

// ─── Full-citation strings (from the expectation tables) ───────────────────

const MABO_AGLC = "Mabo v Queensland (1992) 175 CLR 1";
const LUNTZ_AGLC =
  "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002)";
const CORR = "Corr v IBC Vehicles Ltd [2008] UKHL 13, [2008] 1 AC 884";
const LUNTZ_OSCOLA =
  "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)";
const BROOKER = "Brooker v Police [2007] NZSC 30, [2007] 3 NZLR 91";
const LUNTZ_NZLSG =
  "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002)";
/** Court mode composes report + MNC from a case that carries both (MULTI-003). */
const MABO_COURT = "Mabo v Queensland (1992) 175 CLR 1; [1992] HCA 23";

beforeEach(() => {
  localStorage.clear();
});

// ─── Invariants that hold under every standard and preset ──────────────────

describe.each(RUNS)("STD-012 refresh invariants under $label", (run) => {
  let doc: RefreshedDocument;
  let specs: FootnoteSpec[];

  beforeAll(async () => {
    specs = buildSpecs(run.case.id, bookLuntz.id);
    doc = await refresh(run, specs);
  });

  test("the refresh rebuilds every footnote with no failures and no user-edit flags", () => {
    expect(doc.result.failures).toEqual([]);
    expect(doc.result.userEdits).toEqual([]);
    expect(doc.result.lockedSkipped).toBe(0);
    expect(doc.footnotes).toHaveLength(9);
    expect(doc.rendered).toHaveLength(10);
  });

  test("effectivePinpoint is typed from the occurrence title ([42] paragraph, 12 page), never a page by default", () => {
    const pins = doc.rendered.map((r) => r.effectivePinpoint);
    expect(pins[FN[1]]).toBeUndefined();
    expect(pins[FN[2]]).toBeUndefined();
    expect(pins[FN[3]]).toEqual(PARA_42);
    expect(pins[FN[4]]).toBeUndefined();
    expect(pins[FN[5]]).toEqual(PAGE_12);
    expect(pins[FN[6]]).toEqual(PARA_42);
    expect(pins[FN[6.2]]).toEqual(PARA_50);
    expect(pins[FN[7]]).toBeUndefined();
    expect(pins[FN[8]]).toBeUndefined();
    expect(pins[FN[9]]).toEqual(PARA_42);
  });

  test("first citations of the case and the book are labelled full", () => {
    expect(doc.rendered[FN[1]].renderedFormat).toBe("full");
    expect(doc.rendered[FN[4]].renderedFormat).toBe("full");
  });

  test("an explanatory note is a plain-text child: rendered verbatim, labelled full, flagged isNote", () => {
    expect(doc.footnotes[6]).toBe(NOTE_TEXT);
    expect(doc.rendered[FN[7]].renderedFormat).toBe("full");
    expect(doc.rendered[FN[7]].isNote).toBe(true);
    expect(doc.rendered[FN[7]].runs.map((r) => r.text).join("")).toBe(NOTE_TEXT);
  });

  test("a forced full preference is labelled full and carries no pinpoint", () => {
    expect(doc.rendered[FN[8]].renderedFormat).toBe("full");
    expect(doc.rendered[FN[8]].formatPreference).toBe("full");
  });

  test("a second refresh re-seeded from the rendered titles yields identical text and typed pinpoints", async () => {
    const again = await refresh(run, reseed(specs, doc.rendered));
    expect(again.result.failures).toEqual([]);
    expect(again.result.userEdits).toEqual([]);
    expect(again.footnotes).toEqual(doc.footnotes);
    expect(again.rendered.map((r) => r.effectivePinpoint)).toEqual(
      doc.rendered.map((r) => r.effectivePinpoint)
    );
    expect(labels(again)).toEqual(labels(doc));
  });
});

// ─── AGLC4 (byte-identical guard: the tables pin current output) ───────────

describe("STD-012 aglc4", () => {
  const run = RUNS[0];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  test("fn1: full citation with the Rule 1.4.4 short-title introduction", () => {
    expect(doc.footnotes[0]).toBe(`${MABO_AGLC} (‘Mabo’).`);
  });

  test("fn2: Rule 1.4.3 ibid for the immediately preceding footnote, labelled ibid", () => {
    expect(doc.footnotes[1]).toBe("Ibid.");
    expect(doc.rendered[FN[2]].renderedFormat).toBe("ibid");
  });

  test("fn3: Rule 1.4.1 short form with a paragraph pinpoint 'Mabo (n 1) [42]', labelled short", () => {
    expect(doc.footnotes[2]).toBe("Mabo (n 1) [42].");
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  test("fn4: book full citation with the short-title introduction", () => {
    expect(doc.footnotes[3]).toBe(`${LUNTZ_AGLC} (‘Luntz’).`);
  });

  test("fn5: book short form with a page pinpoint 'Luntz (n 4) 12'", () => {
    expect(doc.footnotes[4]).toBe("Luntz (n 4) 12.");
    expect(doc.rendered[FN[5]].renderedFormat).toBe("short");
  });

  test("fn6: Rule 1.4.6 — the same source immediately after itself in one footnote uses 'at'", () => {
    expect(doc.footnotes[5]).toBe("Mabo (n 1) [42]; at [50].");
    expect(labels(doc).slice(FN[6], FN[6.2] + 1)).toEqual(["short", "short"]);
  });

  test("fn8: a forced full citation repeats no short-title introduction", () => {
    expect(doc.footnotes[7]).toBe(`${MABO_AGLC}.`);
  });

  test("fn9: ibid with a pinpoint after the forced full citation (Rule 1.4.3), labelled ibid", () => {
    expect(doc.footnotes[8]).toBe("Ibid [42].");
    expect(doc.rendered[FN[9]].renderedFormat).toBe("ibid");
  });
});

// ─── OSCOLA 5 ───────────────────────────────────────────────────────────────

describe("STD-012 oscola5", () => {
  const run = RUNS[1];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  // STD-015: the first-citation suffix is gated per standard; OSCOLA 5
  // §1.2.1/§2.1.2 does not declare a first-party short form.
  test("fn1: §2.1.1 full citation with no short-title introduction", () => {
    expect(doc.footnotes[0]).toBe(`${CORR}.`);
  });

  test("fn2: §1.2.3 ibid is not used — the immediately following footnote is 'Corr (n 1)', labelled short", () => {
    expect(doc.footnotes[1]).toBe("Corr (n 1).");
    expect(doc.rendered[FN[2]].renderedFormat).toBe("short");
  });

  test("fn3: §1.2.1 'Corr (n 1) [42]' — paragraph pinpoint after (n X) with no comma", () => {
    expect(doc.footnotes[2]).toBe("Corr (n 1) [42].");
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  // STD-016: OSCOLA 5 §3.2.1 (edition, publisher year) from the config;
  // STD-015: no short-form declaration for a book (§3.1.5).
  test("fn4: §3.2.1 book '(4th edn, LexisNexis Butterworths 2002)' with no short-title introduction", () => {
    expect(doc.footnotes[3]).toBe(`${LUNTZ_OSCOLA}.`);
  });

  test("fn5: §1.2.1 'Luntz (n 4) 12' — page after (n X) with no comma", () => {
    expect(doc.footnotes[4]).toBe("Luntz (n 4) 12.");
    expect(doc.rendered[FN[5]].renderedFormat).toBe("short");
  });

  // STD-015: OSCOLA has no AGLC 1.4.6 `at` gadget (§1.2.3 avoids such
  // cross-references); the repeated source takes the §1.2.1 form again.
  test("fn6: no AGLC 'at' construct for a repeated source within one footnote", () => {
    expect(doc.footnotes[5]).not.toContain("at [50]");
    expect(doc.footnotes[5]).toContain("[50]");
  });

  test.todo(
    "DECISION-040: OSCOLA 5 form of a second reference to the same source within one footnote ('Corr (n 1) [50]' or a combined pinpoint list 'Corr (n 1) [42], [50]')"
  );

  test("fn8: a forced full citation is the §2.1.1 citation with no suffix", () => {
    expect(doc.footnotes[7]).toBe(`${CORR}.`);
  });

  test("fn9: §1.2.3 no ibid even with a pinpoint immediately after the full citation — 'Corr (n 1) [42]'", () => {
    expect(doc.footnotes[8]).toBe("Corr (n 1) [42].");
    expect(doc.rendered[FN[9]].renderedFormat).toBe("short");
  });

  // STD-014: the standard-aware pinpoint formatter appends '[42]' with no
  // comma (§2.1.6 '[2001] 1 WLR 2112 [42]'); the suffix defect is fn1's.
  test("first citation with a paragraph pinpoint: §2.1.6 no comma before '[42]'", async () => {
    const one = await refresh(run, [{ citationId: ukCorr.id, pinpoint: "[42]" }]);
    expect(one.rendered[0].effectivePinpoint).toEqual(PARA_42);
    expect(one.footnotes[0]).toContain(`${CORR} [42]`);
  });
});

// ─── OSCOLA 4 ───────────────────────────────────────────────────────────────

describe("STD-012 oscola4", () => {
  const run = RUNS[2];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  // STD-015: as for OSCOLA 5, no declaration for a case.
  test("fn1: §2.1.1 full citation with no short-title introduction", () => {
    expect(doc.footnotes[0]).toBe(`${CORR}.`);
  });

  // STD-015: OSCOLA 4 §1.2.3 'ibid' is lower case and never capitalised
  // (`ibidStyle: "lowercase"`).
  test("fn2: §1.2.3 lower-case 'ibid' for the immediately preceding footnote", () => {
    expect(doc.footnotes[1]).toBe("ibid.");
  });

  // STD-015: the label and the text come from one engine call, so the
  // lower-case ibid is still labelled ibid.
  test("fn2: the ibid occurrence is labelled ibid", () => {
    expect(doc.rendered[FN[2]].renderedFormat).toBe("ibid");
  });

  test("fn3: §1.2.1 'Corr (n 1) [42]', labelled short", () => {
    expect(doc.footnotes[2]).toBe("Corr (n 1) [42].");
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  // STD-016: OSCOLA 4 §3.2.1 (edition, publisher year); STD-015: no suffix.
  test("fn4: §3.2.1 book '(4th edn, LexisNexis Butterworths 2002)' with no short-title introduction", () => {
    expect(doc.footnotes[3]).toBe(`${LUNTZ_OSCOLA}.`);
  });

  test("fn5: §1.2.1 'Luntz (n 4) 12'", () => {
    expect(doc.footnotes[4]).toBe("Luntz (n 4) 12.");
    expect(doc.rendered[FN[5]].renderedFormat).toBe("short");
  });

  // STD-015: no AGLC 1.4.6 `at` construct under OSCOLA 4 either.
  test("fn6: no AGLC 'at' construct for a repeated source within one footnote", () => {
    expect(doc.footnotes[5]).not.toContain("at [50]");
    expect(doc.footnotes[5]).toContain("[50]");
  });

  test("fn8: a forced full citation is the §2.1.1 citation with no suffix", () => {
    expect(doc.footnotes[7]).toBe(`${CORR}.`);
  });

  // STD-015: §1.2.1 'ibid [34]' — lower case with the pinpoint after a space.
  test("fn9: §1.2.1 'ibid [42]' immediately after the full citation", () => {
    expect(doc.footnotes[8]).toBe("ibid [42].");
  });

  test("fn9: the pinpointed ibid occurrence is labelled ibid", () => {
    expect(doc.rendered[FN[9]].renderedFormat).toBe("ibid");
  });
});

// ─── NZLSG 3 ────────────────────────────────────────────────────────────────

describe("STD-012 nzlsg3", () => {
  const run = RUNS[3];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  // STD-015: no first-citation suffix under NZLSG; §2.3.2 reference tags
  // are square-bracketed, optional and not written by the engine.
  test("fn1: §3.2 full citation with no short-title introduction", () => {
    expect(doc.footnotes[0]).toBe(`${BROOKER}.`);
  });

  test("fn2: §2.3.1 never ibid — 'Brooker, above n 1', labelled short", () => {
    expect(doc.footnotes[1]).toBe("Brooker, above n 1.");
    expect(doc.rendered[FN[2]].renderedFormat).toBe("short");
  });

  // STD-014: resolveNzlsgSubsequent renders the occurrence's typed pinpoint
  // (§2.3.1(a)(i)).
  test("fn3: §2.3.1(a)(i) 'Brooker, above n 1, at [42]' carries the occurrence pinpoint", () => {
    expect(doc.footnotes[2]).toBe("Brooker, above n 1, at [42].");
  });

  test("fn3: the pinpointed short occurrence is labelled short", () => {
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  // STD-015: the book renders per §6.1.1 with no short-title suffix.
  test("fn4: §6.1.1 book with no short-title introduction", () => {
    expect(doc.footnotes[3]).toBe(`${LUNTZ_NZLSG}.`);
  });

  test("fn4: the book's first citation body renders per §6.1.1", () => {
    expect(doc.footnotes[3]).toContain(LUNTZ_NZLSG);
  });

  // STD-014: the occurrence pinpoint is rendered (§2.3.1(a)(iii) 'Spiller, above n 21, at 70').
  test("fn5: §2.3.1(a)(iii) 'Luntz, above n 4, at 12'", () => {
    expect(doc.footnotes[4]).toBe("Luntz, above n 4, at 12.");
  });

  test("fn5: the pinpointed short occurrence is labelled short", () => {
    expect(doc.rendered[FN[5]].renderedFormat).toBe("short");
  });

  // STD-014: both occurrence pinpoints render with their own 'at' (§3.2.8);
  // whether the second reference repeats ', above n 1' is the todo below.
  test("fn6: each occurrence in the footnote renders its own 'at' pinpoint", () => {
    expect(doc.footnotes[5]).toContain("at [42]");
    expect(doc.footnotes[5]).toContain("at [50]");
  });

  test.todo(
    "DECISION-040: NZLSG 3 form of a second reference to the same source within one footnote (repeat ', above n 1, at [50]' or the §2.3.1(a) rule-1 pinpoint-only form)"
  );

  // STD-015: the NZLSG branch of the shared resolver honours
  // formatPreference, and the label comes from the same call as the text.
  test("fn8: a forced full preference renders the §3.2 full citation", () => {
    expect(doc.footnotes[7]).toBe(`${BROOKER}.`);
  });

  test("fn8: the forced full occurrence is labelled full", () => {
    expect(doc.rendered[FN[8]].renderedFormat).toBe("full");
  });

  // STD-015: §2.3.1(a) rule 1 — source obvious from the immediately
  // preceding footnote: only the capitalised pinpoint ('At [42].').
  test("fn9: §2.3.1(a) rule 1 pinpoint-only 'At [42]' immediately after the full citation", () => {
    expect(doc.footnotes[8]).toBe("At [42].");
  });

  test("first citation with a paragraph pinpoint: §3.2.8 'at [42]' after the report", async () => {
    // The suffix defect is fn1's; here only the pinpoint form is asserted.
    const one = await refresh(run, [{ citationId: nzBrooker.id, pinpoint: "[42]" }]);
    expect(one.rendered[0].effectivePinpoint).toEqual(PARA_42);
    expect(one.footnotes[0]).toContain(`${BROOKER} at [42]`);
  });
});

// ─── AGLC4 court mode: HCA preset ──────────────────────────────────────────

describe("STD-012 aglc4 + HCA preset", () => {
  const run = RUNS[4];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  test("fn1: parallelCitations mandatory — the MNC follows the authorised report (HCA PD 2 of 2024)", () => {
    expect(doc.footnotes[0]).toBe(`${MABO_COURT} (‘Mabo’).`);
    expect(doc.rendered[FN[1]].renderedFormat).toBe("full");
  });

  test("fn2: ibidSuppression on — the court short form 'Mabo', never Ibid, never (n X) (COURT-FIX-004, MULTI-014)", () => {
    expect(doc.footnotes[1]).toBe("Mabo.");
    expect(doc.footnotes[1]).not.toContain("Ibid");
    expect(doc.footnotes[1]).not.toContain("(n 1)");
    expect(doc.rendered[FN[2]].renderedFormat).toBe("short");
  });

  test("fn3: court short form with a paragraph pinpoint 'Mabo [42]'", () => {
    expect(doc.footnotes[2]).toBe("Mabo [42].");
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  test("fn5: court short form of the book carries the page with no (n X) (MULTI-014)", () => {
    expect(doc.footnotes[4]).toBe("Luntz 12.");
    expect(doc.footnotes[4]).not.toContain("(n 4)");
  });

  test("fn6: the repeated source in one footnote opens with the court short form, no (n X), no Ibid", () => {
    expect(doc.footnotes[5].startsWith("Mabo [42]; ")).toBe(true);
    expect(doc.footnotes[5]).not.toContain("(n 1)");
    expect(doc.footnotes[5]).not.toContain("Ibid");
    expect(doc.footnotes[5]).toContain("[50]");
  });

  test("fn8: a forced full citation keeps the parallel MNC and repeats no short-title introduction", () => {
    expect(doc.footnotes[7]).toBe(`${MABO_COURT}.`);
  });

  test("fn9: ibid suppressed even with a pinpoint immediately after the full citation — 'Mabo [42]'", () => {
    expect(doc.footnotes[8]).toBe("Mabo [42].");
    expect(doc.rendered[FN[9]].renderedFormat).toBe("short");
  });

  test("first citation with a paragraph pinpoint: pinpointStyle para-and-page 'CLR 1, [42]; [1992] HCA 23'", async () => {
    const one = await refresh(run, [{ citationId: maboReported.id, pinpoint: "[42]" }]);
    expect(one.rendered[0].effectivePinpoint).toEqual(PARA_42);
    expect(one.footnotes[0]).toBe(
      "Mabo v Queensland (1992) 175 CLR 1, [42]; [1992] HCA 23 (‘Mabo’)."
    );
  });

  test("the refresher reads the preset toggles from the store (parallel MNC and ibid suppression both applied)", () => {
    // The refresher's own config path — not the insert-path defect STD-013 fixes.
    expect(doc.store.getCourtJurisdiction()).toBe("HCA");
    expect(doc.store.getCourtToggles()).toMatchObject({
      parallelCitations: "mandatory",
      ibidSuppression: "on",
      pinpointStyle: "para-and-page",
    });
  });
});

// ─── AGLC4 court mode: NSWCA preset ────────────────────────────────────────

describe("STD-012 aglc4 + NSWCA preset", () => {
  const run = RUNS[5];
  let doc: RefreshedDocument;
  beforeAll(async () => {
    doc = await refresh(run);
  });

  test("fn1: parallelCitations preferred — the stored MNC follows the report (SC Gen 20)", () => {
    expect(doc.footnotes[0]).toBe(`${MABO_COURT} (‘Mabo’).`);
  });

  test("fn2: ibid suppressed — court short form 'Mabo'", () => {
    expect(doc.footnotes[1]).toBe("Mabo.");
    expect(doc.rendered[FN[2]].renderedFormat).toBe("short");
  });

  test("fn3: pinpointStyle para-only — the short form shows only the paragraph 'Mabo [42]'", () => {
    expect(doc.footnotes[2]).toBe("Mabo [42].");
    expect(doc.footnotes[2]).not.toMatch(/\d, \[42\]/);
    expect(doc.rendered[FN[3]].renderedFormat).toBe("short");
  });

  test("first citation with a paragraph pinpoint: para-only drops the starting page — 'CLR [42]; [1992] HCA 23'", async () => {
    const one = await refresh(run, [{ citationId: maboReported.id, pinpoint: "[42]" }]);
    expect(one.rendered[0].effectivePinpoint).toEqual(PARA_42);
    expect(one.footnotes[0]).toBe("Mabo v Queensland (1992) 175 CLR [42]; [1992] HCA 23 (‘Mabo’).");
    expect(one.footnotes[0]).not.toContain("CLR 1");
  });

  test("fn9: ibid suppressed with a pinpoint immediately after the full citation — 'Mabo [42]'", () => {
    expect(doc.footnotes[8]).toBe("Mabo [42].");
  });
});
