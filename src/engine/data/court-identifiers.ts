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
}

/**
 * Australian court and tribunal medium neutral citation identifiers.
 * Source: AGLC4 Appendix B / Federal Court of Australia medium neutral citation standard.
 */
export const COURT_IDENTIFIERS: CourtIdentifier[] = [
  // High Court
  { code: "HCA", fullName: "High Court of Australia", jurisdiction: "CTH", level: "high_court" },

  // Federal courts
  { code: "FCA", fullName: "Federal Court of Australia", jurisdiction: "CTH", level: "federal" },
  { code: "FCAFC", fullName: "Federal Court of Australia (Full Court)", jurisdiction: "CTH", level: "federal" },
  { code: "FCCA", fullName: "Federal Circuit Court of Australia", jurisdiction: "CTH", level: "federal" },

  // New South Wales
  { code: "NSWSC", fullName: "Supreme Court of New South Wales", jurisdiction: "NSW", level: "state_supreme" },
  { code: "NSWCA", fullName: "Court of Appeal of New South Wales", jurisdiction: "NSW", level: "state_appeal" },
  { code: "NSWCCA", fullName: "Court of Criminal Appeal of New South Wales", jurisdiction: "NSW", level: "state_appeal" },
  { code: "NSWDC", fullName: "District Court of New South Wales", jurisdiction: "NSW", level: "district" },
  { code: "NSWLEC", fullName: "Land and Environment Court of New South Wales", jurisdiction: "NSW", level: "other" },

  // Victoria
  { code: "VSC", fullName: "Supreme Court of Victoria", jurisdiction: "VIC", level: "state_supreme" },
  { code: "VSCA", fullName: "Court of Appeal of Victoria", jurisdiction: "VIC", level: "state_appeal" },
  { code: "VCC", fullName: "County Court of Victoria", jurisdiction: "VIC", level: "district" },

  // Queensland
  { code: "QSC", fullName: "Supreme Court of Queensland", jurisdiction: "QLD", level: "state_supreme" },
  { code: "QCA", fullName: "Court of Appeal of Queensland", jurisdiction: "QLD", level: "state_appeal" },
  { code: "QDC", fullName: "District Court of Queensland", jurisdiction: "QLD", level: "district" },

  // South Australia
  { code: "SASC", fullName: "Supreme Court of South Australia", jurisdiction: "SA", level: "state_supreme" },
  { code: "SASCFC", fullName: "Supreme Court of South Australia (Full Court)", jurisdiction: "SA", level: "state_appeal" },
  { code: "SADC", fullName: "District Court of South Australia", jurisdiction: "SA", level: "district" },

  // Western Australia
  { code: "WASC", fullName: "Supreme Court of Western Australia", jurisdiction: "WA", level: "state_supreme" },
  { code: "WASCA", fullName: "Court of Appeal of Western Australia", jurisdiction: "WA", level: "state_appeal" },
  { code: "WADC", fullName: "District Court of Western Australia", jurisdiction: "WA", level: "district" },

  // Tasmania
  { code: "TASSC", fullName: "Supreme Court of Tasmania", jurisdiction: "TAS", level: "state_supreme" },
  { code: "TASFC", fullName: "Supreme Court of Tasmania (Full Court)", jurisdiction: "TAS", level: "state_appeal" },

  // Australian Capital Territory
  { code: "ACTSC", fullName: "Supreme Court of the Australian Capital Territory", jurisdiction: "ACT", level: "state_supreme" },
  { code: "ACTCA", fullName: "Court of Appeal of the Australian Capital Territory", jurisdiction: "ACT", level: "state_appeal" },

  // Northern Territory
  { code: "NTSC", fullName: "Supreme Court of the Northern Territory", jurisdiction: "NT", level: "state_supreme" },
  { code: "NTCA", fullName: "Court of Appeal of the Northern Territory", jurisdiction: "NT", level: "state_appeal" },

  // Tribunals — Federal
  { code: "AAT", fullName: "Administrative Appeals Tribunal", jurisdiction: "CTH", level: "tribunal" },
  { code: "AATA", fullName: "Administrative Appeals Tribunal of Australia", jurisdiction: "CTH", level: "tribunal" },
  { code: "FWC", fullName: "Fair Work Commission", jurisdiction: "CTH", level: "tribunal" },

  // Tribunals — State and Territory
  { code: "NCAT", fullName: "NSW Civil and Administrative Tribunal", jurisdiction: "NSW", level: "tribunal" },
  { code: "VCAT", fullName: "Victorian Civil and Administrative Tribunal", jurisdiction: "VIC", level: "tribunal" },
  { code: "QCAT", fullName: "Queensland Civil and Administrative Tribunal", jurisdiction: "QLD", level: "tribunal" },
  { code: "SACAT", fullName: "South Australian Civil and Administrative Tribunal", jurisdiction: "SA", level: "tribunal" },
  { code: "SAT", fullName: "State Administrative Tribunal of Western Australia", jurisdiction: "WA", level: "tribunal" },
  { code: "TASCAT", fullName: "Tasmanian Civil and Administrative Tribunal", jurisdiction: "TAS", level: "tribunal" },
  { code: "ACAT", fullName: "ACT Civil and Administrative Tribunal", jurisdiction: "ACT", level: "tribunal" },
  { code: "NTCAT", fullName: "Northern Territory Civil and Administrative Tribunal", jurisdiction: "NT", level: "tribunal" },
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
