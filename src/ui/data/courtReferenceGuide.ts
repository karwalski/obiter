/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

/**
 * COURT-GUIDE-001: Court Mode Reference Panel
 *
 * Court-specific reference content organised by jurisdiction. When court
 * mode is active, the reference guide panel switches from the AGLC4 rule
 * entries to this content, which summarises citation requirements, LOA
 * format requirements, and filing deadlines drawn from each court's
 * practice directions.
 *
 * Stored as typed data so content can be updated without code changes
 * when practice directions are revised.
 */

export interface CourtGuideEntry {
  /** Jurisdiction key matching COURT-002 preset IDs. */
  jurisdiction: string;
  /** Full court name. */
  courtName: string;
  /** Grouping label for the UI (Federal, NSW, Victoria, etc.). */
  group: string;
  /** Practice direction name, number, and date. */
  practiceDirection: {
    name: string;
    number: string;
    date: string;
  };
  /** Summary of citation requirements from the practice direction. */
  citationRequirements: string[];
  /** LOA format requirements. */
  loaRequirements: string[];
  /** Filing deadlines and procedures. */
  filingProcedures: string[];
}

/**
 * Court reference guide entries, ordered by hierarchy.
 *
 * Source: Practice directions cited in COURT-003 and the court mode
 * backlog research. Each entry corresponds to a jurisdictional preset
 * from COURT-002.
 */
export const COURT_GUIDE_ENTRIES: CourtGuideEntry[] = [
  // ── Federal ────────────────────────────────────────────────────────────────
  {
    jurisdiction: "HCA",
    courtName: "High Court of Australia",
    group: "Federal",
    practiceDirection: {
      name: "HCA Practice Direction No 2 of 2024",
      number: "PD 2/2024",
      date: "20 December 2024",
    },
    citationRequirements: [
      // COURT-111: PD 2 of 2024 and Form 27A are silent on parallel citation
      // (register O-R4); the value is unchanged pending open question Q3.
      "Not specified by the Court: Obiter gives the authorised report first, then the MNC (e.g. (2009) 238 CLR 1; [2009] HCA 23). The Court's instruments do not address parallel citation.",
      "CLR is the preferred report series. Cite CLR over ALJR or ALR where available.",
      "Pinpoint style is para-and-page: starting page from authorised report, then paragraph from MNC.",
      "Ibid and (n X) cross-references are not used in court submissions.",
    ],
    loaRequirements: [
      "Joint Book of Authorities (JBA) in five parts: Part A principal legislation (the whole Act unless voluminous); Part B other legislation (extracts, alphabetical, grouped Commonwealth, then States and Territories, then overseas); Part C cases reported in the CLR (alphabetical); Part D cases from other report series; Part E other materials.",
      "The JBA contains only cases counsel will take the Court to.",
      "Counsel's certificate is the first document in the book.",
      "Full index cross-referenced to the paragraphs of the parties' submissions.",
      "Volumes must not exceed 500 pages.",
      "JBA includes a title page with case name and HCA file number.",
    ],
    filingProcedures: [
      "JBA due within 14 days of filing of reply submissions.",
      "Filed via the High Court Registry.",
      "Written submissions must conform to Part 44 of the High Court Rules 2004.",
    ],
  },
  {
    jurisdiction: "FCA",
    courtName: "Federal Court of Australia",
    group: "Federal",
    practiceDirection: {
      name: "GPN-AUTH — Lists of Authorities and Citations Practice Note",
      number: "GPN-AUTH",
      date: "Reissued 7 May 2025",
    },
    citationRequirements: [
      // CRIT-004 (2026-07-22): corrected against the signed GPN-AUTH (7 May 2025).
      // GPN-AUTH has no "not reasonably obtainable" clause; the relevant rule is
      // cl 2.4 (MNC where available; authorised report 'if possible'; MNC
      // paragraph pinpoints expressly sufficient). Parallel-citation rule is
      // cl 2.4(b); cl 2.6 is the paragraph-over-page pinpoint preference.
      "Cite the medium neutral citation where available; add the authorised report citation if possible (cl 2.4(b)).",
      // COURT-111: DECISION-043 item 3 (register FCA-1, O-R2).
      "Order: MNC first, then the authorised report, as in the cl 2.5 example: D'Arcy v Myriad Genetics Inc [2014] FCAFC 115; (2014) 224 FCR 479. Applies to new documents; existing documents keep their setting until updated.",
      "MNC paragraph pinpoints are expressly sufficient in lieu of report page references (cl 2.4).",
      "Preferred report hierarchy: FCR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Pinpoints follow 'at', eg 'at [29]' or 'at 481' (cl 2.6). Applies to new documents; existing documents keep their setting.",
      "Ibid and (n X) cross-references are not used.",
      "Point-in-time date should be specified for legislation where relevant.",
    ],
    loaRequirements: [
      // COURT-111: the 7 May 2025 reissue removed the Part A / Part B list
      // (register O-R1); GPN-eBOOKS cl 7.2 splits the eBook (FCA-2).
      "GPN-AUTH (reissued 7 May 2025) no longer divides the list into Part A and Part B. Obiter produces a simple list for new documents.",
      "The eBook of authorities is in three sections, each alphabetical: authorities; legislation; bills and explanatory material (GPN-eBOOKS cl 7.2).",
      "LOA must be filed as a text-searchable (OCR) PDF via eLodgment.",
    ],
    filingProcedures: [
      "Applicant LOA due 5 business days before hearing by 4:30 pm.",
      "Respondent LOA due 4 business days before hearing by 4:30 pm.",
      "Consolidated list and eBook of authorities due 2 business days before hearing.",
      "Filed via Federal Court eLodgment.",
      "Submissions should not exceed 10 pages (5 pages for reply) per FCA Practice Note APP 2.",
    ],
  },
  {
    jurisdiction: "FCFCOA",
    courtName: "Federal Circuit and Family Court of Australia",
    group: "Federal",
    practiceDirection: {
      name: "FAM-APPEALS — Appeals",
      number: "FAM-APPEALS",
      date: "Updated 10 June 2025",
    },
    citationRequirements: [
      "Cite the report where the case is reported; the MNC is cited only for an unreported judgment, with paragraph pinpoints (cl 5.8). No parallel citation.",
      // COURT-111: FamCAFC is a medium neutral identifier, not a report series.
      "Preferred report hierarchy: FLC, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Appeals LOA in two parts: Part 1 for authorities cited in argument; Part 2 for authorities that may possibly be referred to but will not be cited.",
    ],
    filingProcedures: [
      "LOA filed with the summary of argument at least 28 days before the first day of the appeal sittings.",
      "Submissions limited to 15 pages, minimum 12 point font, 1.5 line spacing.",
      "Filed via the Commonwealth Courts Portal.",
    ],
  },

  // ── New South Wales ────────────────────────────────────────────────────────
  {
    jurisdiction: "NSWCA",
    courtName: "NSW Court of Appeal",
    group: "New South Wales",
    practiceDirection: {
      name: "SC Gen 20 — Citation of Authority",
      number: "SC Gen 20",
      date: "October 2023",
    },
    citationRequirements: [
      // CRIT-004 §4 sign-off (2026-07-23): SC Gen 20 states the authorised
      // report "should, as far as possible, also be noted" — a best-efforts
      // obligation, not a strict mandate. Softened from "mandatory".
      "Parallel citations are preferred: the authorised report should, as far as possible, also be noted (SC Gen 20).",
      "Preferred report hierarchy: NSWLR, then CLR, then ALR.",
      "Pinpoint style is para-only: paragraph numbers are sufficient and appropriate.",
      "Unreported judgments: citation restricted to cases containing a material statement of legal principle not found in reported authority.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      // CRIT-004 §4 sign-off: the Part A/B List of Authorities derives from
      // the Court of Appeal note SC CA 1, not SC Gen 20.
      "Part A / Part B LOA required (SC CA 1).",
      "Key authority marker available (up to 5 cases marked with asterisk).",
      "Secondary sources requiring hardcopy lodgement should be separately identified.",
    ],
    filingProcedures: [
      "LOA emailed to President's Researcher by 10:00 am, two business days before the hearing.",
      "Hardcopy LOA to authorities box at Level 12, Law Courts Building, by 10:00 am, one business day before the hearing.",
      "Per PN CA 1 (reissued May 2023).",
    ],
  },
  {
    // COURT-119: register NSW-1 and NSW-3 (SC CCA 1, 22 July 2021).
    jurisdiction: "NSWCCA",
    courtName: "NSW Court of Criminal Appeal",
    group: "New South Wales",
    practiceDirection: {
      name: "SC CCA 1 — Court of Criminal Appeal: General, with SC Gen 20 — Citation of Authority",
      number: "SC CCA 1",
      date: "22 July 2021",
    },
    citationRequirements: [
      "Parallel citations are preferred: the authorised report should, as far as possible, also be noted (SC Gen 20).",
      "Preferred report hierarchy: NSWLR, then CLR, then ALR.",
      "Pinpoint style is para-only: paragraph numbers are sufficient and appropriate (SC Gen 20).",
      "An authority published on Caselaw with a medium neutral citation is not considered to be a reported judgment (SC CCA 1 cl 28).",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "A single list containing only the authorities the Court is expected to be referred to in oral argument; authorities cited in submissions but unlikely to be referred to orally are left out (cl 27).",
      "Attach a copy of any unreported judgment to be referred to (cl 28).",
    ],
    filingProcedures: [
      "Email the list and unreported judgments to the Registry by 10.00 am on the working day before the hearing; no hard copy is needed if emailed (cl 29).",
    ],
  },
  {
    jurisdiction: "NSWSC",
    courtName: "NSW Supreme Court",
    group: "New South Wales",
    practiceDirection: {
      name: "SC Gen 20 — Citation of Authority",
      number: "SC Gen 20",
      date: "October 2023",
    },
    citationRequirements: [
      // CRIT-004 §4 sign-off (2026-07-23): softened from "mandatory" to match
      // SC Gen 20's "should, as far as possible" wording.
      "Parallel citations are preferred: the authorised report should, as far as possible, also be noted (SC Gen 20).",
      "Preferred report hierarchy: NSWLR, then CLR, then ALR.",
      "Pinpoint style is para-only.",
      "Unreported judgments: citation restricted to cases containing a material statement of legal principle not found in reported authority.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Simple List of Authorities.",
      "Cases listed alphabetically with authorised report and MNC.",
    ],
    filingProcedures: ["LOA filed with written submissions via the NSW Online Registry."],
  },
  {
    // COURT-114: key unified with the preset id (was "NSW_DIST_LOCAL").
    // COURT-119: no citation instrument found (register NSW-4, O-R18).
    jurisdiction: "NSW_DISTRICT_LOCAL",
    courtName: "NSW District / Local Court",
    group: "New South Wales",
    practiceDirection: {
      name: "No instrument found; AGLC4 fallback",
      number: "None found",
      date: "Indexes checked 6 October 2026",
    },
    citationRequirements: [
      "No District or Local Court citation practice note was found. Obiter falls back to AGLC4, with the court-mode values of the NSW Supreme Court profile.",
      "Parallel citations are preferred (not mandatory).",
      "Preferred report hierarchy: NSWLR, then CLR, then ALR.",
      "Pinpoint style is para-only.",
      "Unreported judgment gate applies.",
    ],
    loaRequirements: ["LOA not typically required for District or Local Court appearances."],
    filingProcedures: ["Authorities may be provided as a bundle to the bench on the hearing day."],
  },

  // ── Victoria ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "VSCA",
    courtName: "Victorian Court of Appeal",
    group: "Victoria",
    practiceDirection: {
      name: "SC CA 3 (reissued 10 March 2026) with SC Gen 3 (reissued 1 December 2025)",
      number: "SC CA 3",
      date: "10 March 2026",
    },
    citationRequirements: [
      "AGLC compliance is mandatory: authorities must be referenced in accordance with the current edition of the AGLC (SC CA 3).",
      "Citation of the authorised report is mandatory where one exists.",
      // COURT-111: register VIC-1, VIC-2, O-R5.
      "No parallel citation: the report is cited instead of the unreported version, and the MNC only for an unreported judgment (SC Gen 3 cl 5.2; SC CA 3 cl 14.4).",
      "Pinpoints are mandatory for every authority.",
      "Reported versions must be cited over unreported; authorised over unauthorised (SC Gen 3).",
      "Pinpoint style is para-and-page: paragraph and, if reported, commencing page, e.g. (2023) 72 VR 394, 410 [60].",
      "Preferred report hierarchy: VR, then CLR, then ALR.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Civil appeal LOA in three parts: Part A authorities to be read from at the hearing; Part B authorities to be referred to but not read from; Part C textbooks, articles and extrinsic materials.",
      "The word None must be stated under any unused part.",
    ],
    filingProcedures: ["LOA filed via the Supreme Court of Victoria eFiling system."],
  },
  {
    jurisdiction: "VSC",
    courtName: "Victorian Supreme Court",
    group: "Victoria",
    practiceDirection: {
      name: "SC Gen 3 — Citation of Authorities and Legislation",
      number: "SC Gen 3",
      date: "Reissued 1 December 2025",
    },
    citationRequirements: [
      "The Court uses the AGLC as the basis of its citation practice; parties are invited to follow it.",
      "Authorised reports must be cited over unauthorised; reported must be cited over unreported.",
      // COURT-111: register VIC-1, O-R5.
      "No parallel citation: the report is cited instead of the unreported version, and the MNC only for an unreported judgment (cl 5.2).",
      "Pinpoint style is para-and-page: paragraph and, if reported, commencing page, e.g. (2023) 72 VR 394, 410 [60].",
      "Preferred report hierarchy: VR, then CLR, then ALR.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: ["Simple List of Authorities."],
    filingProcedures: ["LOA filed via the Supreme Court of Victoria eFiling system."],
  },
  {
    jurisdiction: "VIC_COUNTY_MAG",
    courtName: "Victorian County / Magistrates' Court",
    group: "Victoria",
    practiceDirection: {
      name: "SC Gen 3 (applied by convention)",
      number: "SC Gen 3",
      date: "Reissued 1 December 2025",
    },
    citationRequirements: [
      "Parallel citations are preferred (not mandatory).",
      "Preferred report hierarchy: VR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
    ],
    loaRequirements: ["LOA not typically required for County or Magistrates' Court appearances."],
    filingProcedures: ["Authorities may be provided as a bundle to the bench on the hearing day."],
  },

  // ── Queensland ─────────────────────────────────────────────────────────────
  {
    jurisdiction: "QCA",
    courtName: "Queensland Court of Appeal",
    group: "Queensland",
    practiceDirection: {
      name: "PD 1/2024 — Citation of Authority",
      number: "PD 1/2024",
      date: "2024",
    },
    citationRequirements: [
      // CRIT-004 §4 sign-off (2026-07-23): PD 1 of 2024 relaxed parallel
      // citation to "should, as far as possible" (access-to-justice), not a
      // strict mandate. Softened from "mandatory".
      "Parallel citations are preferred: the authorised report should, as far as possible, also be cited (PD 1/2024).",
      "Preferred report hierarchy: Qd R, then CLR, then ALR.",
      "Pinpoint style is para-only (cl 4(b)).",
      "Unreported judgment gate: citation restricted to cases containing a material statement of legal principle (cl 4(d)).",
      "Subsequent treatment of cited authorities must be disclosed (cl 4(c)). Parties must confirm whether cited cases have been doubted or not followed.",
      "Selectivity duty: limit citation to authorities necessary to establish principles. Do not cite authorities that merely rephrase, illustrate, or apply principles established in other cited authorities (cl 5).",
    ],
    loaRequirements: [
      "Part A / Part B LOA required for Court of Appeal matters.",
      "LOA entries include subsequent-treatment notes where applicable.",
    ],
    filingProcedures: ["LOA filed via the Queensland Courts eFiling system."],
  },
  {
    jurisdiction: "QSC",
    courtName: "Queensland Supreme Court",
    group: "Queensland",
    practiceDirection: {
      name: "PD 1/2024 — Citation of Authority",
      number: "PD 1/2024",
      date: "2024",
    },
    citationRequirements: [
      // CRIT-004 §4 sign-off (2026-07-23): softened from "mandatory" to match
      // PD 1/2024's "should, as far as possible" wording.
      "Parallel citations are preferred: the authorised report should, as far as possible, also be cited (PD 1/2024).",
      "Preferred report hierarchy: Qd R, then CLR, then ALR.",
      "Pinpoint style is para-only.",
      "Unreported judgment gate applies (cl 4(d)).",
      "Subsequent treatment disclosure required (cl 4(c)).",
      "Selectivity duty applies (cl 5).",
    ],
    loaRequirements: ["Simple List of Authorities."],
    filingProcedures: ["LOA filed via the Queensland Courts eFiling system."],
  },
  {
    // COURT-114: key unified with the preset id (was "QLD_DIST_MAG").
    jurisdiction: "QLD_DISTRICT_MAG",
    courtName: "Queensland District / Magistrates Court",
    group: "Queensland",
    practiceDirection: {
      name: "PD 7/2024 — Citation of Authority (Magistrates Courts)",
      number: "PD 7/2024",
      date: "7 June 2024",
    },
    citationRequirements: [
      // COURT-119: register O-R18.
      "District Court: no citation practice direction was found; AGLC4 fallback, with the Magistrates Courts values.",
      // COURT-111: register QLD-3, O-R11.
      "Parallel citations are preferred: the authorised report should, as far as possible, also be cited (PD 7/2024 cl 3).",
      "Preferred report hierarchy: Qd R, then CLR, then ALR.",
      "Pinpoint style is para-only.",
      "Unreported judgment gate applies.",
      "Subsequent treatment disclosure required.",
    ],
    loaRequirements: ["Simple List of Authorities."],
    filingProcedures: ["LOA filed with written submissions."],
  },

  // ── Western Australia ──────────────────────────────────────────────────────
  {
    jurisdiction: "WASC",
    courtName: "WA Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "Consolidated Practice Directions — PD 2.1 (Outlines and Lists of Authorities) and PD 8.2.2 (Medium Neutral Citation)",
      number: "PD 2.1; PD 8.2.2",
      date: "Updated 23 September 2026",
    },
    citationRequirements: [
      "Parallel citation is required when a case is reported (PD 8.2.2).",
      "Citation order is MNC first, then the report: Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15].",
      "Preferred report hierarchy: WAR, then CLR, then ALR.",
      // COURT-119: register WA-1, O-R19.
      "Sentencing remarks have their own identifier: [2011] WASCSR 1 (PD 8.2.2).",
      "Pinpoint style is para-and-page.",
      // COURT-113: register WA-1, O-R9.
      "Later references give the case name only, unless case names are duplicated or popular (PD 2.1 cl 14). Obiter keeps the short title for a case whose name another cited case shares.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "The list contains all and only the authorities cited in the written outline (PD 2.1).",
      "Cases from which passages will be read are marked with an asterisk, together with the pages or paragraphs to be read; otherwise an express statement that no cases will be read from.",
      "Mark authorities to be read using the key authority marker; they render with an asterisk prefix.",
    ],
    filingProcedures: [
      "LOA filed via the WA eLodgment system.",
      "Page limits for written outlines: 5 pages interlocutory, 10 pages trial, 20 pages Court of Appeal (PD 2.1).",
    ],
  },

  // ── South Australia ────────────────────────────────────────────────────────
  {
    jurisdiction: "SASC",
    courtName: "SA Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "Uniform Civil Rules 2020 r 217.8 — Lists of Authorities",
      number: "UCR r 217.8",
      date: "Current to 15 March 2026",
    },
    citationRequirements: [
      "Citation hierarchy: authorised report, then other published report, then MNC (for decisions after 1997).",
      // COURT-111: register SA-1, O-R7.
      "Parallel citations are required: the highest authorised report and, for a decision after 1997 available online, the MNC must both be given (r 217.8(3); r 101.8(4)).",
      "Preferred report hierarchy: SASR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Appeals LOA in two parts (Form 91): authorities expected to be read, and authorities not expected to be read.",
      "Electronic lists should hyperlink authorities to a free full-text source (for example AustLII) where available.",
    ],
    filingProcedures: ["LOA filed with written submissions per Form 91."],
  },
  {
    // COURT-119: the Uniform Civil Rules apply across the SA civil courts
    // (register SA-1, O-R7).
    jurisdiction: "SA_DISTRICT_MAG_CIVIL",
    courtName: "SA District / Magistrates Court (civil)",
    group: "Other States/Territories",
    practiceDirection: {
      name: "Uniform Civil Rules 2020 rr 101.8, 217.8",
      number: "UCR r 101.8",
      date: "Current to 15 March 2026",
    },
    citationRequirements: [
      "The Uniform Civil Rules apply to the civil jurisdictions of the District and Magistrates Courts as well as the Supreme Court.",
      "Parallel citations are required: the highest authorised report and, for a decision after 1997 available online, the MNC must both be given (r 101.8(4)).",
      "Preferred report hierarchy: SASR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Appeal lists of authorities in two parts (Form 91): authorities expected to be read, and authorities not expected to be read.",
    ],
    filingProcedures: ["Lists filed with written submissions per Form 91."],
  },

  // ── Tasmania ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "TASSC",
    courtName: "Tasmanian Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "PD 3 of 2022 — Appeal Books, Lists of Authorities and Written Submissions; PD 3 of 2014 — Citation of Judgments",
      number: "PD 3/2022; PD 3/2014",
      date: "24 August 2022; 21 February 2014",
    },
    citationRequirements: [
      "Citation practice remains governed by PD 3 of 2014.",
      "Parallel citations are preferred: where an MNC is given, the authorised citation must be given too (PD 3 of 2014 cl 3).",
      // COURT-111: register TAS-1, O-R8; DECISION-043 item 3.
      "Order: MNC first, then the authorised report, as in the cl 3(a) example: Jackson v Building Appeal Board [2010] TASSC 29; (2010) 20 Tas R 1. Applies to new documents; existing documents keep their setting until updated.",
      // COURT-119: register TAS-1, O-R8.
      "Cite any later judgment that has doubted, or not followed, a cited case (PD 3 of 2014 cl 3(f)).",
      "Preferred report hierarchy: Tas R, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Pinpoints follow 'at', eg 'Smith v Brown [1997] TASSC 161 at [15]' (PD 3 of 2014 cl 3). Applies to new documents; existing documents keep their setting.",
      "Unreported judgment gate: may apply for unreported decisions (convention from PD 3/2014).",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "LOA in three parts (PD 3 of 2022): Part 1 authorities counsel intends to cite, with pinpoints; Part 2 authorities that might be referred to but not cited; Part 3 legislation, with the sections relied on.",
    ],
    filingProcedures: ["LOA lodged at least 48 hours before the hearing (PD 3 of 2022)."],
  },

  // ── Australian Capital Territory ───────────────────────────────────────────
  {
    jurisdiction: "ACTSC",
    courtName: "ACT Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "PD 2 of 2022 — Citation of Authority",
      number: "PD 2/2022",
      date: "26 May 2022",
    },
    citationRequirements: [
      "The authorised report citation should be used where one exists (PD 2 of 2022).",
      // COURT-111: register ACT-1, O-R10.
      "No parallel citation: PD 2 of 2022 does not mention the MNC, so the report is cited alone.",
      "No express dispensation for MNC paragraph pinpoints: PD 2 of 2022 is stricter than the federal practice notes.",
      "Where copies of authorities are provided, provide the version of the report cited.",
      "Preferred report hierarchy: ACTLR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: ["Simple List of Authorities."],
    filingProcedures: ["LOA filed with written submissions via the ACT Courts Portal."],
  },

  // ── Northern Territory ─────────────────────────────────────────────────────
  {
    jurisdiction: "NTSC",
    courtName: "NT Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "PD 1 of 2025 — Lists of Authorities and Summaries of Submissions; PD 2 of 2007 — Citation of Authorities",
      number: "PD 1/2025; PD 2/2007",
      date: "1 January 2025; 25 May 2007",
    },
    citationRequirements: [
      "Citation of authorities is governed by PD 2 of 2007: the authorised report is to be cited, then an unauthorised report, then a copy of the judgment.",
      // COURT-111: register NT-1, O-R10.
      "No parallel citation: PD 2 of 2007 does not mention the MNC, so the report is cited alone.",
      "Preferred report hierarchy: NTLR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "A list of authorities is required whenever authorities are relied on (PD 1 of 2025, replacing PD 4 of 2016).",
    ],
    filingProcedures: [
      "Single judge: list lodged at least 24 hours before the hearing.",
      "Full Court: list lodged 28 days before the hearing.",
    ],
  },

  // ── Tribunals ──────────────────────────────────────────────────────────────
  {
    jurisdiction: "ART",
    courtName: "Administrative Review Tribunal",
    group: "Tribunals",
    practiceDirection: {
      name: "ART Practice Directions",
      number: "Various",
      date: "Current",
    },
    citationRequirements: [
      "Parallel citations are not required (MNC only is typical).",
      "Pinpoint style is para-only.",
      "Ibid and (n X) cross-references are not used.",
      "Citation formality is less prescriptive than superior courts.",
    ],
    loaRequirements: ["LOA not typically required."],
    filingProcedures: ["Documents filed via the ART portal at art.gov.au."],
  },
  {
    jurisdiction: "FWC",
    courtName: "Fair Work Commission",
    group: "Tribunals",
    practiceDirection: {
      name: "FWC Practice Notes",
      number: "Various",
      date: "Current",
    },
    citationRequirements: [
      "Parallel citations are not required (MNC only is typical).",
      "Pinpoint style is para-only.",
      "Ibid and (n X) cross-references are not used.",
      "Citation formality is less prescriptive than superior courts.",
    ],
    loaRequirements: ["LOA not typically required."],
    filingProcedures: ["Documents filed via the FWC portal at fwc.gov.au."],
  },
  {
    jurisdiction: "STATE_TRIBUNAL",
    courtName: "State/Territory Tribunal (NCAT/VCAT/QCAT/SAT/other)",
    group: "Tribunals",
    practiceDirection: {
      name: "Varies by tribunal",
      number: "Various",
      date: "Current",
    },
    citationRequirements: [
      "Parallel citations are not required (MNC only is typical).",
      "Pinpoint style is para-only.",
      "Ibid and (n X) cross-references are not used.",
      "Citation formality varies by tribunal; consult the specific tribunal's practice directions.",
    ],
    loaRequirements: ["LOA not typically required for most tribunal proceedings."],
    filingProcedures: [
      "Filing procedures vary by tribunal. Check the relevant tribunal's website.",
    ],
  },
];

/**
 * Retrieve court guide entries for a specific jurisdiction.
 * Returns an empty array when no entries are registered.
 */
export function getCourtGuideForJurisdiction(jurisdictionId: string): CourtGuideEntry[] {
  return COURT_GUIDE_ENTRIES.filter((entry) => entry.jurisdiction === jurisdictionId);
}

/**
 * Retrieve all court guide entries, optionally filtered by group.
 */
export function getCourtGuideByGroup(group?: string): CourtGuideEntry[] {
  if (!group) return COURT_GUIDE_ENTRIES;
  return COURT_GUIDE_ENTRIES.filter((entry) => entry.group === group);
}

/**
 * Search court guide entries by query string across court names,
 * practice direction names, citation requirements, LOA requirements,
 * and filing procedures.
 */
export function searchCourtGuide(query: string): CourtGuideEntry[] {
  if (query.trim() === "") return COURT_GUIDE_ENTRIES;
  const q = query.toLowerCase();
  return COURT_GUIDE_ENTRIES.filter(
    (entry) =>
      entry.courtName.toLowerCase().includes(q) ||
      entry.jurisdiction.toLowerCase().includes(q) ||
      entry.group.toLowerCase().includes(q) ||
      entry.practiceDirection.name.toLowerCase().includes(q) ||
      entry.citationRequirements.some((r) => r.toLowerCase().includes(q)) ||
      entry.loaRequirements.some((r) => r.toLowerCase().includes(q)) ||
      entry.filingProcedures.some((r) => r.toLowerCase().includes(q))
  );
}

/** All distinct group labels in display order. */
export const COURT_GUIDE_GROUPS: string[] = [
  "Federal",
  "New South Wales",
  "Victoria",
  "Queensland",
  "Other States/Territories",
  "Tribunals",
];
