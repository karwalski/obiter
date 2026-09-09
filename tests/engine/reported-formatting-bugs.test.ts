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
 *  4. 'e.map is not a function' on Insert Citation for a book chapter
 *     (2026-09-08, v1.16.15): the chapter form stored editors as one string
 *     and the engine cast it as Author[]. Documents created before 1.16.16
 *     still hold that shape, so the engine must accept it (and render it
 *     correctly — it previously produced 'A et al (eds)').
 */

import { getFormattedPreview } from "../../src/engine/engine";
import { formatShortReference, resolveSubsequentReference } from "../../src/engine/resolver";
import { formatAuthors, normaliseAuthorList } from "../../src/engine/rules/v4/secondary/authors";
import type { Author } from "../../src/types/citation";
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

describe("Author lists stored as strings (backwards compatibility, v1.16.16)", () => {
  const chapter = (editors: unknown) =>
    preview("book.chapter", {
      authors: [{ givenNames: "John", surname: "Gardner" }],
      chapterTitle: "The Purity and Priority of Private Law",
      editors,
      title: "The Goals of Private Law",
      publisher: "Hart Publishing",
      year: "2009",
      startingPage: "1",
    });

  it("renders a book chapter whose editors were saved as one string", () => {
    const text = plain(chapter("Andrew Robertson and Tang Hang Wu"));
    expect(text).toContain("in Andrew Robertson and Tang Hang Wu (eds), ");
    expect(text).not.toContain("et al");
    expect(plain(chapter("Peter Birks"))).toContain("in Peter Birks (ed), ");
  });

  it("still renders editors saved as a structured list", () => {
    expect(
      plain(
        chapter([
          { givenNames: "Andrew", surname: "Robertson" },
          { givenNames: "Tang Hang", surname: "Wu" },
        ])
      )
    ).toContain("in Andrew Robertson and Tang Hang Wu (eds), ");
  });

  it("accepts a string editor on an authored book (Rule 6.6.2)", () => {
    const text = plain(
      preview("book", {
        authors: [{ givenNames: "Michael", surname: "Kirby" }],
        title: "Bk",
        editors: "George Williams",
        publisher: "P",
        year: "2020",
      })
    );
    expect(text).toContain("ed George Williams");
  });

  it("normalises strings, single objects and mixed arrays without throwing", () => {
    expect(normaliseAuthorList("Jane Smith and Bob Jones")).toEqual([
      { givenNames: "Jane", surname: "Smith" },
      { givenNames: "Bob", surname: "Jones" },
    ]);
    expect(normaliseAuthorList("Law Council of Australia")).toEqual([
      { givenNames: "", surname: "Law Council of Australia" },
    ]);
    expect(normaliseAuthorList({ givenNames: "Kim", surname: "Rubenstein" })).toEqual([
      { givenNames: "Kim", surname: "Rubenstein" },
    ]);
    expect(
      normaliseAuthorList(["Jane Smith", { givenNames: "Bob", surname: "Jones" }])
    ).toHaveLength(2);
    expect(normaliseAuthorList(undefined)).toEqual([]);
    expect(normaliseAuthorList(42)).toEqual([]);
    expect(() => formatAuthors("Peter Birks" as unknown as Author[], true)).not.toThrow();
    expect(plain(formatAuthors("Peter Birks" as unknown as Author[], true))).toBe(
      "Peter Birks (ed)"
    );
  });
});
