/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Chapters 4–6: Secondary Sources General, Journal Articles, Books
 *
 * All test cases use examples directly from the AGLC4, 4th edition.
 * Example numbers in comments refer to AGLC4 numbered examples.
 */

import { Author, Pinpoint } from "../../src/types/citation";
import { FormattedRun } from "../../src/types/formattedRun";
import {
  formatAuthorName,
  invertAuthorName,
  formatAuthors,
  formatBodyAuthor,
  formatJudicialAuthor,
} from "../../src/engine/rules/v4/secondary/authors";
import {
  formatSecondaryTitle,
  formatSecondaryShortTitle,
  formatUrl,
  formatArchivedSource,
  shouldIncludeUrl,
} from "../../src/engine/rules/v4/secondary/general";
import {
  formatJournalArticle,
  formatJournalArticlePart,
  formatSymposiumArticle,
  formatOnlineJournalArticle,
  formatForthcomingArticle,
} from "../../src/engine/rules/v4/secondary/journals";
import {
  formatBook,
  formatEdition,
  formatMultiVolumeBook,
  formatBookChapter,
  formatTranslatedBook,
  formatForthcomingBook,
  formatAudiobook,
} from "../../src/engine/rules/v4/secondary/books";

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

/** Checks that no run is italic. */
function hasNoItalic(runs: FormattedRun[]): boolean {
  return runs.every((r) => !r.italic);
}

// ─── Chapter 4: Secondary Sources General ─────────────────────────────────

describe("Chapter 4 — Secondary Sources General", () => {
  // ── Rule 4.1.1: Author Name Formatting ──────────────────────────────────

  describe("Rule 4.1.1 — Author names", () => {
    it("should format a simple name as given on title page", () => {
      const author: Author = { givenNames: "Katy", surname: "Barnett" };
      expect(formatAuthorName(author)).toBe("Katy Barnett");
    });

    it("should strip post-nominals (AM, LLB, etc)", () => {
      // AGLC4 Rule 4.1.1: post-nominals should not be included
      const author: Author = {
        givenNames: "Stephen",
        surname: "Gageler SC",
      };
      expect(formatAuthorName(author)).toBe("Stephen Gageler");
    });

    it("should strip honorific titles (Dr, Professor, The Hon)", () => {
      // AGLC4 Rule 4.1.1 Example: "Associate Professor Katy Barnett" → "Katy Barnett"
      const prof: Author = {
        givenNames: "Professor Ian",
        surname: "Malkin",
      };
      expect(formatAuthorName(prof)).toBe("Ian Malkin");

      const dr: Author = { givenNames: "Dr", surname: "Cockburn" };
      // In AGLC4 the author name in citation is "John Cockburn"
      // but if givenNames only has "Dr", stripping yields surname only
      expect(formatAuthorName(dr)).toBe("Cockburn");
    });

    it("should retain Sir, Dame, Lord, Lady, Viscount, Baron, Baroness", () => {
      // AGLC4 Rule 4.1.1: "Dame Nellie Melba" → "Dame Nellie Melba"
      const dame: Author = {
        givenNames: "Dame Nellie",
        surname: "Melba",
      };
      expect(formatAuthorName(dame)).toBe("Dame Nellie Melba");

      // AGLC4 Rule 4.1.1: "Lord Nicholls" → "Lord Nicholls"
      const lord: Author = { givenNames: "Lord", surname: "Nicholls" };
      expect(formatAuthorName(lord)).toBe("Lord Nicholls");

      // AGLC4 Rule 4.1.1: "Baroness Hale" → "Baroness Hale"
      const baroness: Author = {
        givenNames: "Baroness",
        surname: "Hale",
      };
      expect(formatAuthorName(baroness)).toBe("Baroness Hale");
    });

    it("should collapse initials without spaces or full stops", () => {
      // AGLC4 Rule 4.1.1: "HLA Hart" (initials with no spaces/dots)
      const hart: Author = { givenNames: "H.L.A.", surname: "Hart" };
      expect(formatAuthorName(hart)).toBe("HLA Hart");

      const hart2: Author = { givenNames: "H. L. A.", surname: "Hart" };
      expect(formatAuthorName(hart2)).toBe("HLA Hart");

      const hart3: Author = { givenNames: "H L A", surname: "Hart" };
      expect(formatAuthorName(hart3)).toBe("HLA Hart");
    });

    it("should collapse initials: RJ Ellicott (Example 5.2 ex 2)", () => {
      // AGLC4 Example 2 under Rule 5.2: "RJ Ellicott" (not "RJ Ellicott QC")
      const author: Author = { givenNames: "R.J.", surname: "Ellicott" };
      expect(formatAuthorName(author)).toBe("RJ Ellicott");
    });

    it("should strip post-nominals from surname: KM Hayne AC (Example 1 under Rule 4.1.1)", () => {
      // AGLC4 p84 Example 1: "Justice KM Hayne" not "The Hon Justice KM Hayne AC"
      const author: Author = {
        givenNames: "K.M.",
        surname: "Hayne AC",
      };
      expect(formatAuthorName(author)).toBe("KM Hayne");
    });

    it("should invert name for bibliography: surname first", () => {
      const author: Author = { givenNames: "H.L.A.", surname: "Hart" };
      expect(invertAuthorName(author)).toBe("Hart, HLA");
    });

    it("should invert name with retained title", () => {
      const author: Author = {
        givenNames: "Sir Anthony",
        surname: "Mason",
      };
      expect(invertAuthorName(author)).toBe("Mason, Sir Anthony");
    });

    it("should handle Ralph H Folsom (AGLC4 6.1 Example 1)", () => {
      // "Ralph H Folsom" — not "Ralph H. Folsom"
      const author: Author = { givenNames: "Ralph H.", surname: "Folsom" };
      expect(formatAuthorName(author)).toBe("Ralph H Folsom");
    });
  });

  // ── Rule 4.1.2: Multiple Authors ────────────────────────────────────────

  describe("Rule 4.1.2 — Multiple authors", () => {
    it("should join two authors with 'and'", () => {
      // AGLC4 Example 2: "James Edelman and Elise Bant"
      const authors: Author[] = [
        { givenNames: "James", surname: "Edelman" },
        { givenNames: "Elise", surname: "Bant" },
      ];
      const runs = formatAuthors(authors);
      expect(toPlainText(runs)).toBe("James Edelman and Elise Bant");
    });

    it("should join three authors with commas and 'and'", () => {
      // AGLC4 Rule 6.6 Example 29: "Nicholas Aroney, Scott Prasser and JR Nethercote"
      const authors: Author[] = [
        { givenNames: "Nicholas", surname: "Aroney" },
        { givenNames: "Scott", surname: "Prasser" },
        { givenNames: "J.R.", surname: "Nethercote" },
      ];
      const runs = formatAuthors(authors);
      expect(toPlainText(runs)).toBe(
        "Nicholas Aroney, Scott Prasser and JR Nethercote"
      );
    });

    it("should use 'et al' for four or more authors", () => {
      // AGLC4 Example 3: "Paul Rishworth et al"
      const authors: Author[] = [
        { givenNames: "Paul", surname: "Rishworth" },
        { givenNames: "Grant", surname: "Huscroft" },
        { givenNames: "Scott", surname: "Optican" },
        { givenNames: "Richard", surname: "Mahoney" },
      ];
      const runs = formatAuthors(authors);
      expect(toPlainText(runs)).toBe("Paul Rishworth et al");
    });

    it("should return empty array for no authors", () => {
      expect(formatAuthors([])).toEqual([]);
    });
  });

  // ── Rule 4.1.3: Editors ─────────────────────────────────────────────────

  describe("Rule 4.1.3 — Editors", () => {
    it("should append '(ed)' for a single editor", () => {
      // AGLC4 Example 6: "Peter Birks (ed)"
      const editors: Author[] = [
        { givenNames: "Peter", surname: "Birks" },
      ];
      const runs = formatAuthors(editors, true);
      expect(toPlainText(runs)).toBe("Peter Birks (ed)");
    });

    it("should append '(eds)' for multiple editors", () => {
      // AGLC4 Example 7: "Cedric Ryngaert et al (eds)"
      const editors: Author[] = [
        { givenNames: "Cedric", surname: "Ryngaert" },
        { givenNames: "Second", surname: "Editor" },
        { givenNames: "Third", surname: "Editor" },
        { givenNames: "Fourth", surname: "Editor" },
      ];
      const runs = formatAuthors(editors, true);
      expect(toPlainText(runs)).toBe("Cedric Ryngaert et al (eds)");
    });

    it("should append '(eds)' for two editors", () => {
      const editors: Author[] = [
        { givenNames: "Isabelle", surname: "Bartkowiak-Th\u00e9ron" },
        { givenNames: "Nicole", surname: "Asquith" },
      ];
      const runs = formatAuthors(editors, true);
      expect(toPlainText(runs)).toBe(
        "Isabelle Bartkowiak-Th\u00e9ron and Nicole Asquith (eds)"
      );
    });
  });

  // ── Rule 4.1.4: Body Authors ────────────────────────────────────────────

  describe("Rule 4.1.4 — Body authors", () => {
    it("should format body name as author", () => {
      const runs = formatBodyAuthor({ body: "Family Court of Australia" });
      expect(toPlainText(runs)).toBe("Family Court of Australia");
    });

    it("should include jurisdiction in parentheses when provided", () => {
      // AGLC4 Example 10: "Information Management Committee, Department of Justice and Attorney-General (Qld)"
      const runs = formatBodyAuthor({
        body: "Department of Justice and Attorney-General",
        jurisdiction: "Qld",
        subdivision: "Information Management Committee",
      });
      expect(toPlainText(runs)).toBe(
        "Information Management Committee, Department of Justice and Attorney-General (Qld)"
      );
    });

    it("should include subdivision before body name", () => {
      // AGLC4 Example 13: "Department for Women (NSW)"
      const runs = formatBodyAuthor({
        body: "Department for Women",
        jurisdiction: "NSW",
      });
      expect(toPlainText(runs)).toBe("Department for Women (NSW)");
    });
  });

  // ── Rule 4.1.5: Judicial Authors ────────────────────────────────────────

  describe("Rule 4.1.5 — Judicial authors", () => {
    it("should include judicial title before name", () => {
      // AGLC4 Example 1: "Justice KM Hayne"
      const author: Author = {
        givenNames: "K.M.",
        surname: "Hayne",
        isJudge: true,
        judicialTitle: "Justice",
      };
      const runs = formatJudicialAuthor(author);
      expect(toPlainText(runs)).toBe("Justice KM Hayne");
    });
  });

  // ── Rule 4.2: Secondary Source Titles ───────────────────────────────────

  describe("Rule 4.2 — Titles", () => {
    it("should italicise book titles", () => {
      const runs = formatSecondaryTitle(
        "International Law",
        "book"
      );
      expect(runs).toEqual([
        { text: "International Law", italic: true },
      ]);
    });

    it("should quote journal article titles in single curly quotes", () => {
      const runs = formatSecondaryTitle(
        "A Personal Journey through the Law of Torts",
        "journal.article"
      );
      expect(runs[0].text).toBe(
        "\u2018A Personal Journey Through the Law of Torts\u2019"
      );
      expect(runs[0].italic).toBeFalsy();
    });

    it("should remove full stops from within the title", () => {
      const runs = formatSecondaryTitle(
        "The U.N. Convention",
        "book"
      );
      expect(runs[0].text).toBe("The UN Convention");
    });
  });

  // ── Rule 4.3: Short Titles ──────────────────────────────────────────────

  describe("Rule 4.3 — Short titles", () => {
    it("should wrap book short title in parentheses with italic quotes", () => {
      const runs = formatSecondaryShortTitle("International Law", "book");
      // Expect: ( + ' + International Law (italic) + ' + )
      const text = toPlainText(runs);
      expect(text).toBe("(\u2018International Law\u2019)");
      // The title itself should be italic
      expect(italicText(runs)).toBe("International Law");
    });

    it("should wrap article short title in parentheses with non-italic quotes", () => {
      const runs = formatSecondaryShortTitle(
        "Personal Journey",
        "journal.article"
      );
      const text = toPlainText(runs);
      expect(text).toBe("(\u2018Personal Journey\u2019)");
      expect(hasNoItalic(runs)).toBe(true);
    });
  });

  // ── Rule 4.4: URLs ──────────────────────────────────────────────────────

  describe("Rule 4.4 — URLs", () => {
    it("should format URL in angle brackets", () => {
      const runs = formatUrl("https://example.com");
      expect(toPlainText(runs)).toBe("<https://example.com>");
    });

    it("should include URL only when no print version exists", () => {
      expect(shouldIncludeUrl(false)).toBe(true);
      expect(shouldIncludeUrl(true)).toBe(false);
    });
  });

  // ── Rule 4.5: Archived Sources ──────────────────────────────────────────

  describe("Rule 4.5 — Archived sources", () => {
    it("should format archived source with comma prefix", () => {
      const runs = formatArchivedSource("https://perma.cc/DC8L-Y5GD");
      expect(toPlainText(runs)).toBe(
        ", archived at <https://perma.cc/DC8L-Y5GD>"
      );
    });
  });
});

// ─── Chapter 5: Journal Articles ──────────────────────────────────────────

describe("Chapter 5 — Journal Articles", () => {
  // ── Rules 5.1–5.7: Standard Journal Article ─────────────────────────────

  describe("Rules 5.1–5.7 — Standard journal article citation", () => {
    it("should format Harold Luntz journal article (AGLC4 Chapter 5 table)", () => {
      // AGLC4 Chapter 5 opening example:
      // Harold Luntz, 'A Personal Journey through the Law of Torts'
      // (2005) 27(3) Sydney Law Review 393, 400.
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
      const text = toPlainText(runs);
      expect(text).toBe(
        "Harold Luntz, \u2018A Personal Journey Through the Law of Torts\u2019 (2005) 27(3) Sydney Law Review 393, 400"
      );
      // Journal name should be italic
      expect(italicText(runs)).toBe("Sydney Law Review");
    });

    it("should format RJ Ellicott article (AGLC4 5.2 Example 2)", () => {
      // RJ Ellicott, 'The Autochthonous Expedient and the Federal Court'
      // (2008) 82(10) Australian Law Journal 700.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "R.J.", surname: "Ellicott" }],
        title: "The Autochthonous Expedient and the Federal Court",
        year: 2008,
        volume: 82,
        issue: "10",
        journal: "Australian Law Journal",
        startingPage: 700,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "RJ Ellicott, \u2018The Autochthonous Expedient and the Federal Court\u2019 (2008) 82(10) Australian Law Journal 700"
      );
    });

    it("should format Jeremy Masters article with pinpoint range (AGLC4 5.4 Example 3)", () => {
      // Jeremy Masters, 'Easing the Parting' (2008) 82(11) Law Institute Journal 68, 69–71.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Jeremy", surname: "Masters" }],
        title: "Easing the Parting",
        year: 2008,
        volume: 82,
        issue: "11",
        journal: "Law Institute Journal",
        startingPage: 68,
        pinpoint: { type: "page", value: "69\u201371" },
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Jeremy Masters, \u2018Easing the Parting\u2019 (2008) 82(11) Law Institute Journal 68, 69\u201371"
      );
    });

    it("should format article with season issue identifier (AGLC4 5.4 Example 6)", () => {
      // AP Simester, 'Accessory Liability and Common Unlawful Purposes'
      // (2017) 133 (January) Law Quarterly Review 73.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "A.P.", surname: "Simester" }],
        title: "Accessory Liability and Common Unlawful Purposes",
        year: 2017,
        volume: 133,
        issue: "January",
        journal: "Law Quarterly Review",
        startingPage: 73,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "AP Simester, \u2018Accessory Liability and Common Unlawful Purposes\u2019 (2017) 133(January) Law Quarterly Review 73"
      );
    });

    it("should format Sir Zelman Cowen article with pinpoint to starting page (AGLC4 5.7 Example 13)", () => {
      // Sir Zelman Cowen, 'The Press, the Courts and the Law'
      // (1979) 12(1) Melbourne University Law Review 1, 1–9.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Sir Zelman", surname: "Cowen" }],
        title: "The Press, the Courts and the Law",
        year: 1979,
        volume: 12,
        issue: "1",
        journal: "Melbourne University Law Review",
        startingPage: 1,
        pinpoint: { type: "page", value: "1\u20139" },
      });
      const text = toPlainText(runs);
      expect(text).toContain("Sir Zelman Cowen");
      expect(text).toContain("Melbourne University Law Review 1, 1\u20139");
    });

    it("should format article without pinpoint", () => {
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Jani", surname: "McCutcheon" }],
        title: "Curing the Authorless Void",
        year: 2013,
        volume: 37,
        issue: "1",
        journal: "Melbourne University Law Review",
        startingPage: 46,
      });
      const text = toPlainText(runs);
      expect(text).toContain("Melbourne University Law Review 46");
      expect(text).not.toContain(",  46"); // no trailing comma
    });

    it("should format Hailegabriel article (AGLC4 5.6 Example 12)", () => {
      // Hailegabriel G Feyissa, 'European Extraterritoriality in Semicolonial Ethiopia'
      // (2016) 17(1) Melbourne Journal of International Law 107.
      const runs = formatJournalArticle({
        authors: [
          { givenNames: "Hailegabriel G", surname: "Feyissa" },
        ],
        title: "European Extraterritoriality in Semicolonial Ethiopia",
        year: 2016,
        volume: 17,
        issue: "1",
        journal: "Melbourne Journal of International Law",
        startingPage: 107,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Hailegabriel G Feyissa, \u2018European Extraterritoriality in Semicolonial Ethiopia\u2019 (2016) 17(1) Melbourne Journal of International Law 107"
      );
    });
  });

  // ── Rule 5.8: Articles Published in Parts ───────────────────────────────

  describe("Rule 5.8 — Articles published in parts", () => {
    it("should insert (Pt N) between title and year (AGLC4 5.8 Example 17)", () => {
      // Jacobus tenBroek, 'California's Dual System of Family Law…' (Pt 1)
      // (1964) 16(2) Stanford Law Review 257.
      const runs = formatJournalArticlePart({
        authors: [{ givenNames: "Jacobus", surname: "tenBroek" }],
        title: "California's Dual System of Family Law",
        year: 1964,
        volume: 16,
        issue: "2",
        journal: "Stanford Law Review",
        startingPage: 257,
        partNumber: 1,
      });
      const text = toPlainText(runs);
      expect(text).toContain("(Part 1)");
      expect(text).toContain("(1964)");
      // Part should appear between title and year
      const ptIdx = text.indexOf("(Part 1)");
      const yearIdx = text.indexOf("(1964)");
      expect(ptIdx).toBeLessThan(yearIdx);
    });
  });

  // ── Rule 5.9: Symposia ──────────────────────────────────────────────────

  describe("Rule 5.9 — Symposia", () => {
    it("should include symposium title after 'in' (AGLC4 5.9 Examples 20-21)", () => {
      // Symposium, 'Contemporary Human Rights in Australia'
      // (2002) 26(2) Melbourne University Law Review 251.
      const runs = formatSymposiumArticle({
        authors: [{ givenNames: "", surname: "Symposium" }],
        title: "Contemporary Human Rights in Australia",
        year: 2002,
        volume: 26,
        issue: "2",
        journal: "Melbourne University Law Review",
        startingPage: 251,
        symposiumTitle: "Contemporary Human Rights in Australia",
      });
      const text = toPlainText(runs);
      expect(text).toContain(" in Contemporary Human Rights in Australia");
    });
  });

  // ── Rule 5.10: Online Journal Articles ──────────────────────────────────

  describe("Rule 5.10 — Online journal articles", () => {
    it("should include URL in angle brackets at end", () => {
      const runs = formatOnlineJournalArticle({
        authors: [{ givenNames: "Kate", surname: "Lewins" }],
        title: "What's the Trade Practices Act Got to Do with It",
        year: 2006,
        volume: 13,
        issue: "1",
        journal: "eLaw Journal: Murdoch University Electronic Journal of Law",
        url: "https://example.com/article",
      });
      const text = toPlainText(runs);
      expect(text).toContain("<https://example.com/article>");
    });

    it("should include article number when provided", () => {
      const runs = formatOnlineJournalArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        year: 2016,
        volume: 8,
        issue: "7",
        journal: "Nutrients",
        articleNumber: "416:1\u201319",
        url: "https://example.com",
      });
      const text = toPlainText(runs);
      expect(text).toContain("416:1\u201319");
    });
  });

  // ── Rule 5.11: Forthcoming Articles ─────────────────────────────────────

  describe("Rule 5.11 — Forthcoming articles", () => {
    it("should include (forthcoming) after journal name (AGLC4 5.11 Example 26)", () => {
      // Geneviève Helleringer and Anne-Lise Sibony, … (2017) 23
      // Columbia Journal of European Law (forthcoming).
      const runs = formatForthcomingArticle({
        authors: [
          { givenNames: "Genevi\u00e8ve", surname: "Helleringer" },
          { givenNames: "Anne-Lise", surname: "Sibony" },
        ],
        title: "European Consumer Protection through the Behavioral Lens",
        journal: "Columbia Journal of European Law",
      });
      const text = toPlainText(runs);
      expect(text).toContain("(forthcoming)");
      expect(text).toContain("Columbia Journal of European Law");
      expect(italicText(runs)).toBe("Columbia Journal of European Law");
    });
  });
});

// ─── Chapter 6: Books ────────────────────────────────────────────────────

describe("Chapter 6 — Books", () => {
  // ── Rules 6.1–6.4: Standard Book Citation ───────────────────────────────

  describe("Rules 6.1–6.4 — Standard book citation", () => {
    it("should format Shaw, International Law (AGLC4 Chapter 6 table)", () => {
      // Malcolm N Shaw, International Law (Cambridge University Press, 7th ed, 2014) 578.
      const runs = formatBook({
        authors: [{ givenNames: "Malcolm N", surname: "Shaw" }],
        title: "International Law",
        publisher: "Cambridge University Press",
        edition: 7,
        year: 2014,
        pinpoint: { type: "page", value: "578" },
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Malcolm N Shaw, International Law (Cambridge University Press, 7th ed, 2014) 578"
      );
      expect(italicText(runs)).toBe("International Law");
    });

    it("should format Folsom (AGLC4 6.1 Example 1): initials without dots", () => {
      // Ralph H Folsom, Principles of European Union Law (Thomson West, 2005).
      const runs = formatBook({
        authors: [{ givenNames: "Ralph H.", surname: "Folsom" }],
        title: "Principles of European Union Law",
        publisher: "Thomson West",
        year: 2005,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Ralph H Folsom, Principles of European Union Law (Thomson West, 2005)"
      );
    });

    it("should format Rishworth et al (AGLC4 6.1 Example 3)", () => {
      // Paul Rishworth et al, The New Zealand Bill of Rights
      // (Oxford University Press, 2003).
      const runs = formatBook({
        authors: [
          { givenNames: "Paul", surname: "Rishworth" },
          { givenNames: "Grant", surname: "Huscroft" },
          { givenNames: "Scott", surname: "Optican" },
          { givenNames: "Richard", surname: "Mahoney" },
        ],
        title: "The New Zealand Bill of Rights",
        publisher: "Oxford University Press",
        year: 2003,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Paul Rishworth et al, The New Zealand Bill of Rights (Oxford University Press, 2003)"
      );
    });

    it("should format book without edition number (first edition omitted)", () => {
      // AGLC4 Rule 6.3.2: first edition not included
      const runs = formatBook({
        authors: [{ givenNames: "Ronald", surname: "Dworkin" }],
        title: "Justice for Hedgehogs",
        publisher: "Belknap Press",
        year: 2011,
        pinpoint: { type: "page", value: "10" },
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Ronald Dworkin, Justice for Hedgehogs (Belknap Press, 2011) 10"
      );
    });

    it("should format Atiyah with page pinpoint after publication details (AGLC4 6.4 Example 23)", () => {
      // PS Atiyah, Essays on Contract (Clarendon Press, 1986) 247–8.
      // [Not: … (Clarendon Press, 1986), 247–8.]
      const runs = formatBook({
        authors: [{ givenNames: "P.S.", surname: "Atiyah" }],
        title: "Essays on Contract",
        publisher: "Clarendon Press",
        year: 1986,
        pinpoint: { type: "page", value: "247\u20138" },
      });
      const text = toPlainText(runs);
      // No comma before pinpoint in books
      expect(text).toContain("1986) 247\u20138");
      expect(text).not.toContain("1986), 247");
    });

    it("should format Saunders with chapter pinpoint (AGLC4 6.4 Example 25)", () => {
      // Cheryl Saunders, The Constitution of Australia: A Contextual Analysis
      // (Hart Publishing, 2011) ch 5.
      const runs = formatBook({
        authors: [{ givenNames: "Cheryl", surname: "Saunders" }],
        title: "The Constitution of Australia: A Contextual Analysis",
        publisher: "Hart Publishing",
        year: 2011,
        pinpoint: { type: "chapter", value: "5" },
      });
      const text = toPlainText(runs);
      expect(text).toContain("2011) ch 5");
    });

    it("should format two authors: Edelman and Bant (AGLC4 4.1.2 Example 2)", () => {
      // James Edelman and Elise Bant, Unjust Enrichment
      // (Hart Publishing, 2nd ed, 2016).
      const runs = formatBook({
        authors: [
          { givenNames: "James", surname: "Edelman" },
          { givenNames: "Elise", surname: "Bant" },
        ],
        title: "Unjust Enrichment",
        publisher: "Hart Publishing",
        edition: 2,
        year: 2016,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "James Edelman and Elise Bant, Unjust Enrichment (Hart Publishing, 2nd ed, 2016)"
      );
    });
  });

  // ── Rule 6.3.2: Edition Number ──────────────────────────────────────────

  describe("Rule 6.3.2 — Edition formatting", () => {
    it("should return empty string for first edition", () => {
      expect(formatEdition(1)).toBe("");
    });

    it("should format 2nd edition", () => {
      expect(formatEdition(2)).toBe("2nd ed");
    });

    it("should format 3rd edition", () => {
      expect(formatEdition(3)).toBe("3rd ed");
    });

    it("should format 4th edition", () => {
      expect(formatEdition(4)).toBe("4th ed");
    });

    it("should format 5th edition", () => {
      expect(formatEdition(5)).toBe("5th ed");
    });

    it("should format 7th edition (AGLC4 6.3.2 Example: Shaw)", () => {
      expect(formatEdition(7)).toBe("7th ed");
    });

    it("should format 11th edition (special case: 11th not 11st)", () => {
      expect(formatEdition(11)).toBe("11th ed");
    });

    it("should format 12th edition", () => {
      expect(formatEdition(12)).toBe("12th ed");
    });

    it("should format 13th edition", () => {
      expect(formatEdition(13)).toBe("13th ed");
    });

    it("should format 15th edition (AGLC4 6.3.2 Example 14)", () => {
      expect(formatEdition(15)).toBe("15th ed");
    });

    it("should format 21st edition", () => {
      expect(formatEdition(21)).toBe("21st ed");
    });

    it("should format revised edition: '3rd rev ed' (AGLC4 6.3.3 Example 16)", () => {
      expect(formatEdition(3, true)).toBe("3rd rev ed");
    });

    it("should not include edition for edition <= 1", () => {
      expect(formatEdition(0)).toBe("");
      expect(formatEdition(1)).toBe("");
    });
  });

  // ── Rule 6.5: Multi-Volume Books ───────────────────────────────────────

  describe("Rule 6.5 — Multi-volume books", () => {
    it("should include volume after publication details (AGLC4 6.5 Example 26)", () => {
      // Joel Feinberg, The Moral Limits of the Criminal Law
      // (Oxford University Press, 1984–88) vol 4, 45.
      const runs = formatMultiVolumeBook({
        authors: [{ givenNames: "Joel", surname: "Feinberg" }],
        title: "The Moral Limits of the Criminal Law",
        publisher: "Oxford University Press",
        year: 1984,
        volume: 4,
        pinpoint: { type: "page", value: "45" },
      });
      const text = toPlainText(runs);
      expect(text).toContain("vol 4, 45");
    });

    it("should format multi-volume without pinpoint", () => {
      const runs = formatMultiVolumeBook({
        authors: [{ givenNames: "Jeremy", surname: "Bentham" }],
        title: "Rationale of Judicial Evidence",
        publisher: "Garland Publishing",
        year: 1978,
        volume: 1,
      });
      const text = toPlainText(runs);
      expect(text).toContain("1978) vol 1");
      expect(text).not.toContain("vol 1,");
    });
  });

  // ── Rule 6.6: Chapters in Edited Books ─────────────────────────────────

  describe("Rule 6.6 — Chapters in edited books", () => {
    it("should format Waldron chapter (AGLC4 6.6.1 Example 28)", () => {
      // Jeremy Waldron, 'Do Judges Reason Morally?' in Grant Huscroft (ed),
      // Expounding the Constitution: Essays in Constitutional Theory
      // (Cambridge University Press, 2008) 38.
      const runs = formatBookChapter({
        chapterAuthors: [{ givenNames: "Jeremy", surname: "Waldron" }],
        chapterTitle: "Do Judges Reason Morally?",
        editors: [{ givenNames: "Grant", surname: "Huscroft" }],
        bookTitle:
          "Expounding the Constitution: Essays in Constitutional Theory",
        publisher: "Cambridge University Press",
        year: 2008,
        startingPage: 38,
      });
      const text = toPlainText(runs);
      // Chapter title in quotes, not italic
      expect(text).toContain(
        "\u2018Do Judges Reason Morally?\u2019"
      );
      // 'in' between chapter title and editor
      expect(text).toContain("in Grant Huscroft (ed)");
      // Book title is italic
      expect(italicText(runs)).toContain("Expounding the Constitution");
      // Starting page
      expect(text).toContain("2008) 38");
    });

    it("should format Russell chapter with multiple editors (AGLC4 6.6.1 Example 29)", () => {
      // Meg Russell, 'Reform of the House of Lords...' in Nicholas Aroney,
      // Scott Prasser and JR Nethercote (eds), Restraining Elective Dictatorship...
      // (University of Western Australia Press, 2008) 119.
      const runs = formatBookChapter({
        chapterAuthors: [{ givenNames: "Meg", surname: "Russell" }],
        chapterTitle:
          "Reform of the House of Lords: Lessons for Bicameralism",
        editors: [
          { givenNames: "Nicholas", surname: "Aroney" },
          { givenNames: "Scott", surname: "Prasser" },
          { givenNames: "J.R.", surname: "Nethercote" },
        ],
        bookTitle:
          "Restraining Elective Dictatorship: The Upper House Solution?",
        publisher: "University of Western Australia Press",
        year: 2008,
        startingPage: 119,
      });
      const text = toPlainText(runs);
      expect(text).toContain(
        "Nicholas Aroney, Scott Prasser and JR Nethercote (eds)"
      );
      expect(text).toContain("2008) 119");
    });

    it("should format chapter with pinpoint (AGLC4 6.6.1 Example 31)", () => {
      // Janet Ransley, 'Illusions of Reform...' in ... (2008) 248, 252–3.
      const runs = formatBookChapter({
        chapterAuthors: [{ givenNames: "Janet", surname: "Ransley" }],
        chapterTitle: "Illusions of Reform",
        editors: [
          { givenNames: "Nicholas", surname: "Aroney" },
          { givenNames: "Scott", surname: "Prasser" },
          { givenNames: "J.R.", surname: "Nethercote" },
        ],
        bookTitle: "Restraining Elective Dictatorship",
        publisher: "University of Western Australia Press",
        year: 2008,
        startingPage: 248,
        pinpoint: { type: "page", value: "252\u20133" },
      });
      const text = toPlainText(runs);
      expect(text).toContain("248, 252\u20133");
    });
  });

  // ── Rule 6.7: Translated Books ─────────────────────────────────────────

  describe("Rule 6.7 — Translated books", () => {
    it("should include translator in publication details preceded by 'tr'", () => {
      const runs = formatTranslatedBook({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Book",
        publisher: "Publisher",
        year: 2020,
        translator: "Jane Smith",
      });
      const text = toPlainText(runs);
      expect(text).toContain("(tr Jane Smith, Publisher, 2020)");
    });
  });

  // ── Rule 6.8: Forthcoming Books ────────────────────────────────────────

  describe("Rule 6.8 — Forthcoming books", () => {
    it("should replace year with 'forthcoming'", () => {
      const runs = formatForthcomingBook({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Book",
        publisher: "Publisher",
      });
      const text = toPlainText(runs);
      expect(text).toContain("(Publisher, forthcoming)");
    });
  });

  // ── Rule 6.9: Audiobooks ───────────────────────────────────────────────

  describe("Rule 6.9 — Audiobooks", () => {
    it("should include narrator after publication details", () => {
      const runs = formatAudiobook({
        authors: [{ givenNames: "George", surname: "Orwell" }],
        title: "Nineteen Eighty-Four",
        publisher: "Penguin Books",
        year: 2011,
        narrator: "Stephen Fry",
      });
      const text = toPlainText(runs);
      expect(text).toContain("(audiobook, narrated by Stephen Fry)");
    });
  });
});
