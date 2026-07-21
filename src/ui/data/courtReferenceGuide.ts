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
      date: "2024",
    },
    citationRequirements: [
      "Parallel citations are mandatory: authorised report first, then MNC (e.g. (2009) 238 CLR 1; [2009] HCA 23).",
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
      name: "GPN-AUTH — Citation of Authorities and Provision of Lists of Authorities",
      number: "GPN-AUTH",
      date: "Reissued 7 May 2025",
    },
    citationRequirements: [
      "Cite both the authorised report and the MNC where both are reasonably obtainable.",
      "The authorised citation need not be given when it is not reasonably obtainable (GPN-AUTH, 7 May 2025).",
      "MNC paragraph pinpoints are sufficient in lieu of report page references.",
      "Preferred report hierarchy: FCR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
      "Ibid and (n X) cross-references are not used.",
      "Point-in-time date should be specified for legislation where relevant.",
    ],
    loaRequirements: [
      "Part A / Part B LOA required: Part A for authorities from which passages are to be read; Part B for authorities to which reference may be made.",
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
      "Authorised report cited first, with page pinpoints; unreported decisions cited by MNC with paragraph pinpoints.",
      "Preferred report hierarchy: FamCAFC, then FLC, then ALR.",
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
      "Parallel citations are mandatory.",
      "Preferred report hierarchy: NSWLR, then CLR, then ALR.",
      "Pinpoint style is para-only: paragraph numbers are sufficient and appropriate.",
      "Unreported judgments: citation restricted to cases containing a material statement of legal principle not found in reported authority.",
      "Ibid and (n X) cross-references are not used.",
    ],
    loaRequirements: [
      "Part A / Part B LOA required.",
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
    jurisdiction: "NSWSC",
    courtName: "NSW Supreme Court",
    group: "New South Wales",
    practiceDirection: {
      name: "SC Gen 20 — Citation of Authority",
      number: "SC Gen 20",
      date: "October 2023",
    },
    citationRequirements: [
      "Parallel citations are mandatory.",
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
    jurisdiction: "NSW_DIST_LOCAL",
    courtName: "NSW District / Local Court",
    group: "New South Wales",
    practiceDirection: {
      name: "SC Gen 20 (applied by convention)",
      number: "SC Gen 20",
      date: "October 2023",
    },
    citationRequirements: [
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
      "Parallel citations are mandatory.",
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
      "Parallel citations are mandatory.",
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
    jurisdiction: "QLD_DIST_MAG",
    courtName: "Queensland District / Magistrates Court",
    group: "Queensland",
    practiceDirection: {
      name: "PD 7/2024 — Citation of Authority (Magistrates Court)",
      number: "PD 7/2024",
      date: "2024",
    },
    citationRequirements: [
      "Parallel citations are mandatory.",
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
      name: "Consolidated Practice Directions — PD 2.1 (Lists of Authorities) and PD 8.2.2 (Citation of Authorities)",
      number: "PD 2.1; PD 8.2.2",
      date: "Updated 20 June 2025",
    },
    citationRequirements: [
      "Parallel citation is required when a case is reported (PD 8.2.2).",
      "Citation order is MNC first, then the report: Lee v The Queen [1999] WASCA 14; (1999) 18 WAR 23, 34 [15].",
      "Preferred report hierarchy: WAR, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
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
      "Parallel citations are preferred.",
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

  // ── Tasmania ───────────────────────────────────────────────────────────────
  {
    jurisdiction: "TASSC",
    courtName: "Tasmanian Supreme Court",
    group: "Other States/Territories",
    practiceDirection: {
      name: "PD 3 of 2022 — Lists of Authorities; PD 3 of 2014 — Citation of Authorities",
      number: "PD 3/2022; PD 3/2014",
      date: "2022; 2014",
    },
    citationRequirements: [
      "Citation practice remains governed by PD 3 of 2014.",
      "Parallel citations are preferred.",
      "Preferred report hierarchy: Tas R, then CLR, then ALR.",
      "Pinpoint style is para-and-page.",
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
      name: "PD 2 of 2022 — Citation of Authorities",
      number: "PD 2/2022",
      date: "26 May 2022",
    },
    citationRequirements: [
      "The authorised report citation should be used where one exists (PD 2 of 2022).",
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
      name: "PD 1 of 2025 — Lists of Authorities; PD 2 of 2007 — Citation of Unreported Cases",
      number: "PD 1/2025; PD 2/2007",
      date: "1 January 2025; 2007",
    },
    citationRequirements: [
      "Citation of unreported cases remains governed by PD 2 of 2007.",
      "Parallel citations are preferred.",
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
