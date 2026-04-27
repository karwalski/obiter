/**
 * Report series dataset — independently compiled from public domain sources.
 *
 * This data maps report series abbreviations to their full names, jurisdictions,
 * and classification. It is factual reference information compiled from publicly
 * available sources including court websites, AustLII, the Cardiff Index to Legal
 * Abbreviations, and legal database catalogues.
 *
 * This dataset is NOT derived from AGLC4 Appendix A. It is an independent
 * compilation of widely published abbreviation-to-name mappings (DECISION-001).
 *
 * Copyright (c) 2024-2026 Obiter contributors — GPLv3
 */

export interface ReportSeriesEntry {
  abbreviation: string;
  fullName: string;
  jurisdiction: string;
  type: "authorised" | "unauthorised_generalist" | "unauthorised_subject";
  yearOrganised: boolean;
  source: string;
}

/**
 * ~150+ report series entries compiled from public domain sources.
 *
 * Sources key:
 *   "Court website"  — Published on the issuing court's official website
 *   "AustLII"        — Australian Legal Information Institute catalogue
 *   "Cardiff Index"  — Cardiff Index to Legal Abbreviations (Cardiff University)
 *   "Public domain"  — Widely published in multiple freely available references
 *   "BAILII"         — British and Irish Legal Information Institute
 *   "WorldLII"       — World Legal Information Institute
 */
export const REPORT_SERIES: ReportSeriesEntry[] = [
  // =========================================================================
  // AUSTRALIA — AUTHORISED REPORTS
  // =========================================================================
  {
    abbreviation: "CLR",
    fullName: "Commonwealth Law Reports",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: false,
    source: "Court website",
  },
  {
    abbreviation: "FCR",
    fullName: "Federal Court Reports",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: false,
    source: "Court website",
  },
  {
    abbreviation: "FCAFC",
    fullName: "Federal Court of Australia (Full Court)",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "FamCAFC",
    fullName: "Family Court of Australia (Full Court)",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWLR",
    fullName: "New South Wales Law Reports",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "VR",
    fullName: "Victorian Reports",
    jurisdiction: "VIC",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "QR",
    fullName: "Queensland Reports",
    jurisdiction: "QLD",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "SASR",
    fullName: "South Australian State Reports",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: false,
    source: "Court website",
  },
  {
    abbreviation: "WASR",
    fullName: "Western Australian State Reports",
    jurisdiction: "WA",
    type: "authorised",
    yearOrganised: false,
    source: "Court website",
  },
  {
    abbreviation: "WAR",
    fullName: "Western Australian Reports",
    jurisdiction: "WA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "Tas R",
    fullName: "Tasmanian Reports",
    jurisdiction: "TAS",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ACTLR",
    fullName: "Australian Capital Territory Law Reports",
    jurisdiction: "ACT",
    type: "authorised",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "NTR",
    fullName: "Northern Territory Reports",
    jurisdiction: "NT",
    type: "authorised",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "NTLR",
    fullName: "Northern Territory Law Reports",
    jurisdiction: "NT",
    type: "authorised",
    yearOrganised: true,
    source: "AustLII",
  },

  // =========================================================================
  // AUSTRALIA — MEDIUM NEUTRAL CITATION COURT IDENTIFIERS
  // =========================================================================

  // --- High Court / Federal ---
  {
    abbreviation: "HCA",
    fullName: "High Court of Australia",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "FCA",
    fullName: "Federal Court of Australia",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "AATA",
    fullName: "Administrative Appeals Tribunal of Australia",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "FamCA",
    fullName: "Family Court of Australia",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "FedCFamC1A",
    fullName: "Federal Circuit and Family Court of Australia (Appeal Division)",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- New South Wales ---
  {
    abbreviation: "NSWCA",
    fullName: "Supreme Court of New South Wales (Court of Appeal)",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWCCA",
    fullName: "Supreme Court of New South Wales (Court of Criminal Appeal)",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWCIMC",
    fullName: "Children's Court of New South Wales",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWDC",
    fullName: "District Court of New South Wales",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWLEC",
    fullName: "Land and Environment Court of New South Wales",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWSC",
    fullName: "Supreme Court of New South Wales",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NSWWCC",
    fullName: "Workers Compensation Commission of New South Wales",
    jurisdiction: "NSW",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Victoria ---
  {
    abbreviation: "VCAT",
    fullName: "Victorian Civil and Administrative Tribunal",
    jurisdiction: "VIC",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "VCC",
    fullName: "County Court of Victoria",
    jurisdiction: "VIC",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "VMC",
    fullName: "Magistrates' Court of Victoria",
    jurisdiction: "VIC",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "VSC",
    fullName: "Supreme Court of Victoria",
    jurisdiction: "VIC",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Queensland ---
  {
    abbreviation: "QCAT",
    fullName: "Queensland Civil and Administrative Tribunal",
    jurisdiction: "QLD",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "QDC",
    fullName: "District Court of Queensland",
    jurisdiction: "QLD",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "QMC",
    fullName: "Magistrates Court of Queensland",
    jurisdiction: "QLD",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "QSC",
    fullName: "Supreme Court of Queensland",
    jurisdiction: "QLD",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Western Australia ---
  {
    abbreviation: "WADC",
    fullName: "District Court of Western Australia",
    jurisdiction: "WA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "WASAT",
    fullName: "State Administrative Tribunal of Western Australia",
    jurisdiction: "WA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "WASC",
    fullName: "Supreme Court of Western Australia",
    jurisdiction: "WA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- South Australia ---
  {
    abbreviation: "SACAT",
    fullName: "South Australian Civil and Administrative Tribunal",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "SADC",
    fullName: "District Court of South Australia",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "SAET",
    fullName: "South Australian Employment Tribunal",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "SASC",
    fullName: "Supreme Court of South Australia",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "SASCFC",
    fullName: "Supreme Court of South Australia (Full Court)",
    jurisdiction: "SA",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Tasmania ---
  {
    abbreviation: "TASFC",
    fullName: "Supreme Court of Tasmania (Full Court)",
    jurisdiction: "TAS",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "TASMC",
    fullName: "Magistrates Court of Tasmania",
    jurisdiction: "TAS",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Australian Capital Territory ---
  {
    abbreviation: "ACAT",
    fullName: "ACT Civil and Administrative Tribunal",
    jurisdiction: "ACT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ACTCA",
    fullName: "Supreme Court of the Australian Capital Territory (Court of Appeal)",
    jurisdiction: "ACT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ACTMC",
    fullName: "Magistrates Court of the Australian Capital Territory",
    jurisdiction: "ACT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ACTSC",
    fullName: "Supreme Court of the Australian Capital Territory",
    jurisdiction: "ACT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // --- Northern Territory ---
  {
    abbreviation: "NTCA",
    fullName: "Supreme Court of the Northern Territory (Court of Appeal)",
    jurisdiction: "NT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "NTMC",
    fullName: "Local Court of the Northern Territory",
    jurisdiction: "NT",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // =========================================================================
  // AUSTRALIA — UNAUTHORISED GENERALIST REPORTS
  // =========================================================================
  {
    abbreviation: "ALR",
    fullName: "Australian Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "ALJR",
    fullName: "Australian Law Journal Reports",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "FLR",
    fullName: "Federal Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "AILR",
    fullName: "Australian Indigenous Law Reporter",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "AIJLF",
    fullName: "Australian Indigenous Law Journal Forum",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "ALD",
    fullName: "Administrative Law Decisions",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "ALMD",
    fullName: "Australian Legal Monthly Digest",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NSWCCR",
    fullName: "New South Wales Compensation Court Reports",
    jurisdiction: "NSW",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "SR (WA)",
    fullName: "Western Australian Supreme Court Reports",
    jurisdiction: "WA",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "Qd R",
    fullName: "Queensland Reports (historical)",
    jurisdiction: "QLD",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "ACTR",
    fullName: "Australian Capital Territory Reports",
    jurisdiction: "ACT",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "SR (NSW)",
    fullName: "New South Wales State Reports",
    jurisdiction: "NSW",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },

  // =========================================================================
  // AUSTRALIA — UNAUTHORISED SUBJECT-SPECIFIC REPORTS
  // =========================================================================
  {
    abbreviation: "A Crim R",
    fullName: "Australian Criminal Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "IPR",
    fullName: "Intellectual Property Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "LGERA",
    fullName: "Local Government and Environment Reports of Australia",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "IR",
    fullName: "Industrial Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "Fam LR",
    fullName: "Family Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "ATPR",
    fullName: "Australian Trade Practices Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "ATC",
    fullName: "Australian Tax Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "ATR",
    fullName: "Australian Tax Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "ACLR",
    fullName: "Australian Company Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "ACSR",
    fullName: "Australian Corporations and Securities Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "ACLC",
    fullName: "Australian Company Law Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "MVR",
    fullName: "Motor Vehicle Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "BPR",
    fullName: "Building and Property Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "Crim LJ",
    fullName: "Criminal Law Journal",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "FLC",
    fullName: "Family Law Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "AGLR",
    fullName: "Australian Gay and Lesbian Law Journal Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NSWCR",
    fullName: "New South Wales Criminal Reports",
    jurisdiction: "NSW",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "APR",
    fullName: "Australian Patent Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "AIPC",
    fullName: "Australian Intellectual Property Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "Fam CA",
    fullName: "Family Court of Australia",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "BCLC",
    fullName: "Building and Construction Law Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "SR (SA)",
    fullName: "South Australian State Reports",
    jurisdiction: "SA",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "NNTT",
    fullName: "National Native Title Tribunal",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "Aust Ins LR",
    fullName: "Australian Insurance Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NSWDCR",
    fullName: "New South Wales District Court Reports",
    jurisdiction: "NSW",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "BCL",
    fullName: "Butterworths Company Law Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "AATR",
    fullName: "Administrative Appeals Tribunal Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "AR (NSW)",
    fullName: "Arbitration Reports (New South Wales)",
    jurisdiction: "NSW",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "EOC",
    fullName: "Equal Opportunity Cases",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "HRLRA",
    fullName: "Human Rights Law Reports of Australia",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "TCLR",
    fullName: "Trade and Commerce Law Reports",
    jurisdiction: "CTH",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Public domain",
  },

  // =========================================================================
  // UNITED KINGDOM
  // =========================================================================
  {
    abbreviation: "AC",
    fullName: "Appeal Cases",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ER",
    fullName: "English Reports",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "PC",
    fullName: "Privy Council",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "QB",
    fullName: "Queen's Bench",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "KB",
    fullName: "King's Bench",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Ch",
    fullName: "Chancery",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Fam",
    fullName: "Family Division",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "WLR",
    fullName: "Weekly Law Reports",
    jurisdiction: "UK",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "All ER",
    fullName: "All England Law Reports",
    jurisdiction: "UK",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Lloyd's Rep",
    fullName: "Lloyd's Law Reports",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Cr App R",
    fullName: "Criminal Appeal Reports",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "BCLC",
    fullName: "Butterworths Company Law Cases (UK)",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "UKHL",
    fullName: "United Kingdom House of Lords",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "UKSC",
    fullName: "United Kingdom Supreme Court",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "UKPC",
    fullName: "United Kingdom Privy Council",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "EWCA Civ",
    fullName: "England and Wales Court of Appeal (Civil Division)",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "EWCA Crim",
    fullName: "England and Wales Court of Appeal (Criminal Division)",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "EWHC",
    fullName: "England and Wales High Court",
    jurisdiction: "UK",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "ICR",
    fullName: "Industrial Cases Reports",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "FSR",
    fullName: "Fleet Street Reports",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "RPC",
    fullName: "Reports of Patent Cases",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "Tax Cas",
    fullName: "Tax Cases",
    jurisdiction: "UK",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },

  // =========================================================================
  // CANADA
  // =========================================================================
  {
    abbreviation: "SCR",
    fullName: "Supreme Court Reports",
    jurisdiction: "CA",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "FC",
    fullName: "Federal Court Reports (Canada)",
    jurisdiction: "CA",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "DLR",
    fullName: "Dominion Law Reports",
    jurisdiction: "CA",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "OR",
    fullName: "Ontario Reports",
    jurisdiction: "CA",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "BCLR",
    fullName: "British Columbia Law Reports",
    jurisdiction: "CA",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "AR",
    fullName: "Alberta Reports",
    jurisdiction: "CA",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "WWR",
    fullName: "Western Weekly Reports",
    jurisdiction: "CA",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "CCC",
    fullName: "Canadian Criminal Cases",
    jurisdiction: "CA",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "CLLC",
    fullName: "Canadian Labour Law Cases",
    jurisdiction: "CA",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Cardiff Index",
  },

  // =========================================================================
  // UNITED STATES
  // =========================================================================
  {
    abbreviation: "US",
    fullName: "United States Reports",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "S Ct",
    fullName: "Supreme Court Reporter",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "L Ed",
    fullName: "Lawyers' Edition",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "L Ed 2d",
    fullName: "Lawyers' Edition (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F 2d",
    fullName: "Federal Reporter (Second Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F 3d",
    fullName: "Federal Reporter (Third Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F 4th",
    fullName: "Federal Reporter (Fourth Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F Supp",
    fullName: "Federal Supplement",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F Supp 2d",
    fullName: "Federal Supplement (Second Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "F Supp 3d",
    fullName: "Federal Supplement (Third Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NE 2d",
    fullName: "North Eastern Reporter (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NW 2d",
    fullName: "North Western Reporter (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "P 2d",
    fullName: "Pacific Reporter (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "P 3d",
    fullName: "Pacific Reporter (Third Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "So 2d",
    fullName: "Southern Reporter (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "SE 2d",
    fullName: "South Eastern Reporter (Second Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "SW 3d",
    fullName: "South Western Reporter (Third Series)",
    jurisdiction: "US",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "NY 2d",
    fullName: "New York Reports (Second Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "Cal 4th",
    fullName: "California Reports (Fourth Series)",
    jurisdiction: "US",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },

  // =========================================================================
  // NEW ZEALAND
  // =========================================================================
  {
    abbreviation: "NZLR",
    fullName: "New Zealand Law Reports",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZAR",
    fullName: "New Zealand Administrative Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZFLR",
    fullName: "New Zealand Family Law Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZSC",
    fullName: "New Zealand Supreme Court",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZCA",
    fullName: "New Zealand Court of Appeal",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZHC",
    fullName: "New Zealand High Court",
    jurisdiction: "NZ",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "NZELR",
    fullName: "New Zealand Employment Law Reports",
    jurisdiction: "NZ",
    type: "unauthorised_subject",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // SINGAPORE
  // =========================================================================
  {
    abbreviation: "SLR",
    fullName: "Singapore Law Reports",
    jurisdiction: "SG",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "SLR(R)",
    fullName: "Singapore Law Reports (Reissue)",
    jurisdiction: "SG",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "SGCA",
    fullName: "Singapore Court of Appeal",
    jurisdiction: "SG",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "SGHC",
    fullName: "Singapore High Court",
    jurisdiction: "SG",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "MLJ",
    fullName: "Malayan Law Journal",
    jurisdiction: "SG",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // HONG KONG
  // =========================================================================
  {
    abbreviation: "HKLRD",
    fullName: "Hong Kong Law Reports and Digest",
    jurisdiction: "HK",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "HKCFA",
    fullName: "Hong Kong Court of Final Appeal",
    jurisdiction: "HK",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "HKCA",
    fullName: "Hong Kong Court of Appeal",
    jurisdiction: "HK",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // INDIA
  // =========================================================================
  {
    abbreviation: "AIR",
    fullName: "All India Reporter",
    jurisdiction: "IN",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "SCC",
    fullName: "Supreme Court Cases (India)",
    jurisdiction: "IN",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },

  // =========================================================================
  // SOUTH AFRICA
  // =========================================================================
  {
    abbreviation: "SA",
    fullName: "South African Law Reports",
    jurisdiction: "ZA",
    type: "authorised",
    yearOrganised: true,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ZACC",
    fullName: "Constitutional Court of South Africa",
    jurisdiction: "ZA",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // IRELAND
  // =========================================================================
  {
    abbreviation: "IR",
    fullName: "Irish Reports",
    jurisdiction: "IE",
    type: "authorised",
    yearOrganised: true,
    source: "BAILII",
  },
  {
    abbreviation: "ILRM",
    fullName: "Irish Law Reports Monthly",
    jurisdiction: "IE",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "BAILII",
  },

  // =========================================================================
  // INTERNATIONAL — ICJ / PCIJ
  // =========================================================================
  {
    abbreviation: "ICJ Reports",
    fullName: "International Court of Justice Reports of Judgments, Advisory Opinions and Orders",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "PCIJ (ser A)",
    fullName: "Permanent Court of International Justice Series A: Collection of Judgments",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "WorldLII",
  },
  {
    abbreviation: "PCIJ (ser B)",
    fullName: "Permanent Court of International Justice Series B: Collection of Advisory Opinions",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "WorldLII",
  },
  {
    abbreviation: "PCIJ (ser A/B)",
    fullName: "Permanent Court of International Justice Series A/B: Judgments, Orders and Advisory Opinions",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "WorldLII",
  },

  // =========================================================================
  // INTERNATIONAL — EUROPEAN COURT OF HUMAN RIGHTS
  // =========================================================================
  {
    abbreviation: "ECHR",
    fullName: "European Court of Human Rights",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "EHRR",
    fullName: "European Human Rights Reports",
    jurisdiction: "INTL",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },

  // =========================================================================
  // INTERNATIONAL — INTERNATIONAL CRIMINAL COURTS
  // =========================================================================
  {
    abbreviation: "ICC",
    fullName: "International Criminal Court",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ICTY",
    fullName: "International Criminal Tribunal for the Former Yugoslavia",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "ICTR",
    fullName: "International Criminal Tribunal for Rwanda",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },

  // =========================================================================
  // INTERNATIONAL — EU / CJEU
  // =========================================================================
  {
    abbreviation: "ECR",
    fullName: "European Court Reports",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "CMLR",
    fullName: "Common Market Law Reports",
    jurisdiction: "INTL",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "Cardiff Index",
  },

  // =========================================================================
  // INTERNATIONAL — GENERAL
  // =========================================================================
  {
    abbreviation: "ILR",
    fullName: "International Law Reports",
    jurisdiction: "INTL",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Cardiff Index",
  },
  {
    abbreviation: "ILM",
    fullName: "International Legal Materials",
    jurisdiction: "INTL",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "UNTS",
    fullName: "United Nations Treaty Series",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "LNTS",
    fullName: "League of Nations Treaty Series",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "ATS",
    fullName: "Australian Treaty Series",
    jurisdiction: "CTH",
    type: "authorised",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "RIAA",
    fullName: "Reports of International Arbitral Awards",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "Public domain",
  },
  {
    abbreviation: "ITLOS",
    fullName: "International Tribunal for the Law of the Sea",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },
  {
    abbreviation: "ICSID",
    fullName: "International Centre for Settlement of Investment Disputes Reports",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Public domain",
  },
  {
    abbreviation: "IACtHR (ser C)",
    fullName: "Inter-American Court of Human Rights Series C: Decisions and Judgments",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: false,
    source: "Court website",
  },
  {
    abbreviation: "ACHPR",
    fullName: "African Court on Human and Peoples' Rights",
    jurisdiction: "INTL",
    type: "authorised",
    yearOrganised: true,
    source: "Court website",
  },

  // =========================================================================
  // ADDITIONAL AUSTRALIAN SUBJECT REPORTS
  // =========================================================================
  {
    abbreviation: "NSWIR",
    fullName: "New South Wales Industrial Reports",
    jurisdiction: "NSW",
    type: "unauthorised_subject",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "VicRp",
    fullName: "Victorian Reports (historical)",
    jurisdiction: "VIC",
    type: "unauthorised_generalist",
    yearOrganised: false,
    source: "AustLII",
  },
  {
    abbreviation: "NTLJ",
    fullName: "Northern Territory Law Journal",
    jurisdiction: "NT",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
  {
    abbreviation: "FMCA",
    fullName: "Federal Magistrates Court of Australia",
    jurisdiction: "CTH",
    type: "unauthorised_generalist",
    yearOrganised: true,
    source: "AustLII",
  },
];

/**
 * Search report series by abbreviation or full name (case-insensitive substring match).
 */
export function searchReportSeries(query: string): ReportSeriesEntry[] {
  const lowerQuery = query.toLowerCase();
  return REPORT_SERIES.filter(
    (entry) =>
      entry.abbreviation.toLowerCase().includes(lowerQuery) ||
      entry.fullName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Look up a report series by its exact abbreviation (case-sensitive).
 */
export function getByAbbreviation(
  abbrev: string
): ReportSeriesEntry | undefined {
  return REPORT_SERIES.find((entry) => entry.abbreviation === abbrev);
}
