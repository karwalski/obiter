/**
 * Book editions typed as ordinals (Word for the web defect, v1.17.1).
 *
 * The Insert form's Edition placeholder invites "3rd", so users type "4th";
 * the dispatchers coerced it with a plain numeric parse and the edition
 * vanished under AGLC4 and OSCOLA, while the NZLSG adapter passed the raw
 * string through as "(4th, …)" without `ed`. An ordinal and its number
 * must render identically under every standard:
 *
 * - AGLC4 Rule 6.3.2: `4th ed` (docs/aglc4 — superscript ordinal runs);
 * - OSCOLA 5 §3.2.1: `4th edn`;
 * - NZLSG 3 §6.1.3–6.1.4: `4th ed` (docs/standards-rule-notes.md).
 */

import { renderFirst } from "../standards/runner";
import type { Citation } from "../../src/types/citation";

function book(edition: unknown, sourceType = "book"): Citation {
  return {
    id: "book-1",
    sourceType,
    data: {
      authors: [{ givenNames: "Ross", surname: "Carter" }],
      title: "Statute Law in New Zealand",
      publisher: "LexisNexis",
      place: "Wellington",
      year: "2002",
      edition,
    },
    aglcVersion: "4",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  } as unknown as Citation;
}

const ORDINAL_INPUTS: Array<[unknown, number]> = [
  ["4th", 4],
  ["4", 4],
  [4, 4],
  [" 4th ", 4],
  ["4TH", 4],
  ["2nd", 2],
  ["3rd", 3],
  ["1st", 1],
];

describe("AGLC4 Rule 6.3.2: an ordinal edition renders like its number", () => {
  test.each(ORDINAL_INPUTS)("edition %p renders as edition %p", (input, n) => {
    const text = renderFirst(book(input), "aglc4").text;
    expect(text).toBe(renderFirst(book(n), "aglc4").text);
  });

  test("'4th' and '4' both render '4th ed'; numeric output is unchanged", () => {
    const numeric = renderFirst(book(4), "aglc4").text;
    expect(numeric).toContain("4th ed");
    expect(renderFirst(book("4th"), "aglc4").text).toBe(numeric);
    expect(renderFirst(book("4"), "aglc4").text).toBe(numeric);
  });

  test("a non-edition string is dropped rather than rendered", () => {
    expect(renderFirst(book("fourth"), "aglc4").text).toBe(
      renderFirst(book(undefined), "aglc4").text
    );
  });

  test("the same coercion serves translated books, audiobooks and ebooks", () => {
    for (const st of ["book.translated", "book.audiobook", "book.ebook"]) {
      expect(renderFirst(book("4th", st), "aglc4").text).toBe(
        renderFirst(book(4, st), "aglc4").text
      );
      expect(renderFirst(book("4th", st), "aglc4").text).toContain("4th");
    }
  });
});

describe("OSCOLA 5 §3.2.1: '4th edn'", () => {
  test.each(ORDINAL_INPUTS)("edition %p renders as edition %p", (input, n) => {
    expect(renderFirst(book(input), "oscola5").text).toBe(renderFirst(book(n), "oscola5").text);
  });

  test("'4th' renders '4th edn'", () => {
    const text = renderFirst(book("4th"), "oscola5").text;
    expect(text).toContain("4th edn");
    expect(text).toBe(renderFirst(book(4), "oscola5").text);
  });
});

describe("NZLSG 3 §6.1.3: '4th ed'", () => {
  test.each(ORDINAL_INPUTS)("edition %p renders as edition %p", (input, n) => {
    expect(renderFirst(book(input), "nzlsg3").text).toBe(renderFirst(book(n), "nzlsg3").text);
  });

  test("'4th' renders '(4th ed, LexisNexis, Wellington, 2002)'", () => {
    const text = renderFirst(book("4th"), "nzlsg3").text;
    expect(text).toContain("(4th ed, LexisNexis, Wellington, 2002)");
    expect(text).toBe(renderFirst(book(4), "nzlsg3").text);
  });

  test("a pre-formatted edition string still passes through", () => {
    expect(renderFirst(book("rev ed"), "nzlsg3").text).toContain("(rev ed, LexisNexis");
  });
});
