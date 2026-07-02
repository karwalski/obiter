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
 * each court allocated its own judgment numbers) and AGLC4 Appendix B /
 * the Federal Court medium neutral citation standard for the remainder
 * (provisional: Appendix B is absent from the source PDF — DATA-004).
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
