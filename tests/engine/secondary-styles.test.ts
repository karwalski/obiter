/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * STD-016 — Standard-aware secondary sources.
 *
 * The AGLC4 secondary formatters take the document config and render books,
 * chapters, journal articles, theses and internet materials per the
 * standard's rules; without a config (or with an AGLC config) their output
 * is the AGLC4 one, byte for byte (the chapter suites are the guard; the
 * first block below pins the equivalence directly).
 *
 * Rule authority: docs/standards-rule-notes.md — OSCOLA 5 §1.5, §3.2.1,
 * §3.2.3, §3.2.4, §3.3, §3.7.1, §3.7.6; OSCOLA 4 §3.4.7; NZLSG 3 §1.2.2,
 * §6.1.1, §6.1.2, §6.1.8, §6.2, §6.4, §6.7.1, §7.1.1. AGLC4 4.1, 5.1–5.7,
 * 6.1–6.7, 7.2.5, 7.15 (derived rule references).
 */

import {
  formatBook,
  formatBookChapter,
  formatMultiVolumeBook,
  formatTranslatedBook,
} from "../../src/engine/rules/v4/secondary/books";
import { formatJournalArticle } from "../../src/engine/rules/v4/secondary/journals";
import { formatThesis } from "../../src/engine/rules/v4/secondary/other";
import { formatInternetMaterial } from "../../src/engine/rules/v4/secondary/other-media";
import { formatSecondaryTitle } from "../../src/engine/rules/v4/secondary/general";
import {
  nestInnerMarks,
  quoteRunsWith,
  secondaryStyleFor,
  standardFamily,
} from "../../src/engine/rules/v4/secondary/style";
import {
  shouldItaliciseTitle,
  shouldQuoteTitle,
  wrapTitle,
} from "../../src/engine/rules/v4/general/italicisation";
import { getStandardConfig } from "../../src/engine/standards";
import type { CitationConfig } from "../../src/engine/standards/types";
import type { FormattedRun } from "../../src/types/formattedRun";

const aglc = getStandardConfig("aglc4");
const oscola5 = getStandardConfig("oscola5");
const oscola4 = getStandardConfig("oscola4");
const nzlsg = getStandardConfig("nzlsg3");

const text = (runs: FormattedRun[]): string => runs.map((r) => r.text).join("");
const italics = (runs: FormattedRun[]): string[] => runs.filter((r) => r.italic).map((r) => r.text);

const luntz = {
  authors: [{ givenNames: "Harold", surname: "Luntz" }],
  title: "Assessment of Damages for Personal Injury and Death",
  publisher: "LexisNexis Butterworths",
  edition: 4,
  year: 2002,
  place: "Sydney",
};

const gardner = {
  chapterAuthors: [{ givenNames: "John", surname: "Gardner" }],
  chapterTitle: "The Purity and Priority of Private Law",
  editors: [
    { givenNames: "Andrew", surname: "Robertson" },
    { givenNames: "Tang Hang", surname: "Wu" },
  ],
  bookTitle: "The Goals of Private Law",
  publisher: "Hart Publishing",
  year: 2009,
  startingPage: 1,
  place: "Oxford",
};

const young = {
  authors: [{ givenNames: "Alison L", surname: "Young" }],
  title: "In Defence of Due Deference",
  year: 2009,
  volume: 72,
  journal: "MLR",
  startingPage: 554,
};

const herberg = {
  author: { givenNames: "Javan", surname: "Herberg" },
  title: "Injunctive Relief for Wrongful Termination of Employment",
  thesisType: "DPhil thesis",
  university: "University of Oxford",
  year: 1989,
};

const cyclefree = {
  authors: [{ givenNames: "", surname: "Cyclefree" }],
  title: "Is This Really Necessary, Minister?",
  website: "Legal Feminist",
  documentType: "Blog Post",
  date: "27 April 2023",
  url: "https://perma.cc/3THK-P4AX",
};

const page = { type: "page", value: "42" } as const;
const para = { type: "paragraph", value: "[42]" } as const;

// ─── SecondaryStyle ─────────────────────────────────────────────────────────

describe("secondaryStyleFor", () => {
  test("no config is AGLC4", () => {
    expect(secondaryStyleFor()).toEqual(secondaryStyleFor(aglc));
    expect(secondaryStyleFor().family).toBe("aglc");
  });

  test("the family follows the standard id", () => {
    expect(standardFamily(oscola5)).toBe("oscola");
    expect(standardFamily(oscola4)).toBe("oscola");
    expect(standardFamily(nzlsg)).toBe("nzlsg");
    expect(standardFamily({ standardId: "aglc5" })).toBe("aglc");
  });

  test("profile values drive the style (OSCOLA 5 §3.2.1, §3.7.6; NZLSG 3 §6.1.1, §1.2.2)", () => {
    const o = secondaryStyleFor(oscola5);
    expect(o.bookParenthesisOrder).toBe("edition-publisher-year");
    expect(o.editionAbbreviation).toBe("edn");
    expect(o.chapterStartPage).toBe(false);
    expect(o.thesisTitleStyle).toBe("italic");
    expect(o.quotationMarkStyle).toBe("single");
    expect(o.paragraphPinpointStyle).toBe("para");
    const n = secondaryStyleFor(nzlsg);
    expect(n.bookParenthesisOrder).toBe("edition-publisher-place-year");
    expect(n.authorTitleSeparator).toBe(" ");
    expect(n.includePlaceOfPublication).toBe(true);
    expect(n.quotationMarkStyle).toBe("double");
    expect(n.pinpointPrefix).toBe("at ");
    expect(n.journalTitleItalic).toBe(false);
  });

  test("a hand-built config without the STD-016 fields falls back to the family defaults", () => {
    const bare = {
      ...aglc,
      standardId: "oscola5",
      quotationMarkStyle: undefined,
      authorTitleSeparator: undefined,
      bookParenthesisOrder: undefined,
      thesisTitleStyle: undefined,
    } as unknown as CitationConfig;
    const style = secondaryStyleFor(bare);
    expect(style.bookParenthesisOrder).toBe("edition-publisher-year");
    expect(style.thesisTitleStyle).toBe("italic");
    expect(style.quotationMarkStyle).toBe("single");
  });

  test("OSCOLA 4 §3.4.7 quotes the thesis title; OSCOLA 5 §3.7.6 sets it italic", () => {
    expect(secondaryStyleFor(oscola4).thesisTitleStyle).toBe("quoted");
    expect(secondaryStyleFor(oscola5).thesisTitleStyle).toBe("italic");
  });
});

describe("quoteRunsWith and nestInnerMarks", () => {
  test("marks join roman edge runs and stand beside italic ones", () => {
    expect(quoteRunsWith([{ text: "Title" }], ["“", "”"])).toEqual([{ text: "“Title”" }]);
    expect(
      quoteRunsWith([{ text: "Mabo", italic: true }, { text: " Revisited" }], ["‘", "’"])
    ).toEqual([{ text: "‘" }, { text: "Mabo", italic: true }, { text: " Revisited’" }]);
    expect(quoteRunsWith([], ["‘", "’"])).toEqual([{ text: "‘’" }]);
  });

  test("inner marks nest the other way (OSCOLA 5 §3.3 double within single; NZLSG 3 §6.4 single within double)", () => {
    expect(nestInnerMarks("Theory, ‘Pure Theory’ and Values", "single")).toBe(
      "Theory, “Pure Theory” and Values"
    );
    expect(nestInnerMarks("Theory, “Pure Theory” and Values", "double")).toBe(
      "Theory, ‘Pure Theory’ and Values"
    );
    // A possessive apostrophe is not a closing mark
    expect(nestInnerMarks("Birks’ Unjust Enrichment", "single")).toBe("Birks’ Unjust Enrichment");
  });
});

// ─── Italicisation with a config ────────────────────────────────────────────

describe("shouldItaliciseTitle / shouldQuoteTitle / wrapTitle with a config", () => {
  test("thesis titles: italic under OSCOLA 5 §3.7.6, quoted under AGLC4 7.2.5, OSCOLA 4 §3.4.7, NZLSG 3 §6.7.1", () => {
    expect(shouldItaliciseTitle("thesis", oscola5)).toBe(true);
    expect(shouldItaliciseTitle("thesis", oscola4)).toBe(false);
    expect(shouldItaliciseTitle("thesis", nzlsg)).toBe(false);
    expect(shouldItaliciseTitle("thesis", aglc)).toBe(false);
    expect(shouldItaliciseTitle("thesis")).toBe(false);
    expect(shouldQuoteTitle("thesis", nzlsg)).toBe(true);
    expect(shouldQuoteTitle("thesis", oscola5)).toBe(false);
    expect(shouldQuoteTitle("thesis")).toBe(false);
  });

  test("book and article decisions are unchanged under every standard (AGLC4 1.8.2)", () => {
    for (const config of [undefined, aglc, oscola5, nzlsg]) {
      expect(shouldItaliciseTitle("book", config)).toBe(true);
      expect(shouldItaliciseTitle("journal.article", config)).toBe(false);
      expect(shouldQuoteTitle("journal.article", config)).toBe(true);
      expect(shouldQuoteTitle("book.chapter", config)).toBe(true);
    }
  });

  test("wrapTitle takes the marks from the config (NZLSG 3 §1.2.2 double) or the bare style", () => {
    expect(wrapTitle("Title", "journal.article", nzlsg)).toEqual([
      { text: "“" },
      { text: "Title" },
      { text: "”" },
    ]);
    expect(wrapTitle("Title", "journal.article", oscola5)).toEqual([
      { text: "‘" },
      { text: "Title" },
      { text: "’" },
    ]);
    expect(wrapTitle("Title", "journal.article", "double")).toEqual([
      { text: "“" },
      { text: "Title" },
      { text: "”" },
    ]);
    expect(wrapTitle("Title", "journal.article")).toEqual([
      { text: "‘" },
      { text: "Title" },
      { text: "’" },
    ]);
    expect(wrapTitle("Title", "thesis", oscola5)).toEqual([{ text: "Title", italic: true }]);
    expect(wrapTitle("Act", "legislation.statute", oscola5)).toEqual([{ text: "Act" }]);
  });

  test("formatSecondaryTitle nests marks within a quoted title under OSCOLA and NZLSG only", () => {
    expect(
      text(formatSecondaryTitle("Theory, ‘Pure Theory’ and Values", "journal.article", oscola5))
    ).toBe("‘Theory, “Pure Theory” and Values’");
    expect(
      text(formatSecondaryTitle("Theory, ‘Pure Theory’ and Values", "journal.article", nzlsg))
    ).toBe("“Theory, ‘Pure Theory’ and Values”");
    // AGLC: as typed (rule 4.2 says nothing about nested marks)
    expect(
      text(formatSecondaryTitle("Theory, ‘Pure Theory’ and Values", "journal.article", aglc))
    ).toBe("‘Theory, ‘Pure Theory’ and Values’");
  });
});

// ─── AGLC equivalence ───────────────────────────────────────────────────────

describe("AGLC4 output is identical with and without the config", () => {
  test("book, chapter, article, thesis, website", () => {
    expect(formatBook({ ...luntz, pinpoint: page, config: aglc })).toEqual(
      formatBook({ ...luntz, pinpoint: page })
    );
    expect(formatBookChapter({ ...gardner, pinpoint: page, config: aglc })).toEqual(
      formatBookChapter({ ...gardner, pinpoint: page })
    );
    expect(formatJournalArticle({ ...young, pinpoint: page, config: aglc })).toEqual(
      formatJournalArticle({ ...young, pinpoint: page })
    );
    expect(formatThesis({ ...herberg, pinpoint: page, config: aglc })).toEqual(
      formatThesis(herberg)
    );
    expect(formatInternetMaterial({ ...cyclefree, pinpoint: para, config: aglc })).toEqual(
      formatInternetMaterial({ ...cyclefree, pinpoint: para })
    );
  });

  test("the AGLC forms themselves (rules 6.1–6.4, 6.6.1, 5.1–5.7, 7.2.5, 7.15)", () => {
    expect(text(formatBook({ ...luntz, pinpoint: para }))).toBe(
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths, 4th ed, 2002) [42]"
    );
    expect(text(formatBookChapter({ ...gardner, pinpoint: page }))).toBe(
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing, 2009) 1, 42"
    );
    expect(text(formatJournalArticle({ ...young, pinpoint: page }))).toBe(
      "Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, 42"
    );
    expect(italics(formatJournalArticle(young))).toEqual(["MLR"]);
    expect(text(formatThesis(herberg))).toBe(
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford, 1989)"
    );
    expect(text(formatInternetMaterial(cyclefree))).toBe(
      "Cyclefree, ‘Is This Really Necessary, Minister?’, Legal Feminist (Blog Post, 27 April 2023) <https://perma.cc/3THK-P4AX>"
    );
  });
});

// ─── OSCOLA 5 ───────────────────────────────────────────────────────────────

describe("OSCOLA 5 secondary sources", () => {
  test("§3.2.1 book: author, comma, italic title, (edn, Publisher year); no place", () => {
    const runs = formatBook({ ...luntz, config: oscola5 });
    expect(text(runs)).toBe(
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (4th edn, LexisNexis Butterworths 2002)"
    );
    expect(italics(runs)).toEqual(["Assessment of Damages for Personal Injury and Death"]);
    // No superscript ordinal
    expect(runs.some((r) => r.superscript)).toBe(false);
  });

  test("§3.2.1 first edition: (Publisher year)", () => {
    expect(text(formatBook({ ...luntz, edition: 1, config: oscola5 }))).toBe(
      "Harold Luntz, Assessment of Damages for Personal Injury and Death (LexisNexis Butterworths 2002)"
    );
  });

  test("§3.2.1 / §3.1.3 pinpoints: bare page after the bracket; paragraphs take 'para'", () => {
    expect(text(formatBook({ ...luntz, pinpoint: page, config: oscola5 }))).toMatch(/2002\) 42$/);
    expect(text(formatBook({ ...luntz, pinpoint: para, config: oscola5 }))).toMatch(
      /2002\) para 42$/
    );
    expect(
      text(
        formatBook({ ...luntz, pinpoint: { type: "paragraph", value: "[4]–[6]" }, config: oscola5 })
      )
    ).toMatch(/2002\) para 4–6$/);
  });

  test("§3.2.1 multi-volume: volume after the details, comma before the pinpoint", () => {
    expect(
      text(
        formatMultiVolumeBook({
          authors: [{ givenNames: "WS", surname: "Holdsworth" }],
          title: "A History of English Law",
          publisher: "Methuen & Co",
          year: 1965,
          volume: "XV",
          pinpoint: { type: "page", value: "300" },
          config: oscola5,
        })
      )
    ).toBe("WS Holdsworth, A History of English Law (Methuen & Co 1965) vol XV, 300");
  });

  test("§3.2.3 editor of an authored book opens the bracket", () => {
    expect(
      text(
        formatBook({
          authors: [{ givenNames: "HLA", surname: "Hart" }],
          title: "Punishment and Responsibility",
          editors: [{ givenNames: "John", surname: "Gardner" }],
          publisher: "OUP",
          edition: 2,
          year: 2008,
          config: oscola5,
        })
      )
    ).toBe("HLA Hart, Punishment and Responsibility (John Gardner ed, 2nd edn, OUP 2008)");
  });

  test("§3.2.3 translator opens the bracket", () => {
    expect(
      text(
        formatTranslatedBook({
          authors: [
            { givenNames: "K", surname: "Zweigert" },
            { givenNames: "H", surname: "Kötz" },
          ],
          title: "An Introduction to Comparative Law",
          translator: "Tony Weir",
          publisher: "OUP",
          edition: 3,
          year: 1998,
          config: oscola5,
        })
      )
    ).toBe(
      "K Zweigert and H Kötz, An Introduction to Comparative Law (Tony Weir tr, 3rd edn, OUP 1998)"
    );
  });

  test("§3.2.4 chapter: no start page; pinpoint after the bracket", () => {
    expect(text(formatBookChapter({ ...gardner, config: oscola5 }))).toBe(
      "John Gardner, ‘The Purity and Priority of Private Law’ in Andrew Robertson and Tang Hang Wu (eds), The Goals of Private Law (Hart Publishing 2009)"
    );
    expect(text(formatBookChapter({ ...gardner, pinpoint: page, config: oscola5 }))).toMatch(
      /2009\) 42$/
    );
    expect(text(formatBookChapter({ ...gardner, pinpoint: para, config: oscola5 }))).toMatch(
      /2009\) para 42$/
    );
  });

  test("§3.3 article: quoted title, (year) volume journal page, pinpoint after a comma; journal roman", () => {
    const runs = formatJournalArticle({ ...young, pinpoint: page, config: oscola5 });
    expect(text(runs)).toBe("Alison L Young, ‘In Defence of Due Deference’ (2009) 72 MLR 554, 42");
    expect(italics(runs)).toEqual([]);
  });

  test("§3.3 year-organised journal: [year] journal page", () => {
    expect(
      text(
        formatJournalArticle({
          authors: [{ givenNames: "Paul", surname: "Craig" }],
          title: "Theory, ‘Pure Theory’ and Values in Public Law",
          year: 2005,
          journal: "PL",
          startingPage: 440,
          pinpoint: { type: "page", value: "441" },
          config: oscola5,
        })
      )
    ).toBe("Paul Craig, ‘Theory, “Pure Theory” and Values in Public Law’ [2005] PL 440, 441");
  });

  test("§3.7.6 thesis: italic title, (type, university year), bare page pinpoint", () => {
    const runs = formatThesis({ ...herberg, config: oscola5 });
    expect(text(runs)).toBe(
      "Javan Herberg, Injunctive Relief for Wrongful Termination of Employment (DPhil thesis, University of Oxford 1989)"
    );
    expect(italics(runs)).toEqual(["Injunctive Relief for Wrongful Termination of Employment"]);
    expect(text(formatThesis({ ...herberg, pinpoint: page, config: oscola5 }))).toMatch(
      /1989\) 42$/
    );
  });

  test("OSCOLA 4 §3.4.7 thesis: title in single quotes, roman", () => {
    const runs = formatThesis({ ...herberg, config: oscola4 });
    expect(text(runs)).toBe(
      "Javan Herberg, ‘Injunctive Relief for Wrongful Termination of Employment’ (DPhil thesis, University of Oxford 1989)"
    );
    expect(italics(runs)).toEqual([]);
  });

  test("§3.7.1 website: author, quoted title, (italic site, date), link; no document type, no access date", () => {
    const runs = formatInternetMaterial({ ...cyclefree, config: oscola5 });
    expect(text(runs)).toBe(
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>"
    );
    expect(italics(runs)).toEqual(["Legal Feminist"]);
  });

  test("§3.7.1 website pinpoint before the link; no author starts with the title", () => {
    expect(text(formatInternetMaterial({ ...cyclefree, pinpoint: page, config: oscola5 }))).toBe(
      "Cyclefree, ‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) 42 <https://perma.cc/3THK-P4AX>"
    );
    expect(
      text(formatInternetMaterial({ ...cyclefree, authors: undefined, config: oscola5 }))
    ).toBe(
      "‘Is This Really Necessary, Minister?’ (Legal Feminist, 27 April 2023) <https://perma.cc/3THK-P4AX>"
    );
  });
});

// ─── NZLSG 3 ────────────────────────────────────────────────────────────────

describe("NZLSG 3 secondary sources", () => {
  test("§6.1.1 book: author, italic title (no comma), (ed, Publisher, Place, year); §6.1.8 'at' pinpoints", () => {
    const runs = formatBook({ ...luntz, config: nzlsg });
    expect(text(runs)).toBe(
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, Sydney, 2002)"
    );
    expect(italics(runs)).toEqual(["Assessment of Damages for Personal Injury and Death"]);
    expect(text(formatBook({ ...luntz, pinpoint: page, config: nzlsg }))).toMatch(/2002\) at 42$/);
    expect(text(formatBook({ ...luntz, pinpoint: para, config: nzlsg }))).toMatch(
      /2002\) at \[42\]$/
    );
  });

  test("§6.1.1 book without a place: (ed, Publisher, year)", () => {
    expect(text(formatBook({ ...luntz, place: undefined, config: nzlsg }))).toBe(
      "Harold Luntz Assessment of Damages for Personal Injury and Death (4th ed, LexisNexis Butterworths, 2002)"
    );
  });

  test("§6.1.8 multi-volume: 'vol 2 at [38–033]'", () => {
    expect(
      text(
        formatMultiVolumeBook({
          authors: [{ givenNames: "Roger", surname: "Fenton" }],
          title: "Garrow and Fenton’s Law of Personal Property in New Zealand",
          publisher: "LexisNexis",
          place: "Wellington",
          edition: 7,
          year: 2010,
          volume: 2,
          pinpoint: { type: "paragraph", value: "[2.2.20]" },
          config: nzlsg,
        })
      )
    ).toBe(
      "Roger Fenton Garrow and Fenton’s Law of Personal Property in New Zealand (7th ed, LexisNexis, Wellington, 2010) vol 2 at [2.2.20]"
    );
  });

  test("§6.2 chapter: double-quoted title, 'in' editors '(eds)' book (Publisher, Place, year) start page at pinpoint", () => {
    expect(text(formatBookChapter({ ...gardner, config: nzlsg }))).toBe(
      "John Gardner “The Purity and Priority of Private Law” in Andrew Robertson and Tang Hang Wu (eds) The Goals of Private Law (Hart Publishing, Oxford, 2009) 1"
    );
    expect(text(formatBookChapter({ ...gardner, pinpoint: page, config: nzlsg }))).toMatch(
      /2009\) 1 at 42$/
    );
  });

  test("§6.2 same-author collection omits the editor", () => {
    expect(
      text(
        formatBookChapter({
          chapterAuthors: [{ givenNames: "John", surname: "Finnis" }],
          chapterTitle: "Practical Reason’s Foundations",
          editors: [],
          bookTitle: "Reason in Action: Collected Essays Volume 1",
          publisher: "Oxford University Press",
          place: "Oxford",
          year: 2011,
          startingPage: 19,
          pinpoint: { type: "page", value: "37" },
          config: nzlsg,
        })
      )
    ).toBe(
      "John Finnis “Practical Reason’s Foundations” in Reason in Action: Collected Essays Volume 1 (Oxford University Press, Oxford, 2011) 19 at 37"
    );
  });

  test("§6.4 article: double-quoted title, journal roman, 'at' pinpoint; inner marks single", () => {
    const runs = formatJournalArticle({ ...young, pinpoint: page, config: nzlsg });
    expect(text(runs)).toBe("Alison L Young “In Defence of Due Deference” (2009) 72 MLR 554 at 42");
    expect(italics(runs)).toEqual([]);
    expect(
      text(
        formatJournalArticle({
          authors: [{ givenNames: "Peter", surname: "Watts" }],
          title: "Birks’ Unjust Enrichment",
          year: 2005,
          volume: 121,
          journal: "LQR",
          startingPage: 163,
          pinpoint: { type: "page", value: "165" },
          config: nzlsg,
        })
      )
    ).toBe("Peter Watts “Birks’ Unjust Enrichment” (2005) 121 LQR 163 at 165");
  });

  test("§6.7.1 thesis: double-quoted title, (type, university, year), 'at' pinpoint", () => {
    const runs = formatThesis({ ...herberg, pinpoint: page, config: nzlsg });
    expect(text(runs)).toBe(
      "Javan Herberg “Injunctive Relief for Wrongful Termination of Employment” (DPhil thesis, University of Oxford, 1989) at 42"
    );
    expect(italics(runs)).toEqual([]);
  });

  test("§7.1.1 website: author, double-quoted title, (date), site, <URL>, 'at' pinpoint; no access date", () => {
    expect(text(formatInternetMaterial({ ...cyclefree, config: nzlsg }))).toBe(
      "Cyclefree “Is This Really Necessary, Minister?” (27 April 2023) Legal Feminist <https://perma.cc/3THK-P4AX>"
    );
    expect(text(formatInternetMaterial({ ...cyclefree, pinpoint: para, config: nzlsg }))).toMatch(
      /<https:\/\/perma\.cc\/3THK-P4AX> at \[42\]$/
    );
  });

  test("§7.1.1 website: 'http://' dropped before www; site omitted when it is the author", () => {
    expect(
      text(
        formatInternetMaterial({
          authors: [{ givenNames: "", surname: "Ministry of Justice" }],
          title: "Frequently Asked Questions – Electoral Finance Reform",
          website: "Ministry of Justice",
          date: "",
          url: "http://www.justice.govt.nz",
          config: nzlsg,
        })
      )
    ).toBe(
      "Ministry of Justice “Frequently Asked Questions – Electoral Finance Reform” <www.justice.govt.nz>"
    );
  });
});
