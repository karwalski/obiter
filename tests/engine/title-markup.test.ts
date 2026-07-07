/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for the rule 4.2 embedded-italics title markup convention
 * (PARITY-122 / DECISION-021): a pair of asterisks marks an italic span
 * inside a stored title string; `**` escapes a literal asterisk;
 * unbalanced markers render literally.
 */

import { Citation, SourceData, SourceType } from "../../src/types/citation";
import { FormattedRun } from "../../src/types/formattedRun";
import { parseTitleMarkup, quoteTitleRuns } from "../../src/engine/rules/v4/general/titleMarkup";
import {
  formatSecondaryTitle,
  formatSecondaryShortTitle,
} from "../../src/engine/rules/v4/secondary/general";
import { formatJournalArticle } from "../../src/engine/rules/v4/secondary/journals";
import { formatBook, formatBookChapter } from "../../src/engine/rules/v4/secondary/books";
import { formatShortReference, formatShortTitleIntroduction } from "../../src/engine/resolver";
import { formatBibliographyEntry } from "../../src/engine/rules/v4/general/bibliography";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Concatenates all text from FormattedRun[] into a single string. */
function toPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Extracts only the italic runs' text. */
function italicText(runs: FormattedRun[]): string {
  return runs
    .filter((r) => r.italic)
    .map((r) => r.text)
    .join("");
}

// ─── parseTitleMarkup unit behaviour ────────────────────────────────────────

describe("parseTitleMarkup (rule 4.2 embedded italics)", () => {
  it("returns a single base-style run for an unmarked title (byte-for-byte no-op)", () => {
    expect(parseTitleMarkup("International Law", false)).toEqual([{ text: "International Law" }]);
    expect(parseTitleMarkup("International Law", true)).toEqual([
      { text: "International Law", italic: true },
    ]);
  });

  it("renders a marked span italic inside a roman title", () => {
    expect(parseTitleMarkup("Talking to *IceTV*: A Reply", false)).toEqual([
      { text: "Talking to " },
      { text: "IceTV", italic: true },
      { text: ": A Reply" },
    ]);
  });

  it("keeps marked spans italic inside an italic title (rule 4.2: no part in roman)", () => {
    // AGLC4 rule 4.2 (PDF p 113): where the whole title is italicised
    // (eg books), no part of the title should appear in roman font — the
    // markers are consumed but never invert to roman.
    expect(parseTitleMarkup("The *Mabo* Legacy", true)).toEqual([
      { text: "The Mabo Legacy", italic: true },
    ]);
  });

  it("renders a doubled asterisk as one literal asterisk", () => {
    expect(parseTitleMarkup("Rating: Four ** Stars", false)).toEqual([
      { text: "Rating: Four * Stars" },
    ]);
    expect(parseTitleMarkup("Rating: Four ** Stars", true)).toEqual([
      { text: "Rating: Four * Stars", italic: true },
    ]);
  });

  it("renders an unbalanced marker literally, eating no characters", () => {
    expect(parseTitleMarkup("Talking to *IceTV: A Reply", false)).toEqual([
      { text: "Talking to *IceTV: A Reply" },
    ]);
    expect(parseTitleMarkup("Three * Toggles * Here *", true)).toEqual([
      { text: "Three * Toggles * Here *", italic: true },
    ]);
  });

  it("handles a title that starts or ends with a marked span", () => {
    expect(parseTitleMarkup("*Mabo* and Beyond", false)).toEqual([
      { text: "Mabo", italic: true },
      { text: " and Beyond" },
    ]);
    expect(parseTitleMarkup("Beyond *Mabo*", false)).toEqual([
      { text: "Beyond " },
      { text: "Mabo", italic: true },
    ]);
  });

  it("merges adjacent same-style spans and never throws on degenerate input", () => {
    // Adjacent marked spans separated by consumed markers collapse.
    expect(parseTitleMarkup("*A**B*", false)).toEqual([{ text: "A*B", italic: true }]);
    // Markers-only input degrades to an empty base run.
    expect(parseTitleMarkup("", false)).toEqual([{ text: "" }]);
  });
});

// ─── quoteTitleRuns ─────────────────────────────────────────────────────────

describe("quoteTitleRuns", () => {
  it("merges quotes into roman edge runs (single-run no-op shape)", () => {
    expect(quoteTitleRuns([{ text: "A Title" }])).toEqual([{ text: "‘A Title’" }]);
  });

  it("keeps quotes roman beside italic edge runs", () => {
    expect(quoteTitleRuns([{ text: "IceTV", italic: true }])).toEqual([
      { text: "‘" },
      { text: "IceTV", italic: true },
      { text: "’" },
    ]);
  });
});

// ─── formatSecondaryTitle integration ───────────────────────────────────────

describe("formatSecondaryTitle with title markup (rule 4.2)", () => {
  it("italicises a marked case name inside a quoted article title", () => {
    const runs = formatSecondaryTitle("The *Briginshaw* Standard of Proof", "journal.article");
    expect(runs).toEqual([
      { text: "‘The " },
      { text: "Briginshaw", italic: true },
      { text: " Standard of Proof’" },
    ]);
  });

  it("keeps a marked span italic inside a book title (rule 4.2: no part in roman)", () => {
    const runs = formatSecondaryTitle("The *Mabo* Legacy", "book");
    expect(runs).toEqual([{ text: "The Mabo Legacy", italic: true }]);
  });

  it("is a no-op for unmarked titles (regression)", () => {
    expect(formatSecondaryTitle("International Law", "book")).toEqual([
      { text: "International Law", italic: true },
    ]);
    expect(
      formatSecondaryTitle("A Personal Journey through the Law of Torts", "journal.article")
    ).toEqual([{ text: "‘A Personal Journey through the Law of Torts’" }]);
  });

  it("renders unbalanced markers literally", () => {
    const runs = formatSecondaryTitle("Talking to *IceTV", "journal.article");
    expect(runs).toEqual([{ text: "‘Talking to *IceTV’" }]);
  });

  it("applies rule 1.7 title case across and inside marked spans", () => {
    const runs = formatSecondaryTitle("the *mabo* decision in context", "journal.article");
    expect(runs).toEqual([
      { text: "‘The " },
      { text: "Mabo", italic: true },
      { text: " Decision in Context’" },
    ]);
  });
});

// ─── Full citation forms ────────────────────────────────────────────────────

describe("Title markup in full citations", () => {
  it("formats the IceTV article per AGLC4 ex 2 (rule 5.2)", () => {
    // AGLC4 ex 2: Jani McCutcheon, 'Curing the Authorless Void: Protecting
    // Computer-Generated Works following *IceTV* and *Phone Directories*'
    // (2013) 37(1) Melbourne University Law Review 46.
    const runs = formatJournalArticle({
      authors: [{ givenNames: "Jani", surname: "McCutcheon" }],
      title:
        "Curing the Authorless Void: Protecting Computer-Generated Works following *IceTV* and *Phone Directories*",
      year: 2013,
      volume: 37,
      issue: "1",
      journal: "Melbourne University Law Review",
      startingPage: 46,
    });
    expect(toPlainText(runs)).toBe(
      "Jani McCutcheon, ‘Curing the Authorless Void: Protecting Computer-Generated Works following IceTV and Phone Directories’ (2013) 37(1) Melbourne University Law Review 46"
    );
    expect(italicText(runs)).toBe("IceTVPhone DirectoriesMelbourne University Law Review");
  });

  it("keeps a marked case name italic within a book title (rule 4.2: no part in roman)", () => {
    const runs = formatBook({
      authors: [{ givenNames: "Jane", surname: "Doe" }],
      title: "The *Mabo* Legacy",
      publisher: "Federation Press",
      year: 2020,
    });
    expect(toPlainText(runs)).toBe("Jane Doe, The Mabo Legacy (Federation Press, 2020)");
    expect(italicText(runs)).toBe("The Mabo Legacy");
  });

  it("italicises a marked case name inside a quoted chapter title (rule 6.6 via 4.2)", () => {
    const runs = formatBookChapter({
      chapterAuthors: [{ givenNames: "Jane", surname: "Doe" }],
      chapterTitle: "Native Title after *Mabo*",
      editors: [{ givenNames: "John", surname: "Smith" }],
      bookTitle: "Australian Property Law",
      publisher: "Federation Press",
      year: 2020,
      startingPage: 101,
    });
    expect(toPlainText(runs)).toBe(
      "Jane Doe, ‘Native Title after Mabo’ in John Smith (ed), Australian Property Law (Federation Press, 2020) 101"
    );
    expect(italicText(runs)).toBe("MaboAustralian Property Law");
  });

  it("is a no-op for an unmarked full citation (regression, AGLC4 ch 5 opening example)", () => {
    const runs = formatJournalArticle({
      authors: [{ givenNames: "Harold", surname: "Luntz" }],
      title: "A Personal Journey through the Law of Torts",
      year: 2005,
      volume: 27,
      issue: "3",
      journal: "Sydney Law Review",
      startingPage: 393,
      pinpoint: { type: "page", value: "400" },
    });
    expect(toPlainText(runs)).toBe(
      "Harold Luntz, ‘A Personal Journey through the Law of Torts’ (2005) 27(3) Sydney Law Review 393, 400"
    );
    expect(italicText(runs)).toBe("Sydney Law Review");
  });
});

// ─── Short titles (rule 4.3 / 1.4.4 via 4.2 — PARITY-122 handoff) ───────────

function makeCitation(sourceType: SourceType, data: SourceData, shortTitle?: string): Citation {
  return {
    id: "test-citation",
    aglcVersion: "4",
    sourceType,
    data,
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    modifiedAt: "2026-01-01T00:00:00.000Z",
    ...(shortTitle ? { shortTitle } : {}),
  };
}

describe("Title markup in short titles (rules 4.3/1.4.4 via 4.2)", () => {
  it("italicises a marked span inside a roman short-title introduction (rule 4.3)", () => {
    const runs = formatSecondaryShortTitle("*IceTV* Case Note", "journal.article");
    expect(toPlainText(runs)).toBe("(‘IceTV Case Note’)");
    expect(italicText(runs)).toBe("IceTV");
  });

  it("consumes markers inside an italic short-title introduction (rule 4.2: no part in roman)", () => {
    const runs = formatSecondaryShortTitle("*ISDS* 2016 Review", "report");
    expect(toPlainText(runs)).toBe("(‘ISDS 2016 Review’)");
    expect(italicText(runs)).toBe("ISDS 2016 Review");
  });

  it("consumes markers in a case short-title introduction (rule 1.4.4; span stays italic)", () => {
    const runs = formatShortTitleIntroduction("*IceTV*", "case.reported");
    expect(toPlainText(runs)).toBe("(‘IceTV’)");
    expect(italicText(runs)).toBe("IceTV");
  });

  it("round-trips an unmarked Bill short-title introduction byte-for-byte (regression)", () => {
    expect(formatShortTitleIntroduction("Human Rights Bill", "legislation.bill")).toEqual([
      { text: "(‘Human Rights Bill’)" },
    ]);
  });

  it("honours markers in a subsequent reference's roman short title (rule 1.4.1)", () => {
    // Authorless article: the subsequent reference leads with the quoted
    // short title — the marked span renders italic, matching the first
    // citation's rendering (handoff behaviour: ('IceTV' italic) Case Note).
    const citation = makeCitation(
      "journal.article",
      {
        title: "Talking to *IceTV*: A Case Note",
        journal: "Melbourne University Law Review",
        year: 2013,
        volume: 37,
        startingPage: 46,
      },
      "*IceTV* Case Note"
    );
    const runs = formatShortReference(citation, 12);
    expect(toPlainText(runs)).toBe("‘IceTV Case Note’ (n 12)");
    expect(italicText(runs)).toBe("IceTV");
  });

  it("consumes markers in a subsequent reference's italic short title (rule 4.2)", () => {
    const citation = makeCitation(
      "report",
      {
        author: "",
        title: "Review of the *IceTV* Framework",
        year: 2017,
      },
      "*IceTV* Review"
    );
    const runs = formatShortReference(citation, 7);
    expect(toPlainText(runs)).toBe("IceTV Review (n 7)");
    expect(italicText(runs)).toBe("IceTV Review");
  });
});

// ─── WEB-005: markup in the footnote AND bibliography paths ─────────────────

describe("WEB-005: embedded-title markup in footnote and bibliography output (rule 4.2)", () => {
  const MABO_MEMOIR = "A *Mabo* Memoir: Islan Kustom to Native Title";

  it("footnote path: formatBook consumes the markers and keeps the book title wholly italic", () => {
    // AGLC4 rule 4.2 (PDF p 113 / printed p 88): 'If the title of a source
    // being cited should be italicised according to the rules of this Guide
    // (eg books), no part of the title should appear in roman font.' The
    // markers are consumed but never invert the marked span to roman.
    const runs = formatBook({
      authors: [{ givenNames: "Bryan", surname: "Keon-Cohen" }],
      title: MABO_MEMOIR,
      publisher: "Zemvic Press",
      year: 2013,
    });

    expect(runs).toEqual([
      { text: "Bryan Keon-Cohen" },
      { text: ", " },
      { text: "A Mabo Memoir: Islan Kustom to Native Title", italic: true },
      { text: " (" },
      { text: "Zemvic Press" },
      { text: ", " },
      { text: "2013" },
      { text: ")" },
    ]);
  });

  it("bibliography path: formatBibliographyEntry consumes the markers (no literal asterisks)", () => {
    const citation = makeCitation("book", {
      authors: [{ givenNames: "Bryan", surname: "Keon-Cohen" }],
      title: MABO_MEMOIR,
      publisher: "Zemvic Press",
      year: 2013,
    });

    const runs = formatBibliographyEntry(citation);
    expect(runs).toEqual([
      { text: "Keon-Cohen, Bryan" },
      { text: ", " },
      { text: "A Mabo Memoir: Islan Kustom to Native Title", italic: true },
      { text: " (Zemvic Press, 2013)" },
    ]);
    expect(toPlainText(runs)).not.toContain("*");
  });

  it("bibliography path: a marked span inside a quoted article title renders italic", () => {
    const citation = makeCitation("journal.article", {
      authors: [{ givenNames: "Jani", surname: "McCutcheon" }],
      title: "Talking to *IceTV*: A Reply",
      year: 2013,
      volume: 37,
      journal: "Melbourne University Law Review",
      startingPage: 46,
    });

    const runs = formatBibliographyEntry(citation);
    expect(runs.slice(0, 5)).toEqual([
      { text: "McCutcheon, Jani" },
      { text: ", " },
      { text: "‘Talking to " },
      { text: "IceTV", italic: true },
      { text: ": A Reply’" },
    ]);
    expect(toPlainText(runs)).not.toContain("*");
  });

  it("bibliography path: report titles route through the markup parser too", () => {
    const citation = makeCitation("report", {
      author: "Productivity Commission",
      title: "Review of the *IceTV* Framework",
      year: 2017,
    });

    const runs = formatBibliographyEntry(citation);
    expect(runs).toContainEqual({
      text: "Review of the IceTV Framework",
      italic: true,
    });
    expect(toPlainText(runs)).not.toContain("*");
  });

  it("bibliography path: unmarked titles are unchanged (regression)", () => {
    const citation = makeCitation("book", {
      authors: [{ givenNames: "Jane", surname: "Doe" }],
      title: "International Law",
      publisher: "OUP",
      year: 2020,
    });

    const runs = formatBibliographyEntry(citation);
    expect(runs).toContainEqual({ text: "International Law", italic: true });
  });
});
