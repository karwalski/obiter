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
    // 1998–2007; "FamCAFC" from 2008).
    code: "FamCA",
    fullName: "Family Court of Australia",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 1998,
  },
  {
    code: "FamCAFC",
    fullName: "Family Court of Australia (Full Court)",
    jurisdiction: "CTH",
    level: "federal",
    mncFrom: 2008,
  },
  {
    code: "FCCA",
    fullName: "Federal Circuit Court of Australia",
    jurisdiction: "CTH",
    level: "federal",
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
    code: "AAT",
    fullName: "Administrative Appeals Tribunal",
    jurisdiction: "CTH",
    level: "tribunal",
  },
  {
    code: "AATA",
    fullName: "Administrative Appeals Tribunal of Australia",
    jurisdiction: "CTH",
    level: "tribunal",
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
    code: "TASCAT",
    fullName: "Tasmanian Civil and Administrative Tribunal",
    jurisdiction: "TAS",
    level: "tribunal",
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
