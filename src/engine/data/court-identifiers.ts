export interface CourtIdentifier {
  code: string;
  fullName: string;
  jurisdiction: string;
  level:
    | "high_court"
    | "federal"
    | "state_supreme"
    | "state_appeal"
    | "district"
    | "magistrate"
    | "tribunal"
    | "other";
  /**
   * First year the court allocated its own judgment numbers, per the
   * rule 2.3.1 table (PDF pp.79–81). Rule 2.3.1's note forbids medium
   * neutral citations for decisions predating this year (cite under
   * rule 2.3.2 instead). Omitted where the identifier does not appear in
   * the in-chapter table (Appendix B entries — unverified).
   */
  mncFrom?: number;
  /**
   * Last year the identifier was current, where the rule 2.3.1 table gives
   * a closed range (eg the Family Court Full Court used "FamCA" only until
   * 2007, "FamCAFC" from 2008).
   */
  mncTo?: number;
  /**
   * ISO-8601 date (YYYY-MM-DD) on which the institution commenced, where a
   * post-AGLC4 machinery-of-government change created or renamed it. This is
   * official-record factual metadata (not an AGLC4 rule-2.3.1 datum); it is
   * carried so that legacy citations stay unambiguous across succession, per
   * the dated institutional-succession recommendation. Present only on the
   * post-2018 succession rows below.
   */
  commencedOn?: string;
  /**
   * ISO-8601 date (YYYY-MM-DD) on which the institution ceased (as a court,
   * tribunal or citable institutional author). Set on the predecessor row of
   * a succession pair (eg the AAT, superseded by the ART on 2024-10-14) and
   * on institutions whose authorship was end-dated (eg VOCAT).
   */
  endedOn?: string;
  /**
   * Code of the identifier that succeeds this one after `endedOn`
   * (eg AATA → ARTA), or that this one succeeds after `commencedOn`.
   * Records the succession link for legacy-citation disambiguation.
   */
  succeededBy?: string;
  succeeds?: string;
  /**
   * The enabling instrument that created, renamed or wound up the
   * institution, in AGLC4 statute form (short title, jurisdiction, Act
   * number). Official-record citation for the succession row.
   */
  enablingAct?: string;
}

/**
 * Australian court and tribunal medium neutral citation identifiers.
 * Sources: the rule 2.3.1 in-chapter table (superior courts, with the years
 * each court allocated its own judgment numbers — `mncFrom`/`mncTo`) and the
 * complete AGLC4 Appendix B "Australian Medium Neutral Unique Court
 * Identifiers" list (89 identifiers) for the remainder (DATA-004, verified
 * against the scanned appendix 2026-07-20). Appendix B prints only the
 * identifier and court/tribunal name; `jurisdiction` and `level` for
 * appendix-only entries are inferred from the identifier and name, and
 * `mncFrom` is set only where the rule 2.3.1 table gives a year.
 */
export const COURT_IDENTIFIERS: CourtIdentifier[] = [
  // High Court
  {
    code: "HCA",
    fullName: "High Court of Australia",
    jurisdiction: "CTH",
    level: "high_court",
    mncFrom: 1998,
  },
  {
    // Rule 2.3.1 table: High Court of Australia — Special Leave Dispositions.
    code: "HCASL",
    fullName: "High Court of Australia — Special Leave Dispositions",
    jurisdiction: "CTH",
    level: "high_court",
    mncFrom: 2008,
  },

  // Federal courts
  {
    code: "FCA",
    fullName: "Federal Court of Australia",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 1999,
  },
  {
    // Rule 2.3.1 table: the Full Court used "FCA" 1999–2001, "FCAFC" 2002–.
    code: "FCAFC",
    fullName: "Federal Court of Australia (Full Court)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2002,
  },
  {
    // Rule 2.3.1 table: Family Court of Australia (also its Full Court
    // 1998–2007; "FamCAFC" from 2008). Continued as FCFCOA Division 1 on
    // 1 Sep 2021 (FedCFamC1F first instance); retained for pre-2021 decisions.
    code: "FamCA",
    fullName: "Family Court of Australia",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 1998,
    mncTo: 2021,
    endedOn: "2021-09-01",
    succeededBy: "FedCFamC1F",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },
  {
    // Continued as FCFCOA Division 1 (Appellate) on 1 Sep 2021 (FedCFamC1A).
    code: "FamCAFC",
    fullName: "Family Court of Australia (Full Court)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2008,
    mncTo: 2021,
    endedOn: "2021-09-01",
    succeededBy: "FedCFamC1A",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },
  {
    // Legacy: the Federal Circuit Court of Australia operated until the
    // FCFCOA commenced on 1 Sep 2021, when its jurisdiction continued as the
    // FCFCOA Division 2 (FedCFamC2*). Retained for pre-2021 decisions.
    code: "FCCA",
    fullName: "Federal Circuit Court of Australia",
    jurisdiction: "CTH",
    level: "federal",
    mncTo: 2021,
    endedOn: "2021-09-01",
    succeededBy: "FedCFamC2G",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },

  // Federal Circuit and Family Court of Australia (FCFCOA)
  // ---------------------------------------------------------------------------
  // Commenced 1 September 2021 under the Federal Circuit and Family Court of
  // Australia Act 2021 (Cth) No 12 of 2021, merging the Family Court and the
  // Federal Circuit Court into a single court with two divisions:
  //   Division 1 continues the former Family Court of Australia (FamCA/FamCAFC);
  //   Division 2 continues the former Federal Circuit Court (FCCA).
  // NZLII/AustLII neutral-citation codes: FedCFamC1A (Div 1 Appellate),
  // FedCFamC1F (Div 1 first instance), FedCFamC2F (Div 2 Family Law),
  // FedCFamC2G (Div 2 General Federal Law).
  {
    code: "FedCFamC1A",
    fullName:
      "Federal Circuit and Family Court of Australia (Division 1, Appellate Jurisdiction)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2021,
    commencedOn: "2021-09-01",
    succeeds: "FamCAFC",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },
  {
    code: "FedCFamC1F",
    fullName:
      "Federal Circuit and Family Court of Australia (Division 1, First Instance)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2021,
    commencedOn: "2021-09-01",
    succeeds: "FamCA",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },
  {
    code: "FedCFamC2F",
    fullName:
      "Federal Circuit and Family Court of Australia (Division 2, Family Law)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2021,
    commencedOn: "2021-09-01",
    succeeds: "FCCA",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },
  {
    code: "FedCFamC2G",
    fullName:
      "Federal Circuit and Family Court of Australia (Division 2, General Federal Law)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2021,
    commencedOn: "2021-09-01",
    succeeds: "FCCA",
    enablingAct:
      "Federal Circuit and Family Court of Australia Act 2021 (Cth) No 12 of 2021",
  },

  // New South Wales
  {
    code: "NSWSC",
    fullName: "Supreme Court of New South Wales",
    jurisdiction: "NSW",
    level: "state_supreme",
    mncFrom: 1999,
  },
  {
    code: "NSWCA",
    fullName: "Court of Appeal of New South Wales",
    jurisdiction: "NSW",
    level: "state_appeal",
    mncFrom: 1999,
  },
  {
    code: "NSWCCA",
    fullName: "Court of Criminal Appeal of New South Wales",
    jurisdiction: "NSW",
    level: "state_appeal",
    mncFrom: 1999,
  },
  {
    code: "NSWDC",
    fullName: "District Court of New South Wales",
    jurisdiction: "NSW",
    level: "district",
  },
  {
    code: "NSWLEC",
    fullName: "Land and Environment Court of New South Wales",
    jurisdiction: "NSW",
    level: "other",
  },

  // Victoria
  {
    code: "VSC",
    fullName: "Supreme Court of Victoria",
    jurisdiction: "VIC",
    level: "state_supreme",
    mncFrom: 1998,
  },
  {
    code: "VSCA",
    fullName: "Court of Appeal of Victoria",
    jurisdiction: "VIC",
    level: "state_appeal",
    mncFrom: 1998,
  },
  { code: "VCC", fullName: "County Court of Victoria", jurisdiction: "VIC", level: "district" },

  // Queensland
  {
    code: "QSC",
    fullName: "Supreme Court of Queensland",
    jurisdiction: "QLD",
    level: "state_supreme",
    mncFrom: 1998,
  },
  {
    code: "QCA",
    fullName: "Court of Appeal of Queensland",
    jurisdiction: "QLD",
    level: "state_appeal",
    mncFrom: 1998,
  },
  { code: "QDC", fullName: "District Court of Queensland", jurisdiction: "QLD", level: "district" },

  // South Australia
  {
    // Rule 2.3.1 table: included the Full Court until end of 2009.
    code: "SASC",
    fullName: "Supreme Court of South Australia",
    jurisdiction: "SA",
    level: "state_supreme",
    mncFrom: 1999,
  },
  {
    code: "SASCFC",
    fullName: "Supreme Court of South Australia (Full Court)",
    jurisdiction: "SA",
    level: "state_appeal",
    mncFrom: 2010,
  },
  {
    code: "SADC",
    fullName: "District Court of South Australia",
    jurisdiction: "SA",
    level: "district",
  },

  // Western Australia
  {
    code: "WASC",
    fullName: "Supreme Court of Western Australia",
    jurisdiction: "WA",
    level: "state_supreme",
    mncFrom: 1999,
  },
  {
    // Rule 2.3.1 table: included the Full Court until end of 2004.
    code: "WASCA",
    fullName: "Court of Appeal of Western Australia",
    jurisdiction: "WA",
    level: "state_appeal",
    mncFrom: 1999,
  },
  {
    code: "WADC",
    fullName: "District Court of Western Australia",
    jurisdiction: "WA",
    level: "district",
  },

  // Tasmania
  {
    // Rule 2.3.1 table: included the Full Court until end of 2009.
    code: "TASSC",
    fullName: "Supreme Court of Tasmania",
    jurisdiction: "TAS",
    level: "state_supreme",
    mncFrom: 1999,
  },
  {
    // Rule 2.3.1 table: Tasmanian Court of Criminal Appeal.
    code: "TASCCA",
    fullName: "Court of Criminal Appeal of Tasmania",
    jurisdiction: "TAS",
    level: "state_appeal",
    mncFrom: 2010,
  },
  {
    code: "TASFC",
    fullName: "Supreme Court of Tasmania (Full Court)",
    jurisdiction: "TAS",
    level: "state_appeal",
    mncFrom: 2010,
  },

  // Australian Capital Territory
  {
    // Rule 2.3.1 table: includes the Full Court.
    code: "ACTSC",
    fullName: "Supreme Court of the Australian Capital Territory",
    jurisdiction: "ACT",
    level: "state_supreme",
    mncFrom: 1998,
  },
  {
    code: "ACTCA",
    fullName: "Court of Appeal of the Australian Capital Territory",
    jurisdiction: "ACT",
    level: "state_appeal",
    mncFrom: 2002,
  },

  // Northern Territory
  {
    // Rule 2.3.1 table: includes the Full Court.
    code: "NTSC",
    fullName: "Supreme Court of the Northern Territory",
    jurisdiction: "NT",
    level: "state_supreme",
    mncFrom: 1999,
  },
  {
    code: "NTCA",
    fullName: "Court of Appeal of the Northern Territory",
    jurisdiction: "NT",
    level: "state_appeal",
    mncFrom: 2000,
  },
  {
    // Rule 2.3.1 table: Northern Territory Court of Criminal Appeal.
    code: "NTCCA",
    fullName: "Court of Criminal Appeal of the Northern Territory",
    jurisdiction: "NT",
    level: "state_appeal",
    mncFrom: 2000,
  },

  // Tribunals — Federal
  {
    // Superseded by the Administrative Review Tribunal (ART) on 14 Oct 2024.
    code: "AAT",
    fullName: "Administrative Appeals Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
    endedOn: "2024-10-14",
    succeededBy: "ARTA",
    enablingAct: "Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024",
  },
  {
    // AATA is the medium neutral citation identifier for the Administrative
    // Appeals Tribunal. The tribunal was abolished and replaced by the
    // Administrative Review Tribunal on 14 Oct 2024 (AAT Act 1975 (Cth)
    // repealed by the transitional Acts No 38 and No 39 of 2024). Legacy AATA
    // identifiers persist for pre-14-Oct-2024 decisions; ARTA is used
    // thereafter.
    code: "AATA",
    fullName: "Administrative Appeals Tribunal of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
    endedOn: "2024-10-14",
    succeededBy: "ARTA",
    enablingAct: "Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024",
  },
  {
    // Administrative Review Tribunal — replaced the AAT on 14 Oct 2024 under
    // the Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024
    // (transitional Acts No 38 and No 39 of 2024). ART/ARTA identifiers apply
    // to decisions from 14 Oct 2024; pre-commencement decisions keep AATA.
    code: "ARTA",
    fullName: "Administrative Review Tribunal of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
    mncFrom: 2024,
    commencedOn: "2024-10-14",
    succeeds: "AATA",
    enablingAct: "Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024",
  },
  {
    // Short form of the Administrative Review Tribunal identifier.
    code: "ART",
    fullName: "Administrative Review Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
    mncFrom: 2024,
    commencedOn: "2024-10-14",
    succeeds: "AAT",
    enablingAct: "Administrative Review Tribunal Act 2024 (Cth) No 40 of 2024",
  },
  { code: "FWC", fullName: "Fair Work Commission", jurisdiction: "CTH", level: "tribunal" },

  // Tribunals — State and Territory
  {
    code: "NCAT",
    fullName: "NSW Civil and Administrative Tribunal",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "VCAT",
    fullName: "Victorian Civil and Administrative Tribunal",
    jurisdiction: "VIC",
    level: "tribunal",
  },
  {
    code: "QCAT",
    fullName: "Queensland Civil and Administrative Tribunal",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  {
    code: "SACAT",
    fullName: "South Australian Civil and Administrative Tribunal",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAT",
    fullName: "State Administrative Tribunal of Western Australia",
    jurisdiction: "WA",
    level: "tribunal",
  },
  {
    // Commenced 5 Nov 2021, consolidating nine Tasmanian tribunals, under the
    // Tasmanian Civil and Administrative Tribunal Act 2020 (Tas) No 24 of 2020
    // (establishment day deferred by proclamation).
    code: "TASCAT",
    fullName: "Tasmanian Civil and Administrative Tribunal",
    jurisdiction: "TAS",
    level: "tribunal",
    mncFrom: 2021,
    commencedOn: "2021-11-05",
    enablingAct:
      "Tasmanian Civil and Administrative Tribunal Act 2020 (Tas) No 24 of 2020",
  },
  {
    code: "ACAT",
    fullName: "ACT Civil and Administrative Tribunal",
    jurisdiction: "ACT",
    level: "tribunal",
  },
  {
    code: "NTCAT",
    fullName: "Northern Territory Civil and Administrative Tribunal",
    jurisdiction: "NT",
    level: "tribunal",
  },

  // =========================================================================
  // AGLC4 APPENDIX B — additional court/tribunal identifiers (DATA-004)
  // Identifier + court name are transcribed from Appendix B; jurisdiction and
  // level are inferred (no year data is printed in the appendix).
  // =========================================================================
  {
    code: "ACompT",
    fullName: "Australian Competition Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "ACopyT",
    fullName: "Australian Copyright Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "ACTAAT",
    fullName: "Australian Capital Territory Administrative Appeals Tribunal",
    jurisdiction: "ACT",
    level: "tribunal",
  },
  {
    code: "ADFDAT",
    fullName: "Defence Force Discipline Appeal Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  { code: "ADO", fullName: "Australian Designs Office", jurisdiction: "CTH", level: "tribunal" },
  {
    code: "AICmr",
    fullName: "Australian Information Commissioner",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "AIRC",
    fullName: "Australian Industrial Relations Commission",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "AIRCFB",
    fullName: "Australian Industrial Relations Commission — Full Bench",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  { code: "APO", fullName: "Australian Patent Office", jurisdiction: "CTH", level: "tribunal" },
  {
    code: "ATMO",
    fullName: "Australian Trade Marks Office",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  { code: "ATP", fullName: "Australian Takeovers Panel", jurisdiction: "CTH", level: "tribunal" },
  {
    code: "FMCA",
    fullName: "Federal Magistrates' Court of Australia",
    jurisdiction: "CTH",
    level: "district",
  },
  {
    code: "FMCAfam",
    fullName: "Federal Magistrates' Court of Australia — Family Law",
    jurisdiction: "CTH",
    level: "district",
  },
  { code: "FWA", fullName: "Fair Work Australia", jurisdiction: "CTH", level: "tribunal" },
  {
    code: "FWAFB",
    fullName: "Fair Work Australia — Full Bench",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "FWCFB",
    fullName: "Fair Work Commission — Full Bench",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "HCATrans",
    fullName: "High Court of Australia — Transcripts",
    jurisdiction: "CTH",
    level: "high_court",
  },
  {
    code: "ICQ",
    fullName: "Industrial Court of Queensland",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  {
    code: "IRCA",
    fullName: "Industrial Relations Court of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "MRTA",
    fullName: "Migration Review Tribunal of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "NFSC",
    fullName: "Supreme Court of Norfolk Island",
    jurisdiction: "EXT",
    level: "state_supreme",
  },
  {
    code: "NNTTA",
    fullName: "National Native Title Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "NSWADT",
    fullName: "New South Wales Administrative Decisions Tribunal",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWADTAP",
    fullName: "New South Wales Administrative Decisions Tribunal — Appeal Panel",
    jurisdiction: "NSW",
    level: "state_appeal",
  },
  {
    code: "NSWCATAD",
    fullName:
      "New South Wales Civil and Administrative Tribunal — Administrative and Equal Opportunity Division",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWCATAP",
    fullName: "New South Wales Civil and Administrative Tribunal — Appeal Panel",
    jurisdiction: "NSW",
    level: "state_appeal",
  },
  {
    code: "NSWCATCD",
    fullName:
      "New South Wales Civil and Administrative Tribunal — Consumer and Commercial Division",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWCATGD",
    fullName: "New South Wales Civil and Administrative Tribunal — Guardianship Division",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWCATOD",
    fullName: "New South Wales Civil and Administrative Tribunal — Occupational Division",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWCC",
    fullName: "Compensation Court of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWCSAT",
    fullName: "Community Services Appeals Tribunal of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWDRGC",
    fullName: "Drug Court of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWFTT",
    fullName: "Fair Trading Tribunal of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "NSWIRComm",
    fullName: "Industrial Court of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
  },
  {
    code: "QADT",
    fullName: "Queensland Anti-Discrimination Tribunal",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  {
    code: "QLAC",
    fullName: "Land Appeal Court of Queensland",
    jurisdiction: "QLD",
    level: "state_appeal",
  },
  {
    code: "QLAT",
    fullName: "Queensland Liquor Appeals Tribunal",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  {
    code: "QLRT",
    fullName: "Queensland Land and Resources Tribunal",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  { code: "QLC", fullName: "Land Court of Queensland", jurisdiction: "QLD", level: "tribunal" },
  {
    code: "QPEC",
    fullName: "Planning and Environment Court of Queensland",
    jurisdiction: "QLD",
    level: "tribunal",
  },
  {
    code: "RRTA",
    fullName: "Refugee Review Tribunal of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "SAEOT",
    fullName: "Equal Opportunity Tribunal of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAERDC",
    fullName: "Environment, Resources and Development Court of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAIRC",
    fullName: "Industrial Relations Court of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAIRComm",
    fullName: "Industrial Relations Commission of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAWCAT",
    fullName: "Workers Compensation Appeal Tribunal of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "SAWCT",
    fullName: "Workers Compensation Tribunal of South Australia",
    jurisdiction: "SA",
    level: "tribunal",
  },
  {
    code: "TASADT",
    fullName: "Anti-Discrimination Tribunal of Tasmania",
    jurisdiction: "TAS",
    level: "tribunal",
  },
  {
    code: "TASRMPAT",
    fullName: "Resources Management and Planning Appeal Tribunal of Tasmania",
    jurisdiction: "TAS",
    level: "tribunal",
  },
  {
    code: "VMHRB",
    fullName: "Mental Health Review Board of Victoria",
    jurisdiction: "VIC",
    level: "tribunal",
  },
  {
    code: "WASAT",
    fullName: "Western Australia State Administrative Tribunal",
    jurisdiction: "WA",
    level: "tribunal",
  },

  // =========================================================================
  // POST-2018 MACHINERY-OF-GOVERNMENT SUCCESSION (official-record data;
  // AGLC5 feedback-package Part B.2). Each row carries its enabling-Act
  // citation and commencement/cessation date so legacy citations stay
  // unambiguous across the change. Not experimental — official record.
  // =========================================================================
  {
    // Personal Injury Commission (NSW) — commenced 1 Mar 2021, absorbing the
    // Workers Compensation Commission and motor-accident dispute functions,
    // under the Personal Injury Commission Act 2020 (NSW) No 18 of 2020.
    code: "NSWPIC",
    fullName: "Personal Injury Commission of New South Wales",
    jurisdiction: "NSW",
    level: "tribunal",
    mncFrom: 2021,
    commencedOn: "2021-03-01",
    enablingAct: "Personal Injury Commission Act 2020 (NSW) No 18 of 2020",
  },
  {
    // Victims of Crime Assistance Tribunal (Vic) — its authorship ended on
    // 18 Nov 2024, when victim financial assistance moved to an administrative
    // Financial Assistance Scheme under the Victims of Crime (Financial
    // Assistance Scheme) Act 2022 (Vic) No 21 of 2022. Retained for pre-2024
    // decisions; VOCAT ceases as an institutional author from 18 Nov 2024.
    code: "VOCAT",
    fullName: "Victims of Crime Assistance Tribunal",
    jurisdiction: "VIC",
    level: "tribunal",
    endedOn: "2024-11-18",
    enablingAct:
      "Victims of Crime (Financial Assistance Scheme) Act 2022 (Vic) No 21 of 2022",
  },
];

/**
 * Search court identifiers by code or full name (case-insensitive substring match).
 */
export function searchCourtIdentifiers(query: string): CourtIdentifier[] {
  const lowerQuery = query.toLowerCase();
  return COURT_IDENTIFIERS.filter(
    (entry) =>
      entry.code.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a court identifier by its exact code (case-sensitive).
 */
export function getByCode(code: string): CourtIdentifier | undefined {
  return COURT_IDENTIFIERS.find((entry) => entry.code === code);
}
