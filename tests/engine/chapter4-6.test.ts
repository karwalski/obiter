/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Tests for AGLC4 Chapters 4–6: Secondary Sources General, Journal Articles, Books
 *
 * All test cases use examples directly from the AGLC4, 4th edition.
 * Example numbers in comments refer to AGLC4 numbered examples.
 */

import { Author } from "../../src/types/citation";
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
  formatOnlineJournalArticle,
  formatForthcomingArticle,
} from "../../src/engine/rules/v4/secondary/journals";
import {
  formatBook,
  formatEdition,
  formatEditionRuns,
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
      // AGLC4 Rule 4.1.1 Example: "Professor Ian Malkin" → "Ian Malkin"
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

    it("should strip 'Associate Professor' per AGLC4 rule 4.1.1 example table", () => {
      // AGLC4 rule 4.1.1: "Associate Professor Katy Barnett" → "Katy Barnett"
      const author: Author = {
        givenNames: "Associate Professor Katy",
        surname: "Barnett",
      };
      expect(formatAuthorName(author)).toBe("Katy Barnett");
    });

    it("should strip conventional titles Ms/Mr per AGLC4 rule 4.1.1 example table", () => {
      // AGLC4 rule 4.1.1: "Ms Sharon Rodrick" → "Sharon Rodrick"
      const ms: Author = { givenNames: "Ms Sharon", surname: "Rodrick" };
      expect(formatAuthorName(ms)).toBe("Sharon Rodrick");

      // AGLC4 rule 4.1.1: "Mr Gageler SC" → "Stephen Gageler"
      const mr: Author = { givenNames: "Mr Stephen", surname: "Gageler SC" };
      expect(formatAuthorName(mr)).toBe("Stephen Gageler");
    });

    it("should not mistake all-caps initials for a conventional title", () => {
      // 'MS' here is a pair of initials, not the title 'Ms'
      const author: Author = { givenNames: "MS", surname: "Jacobs" };
      expect(formatAuthorName(author)).toBe("MS Jacobs");
    });

    it("should strip stacked honorific titles ('The Hon Dr') per rule 4.1.1", () => {
      const author: Author = {
        givenNames: "The Hon Dr John",
        surname: "Cockburn",
      };
      expect(formatAuthorName(author)).toBe("John Cockburn");
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
      expect(toPlainText(runs)).toBe("Nicholas Aroney, Scott Prasser and JR Nethercote");
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
      const editors: Author[] = [{ givenNames: "Peter", surname: "Birks" }];
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
      expect(toPlainText(runs)).toBe("Isabelle Bartkowiak-Th\u00e9ron and Nicole Asquith (eds)");
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

    it("should strip corporate designators and a leading 'The' from company names (rule 4.1.4)", () => {
      // AGLC4 rule 4.1.4: 'Pty', 'Ltd', 'Co', 'Inc' and a leading 'the'
      // are stripped from company-author names.
      const runs = formatBodyAuthor({ body: "The Smith Group Pty Ltd" });
      expect(toPlainText(runs)).toBe("Smith Group");
    });
  });

  // ── Rule 4.1.5: Judicial Authors ────────────────────────────────────────

  describe("Rule 4.1.5 — Judicial authors", () => {
    it("should include the judicial title when it appears on the source (AGLC4 ex 19, rule 4.1.5)", () => {
      // Extra-curial writing where the title IS printed on the source:
      // 'Justice Michael Kirby, "Transnational Judicial Dialogue…"' —
      // callers set judicialTitle only in that case.
      const author: Author = {
        givenNames: "Michael",
        surname: "Kirby",
        isJudge: true,
        judicialTitle: "Justice",
      };
      const runs = formatJudicialAuthor(author);
      expect(toPlainText(runs)).toBe("Justice Michael Kirby");
    });

    it("should omit the judicial title when it is not on the source (AGLC4 ex 18, rule 4.1.5)", () => {
      // A serving judge whose source carries no judicial title is cited by
      // plain name (James Edelman and Elise Bant, Unjust Enrichment):
      // judicialTitle is left unset, so no title is emitted.
      const author: Author = {
        givenNames: "James",
        surname: "Edelman",
        isJudge: true,
      };
      const runs = formatJudicialAuthor(author);
      expect(toPlainText(runs)).toBe("James Edelman");
    });

    it("should omit the former judicial title of a former judicial officer (AGLC4 ex 20, rule 4.1.5)", () => {
      // 'Michael Kirby, "The Dreyfus Affair…" (Speech, …)' — former
      // officers lose the former title, so judicialTitle stays unset.
      const author: Author = {
        givenNames: "Michael",
        surname: "Kirby",
        isJudge: true,
      };
      const runs = formatJudicialAuthor(author);
      expect(toPlainText(runs)).toBe("Michael Kirby");
    });

    it("routes authors carrying an on-source judicial title through formatJudicialAuthor (PARITY-121)", () => {
      // formatAuthors is the pipeline every secondary formatter calls; an
      // entry with judicialTitle renders title-first per rule 4.1.5, while
      // plain co-authors keep the rule 4.1.2 'and' joining.
      const runs = formatAuthors([
        { givenNames: "Michael", surname: "Kirby", isJudge: true, judicialTitle: "Justice" },
        { givenNames: "Elise", surname: "Bant" },
      ]);
      expect(toPlainText(runs)).toBe("Justice Michael Kirby and Elise Bant");
    });

    it("formats a judicially-authored article per AGLC4 ex 19 (rule 4.1.5)", () => {
      const runs = formatJournalArticle({
        authors: [
          { givenNames: "Michael", surname: "Kirby", isJudge: true, judicialTitle: "Justice" },
        ],
        title: "Transnational Judicial Dialogue, Internationalisation of Law and Australian Judges",
        year: 2008,
        volume: 9,
        issue: "1",
        journal: "Melbourne Journal of International Law",
        startingPage: 171,
      });
      expect(toPlainText(runs)).toBe(
        "Justice Michael Kirby, " +
          "‘Transnational Judicial Dialogue, Internationalisation of Law and Australian Judges’ " +
          "(2008) 9(1) Melbourne Journal of International Law 171"
      );
    });
  });

  // ── Rule 4.2: Secondary Source Titles ───────────────────────────────────

  describe("Rule 4.2 — Titles", () => {
    it("should italicise book titles", () => {
      const runs = formatSecondaryTitle("International Law", "book");
      expect(runs).toEqual([{ text: "International Law", italic: true }]);
    });

    it("should quote journal article titles in single curly quotes", () => {
      const runs = formatSecondaryTitle(
        "A Personal Journey through the Law of Torts",
        "journal.article"
      );
      // 'through' stays lowercase: rule 1.7 lowercases prepositions.
      expect(runs[0].text).toBe("\u2018A Personal Journey through the Law of Torts\u2019");
      expect(runs[0].italic).toBeFalsy();
    });

    it("should remove full stops from within the title", () => {
      const runs = formatSecondaryTitle("The U.N. Convention", "book");
      expect(runs[0].text).toBe("The UN Convention");
    });

    it("should standardise a colon between title and subtitle (AGLC4 ex 25, rule 4.2)", () => {
      // Original title: 'Sharing Water from Transboundary Rivers in
      // Australia — An Interstate Common Law?' — the em dash becomes a colon.
      const runs = formatSecondaryTitle(
        "Sharing Water from Transboundary Rivers in Australia — An Interstate Common Law?",
        "journal.article"
      );
      expect(runs[0].text).toBe(
        "‘Sharing Water from Transboundary Rivers in Australia: An Interstate Common Law?’"
      );
    });

    it("should keep only the first subtitle (AGLC4 ex 24, rule 4.2)", () => {
      const runs = formatSecondaryTitle(
        "The Constitution of Malaysia: Further Perspectives and Developments: Essays in Honour of Tun Mohamed Suffian",
        "book"
      );
      expect(runs[0].text).toBe(
        "The Constitution of Malaysia: Further Perspectives and Developments"
      );
    });

    it("should keep a second subtitle that is a span of dates (rule 4.2)", () => {
      const runs = formatSecondaryTitle("A History: The Law of the Sea: 1945–75", "book");
      expect(runs[0].text).toBe("A History: The Law of the Sea: 1945–75");
    });

    it("should lowercase prepositions and capitalise after hyphens (rule 1.7 via 4.2)", () => {
      const runs = formatSecondaryTitle("Inquiry into the office of governor-general", "book");
      expect(runs[0].text).toBe("Inquiry into the Office of Governor-General");
    });

    it("should italicise a marked span inside a quoted title (AGLC4 ex 26, rule 4.2)", () => {
      // AGLC4 ex 26: 'The *Briginshaw* "Standard of Proof" in
      // Anti-Discrimination Law: "Pointing with a Wavering Finger"'
      const runs = formatSecondaryTitle(
        "The *Briginshaw* “Standard of Proof” in Anti-Discrimination Law: “Pointing with a Wavering Finger”",
        "journal.article"
      );
      expect(toPlainText(runs)).toBe(
        "‘The Briginshaw “Standard of Proof” in Anti-Discrimination Law: “Pointing with a Wavering Finger”’"
      );
      expect(italicText(runs)).toBe("Briginshaw");
    });

    it("should keep a marked span italic inside a book title — no part in roman (rule 4.2)", () => {
      // Rule 4.2: where the whole title is italicised (eg books), no part
      // of the title may appear in roman font; markers are consumed.
      const runs = formatSecondaryTitle("The *Mabo* Legacy", "book");
      expect(runs).toEqual([{ text: "The Mabo Legacy", italic: true }]);
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
      const runs = formatSecondaryShortTitle("Personal Journey", "journal.article");
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
      expect(toPlainText(runs)).toBe(", archived at <https://perma.cc/DC8L-Y5GD>");
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
      // 'through' stays lowercase: rule 1.7 lowercases prepositions.
      expect(text).toBe(
        "Harold Luntz, \u2018A Personal Journey through the Law of Torts\u2019 (2005) 27(3) Sydney Law Review 393, 400"
      );
      // Journal name should be italic
      expect(italicText(runs)).toBe("Sydney Law Review");
    });

    it("should format RJ Ellicott article (AGLC4 ex 1, rule 5.1)", () => {
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

    it("should format McCutcheon article with embedded italic case names (AGLC4 ex 2, rule 5.2)", () => {
      // Jani McCutcheon, 'Curing the Authorless Void: Protecting
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
        "Jani McCutcheon, \u2018Curing the Authorless Void: Protecting Computer-Generated Works following IceTV and Phone Directories\u2019 (2013) 37(1) Melbourne University Law Review 46"
      );
      // The case names and the journal are the only italic runs.
      expect(italicText(runs)).toBe("IceTVPhone DirectoriesMelbourne University Law Review");
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

    it("should format article with month issue identifier per AGLC4 ex 6 (rule 5.4)", () => {
      // A non-numeric issue is preceded by a space: '133 (January)'.
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
        "AP Simester, \u2018Accessory Liability and Common Unlawful Purposes\u2019 (2017) 133 (January) Law Quarterly Review 73"
      );
    });

    it("should format combined issues without a space per AGLC4 ex 8 (rule 5.4)", () => {
      // James Boyle, 'The Second Enclosure Movement and the Construction of
      // the Public Domain' (2003) 66(1\u20132) Law and Contemporary Problems 33, 37.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "James", surname: "Boyle" }],
        title: "The Second Enclosure Movement and the Construction of the Public Domain",
        year: 2003,
        volume: 66,
        issue: "1\u20132",
        journal: "Law and Contemporary Problems",
        startingPage: 33,
        pinpoint: { type: "page", value: "37" },
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "James Boyle, \u2018The Second Enclosure Movement and the Construction of the Public Domain\u2019 (2003) 66(1\u20132) Law and Contemporary Problems 33, 37"
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
      expect(text).toBe(
        "Sir Zelman Cowen, \u2018The Press, the Courts and the Law\u2019 (1979) 12(1) Melbourne University Law Review 1, 1\u20139"
      );
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
        authors: [{ givenNames: "Hailegabriel G", surname: "Feyissa" }],
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

  // ── Rule 5.3: Year (year-organised journals) ────────────────────────────

  describe("Rule 5.3 — Year-organised journals", () => {
    it("formats a year-organised journal per AGLC4 ex 4 (rule 5.3)", () => {
      // John Kleinig, 'Paternalism and Personal Integrity' [1983] (3)
      // Bulletin of the Australian Society of Legal Philosophy 27.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "John", surname: "Kleinig" }],
        title: "Paternalism and Personal Integrity",
        year: 1983,
        issue: "3",
        journal: "Bulletin of the Australian Society of Legal Philosophy",
        startingPage: 27,
      });
      expect(toPlainText(runs)).toBe(
        "John Kleinig, ‘Paternalism and Personal Integrity’ [1983] (3) Bulletin of the Australian Society of Legal Philosophy 27"
      );
    });

    it("formats a year-organised journal with season issue per AGLC4 ch 5 header example (rules 5.3–5.4)", () => {
      // Lord Woolf, 'Droit Public: English Style' [1995] (Spring)
      // Public Law 57, 60.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Lord", surname: "Woolf" }],
        title: "Droit Public: English Style",
        year: 1995,
        issue: "Spring",
        journal: "Public Law",
        startingPage: 57,
        pinpoint: { type: "page", value: "60" },
      });
      expect(toPlainText(runs)).toBe(
        "Lord Woolf, ‘Droit Public: English Style’ [1995] (Spring) Public Law 57, 60"
      );
    });

    it("supports a year span for a year-organised volume (rules 5.3, 1.11.4)", () => {
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        year: "1992–93",
        issue: "1",
        journal: "Cambridge Law Journal",
        startingPage: 1,
      });
      expect(toPlainText(runs)).toBe(
        "Test Author, ‘Test Article’ [1992–93] (1) Cambridge Law Journal 1"
      );
    });

    it("an explicit yearOrganised flag overrides the derived default", () => {
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        year: 2000,
        yearOrganised: false,
        journal: "Some Journal",
        startingPage: 10,
      });
      expect(toPlainText(runs)).toBe("Test Author, ‘Test Article’ (2000) Some Journal 10");
    });
  });

  // ── Rule 5.5: Journal title ─────────────────────────────────────────────

  describe("Rule 5.5 — Journal title", () => {
    it("drops a leading 'The' from the journal title per AGLC4 ex 9 (rule 5.5)", () => {
      // … Australian Law Journal … [Not: … The Australian Law Journal …]
      const runs = formatJournalArticle({
        authors: [{ givenNames: "R.J.", surname: "Ellicott" }],
        title: "The Autochthonous Expedient and the Federal Court",
        year: 2008,
        volume: 82,
        issue: "10",
        journal: "The Australian Law Journal",
        startingPage: 700,
      });
      expect(italicText(runs)).toBe("Australian Law Journal");
    });

    it("preserves '&' in a journal title as on the title page (DECISION-014)", () => {
      const runs = formatJournalArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        year: 2010,
        volume: 22,
        issue: "1",
        journal: "Yale Journal of Law & the Humanities",
        startingPage: 100,
      });
      expect(italicText(runs)).toBe("Yale Journal of Law & the Humanities");
    });
  });

  // ── Rule 5.8: Articles Published in Parts ───────────────────────────────

  describe("Rule 5.8 — Articles published in parts", () => {
    it("inserts (Pt N) between title and year per AGLC4 ex 17 (rule 5.8)", () => {
      // The in-title part reference ('— Part I') is stripped and '(Pt 1)'
      // sits between the title and the year.
      const runs = formatJournalArticlePart({
        authors: [{ givenNames: "Jacobus", surname: "tenBroek" }],
        title:
          "California's Dual System of Family Law: Its Origin, Development, and Present Status — Part I",
        year: 1964,
        volume: 16,
        issue: "2",
        journal: "Stanford Law Review",
        startingPage: 257,
        partNumber: 1,
      });
      expect(toPlainText(runs)).toBe(
        "Jacobus tenBroek, ‘California's Dual System of Family Law: Its Origin, Development, and Present Status’ (Pt 1) (1964) 16(2) Stanford Law Review 257"
      );
    });

    it("formats a part of a year-organised journal per AGLC4 ex 15 (rules 5.8, 5.3)", () => {
      // RN Gooderson, 'Claim of Right and Dispute of Title' (Pt 1) [1966]
      // (1) Cambridge Law Journal 90.
      const runs = formatJournalArticlePart({
        authors: [{ givenNames: "R.N.", surname: "Gooderson" }],
        title: "Claim of Right and Dispute of Title",
        year: 1966,
        issue: "1",
        journal: "Cambridge Law Journal",
        startingPage: 90,
        partNumber: 1,
      });
      expect(toPlainText(runs)).toBe(
        "RN Gooderson, ‘Claim of Right and Dispute of Title’ (Pt 1) [1966] (1) Cambridge Law Journal 90"
      );
    });
  });

  // ── Rule 5.9: Symposia ──────────────────────────────────────────────────

  describe("Rule 5.9 — Symposia", () => {
    it("cites a symposium as a whole with 'Symposium' as the author per AGLC4 ex 20 (rule 5.9)", () => {
      // A symposium cited as a whole is an ordinary journal-article citation
      // with 'Symposium' in the author position — no special format exists.
      const runs = formatJournalArticle({
        authors: [{ givenNames: "", surname: "Symposium" }],
        title: "Contemporary Human Rights in Australia",
        year: 2002,
        volume: 26,
        issue: "2",
        journal: "Melbourne University Law Review",
        startingPage: 251,
      });
      expect(toPlainText(runs)).toBe(
        "Symposium, ‘Contemporary Human Rights in Australia’ (2002) 26(2) Melbourne University Law Review 251"
      );
    });
  });

  // ── Rule 5.10: Online Journal Articles ──────────────────────────────────

  describe("Rule 5.10 — Online journal articles", () => {
    it("formats an article number with pinpoint per AGLC4 ex 22 (rule 5.10)", () => {
      // Azzurra Annunziata et al, '\u2026' (2016) 8(7) Nutrients 416:1\u201319, 8.
      const runs = formatOnlineJournalArticle({
        authors: [
          { givenNames: "Azzurra", surname: "Annunziata" },
          { givenNames: "Second", surname: "Author" },
          { givenNames: "Third", surname: "Author" },
          { givenNames: "Fourth", surname: "Author" },
        ],
        title:
          "Do Consumers Want More Nutritional and Health Information on Wine Labels? Insights from the EU and USA",
        year: 2016,
        volume: 8,
        issue: "7",
        journal: "Nutrients",
        articleNumber: "416:1\u201319",
        pinpoint: { type: "page", value: "8" },
      });
      expect(toPlainText(runs)).toBe(
        "Azzurra Annunziata et al, \u2018Do Consumers Want More Nutritional and Health Information on Wine Labels? Insights from the EU and USA\u2019 (2016) 8(7) Nutrients 416:1\u201319, 8"
      );
    });

    it("formats an online article with page numbers and pinpoint per AGLC4 ex 24 (rule 5.10)", () => {
      // Kate Lewins, '\u2026' (2006) 13(1) eLaw Journal: Murdoch University
      // Electronic Journal of Law 58, 59.
      const runs = formatOnlineJournalArticle({
        authors: [{ givenNames: "Kate", surname: "Lewins" }],
        title:
          "What's the Trade Practices Act Got to Do with It? Section 74 and Towage Contracts in Australia",
        year: 2006,
        volume: 13,
        issue: "1",
        journal: "eLaw Journal: Murdoch University Electronic Journal of Law",
        startingPage: 58,
        pinpoint: { type: "page", value: "59" },
      });
      expect(toPlainText(runs)).toBe(
        "Kate Lewins, \u2018What's the Trade Practices Act Got to Do with It? Section 74 and Towage Contracts in Australia\u2019 (2006) 13(1) eLaw Journal: Murdoch University Electronic Journal of Law 58, 59"
      );
    });

    it("appends an optional URL in angle brackets (rules 5.10, 4.4)", () => {
      const runs = formatOnlineJournalArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        year: 2016,
        volume: 8,
        issue: "7",
        journal: "Nutrients",
        articleNumber: "416",
        url: "https://example.com/article",
      });
      expect(toPlainText(runs)).toBe(
        "Test Author, \u2018Test Article\u2019 (2016) 8(7) Nutrients 416 <https://example.com/article>"
      );
    });
  });

  // ── Rule 5.11: Forthcoming and Advance Articles ─────────────────────────

  describe("Rule 5.11 — Forthcoming and advance articles", () => {
    it("keeps known year and volume with (forthcoming) per AGLC4 ex 26 (rule 5.11)", () => {
      // Geneviève Helleringer and Anne-Lise Sibony, … (2017) 23
      // Columbia Journal of European Law (forthcoming).
      const runs = formatForthcomingArticle({
        authors: [
          { givenNames: "Genevi\u00e8ve", surname: "Helleringer" },
          { givenNames: "Anne-Lise", surname: "Sibony" },
        ],
        title: "European Consumer Protection through the Behavioral Lens",
        year: 2017,
        volume: 23,
        journal: "Columbia Journal of European Law",
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Genevi\u00e8ve Helleringer and Anne-Lise Sibony, \u2018European Consumer Protection through the Behavioral Lens\u2019 (2017) 23 Columbia Journal of European Law (forthcoming)"
      );
      expect(italicText(runs)).toBe("Columbia Journal of European Law");
    });

    it("formats an advance article per AGLC4 ex 27 (rule 5.11)", () => {
      // Michael Crommelin, 'Powers of the Head of State' (2015) 38(3)
      // Melbourne University Law Review (advance).
      const runs = formatForthcomingArticle({
        authors: [{ givenNames: "Michael", surname: "Crommelin" }],
        title: "Powers of the Head of State",
        year: 2015,
        volume: 38,
        issue: "3",
        journal: "Melbourne University Law Review",
        advance: true,
      });
      expect(toPlainText(runs)).toBe(
        "Michael Crommelin, \u2018Powers of the Head of State\u2019 (2015) 38(3) Melbourne University Law Review (advance)"
      );
    });

    it("omits unavailable elements while keeping (forthcoming) (rule 5.11)", () => {
      const runs = formatForthcomingArticle({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Article",
        journal: "Columbia Journal of European Law",
      });
      expect(toPlainText(runs)).toBe(
        "Test Author, \u2018Test Article\u2019 Columbia Journal of European Law (forthcoming)"
      );
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
      expect(text).toBe("Ralph H Folsom, Principles of European Union Law (Thomson West, 2005)");
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
      expect(text).toBe("Ronald Dworkin, Justice for Hedgehogs (Belknap Press, 2011) 10");
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

    it("should format an unnumbered revised edition as bare 'rev ed' (rule 6.3.3)", () => {
      expect(formatEdition(1, true)).toBe("rev ed");
      expect(formatEdition(0, true)).toBe("rev ed");
    });

    it("should not include edition for edition <= 1", () => {
      expect(formatEdition(0)).toBe("");
      expect(formatEdition(1)).toBe("");
    });

    it("sets the ordinal indicator in superscript (rule 6.3.2)", () => {
      // AGLC4 rule 6.3.2: "The ordinal indicator ('th', 'nd', etc) is superscript."
      expect(formatEditionRuns(7)).toEqual([
        { text: "7" },
        { text: "th", superscript: true },
        { text: " ed" },
      ]);
      expect(formatEditionRuns(2)).toEqual([
        { text: "2" },
        { text: "nd", superscript: true },
        { text: " ed" },
      ]);
      expect(formatEditionRuns(3, true)).toEqual([
        { text: "3" },
        { text: "rd", superscript: true },
        { text: " rev ed" },
      ]);
      expect(formatEditionRuns(1)).toEqual([]);
      expect(formatEditionRuns(1, true)).toEqual([{ text: "rev ed" }]);
    });

    it("emits a superscript ordinal within a book citation (rule 6.3.2)", () => {
      const runs = formatBook({
        authors: [{ givenNames: "Malcolm N", surname: "Shaw" }],
        title: "International Law",
        publisher: "Cambridge University Press",
        edition: 7,
        year: 2014,
      });
      const superscriptRun = runs.find((r) => r.superscript);
      expect(superscriptRun).toEqual({ text: "th", superscript: true });
    });
  });

  // ── Rule 6.3.1: Publisher ───────────────────────────────────────────────

  describe("Rule 6.3.1 — Publisher", () => {
    it("omits the publisher where it is the same as the author per AGLC4 ex 12 (rule 6.3.1)", () => {
      // Law Institute of Victoria, Legal Directory 2006 (2005).
      // [Not: … (Law Institute of Victoria, 2005).]
      const runs = formatBook({
        authors: [{ givenNames: "", surname: "Law Institute of Victoria" }],
        title: "Legal Directory 2006",
        publisher: "Law Institute of Victoria",
        year: 2005,
      });
      expect(toPlainText(runs)).toBe("Law Institute of Victoria, Legal Directory 2006 (2005)");
    });

    it("drops a leading 'The' from the publisher's name per AGLC4 ex 7 (rule 6.3.1)", () => {
      // … (Federation Press, 2012). [Not: … The Federation Press …]
      const runs = formatBook({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Book",
        publisher: "The Federation Press",
        year: 2012,
      });
      expect(toPlainText(runs)).toBe("Test Author, Test Book (Federation Press, 2012)");
    });
  });

  // ── Rule 6.3.3: Revised editions ────────────────────────────────────────

  describe("Rule 6.3.3 — Revised editions", () => {
    it("formats an unnumbered revised edition per AGLC4 ex 17 (rule 6.3.3)", () => {
      // Ernest J Weinrib, The Idea of Private Law (Oxford University Press,
      // rev ed, 2012) 55.
      const runs = formatBook({
        authors: [{ givenNames: "Ernest J", surname: "Weinrib" }],
        title: "The Idea of Private Law",
        publisher: "Oxford University Press",
        revised: true,
        year: 2012,
        pinpoint: { type: "page", value: "55" },
      });
      expect(toPlainText(runs)).toBe(
        "Ernest J Weinrib, The Idea of Private Law (Oxford University Press, rev ed, 2012) 55"
      );
    });
  });

  // ── Rule 6.5: Multi-Volume Books ───────────────────────────────────────

  describe("Rule 6.5 — Multi-volume books", () => {
    it("formats a multi-volume book with year span per AGLC4 ex 26 (rules 6.5, 6.3.4)", () => {
      // Joel Feinberg, The Moral Limits of the Criminal Law
      // (Oxford University Press, 1984–88) vol 4, 45.
      const runs = formatMultiVolumeBook({
        authors: [{ givenNames: "Joel", surname: "Feinberg" }],
        title: "The Moral Limits of the Criminal Law",
        publisher: "Oxford University Press",
        year: "1984–88",
        volume: 4,
        pinpoint: { type: "page", value: "45" },
      });
      expect(toPlainText(runs)).toBe(
        "Joel Feinberg, The Moral Limits of the Criminal Law (Oxford University Press, 1984–88) vol 4, 45"
      );
    });

    it("uses 'bk' where the source styles volumes as books per AGLC4 ex 27 (rule 6.5)", () => {
      // Evan C Lewis and DI Cassidy, Tenancy Law of New South Wales
      // (Butterworths, 1966) bk 2.
      const runs = formatMultiVolumeBook({
        authors: [
          { givenNames: "Evan C", surname: "Lewis" },
          { givenNames: "D.I.", surname: "Cassidy" },
        ],
        title: "Tenancy Law of New South Wales",
        publisher: "Butterworths",
        year: 1966,
        volume: 2,
        volumeLabel: "bk",
      });
      expect(toPlainText(runs)).toBe(
        "Evan C Lewis and DI Cassidy, Tenancy Law of New South Wales (Butterworths, 1966) bk 2"
      );
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

    it("supports an open year span for a work in progress (rule 6.3.4)", () => {
      // Cf AGLC4 6.3.4 ex 21: … (Department of Foreign Affairs and Trade,
      // 1975–) vol 16, 159.
      const runs = formatMultiVolumeBook({
        authors: [{ givenNames: "Test", surname: "Author" }],
        title: "Test Series",
        publisher: "Test Publisher",
        year: "1975–",
        volume: 16,
        pinpoint: { type: "page", value: "159" },
      });
      expect(toPlainText(runs)).toBe(
        "Test Author, Test Series (Test Publisher, 1975–) vol 16, 159"
      );
    });
  });

  // ── Rule 6.6.2: Books with an Author and Editor ─────────────────────────

  describe("Rule 6.6.2 — Books with an author and editor", () => {
    it("inserts ', ed Editor' after the title per AGLC4 ex 34 (rule 6.6.2)", () => {
      // JS Mill, Utilitarianism, ed Roger Crisp (Oxford University Press, 1998) 14.
      const runs = formatBook({
        authors: [{ givenNames: "J.S.", surname: "Mill" }],
        title: "Utilitarianism",
        editors: [{ givenNames: "Roger", surname: "Crisp" }],
        publisher: "Oxford University Press",
        year: 1998,
        pinpoint: { type: "page", value: "14" },
      });
      expect(toPlainText(runs)).toBe(
        "JS Mill, Utilitarianism, ed Roger Crisp (Oxford University Press, 1998) 14"
      );
    });

    it("uses 'ed' (never 'eds') for multiple editors, with translator, per AGLC4 ex 35 (rules 6.6.2, 6.7)", () => {
      // Ludwig Wittgenstein, On Certainty, ed GEM Anscombe and GH von
      // Wright, tr Denis Paul and GEM Anscombe (Harper Torchbooks, 1972).
      const runs = formatTranslatedBook({
        authors: [{ givenNames: "Ludwig", surname: "Wittgenstein" }],
        title: "On Certainty",
        editors: [
          { givenNames: "G.E.M.", surname: "Anscombe" },
          { givenNames: "G.H. von", surname: "Wright" },
        ],
        translator: "Denis Paul and GEM Anscombe",
        publisher: "Harper Torchbooks",
        year: 1972,
      });
      expect(toPlainText(runs)).toBe(
        "Ludwig Wittgenstein, On Certainty, ed GEM Anscombe and GH von Wright, tr Denis Paul and GEM Anscombe (Harper Torchbooks, 1972)"
      );
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
        bookTitle: "Expounding the Constitution: Essays in Constitutional Theory",
        publisher: "Cambridge University Press",
        year: 2008,
        startingPage: 38,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Jeremy Waldron, \u2018Do Judges Reason Morally?\u2019 in Grant Huscroft (ed), " +
          "Expounding the Constitution: Essays in Constitutional Theory " +
          "(Cambridge University Press, 2008) 38"
      );
      // Book title is italic; chapter title is not
      expect(italicText(runs)).toContain("Expounding the Constitution");
    });

    it("should format Russell chapter with multiple editors (AGLC4 6.6.1 Example 29)", () => {
      // Meg Russell, 'Reform of the House of Lords...' in Nicholas Aroney,
      // Scott Prasser and JR Nethercote (eds), Restraining Elective Dictatorship...
      // (University of Western Australia Press, 2008) 119.
      const runs = formatBookChapter({
        chapterAuthors: [{ givenNames: "Meg", surname: "Russell" }],
        chapterTitle: "Reform of the House of Lords: Lessons for Bicameralism",
        editors: [
          { givenNames: "Nicholas", surname: "Aroney" },
          { givenNames: "Scott", surname: "Prasser" },
          { givenNames: "J.R.", surname: "Nethercote" },
        ],
        bookTitle: "Restraining Elective Dictatorship: The Upper House Solution?",
        publisher: "University of Western Australia Press",
        year: 2008,
        startingPage: 119,
      });
      const text = toPlainText(runs);
      expect(text).toBe(
        "Meg Russell, ‘Reform of the House of Lords: Lessons for Bicameralism’ in " +
          "Nicholas Aroney, Scott Prasser and JR Nethercote (eds), " +
          "Restraining Elective Dictatorship: The Upper House Solution? " +
          "(University of Western Australia Press, 2008) 119"
      );
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
      expect(text).toBe(
        "Janet Ransley, \u2018Illusions of Reform\u2019 in " +
          "Nicholas Aroney, Scott Prasser and JR Nethercote (eds), " +
          "Restraining Elective Dictatorship " +
          "(University of Western Australia Press, 2008) 248, 252\u20133"
      );
    });
  });

  // ── Rule 6.7: Translated Books ─────────────────────────────────────────

  describe("Rule 6.7 — Translated books", () => {
    it("places ', tr Translator' after the title per AGLC4 ex 36 (rule 6.7)", () => {
      // Sigmund Freud, Civilization and its Discontents, tr Joan Riviere
      // (Hogarth Press, 1930). (The guide prints 'its' lowercase; rule 1.7
      // title case capitalises the non-preposition 'Its'.)
      const runs = formatTranslatedBook({
        authors: [{ givenNames: "Sigmund", surname: "Freud" }],
        title: "Civilization and Its Discontents",
        publisher: "Hogarth Press",
        year: 1930,
        translator: "Joan Riviere",
      });
      expect(toPlainText(runs)).toBe(
        "Sigmund Freud, Civilization and Its Discontents, tr Joan Riviere (Hogarth Press, 1930)"
      );
    });

    it("appends the optional '[trans of: …]' segment per AGLC4 ex 39 (rule 6.7)", () => {
      // Jean-Paul Sartre, Being and Nothingness: An Essay on
      // Phenomenological Ontology, tr Hazel E Barns (Methuen, 1969) 151
      // [trans of: L'Etre et le Néant (1943)]
      const runs = formatTranslatedBook({
        authors: [{ givenNames: "Jean-Paul", surname: "Sartre" }],
        title: "Being and Nothingness: An Essay on Phenomenological Ontology",
        publisher: "Methuen",
        year: 1969,
        translator: "Hazel E Barns",
        originalTitle: "L'Etre et le Néant",
        originalYear: 1943,
        pinpoint: { type: "page", value: "151" },
      });
      expect(toPlainText(runs)).toBe(
        "Jean-Paul Sartre, Being and Nothingness: An Essay on Phenomenological Ontology, tr Hazel E Barns (Methuen, 1969) 151 [trans of: L'Etre et le Néant (1943)]"
      );
      // The original title within the segment is italic
      expect(italicText(runs)).toContain("L'Etre et le Néant");
    });
  });

  // ── Rule 6.8: Forthcoming Books ────────────────────────────────────────

  describe("Rule 6.8 — Forthcoming books", () => {
    it("replaces the year with 'forthcoming' per AGLC4 ex 40 (rule 6.8)", () => {
      // Quentin Bryce, Dear Quentin: Letters of a Governor-General
      // (Miegunyah Press, forthcoming).
      const runs = formatForthcomingBook({
        authors: [{ givenNames: "Quentin", surname: "Bryce" }],
        title: "Dear Quentin: Letters of a Governor-General",
        publisher: "Miegunyah Press",
      });
      expect(toPlainText(runs)).toBe(
        "Quentin Bryce, Dear Quentin: Letters of a Governor-General (Miegunyah Press, forthcoming)"
      );
    });
  });

  // ── Rule 6.9: Audiobooks ───────────────────────────────────────────────

  describe("Rule 6.9 — Audiobooks", () => {
    it("opens the parenthetical with 'Audiobook' per AGLC4 ex 41 (rule 6.9)", () => {
      // George Orwell, 1984 (Audiobook, Blackstone Audio, 2007) 11:15:05.
      const runs = formatAudiobook({
        authors: [{ givenNames: "George", surname: "Orwell" }],
        title: "1984",
        publisher: "Blackstone Audio",
        year: 2007,
        pinpoint: { type: "page", value: "11:15:05" },
      });
      expect(toPlainText(runs)).toBe(
        "George Orwell, 1984 (Audiobook, Blackstone Audio, 2007) 11:15:05"
      );
    });

    it("formats a time-span pinpoint per AGLC4 ex 42 (rules 6.9, 1.11.4)", () => {
      // William Ury, Roger Fisher and Bruce Patton, Getting to Yes:
      // Negotiating an Agreement Without Giving In (Audiobook, Random
      // House, 2012) 0:05:00–1:01:00. (Guide ex 42 capitalises 'Without'
      // and 'In', contra rule 1.7's lowercase-preposition rule; per
      // DECISION-012 the rule text is implemented, so both are lowercase.)
      const runs = formatAudiobook({
        authors: [
          { givenNames: "William", surname: "Ury" },
          { givenNames: "Roger", surname: "Fisher" },
          { givenNames: "Bruce", surname: "Patton" },
        ],
        title: "Getting to Yes: Negotiating an Agreement Without Giving In",
        publisher: "Random House",
        year: 2012,
        pinpoint: { type: "page", value: "0:05:00–1:01:00" },
      });
      expect(toPlainText(runs)).toBe(
        "William Ury, Roger Fisher and Bruce Patton, Getting to Yes: Negotiating an Agreement without Giving in (Audiobook, Random House, 2012) 0:05:00–1:01:00"
      );
    });

    it("does not emit a narrator element (rule 6.9)", () => {
      const runs = formatAudiobook({
        authors: [{ givenNames: "George", surname: "Orwell" }],
        title: "1984",
        publisher: "Blackstone Audiobooks",
        year: 2007,
        narrator: "Stephen Fry",
      });
      const text = toPlainText(runs);
      expect(text).toBe("George Orwell, 1984 (Audiobook, Blackstone, 2007)");
      expect(text).not.toContain("narrated");
    });
  });
});
