/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-010 — Interchange round trip per standard.
 *
 * Every standards fixture (tests/fixtures/standards/citations.ts) is exported
 * through each interchange codec (RIS, BibTeX, CSL-JSON, EndNote XML) with
 * the document on AGLC4, OSCOLA 5 and NZLSG 3, then re-imported through the
 * same preview pipeline the Import dialog uses. The suite is the
 * specification: it asserts the correct behaviour and marks the assertions
 * the current code fails with `test.failing` and the fix story:
 *
 * - STD-025 (shipped): the mapper restores a same-tool round trip exactly
 *   from the `obiter-field:` notes (no derived keys) and the formatted
 *   note carries the document standard's label, recognised on re-import
 *   under any label. Those assertions now run unmarked.
 * - STD-018: the export's bibliography leg now renders the entry in the
 *   document's standard (`formatBibliographyEntry(citation, config)`); the
 *   rows still open are those whose first-citation form waits on STD-016,
 *   STD-017 or STD-021.
 * - STD-020: dedupe legal keys ignore the medium neutral citation.
 * - STD-021 (shipped): the Waitangi Tribunal classification is derived from
 *   the record (source type, Wai number or the Tribunal named) rather than
 *   from a tag that never leaves the document.
 *
 * The export options mirror what `ExportDialog` receives from
 * `CitationLibrary.formatForExport`: the footnote from
 * `getFormattedPreview(citation, config)` and the bibliography from
 * `formatBibliographyEntry(citation, config)`, with `standardConfig.standardLabel`.
 * Word Source Manager XML is import-only and is not covered here.
 */

import { getFormattedPreview } from "../../src/engine/engine";
import { getStandardConfig } from "../../src/engine/standards";
import { formatBibliographyEntry } from "../../src/engine/rules/v4/general/bibliography";
import { userTags } from "../../src/engine/tags";
import { CitationStore } from "../../src/store/citationStore";
import {
  DedupeIndex,
  INTERCHANGE_DATA_KEY,
  citationsToRecords,
  commitImport,
  exportCitations,
  prepareImport,
} from "../../src/api/interchange";
import type { ImportPreview, InterchangeFormat } from "../../src/api/interchange";
import type { CitationInterchangeBag } from "../../src/api/interchange/model";
import type { Citation } from "../../src/types/citation";
import { FakeDocState, installFakeWord } from "../store/fakeWordHarness";
import {
  STANDARD_FIXTURES,
  echrBalogh,
  hansardNz,
  mlcPacey,
  nzBrooker,
  nzlcPrivacy,
  ukCorr,
  ukHra,
  ukSiRussia,
  waiKoAotearoa,
} from "../fixtures/standards/citations";
import { AGLC4_EXPECTATIONS } from "../fixtures/standards/aglc4";
import { OSCOLA5_EXPECTATIONS } from "../fixtures/standards/oscola5";
import { NZLSG3_EXPECTATIONS } from "../fixtures/standards/nzlsg3";
import type { ExpectationTable } from "../fixtures/standards/types";
import { bibliographyTexts, configFor, renderBibliography, renderFirst } from "../standards/runner";
import type { StandardKey } from "../standards/runner";

// ─── Matrix ─────────────────────────────────────────────────────────────────

type Format = Exclude<InterchangeFormat, "word-sources-xml">;

const FORMATS: readonly Format[] = ["ris", "bibtex", "csl-json", "endnote-xml"];
const STANDARDS: readonly StandardKey[] = ["aglc4", "oscola5", "nzlsg3"];

const NOW = "2026-09-22T00:00:00.000Z";
const STAMP = "2026-09-22";

const TABLES: Readonly<Record<StandardKey, ExpectationTable>> = {
  aglc4: AGLC4_EXPECTATIONS,
  oscola5: OSCOLA5_EXPECTATIONS,
  oscola4: [],
  nzlsg3: NZLSG3_EXPECTATIONS,
};

/**
 * Fields the OSCOLA dispatchers read (`OSCOLA_DISPATCH`; plan, Defects:
 * OSCOLA). None of them has a slot in any reference manager, so they must
 * travel as `obiter-field:` note lines.
 */
const UK_FIELDS: readonly string[] = [
  "neutralCitationYear",
  "neutralCitationCourt",
  "neutralCitationNumber",
  "ukLegislationType",
  "historicalSeries",
  "respondentState",
  "instrumentType",
  "legislationType",
];

/** Fields the NZLSG dispatchers read (`dispatchNzlsg`; plan, Defects: NZLSG). */
const NZ_FIELDS: readonly string[] = [
  "waiNumber",
  "minuteBookAbbrev",
  "minuteBookDistrict",
  "blockNumber",
  "shortBlockNumber",
  "shortCourtAbbrev",
  "shortPage",
  "nzpd",
  "billNumber",
  "reportType",
  "reportNumber",
  "treatyOfWaitangi",
  "parallelReport",
  "nzlsgStyle",
  "fileNumber",
  "decisionNumber",
];

const STANDARD_FIELDS: readonly string[] = [...UK_FIELDS, ...NZ_FIELDS];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** The call signature `test` and `test.failing` share. */
type TestCase = (name: string, fn?: jest.ProvidesCallback, timeout?: number) => void;

/**
 * `test.failing` when a known defect makes the assertion fail today; the
 * call site names the fix story. The assertion itself is always the correct
 * behaviour, so the case flips to green when the story ships.
 */
function testUnlessDefect(defect: boolean): TestCase {
  return defect ? test.failing : test;
}

/** What `CitationLibrary.renderCitationText` produces for the export footnote. */
function previewText(citation: Citation, standard: StandardKey): string {
  return getFormattedPreview(citation, configFor(standard))
    .map((r) => r.text)
    .join("");
}

/** What `CitationLibrary.formatForExport` produces for the bibliography leg. */
function bibliographyLeg(citation: Citation, standard: StandardKey): string | undefined {
  try {
    return formatBibliographyEntry(citation, configFor(standard))
      .map((r) => r.text)
      .join("");
  } catch {
    return undefined;
  }
}

/** The options `ExportDialog` passes when the document is on `standard`. */
function exportOptions(
  format: Format,
  standard: StandardKey
): Parameters<typeof exportCitations>[1] {
  return {
    format,
    formatCitation: (citation: Citation) => ({
      footnote: previewText(citation, standard),
      bibliography: bibliographyLeg(citation, standard),
    }),
    standardLabel: getStandardConfig(standard).standardLabel,
    dateStamp: STAMP,
  };
}

function exportUnder(citations: Citation[], format: Format, standard: StandardKey): string {
  return exportCitations(citations, exportOptions(format, standard)).text;
}

function reimport(text: string, format: Format, existing: Citation[]): ImportPreview {
  return prepareImport([{ text, formatHint: format }], { existing, aglcVersion: "4", now: NOW });
}

/**
 * Exports `citations` under `standard`, re-imports them against themselves
 * and returns the re-imported citation for each original id. Throws when a
 * record does not come back, so every caller sees the same failure.
 */
function roundTrip(
  citations: Citation[],
  format: Format,
  standard: StandardKey
): Map<string, Citation> {
  const preview = reimport(exportUnder(citations, format, standard), format, citations);
  const back = new Map<string, Citation>();
  for (const row of preview.rows) back.set(row.citation.id, row.citation);
  const missing = citations.filter((c) => !back.has(c.id)).map((c) => c.id);
  if (missing.length > 0) {
    throw new Error(`${format} under ${standard}: not re-imported: ${missing.join(", ")}`);
  }
  return back;
}

/** The citation's own data keys (the passthrough bag excluded). */
function ownData(citation: Citation): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(citation.data)) {
    if (key !== INTERCHANGE_DATA_KEY) out[key] = value;
  }
  return out;
}

function bagOf(citation: Citation): CitationInterchangeBag | undefined {
  const bag = citation.data[INTERCHANGE_DATA_KEY];
  return bag && typeof bag === "object" ? (bag as CitationInterchangeBag) : undefined;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** `"fx-uk-corr.neutralCitationYear: 2008 -> undefined"` for every differing key. */
function diffFields(
  original: Citation,
  back: Citation | undefined,
  keys: readonly string[]
): string[] {
  const out: string[] = [];
  for (const key of keys) {
    if (!(key in original.data)) continue;
    const was = original.data[key];
    const now = back?.data[key];
    if (!same(was, now)) {
      out.push(`${original.id}.${key}: ${JSON.stringify(was)} -> ${JSON.stringify(now)}`);
    }
  }
  return out;
}

/** The codecs escape XML and BibTeX specials; undo the common ones for text comparison. */
function unescapeForComparison(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function seededStore(citations: Citation[]): Promise<CitationStore> {
  const doc = new FakeDocState();
  installFakeWord(doc);
  const store = new CitationStore();
  await store.initStore();
  await store.addMany(citations);
  return store;
}

function sectionHeadings(citations: Citation[], standard: StandardKey): string[] {
  return renderBibliography(citations, standard).map((s) => s.heading);
}

// ─── 1. Every fixture, every format, every standard ─────────────────────────

describe.each(STANDARDS)("STD-010: round trip with the document on %s", (standard) => {
  describe.each(FORMATS)("%s", (format) => {
    test("every fixture exports and is recognised on re-import as the same source type", () => {
      const exported = exportCitations(STANDARD_FIXTURES.slice(), exportOptions(format, standard));
      expect(exported.records).toBe(STANDARD_FIXTURES.length);
      const preview = reimport(exported.text, format, STANDARD_FIXTURES.slice());
      expect(
        preview.rows.map((row) => ({
          id: row.duplicateOf?.id,
          roundTrip: row.roundTrip,
          sourceType: row.sourceType,
        }))
      ).toEqual(
        STANDARD_FIXTURES.map((c) => ({ id: c.id, roundTrip: true, sourceType: c.sourceType }))
      );
    });

    test("the fields the OSCOLA and NZLSG dispatchers read survive the round trip", () => {
      const back = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      const lost = STANDARD_FIXTURES.flatMap((c) => diffFields(c, back.get(c.id), STANDARD_FIELDS));
      expect(lost).toEqual([]);
    });

    test("every generic data field and the short title survive the round trip", () => {
      const back = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      const lost = STANDARD_FIXTURES.flatMap((c) => {
        const copy = back.get(c.id);
        const fields = diffFields(c, copy, Object.keys(c.data));
        if (copy?.shortTitle !== c.shortTitle) {
          fields.push(`${c.id}.shortTitle: ${c.shortTitle} -> ${copy?.shortTitle}`);
        }
        return fields;
      });
      expect(lost).toEqual([]);
    });

    // STD-025: a record carrying Obiter's round-trip provenance is restored
    // exactly from its `obiter-field:` notes; nothing is derived from the
    // native fields or the formatted note (DECISION-038 item 4).
    test("no data key is added by the round trip", () => {
      const back = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      const added = STANDARD_FIXTURES.flatMap((c) =>
        Object.keys(ownData(back.get(c.id) as Citation))
          .filter((key) => !(key in c.data))
          .map((key) => `${c.id}.+${key}: ${JSON.stringify(back.get(c.id)?.data[key])}`)
      );
      expect(added).toEqual([]);
    });

    // With the data restored exactly (STD-025) the rendering is identical
    // under every standard.
    test("every fixture renders identically after re-import", () => {
      const back = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      for (const original of STANDARD_FIXTURES) {
        const copy = back.get(original.id) as Citation;
        expect({ id: original.id, runs: renderFirst(copy, standard).runs }).toEqual({
          id: original.id,
          runs: renderFirst(original, standard).runs,
        });
      }
    });
  });
});

// ─── 2. The standard label on the formatted note ────────────────────────────

describe.each(STANDARDS)("STD-010: formatted note label with the document on %s", (standard) => {
  const label = getStandardConfig(standard).standardLabel;

  describe.each(FORMATS)("%s", (format) => {
    // Every writer labels the note with `record.formatted.standard`, which
    // the export options fill from the document standard (STD-025).
    test(`the note reads "${label} footnote:" followed by the citation rendered in that standard`, () => {
      const text = unescapeForComparison(exportUnder(STANDARD_FIXTURES.slice(), format, standard));
      for (const citation of STANDARD_FIXTURES) {
        const expected = `${label} footnote: ${previewText(citation, standard)}`;
        expect({ id: citation.id, hasNote: text.includes(expected), expected }).toEqual({
          id: citation.id,
          hasNote: true,
          expected,
        });
      }
      if (standard !== "aglc4") expect(text).not.toContain("AGLC4 footnote:");
    });

    // The formatted note is lifted out of the notes before any mapping and
    // a round trip restores the data from the field notes alone (STD-025),
    // so the label and the rendering it carries never reach the data.
    test("on re-import the label is ignored: same type and data as an AGLC4-labelled export", () => {
      const under = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      const aglc = roundTrip(STANDARD_FIXTURES.slice(), format, "aglc4");
      for (const c of STANDARD_FIXTURES) {
        const a = under.get(c.id) as Citation;
        const b = aglc.get(c.id) as Citation;
        expect({ id: c.id, sourceType: a.sourceType, data: ownData(a) }).toEqual({
          id: c.id,
          sourceType: b.sourceType,
          data: ownData(b),
        });
      }
    });

    // Every reader recognises "<label> footnote:" under any label
    // (mapper/formattedNote.ts) and lifts it out of the notes (STD-025).
    test("on re-import the formatted note is not kept as a passthrough note", () => {
      const back = roundTrip(STANDARD_FIXTURES.slice(), format, standard);
      const kept = STANDARD_FIXTURES.flatMap((c) =>
        (bagOf(back.get(c.id) as Citation)?.notes ?? [])
          .filter((n) => /\b(footnote|bibliography):/.test(n))
          .map((n) => `${c.id}: ${n.slice(0, 40)}`)
      );
      expect(kept).toEqual([]);
    });
  });

  // STD-018: the bibliography leg passes the document config, so the note
  // carries the standard's entry. Still failing under OSCOLA and NZLSG only
  // because some rows' first-citation forms wait on STD-016 (book, chapter,
  // thesis), STD-017 (web, ECtHR) and STD-021 (NZ/UK case and legislation
  // fields); the table rows record each remaining delta.
  testUnlessDefect(standard !== "aglc4")(
    "the bibliography note carries the entry in the active standard (expectation table rows)",
    () => {
      const rows = TABLES[standard].filter(
        (row) => row.scenario === "bibliography-entry" && !row.pending
      );
      expect(rows.length).toBeGreaterThan(0);
      const { records } = citationsToRecords(
        STANDARD_FIXTURES.slice(),
        exportOptions("csl-json", standard)
      );
      const byId = new Map(records.map((r) => [r.provenance.obiterId, r]));
      const mismatches = rows
        .map((row) => ({
          fixture: row.fixture,
          expected: row.expected,
          actual: byId.get(row.fixture)?.formatted?.bibliography,
        }))
        .filter((m) => m.actual !== m.expected);
      expect(mismatches).toEqual([]);
    }
  );
});

test.todo(
  "DECISION-040: NZLSG 3 Appendix 7 — whether the exported bibliography note for a Waitangi Tribunal report or a Māori Land Court decision carries the 'Cases' or the 'Reports' form (Unresolved 9)"
);
test.todo(
  "DECISION-040: OSCOLA 5 — whether the exported bibliography note for a case carries the Table of Cases form or the footnote form (rules 1.4, 2.1)"
);

// ─── 3. Waitangi Tribunal classification ────────────────────────────────────

describe.each(FORMATS)("STD-010: Waitangi Tribunal reports through %s", (format) => {
  test("report.waitangi_tribunal round-trips as that source type and sits in the NZLSG Waitangi Tribunal section", () => {
    const back = roundTrip([waiKoAotearoa], format, "nzlsg3").get(waiKoAotearoa.id) as Citation;
    expect(back.sourceType).toBe("report.waitangi_tribunal");
    expect(back.data.waiNumber).toBe(262);
    expect(sectionHeadings([back], "nzlsg3")).toEqual(["Waitangi Tribunal"]);
    expect(bibliographyTexts(renderBibliography([back], "nzlsg3"))).toEqual(
      bibliographyTexts(renderBibliography([waiKoAotearoa], "nzlsg3"))
    );
  });

  test("a generic report whose body says Waitangi Tribunal is classified without the type or the tag", () => {
    const bodyOnly: Citation = {
      ...waiKoAotearoa,
      id: "wai-body-only",
      sourceType: "report",
      data: {
        body: "Waitangi Tribunal",
        title: "Ko Aotearoa Tēnei",
        reportType: "Report",
        reportNumber: "Wai 262",
        year: 2011,
      },
      tags: [],
    };
    const back = roundTrip([bodyOnly], format, "nzlsg3").get(bodyOnly.id) as Citation;
    expect(back.sourceType).toBe("report");
    expect(back.tags).not.toContain("waitangi_tribunal");
    expect(sectionHeadings([back], "nzlsg3")).toEqual(["Waitangi Tribunal"]);
  });

  test("the waitangi_tribunal system tag never leaves the document (ENP-001)", () => {
    const tagged: Citation = { ...waiKoAotearoa, tags: ["waitangi_tribunal", "treaty-claims"] };
    const preview = reimport(exportUnder([tagged], format, "nzlsg3"), format, [tagged]);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].record.keywords).toEqual(["treaty-claims"]);
    expect(userTags(preview.rows[0].citation.tags)).toEqual(["treaty-claims"]);
  });

  // STD-021: the NZLSG bibliography classifies from the record itself (the
  // Tribunal's te reo name or the 'Wai n' report number here), so a report
  // the user once classified by tag alone keeps its section after the tag
  // is dropped in transit.
  test("a report the user classified by tag alone is still classified after the tag is dropped in transit (STD-021)", () => {
    const tagOnly: Citation = {
      ...waiKoAotearoa,
      id: "wai-tag-only",
      sourceType: "report",
      data: {
        body: "Te Rōpū Whakamana i te Tiriti o Waitangi",
        title: "Ko Aotearoa Tēnei",
        reportType: "Report",
        reportNumber: "Wai 262",
        year: 2011,
      },
      tags: ["waitangi_tribunal"],
    };
    expect(sectionHeadings([tagOnly], "nzlsg3")).toEqual(["Waitangi Tribunal"]);
    const back = roundTrip([tagOnly], format, "nzlsg3").get(tagOnly.id) as Citation;
    expect(sectionHeadings([back], "nzlsg3")).toEqual(["Waitangi Tribunal"]);
  });
});

// ─── 4. Update in place ─────────────────────────────────────────────────────

describe.each(STANDARDS)("STD-010: Update existing with the document on %s", (standard) => {
  const LIBRARY: Citation[] = [
    ukCorr,
    nzBrooker,
    mlcPacey,
    waiKoAotearoa,
    ukHra,
    ukSiRussia,
    hansardNz,
    nzlcPrivacy,
    echrBalogh,
  ].map((c) => ({ ...c, tags: ["remedies", "treaty-claims"] }));

  test.each(FORMATS)(
    "%s: a round trip committed as Update existing keeps the standard-specific fields and the user tags",
    async (format) => {
      const store = await seededStore(LIBRARY);
      const before: Citation[] = JSON.parse(JSON.stringify(store.getAll()));
      const preview = reimport(exportUnder(before, format, standard), format, store.getAll());
      expect(preview.rows.map((r) => r.roundTrip)).toEqual(before.map(() => true));
      for (const row of preview.rows) {
        row.include = true;
        row.update = true;
      }
      const result = await commitImport(preview, store);
      expect({ added: result.added, updated: result.updated }).toEqual({
        added: 0,
        updated: before.length,
      });

      // Rendering after the update is covered by the round-trip section
      // above (the derived keys on fx-nz-brooker and fx-mlc-pacey); here the
      // store's own copy is the reference for identity, fields and tags.
      const after = store.getAll();
      expect(after.map((c) => c.id).sort()).toEqual(before.map((c) => c.id).sort());
      const lost: string[] = [];
      for (const original of before) {
        const updated = after.find((c) => c.id === original.id) as Citation;
        expect({
          id: original.id,
          sourceType: updated.sourceType,
          createdAt: updated.createdAt,
        }).toEqual({
          id: original.id,
          sourceType: original.sourceType,
          createdAt: original.createdAt,
        });
        lost.push(...diffFields(original, updated, Object.keys(ownData(original))));
        expect({ id: original.id, tags: userTags(updated.tags) }).toEqual({
          id: original.id,
          tags: ["remedies", "treaty-claims"],
        });
      }
      expect(lost).toEqual([]);
    }
  );
});

// ─── 5. Dedupe by the legal key ─────────────────────────────────────────────

describe.each(FORMATS)("STD-010: duplicate detection through %s", (format) => {
  /** The MNC-only form of a case the library also holds by report citation. */
  function mncOnly(reported: Citation, id: string, court: string, number: number): Citation {
    const { party1, party2, year, jurisdiction } = reported.data;
    return {
      ...reported,
      id,
      sourceType: "case.unreported.mnc",
      data: {
        party1,
        party2,
        year,
        court,
        caseNumber: number,
        jurisdiction,
        neutralCitationYear: year,
        neutralCitationCourt: court,
        neutralCitationNumber: number,
      },
    };
  }

  describe.each([
    ["UK", "oscola5", ukCorr, "UKHL", 13],
    ["NZ", "nzlsg3", nzBrooker, "NZSC", 30],
  ] as const)("%s case under %s", (_label, standard, fixture, court, number) => {
    test("re-imported against a hand-entered copy it is a duplicate by the legal key, not a round trip", () => {
      const copy: Citation = { ...fixture, id: `${fixture.id}-copy` };
      const preview = reimport(exportUnder([fixture], format, standard), format, [copy]);
      expect(preview.rows).toHaveLength(1);
      const row = preview.rows[0];
      expect({
        duplicateOf: row.duplicateOf?.id,
        roundTrip: row.roundTrip,
        include: row.include,
      }).toEqual({
        duplicateOf: copy.id,
        roundTrip: false,
        include: false,
      });
      expect(new DedupeIndex([copy]).findRecord(row.record)?.kind).toBe("legal");
    });

    test("re-imported against the case stored by its neutral citation alone it is recognised as a duplicate", () => {
      const byMnc = mncOnly(fixture, `${fixture.id}-mnc`, court, number);
      const preview = reimport(exportUnder([fixture], format, standard), format, [byMnc]);
      expect(preview.rows).toHaveLength(1);
      expect({
        duplicateOf: preview.rows[0].duplicateOf?.id,
        roundTrip: preview.rows[0].roundTrip,
      }).toEqual({
        duplicateOf: byMnc.id,
        roundTrip: false,
      });
    });

    // The legal key of a reported case is its report citation only
    // (dedupe.ts buildDedupeKeyFromCitation / buildDedupeKeyFromRecord), so a
    // record carrying both matches the MNC-only form by the loose title key,
    // not by the neutral citation. STD-020 adds the MNC to the legal keys.
    test.failing(
      "the match against the neutral-citation form is by the legal key (STD-020)",
      () => {
        const byMnc = mncOnly(fixture, `${fixture.id}-mnc`, court, number);
        const preview = reimport(exportUnder([fixture], format, standard), format, [byMnc]);
        expect(new DedupeIndex([byMnc]).findRecord(preview.rows[0].record)?.kind).toBe("legal");
      }
    );
  });
});
