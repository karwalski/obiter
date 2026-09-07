/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * DECISION-037: subsequent references (Rule 1.4.1) for sources whose author
 * is captured as free text, and for interviews (Rule 7.13), correspondence
 * (Rule 7.12) and speeches (Rule 7.3), which chapter 7 leaves without a
 * subsequent-reference section. Forms follow edited AGLC4 practice (UNSW
 * Law Journal editing materials r 7.13.1; Freeburn and Ramsay (2021) 44(3)
 * UNSWLJ 1142) — see docs/decisions.md.
 */

import { formatShortReference, resolveSubsequentReference } from "../../src/engine/resolver";
import { formatBibliographyEntry } from "../../src/engine/rules/v4/general/bibliography";
import {
  formatAuthors,
  formatFreeTextAuthorLead,
  parseFreeTextAuthors,
} from "../../src/engine/rules/v4/secondary/authors";
import { getFormattedPreview } from "../../src/engine/engine";
import type { Citation } from "../../src/types/citation";
import type { FormattedRun } from "../../src/types/formattedRun";

const cite = (sourceType: string, data: Record<string, unknown>, shortTitle?: string) =>
  ({
    id: "x",
    aglcVersion: "4",
    sourceType,
    data,
    shortTitle,
    tags: [],
    createdAt: "",
    modifiedAt: "",
  }) as Citation;
const plain = (r: FormattedRun[]) => r.map((x) => x.text).join("");
const short = (c: Citation, n = 3) => plain(formatShortReference(c, n));

describe("Free-text author names (Rules 1.4.1, 4.1.1, 4.1.2)", () => {
  it("reduces a personal name to its surname", () => {
    expect(short(cite("newspaper", { author: "Jane Smith", title: "Story" }))).toBe("Smith (n 3)");
    expect(short(cite("social_media", { author: "Jane Smith", platform: "X" }))).toBe(
      "Smith (n 3)"
    );
  });

  it("joins several personal names per rule 4.1.2", () => {
    expect(formatFreeTextAuthorLead("Jane Smith and Bob Jones")).toBe("Smith and Jones");
    expect(formatFreeTextAuthorLead("Jane Smith, Bob Jones and Ann Lee")).toBe(
      "Smith, Jones and Lee"
    );
    expect(
      formatFreeTextAuthorLead("Paul Rishworth, Grant Huscroft, Scott Optican and Richard Mahoney")
    ).toBe("Rishworth et al");
  });

  it("keeps body authors and pseudonyms verbatim (Rule 4.1.4)", () => {
    expect(formatFreeTextAuthorLead("Australian Law Reform Commission")).toBe(
      "Australian Law Reform Commission"
    );
    expect(formatFreeTextAuthorLead("Law Council of Australia")).toBe("Law Council of Australia");
    expect(formatFreeTextAuthorLead("Anonymous 10")).toBe("Anonymous 10");
    expect(formatFreeTextAuthorLead("Deloitte")).toBe("Deloitte");
    expect(parseFreeTextAuthors("Department of Home Affairs")).toBeNull();
  });

  it("handles particles, suffixes, titles and post-nominals", () => {
    expect(formatFreeTextAuthorLead("William van de Pol")).toBe("van de Pol");
    expect(formatFreeTextAuthorLead("John G Roberts Jr")).toBe("Roberts Jr");
    expect(formatFreeTextAuthorLead("Justice Dyson Heydon")).toBe("Heydon");
    expect(formatFreeTextAuthorLead("Chief Justice Susan Kiefel")).toBe("Kiefel");
    expect(formatFreeTextAuthorLead("Professor Jane Smith")).toBe("Smith");
    expect(formatFreeTextAuthorLead("Sir Anthony Mason")).toBe("Mason");
    expect(formatFreeTextAuthorLead("Michael Kirby AC CMG")).toBe("Kirby");
    expect(formatFreeTextAuthorLead("Brynn O’Brien")).toBe("O’Brien");
  });

  it("leaves structured and institutional authors unchanged", () => {
    expect(
      short(cite("book", { authors: [{ givenNames: "Eric", surname: "Barendt" }], title: "T" }), 68)
    ).toBe("Barendt (n 68)");
    expect(
      short(cite("report", { institutionalAuthor: "Productivity Commission", title: "T" }))
    ).toBe("Productivity Commission (n 3)");
  });
});

describe("Speeches (Rule 7.3)", () => {
  it("leads with the speaker surname", () => {
    const speech = cite("speech", {
      speaker: "Justice Dyson Heydon",
      title: "Threats to Judicial Independence: The Enemy Within",
      event: "Inner Temple",
      date: "23 January 2012",
    });
    expect(short(speech, 41)).toBe("Heydon (n 41)");
  });
});

describe("Interviews (Rule 7.13, DECISION-037)", () => {
  it("keeps the leading identifier and shortens the interviewee", () => {
    const interview = cite("interview", {
      interviewee: "Brynn O’Brien",
      interviewer: "Ian Ramsay and Lloyd Freeburn",
      date: "6 May 2020",
    });
    expect(plain(formatShortReference(interview, 109, { type: "page", value: "5–7" }))).toBe(
      "Interview with O’Brien (n 109) 5–7"
    );
  });

  it("joins several interviewees and keeps pseudonyms verbatim", () => {
    expect(
      short(
        cite("interview", { interviewee: "Louise Petschler and Christian Gergis", date: "d" }),
        117
      )
    ).toBe("Interview with Petschler and Gergis (n 117)");
    expect(short(cite("interview", { interviewee: "Anonymous 10", date: "d" }), 56)).toBe(
      "Interview with Anonymous 10 (n 56)"
    );
  });

  it("uses the recorded format label and a user short title", () => {
    expect(
      short(
        cite("interview", {
          interviewee: "Chief Justice John G Roberts Jr",
          interviewType: "Conversation",
          date: "d",
        }),
        96
      )
    ).toBe("Conversation with Roberts Jr (n 96)");
    const overridden = cite(
      "interview",
      { interviewee: "Brynn O’Brien", date: "d" },
      "Interview with Brynn O’Brien"
    );
    expect(short(overridden, 109)).toBe("Interview with Brynn O’Brien (n 109)");
    expect(formatShortReference(overridden, 109)[0].italic).toBeFalsy();
  });

  it("resolves through the full pipeline", () => {
    const result = resolveSubsequentReference(
      cite("interview", { interviewee: "Catherine Maxwell", date: "d" }),
      {
        isFirstCitation: false,
        isSameAsPreceding: false,
        precedingFootnoteCitationCount: 1,
        currentPinpoint: { type: "page", value: "3" },
        firstFootnoteNumber: 118,
        isWithinSameFootnote: false,
        formatPreference: "auto",
      }
    );
    expect(result).not.toBeNull();
    expect(plain(result!)).toBe("Interview with Maxwell (n 118) 3");
  });
});

describe("Written correspondence (Rule 7.12, DECISION-037)", () => {
  it("keeps the type and both parties as surnames, dropping the date", () => {
    const email = cite("correspondence", {
      type: "Email",
      sender: "Vanessa Li",
      recipient: "Samantha Jones",
      date: "4 November 2015",
    });
    expect(short(email, 93)).toBe("Email from Li to Jones (n 93)");
  });

  it("omits a missing recipient and honours a user short title", () => {
    expect(
      short(cite("correspondence", { type: "Letter", sender: "Sir Peter Cosgrove", date: "d" }), 94)
    ).toBe("Letter from Cosgrove (n 94)");
    expect(
      short(
        cite(
          "correspondence",
          { type: "Email", sender: "Tim Soutphommasane", recipient: "Alan Zheng", date: "d" },
          "Email from Tim Soutphommasane"
        ),
        114
      )
    ).toBe("Email from Tim Soutphommasane (n 114)");
  });
});

describe("Bibliography author rendering (Rules 1.13, 4.1.1, 4.1.2)", () => {
  const book = (authors: unknown, extra: Record<string, unknown> = {}) =>
    cite("book", { authors, title: "Bk", publisher: "P", year: 2020, ...extra });
  const bib = (c: Citation) => plain(formatBibliographyEntry(c));

  it("compresses four or more authors to et al", () => {
    expect(
      bib(
        book([
          { givenNames: "James", surname: "Edelman" },
          { givenNames: "Elise", surname: "Bant" },
          { givenNames: "A", surname: "Third" },
          { givenNames: "B", surname: "Fourth" },
        ])
      )
    ).toBe("Edelman, James et al, Bk (P, 2020)");
  });

  it("applies the rule 4.1.1 name conventions as in the footnote", () => {
    expect(
      bib(
        book([
          { givenNames: "H. L. A.", surname: "Hart" },
          { givenNames: "Michael", surname: "Kirby AC CMG" },
        ])
      )
    ).toBe("Hart, HLA and Michael Kirby, Bk (P, 2020)");
    expect(bib(book([{ givenNames: "John G", surname: "Roberts", suffix: "Jr" }]))).toBe(
      "Roberts, John G Jr, Bk (P, 2020)"
    );
  });

  it("renders free-text authors, inverting a personal name only", () => {
    const article = (author: string) =>
      cite("newspaper", { author, title: "Story", newspaper: "The Age", date: "1 May 2020" });
    expect(bib(article("Jane Smith"))).toMatch(/^Smith, Jane, ‘Story’/);
    expect(bib(article("Australian Law Reform Commission"))).toMatch(
      /^Australian Law Reform Commission, ‘Story’/
    );
  });
});

describe("Post-nominals (Rule 4.1.1)", () => {
  it("strips stacked honours including CMG", () => {
    expect(plain(formatAuthors([{ givenNames: "Michael", surname: "Kirby AC CMG" }]))).toBe(
      "Michael Kirby"
    );
    expect(
      plain(
        getFormattedPreview(
          cite("book", {
            authors: [{ givenNames: "Michael", surname: "Kirby AC CMG" }],
            title: "Bk",
            publisher: "P",
            year: 2020,
          })
        )
      )
    ).toMatch(/^Michael Kirby, /);
  });
});
