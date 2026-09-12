/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * INTEROP-010: import and export pipelines, dedupe, and the BibTeX shim.
 */

import { CitationStore } from "../../../src/store/citationStore";
import { FakeDocState, installFakeWord, makeCitation } from "../../store/fakeWordHarness";
import {
  commitImport,
  exportCitations,
  prepareImport,
  retypeRow,
} from "../../../src/api/interchange";
import {
  DedupeIndex,
  normaliseDoi,
  normaliseIsbn,
  normaliseForMatch,
} from "../../../src/api/interchange/dedupe";
import { importBibTeX, mapBibEntryToObiter, parseBibTeX } from "../../../src/api/bibtexImporter";
import type { Citation } from "../../../src/types/citation";

const RIS = `TY  - CASE
TI  - Mabo v Queensland (No 2)
A2  - CLR
VL  - 175
SP  - 1
PB  - High Court of Australia
DA  - 1992/06/03/
ER  -
TY  - JOUR
AU  - Luntz, Harold
TI  - A Personal Journey through the Law of Torts
JO  - Sydney Law Review
VL  - 27
IS  - 3
SP  - 393
PY  - 2005
DO  - 10.1000/slr.393
ER  -
TY  - BOOK
TI  - Untitled Fragment
ER  -
`;

const OPTS = {
  existing: [] as Citation[],
  aglcVersion: "4" as const,
  now: "2026-09-12T00:00:00.000Z",
};

describe("dedupe helpers", () => {
  test("normalisers", () => {
    expect(normaliseDoi("https://doi.org/10.1000/ABC")).toBe("10.1000/abc");
    expect(normaliseIsbn("1-84946-401-3")).toBe("9781849464017");
    expect(normaliseIsbn("978-1-84946-401-7")).toBe("9781849464017");
    expect(normaliseForMatch("Émile’s “Book”, 2nd!")).toBe("emile s book 2nd");
  });

  test("matches by legal signature and by loose title", () => {
    const existing: Citation[] = [
      {
        ...makeCitation("mabo"),
        sourceType: "case.reported",
        data: {
          party1: "Mabo",
          party2: "Queensland (No 2)",
          year: 1992,
          reportSeries: "CLR",
          volume: 175,
          startingPage: 1,
        },
      },
      {
        ...makeCitation("luntz"),
        sourceType: "journal.article",
        data: {
          authors: [{ givenNames: "Harold", surname: "Luntz" }],
          title: "A Personal Journey through the Law of Torts",
          year: 2005,
          journal: "SLR",
          startingPage: 393,
        },
      },
    ];
    const index = new DedupeIndex(existing);
    const preview = prepareImport([{ text: RIS, formatHint: "ris" }], { ...OPTS, existing });
    expect(preview.rows[0].duplicateOf?.id).toBe("mabo");
    expect(preview.rows[1].duplicateOf?.id).toBe("luntz");
    expect(preview.rows[2].duplicateOf).toBeUndefined();
    expect(index.find({ doi: "10.1000/x" })).toBeUndefined();
  });
});

describe("prepareImport", () => {
  test("detects, maps, counts and flags incomplete rows", () => {
    const preview = prepareImport([{ text: RIS, fileName: "zotero.ris" }], OPTS);
    expect(preview.sources[0].detection.format).toBe("ris");
    expect(preview.rows).toHaveLength(3);
    expect(preview.rows[0].sourceType).toBe("case.reported");
    expect(preview.rows[1].sourceType).toBe("journal.article");
    expect(preview.rows[2].missingFields).toEqual(
      expect.arrayContaining(["authors", "publisher", "year"])
    );
    expect(preview.counts).toEqual({ total: 3, ready: 2, incomplete: 1, duplicates: 0, failed: 0 });
    expect(preview.rows[2].include).toBe(true);
  });

  test("dedupes within a batch and reports unrecognised sources", () => {
    const twice = prepareImport([{ text: RIS }, { text: RIS }], OPTS);
    expect(twice.counts.duplicates).toBe(3);
    expect(twice.rows[3].include).toBe(false);
    const bad = prepareImport([{ text: "just prose", fileName: "notes.txt" }], OPTS);
    expect(bad.rows).toHaveLength(0);
    expect(bad.issues[0].code).toBe("format-unrecognised");
    expect(bad.issues[0].message).toContain("notes.txt");
  });

  test("retypeRow re-maps a row with the chosen type", () => {
    const preview = prepareImport([{ text: RIS }], OPTS);
    const row = retypeRow(preview.rows[1], "journal.online", OPTS);
    expect(row.sourceType).toBe("journal.online");
    expect(row.citation.sourceType).toBe("journal.online");
    expect(row.reasons).toEqual(["Chosen in the preview"]);
  });

  test("previews a thousand records well under a second", () => {
    const many = Array.from(
      { length: 1000 },
      (_, i) =>
        `TY  - JOUR\nAU  - Author, A${i}\nTI  - Title ${i}\nJO  - Journal\nVL  - ${i}\nSP  - 1\nPY  - 2000\nER  - \n`
    ).join("");
    const start = Date.now();
    const preview = prepareImport([{ text: many }], OPTS);
    expect(preview.rows).toHaveLength(1000);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("commitImport against a real store", () => {
  async function freshStore(
    existing: Citation[] = []
  ): Promise<{ store: CitationStore; getPartAddCount: () => number }> {
    const doc = new FakeDocState();
    const { getPartAddCount } = installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();
    if (existing.length > 0) await store.addMany(existing);
    return { store, getPartAddCount };
  }

  test("adds included rows in one persist and reports incomplete ids", async () => {
    const { store, getPartAddCount } = await freshStore();
    const before = getPartAddCount();
    const preview = prepareImport([{ text: RIS }], { ...OPTS, existing: store.getAll() });
    const result = await commitImport(preview, store);
    expect(result.added).toBe(3);
    expect(result.incomplete).toBe(1);
    expect(result.incompleteIds).toHaveLength(1);
    expect(store.getAll()).toHaveLength(3);
    expect(getPartAddCount() - before).toBe(1);
    expect(store.getAll()[0].tags).toEqual(expect.arrayContaining(["import", "import:ris"]));
  });

  test("skips duplicates, honours includeIncomplete false, and updates round trips", async () => {
    const { store } = await freshStore();
    const first = prepareImport([{ text: RIS }], { ...OPTS, existing: store.getAll() });
    await commitImport(first, store, { includeIncomplete: false });
    expect(store.getAll()).toHaveLength(2);

    const exported = exportCitations(store.getAll(), { format: "ris", dateStamp: "2026-09-12" });
    const again = prepareImport([{ text: exported.text, formatHint: "ris" }], {
      ...OPTS,
      existing: store.getAll(),
    });
    expect(again.rows.every((r) => r.roundTrip)).toBe(true);
    const skipped = await commitImport(again, store);
    expect(skipped.skippedDuplicates).toBe(2);

    again.rows.forEach((r) => {
      r.include = true;
      r.update = true;
    });
    const updated = await commitImport(again, store);
    expect(updated.updated).toBe(2);
    expect(store.getAll()).toHaveLength(2);
  });
});

describe("exportCitations", () => {
  const citations: Citation[] = [
    {
      ...makeCitation("c1"),
      sourceType: "case.reported",
      data: {
        party1: "Mabo",
        party2: "Queensland (No 2)",
        year: 1992,
        reportSeries: "CLR",
        volume: 175,
        startingPage: 1,
      },
    },
    { ...makeCitation("n1"), sourceType: "explanatory_note", data: { noteText: "See above" } },
  ];
  const formatCitation = (c: Citation): { footnote: string } => ({ footnote: `Formatted ${c.id}` });

  test("writes each registered format with the formatted note and provenance", () => {
    for (const format of ["ris", "bibtex", "csl-json"] as const) {
      const out = exportCitations(citations, { format, formatCitation, dateStamp: "2026-09-12" });
      expect(out.records).toBe(1);
      expect(out.fileName).toBe(`obiter-library-2026-09-12${out.extension}`);
      expect(out.text).toContain("Formatted c1");
      expect(out.text).toContain("c1");
    }
    const withNotes = exportCitations(citations, {
      format: "ris",
      includeExplanatoryNotes: true,
      dateStamp: "2026-09-12",
    });
    expect(withNotes.records).toBe(2);
  });

  test("formatted text is a numbered plain list", () => {
    const out = exportCitations(citations, {
      format: "formatted-text",
      formatCitation,
      dateStamp: "2026-09-12",
      scopeLabel: "selection",
    });
    expect(out.text).toBe("1. Formatted c1\n");
    expect(out.fileName).toBe("obiter-selection-2026-09-12.txt");
    expect(out.mimeType).toBe("text/plain");
  });

  test("refuses formats that cannot export", () => {
    expect(() => exportCitations(citations, { format: "word-sources-xml" })).toThrow();
  });
});

describe("bibtexImporter shim", () => {
  const BIB = `@article{luntz2005, author = {Luntz, Harold}, title = {A Personal Journey through the Law of Torts}, journal = {Sydney Law Review}, volume = {27}, number = {3}, pages = {393--420}, year = {2005} }`;

  test("parseBibTeX and mapBibEntryToObiter keep their shapes and fix the journal key", () => {
    const entries = parseBibTeX(BIB);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ entryType: "article", citeKey: "luntz2005" });
    const citation = mapBibEntryToObiter(entries[0]);
    expect(citation.sourceType).toBe("journal.article");
    expect(citation.data.journal).toBe("Sydney Law Review");
    expect(citation.data.journalName).toBeUndefined();
    expect(citation.data.startingPage).toBe(393);
  });

  test("importBibTeX imports and then skips the same entries", async () => {
    const doc = new FakeDocState();
    installFakeWord(doc);
    const store = new CitationStore();
    await store.initStore();
    expect(await importBibTeX(BIB, store)).toEqual({ imported: 1, skipped: 0 });
    expect(await importBibTeX(BIB, store)).toEqual({ imported: 0, skipped: 1 });
  });
});
