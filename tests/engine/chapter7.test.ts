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
  formatParliamentaryReport,
  formatRoyalCommissionReport,
  formatResearchPaper,
  formatParliamentaryResearchPaper,
  formatConferencePaper,
  formatThesis,
  formatSpeech,
  formatPressRelease,
  formatSubmissionToInquiry,
  formatHansard,
  ReportData,
  HansardData,
} from "../../src/engine/rules/v4/secondary/other";
import {
  formatParliamentaryEvidence,
  formatConstitutionalConvention,
  formatDictionary,
  formatLegalEncyclopedia,
  formatLooseleaf,
  formatIpMaterial,
  formatConstitutiveDocument,
  formatNewspaper,
  formatEditorial,
  formatCorrespondence,
  formatInterview,
  formatFilm,
  formatTvSeries,
  formatPodcast,
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
    // Rule 1.7 lowercases the preposition 'out' (guide ex 2 prints 'Out';
    // per DECISION-012 the rule text is implemented).
    expectItalic(runs, "Unaffordable and out of Reach");
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

// ─── Rule 7.1.2 — Parliamentary Papers and Committee Reports ──────────────────

describe("Rule 7.1.2 — Parliamentary committee reports", () => {
  it("puts the committee before the legislature per AGLC4 ex 8 (rule 7.1.2)", () => {
    // Senate Standing Committee for the Scrutiny of Bills, Parliament of
    // Australia, Alert Digest (Digest No 9 of 2007, 13 August 2007) 11.
    const runs = formatParliamentaryReport({
      committee: "Senate Standing Committee for the Scrutiny of Bills",
      legislature: "Parliament of Australia",
      title: "Alert Digest",
      documentType: "Digest",
      number: "9 of 2007",
      date: "13 August 2007",
      pinpoint: { type: "page", value: "11" },
    });
    expect(toPlainText(runs)).toBe(
      "Senate Standing Committee for the Scrutiny of Bills, Parliament of Australia, Alert Digest (Digest No 9 of 2007, 13 August 2007) 11"
    );
    expectItalic(runs, "Alert Digest");
  });

  it("does not repeat a year that forms part of the title per AGLC4 ex 12 (rule 7.1.2)", () => {
    // Senate Standing Committee for the Scrutiny of Bills, Parliament of
    // Australia, Tenth Report of 2016 (Report, 30 November 2016) 671.
    const runs = formatParliamentaryReport({
      committee: "Senate Standing Committee for the Scrutiny of Bills",
      legislature: "Parliament of Australia",
      title: "Tenth Report of 2016",
      documentType: "Report",
      date: "30 November 2016",
      pinpoint: { type: "page", value: "671" },
    });
    expect(toPlainText(runs)).toBe(
      "Senate Standing Committee for the Scrutiny of Bills, Parliament of Australia, Tenth Report of 2016 (Report, 30 November 2016) 671"
    );
  });
});

// ─── Rule 7.1.3 — Royal Commission Reports ────────────────────────────────────

describe("Rule 7.1.3 — Royal commission reports", () => {
  it("cites the report with no author per AGLC4 ex 13 (rule 7.1.3)", () => {
    // Royal Commission into Trade Union Governance and Corruption
    // (Final Report, December 2015) vol 2. [Not: JD Heydon, Royal …]
    const runs = formatRoyalCommissionReport({
      title: "Royal Commission into Trade Union Governance and Corruption",
      documentType: "Final Report",
      date: "December 2015",
      volume: 2,
    });
    expect(toPlainText(runs)).toBe(
      "Royal Commission into Trade Union Governance and Corruption (Final Report, December 2015) vol 2"
    );
    expectItalic(runs, "Royal Commission into Trade Union Governance and Corruption");
  });

  it("formats a volume with pinpoint per AGLC4 ex 15 (rule 7.1.3)", () => {
    // Royal Commission into Family Violence: Report and Recommendations
    // (Report, March 2016) vol 3, 1–2.
    const runs = formatRoyalCommissionReport({
      title: "Royal Commission into Family Violence: Report and Recommendations",
      documentType: "Report",
      date: "March 2016",
      volume: 3,
      pinpoint: { type: "page", value: "1–2" },
    });
    expect(toPlainText(runs)).toBe(
      "Royal Commission into Family Violence: Report and Recommendations (Report, March 2016) vol 3, 1–2"
    );
  });
});

// ─── Rules 7.2.1–7.2.2 — Research and Working Papers ──────────────────────────

describe("Rules 7.2.1–7.2.2 — Research and working papers", () => {
  it("formats a research paper with identifier and full date per AGLC4 ex 28 (rule 7.2.2)", () => {
    // Matthew H Kramer, 'The Illusion of Neutrality: Abortion and the
    // Foundations of Justice' (Research Paper No 9/2017, Faculty of Law,
    // University of Cambridge, January 2017).
    const runs = formatResearchPaper({
      authors: [{ givenNames: "Matthew H", surname: "Kramer" }],
      title: "The Illusion of Neutrality: Abortion and the Foundations of Justice",
      documentType: "Research Paper",
      number: "9/2017",
      institution: "Faculty of Law, University of Cambridge",
      date: "January 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Matthew H Kramer, ‘The Illusion of Neutrality: Abortion and the Foundations of Justice’ (Research Paper No 9/2017, Faculty of Law, University of Cambridge, January 2017)"
    );
  });

  it("omits 'No' for an unnumbered paper (rule 7.2.1)", () => {
    const runs = formatResearchPaper({
      authors: [{ givenNames: "Test", surname: "Author" }],
      title: "Test Paper",
      documentType: "Discussion Paper",
      institution: "Test Institute",
      date: "May 2019",
    });
    expect(toPlainText(runs)).toBe(
      "Test Author, ‘Test Paper’ (Discussion Paper, Test Institute, May 2019)"
    );
  });

  it("formats a working paper with pinpoint and URL per AGLC4 ex 30 (rules 7.2.2, 4.4)", () => {
    // John Howe and Ingrid Landau, '"Light Touch" Labour Regulation by
    // State Governments in Australia: A Preliminary Assessment' (Working
    // Paper No 40, Centre for Employment and Labour Relations Law, The
    // University of Melbourne, December 2006) 6 <URL>.
    const runs = formatResearchPaper({
      authors: [
        { givenNames: "John", surname: "Howe" },
        { givenNames: "Ingrid", surname: "Landau" },
      ],
      title:
        "“Light Touch” Labour Regulation by State Governments in Australia: A Preliminary Assessment",
      documentType: "Working Paper",
      number: "40",
      institution:
        "Centre for Employment and Labour Relations Law, The University of Melbourne",
      date: "December 2006",
      pinpoint: { type: "page", value: "6" },
      url: "http://papers.ssrn.com/sol3/papers.cfm?abstract_id=961528",
    });
    expect(toPlainText(runs)).toBe(
      "John Howe and Ingrid Landau, ‘“Light Touch” Labour Regulation by State Governments in Australia: A Preliminary Assessment’ (Working Paper No 40, Centre for Employment and Labour Relations Law, The University of Melbourne, December 2006) 6 <http://papers.ssrn.com/sol3/papers.cfm?abstract_id=961528>"
    );
  });
});

// ─── Rule 7.2.3 — Parliamentary Research Papers ───────────────────────────────

describe("Rule 7.2.3 — Parliamentary research papers", () => {
  it("leads with the individual author per AGLC4 ex 33 (rule 7.2.3)", () => {
    // Amanda Biggs, 'Medicare: A Quick Guide' (Research Paper,
    // Parliamentary Library, Parliament of Australia, 12 July 2016).
    const runs = formatParliamentaryResearchPaper({
      authors: [{ givenNames: "Amanda", surname: "Biggs" }],
      title: "Medicare: A Quick Guide",
      documentType: "Research Paper",
      body: "Parliamentary Library",
      legislature: "Parliament of Australia",
      date: "12 July 2016",
    });
    expect(toPlainText(runs)).toBe(
      "Amanda Biggs, ‘Medicare: A Quick Guide’ (Research Paper, Parliamentary Library, Parliament of Australia, 12 July 2016)"
    );
  });

  it("includes a document number and jurisdiction-specific provider per AGLC4 ex 36 (rule 7.2.3)", () => {
    // Caley Otter, 'Voluntary Assisted Dying Bill 2017' (Research Note
    // No 1, Parliamentary Library and Information Service, Parliament of
    // Victoria, October 2017).
    const runs = formatParliamentaryResearchPaper({
      authors: [{ givenNames: "Caley", surname: "Otter" }],
      title: "Voluntary Assisted Dying Bill 2017",
      documentType: "Research Note",
      number: "1",
      body: "Parliamentary Library and Information Service",
      legislature: "Parliament of Victoria",
      date: "October 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Caley Otter, ‘Voluntary Assisted Dying Bill 2017’ (Research Note No 1, Parliamentary Library and Information Service, Parliament of Victoria, October 2017)"
    );
  });
});

// ─── Rule 7.2.4 — Conference Papers ───────────────────────────────────────────

describe("Rule 7.2.4 — Conference papers", () => {
  it("reproduces the document type from the source per AGLC4 ex 38 (rule 7.2.4)", () => {
    // Jacqueline Campbell, 'When Family Law Meets Bankruptcy' (Seminar
    // Paper, Law Institute of Victoria, 17 February 2015).
    const runs = formatConferencePaper({
      authors: [{ givenNames: "Jacqueline", surname: "Campbell" }],
      title: "When Family Law Meets Bankruptcy",
      documentType: "Seminar Paper",
      conferenceName: "Law Institute of Victoria",
      date: "17 February 2015",
    });
    expect(toPlainText(runs)).toBe(
      "Jacqueline Campbell, ‘When Family Law Meets Bankruptcy’ (Seminar Paper, Law Institute of Victoria, 17 February 2015)"
    );
  });

  it("defaults to 'Conference Paper' per AGLC4 ex 37 (rule 7.2.4)", () => {
    // Ian Mutton, 'Extra-Territoriality: A Case Study' (Conference Paper,
    // International Trade Law Conference, 29 May 1997).
    const runs = formatConferencePaper({
      authors: [{ givenNames: "Ian", surname: "Mutton" }],
      title: "Extra-Territoriality: A Case Study",
      conferenceName: "International Trade Law Conference",
      date: "29 May 1997",
    });
    expect(toPlainText(runs)).toBe(
      "Ian Mutton, ‘Extra-Territoriality: A Case Study’ (Conference Paper, International Trade Law Conference, 29 May 1997)"
    );
  });
});

// ─── Rule 7.2.5 — Theses ──────────────────────────────────────────────────────

describe("Rule 7.2.5 — Theses", () => {
  it("sets the thesis title in single quotation marks per AGLC4 ex 39 (rule 7.2.5)", () => {
    // Antonio Kurt Esposito, 'The History of the Torrens System of Land
    // Registration with Special Reference to Its German Origins' (LLM
    // Thesis, The University of Adelaide, 2000).
    const runs = formatThesis({
      author: { givenNames: "Antonio Kurt", surname: "Esposito" },
      title:
        "The History of the Torrens System of Land Registration with Special Reference to Its German Origins",
      thesisType: "LLM Thesis",
      university: "The University of Adelaide",
      year: 2000,
    });
    const text = toPlainText(runs);
    expect(text).toBe(
      "Antonio Kurt Esposito, ‘The History of the Torrens System of Land Registration with Special Reference to Its German Origins’ (LLM Thesis, The University of Adelaide, 2000)"
    );
    // The thesis title must NOT be italic (rule 7.2.1 template)
    expectNotItalic(runs, "Torrens System");
  });
});

// ─── Rule 7.3 — Speeches ──────────────────────────────────────────────────────

describe("Rule 7.3 — Speeches", () => {
  it("replaces 'Speech' with a named lecture per AGLC4 ex 42 (rule 7.3)", () => {
    // Virginia Bell, 'Section 80: The Great Constitutional Tautology'
    // (Lucinda Lecture, Monash University, 24 October 2013).
    // [Not: … the Lucinda Lecture …]
    const runs = formatSpeech({
      speaker: "Virginia Bell",
      title: "Section 80: The Great Constitutional Tautology",
      speechType: "The Lucinda Lecture",
      event: "Monash University",
      date: "24 October 2013",
    });
    expect(toPlainText(runs)).toBe(
      "Virginia Bell, ‘Section 80: The Great Constitutional Tautology’ (Lucinda Lecture, Monash University, 24 October 2013)"
    );
  });

  it("uses the city when no forum is indicated per AGLC4 ex 43 (rule 7.3)", () => {
    // Lord Sumption, 'The Limits of Law' (Sultan Azlan Shah Lecture,
    // Kuala Lumpur, 20 November 2013).
    const runs = formatSpeech({
      speaker: "Lord Sumption",
      title: "The Limits of Law",
      speechType: "Sultan Azlan Shah Lecture",
      event: "Kuala Lumpur",
      date: "20 November 2013",
    });
    expect(toPlainText(runs)).toBe(
      "Lord Sumption, ‘The Limits of Law’ (Sultan Azlan Shah Lecture, Kuala Lumpur, 20 November 2013)"
    );
  });

  it("defaults the document type to 'Speech' (rule 7.3)", () => {
    // Cf AGLC4 ex 20 under rule 4.1.5: Michael Kirby, 'The Dreyfus Affair:
    // Lessons for Today' (Speech, Central Synagogue, 24 May 2009).
    const runs = formatSpeech({
      speaker: "Michael Kirby",
      title: "The Dreyfus Affair: Lessons for Today",
      event: "Central Synagogue",
      date: "24 May 2009",
    });
    expect(toPlainText(runs)).toBe(
      "Michael Kirby, ‘The Dreyfus Affair: Lessons for Today’ (Speech, Central Synagogue, 24 May 2009)"
    );
  });
});

// ─── Rule 7.4 — Press and Media Releases ──────────────────────────────────────

describe("Rule 7.4 — Press and media releases", () => {
  it("includes the document number after the release type per AGLC4 ex 45 (rule 7.4)", () => {
    // Department of Defence (Cth), 'Highest East Timorese Honour for Army
    // Officers' (Media Release MSPA 172/09, 22 May 2009).
    const runs = formatPressRelease({
      body: "Department of Defence (Cth)",
      title: "Highest East Timorese Honour for Army Officers",
      releaseType: "Media Release",
      documentNumber: "MSPA 172/09",
      date: "22 May 2009",
    });
    expect(toPlainText(runs)).toBe(
      "Department of Defence (Cth), ‘Highest East Timorese Honour for Army Officers’ (Media Release MSPA 172/09, 22 May 2009)"
    );
  });

  it("formats a release with pinpoint per AGLC4 ex 46 (rule 7.4)", () => {
    // ASX, 'ASX Selects Distributed Ledger Technology to Replace CHESS'
    // (Media Release, 7 December 2017) 1.
    const runs = formatPressRelease({
      body: "ASX",
      title: "ASX Selects Distributed Ledger Technology to Replace CHESS",
      date: "7 December 2017",
      pinpoint: { type: "page", value: "1" },
    });
    expect(toPlainText(runs)).toBe(
      "ASX, ‘ASX Selects Distributed Ledger Technology to Replace CHESS’ (Media Release, 7 December 2017) 1"
    );
  });

  it("drops the issuing body where identical to the author (rule 7.4)", () => {
    const runs = formatPressRelease({
      body: "ASX",
      issuingBody: "ASX",
      title: "Test Release",
      date: "1 January 2020",
    });
    expect(toPlainText(runs)).toBe("ASX, ‘Test Release’ (Media Release, 1 January 2020)");
  });
});

// ─── Rule 7.5.2 — Submissions to Inquiries ────────────────────────────────────

describe("Rule 7.5.2 — Written submissions to inquiries", () => {
  it("italicises the inquiry name per AGLC4 ex 49 (rule 7.5.2)", () => {
    // Australian Institute of Company Directors, Submission No 119 to
    // Senate Standing Committees on Economics, Parliament of Australia,
    // The Performance of the Australian Securities and Investments
    // Commission (21 October 2013) 2.
    const runs = formatSubmissionToInquiry({
      body: "Australian Institute of Company Directors",
      documentType: "Submission",
      number: "119",
      committee: "Senate Standing Committees on Economics, Parliament of Australia",
      inquiry: "The Performance of the Australian Securities and Investments Commission",
      date: "21 October 2013",
      pinpoint: { type: "page", value: "2" },
    });
    expect(toPlainText(runs)).toBe(
      "Australian Institute of Company Directors, Submission No 119 to Senate Standing Committees on Economics, Parliament of Australia, The Performance of the Australian Securities and Investments Commission (21 October 2013) 2"
    );
    expectItalic(runs, "The Performance of the Australian Securities and Investments Commission");
  });

  it("omits the inquiry name for royal commissions per AGLC4 ex 54 (rule 7.5.2)", () => {
    // Anonymous 489, Submission to Royal Commission into Family Violence
    // (29 May 2015). — no stray comma when the inquiry is omitted.
    const runs = formatSubmissionToInquiry({
      body: "Anonymous 489",
      documentType: "Submission",
      committee: "Royal Commission into Family Violence",
      date: "29 May 2015",
    });
    expect(toPlainText(runs)).toBe(
      "Anonymous 489, Submission to Royal Commission into Family Violence (29 May 2015)"
    );
  });
});

// ─── Rule 7.5.3 — Evidence to Parliamentary Committees ────────────────────────

describe("Rule 7.5.3 — Evidence to parliamentary committees", () => {
  it("places the hearing location after the legislature per AGLC4 ex 55 (rule 7.5.3)", () => {
    // Evidence to House Standing Committee on Tax and Revenue, Parliament
    // of Australia, Canberra, 30 November 2016, 2 (Peter Strong).
    const runs = formatParliamentaryEvidence({
      title: "",
      committee: "House Standing Committee on Tax and Revenue",
      parliament: "Parliament of Australia",
      location: "Canberra",
      date: "30 November 2016",
      page: "2",
      witness: "Peter Strong",
    });
    expect(toPlainText(runs)).toBe(
      "Evidence to House Standing Committee on Tax and Revenue, Parliament of Australia, Canberra, 30 November 2016, 2 (Peter Strong)"
    );
  });

  it("includes the witness's position per AGLC4 ex 56 (rule 7.5.3)", () => {
    const runs = formatParliamentaryEvidence({
      title: "",
      committee: "Senate Standing Committee on Foreign Affairs, Defence and Trade",
      parliament: "Parliament of Australia",
      location: "Canberra",
      date: "26 February 2007",
      page: "12",
      witness: "Angus Houston, Air Chief Marshal",
    });
    expect(toPlainText(runs)).toBe(
      "Evidence to Senate Standing Committee on Foreign Affairs, Defence and Trade, Parliament of Australia, Canberra, 26 February 2007, 12 (Angus Houston, Air Chief Marshal)"
    );
  });
});

// ─── Rule 7.5.4 — Constitutional Convention Debates ───────────────────────────

describe("Rule 7.5.4 — Constitutional convention debates", () => {
  it("italicises the title and appends the speaker per AGLC4 ex 57 (rule 7.5.4)", () => {
    // Official Record of the Debates of the Australasian Federal
    // Convention, Sydney, 2 September 1897, 19 (Edmund Barton).
    const runs = formatConstitutionalConvention({
      conventionName: "Official Record of the Debates of the Australasian Federal Convention",
      location: "Sydney",
      date: "2 September 1897",
      page: "19",
      speaker: "Edmund Barton",
    });
    expect(toPlainText(runs)).toBe(
      "Official Record of the Debates of the Australasian Federal Convention, Sydney, 2 September 1897, 19 (Edmund Barton)"
    );
    expectItalic(runs, "Official Record of the Debates of the Australasian Federal Convention");
  });

  it("retains 'Sir' in the speaker's name per AGLC4 ex 58 (rule 7.5.4)", () => {
    // Official Report of the National Australasian Convention Debates,
    // Adelaide, 29 March 1897, 206–7 (Sir John Downer).
    const runs = formatConstitutionalConvention({
      conventionName: "Official Report of the National Australasian Convention Debates",
      location: "Adelaide",
      date: "29 March 1897",
      page: "206–7",
      speaker: "Sir John Downer",
    });
    expect(toPlainText(runs)).toBe(
      "Official Report of the National Australasian Convention Debates, Adelaide, 29 March 1897, 206–7 (Sir John Downer)"
    );
  });
});

// ─── Rule 7.6 — Dictionaries ──────────────────────────────────────────────────

describe("Rule 7.6 — Dictionaries", () => {
  it("formats a hard-copy dictionary entry per AGLC4 ex 59 (rule 7.6)", () => {
    // Macquarie Dictionary (5th ed, 2009) 'demise' (def 4).
    const runs = formatDictionary({
      title: "Macquarie Dictionary",
      edition: "5th ed",
      year: "2009",
      entry: "demise",
      definitionNumber: "4",
    });
    expect(toPlainText(runs)).toBe("Macquarie Dictionary (5th ed, 2009) ‘demise’ (def 4)");
    expectItalic(runs, "Macquarie Dictionary");
  });

  it("includes the homograph marker before the definition per AGLC4 ex 61 (rule 7.6)", () => {
    // Oxford English Dictionary (2nd ed, 1989) 'school' (v², def 2b).
    const runs = formatDictionary({
      title: "Oxford English Dictionary",
      edition: "2nd ed",
      year: "1989",
      entry: "school",
      entryType: "v²",
      definitionNumber: "2b",
    });
    expect(toPlainText(runs)).toBe(
      "Oxford English Dictionary (2nd ed, 1989) ‘school’ (v², def 2b)"
    );
  });

  it("formats an online dictionary per AGLC4 ex 62 (rule 7.6)", () => {
    // Macquarie Dictionary (online at 20 February 2018) 'punctilious'.
    const runs = formatDictionary({
      title: "Macquarie Dictionary",
      year: "",
      retrievedDate: "20 February 2018",
      entry: "punctilious",
    });
    expect(toPlainText(runs)).toBe(
      "Macquarie Dictionary (online at 20 February 2018) ‘punctilious’"
    );
  });

  it("does not emit a publisher element (rule 7.6)", () => {
    const runs = formatDictionary({
      title: "Macquarie Dictionary",
      publisher: "Macquarie Dictionary Publishers",
      edition: "5th ed",
      year: "2009",
      entry: "demise",
    });
    expect(toPlainText(runs)).toBe("Macquarie Dictionary (5th ed, 2009) ‘demise’");
  });
});

// ─── Rule 7.7 — Legal Encyclopedias ───────────────────────────────────────────

describe("Rule 7.7 — Legal encyclopedias", () => {
  it("formats a hard-copy encyclopedia per AGLC4 ex 64 (rule 7.7)", () => {
    // LexisNexis, Halsbury's Laws of Australia, vol 15 (at 25 May 2009)
    // 235 Insurance, '2 General Principles' [235-270].
    const runs = formatLegalEncyclopedia({
      publisher: "LexisNexis",
      title: "Halsbury's Laws of Australia",
      volume: "15",
      date: "25 May 2009",
      titleNumber: "235",
      titleName: "Insurance",
      topic: "2 General Principles",
      paragraph: "235-270",
    });
    expect(toPlainText(runs)).toBe(
      "LexisNexis, Halsbury's Laws of Australia, vol 15 (at 25 May 2009) 235 Insurance, ‘2 General Principles’ [235-270]"
    );
    expectItalic(runs, "Halsbury's Laws of Australia");
  });

  it("formats an online encyclopedia per AGLC4 ex 65 (rule 7.7)", () => {
    // Westlaw AU, The Laws of Australia (online at 15 February 2018)
    // 2 Administrative Law, '2.3 Access to Information' [2.3.10].
    const runs = formatLegalEncyclopedia({
      publisher: "Westlaw AU",
      title: "The Laws of Australia",
      date: "",
      retrievedDate: "15 February 2018",
      titleNumber: "2",
      titleName: "Administrative Law",
      topic: "2.3 Access to Information",
      paragraph: "2.3.10",
    });
    expect(toPlainText(runs)).toBe(
      "Westlaw AU, The Laws of Australia (online at 15 February 2018) 2 Administrative Law, ‘2.3 Access to Information’ [2.3.10]"
    );
  });
});

// ─── Rule 7.8 — Looseleaf Services ────────────────────────────────────────────

describe("Rule 7.8 — Looseleaf services", () => {
  it("formats a print looseleaf per AGLC4 ex 67 (rule 7.8)", () => {
    // Neil J Williams, LexisNexis Butterworths, Civil Procedure: Victoria,
    // vol 1 (at Service 299) [21.01.1].
    const runs = formatLooseleaf({
      authors: [{ givenNames: "Neil J", surname: "Williams" }],
      publisher: "LexisNexis Butterworths",
      title: "Civil Procedure: Victoria",
      volume: "1",
      date: "Service 299",
      paragraph: "21.01.1",
    });
    expect(toPlainText(runs)).toBe(
      "Neil J Williams, LexisNexis Butterworths, Civil Procedure: Victoria, vol 1 (at Service 299) [21.01.1]"
    );
    expectItalic(runs, "Civil Procedure: Victoria");
  });

  it("formats an online looseleaf with ¶ pinpoint per AGLC4 ex 70 (rule 7.8)", () => {
    // CCH Australia, Australian Intellectual Property Commentary
    // (online at 20 February 2018) ¶7-000.
    const runs = formatLooseleaf({
      authors: [],
      publisher: "CCH Australia",
      title: "Australian Intellectual Property Commentary",
      date: "",
      retrievedDate: "20 February 2018",
      paragraph: "¶7-000",
    });
    expect(toPlainText(runs)).toBe(
      "CCH Australia, Australian Intellectual Property Commentary (online at 20 February 2018) ¶7-000"
    );
  });
});

// ─── Rule 7.9 — Intellectual Property Materials ───────────────────────────────

describe("Rule 7.9 — IP materials", () => {
  it("formats a registered trade mark per AGLC4 ex 71 (rule 7.9)", () => {
    // US Trademark Registration No 4938522, filed on 6 December 2013
    // (Registered on 12 April 2016).
    const runs = formatIpMaterial({
      jurisdictionCode: "US",
      ipType: "Trademark",
      numberQualifier: "Registration",
      number: "4938522",
      filingDate: "6 December 2013",
      status: "Registered",
      statusDate: "12 April 2016",
    });
    expect(toPlainText(runs)).toBe(
      "US Trademark Registration No 4938522, filed on 6 December 2013 (Registered on 12 April 2016)"
    );
    // The identifier segment is italicised
    expectItalic(runs, "US Trademark Registration No 4938522");
    expectNotItalic(runs, "filed on");
  });

  it("omits the status parenthetical where nothing has changed per AGLC4 ex 76 (rule 7.9)", () => {
    // AU Patent Application No 2017905190, filed on 22 December 2017.
    const runs = formatIpMaterial({
      jurisdictionCode: "AU",
      ipType: "Patent",
      numberQualifier: "Application",
      number: "2017905190",
      filingDate: "22 December 2017",
    });
    expect(toPlainText(runs)).toBe(
      "AU Patent Application No 2017905190, filed on 22 December 2017"
    );
  });
});

// ─── Rule 7.10 — Constitutive Documents ───────────────────────────────────────

describe("Rule 7.10 — Constitutive documents of a corporation", () => {
  it("formats a company constitution per AGLC4 ex 78 (rule 7.10)", () => {
    // Constitution, ASX (at 5 October 2012) cl 1.1.
    const runs = formatConstitutiveDocument({
      documentType: "Constitution",
      companyName: "ASX",
      date: "5 October 2012",
      pinpoint: { type: "clause", value: "1.1" },
    });
    expect(toPlainText(runs)).toBe("Constitution, ASX (at 5 October 2012) cl 1.1");
    expectItalic(runs, "Constitution");
    expectNotItalic(runs, "ASX");
  });

  it("strips corporate designators from the company name (rule 7.10)", () => {
    const runs = formatConstitutiveDocument({
      documentType: "Constitution",
      companyName: "The Example Holdings Pty Ltd",
      date: "1 March 2019",
    });
    expect(toPlainText(runs)).toBe("Constitution, Example Holdings (at 1 March 2019)");
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

describe("Rules 7.11.4 — Editorials and untitled articles", () => {
  /*
   * AGLC4 Example 91:
   * Editorial, 'Medicare by Name, No Longer by Nature', News, The Age
   * (Melbourne, 12 March 2004) 12.
   */
  it("leads with 'Editorial' and keeps the quoted title per AGLC4 ex 91 (rule 7.11.4)", () => {
    // 'Editorial' replaces the AUTHOR; the quoted title is retained.
    const data: EditorialData = {
      title: "Medicare by Name, No Longer by Nature",
      newspaper: "News, The Age",
      place: "Melbourne",
      date: "12 March 2004",
      page: "12",
    };
    const runs = formatEditorial(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Editorial, \u2018Medicare by Name, No Longer by Nature\u2019, News, The Age (Melbourne, 12 March 2004) 12"
    );
  });

  it("editorial without title uses 'Editorial'", () => {
    const data: EditorialData = {
      newspaper: "The Age",
      place: "Melbourne",
      date: "1 January 2020",
    };
    const runs = formatEditorial(data);
    const text = toPlainText(runs);

    expect(text).toBe("Editorial, The Age (Melbourne, 1 January 2020)");
  });

  it("uses an unquoted description for an untitled piece per AGLC4 ex 92 (rule 7.11.4)", () => {
    // Rose Healy, Letter to the Editor, The Herald Sun (Melbourne,
    // 10 June 2002) 16.
    const runs = formatNewspaper({
      authors: [{ givenNames: "Rose", surname: "Healy" }],
      title: "Letter to the Editor",
      titleIsDescription: true,
      newspaper: "The Herald Sun",
      place: "Melbourne",
      date: "10 June 2002",
      page: "16",
    });
    const text = toPlainText(runs);
    expect(text).toBe(
      "Rose Healy, Letter to the Editor, The Herald Sun (Melbourne, 10 June 2002) 16"
    );
    expect(text).not.toContain("\u2018");
  });
});

// \u2500\u2500\u2500 Rule 7.13 \u2014 Interviews \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe("Rule 7.13 \u2014 Interviews and similar formats", () => {
  it("swaps 'Interview' for the actual format per AGLC4 ex 96 (rule 7.13)", () => {
    // Conversation with Chief Justice John G Roberts Jr, Chief Justice of
    // the Supreme Court of the United States (Carolyn Evans, Melbourne Law
    // School, The University of Melbourne, 20 July 2017).
    const runs = formatInterview({
      interviewType: "Conversation",
      interviewee:
        "Chief Justice John G Roberts Jr, Chief Justice of the Supreme Court of the United States",
      interviewer: "Carolyn Evans",
      location: "Melbourne Law School, The University of Melbourne",
      date: "20 July 2017",
    });
    expect(toPlainText(runs)).toBe(
      "Conversation with Chief Justice John G Roberts Jr, Chief Justice of the Supreme Court of the United States (Carolyn Evans, Melbourne Law School, The University of Melbourne, 20 July 2017)"
    );
  });
});

// \u2500\u2500\u2500 Rules 7.14.1\u20137.14.2 \u2014 Films \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe("Rules 7.14.1\u20137.14.2 \u2014 Films and audiovisual recordings", () => {
  it("cites the production company with a time pinpoint per AGLC4 ex 100 (rule 7.14.2)", () => {
    // The Dark Knight (Warner Brothers Pictures, 2008) 0:54:58\u20130:55:11.
    // [Not: \u2026 (Theatrical Version, Warner Brothers \u2026]
    const runs = formatFilm({
      title: "The Dark Knight",
      productionCompany: "Warner Brothers Pictures",
      year: "2008",
      timePinpoint: "0:54:58\u20130:55:11",
    });
    const text = toPlainText(runs);
    expect(text).toBe(
      "The Dark Knight (Warner Brothers Pictures, 2008) 0:54:58\u20130:55:11"
    );
    expect(text).not.toContain("Directed by");
    expectItalic(runs, "The Dark Knight");
  });

  it("includes version details for a non-standard version per AGLC4 ex 99 (rule 7.14.2)", () => {
    // Donnie Darko (Director's Cut, Newmarket Films, 2004).
    const runs = formatFilm({
      title: "Donnie Darko",
      versionDetails: "Director's Cut",
      productionCompany: "Newmarket Films",
      year: "2004",
    });
    expect(toPlainText(runs)).toBe(
      "Donnie Darko (Director's Cut, Newmarket Films, 2004)"
    );
  });
});

// \u2500\u2500\u2500 Rule 7.14.3 \u2014 Television Series \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe("Rule 7.14.3 \u2014 Television series", () => {
  it("formats an episode with time pinpoint and URL per AGLC4 ex 101 (rule 7.14.3)", () => {
    // 'The Paradise Papers', Four Corners (Australian Broadcasting
    // Corporation, 2017) 0:40:00\u20130:45:00 <URL>.
    const runs = formatTvSeries({
      episodeTitle: "The Paradise Papers",
      seriesTitle: "Four Corners",
      network: "Australian Broadcasting Corporation",
      date: "2017",
      timePinpoint: "0:40:00\u20130:45:00",
      url: "http://www.abc.net.au/4corners/the-paradise-papers/9124930",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018The Paradise Papers\u2019, Four Corners (Australian Broadcasting Corporation, 2017) 0:40:00\u20130:45:00 <http://www.abc.net.au/4corners/the-paradise-papers/9124930>"
    );
    expectItalic(runs, "Four Corners");
  });

  it("identifies an untitled episode in the episode-title slot per AGLC4 ex 103 (rule 7.14.3)", () => {
    // 'Season 9, Episode 10', Gruen (Australian Broadcasting Corporation, 2017).
    const runs = formatTvSeries({
      seriesTitle: "Gruen",
      seasonNumber: "9",
      episodeNumber: "10",
      network: "Australian Broadcasting Corporation",
      date: "2017",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018Season 9, Episode 10\u2019, Gruen (Australian Broadcasting Corporation, 2017)"
    );
  });

  it("cites a series as a whole with no episode element per AGLC4 ex 105 (rule 7.14.3)", () => {
    // The West Wing (John Wells Productions, 1999).
    const runs = formatTvSeries({
      seriesTitle: "The West Wing",
      network: "John Wells Productions",
      date: "1999",
    });
    const text = toPlainText(runs);
    expect(text).toBe("The West Wing (John Wells Productions, 1999)");
    // No dangling ', )' when elements are missing
    expect(text).not.toContain(", )");
  });
});

// \u2500\u2500\u2500 Rule 7.14.4 \u2014 Radio Segments and Podcasts \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

describe("Rule 7.14.4 \u2014 Radio segments and podcasts", () => {
  it("formats a podcast episode per AGLC4 ex 106 (rule 7.14.4)", () => {
    // 'S02 Episode 07: Hindsight, Part 1', Serial (This American Life,
    // 18 February 2016).
    const runs = formatPodcast({
      episodeTitle: "S02 Episode 07: Hindsight, Part 1",
      seriesTitle: "Serial",
      producer: "This American Life",
      date: "18 February 2016",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018S02 Episode 07: Hindsight, Part 1\u2019, Serial (This American Life, 18 February 2016)"
    );
    expectItalic(runs, "Serial");
  });

  it("appends the URL per AGLC4 ex 108 (rules 7.14.4, 4.4)", () => {
    // 'Dan Drezner on "The Ideas Industry"', The Lawfare Podcast (Lawfare
    // Institute, 17 June 2017) <https://lawfareblog.com/lawfare-podcast-ideas-industry>.
    const runs = formatPodcast({
      episodeTitle: "Dan Drezner on \u201cThe Ideas Industry\u201d",
      seriesTitle: "The Lawfare Podcast",
      producer: "Lawfare Institute",
      date: "17 June 2017",
      url: "https://lawfareblog.com/lawfare-podcast-ideas-industry",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018Dan Drezner on \u201cThe Ideas Industry\u201d\u2019, The Lawfare Podcast (Lawfare Institute, 17 June 2017) <https://lawfareblog.com/lawfare-podcast-ideas-industry>"
    );
  });

  it("formats a time pinpoint per AGLC4 ex 109 (rule 7.14.4)", () => {
    // 'What Could Tomorrow Look Like?', The Lawyers Weekly Show (Lawyers
    // Weekly, 2 February 2018) 00:06:20.
    const runs = formatPodcast({
      episodeTitle: "What Could Tomorrow Look Like?",
      seriesTitle: "The Lawyers Weekly Show",
      producer: "Lawyers Weekly",
      date: "2 February 2018",
      timePinpoint: "00:06:20",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018What Could Tomorrow Look Like?\u2019, The Lawyers Weekly Show (Lawyers Weekly, 2 February 2018) 00:06:20"
    );
  });

  it("omits the producer where identical to the series title (rule 7.14.4)", () => {
    const runs = formatPodcast({
      episodeTitle: "Test Episode",
      seriesTitle: "Test Podcast",
      producer: "Test Podcast",
      date: "1 January 2020",
    });
    expect(toPlainText(runs)).toBe(
      "\u2018Test Episode\u2019, Test Podcast (1 January 2020)"
    );
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
  it("uses '(Web Page)' alone where the page shows no date per AGLC4 ex 112 (rule 7.15)", () => {
    const data: InternetMaterialData = {
      title: "James Edelman",
      website: "High Court of Australia",
      documentType: "Web Page",
      date: "",
      url: "http://www.hcourt.gov.au/justices/current/justice-james-edelman",
    };
    const runs = formatInternetMaterial(data);
    const text = toPlainText(runs);

    // No author prefix — starts with quoted title
    expect(text).toBe(
      "\u2018James Edelman\u2019, High Court of Australia (Web Page) <http://www.hcourt.gov.au/justices/current/justice-james-edelman>"
    );
    // Website title italic
    expectItalic(runs, "High Court of Australia");
  });

  /*
   * AGLC4 Example 113:
   * Martin Clark, 'Koani v The Queen', Opinions on High (Blog Post, 18
   * October 2017) <URL>.
   */
  it("formats the document type and date parenthetical per AGLC4 ex 113 (rule 7.15)", () => {
    const data: InternetMaterialData = {
      authors: [{ givenNames: "Martin", surname: "Clark" }],
      title: "Koani v The Queen",
      website: "Opinions on High",
      documentType: "Blog Post",
      date: "18 October 2017",
      url: "http://blogs.unimelb.edu.au/opinionsonhigh/2017/10/18/koani-case-page/",
    };
    const runs = formatInternetMaterial(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Martin Clark, \u2018Koani v The Queen\u2019, Opinions on High (Blog Post, 18 October 2017) <http://blogs.unimelb.edu.au/opinionsonhigh/2017/10/18/koani-case-page/>"
    );
    expectItalic(runs, "Opinions on High");
  });

  it("omits the author where identical to the web page title (rule 7.15)", () => {
    const data: InternetMaterialData = {
      authors: [{ givenNames: "", surname: "High Court of Australia" }],
      title: "James Edelman",
      website: "High Court of Australia",
      documentType: "Web Page",
      date: "",
      url: "http://www.hcourt.gov.au/justices/current/justice-james-edelman",
    };
    const text = toPlainText(formatInternetMaterial(data));
    expect(text).toMatch(/^\u2018James Edelman\u2019/);
  });
});

// ─── Rule 7.16 — Social Media ──────────────────────────────────────────────────

describe("Rule 7.16 — Social Media", () => {
  /*
   * AGLC4 Example 114:
   * Brooking Creative Labs, 'Is America Dreaming?: Understanding Social
   * Mobility' (YouTube, 20 July 2015) 00:00:00–00:01:00 <URL>.
   */
  it("formats a video with time pinpoint per AGLC4 ex 114 (rule 7.16)", () => {
    const data: SocialMediaData = {
      author: "Brooking Creative Labs",
      title: "Is America Dreaming?: Understanding Social Mobility",
      platform: "YouTube",
      date: "20 July 2015",
      timePinpoint: "00:00:00\u201300:01:00",
      url: "https://www.youtube.com/watch?v=vG6-UaBECN4",
    };
    const runs = formatSocialMedia(data);
    const text = toPlainText(runs);

    expect(text).toBe(
      "Brooking Creative Labs, \u2018Is America Dreaming?: Understanding Social Mobility\u2019 (YouTube, 20 July 2015) 00:00:00\u201300:01:00 <https://www.youtube.com/watch?v=vG6-UaBECN4>"
    );
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
