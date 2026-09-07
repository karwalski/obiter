/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Field-reported formatting bugs:
 *  1. Dictionary defined term dropped (form key `entryTerm` vs engine `entry`).
 *  2. Reported case rendered entirely in italics (only the case name should be
 *     italic — AGLC4 Rule 2). The engine must emit the citation reference as
 *     non-italic runs so the Word writer does not inherit the name's italic.
 *  3. Multi-author books shortened to the first surname only ('A (n 1)').
 *     AGLC4 Rule 4.1.2 carries into subsequent references (Rule 1.4.1):
 *     'Edelman and Bant (n 2) 260. See Rishworth et al (n 3).'
 */

import { getFormattedPreview } from "../../src/engine/engine";
import { formatShortReference, resolveSubsequentReference } from "../../src/engine/resolver";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

function preview(sourceType: string, data: Record<string, unknown>): FormattedRun[] {
  const citation = {
    id: "",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  } as Citation;
  return getFormattedPreview(citation);
}
const plain = (r: FormattedRun[]) => r.map((x) => x.text).join("");
const italic = (r: FormattedRun[]) =>
  r
    .filter((x) => x.italic)
    .map((x) => x.text)
    .join("");

describe("Dictionary defined term (Rule 7.6)", () => {
  it("renders the defined word entered via the form's `entryTerm` key", () => {
    const runs = preview("dictionary", {
      title: "LexisNexis Australian Concise Legal Dictionary",
      edition: "7th",
      year: "2016",
      entryTerm: "Fiduciary Relationship",
    });
    const text = plain(runs);
    expect(text).toContain("‘Fiduciary Relationship’");
    expect(text).not.toContain("‘’"); // no empty single quotes
  });
});

describe("Reported case italics (AGLC4 Rule 2)", () => {
  it("italicises only the case name, not the citation reference", () => {
    const runs = preview("case.reported", {
      party1: "Smith",
      party2: "Jones",
      yearType: "square",
      year: "2009",
      reportSeries: "NSWLR",
      startingPage: "32",
    });

    // Case name is italic …
    expect(italic(runs)).toContain("Smith");
    expect(italic(runs)).toContain("Jones");
    // … but the citation reference ([2009] NSWLR 32) must be roman.
    const italicText = italic(runs);
    expect(italicText).not.toMatch(/2009/);
    expect(italicText).not.toMatch(/NSWLR/);
    expect(italicText).not.toMatch(/32/);
  });
});

describe("Multi-author subsequent references (AGLC4 Rules 1.4.1 and 4.1.2)", () => {
  const book = (authors: Array<{ givenNames: string; surname: string }>, sourceType = "book") =>
    ({
      id: "b",
      aglcVersion: "4",
      sourceType,
      data: { authors, title: "Unjust Enrichment", publisher: "Hart Publishing", year: 2016 },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    }) as Citation;

  it("names both authors of a two-author book (guide ex 5: 'Edelman and Bant (n 2) 260')", () => {
    const runs = formatShortReference(
      book([
        { givenNames: "James", surname: "Edelman" },
        { givenNames: "Elise", surname: "Bant" },
      ]),
      2,
      { type: "page", value: "260" }
    );
    expect(plain(runs)).toBe("Edelman and Bant (n 2) 260");
  });

  it("names all three authors of a three-author book", () => {
    const runs = formatShortReference(
      book([
        { givenNames: "A", surname: "Adams" },
        { givenNames: "B", surname: "Brown" },
        { givenNames: "C", surname: "Clarke" },
      ]),
      4
    );
    expect(plain(runs)).toBe("Adams, Brown and Clarke (n 4)");
  });

  it("collapses four or more authors to 'et al' (guide ex 5: 'Rishworth et al (n 3)')", () => {
    const runs = formatShortReference(
      book([
        { givenNames: "Paul", surname: "Rishworth" },
        { givenNames: "Grant", surname: "Huscroft" },
        { givenNames: "Scott", surname: "Optican" },
        { givenNames: "Richard", surname: "Mahoney" },
      ]),
      3
    );
    expect(plain(runs)).toBe("Rishworth et al (n 3)");
  });

  it("keeps the full author list ahead of a disambiguating short title", () => {
    const citation = book([
      { givenNames: "James", surname: "Edelman" },
      { givenNames: "Elise", surname: "Bant" },
    ]);
    citation.shortTitle = "Unjust Enrichment";
    const runs = formatShortReference(citation, 2, undefined, true);
    expect(plain(runs)).toBe("Edelman and Bant, Unjust Enrichment (n 2)");
    expect(italic(runs)).toBe("Unjust Enrichment");
  });

  it("applies the same rule to journal articles and to chapter authors", () => {
    const article = book(
      [
        { givenNames: "Kim", surname: "Rubenstein" },
        { givenNames: "Daryl", surname: "Adair" },
      ],
      "journal.article"
    );
    expect(plain(formatShortReference(article, 7))).toBe("Rubenstein and Adair (n 7)");

    const chapter = {
      id: "ch",
      aglcVersion: "4",
      sourceType: "book.chapter",
      data: {
        chapterAuthors: [
          { givenNames: "John", surname: "Gardner" },
          { givenNames: "Jane", surname: "Stapleton" },
        ],
        chapterTitle: "The Purity and Priority of Private Law",
        editors: [{ givenNames: "Andrew", surname: "Robertson" }],
        bookTitle: "The Goals of Private Law",
      },
      tags: [],
      createdAt: "",
      modifiedAt: "",
    } as Citation;
    expect(plain(formatShortReference(chapter, 9))).toBe("Gardner and Stapleton (n 9)");
  });

  it("resolves the full pipeline to the multi-author form", () => {
    const result = resolveSubsequentReference(
      book([
        { givenNames: "James", surname: "Edelman" },
        { givenNames: "Elise", surname: "Bant" },
      ]),
      {
        isFirstCitation: false,
        isSameAsPreceding: false,
        precedingFootnoteCitationCount: 1,
        currentPinpoint: { type: "page", value: "260" },
        firstFootnoteNumber: 2,
        isWithinSameFootnote: false,
        formatPreference: "auto",
      }
    );
    expect(result).not.toBeNull();
    expect(plain(result!)).toBe("Edelman and Bant (n 2) 260");
  });
});
