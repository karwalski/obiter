/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Chapter 7 — Other Secondary Sources
 *
 * Tests key rules using AGLC4 examples as the source of truth.
 */

import { FormattedRun } from "../../src/types/formattedRun";
import {
  formatReport,
  formatHansard,
  ReportData,
  HansardData,
} from "../../src/engine/rules/v4/secondary/other";
import {
  formatNewspaper,
  formatEditorial,
  formatCorrespondence,
  formatInternetMaterial,
  formatSocialMedia,
  NewspaperData,
  EditorialData,
  CorrespondenceData,
  InternetMaterialData,
  SocialMediaData,
} from "../../src/engine/rules/v4/secondary/other-media";

/** Flatten FormattedRun[] into a single plain-text string for snapshot comparison. */
function toPlainText(runs: FormattedRun[]): string {
  return runs.map((r) => r.text).join("");
}

/** Assert that the specified run has italic: true. */
function expectItalic(runs: FormattedRun[], substring: string): void {
  const match = runs.find((r) => r.text.includes(substring) && r.italic);
  expect(match).toBeDefined();
}

/** Assert that the specified run does NOT have italic: true. */
function expectNotItalic(runs: FormattedRun[], substring: string): void {
  const match = runs.find((r) => r.text.includes(substring) && r.italic);
  expect(match).toBeUndefined();
}

// ─── Rule 7.1.1 — Reports (General Rule) ──────────────────────────────────────

describe("Rule 7.1.1 — Reports", () => {
  /*
   * AGLC4 Example 1:
   * Review of the Law of Negligence (Final Report, September 2002) 37–57.
   * No author indicated prominently.
   */
  it("Example 1: report without author, with document type and pinpoint", () => {
    const data: ReportData = {
      title: "Review of the Law of Negligence",
      reportType: "Final Report",
      date: "September 2002",
      pinpoint: { type: "page", value: "37\u201357" },
    };
    const runs = formatReport(data);
    const text = toPlainText(runs);

    expect(text).toContain("Review of the Law of Negligence");
    expect(text).toContain("(Final Report, September 2002)");
    expect(text).toContain("37\u201357");
    // Title should be italic
    expectItalic(runs, "Review of the Law of Negligence");
  });

  /*
   * AGLC4 Example 2:
   * Community Law Australia, Unaffordable and Out of Reach: The Problem
   * of Access to the Australian Legal System (Report, July 2012).
   */
  it("Example 2: report with body author and document type", () => {
    const data: ReportData = {
      body: "Community Law Australia",
      title: "Unaffordable and Out of Reach: The Problem of Access to the Australian Legal System",
      reportType: "Report",
      date: "July 2012",
    };
    const runs = formatReport(data);
    const text = toPlainText(runs);

    expect(text).toContain("Community Law Australia, ");
    expect(text).toContain("(Report, July 2012)");
    expectItalic(runs, "Unaffordable and Out of Reach");
  });

  /*
   * AGLC4 Example 3:
   * Qantas Airways, Qantas Annual Report 2017: Positioning for
   * Sustainability and Growth (Report, 2017) 12.
   * Document type is generic "Report" even though title is "Annual Report".
   */
  it("Example 3: report where title contains type — use generic type", () => {
    const data: ReportData = {
      body: "Qantas Airways",
      title: "Qantas Annual Report 2017: Positioning for Sustainability and Growth",
      reportType: "Report",
      date: "2017",
      pinpoint: { type: "page", value: "12" },
    };
    const runs = formatReport(data);
    const text = toPlainText(runs);

    expect(text).toContain("(Report, 2017)");
    expect(text).toContain("12");
    // Must NOT use "Annual Report" in parenthetical
    expect(text).not.toContain("(Annual Report,");
  });

  /*
   * AGLC4 Example 4:
   * Investment and Enterprise Division, UNCTAD, Improving Investment
   * Dispute Settlement: UNCTAD Policy Tools (IIA Issues Note No 4, 23
   * November 2017).
   */
  it("Example 4: report with subdivision + body and numbered series", () => {
    const data: ReportData = {
      body: "UNCTAD",
      bodySubdivision: "Investment and Enterprise Division",
      title: "Improving Investment Dispute Settlement: UNCTAD Policy Tools",
      reportType: "IIA Issues Note",
      reportNumber: "4",
      date: "23 November 2017",
    };
    const runs = formatReport(data);
    const text = toPlainText(runs);

    expect(text).toContain("Investment and Enterprise Division, UNCTAD, ");
    expect(text).toContain("(IIA Issues Note No 4, 23 November 2017)");
  });

  it("report with no type and no number — parenthetical has only date", () => {
    const data: ReportData = {
      title: "Some Report Title",
      date: "2020",
    };
    const runs = formatReport(data);
    const text = toPlainText(runs);

    expect(text).toBe("Some Report Title (2020)");
  });
});

// ─── Rule 7.5.1 — Hansard (Parliamentary Debates) ─────────────────────────────

describe("Rule 7.5.1 — Hansard", () => {
  /*
   * AGLC4 Example 47:
   * Commonwealth, Parliamentary Debates, Senate, 7 February 2017, 39
   * (George Brandis, Attorney-General).
   */
  it("Example 47: Hansard with speaker and position", () => {
    const data: HansardData = {
      jurisdiction: "Commonwealth",
      chamber: "Senate",
      date: "7 February 2017",
      page: "39",
      speaker: "George Brandis, Attorney-General",
    };
    const runs = formatHansard(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Commonwealth, Parliamentary Debates, Senate, 7 February 2017, 39 (George Brandis, Attorney-General)"
    );
    // "Parliamentary Debates" must be italic
    expectItalic(runs, "Parliamentary Debates");
    // Jurisdiction must NOT be italic
    expectNotItalic(runs, "Commonwealth");
  });

  /*
   * AGLC4 Example 48:
   * Victoria, Parliamentary Debates, Legislative Council, 14 December 2017,
   * 6854.
   * No speaker.
   */
  it("Example 48: Hansard without speaker", () => {
    const data: HansardData = {
      jurisdiction: "Victoria",
      chamber: "Legislative Council",
      date: "14 December 2017",
      page: "6854",
    };
    const runs = formatHansard(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Victoria, Parliamentary Debates, Legislative Council, 14 December 2017, 6854"
    );
    expectItalic(runs, "Parliamentary Debates");
  });
});

// ─── Rules 7.11.1–7.11.2 — Newspaper Articles ─────────────────────────────────

describe("Rules 7.11.1–7.11.2 — Newspaper Articles", () => {
  /*
   * AGLC4 Example 82 (printed):
   * Stephanie Peatling, 'Female Chief Justice Rewrites the Script', The Age
   * (Melbourne, 31 January 2017) 6.
   */
  it("Example 82: printed newspaper with author and page", () => {
    const data: NewspaperData = {
      authors: [{ givenNames: "Stephanie", surname: "Peatling" }],
      title: "Female Chief Justice Rewrites the Script",
      newspaper: "The Age",
      place: "Melbourne",
      date: "31 January 2017",
      page: "6",
    };
    const runs = formatNewspaper(data);
    const text = toPlainText(runs);

    expect(text).toContain("Stephanie Peatling, ");
    expect(text).toContain("\u2018Female Chief Justice Rewrites the Script\u2019");
    expect(text).toContain("(Melbourne, 31 January 2017)");
    expect(text).toContain(" 6");
    // Newspaper name must be italic
    expectItalic(runs, "The Age");
    // Title must NOT be italic
    expectNotItalic(runs, "Female Chief Justice");
  });

  /*
   * AGLC4 Example 86 (electronic):
   * Farrah Tomazin, 'Kinder Wages Breakthrough', The Age (online,
   * 19 May 2009) <http://www.theage.com.au/...>.
   */
  it("Example 86: electronic newspaper", () => {
    const data: NewspaperData = {
      authors: [{ givenNames: "Farrah", surname: "Tomazin" }],
      title: "Kinder Wages Breakthrough",
      newspaper: "The Age",
      place: "Melbourne",
      date: "19 May 2009",
      isElectronic: true,
      url: "http://www.theage.com.au/national/education/kinder-wages-breakthrough-20090519-bcwh.html",
    };
    const runs = formatNewspaper(data);
    const text = toPlainText(runs);

    // Electronic format: (online, Date) — NOT (Place, Date)
    expect(text).toContain("(online, 19 May 2009)");
    expect(text).not.toContain("(Melbourne,");
    // URL in angle brackets
    expect(text).toContain("<http://www.theage.com.au/national/education/kinder-wages-breakthrough-20090519-bcwh.html>");
    expectItalic(runs, "The Age");
  });

  /*
   * AGLC4 Example 90 (unsigned):
   * 'Fury at WA Council Plan', The Australian Financial Review (Sydney,
   * 1 May 2006) 5.
   */
  it("Example 90: unsigned article (no author)", () => {
    const data: NewspaperData = {
      title: "Fury at WA Council Plan",
      newspaper: "The Australian Financial Review",
      place: "Sydney",
      date: "1 May 2006",
      page: "5",
    };
    const runs = formatNewspaper(data);
    const text = toPlainText(runs);

    // No author prefix
    expect(text).toMatch(/^\u2018Fury at WA Council Plan\u2019/);
    expect(text).toContain("(Sydney, 1 May 2006)");
    expect(text).toContain(" 5");
  });
});

describe("Rules 7.11.4 — Editorials", () => {
  /*
   * AGLC4 Example 91:
   * Editorial, 'Medicare by Name, No Longer by Nature', News, The Age
   * (Melbourne, 12 March 2004) 12.
   */
  it("Example 91: editorial with title", () => {
    const data: EditorialData = {
      title: "Medicare by Name, No Longer by Nature",
      newspaper: "News, The Age",
      place: "Melbourne",
      date: "12 March 2004",
      page: "12",
    };
    const runs = formatEditorial(data);
    const text = toPlainText(runs);

    expect(text).toContain("\u2018Medicare by Name, No Longer by Nature\u2019");
    expect(text).toContain("(Melbourne, 12 March 2004)");
    expect(text).toContain(" 12");
  });

  it("editorial without title uses 'Editorial'", () => {
    const data: EditorialData = {
      newspaper: "The Age",
      place: "Melbourne",
      date: "1 January 2020",
    };
    const runs = formatEditorial(data);
    const text = toPlainText(runs);

    expect(text).toMatch(/^Editorial, /);
  });
});

// ─── Rule 7.12 — Written Correspondence ────────────────────────────────────────

describe("Rule 7.12 — Written Correspondence", () => {
  /*
   * AGLC4 Example 93:
   * Email from Vanessa Li to Samantha Jones, 4 November 2015.
   */
  it("Example 93: email correspondence", () => {
    const data: CorrespondenceData = {
      type: "Email",
      sender: "Vanessa Li",
      recipient: "Samantha Jones",
      date: "4 November 2015",
    };
    const runs = formatCorrespondence(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Email from Vanessa Li to Samantha Jones, 4 November 2015"
    );
  });

  /*
   * AGLC4 Example 94:
   * Letter from Sir Peter Cosgrove to Malcolm Turnbull, 3 July 2016 <URL>.
   */
  it("Example 94: letter correspondence", () => {
    const data: CorrespondenceData = {
      type: "Letter",
      sender: "Sir Peter Cosgrove",
      recipient: "Malcolm Turnbull",
      date: "3 July 2016",
    };
    const runs = formatCorrespondence(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Letter from Sir Peter Cosgrove to Malcolm Turnbull, 3 July 2016"
    );
  });
});

// ─── Rule 7.15 — Internet Materials ────────────────────────────────────────────

describe("Rule 7.15 — Internet Materials", () => {
  /*
   * AGLC4 Example 112:
   * 'James Edelman', High Court of Australia (Web Page)
   * <http://www.hcourt.gov.au/justices/current/justice-james-edelman>.
   * No author (author same as web page title would be, so omitted).
   */
  it("Example 112: internet material without author", () => {
    const data: InternetMaterialData = {
      title: "James Edelman",
      website: "High Court of Australia",
      date: "Web Page",
      url: "http://www.hcourt.gov.au/justices/current/justice-james-edelman",
    };
    const runs = formatInternetMaterial(data);
    const text = toPlainText(runs);

    // No author prefix — starts with quoted title
    expect(text).toMatch(/^\u2018James Edelman\u2019/);
    expect(text).toContain("(Web Page)");
    expect(text).toContain("<http://www.hcourt.gov.au/justices/current/justice-james-edelman>");
    // Website title italic
    expectItalic(runs, "High Court of Australia");
  });

  /*
   * AGLC4 Example 113:
   * Martin Clark, 'Koani v The Queen', Opinions on High (Blog Post, 18
   * October 2017) <URL>.
   */
  it("Example 113: internet material with author and document type", () => {
    const data: InternetMaterialData = {
      authors: [{ givenNames: "Martin", surname: "Clark" }],
      title: "Koani v The Queen",
      website: "Opinions on High",
      date: "Blog Post, 18 October 2017",
      url: "http://blogs.unimelb.edu.au/opinionsonhigh/2017/10/18/koani-case-page/",
    };
    const runs = formatInternetMaterial(data);
    const text = toPlainText(runs);

    expect(text).toContain("Martin Clark, ");
    expect(text).toContain("\u2018Koani v The Queen\u2019");
    expect(text).toContain("(Blog Post, 18 October 2017)");
    expectItalic(runs, "Opinions on High");
  });
});

// ─── Rule 7.16 — Social Media ──────────────────────────────────────────────────

describe("Rule 7.16 — Social Media", () => {
  /*
   * AGLC4 Example 114:
   * Brooking Creative Labs, 'Is America Dreaming?: Understanding Social
   * Mobility' (YouTube, 20 July 2015) 00:00:00–00:01:00 <URL>.
   */
  it("Example 114: social media with title (YouTube)", () => {
    const data: SocialMediaData = {
      author: "Brooking Creative Labs",
      title: "Is America Dreaming?: Understanding Social Mobility",
      platform: "YouTube",
      date: "20 July 2015",
      url: "https://www.youtube.com/watch?v=vG6-UaBECN4",
    };
    const runs = formatSocialMedia(data);
    const text = toPlainText(runs);

    expect(text).toContain("Brooking Creative Labs");
    expect(text).toContain(
      "\u2018Is America Dreaming?: Understanding Social Mobility\u2019"
    );
    expect(text).toContain("(YouTube, 20 July 2015)");
    expect(text).toContain("<https://www.youtube.com/watch?v=vG6-UaBECN4>");
  });

  /*
   * AGLC4 Example 115:
   * chapteriiibestbits (Instagram, 21 July 2016 AEST) <URL>.
   * No title.
   */
  it("Example 115: social media without title (Instagram)", () => {
    const data: SocialMediaData = {
      author: "chapteriiibestbits",
      platform: "Instagram",
      date: "21 July 2016 AEST",
      url: "https://www.instagram.com/p/BIICBevgk31",
    };
    const runs = formatSocialMedia(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "chapteriiibestbits (Instagram, 21 July 2016 AEST) <https://www.instagram.com/p/BIICBevgk31>"
    );
    // No title, no comma after author before parenthetical
    expect(text).not.toContain("\u2018");
  });

  /*
   * AGLC4 Example 116:
   * @s_m_stephenson (Scott Stephenson) (Twitter, 17 July 2017, 9:37pm
   * AEST) <URL>.
   * Time is included as separate element.
   */
  it("Example 116: social media with time (Twitter)", () => {
    const data: SocialMediaData = {
      author: "@s_m_stephenson (Scott Stephenson)",
      platform: "Twitter",
      date: "17 July 2017",
      time: "9:37pm AEST",
      url: "https://twitter.com/s_m_stephenson/status/887169425551441921",
    };
    const runs = formatSocialMedia(data);
    const text = toPlainText(runs);

    expect(text).toContain("@s_m_stephenson (Scott Stephenson)");
    expect(text).toContain("(Twitter, 17 July 2017, 9:37pm AEST)");
    expect(text).toContain("<https://twitter.com/s_m_stephenson/status/887169425551441921>");
  });
});
